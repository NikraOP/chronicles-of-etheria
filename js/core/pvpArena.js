// PvP Arena: PeerJS/WebRTC 1v1 for static hosting.
const PVP_ROOM_PREFIX = 'etheria-pvp-';
const PVP_VERSION = 1;

let pvpPeer = null;
let pvpConn = null;
let pvpSessionId = 0;
let pvpState = createEmptyPvPState();

function createEmptyPvPState() {
    return {
        status: 'idle',
        role: '',
        roomCode: '',
        error: '',
        localReady: false,
        remoteReady: false,
        local: null,
        remote: null,
        match: null,
        log: []
    };
}

function pvpLog(message, type) {
    pvpState.log.unshift({
        message,
        type: type || 'info',
        time: new Date().toLocaleTimeString()
    });
    pvpState.log = pvpState.log.slice(0, 20);
}

function pvpRoomId(code) {
    return PVP_ROOM_PREFIX + String(code || '').trim().toUpperCase();
}

function generatePvPCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return code;
}

function escapePvPText(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapePvPAttr(value) {
    return escapePvPText(value).replace(/`/g, '&#96;');
}

function safePvPClass(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function safePvPAvatarSrc(src) {
    const value = String(src || '').trim();
    if (!value || /[<>"'`]/.test(value)) return '';
    if (/^(javascript|data|vbscript):/i.test(value)) return '';
    if (!/\.(png|jpg|jpeg|gif|webp)$/i.test(value)) return '';
    if (value.startsWith('png/') || value.startsWith('./') || value.startsWith('assets/') || value.startsWith('monsters/')) return value;
    return '';
}

function clampPvPNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
}

function sanitizePvPSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    return {
        name: String(snapshot.name || 'Игрок').slice(0, 24),
        class: String(snapshot.class || 'Герой').slice(0, 20),
        branch: String(snapshot.branch || '').slice(0, 32),
        level: clampPvPNumber(snapshot.level, 1, 999, 1),
        avatar: safePvPAvatarSrc(snapshot.avatar),
        maxHealth: clampPvPNumber(snapshot.maxHealth, 1, 999999, 1),
        health: clampPvPNumber(snapshot.health || snapshot.maxHealth, 1, 999999, 1),
        attack: clampPvPNumber(snapshot.attack, 1, 99999, 1),
        defense: clampPvPNumber(snapshot.defense, 0, 99999, 0),
        criticalChance: clampPvPNumber(snapshot.criticalChance, 0, 100, 0),
        criticalDamage: clampPvPNumber(snapshot.criticalDamage, 100, 1000, 150),
        dodgeChance: clampPvPNumber(snapshot.dodgeChance, 0, 100, 0)
    };
}

function getPvPAvatar() {
    if (typeof getAvatar === 'function') {
        const div = document.createElement('div');
        div.innerHTML = getAvatar();
        const img = div.querySelector('img');
        if (img) return img.getAttribute('src') || '';
    }
    return player.schoolImg || '';
}

function getPvPPlayerSnapshot() {
    return sanitizePvPSnapshot({
        name: player.name,
        class: player.class,
        branch: player.branch,
        level: player.level,
        avatar: getPvPAvatar(),
        maxHealth: Math.max(1, player.maxHealth || 1),
        health: Math.max(1, player.maxHealth || player.health || 1),
        attack: Math.max(1, player.attack || 1),
        defense: Math.max(0, player.defense || 0),
        criticalChance: Math.max(0, player.criticalChance || 0),
        criticalDamage: Math.max(100, player.criticalDamage || 150),
        dodgeChance: Math.max(0, player.dodgeChance || 0)
    });
}

function clonePvPStats(snapshot) {
    const s = sanitizePvPSnapshot(snapshot);
    if (!s) throw new Error('Invalid PvP snapshot');
    s.health = Math.max(1, s.health || s.maxHealth || 1);
    s.maxHealth = Math.max(1, s.maxHealth || s.health || 1);
    s.guard = false;
    return s;
}

