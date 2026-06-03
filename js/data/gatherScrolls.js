// Свитки активной добычи: тир свитка = макс. тир ресурса. Баланс: лимит времени + число сборов, сниженный XP.

const GATHER_SCROLL_TIERS = [
    {
        tier: 1,
        name: 'Свиток добычи I',
        icon: '📜',
        scrollTier: 1,
        durationMs: 4 * 60 * 1000,
        maxGathers: 15,
        expMultiplier: 0.6,
        shopPrice: 1200,
        minPlayerLevel: 5,
        rarity: 'Обычный'
    },
    {
        tier: 2,
        name: 'Свиток добычи II',
        icon: '📜',
        scrollTier: 2,
        durationMs: 6 * 60 * 1000,
        maxGathers: 18,
        expMultiplier: 0.62,
        shopPrice: 3500,
        minPlayerLevel: 12,
        rarity: 'Необычный'
    },
    {
        tier: 3,
        name: 'Свиток добычи III',
        icon: '📜',
        scrollTier: 3,
        durationMs: 8 * 60 * 1000,
        maxGathers: 22,
        expMultiplier: 0.65,
        shopPrice: 9000,
        minPlayerLevel: 20,
        rarity: 'Редкий'
    },
    {
        tier: 4,
        name: 'Свиток добычи IV',
        icon: '📜',
        scrollTier: 4,
        durationMs: 10 * 60 * 1000,
        maxGathers: 26,
        expMultiplier: 0.68,
        shopPrice: 22000,
        minPlayerLevel: 28,
        rarity: 'Эпический'
    },
    {
        tier: 5,
        name: 'Свиток добычи V',
        icon: '📜',
        scrollTier: 5,
        durationMs: 12 * 60 * 1000,
        maxGathers: 30,
        expMultiplier: 0.7,
        shopPrice: 50000,
        minPlayerLevel: 36,
        rarity: 'Легендарный'
    },
    {
        tier: 6,
        name: 'Свиток добычи VI',
        icon: '📜',
        scrollTier: 6,
        durationMs: 15 * 60 * 1000,
        maxGathers: 35,
        expMultiplier: 0.72,
        shopPrice: 120000,
        minPlayerLevel: 44,
        rarity: 'Мифический'
    }
];

function getGatherScrollMetaByName(name) {
    return GATHER_SCROLL_TIERS.find(s => s.name === name) || null;
}

function getGatherScrollMetaByTier(tier) {
    return GATHER_SCROLL_TIERS.find(s => s.scrollTier === tier) || null;
}

function buildGatherScrollCraftRecipes() {
    const recipes = [
        { tier: 1, resources: { 'Паутина': 6, 'Лечебная трава': 8, 'Сосновая древесина': 5 }, time: 5, exp: 45 },
        { tier: 2, resources: { 'Хлопок': 5, 'Синий корень': 4, 'Дубовая древесина': 4, 'Шкура волка': 3 }, time: 6, exp: 90 },
        { tier: 3, resources: { 'Шёлк': 4, 'Огненный цветок': 3, 'Красное дерево': 3, 'Изумруд': 2 }, time: 8, exp: 160 },
        { tier: 4, resources: { 'Мифриловая нить': 3, 'Сапфир': 2, 'Эбеновое дерево': 3, 'Шкура тигра': 2 }, time: 10, exp: 280 },
        { tier: 5, resources: { 'Звёздный шёлк': 2, 'Звездная пыльца': 3, 'Адамантит': 2, 'Алмаз': 1 }, time: 12, exp: 420 },
        { tier: 6, resources: { 'Звёздный шёлк': 4, 'Эфирный кристалл': 2, 'Орихалк': 3, 'Камень душ': 1 }, time: 15, exp: 600 }
    ];
    return GATHER_SCROLL_TIERS.map((meta, i) => {
        const craft = recipes[i] || recipes[recipes.length - 1];
        return {
            name: meta.name,
            icon: meta.icon,
            img: '',
            tier: meta.tier,
            exp: craft.exp,
            time: craft.time,
            resources: craft.resources,
            type: 'gather_scroll',
            effect: 'auto_gather',
            scrollTier: meta.scrollTier,
            durationMs: meta.durationMs,
            maxGathers: meta.maxGathers,
            expMultiplier: meta.expMultiplier,
            rarity: meta.rarity
        };
    });
}

if (typeof window !== 'undefined') {
    window.GATHER_SCROLL_TIERS = GATHER_SCROLL_TIERS;
    window.getGatherScrollMetaByName = getGatherScrollMetaByName;
    window.getGatherScrollMetaByTier = getGatherScrollMetaByTier;
    window.buildGatherScrollCraftRecipes = buildGatherScrollCraftRecipes;
}
