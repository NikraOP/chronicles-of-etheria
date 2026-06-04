/**
 * Smoke-test PvP cloud API (server: npm run start:friends).
 */
const base = (process.env.FRIENDS_TEST_URL || 'http://localhost:8790').replace(/\/+$/, '');

async function req(path, opts) {
    const res = await fetch(base + path, opts);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(path + ' ' + JSON.stringify(data));
    return data;
}

async function main() {
    const snap = {
        name: 'Host', class: 'Воин', branch: 'Школа Ярости', level: 10,
        maxHealth: 200, health: 200, attack: 30, defense: 10, dodgeChance: 5,
        abilities: []
    };
    const roomCode = 'T' + Date.now().toString(36).toUpperCase().slice(-5);
    const created = await req('/api/v1/pvp/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode, snapshot: snap })
    });
    if (!created.roomCode || !created.sessionId) throw new Error('create missing fields');

    const joined = await req('/api/v1/pvp/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roomCode: created.roomCode,
            snapshot: { name: 'Guest', class: 'Маг', branch: 'Школа Огня', level: 8, maxHealth: 150, health: 150, attack: 25, defense: 5, dodgeChance: 3, abilities: [] }
        })
    });

    await req('/api/v1/pvp/room/' + created.roomCode + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: created.sessionId,
            type: 'ready',
            payload: { ready: true, snapshot: snap }
        })
    });

    const poll = await req(
        '/api/v1/pvp/room/' + created.roomCode + '/poll?sessionId=' + joined.sessionId + '&since=0'
    );
    if (!poll.events || !poll.events.length) throw new Error('poll expected events');

    console.log('test-pvp-cloud-api: ok');
}

main().catch(err => {
    console.error('test-pvp-cloud-api:', err.message);
    process.exit(1);
});