function hashPvPMatch(match) {
    if (!match) return '0';
    const host = match.players.host;
    const guest = match.players.guest;
    const raw = [
        match.turn,
        match.active,
        match.finished ? 1 : 0,
        host.name,
        host.class,
        host.branch,
        host.level,
        host.maxHealth,
        host.health,
        host.attack,
        host.defense,
        host.criticalChance,
        host.criticalDamage,
        host.dodgeChance,
        host.guard ? 1 : 0,
        guest.name,
        guest.class,
        guest.branch,
        guest.level,
        guest.maxHealth,
        guest.health,
        guest.attack,
        guest.defense,
        guest.criticalChance,
        guest.criticalDamage,
        guest.dodgeChance,
        guest.guard ? 1 : 0,
        match.winner || ''
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    return String(Math.abs(hash));
}

function calculatePvPDamage(attacker, defender, action) {
    if (action === 'guard') return { damage: 0, crit: false, dodged: false };
    const dodgeChance = Math.min(55, Math.max(0, defender.dodgeChance || 0));
    const dodged = action !== 'quick' && Math.random() * 100 < dodgeChance;
    if (dodged) return { damage: 0, crit: false, dodged: true };

    const critChance = action === 'power'
        ? Math.max(0, (attacker.criticalChance || 0) - 10)
        : attacker.criticalChance || 0;
    const crit = Math.random() * 100 < critChance;
    const actionMultiplier = action === 'power' ? 1.35 : action === 'quick' ? 0.78 : 1;
    const defenseReduction = Math.min(65, (defender.defense || 0) / 4);
    let damage = Math.floor((attacker.attack || 1) * actionMultiplier);
    if (crit) damage = Math.floor(damage * ((attacker.criticalDamage || 150) / 100));
    damage = Math.max(1, Math.floor(damage * (100 - defenseReduction) / 100));
    if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
    return { damage, crit, dodged: false };
}

function reducePvPMatch(match, actorRole, action) {
    if (!match || match.finished) return { match, result: { ignored: true } };
    if (match.active !== actorRole) return { match, result: { ignored: true, reason: 'wrong_turn' } };

    const next = JSON.parse(JSON.stringify(match));
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    const actor = next.players[actorRole];
    const opponent = next.players[opponentRole];
    actor.guard = action === 'guard';

    let result = { action, actorRole, opponentRole, damage: 0, crit: false, dodged: false };
    if (action !== 'guard') {
        result = { ...result, ...calculatePvPDamage(actor, opponent, action) };
        opponent.health = Math.max(0, opponent.health - result.damage);
    }

    if (opponent.health <= 0) {
        next.finished = true;
        next.winner = actorRole;
    } else {
        next.active = opponentRole;
        next.turn += 1;
    }
    next.hash = hashPvPMatch(next);
    return { match: next, result };
}

function getPvPMaxPlausibleDamage(attacker, defender, action) {
    if (action === 'guard') return 0;
    const actionMultiplier = action === 'power' ? 1.35 : action === 'quick' ? 0.78 : 1;
    const defenseReduction = Math.min(65, (defender.defense || 0) / 4);
    let damage = Math.floor((attacker.attack || 1) * actionMultiplier);
    damage = Math.floor(damage * ((attacker.criticalDamage || 150) / 100));
    damage = Math.max(1, Math.floor(damage * (100 - defenseReduction) / 100));
    if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
    return damage + 2;
}

function isValidPvPAction(action) {
    return ['attack', 'power', 'quick', 'guard'].includes(action);
}

function validatePvPResult(match, actorRole, action, result) {
    if (!match || !result || !isValidPvPAction(action)) return false;
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    const attacker = match.players && match.players[actorRole];
    const defender = match.players && match.players[opponentRole];
    if (!attacker || !defender) return false;
    const damage = Number(result.damage || 0);
    if (!Number.isFinite(damage) || damage < 0) return false;
    if (action === 'guard') return damage === 0;
    if (result.dodged) return damage === 0;
    return damage <= getPvPMaxPlausibleDamage(attacker, defender, action);
}

function applyPvPResultToMatch(match, actorRole, action, result) {
    const next = JSON.parse(JSON.stringify(match));
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    next.players[actorRole].guard = action === 'guard';
    if (action !== 'guard' && !result.dodged) {
        next.players[opponentRole].health = Math.max(0, next.players[opponentRole].health - Math.floor(result.damage || 0));
    }
    if (next.players[opponentRole].health <= 0) {
        next.finished = true;
        next.winner = actorRole;
    } else {
        next.active = opponentRole;
        next.turn += 1;
    }
    next.hash = hashPvPMatch(next);
    return next;
}

function validatePvPMatchShape(match) {
    if (!match || typeof match !== 'object') return false;
    if (!match.players || !match.players.host || !match.players.guest) return false;
    if (!['host', 'guest'].includes(match.active)) return false;
    if (!Number.isFinite(Number(match.turn)) || Number(match.turn) < 1) return false;
    if (match.hash !== hashPvPMatch(match)) return false;
    return true;
}

function sanitizePvPMatch(match) {
    if (!validatePvPMatchShape(match)) return null;
    const host = sanitizePvPSnapshot(match.players.host);
    const guest = sanitizePvPSnapshot(match.players.guest);
    if (!host || !guest) return null;
    host.health = clampPvPNumber(match.players.host.health, 0, host.maxHealth, host.maxHealth);
    guest.health = clampPvPNumber(match.players.guest.health, 0, guest.maxHealth, guest.maxHealth);
    host.guard = !!match.players.host.guard;
    guest.guard = !!match.players.guest.guard;
    const safe = {
        turn: clampPvPNumber(match.turn, 1, 999999, 1),
        active: match.active === 'guest' ? 'guest' : 'host',
        finished: !!match.finished,
        winner: ['host', 'guest'].includes(match.winner) ? match.winner : '',
        players: { host, guest },
        hash: ''
    };
    safe.hash = hashPvPMatch(safe);
    return safe.hash === match.hash ? safe : null;
}

function samePvPParticipant(a, b) {
    if (!a || !b) return false;
    return a.name === b.name
        && a.class === b.class
        && a.branch === b.branch
        && a.level === b.level
        && a.maxHealth === b.maxHealth
        && a.attack === b.attack
        && a.defense === b.defense
        && a.criticalChance === b.criticalChance
        && a.criticalDamage === b.criticalDamage
        && a.dodgeChance === b.dodgeChance;
}

function matchUsesNegotiatedSnapshots(match) {
    if (!match || !pvpState.local || !pvpState.remote) return false;
    const localRole = getLocalPvPRole();
    const remoteRole = getRemotePvPRole();
    return samePvPParticipant(match.players[localRole], pvpState.local)
        && samePvPParticipant(match.players[remoteRole], pvpState.remote);
}

function buildInitialPvPMatch(hostSnapshot, guestSnapshot) {
    const match = {
        turn: 1,
        active: 'host',
        finished: false,
        winner: '',
        players: {
            host: clonePvPStats(hostSnapshot),
            guest: clonePvPStats(guestSnapshot)
        },
        hash: ''
    };
    match.hash = hashPvPMatch(match);
    return match;
}

function sendPvPMessage(type, payload) {
    if (!pvpConn || !pvpConn.open) return false;
    pvpConn.send({
        v: PVP_VERSION,
        type,
        payload: payload || {},
        sentAt: Date.now()
    });
    return true;
}

function resetPvPConnection() {
    pvpSessionId++;
    try { if (pvpConn) pvpConn.close(); } catch (e) {}
    try { if (pvpPeer) pvpPeer.destroy(); } catch (e) {}
    pvpConn = null;
    pvpPeer = null;
}

function showPvPArena() {
    if (!player) return;
    stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();
    if (!pvpState.local) pvpState.local = getPvPPlayerSnapshot();
    renderPvPArena();
}

function renderPvPArena() {
    const el = document.getElementById('dynamicContent');
    if (!el) return;
    const canStart = pvpState.role === 'host' && pvpState.status === 'connected' && pvpState.localReady && pvpState.remoteReady && !pvpState.match;
    const room = escapePvPText(pvpState.roomCode || '------');
    const logs = pvpState.log.map(l => `<div class="pvp-log-entry ${safePvPClass(l.type || 'info')}"><span>${escapePvPText(l.time)}</span> ${escapePvPText(l.message)}</div>`).join('');
    el.innerHTML = `
        <section class="pvp-panel">
            <div class="pvp-header">
                <div>
                    <h2>🏟️ PvP Арена 1 на 1</h2>
                    <p>Создай комнату или подключись по коду. Работает через PeerJS/WebRTC без backend.</p>
                </div>
                <span class="pvp-status pvp-status-${safePvPClass(pvpState.status)}">${escapePvPText(getPvPStatusLabel())}</span>
            </div>

            <div class="pvp-grid">
                <div class="pvp-card">
                    <h3>Создать комнату</h3>
                    <p>Передай код второму игроку. Первый ходит создатель комнаты.</p>
                    <button class="action-btn" onclick="createPvPRoom()">Создать код</button>
                </div>
                <div class="pvp-card">
                    <h3>Подключиться</h3>
                    <p>Введи код комнаты от другого игрока.</p>
                    <input id="pvpJoinCode" class="hero-input pvp-code-input" maxlength="12" placeholder="Код комнаты">
                    <button class="action-btn" onclick="joinPvPRoom()">Подключиться</button>
                </div>
            </div>

            <div class="pvp-room-card">
                <div>
                    <div class="pvp-room-label">Код комнаты</div>
                    <div class="pvp-room-code">${room}</div>
                </div>
                <button class="action-btn" onclick="copyPvPCode()" ${pvpState.roomCode ? '' : 'disabled'}>Скопировать</button>
                <button class="action-btn danger" onclick="leavePvPArena()">Отключиться</button>
            </div>

            <div class="pvp-grid">
                ${renderPvPPlayerCard('Ты', pvpState.local || getPvPPlayerSnapshot(), pvpState.localReady)}
                ${renderPvPPlayerCard('Соперник', pvpState.remote, pvpState.remoteReady)}
            </div>

            <div class="pvp-actions-row">
                <button class="action-btn" onclick="togglePvPReady()" ${pvpState.status === 'connected' ? '' : 'disabled'}>${pvpState.localReady ? 'Не готов' : 'Готов'}</button>
                <button class="action-btn" onclick="hostStartPvPMatch()" ${canStart ? '' : 'disabled'}>Начать матч</button>
            </div>
            <p class="pvp-hint">Если public PeerJS недоступен, попробуй обновить страницу и создать новый код. Для рейтинга и античита позже нужен backend.</p>
            <div class="pvp-log">${logs || '<div class="pvp-log-entry">Журнал пуст.</div>'}</div>
        </section>
    `;
}

function renderPvPPlayerCard(title, snapshot, ready) {
    if (!snapshot) {
        return `<div class="pvp-card pvp-player-card"><h3>${escapePvPText(title)}</h3><p>Ожидание...</p></div>`;
    }
    const safeSnapshot = sanitizePvPSnapshot(snapshot);
    if (!safeSnapshot) return `<div class="pvp-card pvp-player-card"><h3>${escapePvPText(title)}</h3><p>Некорректные данные игрока</p></div>`;
    const avatar = safeSnapshot.avatar ? `<img src="${escapePvPAttr(safeSnapshot.avatar)}" alt="">` : '<div class="pvp-avatar-fallback">⚔️</div>';
    return `
        <div class="pvp-card pvp-player-card">
            <div class="pvp-player-row">
                <div class="pvp-avatar">${avatar}</div>
                <div>
                    <h3>${escapePvPText(title)}: ${escapePvPText(safeSnapshot.name)}</h3>
                    <p>${escapePvPText(safeSnapshot.class)} · ${escapePvPText(safeSnapshot.branch)} · ур. ${safeSnapshot.level}</p>
                    <p>❤️ ${safeSnapshot.maxHealth} · ⚔️ ${safeSnapshot.attack} · 🛡️ ${safeSnapshot.defense} · 💨 ${safeSnapshot.dodgeChance}%</p>
                    <span class="pvp-ready ${ready ? 'ready' : ''}">${ready ? 'Готов' : 'Не готов'}</span>
                </div>
            </div>
        </div>
    `;
}

function getPvPStatusLabel() {
    const labels = {
        idle: 'не подключено',
        hosting: 'ожидание соперника',
        connecting: 'подключение',
        connected: 'соперник подключен',
        battle: 'бой',
        ended: 'завершено',
        error: 'ошибка'
    };
    return labels[pvpState.status] || pvpState.status;
}

function createPeerOrFail(id) {
    if (typeof Peer === 'undefined') {
        pvpState.status = 'error';
        pvpState.error = 'PeerJS не загрузился. Проверь интернет или CDN.';
        pvpLog(pvpState.error, 'error');
        renderPvPArena();
        return null;
    }
    return new Peer(id, { debug: 1 });
}

function createPvPRoom() {
    resetPvPConnection();
    const sessionId = pvpSessionId;
    pvpState = createEmptyPvPState();
    pvpState.role = 'host';
    pvpState.roomCode = generatePvPCode();
    pvpState.local = getPvPPlayerSnapshot();
    pvpState.status = 'hosting';
    pvpLog('Создаём комнату...', 'info');
    renderPvPArena();

    pvpPeer = createPeerOrFail(pvpRoomId(pvpState.roomCode));
    if (!pvpPeer) return;
    pvpPeer.on('open', () => {
        if (sessionId !== pvpSessionId) return;
        pvpLog(`Комната ${pvpState.roomCode} готова. Ждём соперника.`, 'success');
        renderPvPArena();
    });
    pvpPeer.on('connection', conn => {
        if (sessionId !== pvpSessionId) {
            conn.close();
            return;
        }
        if (pvpConn || pvpState.status !== 'hosting') {
            conn.close();
            return;
        }
        setupPvPConnection(conn, sessionId);
    });
    pvpPeer.on('error', err => {
        if (sessionId !== pvpSessionId) return;
        handlePvPError(err);
    });
}

function joinPvPRoom() {
    const input = document.getElementById('pvpJoinCode');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) {
        addMessage('Введите код PvP комнаты.', 'error');
        return;
    }
    resetPvPConnection();
    const sessionId = pvpSessionId;
    pvpState = createEmptyPvPState();
    pvpState.role = 'guest';
    pvpState.roomCode = code;
    pvpState.local = getPvPPlayerSnapshot();
    pvpState.status = 'connecting';
    pvpLog('Подключаемся к комнате...', 'info');
    renderPvPArena();

    pvpPeer = createPeerOrFail();
    if (!pvpPeer) return;
    pvpPeer.on('open', () => {
        if (sessionId !== pvpSessionId) return;
        const conn = pvpPeer.connect(pvpRoomId(code), { reliable: true });
        setupPvPConnection(conn, sessionId);
    });
    pvpPeer.on('error', err => {
        if (sessionId !== pvpSessionId) return;
        handlePvPError(err);
    });
}

