// dungeons.js — данжи, архетипы комнат и баланс паков врагов

const DUNGEON_BALANCE = {
    packHp: {
        solo: { 1: 1.05, 2: 0.55, 3: 0.42 },
        duo: { 1: 0.95, 2: 0.50, 3: 0.38 }
    },
    packAtk: {
        solo: { 1: 1.0, 2: 0.92, 3: 0.88 },
        duo: { 1: 1.0, 2: 0.95, 3: 0.9 }
    },
    modeHp: { solo: 0.85, duo: 1.35 },
    modeAtk: { solo: 0.85, duo: 1.15 },
    reward: {
        solo: { gold: 1.0, exp: 1.0 },
        duo: { gold: 1.3, exp: 1.3 }
    },
    floorGoldStep: 0.1,
    floorExpStep: 0.08,
    floorThreatStep: 0.12,
    recommendedSoloFactor: 0.4,
    recommendedDuoFactor: 0.45,
    soloHpPackMult: 0.42,
    duoHpPackMult: 0.38,
    soloAtkMult: 0.88,
    duoAtkMult: 0.9,
    enemiesPerRoomMin: 1,
    enemiesPerRoomMax: 3,
    floorCountMin: 2,
    floorCountMax: 5
};

const ROOM_ARCHETYPES = {
    corridor: {
        id: 'corridor',
        name: 'Коридор',
        icon: '🚪',
        weight: 32,
        enemyCountBias: -1
    },
    chamber: {
        id: 'chamber',
        name: 'Зал',
        icon: '🏛️',
        weight: 26,
        enemyCountBias: 0
    },
    nest: {
        id: 'nest',
        name: 'Гнездо',
        icon: '🕸️',
        weight: 22,
        enemyCountBias: 1
    },
    shrine: {
        id: 'shrine',
        name: 'Святыня',
        icon: '✨',
        weight: 14,
        enemyCountBias: -1
    },
    boss: {
        id: 'boss',
        name: 'Босс',
        icon: '💀',
        weight: 6,
        enemyCountBias: 0
    }
};

const DUNGEONS_DB = [
    {
        id: 'twilight_den',
        name: 'Сумеречное логово',
        icon: '🌲',
        mode: 'solo',
        minLevel: 1,
        maxLevel: 8,
        recommendedLevel: 4,
        monsterPool: ['Гоблин-берсерк', 'Серый волк', 'Ядовитый паук'],
        floors: { min: 2, max: 3 },
        roomsPerFloor: { min: 4, max: 6 },
        goldMult: 10,
        expMult: 1.15,
        theme: {
            bgColor: 'linear-gradient(135deg, #1a3a1a, #0d1f0d)'
        }
    },
    {
        id: 'orc_hold',
        name: 'Орочья крепость',
        icon: '⛰️',
        mode: 'solo',
        minLevel: 8,
        maxLevel: 18,
        recommendedLevel: 12,
        monsterPool: ['Орк-воин', 'Орк-шаман', 'Вождь орков'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 5, max: 7 },
        goldMult: 12,
        expMult: 1.2,
        theme: {
            bgColor: 'linear-gradient(135deg, #2a2a3a, #1a1a2a)'
        }
    },
    {
        id: 'crystal_depths',
        name: 'Кристальные глубины',
        icon: '💎',
        mode: 'solo',
        minLevel: 28,
        maxLevel: 38,
        recommendedLevel: 32,
        monsterPool: ['Кристальный убийца', 'Фантомный призрак', 'Хранитель бездны'],
        floors: { min: 3, max: 5 },
        roomsPerFloor: { min: 5, max: 8 },
        goldMult: 16,
        expMult: 1.35,
        theme: {
            bgColor: 'linear-gradient(135deg, #1a1a3a, #0a0a2a)'
        }
    },
    {
        id: 'frozen_pass',
        name: 'Ледяной проход',
        icon: '🏔️',
        mode: 'duo',
        minLevel: 12,
        maxLevel: 22,
        recommendedLevel: 16,
        monsterPool: ['Ледяной волк', 'Элементаль льда', 'Йети-вожак'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 6, max: 8 },
        goldMult: 14,
        expMult: 1.25,
        theme: {
            bgColor: 'linear-gradient(135deg, #e8f0f8, #c8d8e8)'
        }
    },
    {
        id: 'abyss_trench',
        name: 'Бездна океана',
        icon: '🌊',
        mode: 'duo',
        minLevel: 35,
        maxLevel: 45,
        recommendedLevel: 40,
        monsterPool: ['Кракен-ужас', 'Морской дракон', 'Легендарный кракен'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 6, max: 9 },
        goldMult: 18,
        expMult: 1.4,
        theme: {
            bgColor: 'linear-gradient(135deg, #0a1a3a, #050a1a)'
        }
    }
];

function getDungeonById(id) {
    return DUNGEONS_DB.find(d => d.id === id) || null;
}

/**
 * Выбирает пул монстров для этажа: чем выше этаж, тем больше «тяжёлых» имён из monsterPool.
 * @param {object} dungeon — запись из DUNGEONS_DB
 * @param {number} floorIndex — 0-based индекс этажа
 * @param {() => number} rng — функция случайного числа [0, 1)
 * @returns {string[]} имена монстров для комнат этажа
 */
function pickDungeonMonsterPool(dungeon, floorIndex, rng) {
    if (!dungeon || !Array.isArray(dungeon.monsterPool) || dungeon.monsterPool.length === 0) {
        return [];
    }

    const pool = dungeon.monsterPool;
    const floorCount = dungeon.floors?.max || DUNGEON_BALANCE.floorCountMax;
    const progress = floorCount <= 1 ? 1 : floorIndex / (floorCount - 1);

    const tierSize = Math.max(1, Math.ceil(pool.length / floorCount));
    const maxTier = Math.min(pool.length, Math.ceil((progress + 0.35) * pool.length));
    const minTier = Math.max(1, maxTier - tierSize + 1);
    const slice = pool.slice(minTier - 1, maxTier);

    const pickCount = Math.min(
        DUNGEON_BALANCE.enemiesPerRoomMax,
        Math.max(DUNGEON_BALANCE.enemiesPerRoomMin, slice.length)
    );

    const picked = [];
    const available = slice.slice();

    for (let i = 0; i < pickCount && available.length > 0; i++) {
        const idx = Math.floor(rng() * available.length);
        picked.push(available[idx]);
        available.splice(idx, 1);
    }

    return picked;
}
