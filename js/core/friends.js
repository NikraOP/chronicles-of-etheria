/**
 * Друзья: синхронизация профиля на сервер, добавление по коду, просмотр статов и экипировки.
 * GitHub Pages: js/config/friendsEnv.js → Render API или Supabase.
 */
const FRIENDS_API_LS_KEY = 'etheria_friends_api_v1';

function isGitHubPagesHost() {
    const host = typeof location !== 'undefined' ? location.hostname : '';
    return host === 'nikraop.github.io' || /\.github\.io$/i.test(host);
}

function getFriendsSupabaseConfig() {
    const url = (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_SUPABASE_URL) || '';
    const key = (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_SUPABASE_ANON_KEY) || '';
    return { url: String(url).trim(), key: String(key).trim() };
}

function getFriendsHttpApiDefault() {
    if (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_HTTP_API) {
        return String(window.ETHERIA_FRIENDS_HTTP_API).trim().replace(/\/+$/, '');
    }
    return isGitHubPagesHost()
        ? 'https://etheria-friends-api.onrender.com'
        : 'http://localhost:8790';
}

function getFriendsBackendKind() {
    const sb = getFriendsSupabaseConfig();
    if (sb.url && sb.key) return 'supabase';
    return 'http';
}

function getFriendsBackendLabel() {
    if (getFriendsBackendKind() === 'supabase') return 'Supabase (облако)';
    if (isGitHubPagesHost()) return 'GitHub Pages → Render API';
    return 'Локальный API';
}

const FRIENDS_SLOT_META = [
    { key: 'weapon', label: 'Оружие', fallback: '⚔️' },
    { key: 'helmet', label: 'Шлем', fallback: '⛑️' },
    { key: 'chest', label: 'Нагрудник', fallback: '🛡️' },
    { key: 'pants', label: 'Поножи', fallback: '👖' },
    { key: 'boots', label: 'Сапоги', fallback: '👢' },
    { key: 'ring', label: 'Кольцо', fallback: '💍' },
    { key: 'necklace', label: 'Амулет', fallback: '📿' }
];

function escapeFriendsHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function ensureFriendsPlayerState() {
    if (!player) return;
    if (!player.friends) {
        player.friends = {
            playerId: '',
            syncToken: '',
            friendCode: '',
            lastSyncAt: 0,
            cached: []
        };
    }
    if (!Array.isArray(player.friends.cached)) player.friends.cached = [];
}

function getFriendsApiBase() {
    const saved = (localStorage.getItem(FRIENDS_API_LS_KEY) || '').trim();
    return saved || getFriendsHttpApiDefault();
}

function setFriendsApiBase(url) {
    const v = String(url || '').trim().replace(/\/+$/, '');
    if (v) localStorage.setItem(FRIENDS_API_LS_KEY, v);
    else localStorage.removeItem(FRIENDS_API_LS_KEY);
}

function friendsApiUrl(path) {
    return getFriendsApiBase().replace(/\/+$/, '') + path;
}

