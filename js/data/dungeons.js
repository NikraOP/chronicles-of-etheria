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
    enemiesPerRoomMin: 2,
    enemiesPerRoomMax: 3,
    soloThreatMult: 0.78,
    floorCountMin: 2,
    floorCountMax: 5
};

const ROOM_ARCHETYPES = {
    corridor: {
        id: 'corridor',
        name: 'Коридор',
        icon: '🚪',
        weight: 32,
        enemyCountBias: 0,
        desc: 'Узкий проход. Обычно 2 врага — чуть меньше давления, чем в зале.'
    },
    chamber: {
        id: 'chamber',
        name: 'Зал',
        icon: '🏛️',
        weight: 26,
        enemyCountBias: 0,
        desc: 'Просторный зал. 2–3 врага, классическая боевая комната.'
    },
    nest: {
        id: 'nest',
        name: 'Гнездо',
        icon: '🕸️',
        weight: 22,
        enemyCountBias: 1,
        desc: 'Логово монстров. Чаще 3 врага — толпа послабее по отдельности.'
    },
    shrine: {
        id: 'shrine',
        name: 'Святыня',
        icon: '✨',
        weight: 14,
        enemyCountBias: -1,
        desc: 'Без боя. Восстанавливает 30% максимального HP и открывает следующую комнату.'
    },
    boss: {
        id: 'boss',
        name: 'Босс',
        icon: '💀',
        weight: 6,
        enemyCountBias: 0,
        desc: 'Один усиленный противник. Больше HP и особые способности.'
    }
};

const DUNGEON_BACKGROUNDS = {
    infernal: { image: './backgrounds/dungeon/bg-crypt.png', bgColor: 'linear-gradient(135deg, #4a1810, #1a0806)' },
    crystal_cavern: { image: './backgrounds/dungeon/bg-crystal.png', bgColor: 'linear-gradient(135deg, #2a1a4a, #12082a)' },
    fungal_depths: { image: './backgrounds/dungeon/bg-cave-brown.png', bgColor: 'linear-gradient(135deg, #1a3a22, #0a1a10)' },
    frozen_abyss: { image: './backgrounds/dungeon/bg-crystal.png', bgColor: 'linear-gradient(135deg, #1a2a3a, #0a1520)' },
    void_prison: { image: './backgrounds/dungeon/bg-prison.png', bgColor: 'linear-gradient(135deg, #12081a, #050208)' },
    sky_ruins: { image: './backgrounds/dungeon/bg-cave-brown.png', bgColor: 'linear-gradient(135deg, #2a3a5a, #101828)' },
    default: { image: './backgrounds/dungeon/bg-crypt.png', bgColor: 'linear-gradient(135deg, #1a1a2a, #0a0a12)' }
};

function getDungeonBackground(dungeonOrId) {
    const dungeon = typeof dungeonOrId === 'string' ? getDungeonById(dungeonOrId) : dungeonOrId;
    if (!dungeon) return DUNGEON_BACKGROUNDS.default;
    const key = dungeon.backgroundId || 'default';
    return DUNGEON_BACKGROUNDS[key] || DUNGEON_BACKGROUNDS.default;
}