function setupPvPConnection(conn, sessionId) {
    pvpConn = conn;
    pvpConn.on('open', () => {
        if (sessionId !== pvpSessionId) return;
        if (conn !== pvpConn) return;
        pvpState.status = 'connected';
        pvpLog('Соединение установлено.', 'success');
        sendPvPMessage('hello', { snapshot: pvpState.local, ready: pvpState.localReady });
        renderPvPArena();
    });
    pvpConn.on('data', msg => {
        if (sessionId !== pvpSessionId) return;
        if (conn !== pvpConn) return;
        handlePvPMessage(msg);
    });
    pvpConn.on('close', () => {
        if (sessionId !== pvpSessionId) return;
        if (conn !== pvpConn) return;
        if (pvpState.status === 'battle') endPvPMatch('disconnect');
        else if (pvpState.status === 'ended') renderPvPBattle();
        else {
            pvpState.status = 'idle';
            pvpLog('Соперник отключился.', 'error');
            renderPvPArena();
        }
    });
    pvpConn.on('error', err => {
        if (sessionId !== pvpSessionId) return;
        if (conn !== pvpConn) return;
        handlePvPError(err);
    });
}

function handlePvPMessage(msg) {
    if (!msg || msg.v !== PVP_VERSION) return;
    const payload = msg.payload || {};
    if (msg.type === 'hello') {
        const remote = sanitizePvPSnapshot(payload.snapshot);
        if (!remote) {
            pvpLog('Некорректные данные соперника отклонены.', 'error');
            return;
        }
        pvpState.remote = remote;
        pvpState.remoteReady = !!payload.ready;
        pvpLog(`Соперник в лобби: ${pvpState.remote?.name || 'игрок'}.`, 'success');
        sendPvPMessage('ready', { ready: pvpState.localReady, snapshot: pvpState.local });
        renderPvPArena();
    } else if (msg.type === 'ready') {
        if (payload.snapshot) {
            const remote = sanitizePvPSnapshot(payload.snapshot);
            if (!remote) {
                pvpLog('Некорректные данные готовности отклонены.', 'error');
                return;
            }
            pvpState.remote = remote;
        }
        pvpState.remoteReady = !!payload.ready;
        pvpLog(`Соперник ${pvpState.remoteReady ? 'готов' : 'не готов'}.`, 'info');
        renderPvPArena();
    } else if (msg.type === 'start') {
        if (pvpState.role !== 'guest' || pvpState.status !== 'connected' || !pvpState.localReady || !pvpState.remoteReady) {
            pvpLog('Старт матча отклонён: неверное состояние лобби.', 'error');
            return;
        }
        const safeMatch = sanitizePvPMatch(payload.match);
        if (!safeMatch || !matchUsesNegotiatedSnapshots(safeMatch)) {
            pvpLog('Некорректное состояние матча отклонено.', 'error');
            return;
        }
        pvpState.match = safeMatch;
        pvpState.status = 'battle';
        pvpLog('Матч начался.', 'success');
        renderPvPBattle();
    } else if (msg.type === 'turn') {
        applyPvPRemoteAction(payload);
    } else if (msg.type === 'forfeit') {
        endPvPMatch('opponent_forfeit');
    } else if (msg.type === 'end') {
        if (payload.match && pvpState.match) {
            const safeMatch = sanitizePvPMatch(payload.match);
            if (safeMatch && safeMatch.finished && safeMatch.hash === pvpState.match.hash) {
                pvpState.match = safeMatch;
                pvpState.status = 'ended';
                pvpLog(payload.message || 'Матч завершён.', 'info');
                renderPvPBattle();
            }
            return;
        }
    }
}

