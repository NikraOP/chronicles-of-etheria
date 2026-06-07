/**
 * Друзья: профиль и список на сервере (Timeweb), авто-синхронизация, добавление по коду.
 */
const FRIENDS_API_LS_KEY = 'etheria_friends_api_v1';
const FRIENDS_PROFILE_PUSH_MS = 2500;
const FRIENDS_LIST_POLL_MS = 6000;
const FRIENDS_INVITE_POLL_WAIT_SEC = 18;

let friendsScreenActive = false;
let friendsSessionPromise = null;
let friendsProfilePushTimer = null;
let friendsProfilePushInFlight = false;
let friendsListPollTimer = null;
let friendsInvitePollTimer = null;
let friendsInvitePollInFlight = false;
let friendsInvitePollSince = 0;
let friendsInvitePollActive = false;
let friendsLastHandledInviteId = '';
let friendsDungeonInvitePollSince = 0;
let friendsLastHandledDungeonInviteId = '';

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
        ? 'https://5-42-103-145.sslip.io'
        : 'http://localhost:8790';
}

function getFriendsBackendKind() {
    const sb = getFriendsSupabaseConfig();
    if (sb.url && sb.key) return 'supabase';
    return 'http';
}

function getFriendsBackendLabel() {
    if (getFriendsBackendKind() === 'supabase') return 'Supabase';
    return 'Сервер Etheria';
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

function escapeFriendsAttr(s) {
    return escapeFriendsHtml(s).replace(/'/g, '&#39;');
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
    const doFetch = typeof cloudApiFetch === 'function' ? cloudApiFetch : fetch;
    const res = await doFetch(friendsApiUrl(path), {
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

function resolveFriendPlayerId(rawId) {
    const id = String(rawId || '').trim();
    if (!id || !player) return '';
    if (id.indexOf('p_') === 0) return id;
    ensureFriendsPlayerState();
    const cached = player.friends.cached || [];
    for (let i = 0; i < cached.length; i++) {
        const entry = cached[i];
        if (!entry) continue;
        if (entry.playerId === id) return entry.playerId;
        if (entry.friendCode && String(entry.friendCode).toUpperCase() === id.toUpperCase()) {
            return entry.playerId || '';
        }
    }
    return id;
}

function friendsErrorMessage(err) {
    const code = err && (err.message || (err.data && err.data.error));
    const serverMsg = err && err.data && err.data.message;
    if (code === 'unauthorized') return 'Сессия устарела — откройте вкладку «Друзья» снова.';
    if (code === 'not_friend') return 'Этот игрок не в списке друзей. Обновите вкладку «Друзья».';
    if (code === 'invalid_target') {
        return serverMsg || 'Некорректный друг. Обновите список друзей и попробуйте снова.';
    }
    if (code === 'invite_not_found') return 'Приглашение устарело или уже обработано.';
    if (code === 'offer_not_found') return 'Обмен устарел или уже обработан.';
    if (code === 'exchange_limit') return 'Слишком много активных обменов.';
    if (code === 'empty_offer' || code === 'empty_request') return (err.data && err.data.message) || 'Заполните предложение обмена.';
    if (code === 'not_friend') return 'Можно обмениваться только с друзьями из списка.';
    if (code === 'not_friend') return 'Можно вызывать только из списка друзей.';
    if (code === 'room_exists') return 'Не удалось создать комнату — попробуйте снова.';
    if (code === 'room_not_found') return 'Комната PvP не найдена (истекла).';
    if (code === 'room_exists') return 'Комната уже занята — попробуйте снова.';
    if (code === 'code_not_found') return 'Код не найден. Друг должен хотя бы раз открыть вкладку «Друзья» в игре.';
    if (code === 'self_friend') return 'Нельзя добавить свой собственный код.';
    if (code === 'friends_limit') return 'Слишком много друзей на сервере.';
    if (err && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
        const hint = typeof cloudApiNetworkHint === 'function' ? cloudApiNetworkHint(err) : '';
        if (isGitHubPagesHost()) {
            return 'API недоступен.' + (hint || ' Подождите ~60 с (Render) или настройте Blueprint / Supabase (docs/FRIENDS_GITHUB_PAGES.md).');
        }
        return 'Сервер недоступен. Запустите npm run start:friends или укажите URL API.' + hint;
    }
    return 'Ошибка: ' + (code || 'неизвестно');
}

async function ensureFriendsOnlineSession(options) {
    options = options || {};
    if (!player) return false;
    ensureFriendsPlayerState();
    if (friendsSessionPromise) return friendsSessionPromise;

    friendsSessionPromise = (async function () {
        try {
            const data = await friendsBackendSync(buildFriendsPublicProfile());
            player.friends.playerId = data.playerId;
            player.friends.syncToken = data.syncToken;
            player.friends.friendCode = data.friendCode;
            player.friends.lastSyncAt = data.updatedAt || Date.now();
            if (typeof saveGame === 'function') saveGame();
            startFriendsInvitePolling();
            return true;
        } catch (err) {
            if (!options.silent && typeof addMessage === 'function') {
                addMessage('❌ ' + friendsErrorMessage(err), 'error');
            }
            return false;
        } finally {
            friendsSessionPromise = null;
        }
    })();

    return friendsSessionPromise;
}

function scheduleFriendsProfilePush() {
    if (!player) return;
    ensureFriendsPlayerState();
    if (!player.friends.playerId || !player.friends.syncToken) return;
    if (friendsProfilePushTimer) clearTimeout(friendsProfilePushTimer);
    friendsProfilePushTimer = setTimeout(friendsPushProfileNow, FRIENDS_PROFILE_PUSH_MS);
}

async function friendsPushProfileNow() {
    if (!player || !player.friends || !player.friends.playerId) return;
    if (friendsProfilePushInFlight) return;
    friendsProfilePushInFlight = true;
    try {
        const data = await friendsBackendSync(buildFriendsPublicProfile());
        player.friends.lastSyncAt = data.updatedAt || Date.now();
        if (data.friendCode) player.friends.friendCode = data.friendCode;
        if (typeof saveGame === 'function') saveGame();
        friendsUpdateLiveStatus('online');
    } catch (err) {
        friendsUpdateLiveStatus('error');
        console.warn('[friends] push failed', err);
    } finally {
        friendsProfilePushInFlight = false;
    }
}

function stopFriendsLiveUpdates() {
    friendsScreenActive = false;
    if (friendsListPollTimer) {
        clearInterval(friendsListPollTimer);
        friendsListPollTimer = null;
    }
    if (typeof stopFriendsExchangePolling === 'function') stopFriendsExchangePolling();
}

function startFriendsLiveUpdates() {
    stopFriendsLiveUpdates();
    friendsScreenActive = true;
    friendsListPollTimer = setInterval(friendsListPollTick, FRIENDS_LIST_POLL_MS);
}

async function friendsListPollTick() {
    if (!document.querySelector('.friends-screen')) {
        stopFriendsLiveUpdates();
        return;
    }
    
    // Не обновляем UI, если пользователь активно вводит код друга
    const friendInput = document.getElementById('friendsAddCodeInput');
    if (friendInput && document.activeElement === friendInput) {
        // Пропускаем обновление при любом активном вводе, даже если поле пустое
        return;
    }
    
    await refreshFriendsFromServer();
    if (!document.querySelector('.friends-screen')) return;
    if (typeof getFriendsActiveTab === 'function' && getFriendsActiveTab() === 'exchanges' &&
        typeof refreshExchangesList === 'function') {
        await refreshExchangesList();
    }
    renderFriendsScreenInner();
}

function friendsUpdateLiveStatus(mode) {
    const el = document.getElementById('friendsLiveStatus');
    if (!el) return;
    if (mode === 'loading') el.textContent = 'Подключение к серверу…';
    else if (mode === 'online') el.textContent = 'На сервере · профиль обновляется автоматически';
    else if (mode === 'error') el.textContent = 'Нет связи с сервером';
    else el.textContent = 'На сервере';
}

async function syncFriendsProfile() {
    const ok = await ensureFriendsOnlineSession({ silent: false });
    if (ok) {
        await refreshFriendsFromServer();
        if (friendsScreenActive) renderFriendsScreenInner();
        if (typeof addMessage === 'function') {
            addMessage('✅ Профиль на сервере. Код: ' + (player.friends.friendCode || ''), 'success');
        }
    }
    return ok;
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
    const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length < 4) {
        if (typeof addMessage === 'function') addMessage('❌ Введите код друга (6 символов)', 'error');
        return;
    }
    friendsUpdateLiveStatus('loading');
    const ready = await ensureFriendsOnlineSession({ silent: false });
    if (!ready) return;
    try {
        const data = await friendsBackendAddFriend(normalized);
        const name = data.friend && data.friend.profile && data.friend.profile.name
            ? data.friend.profile.name
            : normalized;
        if (typeof addMessage === 'function') addMessage('✅ В друзьях: ' + name, 'success');
        await refreshFriendsFromServer();
        renderFriendsScreenInner();
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
        friendsUpdateLiveStatus('online');
    }
}

async function removeFriendById(friendPlayerId, friendName) {
    if (!player) return;
    const name = friendName || 'этого друга';
    const confirmed = confirm('Удалить из друзей: ' + name + '?');
    if (!confirmed) return;
    
    // 1. Сохраняем копию текущего списка для отката
    const originalList = [...(player.friends.cached || [])];
    
    // 2. Локальное удаление для мгновенной обратной связи
    player.friends.cached = player.friends.cached.filter(
        f => f.playerId !== friendPlayerId
    );
    if (typeof saveGame === 'function') saveGame();
    renderFriendsScreenInner();
    
    friendsUpdateLiveStatus('loading');
    const ready = await ensureFriendsOnlineSession({ silent: false });
    if (!ready) {
        // Откат локального удаления при ошибке сессии
        player.friends.cached = originalList;
        if (typeof saveGame === 'function') saveGame();
        renderFriendsScreenInner();
        return;
    }
    
    try {
        const backend = getFriendsBackendKind();
        if (backend === 'http') {
            await friendsHttpFetch('/api/v1/friends/' + encodeURIComponent(friendPlayerId), {
                method: 'DELETE'
            });
        } else if (backend === 'supabase') {
            // Добавляем поддержку Supabase
            await friendsSupabaseRpc('etheria_remove_friend', {
                p_player_id: player.friends.playerId,
                p_sync_token: player.friends.syncToken,
                p_friend_player_id: friendPlayerId
            });
        }
        
        if (typeof addMessage === 'function') addMessage('✅ Удалено: ' + name, 'success');
        // Обновляем список для синхронизации статуса
        await refreshFriendsFromServer();
    } catch (err) {
        // Откат при ошибке сервера
        player.friends.cached = originalList;
        if (typeof saveGame === 'function') saveGame();
        renderFriendsScreenInner();
        
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
        friendsUpdateLiveStatus('online');
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

function closeBattleInviteModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
    window._battleInviteModalOpen = false;
    window._pendingBattleInviteId = '';
}

function showBattleInviteModal(invite) {
    if (!invite || !invite.inviteId) return;
    if (window._battleInviteModalOpen) return;
    if (window.pvpBattleActive) return;
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    const name = escapeFriendsHtml(invite.fromName || 'Друг');
    const cls = escapeFriendsHtml(invite.fromClass || '');
    const meta = cls ? '<span class="modal-duel__meta">' + cls + '</span>' : '';
    window._battleInviteModalOpen = true;
    window._pendingBattleInviteId = invite.inviteId;
    content.innerHTML =
        '<div class="modal-duel">' +
        '<div class="modal-duel__icon" aria-hidden="true">⚔️</div>' +
        '<h3 class="modal-duel__title">Вызов на PvP</h3>' +
        '<p class="modal-duel__msg"><strong>' + name + '</strong> приглашает вас на бой 1 на 1.' + meta + '</p>' +
        '<p class="modal-duel__hint">Примите — откроется арена. Отклоните — вызов будет отменён.</p>' +
        '<div class="modal-duel__actions">' +
        '<button type="button" class="modal-btn modal-btn--primary" onclick="acceptBattleInvite()">Принять</button>' +
        '<button type="button" class="modal-btn modal-btn--ghost" onclick="declineBattleInvite()">Отклонить</button>' +
        '</div></div>';
    modal.style.display = 'flex';
}

async function acceptBattleInvite() {
    const inviteId = window._pendingBattleInviteId;
    closeBattleInviteModal();
    if (!inviteId) return;
    friendsLastHandledInviteId = inviteId;
    try {
        await ensureFriendsOnlineSession({ silent: false });
        const data = await friendsHttpFetch('/api/v1/pvp/invite/' + encodeURIComponent(inviteId) + '/respond', {
            method: 'POST',
            body: { accept: true }
        });
        if (!data.roomCode) throw new Error('no_room');
        if (typeof addMessage === 'function') addMessage('⚔️ Принят вызов — подключаемся к арене…', 'success');
        if (typeof showPvPArena === 'function') showPvPArena();
        if (typeof joinPvPRoomWithCode === 'function') joinPvPRoomWithCode(data.roomCode);
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
    }
}

async function declineBattleInvite() {
    const inviteId = window._pendingBattleInviteId;
    closeBattleInviteModal();
    if (!inviteId) return;
    friendsLastHandledInviteId = inviteId;
    try {
        await ensureFriendsOnlineSession({ silent: true });
        await friendsHttpFetch('/api/v1/pvp/invite/' + encodeURIComponent(inviteId) + '/respond', {
            method: 'POST',
            body: { accept: false }
        });
        if (typeof addMessage === 'function') addMessage('Вызов на бой отклонён.', 'info');
    } catch (_) { /* ignore */ }
}

function scheduleFriendsInvitePoll(delayMs) {
    if (!friendsInvitePollActive) return;
    if (friendsInvitePollTimer) clearTimeout(friendsInvitePollTimer);
    friendsInvitePollTimer = setTimeout(friendsInvitePollTick, delayMs == null ? 400 : delayMs);
}

async function friendsInvitePollTick() {
    if (!player) {
        scheduleFriendsInvitePoll(8000);
        return;
    }
    ensureFriendsPlayerState();
    if (getFriendsBackendKind() !== 'http') return;
    if (friendsInvitePollInFlight) return;
    if (window._battleInviteModalOpen || window._dungeonInviteModalOpen || window.pvpBattleActive) {
        scheduleFriendsInvitePoll(3000);
        return;
    }
    friendsInvitePollInFlight = true;
    try {
        if (!player.friends.playerId || !player.friends.syncToken) {
            await ensureFriendsOnlineSession({ silent: true });
        }
        if (!player.friends.playerId) {
            scheduleFriendsInvitePoll(8000);
            return;
        }
        const data = await friendsHttpFetch(
            '/api/v1/pvp/invites/poll?since=' + encodeURIComponent(String(friendsInvitePollSince || 0)) +
            '&wait=' + FRIENDS_INVITE_POLL_WAIT_SEC
        );
        if (data && Number.isFinite(data.seq)) friendsInvitePollSince = data.seq;
        const inv = data && data.invite;
        if (inv && inv.inviteId && inv.status === 'pending' && inv.inviteId !== friendsLastHandledInviteId) {
            showBattleInviteModal(inv);
        }
        const dData = await friendsHttpFetch(
            '/api/v1/dungeon-duo/invites/poll?since=' + encodeURIComponent(String(friendsDungeonInvitePollSince || 0)) +
            '&wait=0'
        );
        if (dData && Number.isFinite(dData.seq)) friendsDungeonInvitePollSince = dData.seq;
        const dInv = dData && dData.invite;
        if (dInv && dInv.inviteId && dInv.status === 'pending' &&
            dInv.inviteId !== friendsLastHandledDungeonInviteId && !window._dungeonInviteModalOpen) {
            showDungeonInviteModal(dInv);
        }
    } catch (_) { /* offline */ }
    finally {
        friendsInvitePollInFlight = false;
        scheduleFriendsInvitePoll(500);
    }
}

function startFriendsInvitePolling() {
    if (getFriendsBackendKind() !== 'http') return;
    if (friendsInvitePollActive) return;
    friendsInvitePollActive = true;
    scheduleFriendsInvitePoll(1200);
}

function stopFriendsInvitePolling() {
    friendsInvitePollActive = false;
    if (friendsInvitePollTimer) {
        clearTimeout(friendsInvitePollTimer);
        friendsInvitePollTimer = null;
    }
}

function isFriendsDungeonUnlocked(dungeon) {
    if (!dungeon || !player) return false;
    return player.level >= (dungeon.minLevel || 1);
}

function canInviteFriendToDungeon() {
    if (!player) return false;
    if (getFriendsBackendKind() !== 'http') return false;
    if (typeof isDungeonDuoReady === 'function' && !isDungeonDuoReady()) return false;
    if (typeof shouldUseDungeonDuoCloudTransport === 'function' && !shouldUseDungeonDuoCloudTransport()) {
        return false;
    }
    return true;
}

function getFriendDungeonInviteList() {
    const db = typeof window !== 'undefined' && window.DUNGEONS_DB ? window.DUNGEONS_DB : [];
    return db
        .filter(function (d) { return d && d.mode === 'duo'; })
        .slice()
        .sort(function (a, b) {
            return (a.minLevel || 1) - (b.minLevel || 1);
        });
}

function closeDungeonInviteModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
    window._dungeonInviteModalOpen = false;
    window._dungeonInvitePickerOpen = false;
    window._pendingDungeonInviteId = '';
    window._dungeonInviteTargetId = '';
    window._dungeonInviteTargetName = '';
}

function closeDungeonInvitePickerModal() {
    window._dungeonInvitePickerOpen = false;
    const modal = document.getElementById('modalOverlay');
    if (modal && !window._dungeonInviteModalOpen) modal.style.display = 'none';
}

function showDungeonInvitePickerModal(targetPlayerId, friendName) {
    if (!player) return;
    if (!canInviteFriendToDungeon()) {
        if (typeof addMessage === 'function') {
            addMessage(
                'Приглашение в подземелье работает через сервер Etheria (облачный дуо-режим).',
                'error'
            );
        }
        return;
    }
    const toId = resolveFriendPlayerId(targetPlayerId);
    if (!toId) {
        if (typeof addMessage === 'function') addMessage('❌ Не удалось определить друга.', 'error');
        return;
    }
    const dungeons = getFriendDungeonInviteList();
    if (!dungeons.length) {
        if (typeof addMessage === 'function') addMessage('❌ Нет дуо-подземелий.', 'error');
        return;
    }
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    window._dungeonInvitePickerOpen = true;
    window._dungeonInviteTargetId = toId;
    window._dungeonInviteTargetName = friendName || 'друг';
    let rows = '';
    dungeons.forEach(function (d) {
        const unlocked = isFriendsDungeonUnlocked(d);
        const min = d.minLevel || 1;
        const cls = unlocked ? '' : ' friend-dungeon-pick__row--locked';
        const disabled = unlocked ? '' : ' disabled aria-disabled="true"';
        rows +=
            '<button type="button" class="friend-dungeon-pick__row' + cls + '"' + disabled +
            ' data-dungeon-invite-id="' + escapeFriendsAttr(d.id) + '"' +
            ' data-dungeon-invite-name="' + escapeFriendsAttr(d.name || d.id) + '">' +
            '<span class="friend-dungeon-pick__icon" aria-hidden="true">' + escapeFriendsHtml(d.icon || '🏰') + '</span>' +
            '<span class="friend-dungeon-pick__info">' +
            '<span class="friend-dungeon-pick__name">' + escapeFriendsHtml(d.name || d.id) + '</span>' +
            '<span class="friend-dungeon-pick__level">⭐ Ур. ' + min + '</span>' +
            '</span></button>';
    });
    content.innerHTML =
        '<div class="friend-dungeon-pick">' +
        '<h3 class="friend-dungeon-pick__title">Позвать в подземелье</h3>' +
        '<p class="friend-dungeon-pick__hint">Выберите данж для <strong>' + escapeFriendsHtml(friendName || 'друга') +
        '</strong>. Недоступные по уровню перечёркнуты.</p>' +
        '<div class="friend-dungeon-pick__list">' + rows + '</div>' +
        '<button type="button" class="modal-btn modal-btn--ghost friend-dungeon-pick__cancel" onclick="closeDungeonInvitePickerModal()">Отмена</button>' +
        '</div>';
    modal.style.display = 'flex';
}

async function sendDungeonInviteToFriend(dungeonId, dungeonName) {
    const toId = window._dungeonInviteTargetId;
    const friendName = window._dungeonInviteTargetName || 'друг';
    closeDungeonInvitePickerModal();
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
    if (!toId || !dungeonId) return;
    const dungeonDef = typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null;
    if (!dungeonDef || !isFriendsDungeonUnlocked(dungeonDef)) {
        if (typeof addMessage === 'function') addMessage('❌ Подземелье недоступно по уровню.', 'error');
        return;
    }
    if (typeof buildDuoLobbyPlayerSnapshot !== 'function') {
        if (typeof addMessage === 'function') addMessage('❌ Дуо-подземелье недоступно.', 'error');
        return;
    }
    friendsUpdateLiveStatus('loading');
    const ready = await ensureFriendsOnlineSession({ silent: false });
    if (!ready) return;
    const snap = buildDuoLobbyPlayerSnapshot();
    try {
        const data = await friendsHttpFetch('/api/v1/dungeon-duo/invite', {
            method: 'POST',
            body: {
                toPlayerId: toId,
                dungeonId: dungeonId,
                dungeonName: dungeonName,
                snapshot: snap
            }
        });
        if (!data.roomCode || !data.sessionId) throw new Error('no_room');
        if (typeof startDungeonDuoInviteHost === 'function') {
            const ok = await startDungeonDuoInviteHost(data.dungeonId || dungeonId, data.roomCode, data.sessionId);
            if (!ok) throw new Error('lobby_failed');
        }
        if (typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
        if (typeof addMessage === 'function') {
            addMessage('🏰 Приглашение в «' + (dungeonName || 'подземелье') + '» отправлено: ' + friendName, 'success');
        }
        friendsUpdateLiveStatus('online');
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
        friendsUpdateLiveStatus('online');
    }
}

function showDungeonInviteModal(invite) {
    if (!invite || !invite.inviteId) return;
    if (window._dungeonInviteModalOpen || window._battleInviteModalOpen) return;
    if (window.pvpBattleActive) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (duo && (duo.status === 'battle' || duo.status === 'run')) return;
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;
    const name = escapeFriendsHtml(invite.fromName || 'Друг');
    const cls = escapeFriendsHtml(invite.fromClass || '');
    const meta = cls ? '<span class="modal-duel__meta">' + cls + '</span>' : '';
    const dName = escapeFriendsHtml(invite.dungeonName || invite.dungeonId || 'подземелье');
    window._dungeonInviteModalOpen = true;
    window._pendingDungeonInviteId = invite.inviteId;
    content.innerHTML =
        '<div class="modal-duel modal-duel--dungeon">' +
        '<div class="modal-duel__icon" aria-hidden="true">🏰</div>' +
        '<h3 class="modal-duel__title">Приглашение в подземелье</h3>' +
        '<p class="modal-duel__msg"><strong>' + name + '</strong> зовёт вас в <strong>' + dName + '</strong>.' + meta + '</p>' +
        '<p class="modal-duel__hint">Примите — откроется лобби дуо. Отклоните — приглашение будет отменено.</p>' +
        '<div class="modal-duel__actions">' +
        '<button type="button" class="modal-btn modal-btn--primary" onclick="acceptDungeonInvite()">Принять</button>' +
        '<button type="button" class="modal-btn modal-btn--ghost" onclick="declineDungeonInvite()">Отклонить</button>' +
        '</div></div>';
    modal.style.display = 'flex';
}

function closeDungeonInviteIncomingModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.style.display = 'none';
    window._dungeonInviteModalOpen = false;
    window._pendingDungeonInviteId = '';
}

async function acceptDungeonInvite() {
    const inviteId = window._pendingDungeonInviteId;
    closeDungeonInviteIncomingModal();
    if (!inviteId) return;
    friendsLastHandledDungeonInviteId = inviteId;
    try {
        await ensureFriendsOnlineSession({ silent: false });
        const data = await friendsHttpFetch(
            '/api/v1/dungeon-duo/invite/' + encodeURIComponent(inviteId) + '/respond',
            { method: 'POST', body: { accept: true } }
        );
        if (!data.roomCode) throw new Error('no_room');
        if (typeof addMessage === 'function') addMessage('🏰 Принято — подключаемся к лобби…', 'success');
        if (typeof joinDuoDungeonLobby === 'function') {
            const ok = await joinDuoDungeonLobby(data.roomCode);
            if (!ok) throw new Error('join_failed');
        }
        if (typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
    }
}

async function declineDungeonInvite() {
    const inviteId = window._pendingDungeonInviteId;
    closeDungeonInviteIncomingModal();
    if (!inviteId) return;
    friendsLastHandledDungeonInviteId = inviteId;
    try {
        await ensureFriendsOnlineSession({ silent: true });
        await friendsHttpFetch(
            '/api/v1/dungeon-duo/invite/' + encodeURIComponent(inviteId) + '/respond',
            { method: 'POST', body: { accept: false } }
        );
        if (typeof addMessage === 'function') addMessage('Приглашение в подземелье отклонено.', 'info');
    } catch (_) { /* ignore */ }
}

function openFriendDungeonInvitePicker(targetPlayerId, friendName) {
    if (!canInviteFriendToDungeon()) {
        if (typeof addMessage === 'function') {
            addMessage('Приглашение в подземелье доступно на сервере Etheria (GitHub Pages / облачный дуо).', 'error');
        }
        return;
    }
    showDungeonInvitePickerModal(targetPlayerId, friendName);
}

async function challengeFriendToPvP(targetPlayerId, friendName) {
    if (!player) return;
    if (getFriendsBackendKind() !== 'http') {
        if (typeof addMessage === 'function') {
            addMessage('Вызов на бой работает через сервер Etheria (не Supabase).', 'error');
        }
        return;
    }
    const toId = resolveFriendPlayerId(targetPlayerId);
    if (!toId) {
        if (typeof addMessage === 'function') addMessage('❌ Не удалось определить друга. Обновите список друзей.', 'error');
        return;
    }
    if (toId === player.friends.playerId) {
        if (typeof addMessage === 'function') addMessage('❌ Нельзя вызвать на бой самого себя.', 'error');
        return;
    }
    if (typeof getPvPPlayerSnapshot !== 'function') {
        if (typeof addMessage === 'function') addMessage('❌ PvP недоступен.', 'error');
        return;
    }
    friendsUpdateLiveStatus('loading');
    const ready = await ensureFriendsOnlineSession({ silent: false });
    if (!ready) return;
    const snap = getPvPPlayerSnapshot();
    try {
        const data = await friendsHttpFetch('/api/v1/pvp/invite', {
            method: 'POST',
            body: { toPlayerId: toId, snapshot: snap }
        });
        if (typeof showPvPArena === 'function') showPvPArena();
        if (typeof startPvPChallengeHost === 'function') {
            startPvPChallengeHost(data.roomCode, data.sessionId);
        }
        if (typeof addMessage === 'function') {
            addMessage('⚔️ Приглашение отправлено: ' + (friendName || 'другу'), 'success');
        }
        friendsUpdateLiveStatus('online');
    } catch (err) {
        if (typeof addMessage === 'function') addMessage('❌ ' + friendsErrorMessage(err), 'error');
        friendsUpdateLiveStatus('online');
    }
}

function renderFriendCard(entry) {
    const p = entry.profile || {};
    const st = p.stats || {};
    const updated = formatFriendSyncTime(entry.updatedAt);
    const playerId = entry.playerId || '';
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
        '<button type="button" class="friend-card__remove-btn" title="Удалить из друзей" aria-label="Удалить друга" ' +
        'onclick="removeFriendById(\'' + escapeFriendsAttr(playerId) + '\',\'' + escapeFriendsAttr(p.name || 'Герой') + '\')">🗑️</button>' +
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
        '<footer class="friend-card__footer">' +
        '<div class="friend-card__actions">' +
        (playerId
            ? '<button type="button" class="action-btn friend-exchange-btn" data-exchange-target-id="' +
                escapeFriendsAttr(playerId) + '" data-exchange-target-name="' +
                escapeFriendsAttr(p.name || 'Герой') + '">🎁 Обмен</button>' +
            '<button type="button" class="action-btn friend-duel-btn" data-pvp-challenge-id="' +
                escapeFriendsAttr(playerId) + '" data-pvp-challenge-name="' +
                escapeFriendsAttr(p.name || 'Герой') + '">⚔️ Вызвать на бой</button>' +
            (canInviteFriendToDungeon()
                ? '<button type="button" class="action-btn friend-dungeon-invite-btn" data-dungeon-invite-target-id="' +
                    escapeFriendsAttr(playerId) + '" data-dungeon-invite-target-name="' +
                    escapeFriendsAttr(p.name || 'Герой') + '">🏰 В подземелье</button>'
                : '')
            : '<p class="friend-card__no-id">Друг офлайн — попросите открыть вкладку «Друзья»</p>') +
        '</div>' +
        '<span class="friend-card__footer-time"><span class="friend-card__footer-icon" aria-hidden="true">🕐</span> Обновлено: ' +
        escapeFriendsHtml(updated) + '</span></footer>' +
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
        ensureFriendsOnlineSession({ silent: false });
        if (typeof addMessage === 'function') addMessage('Подождите, получаем ваш код…', 'info');
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
    if (getFriendsBackendKind() === 'http' && typeof wakeCloudApi === 'function') {
        wakeCloudApi(getFriendsApiBase());
    }
    ensureFriendsPlayerState();
    const el = document.getElementById('dynamicContent');
    if (!el) return;
    stopFriendsLiveUpdates();
    friendsScreenActive = true;
    el.innerHTML = '<div class="friends-screen friends-screen--loading"><h2>👥 Друзья</h2><p>Подключение к серверу…</p></div>';
    friendsOpenScreen();
}

async function friendsOpenScreen() {
    friendsUpdateLiveStatus('loading');
    await ensureFriendsOnlineSession({ silent: true });
    await refreshFriendsFromServer();
    startFriendsLiveUpdates();
    startFriendsInvitePolling();
    if (typeof startFriendsExchangePolling === 'function') startFriendsExchangePolling();
    scheduleFriendsProfilePush();
    renderFriendsScreenInner();
}

function renderFriendsScreenInner() {
    if (!player) return;
    const el = document.getElementById('dynamicContent');
    if (!el) return;
    ensureFriendsPlayerState();

    const f = player.friends;
    const backendLabel = getFriendsBackendLabel();
    const synced = !!(f.playerId && f.syncToken);
    const friends = f.cached || [];
    const myProfile = buildFriendsPublicProfile();

    // Сохраняем значение поля ввода перед перерисовкой
    const existingInput = document.getElementById('friendsAddCodeInput');
    const savedInputValue = existingInput ? existingInput.value : '';
    const hadFocus = existingInput && document.activeElement === existingInput;

    let html = '<div class="friends-screen">';
    html += '<header class="friends-screen__head">';
    html += '<h2 class="friends-screen__title">👥 Друзья</h2>';
    html += '<p class="friends-screen__hint">Как в онлайн-игре: откройте вкладку — профиль на сервере. Друг вводит ваш код — видит статы и вещи. Обновление автоматическое.</p>';
    html += '<p id="friendsLiveStatus" class="friends-live-status">' + escapeFriendsHtml(synced ? 'На сервере' : 'Подключение…') + '</p>';
    html += '<span class="friends-backend-badge">' + escapeFriendsHtml(backendLabel) + '</span>';
    html += '</header>';

    if (typeof buildFriendsTabsHtml === 'function') {
        html += buildFriendsTabsHtml();
    }

    if (typeof getFriendsActiveTab === 'function' && getFriendsActiveTab() === 'exchanges') {
        if (typeof renderExchangesTabHtml === 'function') {
            html += renderExchangesTabHtml();
        }
        html += '</div>';
        el.innerHTML = html;
        friendsUpdateLiveStatus(synced ? 'online' : 'loading');
        return;
    }

    html += '<section class="friends-panel friends-panel--me">';
    html += '<div class="friends-me-layout">';
    html += '<div class="friends-me-preview">' + renderFriendPortraitBlock(myProfile, { size: 'preview' }) + '</div>';
    html += '<div class="friends-me-body">';
    html += '<h3 class="friends-panel__title">Ваш код для друзей</h3>';
    if (synced && f.friendCode) {
        html += '<div class="friends-code-badge friends-code-badge--large">';
        html += '<span class="friends-code-badge__code">' + escapeFriendsHtml(f.friendCode) + '</span>';
        html += '</div>';
        html += '<button type="button" class="action-btn friends-copy-code-btn" onclick="copyFriendsCode()">📋 Скопировать код</button>';
        html += '<p class="friends-sync-status">Обновлено: ' + escapeFriendsHtml(formatFriendSyncTime(f.lastSyncAt)) + '</p>';
    } else {
        html += '<p class="friends-sync-status friends-sync-status--warn">Получаем код с сервера…</p>';
    }
    html += '</div></div></section>';

    html += '<section class="friends-panel friends-panel--add">';
    html += '<h3 class="friends-panel__title">➕ Добавить друга по коду</h3>';
    html += '<div class="friends-toolbar friends-add-row">';
    html += '<input id="friendsAddCodeInput" class="hero-input friends-code-input" type="text" maxlength="8" placeholder="Например ABC123" autocomplete="off">';
    html += '<button type="button" class="action-btn friends-add-btn" onclick="submitAddFriend()">Добавить</button>';
    html += '</div>';
    html += '</section>';

    html += '<section class="friends-panel friends-panel--list">';
    html += '<h3 class="friends-panel__title">📋 Друзья <span class="friends-list-count">(' + friends.length + ')</span></h3>';

    if (!friends.length) {
        html += '<div class="friends-empty">';
        html += '<div class="friends-empty__icon" aria-hidden="true">👥</div>';
        html += '<p class="friends-empty__title">Пока никого нет</p>';
        html += '<p class="friends-empty__hint">Попросите друга открыть «Друзья» в игре и прислать его код.</p>';
        html += '</div>';
    } else {
        html += '<div class="friends-list">';
        friends.forEach(function (entry) {
            html += renderFriendCard(entry);
        });
        html += '</div>';
    }
    html += '</section></div>';

    el.innerHTML = html;
    friendsUpdateLiveStatus(synced ? 'online' : 'loading');

    // Восстанавливаем значение и фокус поля ввода после перерисовки
    if (savedInputValue) {
        const newInput = document.getElementById('friendsAddCodeInput');
        if (newInput) {
            newInput.value = savedInputValue;
            if (hadFocus) {
                newInput.focus();
                // Восстанавливаем позицию курсора в конец
                const len = savedInputValue.length;
                if (newInput.setSelectionRange) {
                    newInput.setSelectionRange(len, len);
                }
            }
        }
    }
}

function friendsHookSaveGame() {
    if (window.__friendsSaveHooked) return;
    const orig = window.saveGame;
    if (typeof orig !== 'function') return;
    window.saveGame = function () {
        orig.apply(this, arguments);
        scheduleFriendsProfilePush();
    };
    window.__friendsSaveHooked = true;
}

function friendsHookRenderGame() {
    if (window.__friendsRenderHooked) return;
    const orig = window._originalRenderGame || window.renderGame;
    if (typeof orig !== 'function') return;
    if (!window._originalRenderGame) window._originalRenderGame = orig;
    window.renderGame = function () {
        orig.apply(this, arguments);
        if (player && player.friends) {
            scheduleFriendsProfilePush();
            startFriendsInvitePolling();
            if (typeof startFriendsExchangePolling === 'function') startFriendsExchangePolling();
            if (!player.friends.playerId && typeof ensureFriendsOnlineSession === 'function') {
                ensureFriendsOnlineSession({ silent: true });
            }
        }
    };
    window.__friendsRenderHooked = true;
}

function bindFriendsDuelClickDelegation() {
    if (window.__friendsDuelClickBound) return;
    document.addEventListener('click', function (e) {
        const duelBtn = e.target && e.target.closest ? e.target.closest('.friend-duel-btn') : null;
        if (duelBtn) {
            const id = duelBtn.getAttribute('data-pvp-challenge-id');
            const name = duelBtn.getAttribute('data-pvp-challenge-name') || 'друг';
            if (id && typeof challengeFriendToPvP === 'function') {
                e.preventDefault();
                challengeFriendToPvP(id, name);
            }
            return;
        }
        const dungeonBtn = e.target && e.target.closest ? e.target.closest('.friend-dungeon-invite-btn') : null;
        if (dungeonBtn) {
            const tid = dungeonBtn.getAttribute('data-dungeon-invite-target-id');
            const tname = dungeonBtn.getAttribute('data-dungeon-invite-target-name') || 'друг';
            if (tid && typeof openFriendDungeonInvitePicker === 'function') {
                e.preventDefault();
                openFriendDungeonInvitePicker(tid, tname);
            }
            return;
        }
        const pickRow = e.target && e.target.closest ? e.target.closest('.friend-dungeon-pick__row:not([disabled])') : null;
        if (pickRow && window._dungeonInvitePickerOpen) {
            const did = pickRow.getAttribute('data-dungeon-invite-id');
            const dname = pickRow.getAttribute('data-dungeon-invite-name') || did;
            if (did && typeof sendDungeonInviteToFriend === 'function') {
                e.preventDefault();
                sendDungeonInviteToFriend(did, dname);
            }
        }
    });
    window.__friendsDuelClickBound = true;
}

friendsHookSaveGame();
friendsHookRenderGame();
bindFriendsDuelClickDelegation();

window.showFriends = showFriends;
window.syncFriendsProfile = syncFriendsProfile;
window.addFriendByCode = addFriendByCode;
window.removeFriendById = removeFriendById;
window.submitAddFriend = submitAddFriend;
window.copyFriendsCode = copyFriendsCode;
window.saveFriendsApiFromUi = saveFriendsApiFromUi;
window.refreshFriendsFromServer = refreshFriendsFromServer;
window.ensureFriendsOnlineSession = ensureFriendsOnlineSession;
window.scheduleFriendsProfilePush = scheduleFriendsProfilePush;
window.getFriendsApiBase = getFriendsApiBase;
window.buildFriendsPublicProfile = buildFriendsPublicProfile;
window.renderFriendPortraitHTML = renderFriendPortraitHTML;
window.resolveFriendPortraitFromProfile = resolveFriendPortraitFromProfile;
window.findSkinDefInDb = findSkinDefInDb;
window.challengeFriendToPvP = challengeFriendToPvP;
window.openFriendDungeonInvitePicker = openFriendDungeonInvitePicker;
window.closeDungeonInvitePickerModal = closeDungeonInvitePickerModal;
window.acceptDungeonInvite = acceptDungeonInvite;
window.declineDungeonInvite = declineDungeonInvite;
window.resolveFriendPlayerId = resolveFriendPlayerId;
window.acceptBattleInvite = acceptBattleInvite;
window.declineBattleInvite = declineBattleInvite;
window.startFriendsInvitePolling = startFriendsInvitePolling;
