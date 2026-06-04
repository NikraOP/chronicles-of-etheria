// Duo dungeon online: облако Etheria (по умолчанию) или MQTT fallback.
// Cloud: js/core/dungeon/dungeonDuoCloud.js + friends-api /api/v1/dungeon-duo/*
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

function setDuoDungeonRunStatus(status) {
    if (duoDungeonState && status) duoDungeonState.status = status;
}

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
        remoteSnapshot: null,
        transport: '',
        cloudSessionId: '',
        runSeed: null,
        run: null,
        error: '',
        log: []
    };
}

function isDungeonDuoCloudTransport() {
    return !!(duoDungeonState && duoDungeonState.transport === 'cloud');
}

function setDuoDungeonPartnerId(peerId) {
    duoDungeonPartnerId = peerId ? String(peerId) : '';
    syncDuoDungeonPartnerId();
}

function findDuoSkinDefInDb(className, gender, branch, skinId) {
    if (!skinId || typeof SKINS_DB === 'undefined') return null;
    const classSkins = SKINS_DB[className];
    if (!classSkins) return null;
    const genderSkins = classSkins[gender || 'male'] || classSkins.male;
    if (!genderSkins) return null;
    const schoolSkins = genderSkins[branch];
    if (!Array.isArray(schoolSkins)) return null;
    return schoolSkins.find(function (s) { return s && s.id === skinId; }) || null;
}

function findDefaultDuoSkinDefInDb(className, gender, branch) {
    if (typeof SKINS_DB === 'undefined') return null;
    const classSkins = SKINS_DB[className];
    if (!classSkins) return null;
    const genderSkins = classSkins[gender || 'male'] || classSkins.male;
    if (!genderSkins) return null;
    const schoolSkins = genderSkins[branch];
    if (!Array.isArray(schoolSkins)) return null;
    return schoolSkins.find(function (s) { return s && s.price === 0; }) || schoolSkins[0] || null;
}

function resolveDuoPlayerPortrait(snapshot) {
    if (!snapshot) return { img: '', skinName: '', skinIcon: '' };
    const className = snapshot.class || '';
    const gender = snapshot.gender || 'male';
    const branch = snapshot.branch || '';
    let skinDef = null;
    if (snapshot.currentSkin) skinDef = findDuoSkinDefInDb(className, gender, branch, snapshot.currentSkin);
    if (!skinDef) skinDef = findDefaultDuoSkinDefInDb(className, gender, branch);

    let img = String(snapshot.portraitImg || snapshot.avatar || snapshot.schoolImg || '').trim();
    let skinName = String(snapshot.skinName || '').trim();
    let skinIcon = String(snapshot.skinIcon || '').trim();
    if (skinDef) {
        if (skinDef.img) img = skinDef.img;
        if (!skinName && skinDef.name) skinName = skinDef.name;
        if (!skinIcon && skinDef.icon) skinIcon = skinDef.icon;
    }
    if (!img && typeof ABILITIES_DB !== 'undefined' && ABILITIES_DB[className] && ABILITIES_DB[className][branch]) {
        img = ABILITIES_DB[className][branch].img || '';
    }
    return { img: img, skinName: skinName, skinIcon: skinIcon };
}

function buildDuoLobbyPlayerSnapshot() {
    if (typeof player === 'undefined' || !player) return null;
    const portrait = resolveDuoPlayerPortrait({
        class: player.class,
        branch: player.branch,
        gender: player.gender,
        currentSkin: player.currentSkin,
        schoolImg: player.schoolImg
    });
    return {
        name: player.name || 'Игрок',
        class: player.class || '',
        branch: player.branch || '',
        gender: player.gender || 'male',
        level: player.level || 1,
        health: player.health || 0,
        maxHealth: player.maxHealth || 0,
        mana: player.class === 'Маг' ? (player.mana || 0) : 0,
        maxMana: player.class === 'Маг' ? (player.maxMana || 0) : 0,
        attack: player.attack || 0,
        defense: player.defense || 0,
        criticalChance: player.criticalChance || 0,
        criticalDamage: player.criticalDamage || 0,
        dodgeChance: player.dodgeChance || 0,
        schoolImg: portrait.img || player.schoolImg || '',
        portraitImg: portrait.img || '',
        avatar: portrait.img || player.schoolImg || '',
        currentSkin: player.currentSkin || '',
        skinName: portrait.skinName || '',
        skinIcon: portrait.skinIcon || ''
    };
}

