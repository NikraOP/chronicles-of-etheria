/**
 * Smoke test: dungeon-duo cloud API (needs friends-api running on :8790).
 * node scripts/test-dungeon-duo-cloud-api.js
 */
const base = (process.env.ETHERIA_API || 'http://localhost:8790').replace(/\/+$/, '');

async function req(path, opts) {
    const res = await fetch(base + path, {
        method: opts?.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: opts?.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || res.status);
    return data;
}

const snap = { name: 'Test', class: 'Маг', branch: 'Огонь', level: 20 };
const created = await req('/api/v1/dungeon-duo/room/create', {
    method: 'POST',
    body: { dungeonId: 'infernal_pit', snapshot: snap }
});
const joined = await req('/api/v1/dungeon-duo/room/join', {
    method: 'POST',
    body: { roomCode: created.roomCode, snapshot: { name: 'Guest', class: 'Воин', level: 18 } }
});
await req('/api/v1/dungeon-duo/room/' + created.roomCode + '/event', {
    method: 'POST',
    body: { sessionId: created.sessionId, type: 'lobby_ready', payload: { ready: true, dungeonId: 'infernal_pit', snapshot: snap } }
});
const poll = await req(
    '/api/v1/dungeon-duo/room/' + created.roomCode + '/poll?sessionId=' + joined.sessionId + '&since=0&wait=1'
);
if (!poll.events || !poll.events.length) throw new Error('expected lobby_ready event');
console.log('OK dungeon-duo cloud', created.roomCode);
