/**
 * Smoke test: dungeon generator (node, minimal mocks).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {
    console,
    window: {},
    LOCATIONS: [{ monsters: [{ name: 'Гоблин-берсерк', hp: 100, atk: 30, def: 6, exp: 25, icon: '👹', abilities: [] }] }],
    DUNGEON_BALANCE: {},
    ROOM_ARCHETYPES: {
        corridor: { id: 'corridor', weight: 1, enemyCountBias: 0 },
        boss: { id: 'boss', weight: 1, enemyCountBias: 0, forceEnemyCount: 1 }
    },
    DUNGEONS_DB: [{
        id: 'twilight_den',
        mode: 'solo',
        floors: { min: 2, max: 2 },
        roomsPerFloor: { min: 3, max: 3 },
        monsterPool: ['Гоблин-берсерк'],
        goldMult: 8,
        expMult: 1
    }],
    getDungeonById(id) {
        return ctx.DUNGEONS_DB.find(d => d.id === id);
    },
    pickDungeonMonsterPool(dungeon, floorIndex, rng) {
        return dungeon.monsterPool[0];
    }
};
vm.createContext(ctx);

function load(rel) {
    vm.runInContext(readFileSync(join(root, rel), 'utf8'), ctx);
}

ctx.window = ctx;
load('js/data/locations.js');
load('js/data/dungeons.js');
load('js/core/dungeon/dungeonGenerator.js');

const run = ctx.generateDungeonRun('twilight_den', 42);
if (!run.floors.length) throw new Error('no floors');
const hasFight = run.floors.some(f => (f.rooms || []).some(r => r.enemies && r.enemies.length > 0));
if (!hasFight) throw new Error('no enemies in any room');
const room = run.floors[0].rooms.find(r => r.enemies && r.enemies.length) || run.floors[0].rooms[0];
const run2 = ctx.generateDungeonRun('twilight_den', 42);
if (run2.seed !== run.seed) throw new Error('seed mismatch');
if (JSON.stringify(run2) !== JSON.stringify(run)) throw new Error('not deterministic');
const run3 = ctx.generateDungeonRun('twilight_den', 99);
if (JSON.stringify(run3) === JSON.stringify(run)) throw new Error('seed should change layout');
console.log('ok', run.floors.length, 'floors', room.enemies.length, 'enemies in room 1');
