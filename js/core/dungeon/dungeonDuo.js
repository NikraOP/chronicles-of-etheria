// Duo dungeon online: MQTT signaling (same stack as PvP — see pvpArena.js).
// Depends: pvp-mqtt-direct.bundle.mjs, HiveMQ/Shiftr relays; optional dungeonGenerator.js for run_seed.
const DUNGEON_ROOM_PREFIX = 'etheria-dungeon-duo-';
const DUNGEON_DUO_VERSION = 1;
const DUNGEON_DUO_TRYSTERO_APP_ID = 'chronicles-of-etheria-dungeon-duo-v1';
/** Reuses PvP MQTT direct bundle path (loaded from js/core/dungeon/). */
const DUNGEON_DUO_MQTT_MODULE_URL = '../../vendor/pvp-mqtt-direct.bundle.mjs?v=1';
const DUNGEON_DUO_MQTT_RELAY_URLS = Object.freeze([
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://public:public@public.cloud.shiftr.io'
]);
const DUNGEON_DUO_MQTT_REDUNDANCY = 1;
const DUNGEON_DUO_HANDSHAKE_TIMEOUT_MS = 22000;
const DUNGEON_DUO_TRANSPORT_LEAVE_SETTLE_MS = 80;
const DUNGEON_DUO_CODE_LENGTH = 6;

const DUNGEON_DUO_MSG = Object.freeze({
    LOBBY_READY: 'lobby_ready',
    RUN_SEED: 'run_seed',
    ROOM_STATE: 'room_state',
    BATTLE_ACTION: 'battle_action',
    FORFEIT: 'forfeit'
});

let duoDungeonRoom = null;
let duoDungeonSendPacket = null;
let duoDungeonPartnerId = '';
let duoDungeonSessionId = 0;
let duoDungeonModulePromise = null;
let duoDungeonTransportIdlePromise = Promise.resolve();
let duoDungeonState = createEmptyDuoDungeonState();

function createEmptyDuoDungeonState() {
    return {
        status: 'idle',
        role: '',
        roomCode: '',
        partnerId: '',
        dungeonId: '',
        localReady: false,
        remoteReady: false,
        runSeed: null,
        run: null,
        error: '',
        log: []
    };
}

function duoDungeonLog(message, type) {
    duoDungeonState.log.unshift({
        message,
        type: type || 'info',
        time: new Date().toLocaleTimeString()
    });
    duoDungeonState.log = duoDungeonState.log.slice(0, 20);
}

function dungeonDuoRoomId(code) {
    return DUNGEON_ROOM_PREFIX + String(code || '').trim().toUpperCase();
}

function generateDuoDungeonCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < DUNGEON_DUO_CODE_LENGTH; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
}

function getDungeonDuoMqttConfig() {
    return {
        appId: DUNGEON_DUO_TRYSTERO_APP_ID,
        relayConfig: {
            urls: [...DUNGEON_DUO_MQTT_RELAY_URLS],
            redundancy: Math.min(DUNGEON_DUO_MQTT_REDUNDANCY, DUNGEON_DUO_MQTT_RELAY_URLS.length)
        }
    };
}

function loadDungeonDuoTransport() {
    if (!duoDungeonModulePromise) {
        duoDungeonModulePromise = import(DUNGEON_DUO_MQTT_MODULE_URL).catch(err => {
            duoDungeonModulePromise = null;
            throw err;
        });
    }
    return duoDungeonModulePromise;
}

function createDungeonDuoActionAdapter(action) {
    if (Array.isArray(action) && typeof action[0] === 'function' && typeof action[1] === 'function') {
        return {
            send: (message, peerId) => action[0](message, peerId),
            receive: handler => action[1](handler)
        };
    }
    if (action && typeof action.send === 'function' && 'onMessage' in action) {
        return {
            send: (message, peerId) => action.send(message, { target: peerId }),
            receive: handler => {
                action.onMessage = (message, meta) => {
                    const peerId = typeof meta === 'string' ? meta : meta?.peerId;
                    if (peerId) handler(message, peerId);
                };
            }
        };
    }
    throw new Error('Unsupported dungeon duo transport action API');
}

function setDungeonDuoRoomHandler(room, eventName, handler) {
    if (!room) throw new Error('Dungeon duo room is not initialized');
    if (typeof room[eventName] === 'function') {
        room[eventName](handler);
        return;
    }
    if (eventName in room) {
        room[eventName] = handler;
        return;
    }
    throw new Error(`Dungeon duo room does not support ${eventName}`);
}

