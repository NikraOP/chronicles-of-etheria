/**
 * PvP через облако (тот же API, что и друзья): комнаты, опрос, авто-синхронизация ходов.
 */
const PVP_CLOUD_LS_KEY = 'etheria_pvp_cloud_v1';
const PVP_CLOUD_POLL_WAIT_SEC = 22;
const PVP_CLOUD_POLL_GAP_MS = 120;
const PVP_MSG_VERSION = 2;

let pvpCloudPollTimer = null;
let pvpCloudLastSeq = 0;
let pvpCloudPollInFlight = false;
let pvpCloudSyncPending = false;

function isGitHubPagesHostPvp() {
    const host = typeof location !== 'undefined' ? location.hostname : '';
    return host === 'nikraop.github.io' || /\.github\.io$/i.test(host);
}

function shouldUsePvPCloudTransport() {
    if (typeof window !== 'undefined' && window.ETHERIA_PVP_FORCE_P2P === true) return false;
    if (typeof window !== 'undefined' && window.ETHERIA_PVP_FORCE_CLOUD === true) return true;
    try {
        if (localStorage.getItem(PVP_CLOUD_LS_KEY) === '0') return false;
        if (localStorage.getItem(PVP_CLOUD_LS_KEY) === '1') return true;
    } catch (_) {}
    if (typeof window !== 'undefined' && window.ETHERIA_PVP_USE_CLOUD === true) return true;
    return isGitHubPagesHostPvp();
}

function getPvPCloudApiBase() {
    if (typeof getFriendsApiBase === 'function') return getFriendsApiBase();
    if (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_HTTP_API) {
        return String(window.ETHERIA_FRIENDS_HTTP_API).trim().replace(/\/+$/, '');
    }
    return isGitHubPagesHostPvp()
        ? 'https://etheria-friends-api.onrender.com'
        : 'http://localhost:8790';
}

function pvpCloudUrl(path) {
    return getPvPCloudApiBase() + path;
}