function handlePvPError(err) {
    pvpState.status = 'error';
    pvpState.error = err && err.message ? err.message : String(err || 'Неизвестная ошибка PeerJS');
    pvpLog(pvpState.error, 'error');
    renderPvPArena();
}

function togglePvPReady() {
    if (pvpState.status !== 'connected') return;
    pvpState.localReady = !pvpState.localReady;
    pvpState.local = getPvPPlayerSnapshot();
    sendPvPMessage('ready', { ready: pvpState.localReady, snapshot: pvpState.local });
    renderPvPArena();
}

function hostStartPvPMatch() {
    if (pvpState.role !== 'host' || !pvpState.localReady || !pvpState.remoteReady || !pvpState.remote) return;
    pvpState.match = buildInitialPvPMatch(pvpState.local, pvpState.remote);
    pvpState.status = 'battle';
    sendPvPMessage('start', { match: pvpState.match });
    pvpLog('Матч начался.', 'success');
    renderPvPBattle();
}

function getLocalPvPRole() {
    return pvpState.role === 'host' ? 'host' : 'guest';
}

function getRemotePvPRole() {
    return getLocalPvPRole() === 'host' ? 'guest' : 'host';
}

function renderPvPBattle() {
    const el = document.getElementById('dynamicContent');
    if (!el || !pvpState.match) {
        renderPvPArena();
        return;
    }
    const localRole = getLocalPvPRole();
    const remoteRole = getRemotePvPRole();
    const local = pvpState.match.players[localRole];
    const remote = pvpState.match.players[remoteRole];
    const myTurn = pvpState.status === 'battle' && !pvpState.match.finished && pvpState.match.active === localRole;
    const logs = pvpState.log.map(l => `<div class="pvp-log-entry ${safePvPClass(l.type || 'info')}"><span>${escapePvPText(l.time)}</span> ${escapePvPText(l.message)}</div>`).join('');
    el.innerHTML = `
        <section class="pvp-battle">
            <div class="pvp-battle-top">
                <h2>🏟️ PvP Арена</h2>
                <span class="pvp-status ${myTurn ? 'ready' : ''}">${pvpState.match.finished ? 'Матч завершён' : myTurn ? 'Твой ход' : 'Ход соперника'}</span>
            </div>
            <div class="battle-arena pvp-battle-arena">
                ${renderPvPCombatant(remote, 'enemy', pvpState.remote)}
                <div class="vs-badge">${pvpState.match.turn}</div>
                ${renderPvPCombatant(local, 'player', pvpState.local)}
            </div>
            ${renderPvPResult()}
            <div class="battle-actions pvp-action-bar">
                <button class="action-btn" onclick="sendPvPAction('attack')" ${myTurn ? '' : 'disabled'}>⚔️ Атака</button>
                <button class="action-btn" onclick="sendPvPAction('power')" ${myTurn ? '' : 'disabled'}>💥 Сильный удар</button>
                <button class="action-btn" onclick="sendPvPAction('quick')" ${myTurn ? '' : 'disabled'}>💨 Быстрый удар</button>
                <button class="action-btn" onclick="sendPvPAction('guard')" ${myTurn ? '' : 'disabled'}>🛡️ Защита</button>
                <button class="action-btn danger" onclick="forfeitPvPMatch()" ${pvpState.status === 'battle' ? '' : 'disabled'}>Сдаться</button>
            </div>
            <p class="pvp-hint">Сильный удар бьёт больнее, но режет шанс крита. Быстрый удар слабее, зато игнорирует уклонение. Защита снижает следующий входящий урон.</p>
            <div class="pvp-log">${logs || '<div class="pvp-log-entry">Журнал пуст.</div>'}</div>
            <button class="action-btn" onclick="showPvPArena()">Вернуться в лобби</button>
        </section>
    `;
}

