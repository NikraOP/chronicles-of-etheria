const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/core/battle/monsterAI.js', 'utf8');
const context = {
    console,
    currentMonster: {
        name: 'Тест-босс',
        health: 30,
        maxHealth: 100,
        activeBuffs: {}
    },
    player: {
        health: 80,
        maxHealth: 100,
        temporaryEffects: []
    },
    monsterAbilityCooldowns: {},
    getGlobalBattleTurn: () => 5
};
context.window = context;

vm.runInNewContext(source, context, { filename: 'js/core/battle/monsterAI.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

context.resetMonsterAiState();
context.recordPlayerActionForMonsterAi({
    name: 'Метеор',
    dmg: 90,
    cd: 5,
    effect: { type: 'Заморозка', dur: 2 }
});
const ctxThreat = context.buildMonsterAiContext();
assert(ctxThreat.playerThreatHigh, 'strong ability should raise threat');

const abilities = [
    { name: 'Лечение', type: 'heal', value: 20, chance: 100 },
    { name: 'Щит', type: 'shield', value: 25, duration: 2, chance: 100 },
    { name: 'Удар', type: 'damage', multiplier: 1.2, chance: 100 }
];

context.currentMonster.health = 25;
context.currentMonster.maxHealth = 100;
const lowHpPick = context.pickMonsterTacticalAbility(abilities);
assert(lowHpPick && lowHpPick.type === 'heal', 'low HP monster should prefer heal');

context.currentMonster.health = 90;
context.currentMonster.activeBuffs = {};
const rankedShield = context.pickMonsterTacticalAbilities(abilities);
assert(rankedShield[0].ability.type === 'shield' || rankedShield[0].ability.name === 'Щит',
    'after player threat monster should prefer shield');

context.currentMonster.health = 90;
context.player.health = 15;
context.player.maxHealth = 100;
context.resetMonsterAiState();
const finishAbilities = [
    { name: 'Удар', type: 'damage', multiplier: 1.5, chance: 100 },
    { name: 'Лечение', type: 'heal', value: 15, chance: 100 }
];
const finishPick = context.pickMonsterTacticalAbility(finishAbilities);
assert(finishPick && finishPick.type === 'damage', 'should finish low HP player with damage');

console.log('Monster AI tests OK');
