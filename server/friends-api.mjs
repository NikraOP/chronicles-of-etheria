/**
 * Etheria API: друзья + PvP облако.
 * RAM-кэш, атомарный диск, блокировки комнат, long-poll.
 */
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, flushAll } from './lib/jsonFile.mjs';
import { createAccountsApi } from './lib/accounts.mjs';
import { createPvPRoomsApi } from './lib/pvpRooms.mjs';
import { createDungeonDuoRoomsApi } from './lib/dungeonDuoRooms.mjs';
import { createBattleInvitesApi } from './lib/battleInvites.mjs';
import { createDungeonInvitesApi } from './lib/dungeonInvites.mjs';
import { createFriendExchangesApi } from './lib/friendExchanges.mjs';
import { createGameAccountsApi } from './lib/gameAccounts.mjs';
import { createHttpHelpers } from './lib/httpUtil.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.FRIENDS_DATA_DIR || join(__dirname, 'data', 'friends-store');
const PVP_DIR = join(DATA_DIR, 'pvp-rooms');
const DUNGEON_DUO_DIR = join(DATA_DIR, 'dungeon-duo-rooms');
const PORT = Number(process.env.PORT || 8790);
const startedAt = Date.now();

const CORS_ORIGINS = (process.env.FRIENDS_CORS || '*').split(',').map(s => s.trim()).filter(Boolean);
const { corsHeaders, json, readJsonBody } = createHttpHelpers(CORS_ORIGINS);
const accounts = createAccountsApi(DATA_DIR);
const pvp = createPvPRoomsApi(PVP_DIR);
const dungeonDuo = createDungeonDuoRoomsApi(DUNGEON_DUO_DIR);
const battleInvites = createBattleInvitesApi(DATA_DIR, pvp, accounts);
const dungeonInvites = createDungeonInvitesApi(DATA_DIR, dungeonDuo, accounts);
const friendExchanges = createFriendExchangesApi(DATA_DIR, accounts);
const gameAccounts = createGameAccountsApi(DATA_DIR);

async function requireAuth(req, res, origin) {
    const { playerId, syncToken } = accounts.pickAuth(req);
    const account = await accounts.loadAccount(playerId);
    if (!account || !account.syncToken || account.syncToken !== syncToken) {
        json(res, 401, { ok: false, error: 'unauthorized' }, origin);
        return null;
    }
    return account;
}

