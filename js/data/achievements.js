// js/data/achievements.js - База данных достижений

const ACHIEVEMENTS_DB = {
    // === ПРОГРЕССИЯ ===
    'first_blood': {
        id: 'first_blood',
        name: 'Первая кровь',
        description: 'Победите любого монстра',
        icon: '⚔️',
        category: 'progression',
        rarity: 'common',
        rewardGold: 50,
        rewardExp: 100,
        condition: { type: 'victories', threshold: 1 }
    },
    'veteran_10': {
        id: 'veteran_10',
        name: 'Ветеран',
        description: 'Победите 10 монстров',
        icon: '🏆',
        category: 'progression',
        rarity: 'common',
        rewardGold: 150,
        rewardExp: 300,
        condition: { type: 'victories', threshold: 10 }
    },
    'warrior_50': {
        id: 'warrior_50',
        name: 'Воин',
        description: 'Победите 50 монстров',
        icon: '🛡️',
        category: 'progression',
        rarity: 'rare',
        rewardGold: 500,
        rewardExp: 1000,
        condition: { type: 'victories', threshold: 50 }
    },
    'legend_100': {
        id: 'legend_100',
        name: 'Легенда',
        description: 'Победите 100 монстров',
        icon: '👑',
        category: 'progression',
        rarity: 'epic',
        rewardGold: 2000,
        rewardExp: 5000,
        condition: { type: 'victories', threshold: 100 }
    },
    
    // === УРОВЕНЬ ===
    'novice_5': {
        id: 'novice_5',
        name: 'Новичок',
        description: 'Достигните 5 уровня',
        icon: '⭐',
        category: 'progression',
        rarity: 'common',
        rewardGold: 100,
        rewardExp: 200,
        condition: { type: 'level', threshold: 5 }
    },
    'adept_10': {
        id: 'adept_10',
        name: 'Ученик',
        description: 'Достигните 10 уровня',
        icon: '⭐',
        category: 'progression',
        rarity: 'common',
        rewardGold: 300,
        rewardExp: 600,
        condition: { type: 'level', threshold: 10 }
    },
    'expert_25': {
        id: 'expert_25',
        name: 'Эксперт',
        description: 'Достигните 25 уровня',
        icon: '⭐',
        category: 'progression',
        rarity: 'rare',
        rewardGold: 1000,
        rewardExp: 2500,
        condition: { type: 'level', threshold: 25 }
    },
    'master_50': {
        id: 'master_50',
        name: 'Мастер',
        description: 'Достигните 50 уровня',
        icon: '⭐',
        category: 'progression',
        rarity: 'epic',
        rewardGold: 5000,
        rewardExp: 10000,
        condition: { type: 'level', threshold: 50 }
    },
    'grandmaster_100': {
        id: 'grandmaster_100',
        name: 'Гроссмейстер',
        description: 'Достигните 100 уровня',
        icon: '⭐',
        category: 'progression',
        rarity: 'legendary',
        rewardGold: 20000,
        rewardExp: 50000,
        condition: { type: 'level', threshold: 100 }
    },
    
    // === ЗОЛОТО ===
    'collector_1000': {
        id: 'collector_1000',
        name: 'Коллекционер',
        description: 'Накопите 1000 золота',
        icon: '💰',
        category: 'wealth',
        rarity: 'common',
        rewardGold: 200,
        rewardExp: 200,
        condition: { type: 'gold', threshold: 1000 }
    },
    'merchant_10000': {
        id: 'merchant_10000',
        name: 'Купец',
        description: 'Накопите 10 000 золота',
        icon: '💰',
        category: 'wealth',
        rarity: 'rare',
        rewardGold: 1000,
        rewardExp: 1500,
        condition: { type: 'gold', threshold: 10000 }
    },
    'tycoon_100000': {
        id: 'tycoon_100000',
        name: 'Магнат',
        description: 'Накопите 100 000 золота',
        icon: '💰',
        category: 'wealth',
        rarity: 'epic',
        rewardGold: 10000,
        rewardExp: 10000,
        condition: { type: 'gold', threshold: 100000 }
    },
    
    // === БОЙ ===
    'crit_master': {
        id: 'crit_master',
        name: 'Мастер критов',
        description: 'Сделайте 100 критических ударов',
        icon: '💥',
        category: 'combat',
        rarity: 'rare',
        rewardGold: 800,
        rewardExp: 1200,
        condition: { type: 'criticalHits', threshold: 100 }
    },
    'dodge_master': {
        id: 'dodge_master',
        name: 'Мастер уворота',
        description: 'Увернитесь от 50 атак',
        icon: '💨',
        category: 'combat',
        rarity: 'rare',
        rewardGold: 800,
        rewardExp: 1200,
        condition: { type: 'dodges', threshold: 50 }
    },
    'one_shot': {
        id: 'one_shot',
        name: 'Один удар',
        description: 'Убейте монстра с одного удара',
        icon: '🎯',
        category: 'combat',
        rarity: 'rare',
        rewardGold: 500,
        rewardExp: 800,
        condition: { type: 'oneHitKill', threshold: 1 }
    },
    'survivor': {
        id: 'survivor',
        name: 'Выживший',
        description: 'Победите монстра с 1 HP',
        icon: '❤️',
        category: 'combat',
        rarity: 'epic',
        rewardGold: 1500,
        rewardExp: 2500,
        condition: { type: 'survivedWith1Hp', threshold: 1 }
    },
    
    // === ПРЕДМЕТЫ ===
    'hoarder': {
        id: 'hoarder',
        name: 'Сокровищник',
        description: 'Соберите 50 предметов в инвентаре',
        icon: '🎒',
        category: 'items',
        rarity: 'common',
        rewardGold: 300,
        rewardExp: 400,
        condition: { type: 'inventorySize', threshold: 50 }
    },
    'collector_rare': {
        id: 'collector_rare',
        name: 'Искатель редкостей',
        description: 'Получите предмет редкости «Редкий» или выше',
        icon: '💎',
        category: 'items',
        rarity: 'rare',
        rewardGold: 600,
        rewardExp: 1000,
        condition: { type: 'getItemRarity', threshold: 2 }
    },
    'collector_legendary': {
        id: 'collector_legendary',
        name: 'Охотник за легендами',
        description: 'Получите предмет редкости «Легендарный» или выше',
        icon: '🌟',
        category: 'items',
        rarity: 'epic',
        rewardGold: 2000,
        rewardExp: 4000,
        condition: { type: 'getItemRarity', threshold: 5 }
    },
    
    // === ПРОФЕССИИ ===
    'gatherer_100': {
        id: 'gatherer_100',
        name: 'Сборщик',
        description: 'Соберите 100 ресурсов',
        icon: '⛏️',
        category: 'professions',
        rarity: 'common',
        rewardGold: 400,
        rewardExp: 600,
        condition: { type: 'resourcesGathered', threshold: 100 }
    },
    'craftsman': {
        id: 'craftsman',
        name: 'Ремесленник',
        description: 'Скрафтите 10 предметов',
        icon: '🔨',
        category: 'professions',
        rarity: 'common',
        rewardGold: 500,
        rewardExp: 800,
        condition: { type: 'itemsCrafted', threshold: 10 }
    },
    'master_crafter': {
        id: 'master_crafter',
        name: 'Мастер крафта',
        description: 'Скрафтите 100 предметов',
        icon: '🔨',
        category: 'professions',
        rarity: 'epic',
        rewardGold: 3000,
        rewardExp: 6000,
        condition: { type: 'itemsCrafted', threshold: 100 }
    },
    
    // === ИССЛЕДОВАНИЕ ===
    'explorer_3': {
        id: 'explorer_3',
        name: 'Исследователь',
        description: 'Посетите 3 локации',
        icon: '🗺️',
        category: 'exploration',
        rarity: 'common',
        rewardGold: 300,
        rewardExp: 500,
        condition: { type: 'locationsVisited', threshold: 3 }
    },
    'explorer_10': {
        id: 'explorer_10',
        name: 'Путешественник',
        description: 'Посетите 10 локаций',
        icon: '🗺️',
        category: 'exploration',
        rarity: 'rare',
        rewardGold: 1000,
        rewardExp: 2000,
        condition: { type: 'locationsVisited', threshold: 10 }
    },
    
    // === PvP ===
    'arena_challenger': {
        id: 'arena_challenger',
        name: 'Боец арены',
        description: 'Выиграйте 1 бой на PvP арене',
        icon: '🥊',
        category: 'pvp',
        rarity: 'rare',
        rewardGold: 1000,
        rewardExp: 1500,
        condition: { type: 'pvpWins', threshold: 1 }
    },
    'arena_champion': {
        id: 'arena_champion',
        name: 'Чемпион арены',
        description: 'Выиграйте 10 боёв на PvP арене',
        icon: '🥊',
        category: 'pvp',
        rarity: 'epic',
        rewardGold: 5000,
        rewardExp: 8000,
        condition: { type: 'pvpWins', threshold: 10 }
    },
    
    // === ОСОБЫЕ ===
    'first_shop': {
        id: 'first_shop',
        name: 'Первая покупка',
        description: 'Купите первый предмет в магазине',
        icon: '🛒',
        category: 'special',
        rarity: 'common',
        rewardGold: 50,
        rewardExp: 100,
        condition: { type: 'itemsBought', threshold: 1 }
    },
    'first_craft': {
        id: 'first_craft',
        name: 'Первый крафт',
        description: 'Скрафтите первый предмет',
        icon: '🔨',
        category: 'special',
        rarity: 'common',
        rewardGold: 50,
        rewardExp: 100,
        condition: { type: 'itemsCrafted', threshold: 1 }
    },
    'luck_day': {
        id: 'luck_day',
        name: 'Удачный день',
        description: 'Выиграйте в колесе фортуны',
        icon: '🎡',
        category: 'special',
        rarity: 'rare',
        rewardGold: 1000,
        rewardExp: 1000,
        condition: { type: 'wheelWin', threshold: 1 }
    }
};

// Категории достижений
const ACHIEVEMENT_CATEGORIES = {
    progression: { name: 'Прогрессия', icon: '⭐' },
    wealth: { name: 'Богатство', icon: '💰' },
    combat: { name: 'Бой', icon: '⚔️' },
    items: { name: 'Предметы', icon: '🎒' },
    professions: { name: 'Профессии', icon: '🔨' },
    exploration: { name: 'Исследование', icon: '🗺️' },
    pvp: { name: 'PvP', icon: '🥊' },
    special: { name: 'Особые', icon: '✨' }
};

// Редкость достижений
const ACHIEVEMENT_RARITY = {
    common: { name: 'Обычное', color: '#cccccc', multiplier: 1 },
    uncommon: { name: 'Необычное', color: '#2ecc71', multiplier: 1.2 },
    rare: { name: 'Редкое', color: '#3498db', multiplier: 1.5 },
    epic: { name: 'Эпическое', color: '#9b59b6', multiplier: 2 },
    legendary: { name: 'Легендарное', color: '#f0c040', multiplier: 3 },
    mythic: { name: 'Мифическое', color: '#e74c3c', multiplier: 4 }
};