function sendDuoDungeonMessage(type, payload) {
    if (!duoDungeonSendPacket || !duoDungeonPartnerId) return false;
    duoDungeonSendPacket({
        v: DUNGEON_DUO_VERSION,
        type,
        payload: payload || {},
        sentAt: Date.now()
    }, duoDungeonPartnerId).catch(err => handleDungeonDuoError(err));
    return true;
}

function detachDungeonDuoTransportRoom() {
    const room = duoDungeonRoom;
    duoDungeonRoom = null;
    duoDungeonSendPacket = null;
    duoDungeonPartnerId = '';
    if (!room) return Promise.resolve();
    return Promise.resolve()
        .then(() => {
            const result = room.leave();
            return result && typeof result.then === 'function' ? result : undefined;
        })
        .catch(() => {})
        .then(() => new Promise(resolve => setTimeout(resolve, DUNGEON_DUO_TRANSPORT_LEAVE_SETTLE_MS)));
}

function resetDungeonDuoConnection() {
    duoDungeonSessionId++;
    duoDungeonTransportIdlePromise = duoDungeonTransportIdlePromise
        .then(() => detachDungeonDuoTransportRoom())
        .catch(() => {});
}

function handleDungeonDuoError(err) {
    duoDungeonState.status = 'idle';
    duoDungeonState.error = err && err.message ? err.message : String(err || 'Ошибка транспорта данжа');
    duoDungeonLog(duoDungeonState.error, 'error');
}

function syncDuoDungeonPartnerId() {
    duoDungeonState.partnerId = duoDungeonPartnerId;
}

function generateDuoRunSeed() {
    const t = Date.now();
    const r = Math.floor(Math.random() * 0x100000000);
    return ((t ^ r) >>> 0);
}

function buildDuoDungeonRun(dungeonId, seed) {
    if (typeof generateDungeonRun === 'function') {
        return generateDungeonRun(dungeonId, seed);
    }
    return { dungeonId, seed, mode: 'duo', floors: [] };
}

function hostBroadcastRunSeed() {
    if (duoDungeonState.role !== 'host') return;
    const dungeonId = duoDungeonState.dungeonId;
    if (!dungeonId) {
        duoDungeonLog('Не выбран данж для генерации забега.', 'error');
        return;
    }
    const seed = generateDuoRunSeed();
    const run = buildDuoDungeonRun(dungeonId, seed);
    duoDungeonState.runSeed = seed;
    duoDungeonState.run = run;
    duoDungeonState.status = 'sync';
    sendDuoDungeonMessage(DUNGEON_DUO_MSG.RUN_SEED, { dungeonId, seed, run });
    duoDungeonLog(`Забег сгенерирован (seed ${seed}).`, 'success');
}

function maybeStartDuoDungeonSync() {
    if (duoDungeonState.status !== 'lobby') return;
    if (!duoDungeonState.localReady || !duoDungeonState.remoteReady) return;
    if (duoDungeonState.role === 'host') hostBroadcastRunSeed();
}

function applyRemoteDuoDungeonLobbyReady(payload) {
    duoDungeonState.remoteReady = !!payload.ready;
    if (payload.dungeonId && duoDungeonState.role === 'guest' && !duoDungeonState.dungeonId) {
        duoDungeonState.dungeonId = String(payload.dungeonId);
    }
    duoDungeonLog(`Партнёр ${duoDungeonState.remoteReady ? 'готов' : 'не готов'}.`, 'info');
    maybeStartDuoDungeonSync();
}

function applyRemoteDuoDungeonRunSeed(payload) {
    if (duoDungeonState.role === 'host') return;
    const dungeonId = String(payload.dungeonId || duoDungeonState.dungeonId || '');
    const seed = payload.seed;
    if (seed == null || !dungeonId) {
        duoDungeonLog('Некорректный run_seed от хоста.', 'error');
        return;
    }
    duoDungeonState.dungeonId = dungeonId;
    duoDungeonState.runSeed = seed;
    duoDungeonState.run = payload.run || buildDuoDungeonRun(dungeonId, seed);
    duoDungeonState.status = 'sync';
    duoDungeonLog(`Получен забег от хоста (seed ${seed}).`, 'success');
}