function renderPvPCombatant(stats, side, snapshot) {
    const hpPct = Math.max(0, Math.min(100, stats.health / Math.max(1, stats.maxHealth) * 100));
    const safeAvatar = snapshot ? safePvPAvatarSrc(snapshot.avatar) : '';
    const avatar = safeAvatar ? `<img class="combatant-img" src="${escapePvPAttr(safeAvatar)}" alt="">` : `<div class="combatant-icon">${side === 'enemy' ? '🛡️' : '⚔️'}</div>`;
    return `
        <div class="combatant-wrapper ${side === 'enemy' ? 'enemy-side' : 'player-side'}">
            <div class="combatant-name">${escapePvPText(stats.name)}</div>
            <div class="combatant-sprite">${avatar}</div>
            <div class="health-bar"><div class="health-fill ${side === 'enemy' ? 'enemy-health' : 'player-health'}" style="width:${hpPct}%"></div></div>
            <div class="combatant-stats">❤️ ${escapePvPText(stats.health)}/${escapePvPText(stats.maxHealth)} · ⚔️ ${escapePvPText(stats.attack)} · 🛡️ ${escapePvPText(stats.defense)}${stats.guard ? ' · Защита' : ''}</div>
        </div>
    `;
}

function renderPvPResult() {
    const match = pvpState.match;
    if (!match || !match.finished) return '';
    const localWon = match.winner === getLocalPvPRole();
    return `<div class="pvp-result ${localWon ? 'win' : 'lose'}">${localWon ? 'Победа!' : 'Поражение'}</div>`;
}

