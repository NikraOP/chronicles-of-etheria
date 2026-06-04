/**
 * Дуо-данж через облако Etheria (тот же API, что PvP и друзья).
 */
const DUNGEON_DUO_CLOUD_POLL_WAIT_SEC = 22;
const DUNGEON_DUO_CLOUD_POLL_GAP_MS = 120;

let dungeonDuoCloudPollTimer = null;
let dungeonDuoCloudLastSeq = 0;
let dungeonDuoCloudPollInFlight = false;

function shouldUseDungeonDuoCloudTransport() {
    if (typeof window !== 'undefined' && window.ETHERIA_DUNGEON_DUO_USE_CLOUD === false) return false;
    if (typeof window !== 'undefined' && window.ETHERIA_DUNGEON_DUO_USE_CLOUD === true) return true;
    if (typeof shouldUsePvPCloudTransport === 'function' && shouldUsePvPCloudTransport()) return true;
    if (typeof window !== 'undefined' && window.ETHERIA_PVP_USE_CLOUD === true) return true;
    const host = typeof location !== 'undefined' ? location.hostname : '';
    return host === 'nikraop.github.io' || /\.github\.io$/i.test(host);
}

function getDungeonDuoCloudApiBase() {
    if (typeof getFriendsApiBase === 'function') return getFriendsApiBase();
    if (typeof window !== 'undefined' && window.ETHERIA_FRIENDS_HTTP_API) {
        return String(window.ETHERIA_FRIENDS_HTTP_API).trim().replace(/\/+$/, '');
    }
    return 'http://localhost:8790';
}

function dungeonDuoCloudUrl(path) {
    return getDungeonDuoCloudApiBase() + path;
}

