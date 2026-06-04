import fs from 'fs';
import vm from 'vm';

const core = fs.readFileSync('js/core/battle/battleCore.js', 'utf8');
const damage = fs.readFileSync('js/core/battle/battleDamage.js', 'utf8');
const enemies = fs.readFileSync('js/core/battle/battleEnemies.js', 'utf8');
const end = fs.readFileSync('js/core/battle/battleEnd.js', 'utf8');

const ctx = {
    console,
    window: {},
    player: {
        class: 'Воин',
        level: 10,
        health: 50,
        maxHealth: 100,
        mana: 0,
        maxMana: 0,
        gold: 100,
        experience: 50,
        abilities: [],
        temporaryEffects: [],
        attack: 20,
        defense: 10,
        dodgeChance: 0,
        criticalChance: 0,
        criticalDamage: 150
    },
    currentMonster: { name: 'Slime', health: 100, maxHealth: 100, attack: 5000, defense: 0, effects: [], activeBuffs: {} },
    battleLogEntries: [],
    isPlayerTurn: false,
    originalMonsterStats: { attack: 5000, defense: 0 },
    monsterAbilityCooldowns: {},
    deathSaveActive: false,
    reviveUsed: false,
    rageStack: 0,
    globalBattleTurn: 0,
    specialBattleRewardClaimed: false,
    addBattleLog: (msg) => ctx.battleLogEntries.push(msg),
    saveGame: () => {},
    renderGame: () => { ctx._rendered = true; },
    showModal: () => {},
    clearBattleZoneState: () => { ctx._cleared = true; },
    document: { body: { classList: { remove: () => {} } }, getElementById: () => null }
};
ctx.window = ctx;

vm.runInNewContext(core + '\n' + damage + '\n' + enemies + '\n' + end, ctx, { filename: 'battle-hp-turn-test.js' });

const applyDamageToPlayer = ctx.applyDamageToPlayer;
const tryVictoryAfterEnemyDown = ctx.tryVictoryAfterEnemyDown;

ctx.gameOver = function () {
    ctx._defeated = true;
    ctx.player.health = 0;
    ctx.currentMonster = null;
    ctx.window._monsterTurnBusy = false;
};

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

applyDamageToPlayer(30);
assert(ctx.player.health === 20, 'partial damage, got ' + ctx.player.health);
applyDamageToPlayer(9999);
assert(ctx.player.health === 0, 'HP clamped to 0, got ' + ctx.player.health);
assert(ctx._defeated === true, 'defeat handler ran');
assert(ctx.window._monsterTurnBusy === false, 'busy cleared on defeat');

vm.runInNewContext(
    'currentMonster = { name: "Slime", health: 0, maxHealth: 100, attack: 10, defense: 0, exp: 10, goldMult: 10, effects: [], activeBuffs: {} };' +
    'window._monsterTurnBusy = true;' +
    'var cont = tryVictoryAfterEnemyDown();' +
    'if (cont !== false) throw new Error("victory should return false");' +
    'if (window._monsterTurnBusy !== false) throw new Error("busy not cleared on victory");',
    ctx,
    { filename: 'battle-victory-busy-test.js' }
);

console.log('test-battle-hp-turn: OK');