function refreshDuoDungeonLobbyUI() {
    if (typeof showDuoDungeonLobbyScreen !== 'function') return;
    if (!duoDungeonState || duoDungeonState.status === 'idle') return;
    if (duoDungeonState.status === 'battle' || duoDungeonState.status === 'run') return;
    showDuoDungeonLobbyScreen();
}

function broadcastDuoDungeonLobbyPresence() {
    const snap = buildDuoLobbyPlayerSnapshot();
    const payload = {
        ready: duoDungeonState.localReady,
        dungeonId: duoDungeonState.dungeonId,
        snapshot: snap || undefined
    };
    if (isDungeonDuoCloudTransport()) {
        return sendDuoDungeonMessage(DUNGEON_DUO_MSG.LOBBY_READY, payload);
    }
    if (!duoDungeonSendPacket || !duoDungeonPartnerId) return false;
    return sendDuoDungeonMessage(DUNGEON_DUO_MSG.LOBBY_READY, payload);
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
    if (isDungeonDuoCloudTransport()) {
        if (typeof dungeonDuoCloudSendMessage === 'function') {
            dungeonDuoCloudSendMessage(type, payload || {});
            return true;
        }
        return false;
    }
    if (!duoDungeonSendPacket || !duoDungeonPartnerId) return false;
    try {
        const sent = duoDungeonSendPacket({
            v: DUNGEON_DUO_VERSION,
            type,
            payload: payload || {},
            sentAt: Date.now()
        }, duoDungeonPartnerId);
        if (sent && typeof sent.catch === 'function') {
            sent.catch(function (err) { handleDungeonDuoError(err); });
        }
    } catch (err) {
        handleDungeonDuoError(err);
        return false;
    }
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

function handleDungeonDuoLobbyError(err) {
    const msg = typeof dungeonDuoCloudErrorMessage === 'function'
        ? dungeonDuoCloudErrorMessage(err)
        : (err && err.message ? err.message : String(err || 'Ошибка комнаты'));
    duoDungeonState.status = 'idle';
    duoDungeonState.error = msg;
    duoDungeonLog(msg, 'error');
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
}

function handleDungeonDuoError(err) {
    const inLobby = duoDungeonState && duoDungeonState.status === 'lobby' &&
        !(typeof getDungeonRunSession === 'function' && getDungeonRunSession());
    if (inLobby) {
        handleDungeonDuoLobbyError(err);
        return;
    }
    duoDungeonState.status = 'idle';
    duoDungeonState.error = err && err.message ? err.message : String(err || 'Ошибка транспорта данжа');
    duoDungeonLog(duoDungeonState.error, 'error');
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    if (typeof abandonDungeonRun === 'function') abandonDungeonRun(false);
}

function shouldFallbackDungeonDuoFromCloud(err) {
    if (typeof isDungeonDuoCloudApiMissing === 'function') return isDungeonDuoCloudApiMissing(err);
    const code = err && err.data && err.data.error;
    return code === 'not_found' || (err && String(err.message) === 'HTTP 404');
}

function enterDungeonDuoCloudAsHostWithFallback(dungeonId, roomCode, sessionId) {
    return (typeof enterDungeonDuoCloudAsHost === 'function'
        ? enterDungeonDuoCloudAsHost(dungeonId, roomCode)
        : Promise.reject(new Error('dungeonDuoCloud not loaded'))
    ).catch(function (err) {
        if (!shouldFallbackDungeonDuoFromCloud(err)) throw err;
        duoDungeonLog('Сервер дуо недоступен — подключаемся через MQTT…', 'warning');
        duoDungeonState.transport = 'mqtt';
        return joinDungeonDuoTransportRoom(roomCode, sessionId);
    });
}

function enterDungeonDuoCloudAsGuestWithFallback(roomCode, sessionId) {
    return (typeof enterDungeonDuoCloudAsGuest === 'function'
        ? enterDungeonDuoCloudAsGuest(roomCode)
        : Promise.reject(new Error('dungeonDuoCloud not loaded'))
    ).catch(function (err) {
        if (!shouldFallbackDungeonDuoFromCloud(err)) throw err;
        duoDungeonLog('Сервер дуо недоступен — подключаемся через MQTT…', 'warning');
        duoDungeonState.transport = 'mqtt';
        return joinDungeonDuoTransportRoom(roomCode, sessionId);
    });
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
    if (typeof createLazyDungeonRun === 'function') {
        const run = createLazyDungeonRun(dungeonId, seed);
        run.mode = 'duo';
        if (typeof ensureFloorGenerated === 'function') ensureFloorGenerated(run, 0);
        return run;
    }
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
    if (typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
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
    if (payload.snapshot && typeof payload.snapshot === 'object') {
        duoDungeonState.remoteSnapshot = payload.snapshot;
    }
    duoDungeonLog(`Партнёр ${duoDungeonState.remoteReady ? 'готов' : 'не готов'}.`, 'info');
    maybeStartDuoDungeonSync();
    refreshDuoDungeonLobbyUI();
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
    if (typeof getDungeonRunSession === 'function' && !getDungeonRunSession() &&
        typeof startDungeonRun === 'function') {
        startDungeonRun(dungeonId, 'duo', duoDungeonState.run);
        const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
        if (session) {
            session.committed = true;
            if (typeof saveActiveDungeonRun === 'function') saveActiveDungeonRun();
        }
    }
    if (typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
}

function applyRemoteDuoDungeonRoomState(payload) {
    if (!payload) return;

    if (payload.kind === 'enter_battle' && typeof applyRemoteDuoDungeonEnterBattle === 'function') {
        applyRemoteDuoDungeonEnterBattle(payload);
        return;
    }
    if (payload.kind === 'room_advance' && typeof applyDungeonRoomAdvanceFromHost === 'function') {
        applyDungeonRoomAdvanceFromHost(payload);
        return;
    }
    if (payload.kind === 'victory_ack' && typeof applyDungeonDuoVictoryAck === 'function') {
        applyDungeonDuoVictoryAck(payload);
        return;
    }

    if (typeof applyDungeonDuoRoomSnapshot === 'function' && window.dungeonDuoBattleActive) {
        applyDungeonDuoRoomSnapshot(payload);
        return;
    }

    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    if (!session || duoDungeonState.role === 'host') return;

    if (payload.completed) {
        if (typeof applyDungeonRoomAdvanceFromHost === 'function') {
            applyDungeonRoomAdvanceFromHost({
                completed: true,
                floorIndex: payload.floorIndex,
                roomIndex: payload.roomIndex,
                state: 'complete',
                dungeonId: duoDungeonState.dungeonId
            });
        }
        return;
    }

    if (typeof payload.floorIndex === 'number') session.floorIndex = payload.floorIndex;
    if (typeof payload.roomIndex === 'number') session.roomIndex = payload.roomIndex;
    if (payload.state) session.state = payload.state;
    if (typeof openDungeonDetail === 'function' && duoDungeonState.dungeonId) {
        openDungeonDetail(duoDungeonState.dungeonId);
    }
}

function applyRemoteDuoDungeonBattleAction(payload) {
    if (typeof applyRemoteDuoDungeonBattleActionImpl === 'function') {
        applyRemoteDuoDungeonBattleActionImpl(payload);
    }
}

function applyRemoteDuoDungeonForfeit(_payload) {
    duoDungeonLog('Партнёр сдался или отключился.', 'warning');
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    if (typeof abandonDungeonRun === 'function') abandonDungeonRun();
    duoDungeonState.status = 'lobby';
    duoDungeonState.remoteReady = false;
    if (typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
}

function handleDungeonDuoMessage(msg) {
    if (!msg || msg.v !== DUNGEON_DUO_VERSION) return;
    const payload = msg.payload || {};
    switch (msg.type) {
        case 'hello':
            applyRemoteDuoDungeonLobbyReady(payload);
            break;
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
    if (duoDungeonState) duoDungeonState.transport = 'mqtt';

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
        broadcastDuoDungeonLobbyPresence();
        refreshDuoDungeonLobbyUI();
    });

    setDungeonDuoRoomHandler(room, 'onPeerLeave', peerId => {
        if (sessionId !== duoDungeonSessionId || peerId !== duoDungeonPartnerId) return;
        duoDungeonPartnerId = '';
        syncDuoDungeonPartnerId();
        duoDungeonState.remoteReady = false;
        duoDungeonState.remoteSnapshot = null;
        if (duoDungeonState.status === 'battle') {
            applyRemoteDuoDungeonForfeit({});
        } else if (duoDungeonState.role === 'host') {
            duoDungeonState.status = 'lobby';
            duoDungeonLog('Партнёр отключился.', 'error');
        } else {
            duoDungeonState.status = 'idle';
            duoDungeonLog('Хост отключился.', 'error');
        }
        refreshDuoDungeonLobbyUI();
    });

    actionAdapter.receive((incoming, peerId) => {
        if (sessionId !== duoDungeonSessionId) return;
        if (duoDungeonPartnerId && duoDungeonPartnerId !== peerId) return;
        const wasNewPeer = !duoDungeonPartnerId;
        duoDungeonPartnerId = peerId;
        syncDuoDungeonPartnerId();
        handleDungeonDuoMessage(incoming);
        if (wasNewPeer && duoDungeonState.localReady) broadcastDuoDungeonLobbyPresence();
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
    if (typeof shouldUseDungeonDuoCloudTransport === 'function' && shouldUseDungeonDuoCloudTransport()) {
        duoDungeonLog('Создание комнаты на сервере…', 'info');
        return enterDungeonDuoCloudAsHostWithFallback(id, duoDungeonState.roomCode, sessionId)
            .then(function () {
                refreshDuoDungeonLobbyUI();
                return true;
            })
            .catch(function (err) {
                handleDungeonDuoLobbyError(err);
                return false;
            });
    }
    duoDungeonLog(`Комната ${duoDungeonState.roomCode} (данж ${id}, MQTT).`, 'info');
    return joinDungeonDuoTransportRoom(duoDungeonState.roomCode, sessionId).then(function () {
        refreshDuoDungeonLobbyUI();
        return true;
    });
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
    if (typeof shouldUseDungeonDuoCloudTransport === 'function' && shouldUseDungeonDuoCloudTransport()) {
        duoDungeonLog('Подключение к серверу…', 'info');
        return enterDungeonDuoCloudAsGuestWithFallback(roomCode, sessionId)
            .then(function () {
                refreshDuoDungeonLobbyUI();
                return true;
            })
            .catch(function (err) {
                handleDungeonDuoLobbyError(err);
                return false;
            });
    }
    duoDungeonLog(`Подключение к ${roomCode} (MQTT)…`, 'info');
    return joinDungeonDuoTransportRoom(roomCode, sessionId).then(function () {
        refreshDuoDungeonLobbyUI();
        return true;
    });
}

function leaveDuoDungeonLobby() {
    if (isDungeonDuoCloudTransport() && typeof leaveDungeonDuoCloudTransport === 'function') {
        leaveDungeonDuoCloudTransport();
    }
    resetDungeonDuoConnection();
    duoDungeonState = createEmptyDuoDungeonState();
    duoDungeonLog('Комната данжа закрыта.', 'info');
}

function setDuoDungeonLobbyReady(ready) {
    if (duoDungeonState.status !== 'lobby') return false;
    duoDungeonState.localReady = !!ready;
    broadcastDuoDungeonLobbyPresence();
    maybeStartDuoDungeonSync();
    refreshDuoDungeonLobbyUI();
    return true;
}

function toggleDuoDungeonLobbyReady() {
    const next = !duoDungeonState.localReady;
    return setDuoDungeonLobbyReady(next);
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
    return Object.assign({}, duoDungeonState, {
        partnerId: duoDungeonPartnerId,
        partnerConnected: isDungeonDuoCloudTransport()
            ? (duoDungeonState.role === 'guest' || !!duoDungeonPartnerId ||
                !!duoDungeonState.remoteSnapshot || duoDungeonState.remoteReady)
            : !!duoDungeonPartnerId,
        transportLabel: isDungeonDuoCloudTransport() && typeof getDungeonDuoTransportLabel === 'function'
            ? getDungeonDuoTransportLabel()
            : 'MQTT'
    });
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
window.setDuoDungeonRunStatus = setDuoDungeonRunStatus;
window.buildDuoLobbyPlayerSnapshot = buildDuoLobbyPlayerSnapshot;
window.resolveDuoPlayerPortrait = resolveDuoPlayerPortrait;
window.refreshDuoDungeonLobbyUI = refreshDuoDungeonLobbyUI;
window.setDuoDungeonPartnerId = setDuoDungeonPartnerId;
