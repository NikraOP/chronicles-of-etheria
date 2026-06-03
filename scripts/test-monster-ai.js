const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/core/battle/monsterAI.js', 'utf8');
const context = {
    console,
    currentMonster: {
        name: 'Тест-босс',
        health: 30,
        maxHealth: 100,
        attack: 50,
        activeBuffs: {}
    },
    player: {
        health: 80,
        maxHealth: 100,
        temporaryEffects: []
    },
    monsterAbilityCooldowns: {},
    playerFrozenTurns: 0,
    getGlobalBattleTurn: () => 5,
    getMonsterCurrentAttack: () => 50
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
assert(
    rankedShield[0].ability.type === 'shield' || rankedShield[0].ability.name === 'Щит',
    'after player threat monster should prefer shield'
);

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

context.resetMonsterAiState();
context.currentMonster.health = 100;
context.currentMonster.maxHealth = 100;
context.currentMonster.attack = 60;
context.player.health = 100;
context.player.maxHealth = 100;
context.player.temporaryEffects = [];
context.getGlobalBattleTurn = () => 8;

context.recordMonsterAbilityForMonsterAi({
    name: 'Паутина',
    type: 'debuff',
    effect: 'slow'
});
const comboAbilities = [
    { name: 'Яд', type: 'dot', effect: 'poison', value: 8, duration: 3, chance: 100 },
    { name: 'Сильный удар', type: 'damage', multiplier: 1.6, chance: 100 },
    { name: 'Лёгкий удар', type: 'damage', multiplier: 1.1, chance: 100 }
];
const comboRanked = context.pickMonsterTacticalAbilities(comboAbilities);
assert(comboRanked.length >= 2, 'combo ranked list');
const topAfterSetup = comboRanked[0].ability;
assert(
    topAfterSetup.type === 'damage' && topAfterSetup.multiplier >= 1.5,
    'after setup monster should prefer high damage finisher'
);

const dotVal = context.estimateMonsterAbilityValue(
    { type: 'dot', value: 10, duration: 3 },
    context.buildMonsterAiContext()
);
const dmgVal = context.estimateMonsterAbilityValue(
    { type: 'damage', multiplier: 1.5, hits: 1 },
    context.buildMonsterAiContext()
);
assert(dmgVal > dotVal * 0.5, 'damage estimate should be meaningful');

context.resetMonsterAiState();
context.currentMonster.health = 100;
context.currentMonster.activeBuffs = { atk: { value: 40, remainingTurns: 2 } };
context.player.health = 70;
context.getGlobalBattleTurn = () => 3;
const buffCombo = context.pickMonsterTacticalAbilities([
    { name: 'Удар', type: 'damage', multiplier: 1.3, chance: 100 },
    { name: 'Паутина', type: 'debuff', effect: 'slow', value: 20, duration: 2, chance: 100 }
]);
assert(buffCombo[0].ability.type === 'damage', 'with atk buff should strike');

const punisherAbilities = [
    { name: 'Божественный гнев', type: 'damage', multiplier: 1.8, chance: 62, cooldown: 2 },
    { name: 'Светлый щит', type: 'shield', value: 45, duration: 2, chance: 45, cooldown: 3 },
    { name: 'Исцеление', type: 'heal', value: 25, chance: 40, cooldown: 4 },
    { name: 'Благословение', type: 'buff', effect: 'all', value: 50, duration: 2, chance: 38, cooldown: 5 }
];

context.resetMonsterAiState();
context.currentMonster.health = 4000;
context.currentMonster.maxHealth = 4380;
context.currentMonster.attack = 250;
context.getMonsterCurrentAttack = () => context.currentMonster.attack;
context.currentMonster.activeBuffs = {};
context.player.health = 3000;
context.player.maxHealth = 3500;
context.player.temporaryEffects = [];
context.getGlobalBattleTurn = () => 2;

const punisherOpen = context.pickMonsterTacticalAbilities(punisherAbilities);
assert(punisherOpen.length > 0, 'punisher ranked list');
assert(
    punisherOpen[0].ability.type === 'damage',
    'sky punisher at full HP should lead with damage, not buff'
);

context.currentMonster.activeBuffs = {
    atk: { value: 50, remainingTurns: 2 },
    def: { value: 50, remainingTurns: 2 }
};
const punisherBuffed = context.pickMonsterTacticalAbilities(punisherAbilities);
assert(
    !punisherBuffed.some(e => e.ability.name === 'Благословение'),
    'blessing blocked while atk/def buff active'
);
assert(
    punisherBuffed[0].ability.type === 'damage',
    'buffed punisher should still prefer divine wrath'
);

context.currentMonster.activeBuffs = {};
context.currentMonster.health = 2800;
context.recordPlayerActionForMonsterAi({ name: 'Метеор', dmg: 90, cd: 5 });
const punisherThreat = context.pickMonsterTacticalAbilities(punisherAbilities);
const topThreat = punisherThreat[0].ability;
assert(
    topThreat.type === 'shield' || topThreat.type === 'damage',
    'under player threat punisher defends or strikes, not heal spam'
);

console.log('Monster AI tests OK');