function getDungeonBattleArenaStyle(dungeonOrId) {
    const bg = getDungeonBackground(dungeonOrId);
    const img = bg.image ? "url('" + bg.image + "')" : 'none';
    return 'background:' + (bg.bgColor || '#111') + ';background-image:' + img +
        ';background-size:cover;background-position:center;';
}

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
    },
    {
        id: 'infernal_pit',
        name: 'Инфернальная яма',
        icon: '🔥',
        mode: 'solo',
        minLevel: 15,
        maxLevel: 22,
        recommendedLevel: 18,
        backgroundId: 'infernal',
        finalBossId: 'ash_lord',
        monsterPool: ['infernal_cinder', 'infernal_hound', 'ash_lord'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 5, max: 7 },
        goldMult: 13,
        expMult: 1.22,
        theme: {
            bgColor: 'linear-gradient(135deg, #4a1810, #1a0806)'
        }
    },
    {
        id: 'crystal_cavern',
        name: 'Кристальная пещера',
        icon: '💠',
        mode: 'solo',
        minLevel: 20,
        maxLevel: 28,
        recommendedLevel: 24,
        backgroundId: 'crystal_cavern',
        finalBossId: 'crystal_sentinel',
        monsterPool: ['crystal_wisp', 'neon_dragon', 'crystal_sentinel'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 5, max: 7 },
        goldMult: 14,
        expMult: 1.25,
        theme: {
            bgColor: 'linear-gradient(135deg, #2a1a4a, #12082a)'
        }
    },
    {
        id: 'fungal_depths',
        name: 'Грибные глубины',
        icon: '🍄',
        mode: 'solo',
        minLevel: 18,
        maxLevel: 26,
        recommendedLevel: 22,
        backgroundId: 'fungal_depths',
        finalBossId: 'fungal_matriarch',
        monsterPool: ['spore_cap', 'mushroom_golem', 'fungal_matriarch'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 5, max: 7 },
        goldMult: 13,
        expMult: 1.23,
        theme: {
            bgColor: 'linear-gradient(135deg, #1a3a22, #0a1a10)'
        }
    },
    {
        id: 'frozen_abyss',
        name: 'Ледяная бездна',
        icon: '🧊',
        mode: 'duo',
        minLevel: 24,
        maxLevel: 32,
        recommendedLevel: 28,
        backgroundId: 'frozen_abyss',
        finalBossId: 'glacier_heart',
        monsterPool: ['frost_lurker', 'ice_colossus', 'glacier_heart'],
        floors: { min: 3, max: 4 },
        roomsPerFloor: { min: 6, max: 8 },
        goldMult: 15,
        expMult: 1.28,
        theme: {
            bgColor: 'linear-gradient(135deg, #1a2a3a, #0a1520)'
        }
    },
    {
        id: 'void_prison',
        name: 'Тюрьма пустоты',
        icon: '🌀',
        mode: 'duo',
        minLevel: 30,
        maxLevel: 40,
        recommendedLevel: 35,
        backgroundId: 'void_prison',
        finalBossId: 'distorted_warden',
        monsterPool: ['void_shade', 'cyber_dragon', 'distorted_warden'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 6, max: 8 },
        goldMult: 16,
        expMult: 1.32,
        theme: {
            bgColor: 'linear-gradient(135deg, #12081a, #050208)'
        }
    },
    {
        id: 'sky_ruins',
        name: 'Руины небес',
        icon: '☁️',
        mode: 'duo',
        minLevel: 38,
        maxLevel: 50,
        recommendedLevel: 44,
        backgroundId: 'sky_ruins',
        finalBossId: 'three_headed_hydra',
        monsterPool: ['sky_drone', 'cloud_stalker', 'neon_dragon', 'three_headed_hydra'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 6, max: 9 },
        goldMult: 18,
        expMult: 1.38,
        theme: {
            bgColor: 'linear-gradient(135deg, #2a3a5a, #101828)'
        }
    },
    {
        id: 'void_citadel',
        name: 'Цитадель пустоты',
        icon: '🌑',
        mode: 'solo',
        minLevel: 30,
        maxLevel: 38,
        recommendedLevel: 34,
        backgroundId: 'void_prison',
        finalBossId: 'distorted_warden',
        monsterPool: ['void_shade', 'cyber_dragon', 'distorted_warden'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 6, max: 8 },
        goldMult: 16,
        expMult: 1.32,
        theme: { bgColor: 'linear-gradient(135deg, #12081a, #050208)' }
    },
    {
        id: 'storm_spire',
        name: 'Штормовая башня',
        icon: '⚡',
        mode: 'solo',
        minLevel: 40,
        maxLevel: 48,
        recommendedLevel: 44,
        backgroundId: 'sky_ruins',
        finalBossId: 'neon_dragon',
        monsterPool: ['sky_drone', 'cloud_stalker', 'neon_dragon', 'crystal_sentinel'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 6, max: 9 },
        goldMult: 17,
        expMult: 1.36,
        theme: { bgColor: 'linear-gradient(135deg, #2a3a5a, #101828)' }
    },
    {
        id: 'elder_maw',
        name: 'Пасть древних',
        icon: '🐲',
        mode: 'solo',
        minLevel: 50,
        maxLevel: 58,
        recommendedLevel: 54,
        backgroundId: 'infernal',
        finalBossId: 'ash_lord',
        monsterPool: ['frost_lurker', 'ice_colossus', 'glacier_heart', 'ash_lord'],
        floors: { min: 4, max: 5 },
        roomsPerFloor: { min: 7, max: 9 },
        goldMult: 19,
        expMult: 1.42,
        theme: { bgColor: 'linear-gradient(135deg, #4a1810, #1a0806)' }
    },
    {
        id: 'oblivion_core',
        name: 'Ядро забвения',
        icon: '☠️',
        mode: 'solo',
        minLevel: 60,
        maxLevel: 75,
        recommendedLevel: 68,
        backgroundId: 'void_prison',
        finalBossId: 'three_headed_hydra',
        monsterPool: ['cyber_dragon', 'ash_lord', 'glacier_heart', 'three_headed_hydra'],
        floors: { min: 5, max: 6 },
        roomsPerFloor: { min: 7, max: 10 },
        goldMult: 22,
        expMult: 1.55,
        theme: { bgColor: 'linear-gradient(135deg, #1a0818, #030208)' }
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
 * @returns {string[]} id или имена монстров для комнат этажа (см. findDungeonMonsterById)
 */
function pickDungeonMonsterPool(dungeon, floorIndex, rng, totalFloors) {
    if (!dungeon || !Array.isArray(dungeon.monsterPool) || dungeon.monsterPool.length === 0) {
        return [];
    }

    const pool = dungeon.monsterPool;
    const floorCount = totalFloors || dungeon.floors?.max || DUNGEON_BALANCE.floorCountMax;
    const progress = floorCount <= 1 ? 1 : floorIndex / (floorCount - 1);

    const tierSize = Math.max(1, Math.ceil(pool.length / floorCount));
    const maxTier = Math.min(pool.length, Math.ceil((progress + 0.35) * pool.length));
    const minTier = Math.max(1, maxTier - tierSize + 1);
    const slice = pool.slice(minTier - 1, maxTier);

    const picked = [];
    const available = slice.slice();
    const pickCount = Math.max(
        DUNGEON_BALANCE.enemiesPerRoomMin,
        Math.min(DUNGEON_BALANCE.enemiesPerRoomMax, available.length || DUNGEON_BALANCE.enemiesPerRoomMin)
    );

    for (let i = 0; i < pickCount; i++) {
        if (!available.length) {
            picked.push(slice[Math.floor(rng() * slice.length)]);
            continue;
        }
        const idx = Math.floor(rng() * available.length);
        picked.push(available[idx]);
        if (available.length > 1) available.splice(idx, 1);
    }

    return picked.length ? picked : pool.slice(0, Math.min(pool.length, DUNGEON_BALANCE.enemiesPerRoomMin));
}

if (typeof window !== 'undefined') {
    window.DUNGEON_BALANCE = DUNGEON_BALANCE;
    window.ROOM_ARCHETYPES = ROOM_ARCHETYPES;
    window.DUNGEONS_DB = DUNGEONS_DB;
    window.getDungeonById = getDungeonById;
    window.pickDungeonMonsterPool = pickDungeonMonsterPool;
    window.DUNGEON_BACKGROUNDS = DUNGEON_BACKGROUNDS;
    window.getDungeonBackground = getDungeonBackground;
    window.getDungeonBattleArenaStyle = getDungeonBattleArenaStyle;
}