function sendPvPAction(action) {
    const role = getLocalPvPRole();
    if (!pvpState.match || pvpState.match.active !== role || pvpState.match.finished) return;
    const prevHash = pvpState.match.hash;
    const turn = pvpState.match.turn;
    const reduced = reducePvPMatch(pvpState.match, role, action);
    if (reduced.result.ignored) return;
    pvpState.match = reduced.match;
    appendPvPActionLog(reduced.result, true);
    sendPvPMessage('turn', {
        actorRole: role,
        action,
        result: reduced.result,
        prevHash,
        turn,
        hash: pvpState.match.hash
    });
    if (pvpState.match.finished) {
        sendPvPMessage('end', { match: pvpState.match, message: 'Матч завершён.' });
        pvpState.status = 'ended';
    }
    renderPvPBattle();
}

function applyPvPRemoteAction(payload) {
    if (!payload || !pvpState.match || pvpState.status !== 'battle') return;
    const expectedActor = getRemotePvPRole();
    if (payload.actorRole !== expectedActor) {
        pvpLog('Получен ход не от того игрока. Синхронизация отклонена.', 'error');
        return;
    }
    if (payload.prevHash !== pvpState.match.hash || Number(payload.turn) !== pvpState.match.turn || pvpState.match.active !== expectedActor) {
        pvpLog('Ход соперника не совпал с текущим состоянием. Матч рассинхронизирован.', 'error');
        return;
    }
    if (!validatePvPResult(pvpState.match, expectedActor, payload.action, payload.result)) {
        pvpLog('Некорректный результат хода соперника отклонён.', 'error');
        return;
    }
    pvpState.match = applyPvPResultToMatch(pvpState.match, expectedActor, payload.action, payload.result);
    if (payload.hash && payload.hash !== pvpState.match.hash) {
        pvpLog('Hash хода отличается. Продолжаем по локально проверенному состоянию.', 'error');
    }
    appendPvPActionLog(payload.result, false);
    if (pvpState.match.finished) pvpState.status = 'ended';
    renderPvPBattle();
}

