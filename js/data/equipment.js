// equipment.js - Исправленная версия (Древние и Божественные ТОЛЬКО в крафте)

const EQUIPMENT_DB = {
    weapons: {
        'Воин': [
            // === БАЗОВЫЕ (уровни 1-10) ===
            {name:'Стальной меч',rarity:'Обычный',lvl:1,price:80,dmg:10,def:2,hp:0,crit:0,critDmg:0,dodge:0,icon:'🗡️'},
            {name:'Боевой топор',rarity:'Обычный',lvl:1,price:90,dmg:12,def:0,hp:10,crit:0,critDmg:0,dodge:0,icon:'🪓'},
            {name:'Закаленный клинок',rarity:'Необычный',lvl:5,price:180,dmg:16,def:4,hp:0,crit:5,critDmg:0,dodge:0,icon:'⚔️'},
            {name:'Секира ярости',rarity:'Необычный',lvl:5,price:200,dmg:18,def:0,hp:15,crit:0,critDmg:15,dodge:0,icon:'🔪'},
            
            // === СЕТ "Рыцарский" (уровни 12-22) ===
            {name:'Рыцарский меч',rarity:'Редкий',lvl:12,price:550,dmg:22,def:6,hp:0,crit:6,critDmg:0,dodge:0,icon:'⚔️'},
            {name:'Рыцарский топор',rarity:'Редкий',lvl:12,price:580,dmg:25,def:0,hp:25,crit:0,critDmg:18,dodge:0,icon:'🪓'},
            {name:'Благословенный клинок',rarity:'Эпический',lvl:18,price:1200,dmg:30,def:8,hp:40,crit:8,critDmg:0,dodge:0,icon:'✨'},
            {name:'Молот правосудия',rarity:'Эпический',lvl:22,price:1500,dmg:35,def:5,hp:0,crit:0,critDmg:25,dodge:5,icon:'🔨'},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Меч короля-воина',rarity:'Легендарный',lvl:28,price:2800,dmg:42,def:10,hp:0,crit:10,critDmg:20,dodge:0,icon:'👑'},
            {name:'Секира великана',rarity:'Легендарный',lvl:32,price:3500,dmg:48,def:0,hp:60,crit:8,critDmg:25,dodge:0,icon:'🪓'},
            {name:'Клинок тысячелетия',rarity:'Мифический',lvl:38,price:5500,dmg:58,def:12,hp:80,crit:12,critDmg:30,dodge:0,icon:'💎'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! ТОЛЬКО КРАФТ =====
            // {name:'Древний клинок предков',...} - УДАЛЕНО
            // {name:'Молот титанов',...} - УДАЛЕНО
            // {name:'Клинок разрушителя миров',...} - УДАЛЕНО
            // {name:'Топор армагеддона',...} - УДАЛЕНО
            // {name:'Меч богов',...} - УДАЛЕНО
            // {name:'Оружие Судьбы',...} - УДАЛЕНО
        ],
        'Маг': [
            // === БАЗОВЫЕ ===
            {name:'Дубовый посох',rarity:'Обычный',lvl:1,price:70,dmg:8,def:0,hp:15,crit:0,critDmg:0,dodge:0,icon:'🪄'},
            {name:'Кристальный скипетр',rarity:'Обычный',lvl:1,price:80,dmg:10,def:0,hp:0,crit:4,critDmg:0,dodge:0,icon:'💠'},
            {name:'Посох элементаля',rarity:'Необычный',lvl:5,price:180,dmg:15,def:0,hp:20,crit:8,critDmg:0,dodge:0,icon:'🌍'},
            {name:'Скипетр мудреца',rarity:'Необычный',lvl:5,price:200,dmg:17,def:0,hp:0,crit:0,critDmg:18,dodge:3,icon:'📜'},
            
            // === СЕТ "Архимаг" (уровни 12-22) ===
            {name:'Посох архимага',rarity:'Редкий',lvl:12,price:520,dmg:22,def:0,hp:0,crit:10,critDmg:18,dodge:0,icon:'🧙'},
            {name:'Скипетр волшебника',rarity:'Редкий',lvl:14,price:600,dmg:25,def:5,hp:20,crit:8,critDmg:20,dodge:0,icon:'✨'},
            {name:'Жезл чародея',rarity:'Эпический',lvl:18,price:1100,dmg:32,def:0,hp:40,crit:12,critDmg:25,dodge:5,icon:'🔮'},
            {name:'Посох заклинаний',rarity:'Эпический',lvl:22,price:1400,dmg:36,def:0,hp:60,crit:14,critDmg:28,dodge:0,icon:'📜'},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Посох короля-мага',rarity:'Легендарный',lvl:28,price:2600,dmg:44,def:0,hp:0,crit:16,critDmg:30,dodge:0,icon:'👑'},
            {name:'Скипетр драконьей магии',rarity:'Легендарный',lvl:32,price:3400,dmg:50,def:8,hp:50,crit:14,critDmg:32,dodge:0,icon:'🐉'},
            {name:'Жезл вечности',rarity:'Мифический',lvl:38,price:5200,dmg:60,def:0,hp:80,crit:18,critDmg:38,dodge:5,icon:'💎'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! =====
            // {name:'Посох древнего мага',...} - УДАЛЕНО
            // {name:'Скипетр первозданной магии',...} - УДАЛЕНО
            // {name:'Посох абсолютной магии',...} - УДАЛЕНО
            // {name:'Жезл вселенной',...} - УДАЛЕНО
            // {name:'Скипетр божественной силы',...} - УДАЛЕНО
            // {name:'Посох мироздания',...} - УДАЛЕНО
        ],
        'Лучник': [
            // === БАЗОВЫЕ ===
            {name:'Охотничий лук',rarity:'Обычный',lvl:1,price:60,dmg:11,def:0,hp:0,crit:0,critDmg:0,dodge:3,icon:'🏹'},
            {name:'Легкий арбалет',rarity:'Обычный',lvl:1,price:75,dmg:13,def:0,hp:0,crit:6,critDmg:0,dodge:0,icon:'🔫'},
            {name:'Составной лук',rarity:'Необычный',lvl:5,price:160,dmg:18,def:0,hp:0,crit:9,critDmg:0,dodge:5,icon:'🏹'},
            {name:'Боевой арбалет',rarity:'Необычный',lvl:5,price:180,dmg:20,def:0,hp:12,crit:0,critDmg:18,dodge:0,icon:'⚔️'},
            
            // === СЕТ "Снайпер" (уровни 12-22) ===
            {name:'Снайперский лук',rarity:'Редкий',lvl:12,price:500,dmg:26,def:0,hp:0,crit:12,critDmg:15,dodge:5,icon:'🎯'},
            {name:'Убойный арбалет',rarity:'Редкий',lvl:14,price:580,dmg:28,def:5,hp:15,crit:10,critDmg:18,dodge:0,icon:'🏹'},
            {name:'Лук ветра',rarity:'Эпический',lvl:18,price:1050,dmg:36,def:0,hp:0,crit:16,critDmg:22,dodge:8,icon:'💨'},
            {name:'Арбалет шторма',rarity:'Эпический',lvl:22,price:1350,dmg:40,def:8,hp:30,crit:14,critDmg:24,dodge:0,icon:'⚡'},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Лук короля-охотника',rarity:'Легендарный',lvl:28,price:2500,dmg:48,def:0,hp:0,crit:18,critDmg:28,dodge:10,icon:'👑'},
            {name:'Арбалет драконобойца',rarity:'Легендарный',lvl:32,price:3200,dmg:54,def:0,hp:45,crit:16,critDmg:30,dodge:5,icon:'🐉'},
            {name:'Лук звездного пути',rarity:'Мифический',lvl:38,price:5000,dmg:66,def:0,hp:60,crit:22,critDmg:38,dodge:12,icon:'⭐'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! =====
            // {name:'Лук древнего снайпера',...} - УДАЛЕНО
            // {name:'Арбалет первобытного ужаса',...} - УДАЛЕНО
            // {name:'Лук судьбы',...} - УДАЛЕНО
            // {name:'Арбалет возмездия',...} - УДАЛЕНО
            // {name:'Лук небесного охотника',...} - УДАЛЕНО
            // {name:'Оружие перворожденных',...} - УДАЛЕНО
        ]
    },
    armor: {
        'helmet': [
            {name:'Стальной шлем',rarity:'Обычный',lvl:1,price:100,dmg:0,def:10,hp:12,crit:0,critDmg:0,dodge:0,icon:'⛑️'},
            {name:'Закаленный шлем',rarity:'Необычный',lvl:5,price:200,dmg:0,def:14,hp:20,crit:2,critDmg:0,dodge:0,icon:'🪖'},
            {name:'Шлем рыцаря',rarity:'Редкий',lvl:10,price:380,dmg:0,def:20,hp:30,crit:4,critDmg:0,dodge:0,icon:'👑'},
            {name:'Титановый шлем',rarity:'Эпический',lvl:15,price:700,dmg:0,def:28,hp:45,crit:6,critDmg:0,dodge:0,icon:'🛡️'},
            
            {name:'Шлем доблести',rarity:'Легендарный',lvl:20,price:1200,dmg:5,def:32,hp:60,crit:5,critDmg:0,dodge:0,icon:'⭐'},
            {name:'Шлем мудреца',rarity:'Легендарный',lvl:25,price:2000,dmg:0,def:38,hp:80,crit:8,critDmg:0,dodge:3,icon:'🧙'},
            {name:'Корона бессмертных',rarity:'Мифический',lvl:30,price:3800,dmg:0,def:48,hp:110,crit:10,critDmg:0,dodge:5,icon:'👑'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! ТОЛЬКО КРАФТ =====
        ],
        'chest': [
            {name:'Стальной нагрудник',rarity:'Обычный',lvl:1,price:180,dmg:0,def:20,hp:25,crit:0,critDmg:0,dodge:0,icon:'🛡️'},
            {name:'Закаленная броня',rarity:'Необычный',lvl:5,price:350,dmg:0,def:28,hp:40,crit:0,critDmg:0,dodge:1,icon:'⚔️'},
            {name:'Драконья броня',rarity:'Редкий',lvl:10,price:650,dmg:0,def:36,hp:60,crit:0,critDmg:8,dodge:0,icon:'🐉'},
            {name:'Титановый доспех',rarity:'Эпический',lvl:15,price:1200,dmg:0,def:48,hp:90,crit:0,critDmg:0,dodge:3,icon:'💪'},
            
            {name:'Броня бессмертных',rarity:'Легендарный',lvl:20,price:2000,dmg:5,def:56,hp:120,crit:0,critDmg:10,dodge:0,icon:'🌟'},
            {name:'Кираса воина света',rarity:'Легендарный',lvl:25,price:3000,dmg:8,def:64,hp:150,crit:0,critDmg:0,dodge:4,icon:'✨'},
            {name:'Панцирь титана',rarity:'Мифический',lvl:30,price:4800,dmg:0,def:78,hp:200,crit:0,critDmg:0,dodge:6,icon:'🦾'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! =====
        ],
        'pants': [
            {name:'Стальные поножи',rarity:'Обычный',lvl:1,price:120,dmg:0,def:14,hp:18,crit:0,critDmg:0,dodge:0,icon:'👖'},
            {name:'Закаленные поножи',rarity:'Необычный',lvl:5,price:240,dmg:0,def:20,hp:28,crit:0,critDmg:0,dodge:2,icon:'🦵'},
            {name:'Поножи рыцаря',rarity:'Редкий',lvl:10,price:450,dmg:0,def:26,hp:42,crit:3,critDmg:0,dodge:0,icon:'⚡'},
            {name:'Титановые поножи',rarity:'Эпический',lvl:15,price:850,dmg:0,def:34,hp:60,crit:0,critDmg:0,dodge:5,icon:'🔩'},
            
            {name:'Поножи бессмертного',rarity:'Легендарный',lvl:20,price:1500,dmg:3,def:40,hp:80,crit:0,critDmg:0,dodge:6,icon:'✨'},
            {name:'Набедренники ярости',rarity:'Легендарный',lvl:25,price:2500,dmg:5,def:46,hp:100,crit:5,critDmg:0,dodge:0,icon:'⚡'},
            {name:'Поножи вечности',rarity:'Мифический',lvl:30,price:3800,dmg:0,def:56,hp:130,crit:0,critDmg:0,dodge:8,icon:'🔱'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! =====
        ],
        'boots': [
            {name:'Стальные сапоги',rarity:'Обычный',lvl:1,price:80,dmg:0,def:7,hp:0,crit:0,critDmg:0,dodge:2,icon:'👢'},
            {name:'Сапоги скорости',rarity:'Необычный',lvl:5,price:160,dmg:0,def:10,hp:12,crit:0,critDmg:0,dodge:6,icon:'👟'},
            {name:'Сапоги странника',rarity:'Редкий',lvl:10,price:300,dmg:0,def:13,hp:20,crit:0,critDmg:0,dodge:10,icon:'🥾'},
            {name:'Крылатые сандалии',rarity:'Эпический',lvl:15,price:550,dmg:0,def:16,hp:35,crit:0,critDmg:0,dodge:14,icon:'🪽'},
            
            {name:'Сапоги ветра',rarity:'Легендарный',lvl:20,price:1000,dmg:0,def:20,hp:50,crit:0,critDmg:0,dodge:18,icon:'💨'},
            {name:'Сапоги телепортации',rarity:'Легендарный',lvl:25,price:1800,dmg:0,def:24,hp:70,crit:3,critDmg:0,dodge:22,icon:'🌀'},
            {name:'Сапоги вселенной',rarity:'Мифический',lvl:30,price:3000,dmg:0,def:30,hp:100,crit:0,critDmg:0,dodge:27,icon:'🌠'},
            
            // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ УДАЛЕНЫ ИЗ МАГАЗИНА! =====
        ]
    }
};