async function pvpCloudFetch(path, options) {
    options = options || {};
    const doFetch = typeof cloudApiFetch === 'function' ? cloudApiFetch : fetch;
    const res = await doFetch(pvpCloudUrl(path), {
        method: options.method || 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers || {}),
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    let data = null;
    try {
        data = await res.json();
    } catch (_) {
        data = { ok: false, error: 'bad_json' };
    }
    if (!res.ok || (data && data.ok === false)) {
        const err = new Error((data && data.error) || ('HTTP ' + res.status));
        err.data = data;
        throw err;
    }
    return data;
}

function pvpCloudErrorMessage(err) {
    const code = err && (err.message || (err.data && err.data.error));
    if (code === 'room_not_found') return 'Комната не найдена. Проверьте код.';
    if (code === 'room_full') return 'Комната уже занята.';
    if (err && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
        const hint = typeof cloudApiNetworkHint === 'function' ? cloudApiNetworkHint(err) : '';
        return 'Облако PvP недоступно.' + (hint || ' Подождите ~60 с (Render) или проверьте docs/FRIENDS_GITHUB_PAGES.md.');
    }
    return 'PvP облако: ' + (code || 'ошибка');
}

function setPvPCloudSyncPending(pending) {
    pvpCloudSyncPending = !!pending;
    const el = document.querySelector('.pvp-sync-indicator');
    if (!el) return;
    el.classList.toggle('pvp-sync-indicator--syncing', pvpCloudSyncPending);
    el.classList.toggle('pvp-sync-indicator--ok', !pvpCloudSyncPending && pvpState && pvpState.transport === 'cloud');
}

function stopPvPCloudPolling() {
    if (pvpCloudPollTimer) {
        clearTimeout(pvpCloudPollTimer);
        pvpCloudPollTimer = null;
    }
}

function startPvPCloudPolling() {
    stopPvPCloudPolling();
    pvpCloudPollLoop();
}

function schedulePvPCloudPoll(delayMs) {
    if (pvpCloudPollTimer) clearTimeout(pvpCloudPollTimer);
    pvpCloudPollTimer = setTimeout(pvpCloudPollLoop, delayMs);
}

async function pvpCloudPollLoop() {
    if (!pvpState || pvpState.transport !== 'cloud' || !pvpState.roomCode || !pvpState.cloudSessionId) {
        stopPvPCloudPolling();
        return;
    }
    const hadEvents = await pvpCloudPollTick();
    if (!pvpState || pvpState.transport !== 'cloud') return;
    schedulePvPCloudPoll(hadEvents ? 40 : PVP_CLOUD_POLL_GAP_MS);
}

async function pvpCloudPollTick() {
    if (!pvpState || pvpState.transport !== 'cloud' || !pvpState.roomCode || !pvpState.cloudSessionId) return false;
    if (pvpCloudPollInFlight) return false;
    pvpCloudPollInFlight = true;
    let hadEvents = false;
    try {
        const data = await pvpCloudFetch(
            '/api/v1/pvp/room/' + encodeURIComponent(pvpState.roomCode) +
            '/poll?sessionId=' + encodeURIComponent(pvpState.cloudSessionId) +
            '&since=' + encodeURIComponent(String(pvpCloudLastSeq || 0)) +
            '&wait=' + encodeURIComponent(String(PVP_CLOUD_POLL_WAIT_SEC))
        );
        if (data.room && data.room.hasGuest) {
            if (!pvpRemotePeerId) pvpRemotePeerId = 'cloud-peer';
            if (pvpState.role === 'host' && pvpState.status === 'hosting') {
                pvpState.status = 'connected';
            }
            if (data.room.guestSnapshot && pvpState.role === 'host' && typeof sanitizePvPSnapshot === 'function') {
                const remote = sanitizePvPSnapshot(data.room.guestSnapshot);
                if (remote && (!pvpState.remote || pvpState.remote.name !== remote.name)) {
                    pvpState.remote = remote;
                    if (typeof renderPvPArena === 'function') renderPvPArena();
                }
            }
            if (data.room.hostSnapshot && pvpState.role === 'guest' && typeof sanitizePvPSnapshot === 'function') {
                const remote = sanitizePvPSnapshot(data.room.hostSnapshot);
                if (remote && !pvpState.remote) {
                    pvpState.remote = remote;
                    if (typeof renderPvPArena === 'function') renderPvPArena();
                }
            }
        }
        const events = data.events || [];
        hadEvents = events.length > 0;
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (!ev || ev.seq <= pvpCloudLastSeq) continue;
            pvpCloudLastSeq = ev.seq;
            if (ev.from === pvpState.cloudSessionId) continue;
            if (typeof handlePvPMessage === 'function') {
                handlePvPMessage({
                    v: PVP_MSG_VERSION,
                    type: ev.type,
                    payload: ev.payload || {},
                    sentAt: ev.at || Date.now()
                });
            }
        }
        setPvPCloudSyncPending(false);
    } catch (err) {
        if (typeof pvpLog === 'function') pvpLog(pvpCloudErrorMessage(err), 'error');
    } finally {
        pvpCloudPollInFlight = false;
    }
    return hadEvents;
}

async function pvpCloudCreateRoom(roomCode, snapshot) {
    return pvpCloudFetch('/api/v1/pvp/room/create', {
        method: 'POST',
        body: { roomCode: roomCode, snapshot: snapshot }
    });
}

async function pvpCloudJoinRoom(roomCode, snapshot) {
    return pvpCloudFetch('/api/v1/pvp/room/join', {
        method: 'POST',
        body: { roomCode: roomCode, snapshot: snapshot }
    });
}

