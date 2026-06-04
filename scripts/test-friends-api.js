/**
 * Smoke-test friends API (server must be running: npm run start:friends).
 */
const base = (process.env.FRIENDS_TEST_URL || 'http://localhost:8790').replace(/\/+$/, '');

async function req(path, opts) {
    const res = await fetch(base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + JSON.stringify(data));
    return data;
}

async function main() {
    const health = await req('/health');
    if (!health.ok) throw new Error('health failed');

    const sync1 = await req('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            profile: {
                name: 'Тест А',
                class: 'Маг',
                branch: 'Школа Огня',
                level: 5,
                stats: { maxHealth: 100, health: 80, attack: 20, defense: 5 },
                equipment: { weapon: { name: 'Посох', icon: '🪄', rarity: 'Обычный' } }
            }
        })
    });
    if (!sync1.friendCode || !sync1.playerId) throw new Error('sync1 missing ids');

    const sync2 = await req('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            profile: {
                name: 'Тест Б',
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

    const list = await req('/api/v1/friends', {
        headers: {
            'X-Player-Id': sync2.playerId,
            'X-Sync-Token': sync2.syncToken
        }
    });
    if (!list.friends || list.friends.length !== 1) throw new Error('friends list expected 1');
    if (list.friends[0].profile.name !== 'Тест А') throw new Error('wrong friend profile');

    const dInvite = await req('/api/v1/dungeon-duo/invite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-Id': sync1.playerId,
            'X-Sync-Token': sync1.syncToken
        },
        body: JSON.stringify({
            toPlayerId: sync2.playerId,
            dungeonId: 'frozen_pass',
            dungeonName: 'Ледяной проход',
            snapshot: { name: 'Тест А', level: 5 }
        })
    });
    if (!dInvite.roomCode || !dInvite.sessionId) throw new Error('dungeon invite missing room');

    const dPoll = await req(
        '/api/v1/dungeon-duo/invites/poll?since=0&wait=0',
        {
            headers: {
                'X-Player-Id': sync2.playerId,
                'X-Sync-Token': sync2.syncToken
            }
        }
    );
    if (!dPoll.invite || dPoll.invite.dungeonId !== 'frozen_pass') throw new Error('dungeon poll invite');

    const dAccept = await req('/api/v1/dungeon-duo/invite/' + dPoll.invite.inviteId + '/respond', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Player-Id': sync2.playerId,
            'X-Sync-Token': sync2.syncToken
        },
        body: JSON.stringify({ accept: true })
    });
    if (!dAccept.roomCode) throw new Error('dungeon accept missing roomCode');

    console.log('test-friends-api: ok');
}

main().catch(err => {
    console.error('test-friends-api:', err.message);
    process.exit(1);
});
