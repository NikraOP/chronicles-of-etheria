/**
 * Smoke-test PvP friend invite API (server: npm run start:friends).
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
            profile: {
                name: 'Вызов А',
                class: 'Маг',
                branch: 'Школа Огня',
                level: 5,
                stats: { maxHealth: 100, health: 80, attack: 20, defense: 5 },
                equipment: {}
            }
        })
    });

    const sync2 = await req('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            profile: {
                name: 'Вызов Б',
                class: 'Воин',
                branch: 'Школа Ярости',
                level: 3,
                stats: { maxHealth: 120, health: 120, attack: 18, defense: 10 },
                equipment: {}
            }
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

    const snap = {
        name: 'Вызов А',
        class: 'Маг',
        branch: 'Школа Огня',
        level: 5,
        maxHealth: 100,
        health: 100,
        attack: 20,
        defense: 5,
        dodgeChance: 5,
        criticalChance: 10,
        criticalDamage: 150
    };

    const invited = await req('/api/v1/pvp/invite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-Id': sync1.playerId,
            'X-Sync-Token': sync1.syncToken
        },
        body: JSON.stringify({ toPlayerId: sync2.playerId, snapshot: snap })
    });
    if (!invited.roomCode || !invited.inviteId) throw new Error('invite missing roomCode');

    const polled = await req(
        '/api/v1/pvp/invites/poll?since=0&wait=1',
        {
            headers: {
                'X-Player-Id': sync2.playerId,
                'X-Sync-Token': sync2.syncToken
            }
        }
    );
    if (!polled.invite || polled.invite.inviteId !== invited.inviteId) {
        throw new Error('poll did not return invite');
    }

    const accepted = await req('/api/v1/pvp/invite/' + invited.inviteId + '/respond', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-Id': sync2.playerId,
            'X-Sync-Token': sync2.syncToken
        },
        body: JSON.stringify({ accept: true })
    });
    if (!accepted.roomCode || accepted.roomCode !== invited.roomCode) {
        throw new Error('accept roomCode mismatch');
    }

    const joined = await req('/api/v1/pvp/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roomCode: accepted.roomCode,
            snapshot: { name: 'Вызов Б', class: 'Воин', maxHealth: 120, health: 120, attack: 18, defense: 10 }
        })
    });
    if (!joined.sessionId) throw new Error('guest join failed');

    console.log('test-pvp-invite-api: ok');
}

main().catch(err => {
    console.error('test-pvp-invite-api:', err.message);
    process.exit(1);
});
