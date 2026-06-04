/**
 * Smoke-test friend gift/trade exchange API (npm run start:friends).
 */
const base = (process.env.FRIENDS_TEST_URL || 'http://localhost:8790').replace(/\/+$/, '');

async function req(path, opts) {
    const res = await fetch(base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + JSON.stringify(data));
    return data;
}

async function main() {
    await req('/health');

    const sync1 = await req('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            profile: { name: 'Обмен А', class: 'Маг', branch: 'Огонь', level: 3, stats: { maxHealth: 80, health: 80 }, equipment: {} }
        })
    });
    const sync2 = await req('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            profile: { name: 'Обмен Б', class: 'Воин', branch: 'Ярость', level: 2, stats: { maxHealth: 100, health: 100 }, equipment: {} }
        })
    });

    await req('/api/v1/friends/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-Id': sync2.playerId,
            'X-Sync-Token': sync2.syncToken
        },
        body: JSON.stringify({ friendCode: sync1.friendCode })
    });

    const h1 = {
        'Content-Type': 'application/json',
        'X-Player-Id': sync1.playerId,
        'X-Sync-Token': sync1.syncToken
    };
    const h2 = {
        'Content-Type': 'application/json',
        'X-Player-Id': sync2.playerId,
        'X-Sync-Token': sync2.syncToken
    };

    const sent = await req('/api/v1/exchanges/send', {
        method: 'POST',
        headers: h1,
        body: JSON.stringify({
            toPlayerId: sync2.playerId,
            kind: 'gift',
            fromOffer: { gold: 50, items: [] },
            toOffer: { gold: 0, items: [] }
        })
    });
    if (!sent.offerId) throw new Error('missing offerId');

    const list2 = await req('/api/v1/exchanges', { headers: h2 });
    const incoming = (list2.offers || []).find(o => o.offerId === sent.offerId && o.role === 'incoming');
    if (!incoming) throw new Error('incoming not in list');

    const accepted = await req('/api/v1/exchanges/' + sent.offerId + '/respond', {
        method: 'POST',
        headers: h2,
        body: JSON.stringify({ accept: true })
    });
    if (!accepted.accepted) throw new Error('not accepted');

    const listAfter = await req('/api/v1/exchanges', { headers: h2 });
    const still = (listAfter.offers || []).find(o => o.offerId === sent.offerId);
    if (still) throw new Error('offer still pending after accept');

    console.log('test-friend-exchange-api: ok');
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
