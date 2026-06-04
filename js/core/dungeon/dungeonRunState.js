// Процедурный забег: этажи генерируются по мере прохождения.

/**
 * @param {string} dungeonId
 * @param {number} [seed]
 * @returns {object}
 */
function createLazyDungeonRun(dungeonId, seed) {
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null;
    if (!dungeon) return { dungeonId: dungeonId, seed: 0, totalFloors: 0, floors: {}, floorOrder: [] };
    const resolvedSeed = seed != null ? (seed >>> 0) : ((Date.now() ^ (dungeonId.length * 2654435761)) >>> 0);
    const rng = typeof mulberry32 === 'function' ? mulberry32(resolvedSeed) : function () { return Math.random(); };
    const cfg = dungeon.floors || { min: 2, max: 4 };
    const lo = cfg.min || 2;
    const hi = cfg.max || 4;
    const totalFloors = lo + Math.floor(rng() * (hi - lo + 1));
    return {
        dungeonId: dungeonId,
        seed: resolvedSeed,
        totalFloors: totalFloors,
        floors: {},
        floorOrder: [],
        lazy: true,
        mode: dungeon && dungeon.mode === 'duo' ? 'duo' : 'solo'
    };
}

function getFloorFromRun(run, floorIndex) {
    if (!run || !run.floors) return null;
    if (Array.isArray(run.floors)) return run.floors[floorIndex] || null;
    return run.floors[floorIndex] || null;
}

function ensureFloorGenerated(run, floorIndex) {
    if (!run) return null;
    const existing = getFloorFromRun(run, floorIndex);
    if (existing) return existing;

    if (typeof generateDungeonFloor !== 'function') {
        return null;
    }
    const floor = generateDungeonFloor(
        run.dungeonId,
        floorIndex,
        run.totalFloors,
        run.seed,
        run.mode
    );
    if (!run.floors || typeof run.floors !== 'object') run.floors = {};
    if (Array.isArray(run.floors)) {
        while (run.floors.length <= floorIndex) run.floors.push(null);
        run.floors[floorIndex] = floor;
    } else {
        run.floors[floorIndex] = floor;
    }
    if (!run.floorOrder) run.floorOrder = [];
    if (run.floorOrder.indexOf(floorIndex) < 0) run.floorOrder.push(floorIndex);
    return floor;
}

function migrateRunToLazy(run, dungeonId) {
    if (!run) return createLazyDungeonRun(dungeonId);
    if (run.lazy && run.totalFloors) return run;
    if (Array.isArray(run.floors) && run.floors.length) {
        const lazy = {
            dungeonId: run.dungeonId || dungeonId,
            seed: run.seed,
            totalFloors: run.floors.length,
            floors: {},
            floorOrder: [],
            lazy: true
        };
        run.floors.forEach(function (f, i) {
            lazy.floors[i] = f;
            lazy.floorOrder.push(i);
        });
        return lazy;
    }
    return createLazyDungeonRun(dungeonId, run.seed);
}

function getRunFloorCount(run) {
    if (!run) return 0;
    if (run.totalFloors) return run.totalFloors;
    if (Array.isArray(run.floors)) return run.floors.length;
    return Object.keys(run.floors || {}).length;
}

window.createLazyDungeonRun = createLazyDungeonRun;
window.ensureFloorGenerated = ensureFloorGenerated;
window.getFloorFromRun = getFloorFromRun;
window.migrateRunToLazy = migrateRunToLazy;
window.getRunFloorCount = getRunFloorCount;
