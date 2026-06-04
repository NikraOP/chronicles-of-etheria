/**
 * Облачные аккаунты: регистрация, вход, несколько персонажей на сервере.
 */
(function () {
    const LS_ACCOUNT = 'etheria_account_v1';
    const LS_ACTIVE_CHAR = 'etheria_active_char_v1';
    const CLOUD_SAVE_DEBOUNCE_MS = 2800;

    let cloudSaveTimer = null;
    let cloudSaveInFlight = false;

    function escapeAccHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(s) {
        return escapeAccHtml(s).replace(/'/g, '&#39;');
    }

    function setAccountGateBody(active) {
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.toggle('account-gate-active', !!active);
        }
    }

    function jsOnclickStr(s) {
        return "'" + String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }

    function accountPlayBtnOnclick(charId) {
        return 'window.playAccountCharacter(' + jsOnclickStr(charId) + ')';
    }

    function accountDeleteBtnOnclick(charId, name) {
        return 'window.deleteAccountCharacter(' + jsOnclickStr(charId) + ',' + jsOnclickStr(name || 'персонажа') + ')';
    }

    function getApiBase() {
        if (typeof getFriendsApiBase === 'function') return getFriendsApiBase();
        if (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_HTTP_API) {
            return String(window.ETHERIA_FRIENDS_HTTP_API).trim().replace(/\/+$/, '');
        }
        return 'http://localhost:8790';
    }

    function shouldUseGameAccounts() {
        if (typeof window !== 'undefined' && window.ETHERIA_USE_GAME_ACCOUNTS === false) return false;
        return true;
    }

    function loadAccountState() {
        try {
            const raw = localStorage.getItem(LS_ACCOUNT);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || !s.token) return null;
            return s;
        } catch (_) {
            return null;
        }
    }

    function saveAccountState(state) {
        if (!state || !state.token) {
            localStorage.removeItem(LS_ACCOUNT);
            return;
        }
        localStorage.setItem(LS_ACCOUNT, JSON.stringify({
            token: state.token,
            login: state.login || '',
            accountId: state.accountId || '',
            expiresAt: state.expiresAt || 0
        }));
    }

    function getActiveCharId() {
        return localStorage.getItem(LS_ACTIVE_CHAR) || '';
    }

    function setActiveCharId(id) {
        if (id) localStorage.setItem(LS_ACTIVE_CHAR, id);
        else localStorage.removeItem(LS_ACTIVE_CHAR);
    }

    function getAccountToken() {
        const s = loadAccountState();
        return s ? s.token : '';
    }

    async function accountFetch(path, options) {
        options = options || {};
        const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        const token = getAccountToken();
        if (token) headers['X-Account-Token'] = token;
        const doFetch = typeof cloudApiFetch === 'function' ? cloudApiFetch : fetch;
        const res = await doFetch(getApiBase().replace(/\/+$/, '') + path, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        let data = null;
        try {
            data = await res.json();
        } catch (_) {
            data = { ok: false, error: 'bad_json' };
        }
        if (!res.ok) {
            const err = new Error((data && data.message) || (data && data.error) || ('HTTP ' + res.status));
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    function accountErrorMessage(err) {
        const code = err && (err.message || (err.data && err.data.error));
        if (code === 'login_taken') return 'Этот логин уже занят.';
        if (code === 'invalid_credentials') return 'Неверный логин или пароль.';
        if (code === 'password_mismatch') return 'Пароли не совпадают.';
        if (code === 'invalid_login') return 'Логин: 3–20 символов (буквы, цифры, _).';
        if (code === 'invalid_password') return 'Пароль: от 6 до 64 символов.';
        if (code === 'character_limit') return 'Слишком много персонажей на аккаунте.';
        if (code === 'unauthorized') return 'Сессия истекла — войдите снова.';
        if (err && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
            return 'Сервер недоступен. Проверьте интернет или подождите.';
        }
        return (err && err.data && err.data.message) || 'Ошибка: ' + (code || 'неизвестно');
    }

    function validateLoginClient(login) {
        const n = String(login || '').trim();
        if (!/^[a-zA-Z0-9_\u0400-\u04FF]{3,20}$/.test(n)) {
            return 'Логин: 3–20 символов (буквы, цифры, подчёркивание).';
        }
        return '';
    }

    function validateRegisterClient(login, pass, pass2) {
        const le = validateLoginClient(login);
        if (le) return le;
        if (String(pass || '').length < 6) return 'Пароль: минимум 6 символов.';
        if (String(pass || '').length > 64) return 'Пароль: максимум 64 символа.';
        if (pass !== pass2) return 'Пароли не совпадают.';
        return '';
    }

    function showAuthError(msg) {
        const el = document.getElementById('accountAuthError');
        if (el) {
            el.textContent = msg || '';
            el.style.display = msg ? 'block' : 'none';
        }
    }

    function setAuthTab(tab) {
        window._accountAuthTab = tab === 'register' ? 'register' : 'login';
        renderAccountAuthScreen();
    }

    function renderAccountAuthScreen() {
        const tab = window._accountAuthTab || 'login';
        const el = document.getElementById('app');
        if (!el) return;
        setAccountGateBody(true);
        el.innerHTML =
            '<div class="account-gate">' +
            '<div class="account-gate__backdrop" aria-hidden="true"></div>' +
            '<div class="account-gate__card account-panel account-panel--auth">' +
            '<div class="account-gate__brand">' +
            '<span class="account-gate__emblem" aria-hidden="true">⚔️</span>' +
            '<h1 class="account-gate__title">Хроники Этерии</h1>' +
            '<p class="account-gate__tagline">Облачный аккаунт · до 8 персонажей · синхронизация с сервером</p>' +
            '</div>' +
            '<div class="account-tabs account-tabs--auth">' +
            '<button type="button" class="account-tab' + (tab === 'login' ? ' account-tab--active' : '') +
            '" onclick="setAccountAuthTab(\'login\')">Вход</button>' +
            '<button type="button" class="account-tab' + (tab === 'register' ? ' account-tab--active' : '') +
            '" onclick="setAccountAuthTab(\'register\')">Регистрация</button>' +
            '</div>' +
            '<div class="account-gate__form-wrap">' +
            (tab === 'register' ? renderRegisterForm() : renderLoginForm()) +
            '</div>' +
            '<p id="accountAuthError" class="account-auth-error" style="display:none" role="alert"></p>' +
            '</div></div>';
    }

    function renderLoginForm() {
        return '<form class="account-form account-form--auth" onsubmit="submitAccountLogin(event)">' +
            '<div class="account-field">' +
            '<label class="account-label" for="accountLoginInput">Логин</label>' +
            '<input id="accountLoginInput" class="hero-input account-input" autocomplete="username" maxlength="20" placeholder="Ваш логин" required>' +
            '</div>' +
            '<div class="account-field">' +
            '<label class="account-label" for="accountPassInput">Пароль</label>' +
            '<input id="accountPassInput" type="password" class="hero-input account-input" autocomplete="current-password" maxlength="64" placeholder="••••••••" required>' +
            '</div>' +
            '<button type="submit" class="action-btn account-submit account-submit--primary">Войти в аккаунт</button>' +
            '</form>';
    }

    function renderRegisterForm() {
        return '<form class="account-form account-form--auth" onsubmit="submitAccountRegister(event)">' +
            '<div class="account-field">' +
            '<label class="account-label" for="accountRegLogin">Логин</label>' +
            '<input id="accountRegLogin" class="hero-input account-input" autocomplete="username" maxlength="20" placeholder="3–20 символов" required>' +
            '<span class="account-field-hint">Буквы, цифры, подчёркивание</span>' +
            '</div>' +
            '<div class="account-field">' +
            '<label class="account-label" for="accountRegPass">Пароль</label>' +
            '<input id="accountRegPass" type="password" class="hero-input account-input" autocomplete="new-password" maxlength="64" placeholder="Минимум 6 символов" required>' +
            '</div>' +
            '<div class="account-field">' +
            '<label class="account-label" for="accountRegPass2">Повторите пароль</label>' +
            '<input id="accountRegPass2" type="password" class="hero-input account-input" autocomplete="new-password" maxlength="64" placeholder="Ещё раз пароль" required>' +
            '</div>' +
            '<button type="submit" class="action-btn account-submit account-submit--primary">Создать аккаунт</button>' +
            '</form>';
    }

    async function submitAccountLogin(ev) {
        if (ev) ev.preventDefault();
        const login = document.getElementById('accountLoginInput') && document.getElementById('accountLoginInput').value;
        const password = document.getElementById('accountPassInput') && document.getElementById('accountPassInput').value;
        const err = validateLoginClient(login);
        if (err) { showAuthError(err); return; }
        if (!password) { showAuthError('Введите пароль.'); return; }
        showAuthError('');
        try {
            const data = await accountFetch('/api/v1/auth/login', {
                method: 'POST',
                body: { login: login.trim(), password: password }
            });
            saveAccountState(data);
            setActiveCharId('');
            await openCharacterHub();
        } catch (e) {
            showAuthError(accountErrorMessage(e));
        }
    }

    async function submitAccountRegister(ev) {
        if (ev) ev.preventDefault();
        const login = document.getElementById('accountRegLogin') && document.getElementById('accountRegLogin').value;
        const pass = document.getElementById('accountRegPass') && document.getElementById('accountRegPass').value;
        const pass2 = document.getElementById('accountRegPass2') && document.getElementById('accountRegPass2').value;
        const err = validateRegisterClient(login, pass, pass2);
        if (err) { showAuthError(err); return; }
        showAuthError('');
        try {
            const data = await accountFetch('/api/v1/auth/register', {
                method: 'POST',
                body: { login: login.trim(), password: pass, passwordConfirm: pass2 }
            });
            saveAccountState(data);
            setActiveCharId('');
            if (typeof addMessage === 'function') addMessage('✅ Аккаунт создан: ' + data.login, 'success');
            await openCharacterHub();
        } catch (e) {
            showAuthError(accountErrorMessage(e));
        }
    }

    async function accountLogout() {
        try {
            await accountFetch('/api/v1/auth/logout', { method: 'POST' });
        } catch (_) { /* ignore */ }
        saveAccountState(null);
        setActiveCharId('');
        player = null;
        if (typeof leavePvPBossBattle === 'function') leavePvPBossBattle();
        renderAccountAuthScreen();
    }

    function formatCharTime(ts) {
        if (!ts) return '—';
        try {
            return new Date(ts).toLocaleString('ru-RU');
        } catch (_) {
            return '—';
        }
    }

    async function openCharacterHub() {
        const el = document.getElementById('app');
        if (!el) return;
        setAccountGateBody(true);
        const acc = loadAccountState();
        el.innerHTML = '<div class="account-screen account-screen--loading"><p>Загрузка персонажей…</p></div>';
        let chars = [];
        try {
            const data = await accountFetch('/api/v1/characters');
            chars = data.characters || [];
        } catch (e) {
            if (e.status === 401) {
                saveAccountState(null);
                renderAccountAuthScreen();
                return;
            }
            el.innerHTML = '<div class="account-screen"><div class="account-panel"><p class="account-auth-error">' +
                escapeAccHtml(accountErrorMessage(e)) + '</p>' +
                '<button class="action-btn" onclick="renderAccountAuthScreen()">К входу</button></div></div>';
            return;
        }

        let localImportBtn = '';
        const localSave = localStorage.getItem('rpg_save_v21');
        if (localSave && chars.length < 8) {
            try {
                const d = JSON.parse(localSave);
                if (d && d.class) {
                    localImportBtn = '<button type="button" class="action-btn account-import-btn" onclick="importLocalSaveToAccount()">📥 Импорт локального персонажа</button>';
                }
            } catch (_) { /* skip */ }
        }

        let listHtml = '';
        if (!chars.length) {
            listHtml = '<div class="account-empty">Пока нет персонажей. Создайте первого героя.</div>';
        } else {
            listHtml = '<div class="account-char-list">';
            chars.forEach(function (c) {
                listHtml += '<article class="account-char-card">' +
                    '<div class="account-char-card__body">' +
                    '<div class="account-char-card__name">' + escapeAccHtml(c.name) + '</div>' +
                    '<div class="account-char-card__meta">' + escapeAccHtml(c.class) + ' · ' + escapeAccHtml(c.branch) +
                    ' · ур. ' + (c.level || 1) + '</div>' +
                    '<div class="account-char-card__time">🕐 ' + escapeAccHtml(formatCharTime(c.updatedAt)) + '</div>' +
                    '</div>' +
                    '<div class="account-char-card__actions">' +
                    '<button type="button" class="action-btn account-play-btn" data-account-play-id="' + escapeAttr(c.id) +
                    '" onclick="' + accountPlayBtnOnclick(c.id) + '">▶ Играть</button>' +
                    '<button type="button" class="action-btn danger account-delete-btn" data-account-delete-id="' + escapeAttr(c.id) +
                    '" data-account-delete-name="' + escapeAttr(c.name || 'персонажа') +
                    '" onclick="' + accountDeleteBtnOnclick(c.id, c.name) + '">Удалить</button>' +
                    '</div></article>';
            });
            listHtml += '</div>';
        }

        el.innerHTML =
            '<div class="account-screen">' +
            '<div class="account-panel account-panel--hub">' +
            '<header class="account-hub-head">' +
            '<div><h2 class="account-panel__title">👤 Аккаунт</h2>' +
            '<p class="account-hub-login">@' + escapeAccHtml(acc && acc.login) + '</p></div>' +
            '<button type="button" class="action-btn account-logout-btn" onclick="accountLogout()">Выйти</button>' +
            '</header>' +
            '<p class="account-panel__sub">Ваши сохранения на сервере (до 8 персонажей).</p>' +
            listHtml +
            '<div class="account-hub-actions">' +
            '<button type="button" class="action-btn account-submit" onclick="startAccountCharacterCreation()">➕ Новый персонаж</button>' +
            localImportBtn +
            '</div></div></div>';
    }

    window.renderAccountAuthScreen = renderAccountAuthScreen;

    async function importLocalSaveToAccount() {
        const raw = localStorage.getItem('rpg_save_v21');
        if (!raw) return;
        try {
            const d = JSON.parse(raw);
            if (!d || !d.class) throw new Error('bad');
            const migrated = typeof migrateOldSave === 'function' ? migrateOldSave(d) : d;
            const data = await accountFetch('/api/v1/characters', {
                method: 'POST',
                body: { player: migrated }
            });
            const charId = data.character && data.character.id;
            if (!charId) throw new Error('no_char');
            await accountFetch('/api/v1/characters/' + encodeURIComponent(charId), {
                method: 'PUT',
                body: { player: migrated, saveVersion: '3.1' }
            });
            setActiveCharId(charId);
            if (typeof addMessage === 'function') {
                addMessage('✅ Персонаж импортирован на сервер', 'success');
            }
            await openCharacterHub();
        } catch (e) {
            if (typeof addMessage === 'function') addMessage('❌ ' + accountErrorMessage(e), 'error');
        }
    }

    function applyLoadedPlayer(data) {
        if (!data || !data.player) return false;
        player = typeof migrateOldSave === 'function' ? migrateOldSave(data.player) : data.player;
        if (typeof syncInventoryItemVisuals === 'function') syncInventoryItemVisuals(player);
        if (!player.professions) player.professions = {};
        if (!player.resources) player.resources = {};
        if (player.inventory && !player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
        if (typeof initSkinsSystem === 'function') initSkinsSystem();
        if (typeof updateAllItemPrices === 'function') updateAllItemPrices();
        if (typeof updateAllAbilities === 'function') updateAllAbilities();
        if (typeof resetBaseStats === 'function') resetBaseStats();
        if (typeof clampPlayerVitalsAfterLoad === 'function') clampPlayerVitalsAfterLoad();
        if (typeof saveGame === 'function') saveGame();
        return true;
    }

    async function playAccountCharacter(charId) {
        const id = String(charId || '').trim();
        if (!id) return;
        setActiveCharId(id);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = '<div class="account-screen account-screen--loading"><p>Загрузка персонажа…</p></div>';
        }
        try {
            let data = await accountFetch('/api/v1/characters/' + encodeURIComponent(id));
            if (!data.player) {
                const raw = localStorage.getItem('rpg_save_v21');
                if (raw) {
                    try {
                        const d = JSON.parse(raw);
                        if (d && d.class) {
                            const migrated = typeof migrateOldSave === 'function' ? migrateOldSave(d) : d;
                            await accountFetch('/api/v1/characters/' + encodeURIComponent(id), {
                                method: 'PUT',
                                body: { player: migrated, saveVersion: '3.1' }
                            });
                            data = await accountFetch('/api/v1/characters/' + encodeURIComponent(id));
                        }
                    } catch (_) { /* retry load */ }
                }
            }
            if (!data.player) {
                window._gameAccountCreatingChar = true;
                window._gameAccountNewCharId = id;
                setAccountGateBody(true);
                if (typeof renderCharacterCreation === 'function') renderCharacterCreation();
                if (typeof addMessage === 'function') {
                    addMessage('Создайте героя для этого слота (сохранение на сервере пустое).', 'info');
                }
                return;
            }
            if (!applyLoadedPlayer(data)) throw new Error('load');
            setAccountGateBody(false);
            if (typeof renderGame === 'function') renderGame();
            if (typeof startFriendsInvitePolling === 'function') startFriendsInvitePolling();
        } catch (e) {
            if (typeof addMessage === 'function') addMessage('❌ ' + accountErrorMessage(e), 'error');
            await openCharacterHub();
        }
    }

    async function deleteAccountCharacter(charId, name) {
        const label = name || 'персонажа';
        if (!confirm('Удалить «' + label + '» с сервера? Это нельзя отменить.')) return;
        try {
            await accountFetch('/api/v1/characters/' + encodeURIComponent(charId), { method: 'DELETE' });
            if (getActiveCharId() === charId) setActiveCharId('');
            if (typeof addMessage === 'function') addMessage('Персонаж удалён.', 'info');
            await openCharacterHub();
        } catch (e) {
            if (typeof addMessage === 'function') addMessage('❌ ' + accountErrorMessage(e), 'error');
        }
    }

    async function startAccountCharacterCreation() {
        try {
            const data = await accountFetch('/api/v1/characters', { method: 'POST', body: {} });
            if (!data.character || !data.character.id) throw new Error('no_id');
            window._gameAccountCreatingChar = true;
            window._gameAccountNewCharId = data.character.id;
            setActiveCharId(data.character.id);
            setAccountGateBody(true);
            if (typeof renderCharacterCreation === 'function') renderCharacterCreation();
        } catch (e) {
            if (typeof addMessage === 'function') addMessage('❌ ' + accountErrorMessage(e), 'error');
        }
    }

    async function gameAccountOnNewCharacterReady() {
        if (!window._gameAccountCreatingChar || !window._gameAccountNewCharId || !player) return false;
        const charId = window._gameAccountNewCharId;
        try {
            await accountFetch('/api/v1/characters/' + encodeURIComponent(charId), {
                method: 'PUT',
                body: { player: player, saveVersion: '3.1' }
            });
            window._gameAccountCreatingChar = false;
            window._gameAccountNewCharId = '';
            setActiveCharId(charId);
            setAccountGateBody(false);
            if (typeof saveGame === 'function') saveGame();
            if (typeof renderGame === 'function') renderGame();
            if (typeof startFriendsInvitePolling === 'function') startFriendsInvitePolling();
            return true;
        } catch (e) {
            if (typeof addMessage === 'function') addMessage('❌ Не удалось сохранить на сервер: ' + accountErrorMessage(e), 'error');
            return false;
        }
    }

    function scheduleCloudCharacterSave() {
        if (!shouldUseGameAccounts() || !getAccountToken()) return;
        const charId = getActiveCharId();
        if (!charId || !player) return;
        if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
        cloudSaveTimer = setTimeout(pushCloudCharacterSave, CLOUD_SAVE_DEBOUNCE_MS);
    }

    async function pushCloudCharacterSave() {
        const charId = getActiveCharId();
        if (!charId || !player || cloudSaveInFlight) return;
        cloudSaveInFlight = true;
        try {
            await accountFetch('/api/v1/characters/' + encodeURIComponent(charId), {
                method: 'PUT',
                body: { player: player, saveVersion: '3.1' }
            });
        } catch (e) {
            console.warn('cloud save', e);
        } finally {
            cloudSaveInFlight = false;
        }
    }

    function showAccountMenu() {
        if (!shouldUseGameAccounts() || !getAccountToken()) {
            if (typeof addMessage === 'function') addMessage('Сначала войдите в аккаунт.', 'error');
            if (typeof renderAccountAuthScreen === 'function') renderAccountAuthScreen();
            return;
        }
        if (typeof closeSettings === 'function') closeSettings();
        openCharacterHub();
    }

    async function bootstrapGameAccount() {
        if (!shouldUseGameAccounts()) {
            if (typeof initLegacyLocalGame === 'function') initLegacyLocalGame();
            return;
        }
        if (typeof createParticles === 'function') createParticles();
        if (typeof wakeCloudApi === 'function') wakeCloudApi(getApiBase());

        const state = loadAccountState();
        if (!state || !state.token) {
            renderAccountAuthScreen();
            return;
        }

        try {
            await accountFetch('/api/v1/auth/me');
        } catch (e) {
            saveAccountState(null);
            renderAccountAuthScreen();
            return;
        }

        const activeId = getActiveCharId();
        if (activeId) {
            try {
                const data = await accountFetch('/api/v1/characters/' + encodeURIComponent(activeId));
                if (data.player && applyLoadedPlayer(data)) {
                    setAccountGateBody(false);
                    if (typeof renderGame === 'function') renderGame();
                    if (typeof startFriendsInvitePolling === 'function') startFriendsInvitePolling();
                    return;
                }
            } catch (_) { /* fall through to hub */ }
        }

        await openCharacterHub();
    }

    function hookSaveGameForCloud() {
        if (window.__gameAccountSaveHooked) return;
        const orig = window.saveGame;
        if (typeof orig !== 'function') return;
        window.saveGame = function () {
            orig.apply(this, arguments);
            scheduleCloudCharacterSave();
        };
        window.__gameAccountSaveHooked = true;
    }

    hookSaveGameForCloud();


    window.bootstrapGameAccount = bootstrapGameAccount;
    window.setAccountAuthTab = setAuthTab;
    window.submitAccountLogin = submitAccountLogin;
    window.submitAccountRegister = submitAccountRegister;
    window.accountLogout = accountLogout;
    window.openCharacterHub = openCharacterHub;
    window.playAccountCharacter = playAccountCharacter;
    window.deleteAccountCharacter = deleteAccountCharacter;
    window.startAccountCharacterCreation = startAccountCharacterCreation;
    window.importLocalSaveToAccount = importLocalSaveToAccount;
    window.showAccountMenu = showAccountMenu;
    window.gameAccountOnNewCharacterReady = gameAccountOnNewCharacterReady;
    window.getGameAccountToken = getAccountToken;
    window.pushCloudCharacterSave = pushCloudCharacterSave;
})();
