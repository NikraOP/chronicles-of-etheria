/**
 * Smoke-test game account API.
 */
const base = (process.env.FRIENDS_TEST_URL || 'http://localhost:8790').replace(/\/+$/, '');

async function req(path, opts) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
    const res = await fetch(base + path, {
        method: (opts && opts.method) || 'GET',
        headers,
        body: opts && opts.body ? JSON.stringify(opts.body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + JSON.stringify(data));
    return data;
}

async function main() {
    const login = 'test_' + Date.now().toString(36).slice(-6);
    const pass = 'secret99';

    const reg = await req('/api/v1/auth/register', {
        method: 'POST',
        body: { login, password: pass, passwordConfirm: pass }
    });
    if (!reg.token) throw new Error('no token on register');

    const dup = await fetch(base + '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password: pass, passwordConfirm: pass })
    });
    if (dup.status !== 409) throw new Error('expected 409 duplicate login');

    const bad = await fetch(base + '/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'ab', password: pass, passwordConfirm: 'x' })
    });
    if (bad.status !== 400) throw new Error('expected 400 validation');

    const created = await req('/api/v1/characters', {
        method: 'POST',
        headers: { 'X-Account-Token': reg.token },
        body: {
            player: {
                name: 'Тестовый',
                class: 'Маг',
                branch: 'Школа Огня',
                level: 2,
                gold: 50,
                health: 80,
                maxHealth: 80,
                attack: 12,
                defense: 3,
                inventory: { weapons: [], helmets: [], chests: [], pants: [], boots: [], potions: [], manaPotions: [], foods: [], elixirs: [], scrolls: [], gatherScrolls: [], stones: [], rings: [], necklaces: [] },
                equipment: { weapon: null, helmet: null, chest: null, pants: null, boots: null, ring: null, necklace: null }
            }
        }
    });
    if (!created.character || !created.character.id) throw new Error('no character');

    const loaded = await req('/api/v1/characters/' + created.character.id, {
        headers: { 'X-Account-Token': reg.token }
    });
    if (!loaded.player || loaded.player.name !== 'Тестовый') throw new Error('load mismatch');

    const loginRes = await req('/api/v1/auth/login', {
        method: 'POST',
        body: { login, password: pass }
    });
    const list = await req('/api/v1/characters', {
        headers: { 'X-Account-Token': loginRes.token }
    });
    if (!list.characters || list.characters.length !== 1) throw new Error('list expected 1');

    console.log('test-game-account-api: ok');
}

main().catch(err => {
    console.error('test-game-account-api:', err.message);
    process.exit(1);
});