/** @param {object} payload — room_state from host; full battle sync not implemented. */
function applyRemoteDuoDungeonRoomState(payload) {
    // TODO: merge host-authoritative room snapshot (enemies, floor, roomIndex, party HP).
    void payload;
}

/** @param {object} payload — battle_action from peer; turn validation not implemented. */
function applyRemoteDuoDungeonBattleAction(payload) {
    // TODO: apply validated remote action to local battle state (host rejects invalid).
    void payload;
}

function applyRemoteDuoDungeonForfeit(_payload) {
    // TODO: end duo run, show forfeit UI, reset to idle lobby.
    duoDungeonLog('Партнёр сдался.', 'info');
    duoDungeonState.status = 'idle';
}

function handleDungeonDuoMessage(msg) {
    if (!msg || msg.v !== DUNGEON_DUO_VERSION) return;
    const payload = msg.payload || {};
    switch (msg.type) {
        case DUNGEON_DUO_MSG.LOBBY_READY:
            applyRemoteDuoDungeonLobbyReady(payload);
            break;
        case DUNGEON_DUO_MSG.RUN_SEED:
            applyRemoteDuoDungeonRunSeed(payload);
            break;
        case DUNGEON_DUO_MSG.ROOM_STATE:
            applyRemoteDuoDungeonRoomState(payload);
            break;
        case DUNGEON_DUO_MSG.BATTLE_ACTION:
            applyRemoteDuoDungeonBattleAction(payload);
            break;
        case DUNGEON_DUO_MSG.FORFEIT:
            applyRemoteDuoDungeonForfeit(payload);
            break;
        default:
            break;
    }
}

function setupDungeonDuoTransportRoom(mod, code, sessionId) {
    const transportConfig = getDungeonDuoMqttConfig();
    const room = mod.joinRoom(transportConfig, dungeonDuoRoomId(code), {
        handshakeTimeoutMs: DUNGEON_DUO_HANDSHAKE_TIMEOUT_MS,
        onJoinError(details) {
            if (sessionId !== duoDungeonSessionId) return;
            const err = details && details.error ? String(details.error).slice(0, 220) : 'join failed';
            handleDungeonDuoError(new Error(err));
        }
    });
    const actionAdapter = createDungeonDuoActionAdapter(room.makeAction('dungeon-duo'));
    duoDungeonRoom = room;
    duoDungeonSendPacket = actionAdapter.send;

    setDungeonDuoRoomHandler(room, 'onPeerJoin', peerId => {
        if (sessionId !== duoDungeonSessionId) return;
        if (duoDungeonPartnerId && duoDungeonPartnerId !== peerId) {
            duoDungeonLog('В комнате уже есть партнёр, лишнее подключение игнорируется.', 'error');
            return;
        }
        duoDungeonPartnerId = peerId;
        syncDuoDungeonPartnerId();
        duoDungeonState.status = 'lobby';
        duoDungeonLog('Партнёр подключился.', 'success');
        sendDuoDungeonMessage(DUNGEON_DUO_MSG.LOBBY_READY, {
            ready: duoDungeonState.localReady,
            dungeonId: duoDungeonState.dungeonId
        });
    });

    setDungeonDuoRoomHandler(room, 'onPeerLeave', peerId => {
        if (sessionId !== duoDungeonSessionId || peerId !== duoDungeonPartnerId) return;
        duoDungeonPartnerId = '';
        syncDuoDungeonPartnerId();
        duoDungeonState.remoteReady = false;
        if (duoDungeonState.status === 'battle') {
            applyRemoteDuoDungeonForfeit({});
        } else if (duoDungeonState.role === 'host') {
            duoDungeonState.status = 'lobby';
            duoDungeonLog('Партнёр отключился.', 'error');
        } else {
            duoDungeonState.status = 'idle';
            duoDungeonLog('Хост отключился.', 'error');
        }
    });

    actionAdapter.receive((incoming, peerId) => {
        if (sessionId !== duoDungeonSessionId) return;
        if (duoDungeonPartnerId && duoDungeonPartnerId !== peerId) return;
        duoDungeonPartnerId = peerId;
        syncDuoDungeonPartnerId();
        handleDungeonDuoMessage(incoming);
    });

    duoDungeonLog('Сигналинг данжа (MQTT) готов. Ждём партнёра.', 'success');
}

