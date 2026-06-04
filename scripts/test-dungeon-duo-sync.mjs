/**
 * Smoke: duo sync helpers (no MQTT).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {
    console,
    window: {},
    player: { name: 'A', class: 'Воин', level: 10, health: 100, maxHealth: 100, gold: 0, experience: 0, maxExperience: 500, victories: 0 },
    dungeonRunSession: null,
    duoDungeonState: { role: 'guest', status: 'run', dungeonId: 'frozen_abyss' },
    isPlayerTurn: false,
    currentMonster: null,
    dungeonDuoBattleActive: false,
    DUNGEON_BALANCE: {},
    ROOM_ARCHETYPES: {},
    LOCATIONS: [],
    DUNGEONS_DB: [],
    getDungeonById: () => null,
    getDuoDungeonState: () => ctx.duoDungeonState,
    getDungeonRunSession: () => ctx.dungeonRunSession,
    sendDuoDungeonRoomState: () => true,
    sendDuoDungeonBattleAction: () => true,
    addMessage: () => {},
    saveGame: () => {},
    showDungeonsHub: () => {},
    openDungeonDetail: () => {},
    stopDungeonDuoBattleMode: () => { ctx.window.dungeonDuoBattleActive = false; },
    setDuoDungeonRunStatus: () => {},
    recordDungeonProgress: () => {},
    ensureFloorGenerated: () => null,
    getRunFloorCount: () => 2,
    getFloorFromRun: (run, i) => run.floors[i],
    saveActiveDungeonRun: () => {}
};
vm.createContext(ctx);
ctx.window = ctx;

function load(rel) {
    vm.runInContext(readFileSync(join(root, rel), 'utf8'), ctx);
}

load('js/core/dungeon/dungeonRunState.js');
load('js/data/dungeons.js');
load('js/core/dungeon/dungeonSession.js');

vm.runInContext(
    "dungeonRunSession = {" +
    "mode: 'duo', dungeonId: 'frozen_abyss', floorIndex: 0, roomIndex: 1," +
    "state: 'in_room', committed: true," +
    "run: { floors: [{ rooms: [{}, {}, {}] }], totalFloors: 2 }" +
    "};",
    ctx
);

ctx.applyDungeonRoomAdvanceFromHost({
    floorIndex: 0,
    roomIndex: 2,
    state: 'in_room',
    completed: false
});

const session1 = ctx.getDungeonRunSession();
if (!session1 || session1.roomIndex !== 2) {
    throw new Error('guest room advance failed: ' + (session1 && session1.roomIndex));
}

ctx.applyDungeonRoomAdvanceFromHost({ completed: true, dungeonId: 'frozen_abyss' });
if (ctx.getDungeonRunSession() !== null) throw new Error('completed should clear session');

console.log('ok duo sync helpers');
