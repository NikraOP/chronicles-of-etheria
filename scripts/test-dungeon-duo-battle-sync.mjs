/**
 * Duo battle turn flags: isPlayerPhase must reflect coop phase, not local isPlayerTurn.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {
    console,
    window: { dungeonDuoBattleActive: true },
    player: {
        name: 'Host', class: 'Воин', branch: '', gender: 'male',
        health: 100, maxHealth: 100, level: 5, attack: 10, defense: 5,
        criticalChance: 5, criticalDamage: 150, dodgeChance: 0
    },
    isPlayerTurn: true,
    currentMonster: { name: 'Slime', health: 50, maxHealth: 50 },
    duoDungeonState: { role: 'host' },
    getDuoDungeonState: () => ctx.duoDungeonState,
    getDungeonRunSession: () => ({ floorIndex: 0, roomIndex: 0 }),
    getBattleEnemies: () => [ctx.currentMonster],
    syncCurrentMonsterFromFocus: () => {},
    sendDuoDungeonRoomState: () => true,
    sendDuoDungeonBattleAction: () => true,
    updateBattleButtons: () => {},
    renderBattle: () => {},
    addBattleLog: () => {},
    setBattleFocusIndex: () => {},
    floatDamage: () => {},
    playStrikeAnimation: (side, cb) => { ctx._lastStrikeSide = side; if (cb) cb(); }
};

vm.createContext(ctx);
ctx.window = ctx;
vm.runInContext(readFileSync(join(root, 'js/core/dungeon/dungeonDuoBattle.js'), 'utf8'), ctx);

ctx.startDungeonDuoBattleMode();
if (!ctx.isPlayerTurn) throw new Error('host should start with turn');

const snapHostAfterAct = ctx.buildDungeonRoomSnapshot();
ctx.dungeonDuoRoundActs = { host: true, guest: false };
ctx.dungeonDuoActiveSlot = 'guest';
ctx.isPlayerTurn = false;
snapHostAfterAct.activeSlot = 'guest';
snapHostAfterAct.isPlayerPhase = ctx.buildDungeonRoomSnapshot().isPlayerPhase;

if (snapHostAfterAct.isPlayerPhase !== true) {
    throw new Error('isPlayerPhase must stay true when passing turn to guest, got ' + snapHostAfterAct.isPlayerPhase);
}

ctx.duoDungeonState.role = 'guest';
ctx.isPlayerTurn = false;
ctx.applyDungeonDuoRoomSnapshot({
    activeSlot: 'guest',
    isPlayerPhase: true,
    party: {},
    enemies: [{ index: 0, health: 40, maxHealth: 50 }]
});

if (!ctx.isPlayerTurn) throw new Error('guest should gain turn after host snapshot');
if (!ctx.dungeonDuoLocalCanAct()) throw new Error('dungeonDuoLocalCanAct should be true for guest');

ctx.duoDungeonState.role = 'host';
ctx.isPlayerTurn = true;
ctx.applyDungeonDuoRoomSnapshot({
    activeSlot: 'guest',
    isPlayerPhase: true,
    party: {},
    enemies: []
});
if (ctx.isPlayerTurn) throw new Error('host should not act on guest slot');

ctx.dungeonDuoCoopPlayerPhase = false;
ctx.applyDungeonDuoRoomSnapshot({ activeSlot: 'host', isPlayerPhase: false, party: {}, enemies: [] });
if (ctx.isPlayerTurn) throw new Error('monster phase should disable buttons');

ctx.duoDungeonState.role = 'guest';
ctx.playRemoteDungeonDuoVisual({ actorSlot: 'host', action: 'attack', damage: 12, crit: false, targetIndex: 0 });
if (ctx._lastStrikeSide !== 'ally') {
    throw new Error('guest should see host strike as ally, got ' + ctx._lastStrikeSide);
}

console.log('ok dungeon duo battle sync');