function appendPvPActionLog(result, localAction) {
    if (!result) return;
    const actorName = localAction ? 'Ты' : (pvpState.remote?.name || 'Соперник');
    if (result.action === 'guard') {
        pvpLog(`${actorName}: защита до следующего удара.`, 'info');
    } else if (result.dodged) {
        pvpLog(`${actorName}: атака, но цель уклонилась.`, 'info');
    } else {
        const crit = result.crit ? ' Крит!' : '';
        pvpLog(`${actorName}: ${result.damage} урона.${crit}`, result.crit ? 'crit' : 'dmg');
    }
}

function forfeitPvPMatch() {
    if (!pvpState.match || pvpState.match.finished) return;
    pvpState.match.finished = true;
    pvpState.match.winner = getRemotePvPRole();
    pvpState.status = 'ended';
    pvpLog('Ты сдался.', 'error');
    sendPvPMessage('forfeit', {});
    renderPvPBattle();
}

function endPvPMatch(reason) {
    if (!pvpState.match) {
        pvpState.status = 'ended';
        renderPvPArena();
        return;
    }
    pvpState.match.finished = true;
    if (reason === 'opponent_forfeit' || reason === 'disconnect') {
        pvpState.match.winner = getLocalPvPRole();
        pvpLog(reason === 'disconnect' ? 'Соперник отключился. Победа техническая.' : 'Соперник сдался.', 'success');
    }
    pvpState.status = 'ended';
    renderPvPBattle();
}

