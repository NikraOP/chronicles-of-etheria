/**
 * PvP match-end broadcast smoke test (Node).
 * Run: node scripts/test-pvp-match-end.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const bridgeSrc = fs.readFileSync(path.join(root, 'js/core/pvpBattleBridge.js'), 'utf8');
const endSrc = fs.readFileSync(path.join(root, 'js/core/battle/battleEnd.js'), 'utf8');
const arenaSrc = fs.readFileSync(path.join(root, 'js/core/pvpArena.js'), 'utf8');
const damageSrc = fs.readFileSync(path.join(root, 'js/core/battle/battleDamage.js'), 'utf8');

let failed = 0;
function assert(cond, msg) {
    if (!cond) { console.error('FAIL:', msg); failed++; }
    else console.log('OK:', msg);
}

assert(bridgeSrc.includes('window.pvpBroadcastMatchEnd'), 'pvpBroadcastMatchEnd exists');
assert(endSrc.includes('pvpBroadcastMatchEnd(true)'), 'victory uses broadcast');
assert(endSrc.includes('pvpBroadcastMatchEnd(false)'), 'gameOver uses broadcast');
assert(bridgeSrc.includes("sendPvPMessage('end'"), 'end message sent');
assert(bridgeSrc.includes('pvpFinishPvPBattle(localWon, true)'), 'remote finish from sync');
assert(bridgeSrc.includes('syncPvPRemoteFromMonster'), 'immediate remote sync');
assert(damageSrc.includes('syncPvPRemoteFromMonster'), 'damage syncs to match');
assert(arenaSrc.includes('applyPvPRemoteBattleState'), 'end handler uses applyPvPRemoteBattleState');

if (failed) process.exit(1);
console.log('\nPvP match-end checks passed.');
