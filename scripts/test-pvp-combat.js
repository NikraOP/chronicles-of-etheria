/**
 * PvP combat engine smoke tests (Node, no browser).
 * Run: node scripts/test-pvp-combat.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const engineSrc = fs.readFileSync(path.join(root, 'js/core/pvpCombatEngine.js'), 'utf8');

const sandbox = {
    window: {},
    console,
    playerFrozenTurns: 0,
    playerSkipNextTurn: false,
    player: { temporaryEffects: [], class: 'Маг' },
    isMonsterDotEffectType: (t) => ['Горение', 'Яд', 'Кровотечение', 'burn', 'poison'].includes(t)
};
vm.createContext(sandbox);
vm.runInContext(engineSrc, sandbox);

const eng = sandbox.window.pvpCombatEngine;
let failed = 0;

function assert(cond, msg) {
    if (!cond) {
        console.error('FAIL:', msg);
        failed++;
    } else {
        console.log('OK:', msg);
    }
}

const fighter = {
    name: 'Guest',
    health: 100,
    maxHealth: 100,
    effects: [{ type: 'Заморозка', dur: 1 }],
    temporaryEffects: [],
    activeBuffs: {},
    abilities: []
};

const stun = eng.findStunCc(fighter.effects);
assert(stun && stun.type === 'Заморозка', 'findStunCc detects freeze');

eng.applyCcFromFighterToPlayer(fighter);
assert(sandbox.playerFrozenTurns === 1, 'applyCc sets playerFrozenTurns');
assert(
    sandbox.player.temporaryEffects.some(e => e.type === 'debuff_freeze'),
    'applyCc adds debuff_freeze chip'
);

sandbox.playerFrozenTurns = 0;
fighter.effects = [];
eng.syncFighterCcFromPlayer(fighter);
assert(!fighter.effects.length, 'sync clears effects when unfrozen');

fighter.effects = [{ type: 'Горение', dur: 2, val: 5 }];
const match = {
    turn: 1,
    active: 'host',
    finished: false,
    players: {
        host: { name: 'H', health: 200, maxHealth: 200, effects: [], activeBuffs: {}, abilities: [] },
        guest: eng.ensureFighter({ ...fighter, health: 100, maxHealth: 100 })
    }
};

eng.tickBothFightersEndOfTurn(match, 'host');
assert(match.players.guest.health < 100, 'DoT tick reduces guest HP');

const sig1 = eng.getExtendedMatchSig(match);
match.players.guest.effects.push({ type: 'Оглушение', dur: 1 });
const sig2 = eng.getExtendedMatchSig(match);
assert(sig1 !== sig2, 'extended sig includes effects');

const abilitiesPath = path.join(root, 'js/data/abilities.js');
const abilitiesSrc = fs.readFileSync(abilitiesPath, 'utf8');
const effectTypes = new Set();
const re = /effect:\s*\{\s*type:\s*'([^']+)'/g;
let m;
while ((m = re.exec(abilitiesSrc)) !== null) effectTypes.add(m[1]);
console.log('\nAbility effect types in DB:', [...effectTypes].sort().join(', '));

const effectList = [...effectTypes];
const ccTypes = effectList.filter(t => eng.STUN_CC_TYPES.includes(t));
const dotTypes = effectList.filter(t => sandbox.isMonsterDotEffectType(t));
console.log('CC (PvP skip-turn):', ccTypes.join(', ') || '(none)');
console.log('DoT (PvP global tick):', dotTypes.join(', ') || '(check isMonsterDotEffectType in browser)');

if (failed > 0) {
    console.error('\n' + failed + ' test(s) failed');
    process.exit(1);
}
console.log('\nAll PvP combat engine checks passed.');