function pvpCloudSendMessage(type, payload) {
    if (!pvpState || pvpState.transport !== 'cloud' || !pvpState.roomCode || !pvpState.cloudSessionId) {
        return Promise.resolve(false);
    }
    setPvPCloudSyncPending(true);
    return pvpCloudFetch('/api/v1/pvp/room/' + encodeURIComponent(pvpState.roomCode) + '/event', {
        method: 'POST',
        body: {
            sessionId: pvpState.cloudSessionId,
            type: type,
            payload: payload || {}
        }
    }).then(function () {
        if (typeof pvpLog === 'function' && (type === 'turn' || type === 'start')) {
            pvpLog(type === 'turn' ? 'Ход синхронизирован с облаком.' : 'Матч отправлен в облако.', 'success');
        }
        return true;
    }).catch(function (err) {
        setPvPCloudSyncPending(false);
        if (typeof pvpLog === 'function') pvpLog(pvpCloudErrorMessage(err), 'error');
        return false;
    });
}

async function enterPvPCloudAsHost(roomCode) {
    const snap = typeof getPvPPlayerSnapshot === 'function' ? getPvPPlayerSnapshot() : null;
    const data = await pvpCloudCreateRoom(roomCode, snap);
    pvpState.transport = 'cloud';
    pvpState.role = 'host';
    pvpState.roomCode = data.roomCode || roomCode;
    pvpState.cloudSessionId = data.sessionId;
    pvpCloudLastSeq = 0;
    pvpRemotePeerId = 'cloud-peer';
    pvpState.status = 'hosting';
    pvpState.local = snap;
    if (typeof pvpLog === 'function') {
        pvpLog('Комната в облаке создана. Код: ' + pvpState.roomCode, 'success');
    }
    startPvPCloudPolling();
}

async function enterPvPCloudAsGuest(roomCode) {
    const snap = typeof getPvPPlayerSnapshot === 'function' ? getPvPPlayerSnapshot() : null;
    const data = await pvpCloudJoinRoom(roomCode, snap);
    pvpState.transport = 'cloud';
    pvpState.role = 'guest';
    pvpState.roomCode = data.roomCode || roomCode;
    pvpState.cloudSessionId = data.sessionId;
    pvpCloudLastSeq = 0;
    pvpRemotePeerId = 'cloud-peer';
    pvpState.status = 'connected';
    pvpState.local = snap;
    if (data.hostSnapshot && typeof sanitizePvPSnapshot === 'function') {
        const remote = sanitizePvPSnapshot(data.hostSnapshot);
        if (remote) {
            pvpState.remote = remote;
            if (typeof pvpLog === 'function') pvpLog('Соперник в лобби: ' + remote.name, 'success');
        }
    }
    if (typeof sendPvPMessage === 'function') {
        sendPvPMessage('hello', { snapshot: pvpState.local, ready: !!pvpState.localReady });
    }
    startPvPCloudPolling();
}

function leavePvPCloudTransport() {
    stopPvPCloudPolling();
    setPvPCloudSyncPending(false);
    pvpCloudLastSeq = 0;
}

function togglePvPCloudMode() {
    try {
        const next = shouldUsePvPCloudTransport() ? '0' : '1';
        localStorage.setItem(PVP_CLOUD_LS_KEY, next);
    } catch (_) {}
    if (typeof pvpLog === 'function') {
        pvpLog(shouldUsePvPCloudTransport() ? 'Режим: облако (GitHub Pages)' : 'Режим: P2P (MQTT/WebRTC)', 'info');
    }
    if (typeof renderPvPArena === 'function') renderPvPArena();
}

function getPvPTransportLabel() {
    if (pvpState && pvpState.transport === 'cloud') return 'Облако';
    if (shouldUsePvPCloudTransport()) return 'Облако (авто)';
    return 'P2P (MQTT)';
}

window.shouldUsePvPCloudTransport = shouldUsePvPCloudTransport;
window.pvpCloudSendMessage = pvpCloudSendMessage;
window.enterPvPCloudAsHost = enterPvPCloudAsHost;
window.enterPvPCloudAsGuest = enterPvPCloudAsGuest;
window.leavePvPCloudTransport = leavePvPCloudTransport;
window.stopPvPCloudPolling = stopPvPCloudPolling;
window.togglePvPCloudMode = togglePvPCloudMode;
window.getPvPTransportLabel = getPvPTransportLabel;
