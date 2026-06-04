const fs = require('fs');
const vm = require('vm');

const core = fs.readFileSync('js/core/battle/battleCore.js', 'utf8');
const zone = fs.readFileSync('js/core/battle/battleZone.js', 'utf8');

const ctx = {
    console,
    player: { class: 'Воин', level: 5, location: 'Сумеречный лес', gold: 100, experience: 50, health: 100, maxHealth: 100, abilities: [], temporaryEffects: [] },
    LOCATIONS: [{ name: 'Сумеречный лес', minLvl: 1, goldMult: 1, monsters: [{ name: 'Слайм', hp: 50, atk: 10, def: 2, exp: 20, icon: '🟢' }] }],
    currentMonster: null,
    battleLogEntries: [],
    isPlayerTurn: true,
    originalMonsterStats: { attack: 0, defense: 0 },
    stopGathering: () => {},
    flushPendingCraft: () => {},
    prepareBattleState: () => { ctx.battleLogEntries = []; },
    setupBattleMonster: (m, s, g) => {
        ctx.currentMonster = { name: m.name, health: 50, maxHealth: 50, attack: 10, defense: 2, exp: 20, returnTo: '' };
    },
    renderBattle: () => { ctx._rendered = true; },
    renderBattleStaging: () => { ctx._staged = true; },
    renderGame: () => {},
    addMessage: () => {},
    saveGame: () => {},
    document: { body: { classList: { toggle: () => {} } }, getElementById: () => null }
};
ctx.window = ctx;

vm.runInNewContext(core + '\n' + zone, ctx, { filename: 'battle-zone-test.js' });

function assert(c, m) { if (!c) throw new Error(m); }

ctx.enterBattleZone();
assert(ctx.isBattleZoneStaging(), 'staging after enter');
assert(!ctx.currentMonster, 'no monster until commit');
assert(ctx._staged, 'staging UI rendered');

ctx.commitBattleStart();
assert(ctx.isBattleEngaged(), 'engaged after commit');
assert(ctx._rendered, 'battle UI rendered');

ctx.clearBattleZoneState();
assert(!ctx.isBattleZoneStaging() && !ctx.isBattleEngaged(), 'cleared');

console.log('test-battle-zone: OK');
