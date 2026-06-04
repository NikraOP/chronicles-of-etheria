/**
 * API друзей: профили, коды, список друзей.
 * Local: npm run start:friends  →  http://localhost:8790
 * Deploy на Render/Fly с CORS для GitHub Pages.
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data', 'friends-store');
const PORT = Number(process.env.PORT || 8790);
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_BODY = 512 * 1024;
const MAX_PVP_EVENTS = 200;
const MAX_FRIENDS = 80;

const CORS_ORIGINS = (process.env.FRIENDS_CORS || '*').split(',').map(s => s.trim()).filter(Boolean);

function corsHeaders(origin) {
    const allow = CORS_ORIGINS.includes('*')
        ? '*'
        : (CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0] || '*');
    return {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Player-Id, X-Sync-Token',
        'Access-Control-Max-Age': '86400'
    };
}

function json(res, status, body, origin) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(origin)
    });
    res.end(payload);
}

async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) throw new Error('body_too_large');
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function ensureDataDir() {
    await mkdir(DATA_DIR, { recursive: true });
}

function profilePath(playerId) {
    return join(DATA_DIR, 'profile_' + sanitizeId(playerId) + '.json');
}

function friendsPath(playerId) {
    return join(DATA_DIR, 'friends_' + sanitizeId(playerId) + '.json');
}

function codePath(code) {
    return join(DATA_DIR, 'code_' + String(code).toUpperCase() + '.json');
}

function sanitizeId(id) {
    return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

async function loadJson(path, fallback) {
    try {
        const raw = await readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

async function saveJson(path, data) {
    await writeFile(path, JSON.stringify(data, null, 0), 'utf8');
}

function newPlayerId() {
    return 'p_' + randomBytes(8).toString('hex');
}

function newSyncToken() {
    return randomBytes(16).toString('hex');
}

function newFriendCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    }
    return code;
}

async function allocateFriendCode(playerId) {
    for (let attempt = 0; attempt < 40; attempt++) {
        const code = newFriendCode();
        const existing = await loadJson(codePath(code), null);
        if (!existing || existing.playerId === playerId) {
            await saveJson(codePath(code), { playerId, createdAt: Date.now() });
            return code;
        }
    }
    throw new Error('code_alloc_failed');
}

function pickAuth(req) {
    return {
        playerId: sanitizeId(req.headers['x-player-id']),
        syncToken: String(req.headers['x-sync-token'] || '').slice(0, 128)
    };
}

async function loadAccount(playerId) {
    if (!playerId) return null;
    return loadJson(profilePath(playerId), null);
}

async function requireAuth(req, res, origin) {
    const { playerId, syncToken } = pickAuth(req);
    const account = await loadAccount(playerId);
    if (!account || !account.syncToken || account.syncToken !== syncToken) {
        json(res, 401, { ok: false, error: 'unauthorized' }, origin);
        return null;
    }
    return account;
}

function sanitizeProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const out = {
        name: String(profile.name || 'Герой').slice(0, 40),
        class: String(profile.class || '').slice(0, 24),
        branch: String(profile.branch || '').slice(0, 40),
        level: Math.max(1, Math.min(999, Number(profile.level) || 1)),
        gold: Math.max(0, Math.floor(Number(profile.gold) || 0)),
        victories: Math.max(0, Math.floor(Number(profile.victories) || 0)),
        location: String(profile.location || '').slice(0, 80),
        gender: String(profile.gender || 'male').slice(0, 12),
        schoolImg: String(profile.schoolImg || profile.portraitImg || '').slice(0, 200),
        portraitImg: String(profile.portraitImg || profile.schoolImg || '').slice(0, 200),
        currentSkin: profile.currentSkin != null ? String(profile.currentSkin).slice(0, 80) : null,
        skinName: String(profile.skinName || '').slice(0, 48),
        skinIcon: String(profile.skinIcon || '').slice(0, 8),
        stats: {},
        equipment: {}
    };
    const st = profile.stats && typeof profile.stats === 'object' ? profile.stats : {};
    out.stats = {
        health: Number(st.health) || 0,
        maxHealth: Number(st.maxHealth) || 0,
        attack: Number(st.attack) || 0,
        defense: Number(st.defense) || 0,
        mana: Number(st.mana) || 0,
        maxMana: Number(st.maxMana) || 0,
        criticalChance: Number(st.criticalChance) || 0,
        criticalDamage: Number(st.criticalDamage) || 0,
        dodgeChance: Number(st.dodgeChance) || 0,
        experience: Number(st.experience) || 0,
        maxExperience: Number(st.maxExperience) || 0
    };
    const eq = profile.equipment && typeof profile.equipment === 'object' ? profile.equipment : {};
    for (const slot of ['weapon', 'helmet', 'chest', 'pants', 'boots', 'ring', 'necklace']) {
        const item = eq[slot];
        if (!item || typeof item !== 'object') {
            out.equipment[slot] = null;
            continue;
        }
        out.equipment[slot] = {
            name: String(item.name || '').slice(0, 80),
            rarity: String(item.rarity || '').slice(0, 24),
            icon: String(item.icon || '📦').slice(0, 8),
            img: String(item.img || '').slice(0, 200),
            dmg: Number(item.dmg) || 0,
            def: Number(item.def) || 0,
            hp: Number(item.hp) || 0,
            crit: Number(item.crit) || 0,
            critDmg: Number(item.critDmg) || 0,
            dodge: Number(item.dodge) || 0,
            mana: Number(item.mana) || 0
        };
    }
    return out;
}

async function getFriendIds(playerId) {
    const list = await loadJson(friendsPath(playerId), []);
    return Array.isArray(list) ? list.filter(id => sanitizeId(id)) : [];
}

async function addFriendLink(playerId, friendPlayerId) {
    if (playerId === friendPlayerId) return false;
    const ids = await getFriendIds(playerId);
    if (ids.includes(friendPlayerId)) return true;
    if (ids.length >= MAX_FRIENDS) throw new Error('friends_limit');
    ids.push(friendPlayerId);
    await saveJson(friendsPath(playerId), ids);
    return true;
}

async function loadPublicSnapshot(playerId) {
    const account = await loadAccount(playerId);
    if (!account || !account.profile) return null;
    return {
        playerId: account.playerId,
        friendCode: account.friendCode,
        updatedAt: account.updatedAt || 0,
        profile: account.profile
    };
}

const PVP_DIR = join(DATA_DIR, 'pvp-rooms');

function pvpRoomFile(code) {
    return join(PVP_DIR, 'room_' + String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') + '.json');
}

function newPvPSessionId() {
    return 's_' + randomBytes(8).toString('hex');
}

async function loadPvPRoom(code) {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length < 4) return null;
    return loadJson(pvpRoomFile(c), null);
}

async function savePvPRoom(room) {
    await saveJson(pvpRoomFile(room.roomCode), room);
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

async function pushPvPRoomEvent(room, sessionId, role, type, payload) {
    if (!Array.isArray(room.events)) room.events = [];
    room.events.push({
        seq: room.nextSeq || 1,
        from: sessionId,
        fromRole: role,
        type: String(type || '').slice(0, 32),
        payload: payload || {},
        at: Date.now()
    });
    room.nextSeq = (room.nextSeq || 1) + 1;
    if (room.events.length > MAX_PVP_EVENTS) {
        room.events = room.events.slice(-MAX_PVP_EVENTS);
    }
    room.updatedAt = Date.now();
    await savePvPRoom(room);
}

const server = createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(origin));
        res.end();
        return;
    }

    try {
        const url = new URL(req.url || '/', 'http://localhost');

        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
            json(res, 200, { ok: true, service: 'etheria-friends-api' }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/sync') {
            const body = await readJsonBody(req);
            const auth = pickAuth(req);
            let account = auth.playerId ? await loadAccount(auth.playerId) : null;

            if (account) {
                if (!auth.syncToken || account.syncToken !== auth.syncToken) {
                    json(res, 401, { ok: false, error: 'unauthorized' }, origin);
                    return;
                }
            } else {
                const playerId = newPlayerId();
                const syncToken = newSyncToken();
                const friendCode = await allocateFriendCode(playerId);
                account = {
                    playerId,
                    syncToken,
                    friendCode,
                    createdAt: Date.now(),
                    updatedAt: 0,
                    profile: null
                };
            }

            const profile = sanitizeProfile(body.profile);
            if (!profile) {
                json(res, 400, { ok: false, error: 'invalid_profile' }, origin);
                return;
            }

            if (!account.friendCode) {
                account.friendCode = await allocateFriendCode(account.playerId);
            }

            account.profile = profile;
            account.updatedAt = Date.now();
            await saveJson(profilePath(account.playerId), account);

            json(res, 200, {
                ok: true,
                playerId: account.playerId,
                syncToken: account.syncToken,
                friendCode: account.friendCode,
                updatedAt: account.updatedAt
            }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/v1/profile/')) {
            const playerId = sanitizeId(url.pathname.split('/').pop());
            const snap = await loadPublicSnapshot(playerId);
            if (!snap) {
                json(res, 404, { ok: false, error: 'not_found' }, origin);
                return;
            }
            json(res, 200, { ok: true, ...snap }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/v1/code/')) {
            const code = String(url.pathname.split('/').pop() || '').toUpperCase();
            const mapping = await loadJson(codePath(code), null);
            if (!mapping || !mapping.playerId) {
                json(res, 404, { ok: false, error: 'code_not_found' }, origin);
                return;
            }
            const snap = await loadPublicSnapshot(mapping.playerId);
            if (!snap) {
                json(res, 404, { ok: false, error: 'profile_missing' }, origin);
                return;
            }
            json(res, 200, { ok: true, ...snap }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/friends/add') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const code = String(body.friendCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (code.length < 4) {
                json(res, 400, { ok: false, error: 'invalid_code' }, origin);
                return;
            }
            const mapping = await loadJson(codePath(code), null);
            if (!mapping || !mapping.playerId) {
                json(res, 404, { ok: false, error: 'code_not_found' }, origin);
                return;
            }
            if (mapping.playerId === account.playerId) {
                json(res, 400, { ok: false, error: 'self_friend' }, origin);
                return;
            }
            await addFriendLink(account.playerId, mapping.playerId);
            await addFriendLink(mapping.playerId, account.playerId);
            const snap = await loadPublicSnapshot(mapping.playerId);
            json(res, 200, { ok: true, friend: snap }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/friends') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const ids = await getFriendIds(account.playerId);
            const friends = [];
            for (const id of ids) {
                const snap = await loadPublicSnapshot(id);
                if (snap) friends.push(snap);
            }
            friends.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            json(res, 200, { ok: true, friends }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/pvp/room/create') {
            const body = await readJsonBody(req);
            let roomCode = String(body.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (roomCode.length < 4) {
                roomCode = '';
                for (let i = 0; i < 6; i++) roomCode += CODE_CHARS[randomInt(CODE_CHARS.length)];
            }
            const existing = await loadPvPRoom(roomCode);
            if (existing) {
                json(res, 409, { ok: false, error: 'room_exists' }, origin);
                return;
            }
            const sessionId = newPvPSessionId();
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
            await savePvPRoom(room);
            json(res, 200, { ok: true, roomCode, sessionId, role: 'host' }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/pvp/room/join') {
            const body = await readJsonBody(req);
            const roomCode = String(body.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const room = await loadPvPRoom(roomCode);
            if (!room) {
                json(res, 404, { ok: false, error: 'room_not_found' }, origin);
                return;
            }
            if (room.guestSession) {
                json(res, 409, { ok: false, error: 'room_full' }, origin);
                return;
            }
            const sessionId = newPvPSessionId();
            const snap = storePvPSnapshot(body.snapshot);
            room.guestSession = sessionId;
            room.guestSnapshot = snap;
            room.updatedAt = Date.now();
            await pushPvPRoomEvent(room, sessionId, 'guest', 'hello', {
                snapshot: snap,
                ready: false
            });
            json(res, 200, {
                ok: true,
                roomCode,
                sessionId,
                role: 'guest',
                hostSnapshot: room.hostSnapshot
            }, origin);
            return;
        }

        const pvpEventMatch = url.pathname.match(/^\/api\/v1\/pvp\/room\/([A-Z0-9]+)\/event$/i);
        if (req.method === 'POST' && pvpEventMatch) {
            const roomCode = pvpEventMatch[1].toUpperCase();
            const body = await readJsonBody(req);
            const sessionId = String(body.sessionId || '').slice(0, 64);
            const room = await loadPvPRoom(roomCode);
            if (!room) {
                json(res, 404, { ok: false, error: 'room_not_found' }, origin);
                return;
            }
            let role = '';
            if (sessionId === room.hostSession) role = 'host';
            else if (sessionId === room.guestSession) role = 'guest';
            else {
                json(res, 403, { ok: false, error: 'forbidden' }, origin);
                return;
            }
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
            await pushPvPRoomEvent(room, sessionId, role, type, payload);
            json(res, 200, { ok: true, seq: room.nextSeq - 1 }, origin);
            return;
        }

        const pvpPollMatch = url.pathname.match(/^\/api\/v1\/pvp\/room\/([A-Z0-9]+)\/poll$/i);
        if (req.method === 'GET' && pvpPollMatch) {
            const roomCode = pvpPollMatch[1].toUpperCase();
            const sessionId = String(url.searchParams.get('sessionId') || '').slice(0, 64);
            const since = Math.max(0, parseInt(url.searchParams.get('since') || '0', 10) || 0);
            const room = await loadPvPRoom(roomCode);
            if (!room) {
                json(res, 404, { ok: false, error: 'room_not_found' }, origin);
                return;
            }
            if (sessionId !== room.hostSession && sessionId !== room.guestSession) {
                json(res, 403, { ok: false, error: 'forbidden' }, origin);
                return;
            }
            const events = (room.events || []).filter(e => e && e.seq > since && e.from !== sessionId);
            json(res, 200, {
                ok: true,
                events,
                room: {
                    hasGuest: !!room.guestSession,
                    hostSnapshot: room.hostSnapshot,
                    guestSnapshot: room.guestSnapshot,
                    updatedAt: room.updatedAt
                }
            }, origin);
            return;
        }

        json(res, 404, { ok: false, error: 'not_found' }, origin);
    } catch (err) {
        const code = err.message === 'body_too_large' ? 413 : 500;
        json(res, code, { ok: false, error: err.message || 'server_error' }, origin);
    }
});

await ensureDataDir();
await mkdir(PVP_DIR, { recursive: true });
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[friends-api] http://0.0.0.0:${PORT} (friends + pvp cloud)`);
});