async function dungeonDuoCloudFetch(path, options) {
    options = options || {};
    const doFetch = typeof cloudApiFetch === 'function' ? cloudApiFetch : fetch;
    const res = await doFetch(dungeonDuoCloudUrl(path), {
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

function dungeonDuoCloudErrorMessage(err) {
    const code = err && (err.message || (err.data && err.data.error));
    if (code === 'room_not_found') return 'Комната не найдена. Проверьте код.';
    if (code === 'room_full') return 'Комната уже занята.';
    if (code === 'room_exists') return 'Код комнаты занят — создайте снова.';
    if (code === 'dungeon_required') return 'Не указан данж для комнаты.';
    if (err && (err.message === 'Failed to fetch' || err.name === 'TypeError')) {
        const hint = typeof cloudApiNetworkHint === 'function' ? cloudApiNetworkHint(err) : '';
        return 'Сервер дуо-данжа недоступен.' + (hint || ' Проверьте docs/TIMEWEB_CLOUD.md.');
    }
    return 'Дуо-облако: ' + (code || 'ошибка');
}

function stopDungeonDuoCloudPolling() {
    if (dungeonDuoCloudPollTimer) {
        clearTimeout(dungeonDuoCloudPollTimer);
        dungeonDuoCloudPollTimer = null;
    }
}

function scheduleDungeonDuoCloudPoll(delayMs) {
    if (dungeonDuoCloudPollTimer) clearTimeout(dungeonDuoCloudPollTimer);
    dungeonDuoCloudPollTimer = setTimeout(dungeonDuoCloudPollLoop, delayMs);
}

function applyDungeonDuoCloudPeerConnected(roomInfo) {
    if (!roomInfo || !roomInfo.hasGuest) return;
    if (!duoDungeonState || duoDungeonState.role !== 'host') return;
    if (typeof setDuoDungeonPartnerId === 'function') setDuoDungeonPartnerId('cloud-peer');
    if (typeof duoDungeonLog === 'function') duoDungeonLog('Партнёр подключился (сервер).', 'success');
    if (typeof refreshDuoDungeonLobbyUI === 'function') refreshDuoDungeonLobbyUI();
    if (duoDungeonState.localReady && typeof broadcastDuoDungeonLobbyPresence === 'function') {
        broadcastDuoDungeonLobbyPresence();
    }
}

function applyDungeonDuoCloudRoomSnapshots(roomInfo) {
    if (!roomInfo || typeof duoDungeonState === 'undefined' || !duoDungeonState) return;
    if (duoDungeonState.role === 'host' && roomInfo.guestSnapshot) {
        duoDungeonState.remoteSnapshot = roomInfo.guestSnapshot;
    }
    if (duoDungeonState.role === 'guest' && roomInfo.hostSnapshot && !duoDungeonState.remoteSnapshot) {
        duoDungeonState.remoteSnapshot = roomInfo.hostSnapshot;
    }
    if (roomInfo.dungeonId && duoDungeonState.role === 'guest' && !duoDungeonState.dungeonId) {
        duoDungeonState.dungeonId = String(roomInfo.dungeonId);
    }
}

async function dungeonDuoCloudPollLoop() {
    if (!duoDungeonState || duoDungeonState.transport !== 'cloud' ||
        !duoDungeonState.roomCode || !duoDungeonState.cloudSessionId) {
        stopDungeonDuoCloudPolling();
        return;
    }
    const hadEvents = await dungeonDuoCloudPollTick();
    if (!duoDungeonState || duoDungeonState.transport !== 'cloud') return;
    scheduleDungeonDuoCloudPoll(hadEvents ? 40 : DUNGEON_DUO_CLOUD_POLL_GAP_MS);
}

async function dungeonDuoCloudPollTick() {
    if (!duoDungeonState || duoDungeonState.transport !== 'cloud' ||
        !duoDungeonState.roomCode || !duoDungeonState.cloudSessionId) return false;
    if (dungeonDuoCloudPollInFlight) return false;
    dungeonDuoCloudPollInFlight = true;
    let hadEvents = false;
    try {
        const data = await dungeonDuoCloudFetch(
            '/api/v1/dungeon-duo/room/' + encodeURIComponent(duoDungeonState.roomCode) +
            '/poll?sessionId=' + encodeURIComponent(duoDungeonState.cloudSessionId) +
            '&since=' + encodeURIComponent(String(dungeonDuoCloudLastSeq || 0)) +
            '&wait=' + encodeURIComponent(String(DUNGEON_DUO_CLOUD_POLL_WAIT_SEC))
        );
        if (data.room) {
            applyDungeonDuoCloudRoomSnapshots(data.room);
            if (data.room.hasGuest) applyDungeonDuoCloudPeerConnected(data.room);
        }
        const events = data.events || [];
        hadEvents = events.length > 0;
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (!ev || ev.seq <= dungeonDuoCloudLastSeq) continue;
            dungeonDuoCloudLastSeq = ev.seq;
            if (ev.from === duoDungeonState.cloudSessionId) continue;
            if (typeof handleDungeonDuoMessage === 'function') {
                handleDungeonDuoMessage({
                    v: typeof DUNGEON_DUO_VERSION !== 'undefined' ? DUNGEON_DUO_VERSION : 1,
                    type: ev.type,
                    payload: ev.payload || {},
                    sentAt: ev.at || Date.now()
                });
            }
        }
    } catch (err) {
        if (typeof duoDungeonLog === 'function') duoDungeonLog(dungeonDuoCloudErrorMessage(err), 'error');
    } finally {
        dungeonDuoCloudPollInFlight = false;
    }
    return hadEvents;
}

function startDungeonDuoCloudPolling() {
    stopDungeonDuoCloudPolling();
    dungeonDuoCloudPollLoop();
}

function dungeonDuoCloudSendMessage(type, payload) {
    if (!duoDungeonState || duoDungeonState.transport !== 'cloud' ||
        !duoDungeonState.roomCode || !duoDungeonState.cloudSessionId) {
        return Promise.resolve(false);
    }
    return dungeonDuoCloudFetch('/api/v1/dungeon-duo/room/' + encodeURIComponent(duoDungeonState.roomCode) + '/event', {
        method: 'POST',
        body: {
            sessionId: duoDungeonState.cloudSessionId,
            type: type,
            payload: payload || {}
        }
    }).then(function () { return true; }).catch(function (err) {
        if (typeof duoDungeonLog === 'function') duoDungeonLog(dungeonDuoCloudErrorMessage(err), 'error');
        if (typeof handleDungeonDuoError === 'function') handleDungeonDuoError(err);
        return false;
    });
}

function leaveDungeonDuoCloudTransport() {
    stopDungeonDuoCloudPolling();
    dungeonDuoCloudLastSeq = 0;
}

async function enterDungeonDuoCloudAsHost(dungeonId, roomCode) {
    const snap = typeof buildDuoLobbyPlayerSnapshot === 'function' ? buildDuoLobbyPlayerSnapshot() : null;
    const data = await dungeonDuoCloudFetch('/api/v1/dungeon-duo/room/create', {
        method: 'POST',
        body: { roomCode: roomCode, dungeonId: dungeonId, snapshot: snap }
    });
    duoDungeonState.transport = 'cloud';
    duoDungeonState.role = 'host';
    duoDungeonState.roomCode = data.roomCode || roomCode;
    duoDungeonState.cloudSessionId = data.sessionId;
    duoDungeonState.dungeonId = data.dungeonId || dungeonId;
    duoDungeonState.status = 'lobby';
    dungeonDuoCloudLastSeq = 0;
    if (typeof setDuoDungeonPartnerId === 'function') setDuoDungeonPartnerId('');
    duoDungeonLog('Комната на сервере. Код: ' + duoDungeonState.roomCode, 'success');
    startDungeonDuoCloudPolling();
}

async function enterDungeonDuoCloudAsGuest(roomCode) {
    const snap = typeof buildDuoLobbyPlayerSnapshot === 'function' ? buildDuoLobbyPlayerSnapshot() : null;
    const data = await dungeonDuoCloudFetch('/api/v1/dungeon-duo/room/join', {
        method: 'POST',
        body: { roomCode: roomCode, snapshot: snap }
    });
    duoDungeonState.transport = 'cloud';
    duoDungeonState.role = 'guest';
    duoDungeonState.roomCode = data.roomCode || roomCode;
    duoDungeonState.cloudSessionId = data.sessionId;
    duoDungeonState.dungeonId = data.dungeonId || '';
    duoDungeonState.status = 'lobby';
    if (data.hostSnapshot) duoDungeonState.remoteSnapshot = data.hostSnapshot;
    dungeonDuoCloudLastSeq = 0;
    if (typeof setDuoDungeonPartnerId === 'function') setDuoDungeonPartnerId('cloud-peer');
    duoDungeonLog('Подключено к комнате на сервере.', 'success');
    if (typeof broadcastDuoDungeonLobbyPresence === 'function') broadcastDuoDungeonLobbyPresence();
    startDungeonDuoCloudPolling();
}

function getDungeonDuoTransportLabel() {
    return 'Сервер';
}

window.shouldUseDungeonDuoCloudTransport = shouldUseDungeonDuoCloudTransport;
window.dungeonDuoCloudSendMessage = dungeonDuoCloudSendMessage;
window.enterDungeonDuoCloudAsHost = enterDungeonDuoCloudAsHost;
window.enterDungeonDuoCloudAsGuest = enterDungeonDuoCloudAsGuest;
window.leaveDungeonDuoCloudTransport = leaveDungeonDuoCloudTransport;
window.getDungeonDuoTransportLabel = getDungeonDuoTransportLabel;
