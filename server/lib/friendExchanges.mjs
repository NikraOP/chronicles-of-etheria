import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readJsonFile, setJsonMemory } from './jsonFile.mjs';

const OFFER_TTL_MS = Number(process.env.ETHERIA_EXCHANGE_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const POLL_WAIT_MAX_MS = Number(process.env.ETHERIA_EXCHANGE_POLL_WAIT_MS || 25000);
const POLL_TICK_MS = 150;
const MAX_PENDING = 15;
const MAX_ITEMS = 25;
const MAX_GOLD = 999999999;
const MAX_BODY_ITEMS_BYTES = 120000;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function computeChecksum(core) {
    const str = JSON.stringify(core);
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return 'x' + (h >>> 0).toString(16);
}

export function createFriendExchangesApi(dataDir, accountsApi) {
    function boxPath(playerId) {
        return join(dataDir, 'exchange_box_' + accountsApi.sanitizeId(playerId) + '.json');
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

    async function loadBox(playerId) {
        const box = await readJsonFile(boxPath(playerId), { seq: 0, offers: [], events: [] });
        if (!box || typeof box !== 'object') return { seq: 0, offers: [], events: [] };
        if (!Number.isFinite(box.seq)) box.seq = 0;
        if (!Array.isArray(box.offers)) box.offers = [];
        if (!Array.isArray(box.events)) box.events = [];
        return box;
    }

    function saveBox(playerId, box) {
        setJsonMemory(boxPath(playerId), box);
    }

    function pruneOffers(offers) {
        const now = Date.now();
        return offers.filter(o => {
            if (!o || o.status !== 'pending') return false;
            if (o.expiresAt && now > o.expiresAt) return false;
            return true;
        });
    }

    function validatePayload(payload, label) {
        if (!payload || typeof payload !== 'object') {
            return { error: 'invalid_payload', message: 'Некорректное предложение: ' + label };
        }
        const gold = Math.floor(Number(payload.gold) || 0);
        if (gold < 0 || gold > MAX_GOLD) {
            return { error: 'invalid_gold', message: 'Некорректное золото' };
        }
        const items = payload.items;
        if (!Array.isArray(items)) {
            return { error: 'invalid_items', message: 'Некорректный список предметов' };
        }
        if (items.length > MAX_ITEMS) {
            return { error: 'too_many_items', message: 'Слишком много предметов (макс. ' + MAX_ITEMS + ')' };
        }
        let raw;
        try {
            raw = JSON.stringify(items);
        } catch {
            return { error: 'invalid_items' };
        }
        if (raw.length > MAX_BODY_ITEMS_BYTES) {
            return { error: 'payload_too_large', message: 'Слишком большой обмен' };
        }
        for (const row of items) {
            if (!row || !row.item || typeof row.item !== 'object') {
                return { error: 'invalid_item', message: 'Битый предмет в обмене' };
            }
            if (!row.item.name) {
                return { error: 'invalid_item', message: 'У предмета нет названия' };
            }
            const invType = String(row.invType || 'potions').slice(0, 32);
            row.invType = invType;
        }
        return { ok: true, payload: { gold, items: JSON.parse(JSON.stringify(items)) } };
    }

    function summarizeOffer(o) {
        return {
            offerId: o.offerId,
            kind: o.kind,
            status: o.status,
            fromPlayerId: o.fromPlayerId,
            fromName: o.fromName,
            toPlayerId: o.toPlayerId,
            toName: o.toName,
            fromOffer: o.fromOffer,
            toOffer: o.toOffer,
            createdAt: o.createdAt,
            expiresAt: o.expiresAt,
            role: o.role
        };
    }

    function pushEvent(box, event) {
        box.seq = (box.seq || 0) + 1;
        event._seq = box.seq;
        box.events.push(event);
        if (box.events.length > 30) box.events = box.events.slice(-30);
    }

    return {
        async listOffers(playerId) {
            const box = await loadBox(playerId);
            box.offers = pruneOffers(box.offers);
            saveBox(playerId, box);
            const list = box.offers.map(summarizeOffer);
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            return { ok: true, offers: list, seq: box.seq };
        },

        async sendOffer(fromAccount, toPlayerId, body) {
            const toId = accountsApi.sanitizeId(toPlayerId);
            if (!toId || toId === fromAccount.playerId) {
                return { error: 'invalid_target', status: 400 };
            }
            const friendIds = await accountsApi.getFriendIds(fromAccount.playerId);
            if (!friendIds.includes(toId)) {
                return { error: 'not_friend', status: 403, message: 'Можно обмениваться только с друзьями' };
            }

            const kind = body && body.kind === 'trade' ? 'trade' : 'gift';
            const fromV = validatePayload(body && body.fromOffer, 'отдаёте');
            if (fromV.error) return fromV;
            let toPayload = { gold: 0, items: [] };
            if (kind === 'trade') {
                const toV = validatePayload(body && body.toOffer, 'хотите получить');
                if (toV.error) return toV;
                toPayload = toV.payload;
                if (toPayload.gold === 0 && toPayload.items.length === 0) {
                    return { error: 'empty_request', status: 400, message: 'Укажите, что хотите получить в обмен' };
                }
            }
            const fromPayload = fromV.payload;
            if (fromPayload.gold === 0 && fromPayload.items.length === 0) {
                return { error: 'empty_offer', status: 400, message: 'Добавьте золото или предметы' };
            }

            const fromBox = await loadBox(fromAccount.playerId);
            const toBox = await loadBox(toId);
            fromBox.offers = pruneOffers(fromBox.offers);
            toBox.offers = pruneOffers(toBox.offers);

            const pendingFrom = fromBox.offers.filter(o => o.status === 'pending').length;
            const pendingTo = toBox.offers.filter(o => o.status === 'pending' && o.role === 'incoming').length;
            if (pendingFrom >= MAX_PENDING || pendingTo >= MAX_PENDING) {
                return { error: 'exchange_limit', status: 400, message: 'Слишком много активных обменов' };
            }

            const toSnap = await accountsApi.loadPublicSnapshot(toId);
            const fromName = (fromAccount.profile && fromAccount.profile.name) || 'Игрок';
            const toName = (toSnap && toSnap.profile && toSnap.profile.name) || 'Игрок';
            const now = Date.now();
            const offerId = 'ex_' + randomBytes(8).toString('hex');
            const core = {
                offerId,
                kind,
                fromOffer: fromPayload,
                toOffer: toPayload,
                createdAt: now
            };
            const checksum = computeChecksum(core);

            const base = {
                offerId,
                kind,
                status: 'pending',
                fromPlayerId: fromAccount.playerId,
                fromName: String(fromName).slice(0, 40),
                toPlayerId: toId,
                toName: String(toName).slice(0, 40),
                fromOffer: fromPayload,
                toOffer: toPayload,
                createdAt: now,
                expiresAt: now + OFFER_TTL_MS,
                checksum
            };

            fromBox.offers.push(Object.assign({}, base, { role: 'outgoing' }));
            toBox.offers.push(Object.assign({}, base, { role: 'incoming' }));
            fromBox.seq = (fromBox.seq || 0) + 1;
            toBox.seq = (toBox.seq || 0) + 1;
            saveBox(fromAccount.playerId, fromBox);
            saveBox(toId, toBox);
            notify(toId);
            notify(fromAccount.playerId);

            return { ok: true, offerId, offer: summarizeOffer(Object.assign({}, base, { role: 'outgoing' })) };
        },

        async respondOffer(playerId, offerId, accept) {
            const id = String(offerId || '').slice(0, 64);
            const box = await loadBox(playerId);
            box.offers = pruneOffers(box.offers);
            const idx = box.offers.findIndex(
                o => o.offerId === id && o.role === 'incoming' && o.status === 'pending'
            );
            if (idx < 0) {
                return { error: 'offer_not_found', status: 404, message: 'Обмен не найден или уже обработан' };
            }
            const incoming = box.offers[idx];
            const fromId = incoming.fromPlayerId;
            const fromBox = await loadBox(fromId);
            fromBox.offers = pruneOffers(fromBox.offers);
            const outIdx = fromBox.offers.findIndex(
                o => o.offerId === id && o.role === 'outgoing' && o.status === 'pending'
            );

            const status = accept ? 'accepted' : 'declined';
            incoming.status = status;
            if (outIdx >= 0) fromBox.offers[outIdx].status = status;

            box.offers.splice(idx, 1);
            if (outIdx >= 0) fromBox.offers.splice(outIdx, 1);

            const resolved = summarizeOffer(incoming);
            resolved.status = status;

            if (accept) {
                pushEvent(fromBox, { type: 'exchange_accepted', offer: resolved, at: Date.now() });
            } else {
                pushEvent(fromBox, { type: 'exchange_declined', offer: resolved, at: Date.now() });
            }
            pushEvent(box, { type: 'exchange_resolved', offer: resolved, at: Date.now() });

            box.seq = (box.seq || 0) + 1;
            fromBox.seq = (fromBox.seq || 0) + 1;
            saveBox(playerId, box);
            saveBox(fromId, fromBox);
            notify(fromId);
            notify(playerId);

            return {
                ok: true,
                accepted: !!accept,
                offer: resolved
            };
        },

        async pollExchanges(playerId, since, waitMs) {
            const sinceSeq = Math.max(0, parseInt(String(since || '0'), 10) || 0);
            const deadline = Date.now() + Math.min(Math.max(0, waitMs), POLL_WAIT_MAX_MS);

            while (true) {
                const box = await loadBox(playerId);
                box.offers = pruneOffers(box.offers);
                const incoming = box.offers.find(o => o.role === 'incoming' && o.status === 'pending');
                const event = box.events
                    .filter(e => (e._seq || 0) > sinceSeq)
                    .sort((a, b) => (a._seq || 0) - (b._seq || 0))[0];
                if (incoming && box.seq > sinceSeq) {
                    return { ok: true, seq: box.seq, incoming: summarizeOffer(incoming), event: null };
                }
                if (event) {
                    const ackSeq = event._seq || 0;
                    box.events = box.events.filter(e => (e._seq || 0) > ackSeq);
                    saveBox(playerId, box);
                    return { ok: true, seq: box.seq, incoming: null, event: event };
                }
                if (Date.now() >= deadline) {
                    return { ok: true, seq: box.seq, incoming: null, event: null };
                }
                await waitOnce(playerId, Math.min(POLL_TICK_MS, deadline - Date.now()));
            }
        }
    };
}
