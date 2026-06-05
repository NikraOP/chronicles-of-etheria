// dungeonMonsters.js — враги подземелий (img только на существующие файлы в monsters/)

const DUNGEON_MONSTERS_DB = [
    {
        id: 'infernal_cinder',
        name: 'Угольный бес',
        icon: '🔥',
        img: './monsters/fireSlamandr.png',
        hp: 540,
        atk: 82,
        def: 14,
        exp: 105,
        tier: 'normal',
        abilities: [
            { name: 'Искра', type: 'damage', multiplier: 1.15, chance: 75 },
            { name: 'Жар', type: 'dot', effect: 'burn', value: 6, duration: 2, chance: 40, cooldown: 3 }
        ]
    },
    {
        id: 'infernal_hound',
        name: 'Пламенный пес',
        icon: '🐕‍🦺',
        img: './monsters/dungeon/infernal-hound.png',
        hp: 820,
        atk: 108,
        def: 20,
        exp: 158,
        tier: 'elite',
        abilities: [
            { name: 'Огненный укус', type: 'damage', multiplier: 1.35, chance: 70 },
            { name: 'Пылающая шкура', type: 'dot', effect: 'burn', value: 12, duration: 3, chance: 55, cooldown: 2 },
            { name: 'Рывок пламени', type: 'buff', effect: 'atk', value: 28, duration: 2, chance: 38, cooldown: 4 }
        ]
    },
    {
        id: 'ash_lord',
        name: 'Повелитель пепла',
        icon: '👑',
        img: './monsters/dungeon/ash-overlord.png',
        hp: 1180,
        atk: 96,
        def: 30,
        exp: 215,
        tier: 'floor_boss',
        abilities: [
            { name: 'Пепельная буря', type: 'damage', multiplier: 1.45, chance: 55, cooldown: 2 },
            { name: 'Погребение', type: 'debuff', effect: 'atk', value: 25, duration: 2, chance: 45, cooldown: 3 },
            { name: 'Тлеющий ореол', type: 'dot', effect: 'burn', value: 14, duration: 3, chance: 50, cooldown: 3 },
            { name: 'Трон из углей', type: 'buff', effect: 'def', value: 45, duration: 2, chance: 40, cooldown: 4 }
        ]
    },
    {
        id: 'crystal_wisp',
        name: 'Кристальный осколок',
        icon: '✨',
        img: './monsters/CristalElemement.png',
        hp: 620,
        atk: 88,
        def: 16,
        exp: 118,
        tier: 'normal',
        abilities: [
            { name: 'Световой укол', type: 'damage', multiplier: 1.2, chance: 80 },
            { name: 'Преломление', type: 'buff', effect: 'dodge', value: 18, duration: 2, chance: 35, cooldown: 3 }
        ]
    },
    {
        id: 'neon_dragon',
        name: 'Неоновый дракон',
        icon: '🐲',
        img: './monsters/dungeon/neon-dragon.png',
        hp: 940,
        atk: 118,
        def: 22,
        exp: 175,
        tier: 'elite',
        abilities: [
            { name: 'Неоновый залп', type: 'damage', multiplier: 0.75, hits: 3, chance: 55, cooldown: 2 },
            { name: 'Плазменное дыхание', type: 'damage', multiplier: 1.5, chance: 50, cooldown: 3 },
            { name: 'Слепящий спектр', type: 'debuff', effect: 'blind', value: 30, duration: 2, chance: 42, cooldown: 4 }
        ]
    },
    {
        id: 'crystal_sentinel',
        name: 'Хрустальный страж',
        icon: '💎',
        img: './monsters/cristalBog.png',
        hp: 1280,
        atk: 102,
        def: 34,
        exp: 228,
        tier: 'floor_boss',
        abilities: [
            { name: 'Кристальный взрыв', type: 'damage', multiplier: 1.55, chance: 52, cooldown: 2 },
            { name: 'Оскольчатый град', type: 'damage', multiplier: 0.7, hits: 4, chance: 45, cooldown: 3 },
            { name: 'Гранёный панцирь', type: 'buff', effect: 'def', value: 55, duration: 2, chance: 48, cooldown: 4 }
        ]
    },
    {
        id: 'void_shade',
        name: 'Тень бездны',
        icon: '👤',
        img: './monsters/CristalPriz.png',
        hp: 780,
        atk: 112,
        def: 18,
        exp: 142,
        tier: 'normal',
        abilities: [
            { name: 'Удар из пустоты', type: 'damage', multiplier: 1.3, chance: 68 },
            { name: 'Поглощение света', type: 'debuff', effect: 'atk', value: 22, duration: 2, chance: 44, cooldown: 3 }
        ]
    },
    {
        id: 'distorted_warden',
        name: 'Искажённый страж',
        icon: '🛡️',
        img: './monsters/dungeon/void-wretch.png',
        hp: 1420,
        atk: 108,
        def: 36,
        exp: 248,
        tier: 'floor_boss',
        abilities: [
            { name: 'Разрыв реальности', type: 'damage', multiplier: 1.6, chance: 50, cooldown: 2 },
            { name: 'Искажение разума', type: 'debuff', effect: 'blind', value: 40, duration: 2, chance: 48, cooldown: 3 },
            { name: 'Тюремные оковы', type: 'debuff', effect: 'slow', value: 35, duration: 2, chance: 45, cooldown: 3 },
            { name: 'Барьер пустоты', type: 'shield', value: 30, duration: 2, chance: 40, cooldown: 4 }
        ]
    },
    {
        id: 'cyber_dragon',
        name: 'Кибер-дракон',
        icon: '🤖',
        img: './monsters/dungeon/cyber-dragon.png',
        hp: 1350,
        atk: 148,
        def: 26,
        exp: 255,
        tier: 'floor_boss',
        abilities: [
            { name: 'Плазменный резак', type: 'damage', multiplier: 1.75, chance: 58, cooldown: 2 },
            { name: 'Перегрузка', type: 'damage', multiplier: 1.2, hits: 2, chance: 50, cooldown: 2 },
            { name: 'Боевой протокол', type: 'buff', effect: 'atk', value: 45, duration: 2, chance: 42, cooldown: 4 }
        ]
    },
    {
        id: 'spore_cap',
        name: 'Споровый шляпник',
        icon: '🍄',
        img: './monsters/spider.png',
        hp: 580,
        atk: 78,
        def: 16,
        exp: 112,
        tier: 'normal',
        abilities: [
            { name: 'Облако спор', type: 'dot', effect: 'poison', value: 7, duration: 2, chance: 50, cooldown: 2 },
            { name: 'Удар грибницы', type: 'damage', multiplier: 1.2, chance: 72 }
        ]
    },
    {
        id: 'mushroom_golem',
        name: 'Грибной голем',
        icon: '🗿',
        img: './monsters/dungeon/spore-golem.png',
        hp: 860,
        atk: 94,
        def: 26,
        exp: 165,
        tier: 'elite',
        abilities: [
            { name: 'Токсичный газ', type: 'dot', effect: 'poison', value: 11, duration: 3, chance: 55, cooldown: 2 },
            { name: 'Грибной удар', type: 'damage', multiplier: 1.4, chance: 65 },
            { name: 'Мицелиевая броня', type: 'buff', effect: 'def', value: 40, duration: 2, chance: 40, cooldown: 4 }
        ]
    },
    {
        id: 'fungal_matriarch',
        name: 'Матриарх спор',
        icon: '👑',
        img: './monsters/lagKrov.png',
        hp: 1220,
        atk: 100,
        def: 32,
        exp: 220,
        tier: 'floor_boss',
        abilities: [
            { name: 'Цветение яда', type: 'dot', effect: 'poison', value: 15, duration: 3, chance: 52, cooldown: 2 },
            { name: 'Споровый взрыв', type: 'damage', multiplier: 1.45, chance: 55, cooldown: 2 },
            { name: 'Укоренение', type: 'heal', value: 18, chance: 38, cooldown: 4 }
        ]
    },
    {
        id: 'frost_lurker',
        name: 'Ледяной лазутчик',
        icon: '❄️',
        img: './monsters/iceWolf.png',
        hp: 700,
        atk: 96,
        def: 18,
        exp: 128,
        tier: 'normal',
        abilities: [
            { name: 'Ледяной кинжал', type: 'damage', multiplier: 1.25, chance: 70 },
            { name: 'Иней', type: 'debuff', effect: 'slow', value: 25, duration: 2, chance: 45, cooldown: 3 }
        ]
    },
    {
        id: 'ice_colossus',
        name: 'Ледяной колосс',
        icon: '🧊',
        img: './monsters/dungeon/frost-colossus.png',
        hp: 980,
        atk: 102,
        def: 32,
        exp: 182,
        tier: 'elite',
        abilities: [
            { name: 'Ледяной удар', type: 'damage', multiplier: 1.5, chance: 60, cooldown: 2 },
            { name: 'Вечная мерзлота', type: 'debuff', effect: 'slow', value: 40, duration: 2, chance: 50, cooldown: 3 },
            { name: 'Ледяная броня', type: 'buff', effect: 'def', value: 50, duration: 2, chance: 42, cooldown: 4 }
        ]
    },
    {
        id: 'glacier_heart',
        name: 'Сердце ледника',
        icon: '💠',
        img: './monsters/iceEti.png',
        hp: 1380,
        atk: 110,
        def: 38,
        exp: 242,
        tier: 'floor_boss',
        abilities: [
            { name: 'Ледниковый разлом', type: 'damage', multiplier: 1.65, chance: 52, cooldown: 2 },
            { name: 'Заморозка', type: 'debuff', effect: 'freeze', duration: 1, chance: 32, cooldown: 4 },
            { name: 'Снежная буря', type: 'damage', multiplier: 0.85, hits: 3, chance: 48, cooldown: 3 }
        ]
    },
    {
        id: 'sky_drone',
        name: 'Небесный дрон',
        icon: '🛸',
        img: './monsters/besk.png',
        hp: 820,
        atk: 118,
        def: 20,
        exp: 148,
        tier: 'normal',
        abilities: [
            { name: 'Импульсный луч', type: 'damage', multiplier: 1.3, chance: 72 },
            { name: 'Уклонение', type: 'buff', effect: 'dodge', value: 22, duration: 2, chance: 38, cooldown: 3 }
        ]
    },
    {
        id: 'cloud_stalker',
        name: 'Облачный охотник',
        icon: '☁️',
        img: './monsters/grifonRaz.png',
        hp: 900,
        atk: 124,
        def: 22,
        exp: 162,
        tier: 'normal',
        abilities: [
            { name: 'Ветровой срез', type: 'damage', multiplier: 1.35, chance: 68 },
            { name: 'Грозовой залп', type: 'damage', multiplier: 0.8, hits: 2, chance: 48, cooldown: 2 }
        ]
    },
    {
        id: 'three_headed_hydra',
        name: 'Трёхглавая гидра',
        icon: '🐉',
        img: './monsters/dungeon/tri-hydra.png',
        hp: 2850,
        atk: 198,
        def: 40,
        exp: 430,
        tier: 'final_boss',
        abilities: [
            { name: 'Тройное дыхание', type: 'damage', multiplier: 1.2, hits: 3, chance: 55, cooldown: 2 },
            { name: 'Ядовитая голова', type: 'dot', effect: 'poison', value: 14, duration: 3, chance: 48, cooldown: 3 },
            { name: 'Огненная голова', type: 'dot', effect: 'burn', value: 12, duration: 3, chance: 48, cooldown: 3 },
            { name: 'Регенерация гидры', type: 'heal', value: 22, chance: 35, cooldown: 4 },
            { name: 'Раздирающий укус', type: 'damage', multiplier: 1.9, chance: 40, cooldown: 3 }
        ]
    },
    {
        id: 'shadow_stalker',
        name: 'Теневой акулёныш',
        icon: '🐾',
        img: './monsters/dungeon/ten-akul.png',
        hp: 650,
        atk: 90,
        def: 16,
        exp: 120,
        tier: 'normal',
        abilities: [
            { name: 'Копьё тьмы', type: 'damage', multiplier: 1.25, chance: 75 },
            { name: 'Скрытность', type: 'buff', effect: 'dodge', value: 20, duration: 2, chance: 35, cooldown: 3 }
        ]
    },
    {
        id: 'twilight_whisp',
        name: 'Теневой глаз',
        icon: '✨',
        img: './monsters/dungeon/ten-glas.png',
        hp: 520,
        atk: 76,
        def: 12,
        exp: 98,
        tier: 'normal',
        abilities: [
            { name: 'Вспышка', type: 'damage', multiplier: 1.15, chance: 80 },
            { name: 'Мерцание', type: 'buff', effect: 'dodge', value: 16, duration: 2, chance: 30, cooldown: 3 }
        ]
    },
    {
        id: 'venom_frog',
        name: 'Теневой паук',
        icon: '🐸',
        img: './monsters/dungeon/ten-spider.png',
        hp: 580,
        atk: 72,
        def: 14,
        exp: 105,
        tier: 'normal',
        abilities: [
            { name: 'Кислотный плевок', type: 'dot', effect: 'poison', value: 6, duration: 2, chance: 45, cooldown: 2 },
            { name: 'Прыжок', type: 'damage', multiplier: 1.2, chance: 70 }
        ]
    },
    {
        id: 'dark_vine',
        name: 'Теневая горгания',
        icon: '🌿',
        img: './monsters/dungeon/ten-gargon.png',
        hp: 610,
        atk: 82,
        def: 18,
        exp: 112,
        tier: 'normal',
        abilities: [
            { name: 'Взгляд', type: 'damage', multiplier: 1.3, chance: 65 },
            { name: 'Закаменение', type: 'debuff', effect: 'slow', value: 20, duration: 2, chance: 40, cooldown: 3 }
        ]
    },
    {
        id: 'shadow_elf',
        name: 'Теневой скорпион',
        icon: '🧝',
        img: './monsters/dungeon/ten-scorp.png',
        hp: 850,
        atk: 104,
        def: 20,
        exp: 155,
        tier: 'elite',
        abilities: [
            { name: 'Тёмный плевок', type: 'damage', multiplier: 1.35, chance: 65 },
            { name: 'Лунное уклонение', type: 'buff', effect: 'dodge', value: 25, duration: 2, chance: 40, cooldown: 3 },
            { name: 'Отравленное жало', type: 'dot', effect: 'poison', value: 9, duration: 2, chance: 48, cooldown: 2 }
        ]
    },
    {
        id: 'treant_elder',
        name: 'Древний минотавр',
        icon: '🌳',
        img: './monsters/dungeon/ten-mintowr.png',
        hp: 1320,
        atk: 106,
        def: 34,
        exp: 235,
        tier: 'floor_boss',
        abilities: [
            { name: 'Топорный удар', type: 'damage', multiplier: 1.55, chance: 55, cooldown: 2 },
            { name: 'Тёмная броня', type: 'buff', effect: 'def', value: 50, duration: 2, chance: 45, cooldown: 4 },
            { name: 'Теневой ритуал', type: 'heal', value: 20, chance: 40, cooldown: 3 },
            { name: 'Буйство теней', type: 'damage', multiplier: 0.7, hits: 4, chance: 42, cooldown: 3 }
        ]
    },
    {
        id: 'ancient_ent',
        name: 'Спайрикс',
        icon: '🌳',
        img: './monsters/dungeon/ten-zmei.png',
        hp: 2200,
        atk: 168,
        def: 42,
        exp: 380,
        tier: 'final_boss',
        abilities: [
            { name: 'Опустошение', type: 'damage', multiplier: 2, chance: 55, cooldown: 2 },
            { name: 'Призыв теней', type: 'damage', multiplier: 1.1, hits: 3, chance: 48, cooldown: 2 },
            { name: 'Благословение затмения', type: 'heal', value: 25, chance: 38, cooldown: 4 },
            { name: 'Гнев тенец', type: 'buff', effect: 'atk', value: 55, duration: 2, chance: 42, cooldown: 4 },
            { name: 'Опутывающие лозы', type: 'debuff', effect: 'freeze', duration: 1, chance: 25, cooldown: 5 }
        ]
    }
];

function getDungeonMonsterById(id) {
    if (!id || !Array.isArray(DUNGEON_MONSTERS_DB)) return null;
    return DUNGEON_MONSTERS_DB.find(function (m) { return m.id === id; }) || null;
}

function findDungeonMonsterById(id) {
    return getDungeonMonsterById(id);
}

/**
 * Шаблон монстра подземелья по id или отображаемому имени.
 * @param {string} key — id (infernal_hound) или name (Пламенный пес)
 */
function findDungeonMonsterTemplate(key) {
    if (!key || !Array.isArray(DUNGEON_MONSTERS_DB)) return null;
    const byId = getDungeonMonsterById(key);
    if (byId) return byId;
    return DUNGEON_MONSTERS_DB.find(function (m) { return m.name === key; }) || null;
}

if (typeof window !== 'undefined') {
    window.DUNGEON_MONSTERS_DB = DUNGEON_MONSTERS_DB;
    window.getDungeonMonsterById = getDungeonMonsterById;
    window.findDungeonMonsterById = findDungeonMonsterById;
    window.findDungeonMonsterTemplate = findDungeonMonsterTemplate;
}