async function friendsHttpFetch(path, options) {
    options = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    ensureFriendsPlayerState();
    if (player && player.friends && player.friends.playerId) {
        headers['X-Player-Id'] = player.friends.playerId;
    }
    if (player && player.friends && player.friends.syncToken) {
        headers['X-Sync-Token'] = player.friends.syncToken;
    }
    const res = await fetch(friendsApiUrl(path), {
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
        const err = new Error((data && data.error) || ('HTTP ' + res.status));
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

async function friendsSupabaseRpc(fn, body) {
    const cfg = getFriendsSupabaseConfig();
    const res = await fetch(cfg.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: cfg.key,
            Authorization: 'Bearer ' + cfg.key
        },
        body: JSON.stringify(body || {})
    });
    let data = null;
    try {
        data = await res.json();
    } catch (_) {
        data = { ok: false, error: 'bad_json' };
    }
    if (!res.ok) {
        const msg = (data && data.message) || (data && data.error) || ('HTTP ' + res.status);
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    if (data && data.ok === false) {
        const err = new Error(data.error || 'rpc_error');
        err.data = data;
        throw err;
    }
    return data;
}

async function friendsBackendSync(profile) {
    ensureFriendsPlayerState();
    if (getFriendsBackendKind() === 'supabase') {
        return friendsSupabaseRpc('etheria_sync_profile', {
            p_player_id: player.friends.playerId || null,
            p_sync_token: player.friends.syncToken || null,
            p_profile: profile
        });
    }
    return friendsHttpFetch('/api/v1/sync', { method: 'POST', body: { profile: profile } });
}

async function friendsBackendListFriends() {
    ensureFriendsPlayerState();
    if (getFriendsBackendKind() === 'supabase') {
        return friendsSupabaseRpc('etheria_list_friends', {
            p_player_id: player.friends.playerId,
            p_sync_token: player.friends.syncToken
        });
    }
    return friendsHttpFetch('/api/v1/friends');
}

async function friendsBackendAddFriend(code) {
    ensureFriendsPlayerState();
    if (getFriendsBackendKind() === 'supabase') {
        return friendsSupabaseRpc('etheria_add_friend', {
            p_player_id: player.friends.playerId,
            p_sync_token: player.friends.syncToken,
            p_friend_code: code
        });
    }
    return friendsHttpFetch('/api/v1/friends/add', {
        method: 'POST',
        body: { friendCode: code }
    });
}

function snapshotEquipmentItem(item) {
    if (!item) return null;
    const icon = item.icon || (typeof resolveItemIcon === 'function' ? resolveItemIcon(item, '📦') : '📦');
    const img = item.img || (typeof resolveItemImg === 'function' ? resolveItemImg(item) : '');
    return {
        name: item.name,
        rarity: item.rarity,
        icon: icon,
        img: img,
        dmg: item.dmg || 0,
        def: item.def || 0,
        hp: item.hp || 0,
        crit: item.crit || 0,
        critDmg: item.critDmg || 0,
        dodge: item.dodge || 0,
        mana: item.mana || 0
    };
}

function findSkinDefInDb(className, gender, branch, skinId) {
    if (!skinId || typeof SKINS_DB === 'undefined') return null;
    const classSkins = SKINS_DB[className];
    if (!classSkins) return null;
    const genderSkins = classSkins[gender || 'male'] || classSkins.male;
    if (!genderSkins) return null;
    const schoolSkins = genderSkins[branch];
    if (!Array.isArray(schoolSkins)) return null;
    return schoolSkins.find(function (s) { return s && s.id === skinId; }) || null;
}

function findDefaultSkinDefInDb(className, gender, branch) {
    if (typeof SKINS_DB === 'undefined') return null;
    const classSkins = SKINS_DB[className];
    if (!classSkins) return null;
    const genderSkins = classSkins[gender || 'male'] || classSkins.male;
    if (!genderSkins) return null;
    const schoolSkins = genderSkins[branch];
    if (!Array.isArray(schoolSkins)) return null;
    return schoolSkins.find(function (s) { return s && s.price === 0; }) || schoolSkins[0] || null;
}

function resolveFriendPortraitFromProfile(profile) {
    if (!profile) return { img: '', skinName: '', skinIcon: '', fallbackClass: '' };
    const className = profile.class || '';
    const gender = profile.gender || 'male';
    const branch = profile.branch || '';
    let skinDef = null;

    if (profile.currentSkin) {
        skinDef = findSkinDefInDb(className, gender, branch, profile.currentSkin);
    }
    if (!skinDef) {
        skinDef = findDefaultSkinDefInDb(className, gender, branch);
    }

    let img = String(profile.portraitImg || profile.schoolImg || '').trim();
    let skinName = String(profile.skinName || '').trim();
    let skinIcon = String(profile.skinIcon || '').trim();

    if (skinDef) {
        if (skinDef.img) img = skinDef.img;
        if (!skinName && skinDef.name) skinName = skinDef.name;
        if (!skinIcon && skinDef.icon) skinIcon = skinDef.icon;
    }
    if (!img && typeof ABILITIES_DB !== 'undefined' && ABILITIES_DB[className] && ABILITIES_DB[className][branch]) {
        img = ABILITIES_DB[className][branch].img || '';
    }

    return {
        img: img,
        skinName: skinName,
        skinIcon: skinIcon,
        fallbackClass: className
    };
}

function getFriendPortraitFallbackEmoji(className) {
    if (className === 'Воин') return '⚔️';
    if (className === 'Лучник') return '🏹';
    return '🧙';
}

function renderFriendPortraitHTML(profile, options) {
    options = options || {};
    const size = options.size || 'card';
    const portrait = resolveFriendPortraitFromProfile(profile);
    const name = escapeFriendsHtml((profile && profile.name) || 'Герой');
    const fallback = getFriendPortraitFallbackEmoji(portrait.fallbackClass);
    const escFb = fallback.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const sizeClass = size === 'preview' ? ' friend-portrait--preview' : '';

    let inner = '';
    if (portrait.img) {
        const src = typeof resolveGameAssetUrl === 'function'
            ? resolveGameAssetUrl(portrait.img)
            : portrait.img;
        inner = '<img class="friend-portrait__img" src="' + escapeFriendsHtml(src) + '" alt="' + name + '" ' +
            'onerror="this.onerror=null;this.classList.add(\'friend-portrait__img--hidden\');' +
            'var f=this.parentElement.querySelector(\'.friend-portrait__fallback\');if(f)f.classList.add(\'friend-portrait__fallback--show\');">';
    }
    inner += '<div class="friend-portrait__fallback' + (portrait.img ? '' : ' friend-portrait__fallback--show') + '" aria-hidden="true">' +
        (portrait.skinIcon || fallback) + '</div>';

    let skinTag = '';
    if (portrait.skinName) {
        skinTag = '<div class="friend-portrait__skin-tag" title="Скин">' +
            (portrait.skinIcon ? '<span class="friend-portrait__skin-tag-icon">' + portrait.skinIcon + '</span>' : '') +
            '<span class="friend-portrait__skin-tag-name">' + escapeFriendsHtml(portrait.skinName) + '</span></div>';
    }

    return '<div class="friend-portrait' + sizeClass + '">' + inner + skinTag + '</div>';
}

function buildFriendsPublicProfile() {
    if (!player) return null;
    if (typeof ensureEquipmentScreenVisuals === 'function') ensureEquipmentScreenVisuals();
    if (typeof resetBaseStats === 'function') resetBaseStats();

    const portrait = resolveFriendPortraitFromProfile({
        class: player.class,
        branch: player.branch,
        gender: player.gender,
        currentSkin: player.currentSkin,
        schoolImg: player.schoolImg
    });

    const eq = {};
    FRIENDS_SLOT_META.forEach(function (meta) {
        eq[meta.key] = snapshotEquipmentItem(player.equipment && player.equipment[meta.key]);
    });
    return {
        name: player.name,
        class: player.class,
        branch: player.branch,
        gender: player.gender || 'male',
        level: player.level,
        gold: player.gold,
        victories: player.victories || 0,
        location: player.location,
        schoolImg: portrait.img || player.schoolImg || '',
        portraitImg: portrait.img || '',
        currentSkin: player.currentSkin,
        skinName: portrait.skinName || '',
        skinIcon: portrait.skinIcon || '',
        stats: {
            health: player.health,
            maxHealth: player.maxHealth,
            attack: player.attack,
            defense: player.defense,
            mana: player.mana,
            maxMana: player.maxMana,
            criticalChance: player.criticalChance,
            criticalDamage: player.criticalDamage,
            dodgeChance: player.dodgeChance,
            experience: player.experience,
            maxExperience: player.maxExperience
        },
        equipment: eq
    };
}

function friendsErrorMessage(err) {
    const code = err && (err.message || err.data && err.data.error);
    if (code === 'unauthorized') return 'Сессия устарела — нажмите «Синхронизировать» ещё раз.';
    if (code === 'code_not_found') return 'Код друга не найден. Пусть друг сначала синхронизируется.';
    if (code === 'self_friend') return 'Нельзя добавить свой собственный код.';
    if (code === 'friends_limit') return 'Слишком много друзей на сервере.';
    if (err && err.message === 'Failed to fetch') {
        if (isGitHubPagesHost()) {
            return 'API недоступен. Владельцу сайта: подключите Render Blueprint (docs/FRIENDS_GITHUB_PAGES.md) или Supabase в friendsEnv.js.';
        }
        return 'Сервер недоступен. Запустите npm run start:friends или укажите URL API.';
    }
    return 'Ошибка: ' + (code || 'неизвестно');
}

async function syncFriendsProfile() {
    if (!player) {
        if (typeof addMessage === 'function') addMessage('❌ Сначала создайте героя', 'error');
        return false;
    }
    ensureFriendsPlayerState();
    try {
        const data = await friendsBackendSync(buildFriendsPublicProfile());
        player.friends.playerId = data.playerId;
        player.friends.syncToken = data.syncToken;
        player.friends.friendCode = data.friendCode;
        player.friends.lastSyncAt = data.updatedAt || Date.now();
        if (typeof saveGame === 'function') saveGame();
        if (typeof addMessage === 'function') {
            addMessage('✅ Профиль синхронизирован. Код: ' + data.friendCode, 'success');
        }
        await refreshFriendsFromServer();
        showFriends();
        return true;
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
        return false;
    }
}

async function refreshFriendsFromServer() {
    ensureFriendsPlayerState();
    if (!player.friends.playerId || !player.friends.syncToken) return [];
    try {
        const data = await friendsBackendListFriends();
        player.friends.cached = data.friends || [];
        if (typeof saveGame === 'function') saveGame();
        return player.friends.cached;
    } catch (err) {
        console.warn('[friends] refresh failed', err);
        return player.friends.cached || [];
    }
}

async function addFriendByCode(code) {
    if (!player) return;
    ensureFriendsPlayerState();
    const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length < 4) {
        if (typeof addMessage === 'function') addMessage('❌ Введите код друга (6 символов)', 'error');
        return;
    }
    if (!player.friends.playerId || !player.friends.syncToken) {
        if (typeof addMessage === 'function') addMessage('❌ Сначала нажмите «Синхронизировать»', 'error');
        return;
    }
    try {
        await friendsBackendAddFriend(normalized);
        if (typeof addMessage === 'function') addMessage('✅ Друг добавлен: ' + normalized, 'success');
        await refreshFriendsFromServer();
        showFriends();
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
    }
}

function formatFriendSyncTime(ts) {
    if (!ts) return 'никогда';
    try {
        return new Date(ts).toLocaleString('ru-RU');
    } catch (_) {
        return '';
    }
}

function renderFriendPortraitBlock(profile, options) {
    return renderFriendPortraitHTML(profile, options);
}

function renderFriendStatChip(icon, value, mod) {
    const modClass = mod ? ' friend-stat-chip--' + mod : '';
    return '<span class="friend-stat-chip' + modClass + '">' +
        '<span class="friend-stat-chip__icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="friend-stat-chip__value">' + value + '</span>' +
        '</span>';
}

function renderFriendEquipmentGrid(equipment) {
    let html = '<div class="friend-card__equipment-wrap">';
    html += '<div class="friend-card__equipment-title">🎒 Экипировка</div>';
    html += '<div class="friend-card__equipment">';
    FRIENDS_SLOT_META.forEach(function (meta) {
        const item = equipment && equipment[meta.key];
        const equipped = item && item.name;
        const iconHtml = equipped && typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(item, { size: 40, fallback: meta.fallback, className: 'item-icon friend-slot__icon' })
            : '<div class="item-icon item-icon--emoji friend-slot__icon friend-slot__icon--empty">' + meta.fallback + '</div>';
        const nameHtml = equipped
            ? '<div class="friend-slot__name">' + escapeFriendsHtml(item.name) + '</div>'
            : '<div class="friend-slot__empty">—</div>';
        const statsHtml = equipped && typeof formatItemBonusLine === 'function'
            ? '<div class="friend-slot__stats">' + formatItemBonusLine(item) + '</div>'
            : '';
        html += '<div class="friend-slot' + (equipped ? ' friend-slot--filled' : ' friend-slot--empty') + '">' +
            '<div class="friend-slot__icon-wrap">' + iconHtml + '</div>' +
            '<div class="friend-slot__label">' + meta.label + '</div>' +
            nameHtml +
            statsHtml +
            '</div>';
    });
    html += '</div></div>';
    return html;
}

function renderFriendCard(entry) {
    const p = entry.profile || {};
    const st = p.stats || {};
    const updated = formatFriendSyncTime(entry.updatedAt);
    let statsHtml = '<div class="friend-card__stats">';
    statsHtml += renderFriendStatChip('❤️', (st.health || 0) + '/' + (st.maxHealth || 0), 'hp');
    statsHtml += renderFriendStatChip('⚔️', String(st.attack || 0), 'atk');
    statsHtml += renderFriendStatChip('🛡️', String(st.defense || 0), 'def');
    statsHtml += renderFriendStatChip('💥', (st.criticalChance || 0) + '% / ' + (st.criticalDamage || 0) + '%', 'crit');
    statsHtml += renderFriendStatChip('💨', (st.dodgeChance || 0) + '%', 'dodge');
    if (p.class === 'Маг') {
        statsHtml += renderFriendStatChip('🔷', (st.mana || 0) + '/' + (st.maxMana || 0), 'mana');
    }
    statsHtml += renderFriendStatChip('💰', String(p.gold || 0), 'gold');
    statsHtml += renderFriendStatChip('🏆', String(p.victories || 0), 'victories');
    statsHtml += renderFriendStatChip('📍', escapeFriendsHtml(p.location || '—'), 'location');
    statsHtml += '</div>';
    return '<article class="friend-card">' +
        '<div class="friend-card__hero">' +
        '<div class="friend-card__portrait-wrap">' + renderFriendPortraitBlock(p) + '</div>' +
        '<div class="friend-card__body">' +
        '<header class="friend-card__header">' +
        '<div class="friend-card__title">' + escapeFriendsHtml(p.name || 'Герой') + '</div>' +
        '<div class="friend-card__meta">' + escapeFriendsHtml(p.class || '') + ' · ' + escapeFriendsHtml(p.branch || '') + ' · ур. ' + (p.level || 1) + '</div>' +
        '<div class="friend-card__code"><span class="friend-card__code-label">Код</span> ' + escapeFriendsHtml(entry.friendCode || '—') + '</div>' +
        '</header>' +
        statsHtml +
        '</div>' +
        '</div>' +
        renderFriendEquipmentGrid(p.equipment) +
        '<footer class="friend-card__footer"><span class="friend-card__footer-icon" aria-hidden="true">🕐</span> Обновлено: ' + escapeFriendsHtml(updated) + '</footer>' +
        '</article>';
}

function saveFriendsApiFromUi() {
    const input = document.getElementById('friendsApiUrl');
    if (!input) return;
    setFriendsApiBase(input.value);
    if (typeof addMessage === 'function') addMessage('✅ URL сервера друзей сохранён', 'success');
}

function copyFriendsCode() {
    ensureFriendsPlayerState();
    const code = player && player.friends && player.friends.friendCode;
    if (!code) {
        if (typeof addMessage === 'function') addMessage('❌ Сначала синхронизируйте профиль', 'error');
        return;
    }
    const text = code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            if (typeof addMessage === 'function') addMessage('📋 Код скопирован: ' + text, 'info');
        }).catch(function () {
            if (typeof addMessage === 'function') addMessage('Код: ' + text, 'info');
        });
    } else if (typeof addMessage === 'function') {
        addMessage('Код: ' + text, 'info');
    }
}