function copyPvPCode() {
    if (!pvpState.roomCode) return;
    navigator.clipboard?.writeText(pvpState.roomCode);
    addMessage(`Код PvP скопирован: ${pvpState.roomCode}`, 'success');
}

function leavePvPArena() {
    resetPvPConnection();
    pvpState = createEmptyPvPState();
    pvpLog('PvP соединение закрыто.', 'info');
    renderPvPArena();
}

function runPvPStressTest(iterations) {
    const host = {
        name: 'Host', class: 'Воин', branch: 'Тест', level: 50,
        maxHealth: 1800, health: 1800, attack: 260, defense: 90,
        criticalChance: 18, criticalDamage: 170, dodgeChance: 12
    };
    const guest = {
        name: 'Guest', class: 'Лучник', branch: 'Тест', level: 50,
        maxHealth: 1500, health: 1500, attack: 285, defense: 70,
        criticalChance: 24, criticalDamage: 185, dodgeChance: 22
    };
    let match = buildInitialPvPMatch(host, guest);
    const actions = ['attack', 'power', 'quick', 'guard'];
    const total = iterations || 300;
    for (let i = 0; i < total && !match.finished; i++) {
        const action = actions[i % actions.length];
        const reduced = reducePvPMatch(match, match.active, action);
        match = reduced.match;
        if (!match || !match.players.host || !match.players.guest || Number.isNaN(match.players.host.health) || Number.isNaN(match.players.guest.health)) {
            throw new Error('PvP stress state corrupted at turn ' + i);
        }
    }
    return { ok: true, turns: match.turn, finished: match.finished, winner: match.winner || 'none', hash: match.hash };
}

window.showPvPArena = showPvPArena;
window.createPvPRoom = createPvPRoom;
window.joinPvPRoom = joinPvPRoom;
window.togglePvPReady = togglePvPReady;
window.hostStartPvPMatch = hostStartPvPMatch;
window.sendPvPAction = sendPvPAction;
window.forfeitPvPMatch = forfeitPvPMatch;
window.copyPvPCode = copyPvPCode;
window.leavePvPArena = leavePvPArena;
window.runPvPStressTest = runPvPStressTest;
