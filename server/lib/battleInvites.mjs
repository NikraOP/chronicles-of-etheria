import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readJsonFile, setJsonMemory } from './jsonFile.mjs';

const INVITE_TTL_MS = Number(process.env.ETHERIA_INVITE_TTL_MS || 5 * 60 * 1000);
const POLL_WAIT_MAX_MS = Number(process.env.ETHERIA_INVITE_POLL_WAIT_MS || 25000);
const POLL_TICK_MS = 150;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

export function createBattleInvitesApi(dataDir, pvpApi, accountsApi) {
    function inboxPath(playerId) {
        return join(dataDir, 'invite_inbox_' + accountsApi.sanitizeId(playerId) + '.json');
    }

    const waiters = new Map();

    function notify(playerId) {
        const set = waiters.get(playerId);
        if (!set) return;
        set.forEach(resolve => resolve());
        set.clear();
    }

    function waitOnce(playerId, timeoutMs) {
        return new Promise(resolve => {
            let set = waiters.get(playerId);
            if (!set) {
                set = new Set();
                waiters.set(playerId, set);
            }
            const done = () => {
                set.delete(done);
                resolve();
            };
            set.add(done);
            setTimeout(done, timeoutMs);
        });
    }

    async function loadInbox(playerId) {
        const inbox = await readJsonFile(inboxPath(playerId), { seq: 0, pending: null });
        if (!inbox || typeof inbox !== 'object') return { seq: 0, pending: null };
        if (!Number.isFinite(inbox.seq)) inbox.seq = 0;
        return inbox;
    }

    function saveInbox(playerId, inbox) {
        setJsonMemory(inboxPath(playerId), inbox);
    }

    function pruneExpired(invite) {
        if (!invite) return null;
        if (invite.expiresAt && Date.now() > invite.expiresAt) return null;
        if (invite.status && invite.status !== 'pending') return null;
        return invite;
    }

    async function getPendingInvite(playerId) {
        const inbox = await loadInbox(playerId);
        const pending = pruneExpired(inbox.pending);
        if (!pending && inbox.pending) {
            inbox.pending = null;
            inbox.seq = (inbox.seq || 0) + 1;
            saveInbox(playerId, inbox);
        }
        return { inbox, pending };
    }

    return {
        async createInvite(fromAccount, toPlayerId, snapshot) {
            const toId = accountsApi.sanitizeId(toPlayerId);
            if (!toId || toId === fromAccount.playerId) {
                return { error: 'invalid_target', status: 400 };
            }
            const friendIds = await accountsApi.getFriendIds(fromAccount.playerId);
            if (!friendIds.includes(toId)) {
                return { error: 'not_friend', status: 403 };
            }

            const roomResult = await pvpApi.createRoom({ snapshot: snapshot || null });
            if (roomResult.error) return roomResult;

            const inviteId = 'inv_' + randomBytes(8).toString('hex');
            const fromName = (fromAccount.profile && fromAccount.profile.name) || 'Игрок';
            const fromClass = fromAccount.profile && fromAccount.profile.class
                ? String(fromAccount.profile.class) + (fromAccount.profile.branch
                    ? ' · ' + fromAccount.profile.branch
                    : '')
                : '';
            const invite = {
                inviteId,
                fromPlayerId: fromAccount.playerId,
                fromName: String(fromName).slice(0, 40),
                fromClass: String(fromClass).slice(0, 48),
                toPlayerId: toId,
                roomCode: roomResult.roomCode,
                status: 'pending',
                createdAt: Date.now(),
                expiresAt: Date.now() + INVITE_TTL_MS
            };

            const inbox = await loadInbox(toId);
            inbox.pending = invite;
            inbox.seq = (inbox.seq || 0) + 1;
            saveInbox(toId, inbox);
            notify(toId);

            return {
                ok: true,
                inviteId,
                roomCode: roomResult.roomCode,
                sessionId: roomResult.sessionId,
                role: 'host'
            };
        },

        async pollInvites(playerId, since, waitMs) {
            const sinceSeq = Math.max(0, parseInt(String(since || '0'), 10) || 0);
            const deadline = Date.now() + Math.min(Math.max(0, waitMs), POLL_WAIT_MAX_MS);

            while (true) {
                const { inbox, pending } = await getPendingInvite(playerId);
                if (inbox.seq > sinceSeq && pending) {
                    return { ok: true, seq: inbox.seq, invite: pending };
                }
                if (Date.now() >= deadline) {
                    return { ok: true, seq: inbox.seq, invite: null };
                }
                await waitOnce(playerId, Math.min(POLL_TICK_MS, deadline - Date.now()));
            }
        },

        async respondInvite(playerId, inviteId, accept) {
            const id = String(inviteId || '').slice(0, 64);
            const { inbox, pending } = await getPendingInvite(playerId);
            if (!pending || pending.inviteId !== id) {
                return { error: 'invite_not_found', status: 404 };
            }

            const roomCode = pending.roomCode;
            inbox.pending = null;
            inbox.seq = (inbox.seq || 0) + 1;
            saveInbox(playerId, inbox);
            notify(pending.fromPlayerId);
            if (!accept) return { ok: true, accepted: false };
            return { ok: true, accepted: true, roomCode };
        }
    };
}