function submitAddFriend() {
    const input = document.getElementById('friendsAddCodeInput');
    if (!input) return;
    addFriendByCode(input.value);
    input.value = '';
}

function showFriends() {
    if (!player) return;
    if (typeof closeSettings === 'function') closeSettings();
    ensureFriendsPlayerState();
    const el = document.getElementById('dynamicContent');
    if (!el) return;

    const f = player.friends;
    const apiBase = getFriendsApiBase();
    const backendKind = getFriendsBackendKind();
    const backendLabel = getFriendsBackendLabel();
    const onGh = isGitHubPagesHost();
    const synced = !!(f.playerId && f.syncToken);
    const friends = f.cached || [];

    const myProfile = typeof buildFriendsPublicProfile === 'function' ? buildFriendsPublicProfile() : null;

    let html = '<div class="friends-screen">';
    html += '<header class="friends-screen__head">';
    html += '<h2 class="friends-screen__title">👥 Друзья</h2>';
    html += '<p class="friends-screen__hint">Синхронизируйте профиль в облако — друг вводит ваш код на сайте GitHub Pages и видит статы и экипировку. После смены вещей снова нажмите «Синхронизировать».</p>';
    html += '</header>';

    html += '<section class="friends-panel friends-panel--api">';
    html += '<h3 class="friends-panel__title">🌐 Облако</h3>';
    html += '<p class="friends-backend-badge">' + escapeFriendsHtml(backendLabel) + '</p>';
    if (backendKind === 'supabase') {
        html += '<p class="friends-panel__note">Данные в Supabase. URL API вручную не нужен.</p>';
    } else if (onGh) {
        html += '<p class="friends-panel__note">Сайт: <strong>GitHub Pages</strong>. API: <code>' + escapeFriendsHtml(apiBase) + '</code></p>';
        html += '<p class="friends-panel__note friends-panel__note--small">Если синхронизация не работает — один раз подключите Render Blueprint из репозитория (файл <code>render.yaml</code>, см. docs/FRIENDS_GITHUB_PAGES.md).</p>';
    } else {
        html += '<div class="friends-api-row">';
        html += '<input id="friendsApiUrl" class="hero-input friends-api-input" type="url" placeholder="http://localhost:8790" value="' + escapeFriendsHtml(apiBase) + '">';
        html += '<button type="button" class="action-btn friends-api-save" onclick="saveFriendsApiFromUi()">Сохранить URL</button>';
        html += '</div>';
        html += '<p class="friends-panel__note">Локально: <code>npm run start:friends</code></p>';
    }
    html += '</section>';

    html += '<section class="friends-panel friends-panel--me">';
    html += '<div class="friends-me-layout">';
    html += '<div class="friends-me-preview">' + renderFriendPortraitBlock(myProfile || {
        name: player.name,
        class: player.class,
        branch: player.branch,
        gender: player.gender,
        currentSkin: player.currentSkin,
        schoolImg: player.schoolImg
    }, { size: 'preview' }) + '</div>';
    html += '<div class="friends-me-body">';
    html += '<h3 class="friends-panel__title">🧙 Ваш профиль</h3>';
    if (synced) {
        html += '<div class="friends-code-badge">';
        html += '<span class="friends-code-badge__label">Ваш код</span>';
        html += '<span class="friends-code-badge__code">' + escapeFriendsHtml(f.friendCode) + '</span>';
        html += '</div>';
    }
    html += '<div class="friends-toolbar friends-me-actions">';
    html += '<button type="button" class="action-btn friends-sync-btn" onclick="syncFriendsProfile()">🔄 Синхронизировать</button>';
    if (synced) {
        html += '<button type="button" class="action-btn friends-copy-code-btn" onclick="copyFriendsCode()">📋 Скопировать код</button>';
    }
    html += '</div>';
    if (synced) {
        html += '<p class="friends-sync-status">Последняя синхронизация: ' + escapeFriendsHtml(formatFriendSyncTime(f.lastSyncAt)) + '</p>';
    } else {
        html += '<p class="friends-sync-status friends-sync-status--warn">Профиль ещё не на сервере — нажмите «Синхронизировать».</p>';
    }
    html += '</div></div>';
    html += '</section>';

    html += '<section class="friends-panel friends-panel--add">';
    html += '<h3 class="friends-panel__title">➕ Добавить друга</h3>';
    html += '<div class="friends-toolbar friends-add-row">';
    html += '<input id="friendsAddCodeInput" class="hero-input friends-code-input" type="text" maxlength="8" placeholder="Код друга (6 символов)" autocomplete="off">';
    html += '<button type="button" class="action-btn" onclick="submitAddFriend()"' + (synced ? '' : ' disabled') + '>Добавить</button>';
    html += '</div>';
    html += '</section>';

    html += '<section class="friends-panel friends-panel--list">';
    html += '<div class="friends-list-header friends-toolbar">';
    html += '<h3 class="friends-panel__title">📋 Список друзей <span class="friends-list-count">(' + friends.length + ')</span></h3>';
    if (synced) {
        html += '<button type="button" class="action-btn friends-refresh-btn" onclick="refreshFriendsFromServer().then(function(){showFriends();})">🔄 Обновить</button>';
    }
    html += '</div>';

    if (!friends.length) {
        html += '<div class="friends-empty">';
        html += '<div class="friends-empty__icon" aria-hidden="true">👥</div>';
        html += '<p class="friends-empty__title">Пока нет друзей</p>';
        html += '<p class="friends-empty__hint">Добавьте код после синхронизации обоих игроков.</p>';
        html += '</div>';
    } else {
        html += '<div class="friends-list">';
        friends.forEach(function (entry) {
            html += renderFriendCard(entry);
        });
        html += '</div>';
    }
    html += '</section>';
    html += '</div>';

    el.innerHTML = html;
}

window.showFriends = showFriends;
window.syncFriendsProfile = syncFriendsProfile;
window.addFriendByCode = addFriendByCode;
window.submitAddFriend = submitAddFriend;
window.copyFriendsCode = copyFriendsCode;
window.saveFriendsApiFromUi = saveFriendsApiFromUi;
window.refreshFriendsFromServer = refreshFriendsFromServer;
window.getFriendsApiBase = getFriendsApiBase;
window.buildFriendsPublicProfile = buildFriendsPublicProfile;
window.renderFriendPortraitHTML = renderFriendPortraitHTML;
window.resolveFriendPortraitFromProfile = resolveFriendPortraitFromProfile;
window.findSkinDefInDb = findSkinDefInDb;
