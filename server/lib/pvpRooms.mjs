import { join } from 'node:path';
import { randomBytes, randomInt } from 'node:crypto';
import { readJsonFile, setJsonMemory, dropJsonCache } from './jsonFile.mjs';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_PVP_EVENTS = 200;
const ROOM_TTL_MS = Number(process.env.ETHERIA_PVP_ROOM_TTL_MS || 2 * 60 * 60 * 1000);
const POLL_WAIT_MAX_MS = Number(process.env.ETHERIA_PVP_POLL_WAIT_MS || 25000);
const POLL_TICK_MS = 150;

const roomLocks = new Map();
const activeRooms = new Map();

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function storePvPSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return null;
    try {
        const raw = JSON.stringify(snap);
        if (raw.length > 180000) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function createPvPRoomsApi(pvpDir) {
    function roomFile(code) {
        return join(pvpDir, 'room_' + String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '.json');
    }

    function normalizeCode(code) {
        const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return c.length >= 4 ? c : '';
    }

    function newSessionId() {
        return 's_' + randomBytes(8).toString('hex');
    }

    function randomRoomCode() {
        let roomCode = '';
        for (let i = 0; i < 6; i++) roomCode += CODE_CHARS[randomInt(CODE_CHARS.length)];
        return roomCode;
    }

    async function withRoomLock(code, fn) {
        const prev = roomLocks.get(code) || Promise.resolve();
        let release;
        const gate = new Promise(r => { release = r; });
        roomLocks.set(code, prev.then(() => gate));
        await prev;
        try {
            return await fn();
        } finally {
            release();
            if (roomLocks.get(code) === gate) roomLocks.delete(code);
        }
    }

    async function loadRoom(code) {
        const c = normalizeCode(code);
        if (!c) return null;
        if (activeRooms.has(c)) return activeRooms.get(c);
        const room = await readJsonFile(roomFile(c), null);
        if (room) activeRooms.set(c, room);
        return room;
    }

    function persistRoom(room) {
        const c = room.roomCode;
        activeRooms.set(c, room);
        setJsonMemory(roomFile(c), room);
    }

    function filterEvents(room, since, sessionId) {
        return (room.events || []).filter(e => e && e.seq > since && e.from !== sessionId);
    }

    async function pushEvent(room, sessionId, role, type, payload) {
        if (!Array.isArray(room.events)) room.events = [];
        const seq = room.nextSeq || 1;
        room.events.push({
            seq,
            from: sessionId,
            fromRole: role,
            type: String(type || '').slice(0, 32),
            payload: payload || {},
            at: Date.now()
        });
        room.nextSeq = seq + 1;
        if (room.events.length > MAX_PVP_EVENTS) {
            room.events = room.events.slice(-MAX_PVP_EVENTS);
        }
        room.updatedAt = Date.now();
        persistRoom(room);
        return seq;
    }

    async function waitForEvents(room, since, sessionId, waitMs) {
        const deadline = Date.now() + Math.min(Math.max(0, waitMs), POLL_WAIT_MAX_MS);
        while (Date.now() < deadline) {
            const events = filterEvents(room, since, sessionId);
            if (events.length) return events;
            await sleep(POLL_TICK_MS);
        }
        return filterEvents(room, since, sessionId);
    }

    function purgeStaleRooms() {
        const now = Date.now();
        for (const [code, room] of activeRooms) {
            if (!room || now - (room.updatedAt || room.createdAt || 0) > ROOM_TTL_MS) {
                activeRooms.delete(code);
                dropJsonCache(roomFile(code));
            }
        }
    }

    setInterval(purgeStaleRooms, 5 * 60 * 1000).unref();

    function roomSummary(room) {
        return {
            hasGuest: !!room.guestSession,
            hostSnapshot: room.hostSnapshot,
            guestSnapshot: room.guestSnapshot,
            updatedAt: room.updatedAt,
            nextSeq: room.nextSeq || 1
        };
    }

    return {
        normalizeCode,
        newSessionId,
        randomRoomCode,
        storePvPSnapshot,
        loadRoom,
        withRoomLock,
        pushEvent,
        waitForEvents,
        filterEvents,
        roomSummary,
        async createRoom(body) {
            let roomCode = normalizeCode(body.roomCode);
            if (!roomCode) roomCode = randomRoomCode();
            return withRoomLock(roomCode, async () => {
                const existing = await loadRoom(roomCode);
                if (existing) return { error: 'room_exists', status: 409 };
                const sessionId = newSessionId();
                const snap = storePvPSnapshot(body.snapshot);
                const room = {
                    roomCode,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    hostSession: sessionId,
                    guestSession: '',
                    hostSnapshot: snap,
                    guestSnapshot: null,
                    nextSeq: 1,
                    events: []
                };
                persistRoom(room);
                return { ok: true, roomCode, sessionId, role: 'host' };
            });
        },
        async joinRoom(body) {
            const roomCode = normalizeCode(body.roomCode);
            if (!roomCode) return { error: 'room_not_found', status: 404 };
            return withRoomLock(roomCode, async () => {
                const room = await loadRoom(roomCode);
                if (!room) return { error: 'room_not_found', status: 404 };
                if (room.guestSession) return { error: 'room_full', status: 409 };
                const sessionId = newSessionId();
                const snap = storePvPSnapshot(body.snapshot);
                room.guestSession = sessionId;
                room.guestSnapshot = snap;
                room.updatedAt = Date.now();
                await pushEvent(room, sessionId, 'guest', 'hello', { snapshot: snap, ready: false });
                return {
                    ok: true,
                    roomCode,
                    sessionId,
                    role: 'guest',
                    hostSnapshot: room.hostSnapshot
                };
            });
        },
        async postEvent(roomCode, body) {
            const code = normalizeCode(roomCode);
            return withRoomLock(code, async () => {
                const room = await loadRoom(code);
                if (!room) return { error: 'room_not_found', status: 404 };
                const sessionId = String(body.sessionId || '').slice(0, 64);
                let role = '';
                if (sessionId === room.hostSession) role = 'host';
                else if (sessionId === room.guestSession) role = 'guest';
                else return { error: 'forbidden', status: 403 };
                const type = String(body.type || '').slice(0, 32);
                const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
                if (type === 'hello' && payload.snapshot) {
                    const s = storePvPSnapshot(payload.snapshot);
                    if (role === 'guest') room.guestSnapshot = s;
                    else room.hostSnapshot = s;
                }
                if (type === 'ready' && payload.snapshot) {
                    const s = storePvPSnapshot(payload.snapshot);
                    if (role === 'guest') room.guestSnapshot = s;
                    else room.hostSnapshot = s;
                }
                const seq = await pushEvent(room, sessionId, role, type, payload);
                return { ok: true, seq };
            });
        },
        async poll(roomCode, sessionId, since, waitMs) {
            const code = normalizeCode(roomCode);
            const room = await loadRoom(code);
            if (!room) return { error: 'room_not_found', status: 404 };
            if (sessionId !== room.hostSession && sessionId !== room.guestSession) {
                return { error: 'forbidden', status: 403 };
            }
            const events = waitMs > 0
                ? await waitForEvents(room, since, sessionId, waitMs)
                : filterEvents(room, since, sessionId);
            return { ok: true, events, room: roomSummary(room) };
        }
    };
}
