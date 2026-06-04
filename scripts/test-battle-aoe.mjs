import fs from 'fs';
import vm from 'vm';

const damage = fs.readFileSync('js/core/battle/battleDamage.js', 'utf8');
const enemies = fs.readFileSync('js/core/battle/battleEnemies.js', 'utf8');
const targets = fs.readFileSync('js/core/battle/battleTargets.js', 'utf8');

const ctx = {
    console,
    window: {},
    player: { class: 'Маг', branch: 'Огонь' },
    currentMonster: null,
    ABILITIES_DB: undefined,
    document: {
        getElementById: () => null,
        addEventListener: () => {},
        querySelectorAll: () => []
    }
};
ctx.window = ctx;

vm.runInNewContext(damage + '\n' + enemies + '\n' + targets, ctx, { filename: 'battle-aoe-test.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const aoeAbility = { name: 'Огненный взрыв', aoe: true, dmg: 120 };
assert(
    ctx.getBattleAbilityTargeting(aoeAbility) === 'all_enemies',
    'aoe ability should target all_enemies'
);

const pack = [
    { name: 'A', health: 80, maxHealth: 100, defense: 10, armorShred: 0, effects: [], damageAmp: 1 },
    { name: 'B', health: 90, maxHealth: 100, defense: 20, armorShred: 0, effects: [], damageAmp: 1 },
    { name: 'C', health: 0, maxHealth: 100, defense: 5, armorShred: 0, effects: [], damageAmp: 1 }
];
ctx.setBattleEnemies(pack);
ctx.syncCurrentMonsterFromFocus();

const hitNames = [];
ctx.forEachLivingBattleEnemy(function (m) {
    hitNames.push(m.name);
});
assert(hitNames.length === 2, 'should hit 2 living enemies, got ' + hitNames.length);
assert(hitNames.indexOf('A') >= 0 && hitNames.indexOf('B') >= 0, 'living enemies A and B');

console.log('test-battle-aoe: OK');
