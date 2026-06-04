const PROFESSIONS_DB = {
    // ===== ДОБЫВАЮЩИЕ ПРОФЕССИИ =====
    gathering: [
        {
            id: 'mining',
            name: 'Горное дело',
            icon: '⛏️',
            desc: 'Добыча руды и драгоценных камней из недр земли',
            yields: ['Руды', 'Драгоценные камни', 'Самоцветы'],
            learnMinLevel: 1
        },
        {
            id: 'herbalism',
            name: 'Травничество',
            icon: '🌿',
            desc: 'Сбор лекарственных трав и магических растений',
            yields: ['Травы', 'Цветы', 'Коренья', 'Грибы'],
            learnMinLevel: 1
        },
        {
            id: 'lumberjack',
            name: 'Лесозаготовка',
            icon: '🪓',
            desc: 'Заготовка древесины и сбор смолы',
            yields: ['Древесина', 'Смола', 'Кора', 'Древесный уголь'],
            learnMinLevel: 1
        },
        {
            id: 'skinning',
            name: 'Кожевничество',
            icon: '🦊',
            desc: 'Снятие шкур с животных и их первичная обработка',
            yields: ['Шкуры', 'Кожа', 'Чешуя', 'Мех'],
            learnMinLevel: 5
        },
        {
            id: 'fishing',
            name: 'Рыболовство',
            icon: '🎣',
            desc: 'Ловля рыбы и морских существ',
            yields: ['Рыба', 'Морепродукты', 'Жемчуг'],
            learnMinLevel: 8
        },
        {
            id: 'clothier',
            name: 'Ткачество',
            icon: '🧵',
            desc: 'Сбор и создание тканей из растительного и животного сырья',
            yields: ['Ткани', 'Нитки', 'Шёлк', 'Верёвки'],
            learnMinLevel: 5
        }
    ],

    // ===== СОЗДАЮЩИЕ ПРОФЕССИИ =====
    crafting: [
        {
            id: 'blacksmith',
            name: 'Кузнечное дело',
            icon: '⚒️',
            desc: 'Ковка оружия и тяжёлой брони из металлов',
            materials: ['Руды', 'Древесина (для рукоятей)'],
            learnMinLevel: 1,
            relatedGathering: ['mining', 'lumberjack']
        },
        {
            id: 'leatherworking',
            name: 'Кожевенное дело',
            icon: '👞',
            desc: 'Создание кожаной брони и аксессуаров (уклонение, крит)',
            materials: ['Шкуры', 'Кожа', 'Чешуя'],
            learnMinLevel: 6,
            relatedGathering: ['skinning']
        },
        {
            id: 'tailoring',
            name: 'Портняжное дело',
            icon: '🧥',
            desc: 'Пошив тканевой брони и плащей (мана, интеллект)',
            materials: ['Ткани', 'Шёлк', 'Нитки'],
            learnMinLevel: 6,
            relatedGathering: ['clothier']
        },
        {
            id: 'jewelry',
            name: 'Ювелирное дело',
            icon: '💍',
            desc: 'Огранка камней и создание колец, амулетов, диадем',
            materials: ['Драгоценные камни', 'Драгоценные металлы'],
            learnMinLevel: 12,
            relatedGathering: ['mining']
        },
        {
            id: 'alchemy',
            name: 'Алхимия',
            icon: '⚗️',
            desc: 'Варка зелий лечения, эликсиров усиления и ядов',
            materials: ['Травы', 'Коренья', 'Цветы', 'Грибы'],
            learnMinLevel: 1,
            relatedGathering: ['herbalism']
        },
        {
            id: 'scrollcraft',
            name: 'Свиткотворчество',
            icon: '📜',
            desc: 'Создание магических свитков: зачарование оружия, временные баффы, проклятия',
            materials: ['Ткани (пергамент)', 'Смола (чернила)', 'Древесина (основа)'],
            learnMinLevel: 15,
            relatedGathering: ['clothier', 'lumberjack']
        },
        {
            id: 'cooking',
            name: 'Кулинария',
            icon: '🍳',
            desc: 'Приготовление еды для восстановления здоровья и получения долгосрочных баффов',
            materials: ['Рыба', 'Морепродукты', 'Травы', 'Мясо'],
            learnMinLevel: 1,
            relatedGathering: ['fishing', 'herbalism']
        }
    ]
};