function joinDungeonDuoTransportRoom(code, sessionId) {
    duoDungeonLog('Подключение к комнате…', 'info');
    return duoDungeonTransportIdlePromise
        .then(() => loadDungeonDuoTransport())
        .then(mod => {
            if (sessionId !== duoDungeonSessionId) return;
            setupDungeonDuoTransportRoom(mod, code, sessionId);
        })
        .catch(err => handleDungeonDuoError(err));
}

function createDuoDungeonLobby(dungeonId) {
    const id = String(dungeonId || '').trim();
    if (!id) {
        duoDungeonLog('Укажите id данжа.', 'error');
        return Promise.resolve(false);
    }
    leaveDuoDungeonLobby();
    resetDungeonDuoConnection();
    const sessionId = duoDungeonSessionId;
    duoDungeonState = createEmptyDuoDungeonState();
    duoDungeonState.role = 'host';
    duoDungeonState.dungeonId = id;
    duoDungeonState.roomCode = generateDuoDungeonCode();
    duoDungeonState.status = 'lobby';
    duoDungeonLog(`Комната ${duoDungeonState.roomCode} (данж ${id}).`, 'info');
    return joinDungeonDuoTransportRoom(duoDungeonState.roomCode, sessionId).then(() => true);
}

function joinDuoDungeonLobby(code) {
    const roomCode = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!roomCode || roomCode.length < 4) {
        duoDungeonLog('Некорректный код комнаты.', 'error');
        return Promise.resolve(false);
    }
    leaveDuoDungeonLobby();
    resetDungeonDuoConnection();
    const sessionId = duoDungeonSessionId;
    duoDungeonState = createEmptyDuoDungeonState();
    duoDungeonState.role = 'guest';
    duoDungeonState.roomCode = roomCode;
    duoDungeonState.status = 'lobby';
    duoDungeonLog(`Подключение к ${roomCode}…`, 'info');
    return joinDungeonDuoTransportRoom(roomCode, sessionId).then(() => true);
}

function leaveDuoDungeonLobby() {
    resetDungeonDuoConnection();
    duoDungeonState = createEmptyDuoDungeonState();
    duoDungeonLog('Комната данжа закрыта.', 'info');
}

function setDuoDungeonLobbyReady(ready) {
    if (duoDungeonState.status !== 'lobby' && duoDungeonState.status !== 'sync') return false;
    duoDungeonState.localReady = !!ready;
    sendDuoDungeonMessage(DUNGEON_DUO_MSG.LOBBY_READY, {
        ready: duoDungeonState.localReady,
        dungeonId: duoDungeonState.dungeonId
    });
    maybeStartDuoDungeonSync();
    return true;
}

function toggleDuoDungeonLobbyReady() {
    return setDuoDungeonLobbyReady(!duoDungeonState.localReady);
}

function sendDuoDungeonRoomState(state) {
    if (duoDungeonState.role !== 'host') return false;
    return sendDuoDungeonMessage(DUNGEON_DUO_MSG.ROOM_STATE, state || {});
}

function sendDuoDungeonBattleAction(action) {
    return sendDuoDungeonMessage(DUNGEON_DUO_MSG.BATTLE_ACTION, action || {});
}

function forfeitDuoDungeon() {
    sendDuoDungeonMessage(DUNGEON_DUO_MSG.FORFEIT, {});
    leaveDuoDungeonLobby();
}

function getDuoDungeonState() {
    return { ...duoDungeonState, partnerId: duoDungeonPartnerId };
}

window.DUNGEON_ROOM_PREFIX = DUNGEON_ROOM_PREFIX;
window.DUNGEON_DUO_MSG = DUNGEON_DUO_MSG;
window.createDuoDungeonLobby = createDuoDungeonLobby;
window.joinDuoDungeonLobby = joinDuoDungeonLobby;
window.leaveDuoDungeonLobby = leaveDuoDungeonLobby;
window.setDuoDungeonLobbyReady = setDuoDungeonLobbyReady;
window.toggleDuoDungeonLobbyReady = toggleDuoDungeonLobbyReady;
window.sendDuoDungeonRoomState = sendDuoDungeonRoomState;
window.sendDuoDungeonBattleAction = sendDuoDungeonBattleAction;
window.forfeitDuoDungeon = forfeitDuoDungeon;
window.getDuoDungeonState = getDuoDungeonState;
window.sendDuoDungeonMessage = sendDuoDungeonMessage;
window.applyRemoteDuoDungeonRoomState = applyRemoteDuoDungeonRoomState;
window.applyRemoteDuoDungeonBattleAction = applyRemoteDuoDungeonBattleAction;
