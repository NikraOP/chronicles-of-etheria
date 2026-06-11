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

function normalizeLocationDungeonTemplate(template) {
    if (!template) return null;
    const t = Object.assign({}, template);
    const thr = DUNGEON_BALANCE.locationLegacyHpThreshold || 1500;
    if (t.hp > thr) {
        t.hp = Math.floor(t.hp * (DUNGEON_BALANCE.locationLegacyHpMult || 0.75));
        t.atk = Math.floor(t.atk * (DUNGEON_BALANCE.locationLegacyAtkMult || 0.85));
    }
    return t;
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
            if (monsters[j].name === name) {
                return normalizeLocationDungeonTemplate(monsters[j]);
            }
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
    if (!pool || !pool.length) return [];
    const picked = [];
    const available = pool.slice();
    for (let i = 0; i < count; i++) {
        if (available.length > 1) {
            const idx = Math.floor(rng() * available.length);
            picked.push(available[idx]);
            available.splice(idx, 1);
        } else {
            picked.push(pool[Math.floor(rng() * pool.length)]);
        }
    }
    return picked;
}

function rollRoomCount(rng, dungeon) {
    const cfg = dungeon.roomsPerFloor || { min: 3, max: 5 };
    const lo = Math.max(2, cfg.min != null ? cfg.min : 3);
    const hi = Math.max(lo, cfg.max != null ? cfg.max : 5);
    return dungeonRandInt(rng, lo, hi);
}

function rollFloorCount(rng, dungeon) {
    const cfg = dungeon.floors || { min: 2, max: 3 };
    const lo = cfg.min || DUNGEON_BALANCE.floorCountMin;
    const hi = cfg.max || DUNGEON_BALANCE.floorCountMax;
    return dungeonRandInt(rng, lo, hi);
}

function rollEnemyCount(rng, archetype, floorIndex, isBoss, mode) {
    if (isBoss) return 1;
    let count = dungeonRandInt(rng, 2, 3);
    const bias = archetype && archetype.enemyCountBias != null ? archetype.enemyCountBias : 0;
    count = dungeonClamp(count + bias, DUNGEON_BALANCE.enemiesPerRoomMin, DUNGEON_BALANCE.enemiesPerRoomMax);
    return count;
}

function buildRoomPresentation(room) {
    if (!room) return { title: 'Комната', desc: '' };
    if (room.isShrine || room.archetype === 'shrine') {
        return {
            title: 'Святыня',
            desc: 'Без боя. Лечение 30% HP, затем переход дальше.'
        };
    }
    if (room.isFinalBoss) {
        const name = room.enemies && room.enemies[0] ? room.enemies[0].name : 'Финальный босс';
        return {
            title: '👑 ' + name,
            desc: 'Финал подземелья. Один босс — максимальная награда и сложность.'
        };
    }
    if (room.isBoss) {
        const name = room.enemies && room.enemies[0] ? room.enemies[0].name : 'Босс';
        return {
            title: '💀 ' + name,
            desc: 'Босс-комната: один усиленный враг.'
        };
    }
    const arch = typeof ROOM_ARCHETYPES !== 'undefined' && room.archetype
        ? ROOM_ARCHETYPES[room.archetype]
        : null;
    const n = room.enemies ? room.enemies.length : 0;
    const names = room.enemies && room.enemies.length
        ? room.enemies.map(function (e) { return e.name; }).join(', ')
        : '';
    return {
        title: (arch && arch.name) || 'Бой',
        desc: ((arch && arch.desc) || 'Схватка с монстрами.') +
            (n ? ' Сейчас: ' + n + ' вр.' + (names ? ' — ' + names : '') + '.' : '')
    };
}

function getDungeonFloorGoldMult(floorIndex) {
    return 1 + (floorIndex || 0) * (DUNGEON_BALANCE.floorGoldStep || 0.1);
}

