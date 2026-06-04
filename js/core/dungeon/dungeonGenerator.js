// dungeonGenerator.js — процедурная генерация соло-данжа (seed + mulberry32)

function mulberry32(seed) {
    let s = seed >>> 0;
    return function rng() {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function dungeonRandInt(rng, min, max) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo + Math.floor(rng() * (hi - lo + 1));
}

function dungeonClamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function findMonsterTemplateByName(name) {
    if (!name) return null;
    if (typeof findDungeonMonsterTemplate === 'function') {
        const dungeonMob = findDungeonMonsterTemplate(name);
        if (dungeonMob) return dungeonMob;
    }
    if (typeof LOCATIONS === 'undefined') return null;
    for (let i = 0; i < LOCATIONS.length; i++) {
        const monsters = LOCATIONS[i].monsters || [];
        for (let j = 0; j < monsters.length; j++) {
            if (monsters[j].name === name) return monsters[j];
        }
    }
    return null;
}

function weightedPickArchetype(rng, excludeIds) {
    const skip = excludeIds || [];
    const entries = Object.keys(ROOM_ARCHETYPES).map(function (key) {
        return ROOM_ARCHETYPES[key];
    }).filter(function (a) {
        return skip.indexOf(a.id) < 0;
    });
    let total = 0;
    for (let i = 0; i < entries.length; i++) {
        total += entries[i].weight || 1;
    }
    if (total <= 0) return entries[0] || { id: 'chamber' };
    let roll = rng() * total;
    for (let k = 0; k < entries.length; k++) {
        roll -= entries[k].weight || 1;
        if (roll <= 0) return entries[k];
    }
    return entries[entries.length - 1];
}

function pickNamesWithoutRepeat(pool, count, rng) {
    const available = pool.slice();
    const picked = [];
    for (let i = 0; i < count && available.length > 0; i++) {
        const idx = Math.floor(rng() * available.length);
        picked.push(available[idx]);
        available.splice(idx, 1);
    }
    return picked;
}

function rollRoomCount(rng, dungeon) {
    const cfg = dungeon.roomsPerFloor || { min: 3, max: 5 };
    const lo = dungeonClamp(cfg.min, 3, 5);
    const hi = dungeonClamp(cfg.max, 3, 5);
    return dungeonRandInt(rng, lo, hi > lo ? hi : lo);
}

function rollFloorCount(rng, dungeon) {
    const cfg = dungeon.floors || { min: 2, max: 3 };
    const lo = cfg.min || DUNGEON_BALANCE.floorCountMin;
    const hi = cfg.max || DUNGEON_BALANCE.floorCountMax;
    return dungeonRandInt(rng, lo, hi);
}

function rollEnemyCount(rng, archetype, floorIndex, isBoss) {
    if (isBoss) return 1;
    let count = dungeonRandInt(rng, 2, 3);
    const bias = archetype && archetype.enemyCountBias != null ? archetype.enemyCountBias : 0;
    count = dungeonClamp(count + bias, 1, DUNGEON_BALANCE.enemiesPerRoomMax);
    if (floorIndex === 0) count = Math.min(count, 2);
    return Math.max(DUNGEON_BALANCE.enemiesPerRoomMin, count);
}

function buildScaledEnemy(template, mults, dungeon) {
    const expMult = dungeon.expMult != null ? dungeon.expMult : 1;
    return {
        name: template.name,
        hp: Math.max(1, Math.floor(template.hp * mults.hp)),
        atk: Math.max(1, Math.floor(template.atk * mults.atk)),
        def: Math.max(0, Math.floor(template.def * mults.def)),
        exp: Math.max(1, Math.floor(template.exp * mults.exp * expMult)),
        icon: template.icon || '👾',
        img: template.img || '',
        abilities: template.abilities ? template.abilities.slice() : []
    };
}

function resolveEnemiesForRoom(namePool, count, rng, mults, dungeon) {
    const names = pickNamesWithoutRepeat(namePool, count, rng);
    const enemies = [];
    for (let i = 0; i < names.length; i++) {
        const template = findMonsterTemplateByName(names[i]);
        if (!template) continue;
        enemies.push(buildScaledEnemy(template, mults, dungeon));
    }
    return enemies;
}

function getPackMult(table, enemyCount, fallback) {
    if (!table) return fallback;
    const n = Math.max(1, Math.min(3, enemyCount));
    return table[n] != null ? table[n] : fallback;
}

function floorStatMults(floorIndex, enemyCount, mode) {
    const isDuo = mode === 'duo';
    const floorMult = 1 + floorIndex * (DUNGEON_BALANCE.floorThreatStep || 0.12);
    const packHpTable = isDuo ? DUNGEON_BALANCE.packHp.duo : DUNGEON_BALANCE.packHp.solo;
    const packAtkTable = isDuo ? DUNGEON_BALANCE.packAtk.duo : DUNGEON_BALANCE.packAtk.solo;
    const modeHp = isDuo ? DUNGEON_BALANCE.modeHp.duo : DUNGEON_BALANCE.modeHp.solo;
    const modeAtk = isDuo ? DUNGEON_BALANCE.modeAtk.duo : DUNGEON_BALANCE.modeAtk.solo;
    const packHp = getPackMult(packHpTable, enemyCount, isDuo ? 0.38 : 0.42);
    const packAtk = getPackMult(packAtkTable, enemyCount, isDuo ? 0.9 : 0.88);
    return {
        hp: packHp * modeHp * floorMult,
        atk: packAtk * modeAtk * floorMult,
        def: floorMult * 0.95,
        exp: floorMult * (isDuo ? (DUNGEON_BALANCE.reward.duo.exp || 1.3) : 1)
    };
}

function floorRng(seed, floorIndex) {
    return mulberry32((seed >>> 0) ^ ((floorIndex + 1) * 7919));
}

function buildFinalBossEnemy(dungeon, floorIndex, mults, runMode) {
    const bossId = dungeon.finalBossId;
    if (!bossId) return null;
    const template = findMonsterTemplateByName(bossId);
    if (!template) return null;
    const bossMults = {
        hp: mults.hp * 1.4,
        atk: mults.atk * 1.12,
        def: mults.def * 1.18,
        exp: mults.exp * 1.65
    };
    return buildScaledEnemy(template, bossMults, dungeon);
}

/**
 * Генерирует один этаж (ленивая генерация забега).
 * @param {string} dungeonId
 * @param {number} floorIndex
 * @param {number} totalFloors
 * @param {number} seed
 * @param {string} [mode]
 * @returns {{ index: number, rooms: Array }}
 */
function generateDungeonFloor(dungeonId, floorIndex, totalFloors, seed, mode) {
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null;
    if (!dungeon) return { index: floorIndex, rooms: [] };

    const rng = floorRng(seed, floorIndex);
    const runMode = mode || (dungeon.mode === 'duo' ? 'duo' : 'solo');
    const isLastFloor = floorIndex >= totalFloors - 1;
    const bossId = dungeon.finalBossId || null;

    const namePool = typeof pickDungeonMonsterPool === 'function'
        ? pickDungeonMonsterPool(dungeon, floorIndex, rng, totalFloors)
        : (dungeon.monsterPool || []).slice();
    const combatPool = bossId
        ? namePool.filter(function (n) { return n !== bossId; })
        : namePool.slice();
    const poolForRooms = combatPool.length ? combatPool : namePool;

    const roomCount = rollRoomCount(rng, dungeon);
    const rooms = [];

    for (let r = 0; r < roomCount; r++) {
        const isFinalRoom = isLastFloor && r === roomCount - 1 && bossId;

        if (isFinalRoom) {
            const mults = floorStatMults(floorIndex, 1, runMode);
            const bossEnemy = buildFinalBossEnemy(dungeon, floorIndex, mults, runMode);
            if (bossEnemy) {
                rooms.push({
                    archetype: 'boss',
                    enemies: [bossEnemy],
                    isBoss: true,
                    isFinalBoss: true,
                    isShrine: false
                });
                continue;
            }
        }

        const archetype = weightedPickArchetype(rng, isLastFloor ? ['shrine'] : null);
        if (archetype.id === 'shrine') {
            rooms.push({
                archetype: 'shrine',
                enemies: [],
                isBoss: false,
                isShrine: true
            });
            continue;
        }

        const isBoss = archetype.id === 'boss' || (isLastFloor && r === roomCount - 1 && rng() < 0.28);
        const enemyCount = rollEnemyCount(rng, archetype, floorIndex, isBoss);
        const mults = floorStatMults(floorIndex, enemyCount, runMode);
        const enemies = resolveEnemiesForRoom(poolForRooms, enemyCount, rng, mults, dungeon);

        if (!enemies.length && poolForRooms.length) {
            const fallback = findMonsterTemplateByName(poolForRooms[0]);
            if (fallback) enemies.push(buildScaledEnemy(fallback, mults, dungeon));
        }

        rooms.push({
            archetype: archetype.id,
            enemies: enemies,
            isBoss: isBoss,
            isShrine: false
        });
    }

    if (!rooms.length) {
        const mults = floorStatMults(floorIndex, 1, runMode);
        const fallback = findMonsterTemplateByName(poolForRooms[0] || namePool[0]);
        if (fallback) {
            rooms.push({
                archetype: 'chamber',
                enemies: [buildScaledEnemy(fallback, mults, dungeon)],
                isBoss: false,
                isShrine: false
            });
        }
    }

    return { index: floorIndex, rooms: rooms };
}

/**
 * Полный забег (для тестов и дуо-синхронизации): все этажи сразу.
 */
function generateDungeonRun(dungeonId, seed) {
    const lazy = typeof createLazyDungeonRun === 'function'
        ? createLazyDungeonRun(dungeonId, seed)
        : null;
    if (!lazy || !lazy.totalFloors) {
        return { dungeonId: dungeonId, seed: 0, floors: [] };
    }
    const floors = [];
    for (let f = 0; f < lazy.totalFloors; f++) {
        floors.push(generateDungeonFloor(dungeonId, f, lazy.totalFloors, lazy.seed));
    }
    return {
        dungeonId: lazy.dungeonId,
        seed: lazy.seed,
        totalFloors: lazy.totalFloors,
        floors: floors
    };
}

window.mulberry32 = mulberry32;
window.generateDungeonFloor = generateDungeonFloor;
window.generateDungeonRun = generateDungeonRun;
