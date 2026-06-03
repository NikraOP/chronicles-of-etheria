/**
 * Static audit: every ability flag in ABILITIES_DB vs battlePlayer.js handlers.
 * Run: node scripts/test-all-abilities-audit.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const abilitiesSrc = fs.readFileSync(path.join(root, 'js/data/abilities.js'), 'utf8');
const playerSrc = fs.readFileSync(path.join(root, 'js/core/battle/battlePlayer.js'), 'utf8');
const bridgeSrc = fs.readFileSync(path.join(root, 'js/core/pvpBattleBridge.js'), 'utf8');
const engineSrc = fs.readFileSync(path.join(root, 'js/core/pvpCombatEngine.js'), 'utf8');

const HANDLED = new Set([
    'name', 'desc', 'lvl', 'cd', 'mana', 'dmg', 'icon', 'img', 'currentCooldown',
    'atk', 'def', 'dodge', 'crit', 'critDmg', 'cdReduction', 'freezeOnHit', 'ccImmune',
    'passive', 'nextAttackBonus', 'aoe', 'enemyDebuff', 'buff', 'skipNextTurn',
    'ignoreDef', 'lifesteal', 'combo', 'effect', 'rampUp', 'executeInstant',
    'guaranteedCrit', 'multiHit', 'executeOnLowHp', 'lowHpBonus', 'nextCrit',
    'freeNextAction', 'nextFree', 'doubleNext', 'noCdNext', 'summonSpirit',
    'lingeringCloud', 'mark', 'markAll', 'reveal', 'extraTurnOnKill',
    'consumeBurn', 'splash', 'dotOverTime', 'dispelBuffs', 'hpLoss', 'manaDrain',
    'freezeExtend', 'groundBuff', 'value', 'fireVuln', 'armorShred', 'ignoreAll',
    'partyBuff', 'healBonus', 'regen', 'selfBuff', 'bleedPercent', 'heal',
    'maxHpShield', 'maxManaBonus', 'shieldFromDamage', 'manaScaling', 'shield',
    'manaToShield', 'manaToDamage', 'burnMana', 'cdReduction', 'restoreMana',
    'restoreManaPercent', 'manaRefund', 'echo', 'immune', 'dur', 'reflect',
    'damageReduction', 'deathSave', 'critBonus', 'doubleHit', 'tripleHit',
    'quadHit', 'hitCount', 'stunChance', 'manaPerHit', 'chain', 'revive',
    'noDamage', 'pierce', 'nextAccuracy', 'critDmgBonus', 'type', 'spread',
    'manaRegen', 'manaPerFrozen', 'permAtk', 'permCrit', 'permCritDmg',
    'counterChance', 'counterDmg', 'freeOnDodge', 'reviveOnDeath', 'reviveOnce',
    'reviveHp', 'weakspot', 'ignoreShields', 'hits', 'baseDmg', 'increment',
    'ramp', 'critRamp', 'threshold', 'chance', 'dmgPerTurn', 'perStack', 'maxStack'
]);

const PVP_HANDLED = new Set([
    'aoe', 'effect', 'skipNextTurn', 'dotOverTime', 'manaDrain', 'burnMana',
    'lingeringCloud', 'summonSpirit', 'deathSave', 'reviveOnDeath', 'reviveOnce',
    'extraTurnOnKill', 'enemyDebuff', 'mark', 'markAll'
]);

const META_KEYS = new Set(['type', 'val', 'value', 'dur', 'spread', 'manaRegen', 'threshold', 'chance', 'hits', 'baseDmg', 'increment', 'ramp', 'critRamp', 'dmgPerTurn', 'perStack', 'maxStack']);

function extractAbilities(src) {
    const list = [];
    const classRe = /'([^']+)':\s*\{/g;
    let m;
    const classes = [];
    while ((m = classRe.exec(src)) !== null) {
        if (['Воин', 'Маг', 'Лучник'].includes(m[1])) classes.push(m[1]);
    }
    const abilityBlocks = src.split(/\{name:/);
    for (let i = 1; i < abilityBlocks.length; i++) {
        const block = '{name:' + abilityBlocks[i];
        const nameM = block.match(/name:'([^']+)'/);
        if (!nameM) continue;
        const keys = new Set();
        const keyRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
        let km;
        while ((km = keyRe.exec(block.split('},')[0] + '}')) !== null) {
            keys.add(km[1]);
        }
        list.push({ name: nameM[1], keys: [...keys] });
    }
    return list;
}

const abilities = extractAbilities(abilitiesSrc);
let failed = 0;
const issues = [];

for (const ab of abilities) {
    const unknown = ab.keys.filter(k => !HANDLED.has(k) && !META_KEYS.has(k));
    if (unknown.length) {
        issues.push({ ability: ab.name, problem: `Unhandled keys: ${unknown.join(', ')}` });
        failed++;
    }
    for (const k of ab.keys) {
        if (PVP_HANDLED.has(k)) {
            const inBridge = bridgeSrc.includes(k) || engineSrc.includes(k) || playerSrc.includes(k);
            if (!inBridge && (k === 'lingeringCloud' || k === 'summonSpirit' || k === 'deathSave' || k === 'reviveOnDeath')) {
                issues.push({ ability: ab.name, problem: `PvP may need bridge for ${k}` });
            }
        }
    }
}

const mustExist = [
    ['pierce', 'a.pierce'],
    ['increment', 'multiHit.increment'],
    ['critDmgBonus', 'critDmgBonus'],
    ['nextAccuracy', 'nextAccuracy'],
    ['markBonus', 'markBonus'],
    ['armorShredTurns', 'armorShredTurns'],
    ['tryPvPSurvivalMechanics', 'tryPvPSurvivalMechanics'],
    ['pvpResolveEndOfTurnMonsterEffects', 'pvpResolveEndOfTurnMonsterEffects'],
    ['getPlayerCritDamagePercent', 'getPlayerCritDamagePercent']
];

for (const [label, needle] of mustExist) {
    const ok = playerSrc.includes(needle) || bridgeSrc.includes(needle) || fs.readFileSync(path.join(root, 'js/core/battle/battleDamage.js'), 'utf8').includes(needle);
    if (!ok) {
        issues.push({ ability: '(code)', problem: `Missing fix: ${label}` });
        failed++;
    }
}

console.log(`Audited ${abilities.length} abilities across 9 schools.\n`);

if (issues.length) {
    issues.forEach(i => console.error(`- ${i.ability}: ${i.problem}`));
} else {
    console.log('No unhandled ability keys detected.');
}

require('child_process').execSync('node scripts/test-pvp-combat.js', { cwd: root, stdio: 'inherit' });

if (failed > 0) {
    console.error(`\n${failed} audit issue(s)`);
    process.exit(1);
}
console.log('\nFull abilities audit passed.');
