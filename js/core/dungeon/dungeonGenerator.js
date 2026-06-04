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
    if (!name || typeof LOCATIONS === 'undefined') return null;
    for (let i = 0; i < LOCATIONS.length; i++) {
        const monsters = LOCATIONS[i].monsters || [];
        for (let j = 0; j < monsters.length; j++) {
            if (monsters[j].name === name) return monsters[j];
        }
    }
    return null;
}

function weightedPickArchetype(rng) {
    const entries = Object.keys(ROOM_ARCHETYPES).map(function (key) {
        return ROOM_ARCHETYPES[key];
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

function floorStatMults(floorIndex, enemyCount) {
    const floorMult = 1 + floorIndex * 0.12;
    const packHp = enemyCount >= 2 ? DUNGEON_BALANCE.soloHpPackMult : 1;
    const atkMult = DUNGEON_BALANCE.soloAtkMult;
    return {
        hp: packHp * floorMult,
        atk: atkMult * floorMult,
        def: floorMult * 0.95,
        exp: floorMult
    };
}

/**
 * @param {string} dungeonId
 * @param {number} [seed]
 * @returns {{ dungeonId: string, seed: number, floors: Array }}
 */
function generateDungeonRun(dungeonId, seed) {
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null;
    if (!dungeon) {
        return { dungeonId: dungeonId, seed: 0, floors: [] };
    }

    const resolvedSeed = seed != null ? (seed >>> 0) : ((Date.now() ^ (dungeonId.length * 2654435761)) >>> 0);
    const rng = mulberry32(resolvedSeed);
    const floorCount = rollFloorCount(rng, dungeon);
    const floors = [];

    for (let f = 0; f < floorCount; f++) {
        const namePool = typeof pickDungeonMonsterPool === 'function'
            ? pickDungeonMonsterPool(dungeon, f, rng)
            : (dungeon.monsterPool || []).slice();
        const roomCount = rollRoomCount(rng, dungeon);
        const rooms = [];

        for (let r = 0; r < roomCount; r++) {
            const archetype = weightedPickArchetype(rng);
            const isBoss = archetype.id === 'boss' || (r === roomCount - 1 && f === floorCount - 1 && rng() < 0.35);
            const enemyCount = rollEnemyCount(rng, archetype, f, isBoss);
            const mults = floorStatMults(f, enemyCount);
            const enemies = resolveEnemiesForRoom(namePool, enemyCount, rng, mults, dungeon);

            if (!enemies.length && namePool.length) {
                const fallback = findMonsterTemplateByName(namePool[0]);
                if (fallback) enemies.push(buildScaledEnemy(fallback, mults, dungeon));
            }

            rooms.push({
                archetype: archetype.id,
                enemies: enemies,
                isBoss: isBoss
            });
        }

        floors.push({ index: f, rooms: rooms });
    }

    return { dungeonId: dungeonId, seed: resolvedSeed, floors: floors };
}

window.mulberry32 = mulberry32;
window.generateDungeonRun = generateDungeonRun;