function buildScaledEnemy(template, mults, dungeon, floorIndex) {
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

function resolveEnemiesForRoom(namePool, count, rng, mults, dungeon, floorIndex) {
    const names = pickNamesWithoutRepeat(namePool, count, rng);
    const enemies = [];
    for (let i = 0; i < names.length; i++) {
        const template = findMonsterTemplateByName(names[i]);
        if (!template) continue;
        enemies.push(buildScaledEnemy(template, mults, dungeon, floorIndex));
    }
    return enemies;
}

function getPackMult(table, enemyCount, fallback) {
    if (!table) return fallback;
    const n = Math.max(1, Math.min(3, enemyCount));
    return table[n] != null ? table[n] : fallback;
}

function getDungeonLevelHpMult(dungeon, floorIndex, isBoss) {
    if (!dungeon) return 1;
    const minLv = dungeon.minLevel || 1;
    const maxLv = dungeon.maxLevel || 50;
    const plv = (typeof player !== 'undefined' && player && player.level) ? player.level : minLv;
    // Ограничиваем прогрессию монстров: не ниже minLevel и не выше maxLevel подземелья
    // Если игрок выше maxLevel, монстры не становятся сильнее
    const lv = Math.max(minLv, Math.min(maxLv, plv));
    const floor = 1 + (floorIndex || 0) * (DUNGEON_BALANCE.floorThreatStep || 0.12);
    if (lv < 12) return Math.max(1, (0.35 + lv * 0.05) * floor);
    const B = DUNGEON_BALANCE;
    if (isBoss) {
        const raw = (B.levelHpBaseBoss || 0.62) + lv * (B.levelHpCoefBoss || 0.48);
        return Math.min(B.levelHpCapBoss || 6.35, raw * floor);
    }
    const raw = (B.levelHpBaseNormal || 0.42) + lv * (B.levelHpCoefNormal || 0.45);
    return Math.min(B.levelHpCapNormal || 5.2, raw * floor);
}

function floorStatMults(floorIndex, enemyCount, mode, dungeon) {
    const isDuo = mode === 'duo';
    const floorMult = 1 + floorIndex * (DUNGEON_BALANCE.floorThreatStep || 0.12);
    const levelHp = getDungeonLevelHpMult(dungeon, floorIndex, false);
    const packHpTable = isDuo ? DUNGEON_BALANCE.packHp.duo : DUNGEON_BALANCE.packHp.solo;
    const packAtkTable = isDuo ? DUNGEON_BALANCE.packAtk.duo : DUNGEON_BALANCE.packAtk.solo;
    const modeHp = isDuo ? DUNGEON_BALANCE.modeHp.duo : DUNGEON_BALANCE.modeHp.solo;
    const modeAtk = isDuo ? DUNGEON_BALANCE.modeAtk.duo : DUNGEON_BALANCE.modeAtk.solo;
    const packHp = getPackMult(packHpTable, enemyCount, isDuo ? 0.38 : 0.42);
    const packAtk = getPackMult(packAtkTable, enemyCount, isDuo ? 0.9 : 0.88);
    let hp = packHp * modeHp * floorMult;
    let atk = packAtk * modeAtk * floorMult;
    if (!isDuo) {
        const soloMult = DUNGEON_BALANCE.soloThreatMult != null ? DUNGEON_BALANCE.soloThreatMult : 0.78;
        hp *= soloMult;
        atk *= soloMult;
    }
    hp *= levelHp;
    atk *= 1 + Math.max(0, levelHp - 1) * (DUNGEON_BALANCE.levelAtkExcessFactor || 0.22);
    const modeKey = isDuo ? 'duo' : 'solo';
    const rewardExp = (DUNGEON_BALANCE.reward[modeKey] && DUNGEON_BALANCE.reward[modeKey].exp) || 1;
    return {
        hp: hp,
        atk: atk,
        def: floorMult * 0.95,
        exp: floorMult * rewardExp
    };
}

function floorRng(seed, floorIndex) {
    return mulberry32((seed >>> 0) ^ ((floorIndex + 1) * 7919));
}

function buildMidFloorBossEnemy(template, mults, dungeon, floorIndex) {
    const normalHp = getDungeonLevelHpMult(dungeon, floorIndex, false);
    const bossHp = getDungeonLevelHpMult(dungeon, floorIndex, true);
    const bossHpRatio = normalHp > 0 ? bossHp / normalHp : 1.12;
    const B = DUNGEON_BALANCE;
    const bossMults = {
        hp: mults.hp * bossHpRatio * (B.midFloorBossHpPackMult || 1.06),
        atk: mults.atk * (B.midFloorBossAtkMult || 1.06),
        def: mults.def * 1.10,
        exp: mults.exp * 1.25
    };
    return buildScaledEnemy(template, bossMults, dungeon, floorIndex);
}

function buildFinalBossEnemy(dungeon, floorIndex, mults, runMode) {
    const bossId = dungeon.finalBossId;
    if (!bossId) return null;
    const template = findMonsterTemplateByName(bossId);
    if (!template) return null;
    const normalHp = getDungeonLevelHpMult(dungeon, floorIndex, false);
    const bossHp = getDungeonLevelHpMult(dungeon, floorIndex, true);
    const bossHpRatio = normalHp > 0 ? bossHp / normalHp : 1;
    const B = DUNGEON_BALANCE;
    const bossMults = {
        hp: mults.hp * bossHpRatio * (B.finalBossHpPackMult || 1.10),
        atk: mults.atk * (B.finalBossAtkMult || 1.10),
        def: mults.def * (B.finalBossDefMult || 1.14),
        exp: mults.exp * (B.finalBossExpMult || 1.55)
    };
    return buildScaledEnemy(template, bossMults, dungeon, floorIndex);
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
            const mults = floorStatMults(floorIndex, 1, runMode, dungeon);
            const bossEnemy = buildFinalBossEnemy(dungeon, floorIndex, mults, runMode);
            if (bossEnemy) {
                const finalRoom = {
                    archetype: 'boss',
                    enemies: [bossEnemy],
                    isBoss: true,
                    isFinalBoss: true,
                    isShrine: false
                };
                const finalUi = buildRoomPresentation(finalRoom);
                finalRoom.title = finalUi.title;
                finalRoom.desc = finalUi.desc;
                rooms.push(finalRoom);
                continue;
            }
        }

        const archetype = weightedPickArchetype(rng, isLastFloor ? ['shrine'] : null);
        if (archetype.id === 'shrine') {
            const shrineRoom = {
                archetype: 'shrine',
                enemies: [],
                isBoss: false,
                isShrine: true
            };
            const shrineUi = buildRoomPresentation(shrineRoom);
            shrineRoom.title = shrineUi.title;
            shrineRoom.desc = shrineUi.desc;
            rooms.push(shrineRoom);
            continue;
        }

        const isBoss = archetype.id === 'boss' || (isLastFloor && r === roomCount - 1 && rng() < 0.28);
        const enemyCount = rollEnemyCount(rng, archetype, floorIndex, isBoss, runMode);
        const mults = floorStatMults(floorIndex, enemyCount, runMode, dungeon);
        const enemies = resolveEnemiesForRoom(poolForRooms, enemyCount, rng, mults, dungeon, floorIndex);

        if (!enemies.length && poolForRooms.length) {
            const fallback = findMonsterTemplateByName(poolForRooms[0]);
            if (fallback) enemies.push(buildScaledEnemy(fallback, mults, dungeon, floorIndex));
        }

        if (isBoss && !isFinalRoom && enemies.length === 1) {
            const tpl = findMonsterTemplateByName(enemies[0].name);
            if (tpl) enemies[0] = buildMidFloorBossEnemy(tpl, mults, dungeon, floorIndex);
        }

        const combatRoom = {
            archetype: archetype.id,
            enemies: enemies,
            isBoss: isBoss,
            isShrine: false
        };
        const combatUi = buildRoomPresentation(combatRoom);
        combatRoom.title = combatUi.title;
        combatRoom.desc = combatUi.desc;
        rooms.push(combatRoom);
    }

    if (!rooms.length) {
        const mults = floorStatMults(floorIndex, 1, runMode, dungeon);
        const fallback = findMonsterTemplateByName(poolForRooms[0] || namePool[0]);
        if (fallback) {
            rooms.push({
                archetype: 'chamber',
                enemies: [buildScaledEnemy(fallback, mults, dungeon, floorIndex)],
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
        floors.push(generateDungeonFloor(dungeonId, f, lazy.totalFloors, lazy.seed, lazy.mode));
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