async function requireGameAccount(req, res, origin) {
    const ctx = await gameAccounts.requireAccount(req);
    if (!ctx) {
        json(res, 401, { ok: false, error: 'unauthorized', message: 'Войдите в аккаунт' }, origin);
        return null;
    }
    return ctx;
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
            json(res, 200, {
                ok: true,
                service: 'etheria-api',
                version: 2,
                uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
                features: { dungeonDuo: true, pvp: true }
            }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/sync') {
            const body = await readJsonBody(req);
            const auth = accounts.pickAuth(req);
            let account = auth.playerId ? await accounts.loadAccount(auth.playerId) : null;

            if (account) {
                if (!auth.syncToken || account.syncToken !== auth.syncToken) {
                    json(res, 401, { ok: false, error: 'unauthorized' }, origin);
                    return;
                }
            } else {
                const playerId = accounts.newPlayerId();
                const syncToken = accounts.newSyncToken();
                const friendCode = await accounts.allocateFriendCode(playerId);
                account = {
                    playerId,
                    syncToken,
                    friendCode,
                    createdAt: Date.now(),
                    updatedAt: 0,
                    profile: null
                };
            }

            const profile = accounts.sanitizeProfile(body.profile);
            if (!profile) {
                json(res, 400, { ok: false, error: 'invalid_profile' }, origin);
                return;
            }
            if (!account.friendCode) {
                account.friendCode = await accounts.allocateFriendCode(account.playerId);
            }
            account.profile = profile;
            account.updatedAt = Date.now();
            accounts.saveAccount(account);

            json(res, 200, {
                ok: true,
                playerId: account.playerId,
                syncToken: account.syncToken,
                friendCode: account.friendCode,
                updatedAt: account.updatedAt
            }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/time') {
            // MSK time (UTC+3) for Wheel of Fortune
            const now = Date.now();
            const mskOffset = 3 * 60 * 60 * 1000; // UTC+3
            const mskNow = now + mskOffset;
            json(res, 200, {
                ok: true,
                serverTime: now,
                mskTime: mskNow,
                mskOffset: 3,
                timestamp: new Date(now).toISOString()
            }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/v1/profile/')) {
            const playerId = accounts.sanitizeId(url.pathname.split('/').pop());
            const snap = await accounts.loadPublicSnapshot(playerId);
            if (!snap) {
                json(res, 404, { ok: false, error: 'not_found' }, origin);
                return;
            }
            json(res, 200, { ok: true, ...snap }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname.startsWith('/api/v1/code/')) {
            const code = String(url.pathname.split('/').pop() || '').toUpperCase();
            const mapping = await accounts.readCode(code);
            if (!mapping || !mapping.playerId) {
                json(res, 404, { ok: false, error: 'code_not_found' }, origin);
                return;
            }
            const snap = await accounts.loadPublicSnapshot(mapping.playerId);
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
            const mapping = await accounts.readCode(code);
            if (!mapping || !mapping.playerId) {
                json(res, 404, { ok: false, error: 'code_not_found' }, origin);
                return;
            }
            if (mapping.playerId === account.playerId) {
                json(res, 400, { ok: false, error: 'self_friend' }, origin);
                return;
            }
            await accounts.addFriendLink(account.playerId, mapping.playerId);
            await accounts.addFriendLink(mapping.playerId, account.playerId);
            const friend = await accounts.loadPublicSnapshot(mapping.playerId);
            json(res, 200, { ok: true, friend }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/friends') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const ids = await accounts.getFriendIds(account.playerId);
            const friends = [];
            for (const id of ids) {
                const snap = await accounts.loadPublicSnapshot(id);
                if (snap) friends.push(snap);
            }
            friends.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            json(res, 200, { ok: true, friends }, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/auth/register') {
            const body = await readJsonBody(req);
            const result = await gameAccounts.register(body);
            if (result.error) {
                json(res, result.status || 400, {
                    ok: false,
                    error: result.error,
                    message: result.message || result.error
                }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
            const body = await readJsonBody(req);
            const result = await gameAccounts.login(body);
            if (result.error) {
                json(res, result.status || 400, {
                    ok: false,
                    error: result.error,
                    message: result.message || result.error
                }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
            const token = gameAccounts.pickAccountToken(req);
            await gameAccounts.logout(token);
            json(res, 200, { ok: true }, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const result = await gameAccounts.me(ctx);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/characters') {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const result = await gameAccounts.listCharacters(ctx);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/characters') {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const body = await readJsonBody(req);
            const result = await gameAccounts.createCharacter(ctx, body);
            if (result.error) {
                json(res, result.status || 400, {
                    ok: false,
                    error: result.error,
                    message: result.message || result.error
                }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const charGetMatch = url.pathname.match(/^\/api\/v1\/characters\/([a-zA-Z0-9_]+)$/);
        if (req.method === 'GET' && charGetMatch) {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const result = await gameAccounts.getCharacter(ctx, charGetMatch[1]);
            if (result.error) {
                json(res, result.status || 404, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'PUT' && charGetMatch) {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const body = await readJsonBody(req);
            const result = await gameAccounts.saveCharacter(ctx, charGetMatch[1], body);
            if (result.error) {
                json(res, result.status || 400, {
                    ok: false,
                    error: result.error,
                    message: result.message || result.error
                }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'DELETE' && charGetMatch) {
            const ctx = await requireGameAccount(req, res, origin);
            if (!ctx) return;
            const result = await gameAccounts.deleteCharacter(ctx, charGetMatch[1]);
            if (result.error) {
                json(res, result.status || 404, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/pvp/invite') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const toPlayerId = accounts.sanitizeId(body.toPlayerId);
            const result = await battleInvites.createInvite(account, toPlayerId, body.snapshot);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const inviteRespondMatch = url.pathname.match(/^\/api\/v1\/pvp\/invite\/([a-zA-Z0-9_]+)\/respond$/);
        if (req.method === 'POST' && inviteRespondMatch) {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const accept = !!(body && body.accept);
            const result = await battleInvites.respondInvite(
                account.playerId,
                inviteRespondMatch[1],
                accept
            );
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/pvp/invites/poll') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const since = url.searchParams.get('since') || '0';
            const waitMs = Math.max(0, parseInt(url.searchParams.get('wait') || '0', 10) || 0);
            const result = await battleInvites.pollInvites(account.playerId, since, waitMs);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/dungeon-duo/invite') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const toPlayerId = accounts.sanitizeId(body.toPlayerId);
            const result = await dungeonInvites.createInvite(
                account,
                toPlayerId,
                body.dungeonId,
                body.dungeonName,
                body.snapshot
            );
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error, message: result.message }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const dungeonInviteRespondMatch = url.pathname.match(/^\/api\/v1\/dungeon-duo\/invite\/([a-zA-Z0-9_]+)\/respond$/);
        if (req.method === 'POST' && dungeonInviteRespondMatch) {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const accept = !!(body && body.accept);
            const result = await dungeonInvites.respondInvite(
                account.playerId,
                dungeonInviteRespondMatch[1],
                accept
            );
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/dungeon-duo/invites/poll') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const since = url.searchParams.get('since') || '0';
            const waitMs = Math.max(0, parseInt(url.searchParams.get('wait') || '0', 10) || 0);
            const result = await dungeonInvites.pollInvites(account.playerId, since, waitMs);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/exchanges') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const result = await friendExchanges.listOffers(account.playerId);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/exchanges/send') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const result = await friendExchanges.sendOffer(account, body.toPlayerId, body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error, message: result.message }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const exchangeRespondMatch = url.pathname.match(/^\/api\/v1\/exchanges\/([a-zA-Z0-9_]+)\/respond$/);
        if (req.method === 'POST' && exchangeRespondMatch) {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const body = await readJsonBody(req);
            const result = await friendExchanges.respondOffer(
                account.playerId,
                exchangeRespondMatch[1],
                !!(body && body.accept)
            );
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error, message: result.message }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'GET' && url.pathname === '/api/v1/exchanges/poll') {
            const account = await requireAuth(req, res, origin);
            if (!account) return;
            const since = url.searchParams.get('since') || '0';
            const waitMs = Math.max(0, parseInt(url.searchParams.get('wait') || '0', 10) || 0);
            const result = await friendExchanges.pollExchanges(account.playerId, since, waitMs);
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/pvp/room/create') {
            const body = await readJsonBody(req);
            const result = await pvp.createRoom(body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/pvp/room/join') {
            const body = await readJsonBody(req);
            const result = await pvp.joinRoom(body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const pvpEventMatch = url.pathname.match(/^\/api\/v1\/pvp\/room\/([A-Z0-9]+)\/event$/i);
        if (req.method === 'POST' && pvpEventMatch) {
            const body = await readJsonBody(req);
            const result = await pvp.postEvent(pvpEventMatch[1], body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const pvpPollMatch = url.pathname.match(/^\/api\/v1\/pvp\/room\/([A-Z0-9]+)\/poll$/i);
        if (req.method === 'GET' && pvpPollMatch) {
            const sessionId = String(url.searchParams.get('sessionId') || '').slice(0, 64);
            const since = Math.max(0, parseInt(url.searchParams.get('since') || '0', 10) || 0);
            const waitMs = Math.max(0, parseInt(url.searchParams.get('wait') || '0', 10) || 0);
            const result = await pvp.poll(pvpPollMatch[1], sessionId, since, waitMs);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/dungeon-duo/room/create') {
            const body = await readJsonBody(req);
            const result = await dungeonDuo.createRoom(body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        if (req.method === 'POST' && url.pathname === '/api/v1/dungeon-duo/room/join') {
            const body = await readJsonBody(req);
            const result = await dungeonDuo.joinRoom(body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const dduoEventMatch = url.pathname.match(/^\/api\/v1\/dungeon-duo\/room\/([A-Z0-9]+)\/event$/i);
        if (req.method === 'POST' && dduoEventMatch) {
            const body = await readJsonBody(req);
            const result = await dungeonDuo.postEvent(dduoEventMatch[1], body);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        const dduoPollMatch = url.pathname.match(/^\/api\/v1\/dungeon-duo\/room\/([A-Z0-9]+)\/poll$/i);
        if (req.method === 'GET' && dduoPollMatch) {
            const sessionId = String(url.searchParams.get('sessionId') || '').slice(0, 64);
            const since = Math.max(0, parseInt(url.searchParams.get('since') || '0', 10) || 0);
            const waitMs = Math.max(0, parseInt(url.searchParams.get('wait') || '0', 10) || 0);
            const result = await dungeonDuo.poll(dduoPollMatch[1], sessionId, since, waitMs);
            if (result.error) {
                json(res, result.status || 400, { ok: false, error: result.error }, origin);
                return;
            }
            json(res, 200, result, origin);
            return;
        }

        json(res, 404, { ok: false, error: 'not_found' }, origin);
    } catch (err) {
        const code = err.message === 'body_too_large' ? 413 : 500;
        json(res, code, { ok: false, error: err.message || 'server_error' }, origin);
    }
});

process.on('SIGTERM', async () => {
    await flushAll();
    process.exit(0);
});

await ensureDir(DATA_DIR);
await mkdir(PVP_DIR, { recursive: true });
await mkdir(DUNGEON_DUO_DIR, { recursive: true });
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[etheria-api] http://0.0.0.0:${PORT} v2 (cache+longpoll)`);
});
