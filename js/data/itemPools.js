// js/data/itemPools.js - Пулы предметов для Колеса Фортуны
// Каждый пул содержит 4 предмета, сумма chance = 100
// Предметы сверены с EQUIPMENT_DB и consumables

var ITEM_POOLS = {
    // =========== УРОВНИ 1-10 (lvl 1-5, Обычный/Необычный) ===========
    '1-10': {
        pool1: [
            { name: 'Стальной меч',        slot: 'weapon',     chance: 25 },
            { name: 'Стальной шлем',       slot: 'helmet',     chance: 25 },
            { name: 'Стальной нагрудник',  slot: 'chest',      chance: 25 },
            { name: 'Зелье здоровья',      slot: 'consumable', chance: 25 }
        ],
        pool2: [
            { name: 'Боевой топор',        slot: 'weapon',     chance: 25 },
            { name: 'Закаленный шлем',     slot: 'helmet',     chance: 25 },
            { name: 'Закаленная броня',    slot: 'chest',      chance: 25 },
            { name: 'Малое зелье здоровья',slot: 'consumable', chance: 25 }
        ],
        pool3: [
            { name: 'Кристальный скипетр', slot: 'weapon',     chance: 25 },
            { name: 'Стальные поножи',     slot: 'pants',      chance: 25 },
            { name: 'Сапоги скорости',     slot: 'boots',      chance: 25 },
            { name: 'Малое зелье маны',    slot: 'consumable', chance: 25 }
        ]
    },

    // =========== УРОВНИ 11-20 (lvl 10-15, Редкий/Эпический) ===========
    '11-20': {
        pool1: [
            { name: 'Рыцарский меч',       slot: 'weapon',     chance: 25 },
            { name: 'Шлем рыцаря',         slot: 'helmet',     chance: 25 },
            { name: 'Драконья броня',      slot: 'chest',      chance: 25 },
            { name: 'Зелье здоровья',      slot: 'consumable', chance: 25 }
        ],
        pool2: [
            { name: 'Снайперский лук',     slot: 'weapon',     chance: 25 },
            { name: 'Титановый шлем',      slot: 'helmet',     chance: 25 },
            { name: 'Титановый доспех',    slot: 'chest',      chance: 25 },
            { name: 'Большое зелье здоровья', slot: 'consumable', chance: 25 }
        ],
        pool3: [
            { name: 'Посох архимага',      slot: 'weapon',     chance: 25 },
            { name: 'Поножи рыцаря',       slot: 'pants',      chance: 25 },
            { name: 'Крылатые сандалии',   slot: 'boots',      chance: 25 },
            { name: 'Зелье маны',          slot: 'consumable', chance: 25 }
        ]
    },

    // =========== УРОВНИ 21-30 (lvl 18-25, Эпический/Легендарный) ===========
    '21-30': {
        pool1: [
            { name: 'Благословенный клинок', slot: 'weapon',   chance: 25 },
            { name: 'Титановый шлем',        slot: 'helmet',   chance: 25 },
            { name: 'Титановый доспех',      slot: 'chest',    chance: 25 },
            { name: 'Большое зелье здоровья',slot: 'consumable', chance: 25 }
        ],
        pool2: [
            { name: 'Лук ветра',           slot: 'weapon',     chance: 25 },
            { name: 'Шлем доблести',       slot: 'helmet',     chance: 25 },
            { name: 'Броня бессмертных',   slot: 'chest',      chance: 25 },
            { name: 'Эликсир силы',        slot: 'consumable', chance: 25 }
        ],
        pool3: [
            { name: 'Жезл чародея',        slot: 'weapon',     chance: 25 },
            { name: 'Крылатые сандалии',   slot: 'boots',      chance: 25 },
            { name: 'Поножи бессмертного', slot: 'pants',      chance: 25 },
            { name: 'Эликсир защиты',      slot: 'consumable', chance: 25 }
        ]
    },

    // =========== УРОВНИ 31-40 (lvl 25-32, Легендарный) ===========
    '31-40': {
        pool1: [
            { name: 'Меч короля-воина',    slot: 'weapon',     chance: 25 },
            { name: 'Шлем мудреца',        slot: 'helmet',     chance: 25 },
            { name: 'Кираса воина света',  slot: 'chest',      chance: 25 },
            { name: 'Эликсир неуязвимости',slot: 'consumable', chance: 25 }
        ],
        pool2: [
            { name: 'Лук короля-охотника', slot: 'weapon',     chance: 25 },
            { name: 'Набедренники ярости', slot: 'pants',      chance: 25 },
            { name: 'Сапоги телепортации', slot: 'boots',      chance: 25 },
            { name: 'Большое зелье здоровья', slot: 'consumable', chance: 25 }
        ],
        pool3: [
            { name: 'Посох короля-мага',   slot: 'weapon',     chance: 25 },
            { name: 'Броня бессмертных',   slot: 'chest',      chance: 25 },
            { name: 'Сапоги ветра',        slot: 'boots',      chance: 25 },
            { name: 'Большое зелье маны',  slot: 'consumable', chance: 25 }
        ]
    },

    // =========== УРОВНИ 41-50+ (lvl 30-38, Мифический) ===========
    '41-50+': {
        pool1: [
            { name: 'Клинок тысячелетия',  slot: 'weapon',     chance: 20 },
            { name: 'Корона бессмертных',  slot: 'helmet',     chance: 25 },
            { name: 'Панцирь титана',      slot: 'chest',      chance: 25 },
            { name: 'Божественный эликсир',slot: 'consumable', chance: 30 }
        ],
        pool2: [
            { name: 'Жезл вечности',       slot: 'weapon',     chance: 20 },
            { name: 'Поножи вечности',     slot: 'pants',      chance: 25 },
            { name: 'Сапоги вселенной',    slot: 'boots',      chance: 25 },
            { name: 'Эликсир неуязвимости',slot: 'consumable', chance: 30 }
        ],
        pool3: [
            { name: 'Лук звездного пути',  slot: 'weapon',     chance: 20 },
            { name: 'Шлем мудреца',        slot: 'helmet',     chance: 25 },
            { name: 'Кираса воина света',  slot: 'chest',      chance: 25 },
            { name: 'Эликсир берсерка',    slot: 'consumable', chance: 30 }
        ]
    }
};
