// equipment.js - Исправленная версия (Древние и Божественные ТОЛЬКО в крафте)
// img: путь к PNG от корня сайта, напр. 'assets/items/steel-sword.png' (пусто = emoji icon)
// armor теперь по классам (как weapons). Броня Мага с img из png/armor/mage/.

const EQUIPMENT_DB = {
    weapons: {
        'Воин': [
            // === БАЗОВЫЕ (уровни 1-10) ===
            {name:'Стальной меч',rarity:'Обычный',lvl:1,price:80,dmg:10,def:2,hp:0,crit:0,critDmg:0,dodge:0,icon:'🗡️',img:''},
            {name:'Боевой топор',rarity:'Обычный',lvl:1,price:90,dmg:12,def:0,hp:10,crit:0,critDmg:0,dodge:0,icon:'🪓',img:''},
            {name:'Закаленный клинок',rarity:'Необычный',lvl:5,price:180,dmg:16,def:4,hp:0,crit:5,critDmg:0,dodge:0,icon:'⚔️',img:''},
            {name:'Секира ярости',rarity:'Необычный',lvl:5,price:200,dmg:18,def:0,hp:15,crit:0,critDmg:15,dodge:0,icon:'🔪',img:''},
            
            // === СЕТ "Рыцарский" (уровни 12-22) ===
            {name:'Рыцарский меч',rarity:'Редкий',lvl:12,price:550,dmg:22,def:6,hp:0,crit:6,critDmg:0,dodge:0,icon:'⚔️',img:''},
            {name:'Рыцарский топор',rarity:'Редкий',lvl:12,price:580,dmg:25,def:0,hp:25,crit:0,critDmg:18,dodge:0,icon:'🪓',img:''},
            {name:'Благословенный клинок',rarity:'Эпический',lvl:18,price:1200,dmg:30,def:8,hp:40,crit:8,critDmg:0,dodge:0,icon:'✨',img:''},
            {name:'Молот правосудия',rarity:'Эпический',lvl:22,price:1500,dmg:35,def:5,hp:0,crit:0,critDmg:25,dodge:5,icon:'🔨',img:''},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Меч короля-воина',rarity:'Легендарный',lvl:28,price:2800,dmg:42,def:10,hp:0,crit:10,critDmg:20,dodge:0,icon:'👑',img:''},
            {name:'Секира великана',rarity:'Легендарный',lvl:32,price:3500,dmg:48,def:0,hp:60,crit:8,critDmg:25,dodge:0,icon:'🪓',img:''},
            {name:'Клинок тысячелетия',rarity:'Мифический',lvl:38,price:5500,dmg:58,def:12,hp:80,crit:12,critDmg:30,dodge:0,icon:'💎',img:''},
            
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
            {name:'Дубовый посох',rarity:'Обычный',lvl:1,price:70,dmg:8,def:0,hp:15,crit:0,critDmg:0,dodge:0,icon:'🪄',img:'png/weapons/mage/mage_staff_1.png'},
            {name:'Кристальный скипетр',rarity:'Обычный',lvl:1,price:80,dmg:10,def:0,hp:0,crit:4,critDmg:0,dodge:0,icon:'💠',img:'png/weapons/mage/mage_staff_2.png'},
            {name:'Посох элементаля',rarity:'Необычный',lvl:5,price:180,dmg:15,def:0,hp:20,crit:8,critDmg:0,dodge:0,icon:'🌍',img:'png/weapons/mage/mage_staff_3.png'},
            {name:'Скипетр мудреца',rarity:'Необычный',lvl:5,price:200,dmg:17,def:0,hp:0,crit:0,critDmg:18,dodge:3,icon:'📜',img:'png/weapons/mage/mage_staff_4.png'},
            
            // === СЕТ "Архимаг" (уровни 12-22) ===
            {name:'Посох архимага',rarity:'Редкий',lvl:12,price:520,dmg:22,def:0,hp:0,crit:10,critDmg:18,dodge:0,icon:'🧙',img:'png/weapons/mage/mage_staff_5.png'},
            {name:'Скипетр волшебника',rarity:'Редкий',lvl:14,price:600,dmg:25,def:5,hp:20,crit:8,critDmg:20,dodge:0,icon:'✨',img:'png/weapons/mage/mage_staff_6.png'},
            {name:'Жезл чародея',rarity:'Эпический',lvl:18,price:1100,dmg:32,def:0,hp:40,crit:12,critDmg:25,dodge:5,icon:'🔮',img:'png/weapons/mage/mage_staff_7.png'},
            {name:'Посох заклинаний',rarity:'Эпический',lvl:22,price:1400,dmg:36,def:0,hp:60,crit:14,critDmg:28,dodge:0,icon:'📜',img:'png/weapons/mage/mage_staff_8.png'},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Посох короля-мага',rarity:'Легендарный',lvl:28,price:2600,dmg:44,def:0,hp:0,crit:16,critDmg:30,dodge:0,icon:'👑',img:'png/weapons/mage/mage_staff_9.png'},
            {name:'Скипетр драконьей магии',rarity:'Легендарный',lvl:32,price:3400,dmg:50,def:8,hp:50,crit:14,critDmg:32,dodge:0,icon:'🐉',img:'png/weapons/mage/mage_staff_10.png'},
            {name:'Жезл вечности',rarity:'Мифический',lvl:38,price:5200,dmg:60,def:0,hp:80,crit:18,critDmg:38,dodge:5,icon:'💎',img:'png/weapons/mage/mage_staff_11.png'},
            
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
            {name:'Охотничий лук',rarity:'Обычный',lvl:1,price:60,dmg:11,def:0,hp:0,crit:0,critDmg:0,dodge:3,icon:'🏹',img:''},
            {name:'Легкий арбалет',rarity:'Обычный',lvl:1,price:75,dmg:13,def:0,hp:0,crit:6,critDmg:0,dodge:0,icon:'🔫',img:''},
            {name:'Составной лук',rarity:'Необычный',lvl:5,price:160,dmg:18,def:0,hp:0,crit:9,critDmg:0,dodge:5,icon:'🏹',img:''},
            {name:'Боевой арбалет',rarity:'Необычный',lvl:5,price:180,dmg:20,def:0,hp:12,crit:0,critDmg:18,dodge:0,icon:'⚔️',img:''},
            
            // === СЕТ "Снайпер" (уровни 12-22) ===
            {name:'Снайперский лук',rarity:'Редкий',lvl:12,price:500,dmg:26,def:0,hp:0,crit:12,critDmg:15,dodge:5,icon:'🎯',img:''},
            {name:'Убойный арбалет',rarity:'Редкий',lvl:14,price:580,dmg:28,def:5,hp:15,crit:10,critDmg:18,dodge:0,icon:'🏹',img:''},
            {name:'Лук ветра',rarity:'Эпический',lvl:18,price:1050,dmg:36,def:0,hp:0,crit:16,critDmg:22,dodge:8,icon:'💨',img:''},
            {name:'Арбалет шторма',rarity:'Эпический',lvl:22,price:1350,dmg:40,def:8,hp:30,crit:14,critDmg:24,dodge:0,icon:'⚡',img:''},
            
            // === СЕТ "Легендарный" (уровни 28-38) ===
            {name:'Лук короля-охотника',rarity:'Легендарный',lvl:28,price:2500,dmg:48,def:0,hp:0,crit:18,critDmg:28,dodge:10,icon:'👑',img:''},
            {name:'Арбалет драконобойца',rarity:'Легендарный',lvl:32,price:3200,dmg:54,def:0,hp:45,crit:16,critDmg:30,dodge:5,icon:'🐉',img:''},
            {name:'Лук звездного пути',rarity:'Мифический',lvl:38,price:5000,dmg:66,def:0,hp:60,crit:22,critDmg:38,dodge:12,icon:'⭐',img:''},
            
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
        'Воин': {
            // === БАЗОВЫЕ (уровни 1-10) ===
            'helmet': [
                {name:'Стальной шлем',rarity:'Обычный',lvl:1,price:100,dmg:0,def:10,hp:11,crit:0,critDmg:0,dodge:0,icon:'⛑️',img:'png/armor/warrior/warrior_armor_01.png'},
                {name:'Закаленный шлем',rarity:'Необычный',lvl:5,price:200,dmg:0,def:14,hp:20,crit:2,critDmg:0,dodge:0,icon:'🪖',img:'png/armor/warrior/warrior_armor_02.png'},
                {name:'Шлем рыцаря',rarity:'Редкий',lvl:10,price:400,dmg:0,def:20,hp:30,crit:5,critDmg:0,dodge:0,icon:'👑',img:'png/armor/warrior/warrior_armor_03.png'},
                {name:'Титановый шлем',rarity:'Эпический',lvl:15,price:750,dmg:0,def:28,hp:45,crit:7,critDmg:0,dodge:0,icon:'🛡️',img:'png/armor/warrior/warrior_armor_04.png'},
                {name:'Шлем доблести',rarity:'Легендарный',lvl:20,price:1300,dmg:5,def:32,hp:61,crit:6,critDmg:0,dodge:0,icon:'⭐',img:'png/armor/warrior/warrior_armor_05.png'},
                {name:'Корона бессмертных',rarity:'Мифический',lvl:30,price:4000,dmg:0,def:49,hp:112,crit:12,critDmg:0,dodge:5,icon:'👑',img:'png/armor/warrior/warrior_armor_06.png'},
                // === 2-Й СЕТ "ШТУРМОВИК" ===
                {name:'Рогатый шлем',rarity:'Обычный',lvl:1,price:100,dmg:0,def:8,hp:13,crit:0,critDmg:0,dodge:0,icon:'🪖',img:'png/armor/warrior/warrior_armor_07.png'},
                {name:'Шлем берсерка',rarity:'Необычный',lvl:5,price:200,dmg:2,def:10,hp:20,crit:2,critDmg:0,dodge:0,icon:'😤',img:'png/armor/warrior/warrior_armor_08.png'},
                {name:'Шлем ярости',rarity:'Редкий',lvl:10,price:400,dmg:3,def:16,hp:30,crit:5,critDmg:0,dodge:0,icon:'⚡',img:'png/armor/warrior/warrior_armor_01.png'},
                {name:'Шлем бури',rarity:'Эпический',lvl:15,price:750,dmg:5,def:22,hp:45,crit:6,critDmg:0,dodge:0,icon:'🌪️',img:'png/armor/warrior/warrior_armor_02.png'},
                {name:'Шлем завоевателя',rarity:'Легендарный',lvl:20,price:1300,dmg:8,def:26,hp:50,crit:8,critDmg:0,dodge:0,icon:'👑',img:'png/armor/warrior/warrior_armor_03.png'},
                {name:'Шлем императора',rarity:'Мифический',lvl:30,price:4000,dmg:10,def:38,hp:96,crit:14,critDmg:0,dodge:5,icon:'💎',img:'png/armor/warrior/warrior_armor_04.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Венец древних знаний',...},
                // {name:'Шлем просветленного',...},
                // {name:'Корона власти',...},
                // {name:'Венец всевластия',...},
            ],
            'chest': [
                {name:'Стальной нагрудник',rarity:'Обычный',lvl:1,price:180,dmg:0,def:20,hp:25,crit:0,critDmg:0,dodge:0,icon:'🛡️',img:'png/armor/warrior/warrior_armor_09.png'},
                {name:'Закаленная броня',rarity:'Необычный',lvl:5,price:380,dmg:0,def:28,hp:40,crit:0,critDmg:0,dodge:0,icon:'⚔️',img:'png/armor/warrior/warrior_armor_10.png'},
                {name:'Драконья броня',rarity:'Редкий',lvl:10,price:700,dmg:0,def:36,hp:61,crit:0,critDmg:10,dodge:0,icon:'🐉',img:'png/armor/warrior/warrior_armor_11.png'},
                {name:'Титановый доспех',rarity:'Эпический',lvl:15,price:1300,dmg:0,def:49,hp:91,crit:0,critDmg:0,dodge:3,icon:'💪',img:'png/armor/warrior/warrior_armor_12.png'},
                {name:'Броня бессмертных',rarity:'Легендарный',lvl:20,price:2200,dmg:5,def:56,hp:122,crit:0,critDmg:12,dodge:0,icon:'🌟',img:'png/armor/warrior/warrior_armor_13.png'},
                {name:'Панцирь титана',rarity:'Мифический',lvl:30,price:5200,dmg:0,def:79,hp:204,crit:0,critDmg:0,dodge:5,icon:'🦾',img:'png/armor/warrior/warrior_armor_14.png'},
                // === 2-Й СЕТ "ШТУРМОВИК" ===
                {name:'Рогатый нагрудник',rarity:'Обычный',lvl:1,price:180,dmg:0,def:16,hp:28,crit:0,critDmg:0,dodge:0,icon:'🦺',img:'png/armor/warrior/warrior_armor_15.png'},
                {name:'Нагрудник берсерка',rarity:'Необычный',lvl:5,price:380,dmg:3,def:22,hp:38,crit:0,critDmg:0,dodge:0,icon:'😤',img:'png/armor/warrior/warrior_armor_16.png'},
                {name:'Нагрудник ярости',rarity:'Редкий',lvl:10,price:700,dmg:5,def:28,hp:50,crit:0,critDmg:10,dodge:0,icon:'⚡',img:'png/armor/warrior/warrior_armor_09.png'},
                {name:'Нагрудник бури',rarity:'Эпический',lvl:15,price:1300,dmg:8,def:38,hp:80,crit:0,critDmg:0,dodge:3,icon:'🌪️',img:'png/armor/warrior/warrior_armor_10.png'},
                {name:'Нагрудник завоевателя',rarity:'Легендарный',lvl:20,price:2200,dmg:10,def:44,hp:102,crit:0,critDmg:12,dodge:0,icon:'👑',img:'png/armor/warrior/warrior_armor_11.png'},
                {name:'Нагрудник императора',rarity:'Мифический',lvl:30,price:5200,dmg:12,def:62,hp:180,crit:0,critDmg:0,dodge:5,icon:'💎',img:'png/armor/warrior/warrior_armor_12.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Доспех перворожденных',...},
                // {name:'Броня вознесения',...},
                // {name:'Доспех абсолюта',...},
                // {name:'Панцирь божества',...},
            ],
            'pants': [
                {name:'Стальные поножи',rarity:'Обычный',lvl:1,price:130,dmg:0,def:14,hp:18,crit:0,critDmg:0,dodge:0,icon:'👖',img:'png/armor/warrior/warrior_armor_17.png'},
                {name:'Закаленные поножи',rarity:'Необычный',lvl:5,price:260,dmg:0,def:20,hp:28,crit:0,critDmg:0,dodge:1,icon:'🦵',img:'png/armor/warrior/warrior_armor_18.png'},
                {name:'Поножи рыцаря',rarity:'Редкий',lvl:10,price:480,dmg:0,def:26,hp:42,crit:4,critDmg:0,dodge:0,icon:'⚡',img:'png/armor/warrior/warrior_armor_19.png'},
                {name:'Титановые поножи',rarity:'Эпический',lvl:15,price:900,dmg:0,def:34,hp:61,crit:0,critDmg:0,dodge:5,icon:'🔩',img:'png/armor/warrior/warrior_armor_20.png'},
                {name:'Поножи бессмертного',rarity:'Легендарный',lvl:20,price:1600,dmg:3,def:40,hp:81,crit:0,critDmg:0,dodge:5,icon:'✨',img:'png/armor/warrior/warrior_armor_21.png'},
                {name:'Поножи вечности',rarity:'Мифический',lvl:30,price:4000,dmg:0,def:56,hp:132,crit:0,critDmg:0,dodge:8,icon:'🔱',img:'png/armor/warrior/warrior_armor_22.png'},
                // === 2-Й СЕТ "ШТУРМОВИК" ===
                {name:'Рогатые поножи',rarity:'Обычный',lvl:1,price:130,dmg:0,def:10,hp:22,crit:0,critDmg:0,dodge:1,icon:'🦵',img:'png/armor/warrior/warrior_armor_23.png'},
                {name:'Поножи берсерка',rarity:'Необычный',lvl:5,price:260,dmg:2,def:14,hp:28,crit:0,critDmg:0,dodge:1,icon:'😤',img:'png/armor/warrior/warrior_armor_24.png'},
                {name:'Поножи ярости',rarity:'Редкий',lvl:10,price:480,dmg:0,def:18,hp:42,crit:5,critDmg:0,dodge:1,icon:'⚡',img:'png/armor/warrior/warrior_armor_17.png'},
                {name:'Поножи бури',rarity:'Эпический',lvl:15,price:900,dmg:0,def:26,hp:55,crit:0,critDmg:0,dodge:7,icon:'🌪️',img:'png/armor/warrior/warrior_armor_18.png'},
                {name:'Поножи завоевателя',rarity:'Легендарный',lvl:20,price:1600,dmg:5,def:30,hp:72,crit:0,critDmg:0,dodge:7,icon:'👑',img:'png/armor/warrior/warrior_armor_19.png'},
                {name:'Поножи императора',rarity:'Мифический',lvl:30,price:4000,dmg:0,def:42,hp:114,crit:0,critDmg:0,dodge:10,icon:'💎',img:'png/armor/warrior/warrior_armor_20.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Поножи древнего героя',...},
                // {name:'Набедренники возмездия',...},
                // {name:'Поножи просветленного',...},
                // {name:'Набедренники творца',...},
            ],
            'boots': [
                {name:'Стальные сапоги',rarity:'Обычный',lvl:1,price:80,dmg:0,def:6,hp:0,crit:0,critDmg:0,dodge:1,icon:'👢',img:'png/armor/warrior/warrior_armor_25.png'},
                {name:'Сапоги скорости',rarity:'Необычный',lvl:5,price:170,dmg:0,def:10,hp:11,crit:0,critDmg:0,dodge:5,icon:'👟',img:'png/armor/warrior/warrior_armor_26.png'},
                {name:'Сапоги странника',rarity:'Редкий',lvl:10,price:320,dmg:0,def:13,hp:20,crit:0,critDmg:0,dodge:10,icon:'🥾',img:'png/armor/warrior/warrior_armor_27.png'},
                {name:'Крылатые сандалии',rarity:'Эпический',lvl:15,price:600,dmg:0,def:16,hp:35,crit:0,critDmg:0,dodge:14,icon:'🪽',img:'png/armor/warrior/warrior_armor_28.png'},
                {name:'Сапоги ветра',rarity:'Легендарный',lvl:20,price:1100,dmg:0,def:20,hp:51,crit:0,critDmg:0,dodge:18,icon:'💨',img:'png/armor/warrior/warrior_armor_29.png'},
                {name:'Сапоги вселенной',rarity:'Мифический',lvl:30,price:3200,dmg:0,def:30,hp:102,crit:0,critDmg:0,dodge:27,icon:'🌠',img:'png/armor/warrior/warrior_armor_30.png'},
                // === 2-Й СЕТ "ШТУРМОВИК" ===
                {name:'Рогатые сапоги',rarity:'Обычный',lvl:1,price:80,dmg:0,def:4,hp:8,crit:0,critDmg:0,dodge:1,icon:'👢',img:'png/armor/warrior/warrior_armor_31.png'},
                {name:'Сапоги берсерка',rarity:'Необычный',lvl:5,price:170,dmg:0,def:6,hp:16,crit:0,critDmg:0,dodge:5,icon:'😤',img:'png/armor/warrior/warrior_armor_32.png'},
                {name:'Сапоги ярости',rarity:'Редкий',lvl:10,price:320,dmg:0,def:10,hp:24,crit:0,critDmg:0,dodge:10,icon:'⚡',img:'png/armor/warrior/warrior_armor_25.png'},
                {name:'Сапоги бури',rarity:'Эпический',lvl:15,price:600,dmg:0,def:12,hp:40,crit:0,critDmg:0,dodge:14,icon:'🌪️',img:'png/armor/warrior/warrior_armor_26.png'},
                {name:'Сапоги завоевателя',rarity:'Легендарный',lvl:20,price:1100,dmg:3,def:16,hp:48,crit:0,critDmg:0,dodge:18,icon:'👑',img:'png/armor/warrior/warrior_armor_27.png'},
                {name:'Сапоги императора',rarity:'Мифический',lvl:30,price:3200,dmg:0,def:24,hp:90,crit:0,critDmg:0,dodge:28,icon:'💎',img:'png/armor/warrior/warrior_armor_28.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Сандалии древнего ветра',...},
                // {name:'Сапоги вознесения',...},
                // {name:'Сандалии абсолютной скорости',...},
                // {name:'Сандалии творца',...},
            ]
        },
        'Маг': {
            'helmet': [
                {name:'Кожаный шлем',rarity:'Обычный',lvl:3,price:120,dmg:0,def:3,hp:11,crit:0,critDmg:0,dodge:0,icon:'🎭',img:'png/armor/mage/kox-helm.png'},
                {name:'Кальчужный шлем',rarity:'Необычный',lvl:8,price:300,dmg:0,def:4,hp:24,crit:4,critDmg:0,dodge:0,icon:'🎭',img:'png/armor/mage/mage_armor_06.png'},
                {name:'Мифриловый капюшон',rarity:'Эпический',lvl:14,price:650,dmg:0,def:11,hp:35,crit:0,critDmg:0,dodge:0,icon:'🎭',img:'png/armor/mage/mage_armor_10.png'},
                {name:'Звёздный капюшон',rarity:'Мифический',lvl:25,price:2200,dmg:0,def:22,hp:61,crit:0,critDmg:0,dodge:0,icon:'🎭',img:'png/armor/mage/mage_armor_14.png'},
                // === 2-Й СЕТ "МИСТИК" ===
                {name:'Шлем иллюзий',rarity:'Эпический',lvl:14,price:650,dmg:5,def:8,hp:36,crit:6,critDmg:0,dodge:0,icon:'🌌',img:''},
                {name:'Венец провидца',rarity:'Легендарный',lvl:20,price:1400,dmg:0,def:14,hp:50,crit:8,critDmg:0,dodge:3,icon:'👁️',img:''},
                // === СЕТ "НЕКРОМАНТ" (Мифический) ===
                {name:'Шлем некроманта',rarity:'Мифический',lvl:25,price:2400,dmg:0,def:20,hp:72,crit:0,critDmg:0,dodge:0,mana:80,icon:'💀',img:'png/armor/mage/nekr-helm.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Капюшон звёздного пророка',...},
                // {name:'Диадема небесного чародея',...},
                // {name:'Венец манапотока',...},
                // {name:'Корона первозданной мудрости',...},
            ],
            'chest': [
                {name:'Кожаный нагрудник',rarity:'Обычный',lvl:3,price:200,dmg:0,def:5,hp:20,crit:0,critDmg:0,dodge:0,icon:'👘',img:'png/armor/mage/kox-nag.png'},
                {name:'Кольчужный нагрудник',rarity:'Редкий',lvl:8,price:550,dmg:0,def:7,hp:36,crit:0,critDmg:6,dodge:0,icon:'👘',img:'png/armor/mage/kolch-nag.png'},
                {name:'Мифриловое одеяние',rarity:'Эпический',lvl:14,price:1100,dmg:0,def:18,hp:56,crit:0,critDmg:0,dodge:0,icon:'✨',img:'png/armor/mage/mage_armor_09.png'},
                {name:'Звёздное одеяние',rarity:'Мифический',lvl:25,price:3500,dmg:0,def:32,hp:91,crit:0,critDmg:0,dodge:0,icon:'🌟',img:'png/armor/mage/mage_armor_13.png'},
                // === 2-Й СЕТ "МИСТИК" ===
                {name:'Доспех иллюзий',rarity:'Эпический',lvl:14,price:1100,dmg:0,def:12,hp:56,crit:0,critDmg:8,dodge:2,icon:'🌌',img:''},
                {name:'Мантия провидца',rarity:'Легендарный',lvl:20,price:2400,dmg:0,def:20,hp:80,crit:6,critDmg:10,dodge:0,icon:'👁️',img:''},
                // === СЕТ "НЕКРОМАНТ" (Мифический) ===
                {name:'Нагрудник некроманта',rarity:'Мифический',lvl:25,price:3800,dmg:0,def:30,hp:110,crit:0,critDmg:0,dodge:0,mana:120,icon:'💀',img:'png/armor/mage/nekr-nag.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Мантия древнего архимага',...},
                // {name:'Одеяние звёздного суверена',...},
                // {name:'Роба божественного прорицания',...},
                // {name:'Мантия творца миров',...},
            ],
            'pants': [
                {name:'Кожаные штаны',rarity:'Обычный',lvl:3,price:100,dmg:0,def:3,hp:10,crit:0,critDmg:0,dodge:0,icon:'👖',img:'png/armor/mage/kox-wtan.png'},
                {name:'Кольчужные штаны',rarity:'Редкий',lvl:8,price:280,dmg:0,def:4,hp:20,crit:0,critDmg:0,dodge:2,icon:'👖',img:'png/armor/mage/kolch-wtan.png'},
                {name:'Мифриловые штаны',rarity:'Эпический',lvl:14,price:600,dmg:0,def:10,hp:28,crit:0,critDmg:0,dodge:0,icon:'👖',img:'png/armor/mage/mage_armor_11.png'},
                {name:'Звёздные штаны',rarity:'Мифический',lvl:25,price:2000,dmg:0,def:18,hp:51,crit:0,critDmg:0,dodge:0,icon:'👖',img:'png/armor/mage/mage_armor_15.png'},
                // === 2-Й СЕТ "МИСТИК" ===
                {name:'Поножи иллюзий',rarity:'Эпический',lvl:14,price:600,dmg:0,def:8,hp:30,crit:0,critDmg:0,dodge:5,icon:'🌌',img:''},
                {name:'Штаны провидца',rarity:'Легендарный',lvl:20,price:1200,dmg:0,def:12,hp:42,crit:0,critDmg:0,dodge:6,icon:'👁️',img:''},
                // === СЕТ "НЕКРОМАНТ" (Мифический) ===
                {name:'Поножи некроманта',rarity:'Мифический',lvl:25,price:2200,dmg:0,def:16,hp:60,crit:0,critDmg:0,dodge:0,mana:70,icon:'💀',img:'png/armor/mage/nekr-wtan.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Штаны древнего мудреца',...},
                // {name:'Порты магического вознесения',...},
                // {name:'Штаны звёздного паломника',...},
                // {name:'Набедренники тайницы',...},
            ],
            'boots': [
                {name:'Кожаные сапоги',rarity:'Обычный',lvl:3,price:100,dmg:0,def:3,hp:0,crit:0,critDmg:0,dodge:3,icon:'👢',img:'png/armor/mage/kox-buc.png'},
                {name:'Кольчужные сапоги',rarity:'Редкий',lvl:8,price:250,dmg:0,def:3,hp:0,crit:0,critDmg:0,dodge:7,icon:'👢',img:'png/armor/mage/kolch-buc.png'},
                {name:'Мифриловые сапоги',rarity:'Эпический',lvl:14,price:550,dmg:0,def:10,hp:0,crit:0,critDmg:0,dodge:5,icon:'👢',img:'png/armor/mage/mage_armor_12.png'},
                {name:'Звёздные сапоги',rarity:'Мифический',lvl:25,price:1800,dmg:0,def:18,hp:0,crit:0,critDmg:0,dodge:8,icon:'👢',img:'png/armor/mage/mage_armor_16.png'},
                // === 2-Й СЕТ "МИСТИК" ===
                {name:'Сапоги иллюзий',rarity:'Эпический',lvl:14,price:550,dmg:0,def:6,hp:0,crit:0,critDmg:0,dodge:10,icon:'🌌',img:''},
                {name:'Сапоги провидца',rarity:'Легендарный',lvl:20,price:1100,dmg:0,def:10,hp:0,crit:0,critDmg:0,dodge:12,icon:'👁️',img:''},
                // === СЕТ "НЕКРОМАНТ" (Мифический) ===
                {name:'Сапоги некроманта',rarity:'Мифический',lvl:25,price:1900,dmg:0,def:16,hp:0,crit:0,critDmg:0,dodge:6,mana:60,icon:'💀',img:'png/armor/mage/nekr-buc.png'},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Сапоги лунного шага',...},
                // {name:'Тапочки эфирного странника',...},
                // {name:'Сапоги манавихря',...},
                // {name:'Тапочки созидателя',...},
            ]
        },
        'Лучник': {
            'helmet': [
                {name:'Кожаный шлем',rarity:'Обычный',lvl:1,price:70,dmg:0,def:4,hp:8,crit:0,critDmg:0,dodge:3,icon:'🎭',img:'png/armor/archer/archer_armor_01.png'},
                // === 2-Й СЕТ "СЛЕДОПЫТ" ===
                {name:'Капюшон следопыта',rarity:'Обычный',lvl:1,price:70,dmg:0,def:3,hp:10,crit:0,critDmg:0,dodge:4,icon:'🎭',img:''},
                {name:'Кожаный капюшон',rarity:'Необычный',lvl:5,price:150,dmg:0,def:4,hp:14,crit:2,critDmg:0,dodge:5,icon:'🦊',img:''},
                {name:'Маскировочный капюшон',rarity:'Редкий',lvl:10,price:280,dmg:0,def:6,hp:20,crit:4,critDmg:0,dodge:7,icon:'🌿',img:''},
                {name:'Капюшон невидимки',rarity:'Эпический',lvl:15,price:550,dmg:3,def:8,hp:28,crit:6,critDmg:0,dodge:10,icon:'👻',img:''},
                {name:'Маска призрака',rarity:'Легендарный',lvl:20,price:1000,dmg:0,def:10,hp:36,crit:8,critDmg:0,dodge:13,icon:'💨',img:''},
                {name:'Капюшон тени',rarity:'Мифический',lvl:30,price:2800,dmg:0,def:15,hp:56,crit:12,critDmg:0,dodge:16,icon:'🌑',img:''},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Капюшон древнего следопыта',...},
                // {name:'Койф звёздного охотника',...},
                // {name:'Шлем небесного лучника',...},
                // {name:'Корона меткого стрелка',...},
            ],
            'chest': [
                {name:'Кожаная куртка',rarity:'Обычный',lvl:1,price:120,dmg:0,def:5,hp:11,crit:0,critDmg:0,dodge:4,icon:'🧥',img:'png/armor/archer/archer_armor_09.png'},
                // === 2-Й СЕТ "СЛЕДОПЫТ" ===
                {name:'Куртка следопыта',rarity:'Обычный',lvl:1,price:120,dmg:0,def:4,hp:12,crit:0,critDmg:0,dodge:5,icon:'🧥',img:''},
                {name:'Лёгкий доспех',rarity:'Необычный',lvl:5,price:250,dmg:0,def:6,hp:18,crit:0,critDmg:4,dodge:6,icon:'🦺',img:''},
                {name:'Доспех рейнджера',rarity:'Редкий',lvl:10,price:500,dmg:0,def:10,hp:28,crit:0,critDmg:8,dodge:8,icon:'🎯',img:''},
                {name:'Кираса призрака',rarity:'Эпический',lvl:15,price:900,dmg:4,def:14,hp:40,crit:0,critDmg:10,dodge:10,icon:'👻',img:''},
                {name:'Кираса тени',rarity:'Легендарный',lvl:20,price:1600,dmg:0,def:18,hp:56,crit:0,critDmg:14,dodge:12,icon:'💨',img:''},
                {name:'Броня сумрака',rarity:'Мифический',lvl:30,price:3800,dmg:0,def:26,hp:84,crit:0,critDmg:18,dodge:15,icon:'🌑',img:''},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Кираса древнего охотника',...},
                // {name:'Панцирь ветра',...},
                // {name:'Грудник левиафана',...},
                // {name:'Броня перворожденного лучника',...},
            ],
            'pants': [
                {name:'Кожаные поножи',rarity:'Обычный',lvl:1,price:80,dmg:0,def:4,hp:10,crit:0,critDmg:0,dodge:3,icon:'👖',img:'png/armor/archer/archer_armor_17.png'},
                // === 2-Й СЕТ "СЛЕДОПЫТ" ===
                {name:'Поножи следопыта',rarity:'Обычный',lvl:1,price:80,dmg:0,def:3,hp:10,crit:0,critDmg:0,dodge:4,icon:'👖',img:''},
                {name:'Лёгкие поножи',rarity:'Необычный',lvl:5,price:180,dmg:0,def:4,hp:16,crit:0,critDmg:0,dodge:5,icon:'🦵',img:''},
                {name:'Поножи рейнджера',rarity:'Редкий',lvl:10,price:350,dmg:0,def:6,hp:22,crit:3,critDmg:0,dodge:7,icon:'🎯',img:''},
                {name:'Поножи призрака',rarity:'Эпический',lvl:15,price:650,dmg:0,def:8,hp:32,crit:0,critDmg:0,dodge:10,icon:'👻',img:''},
                {name:'Набедренники сумрака',rarity:'Легендарный',lvl:20,price:1200,dmg:0,def:10,hp:44,crit:0,critDmg:0,dodge:13,icon:'💨',img:''},
                {name:'Поножи ночи',rarity:'Мифический',lvl:30,price:3000,dmg:0,def:16,hp:66,crit:0,critDmg:0,dodge:16,icon:'🌑',img:''},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Поножи древнего следопыта',...},
                // {name:'Наголенники меткого выстрела',...},
                // {name:'Поножи небесного стремления',...},
                // {name:'Набедренники древнего ветра',...},
            ],
            'boots': [
                {name:'Кожаные сапоги',rarity:'Обычный',lvl:1,price:60,dmg:0,def:4,hp:0,crit:0,critDmg:0,dodge:5,icon:'👢',img:'png/armor/archer/archer_armor_25.png'},
                {name:'Сапоги скорости',rarity:'Необычный',lvl:5,price:170,dmg:0,def:10,hp:11,crit:0,critDmg:0,dodge:5,icon:'👟',img:'png/armor/archer/archer_armor_26.png'},
                {name:'Сапоги странника',rarity:'Редкий',lvl:10,price:320,dmg:0,def:13,hp:20,crit:0,critDmg:0,dodge:10,icon:'🥾',img:'png/armor/archer/archer_armor_27.png'},
                {name:'Крылатые сандалии',rarity:'Эпический',lvl:15,price:600,dmg:0,def:16,hp:35,crit:0,critDmg:0,dodge:14,icon:'🪽',img:'png/armor/archer/archer_armor_28.png'},
                {name:'Сапоги ветра',rarity:'Легендарный',lvl:20,price:1100,dmg:0,def:20,hp:51,crit:0,critDmg:0,dodge:18,icon:'💨',img:'png/armor/archer/archer_armor_29.png'},
                {name:'Сапоги вселенной',rarity:'Мифический',lvl:30,price:3200,dmg:0,def:30,hp:102,crit:0,critDmg:0,dodge:27,icon:'🌠',img:'png/armor/archer/archer_armor_30.png'},
                // === 2-Й СЕТ "СЛЕДОПЫТ" ===
                {name:'Сапоги следопыта',rarity:'Обычный',lvl:1,price:60,dmg:0,def:3,hp:0,crit:0,critDmg:0,dodge:6,icon:'👢',img:''},
                {name:'Лёгкие сапоги',rarity:'Необычный',lvl:5,price:170,dmg:0,def:5,hp:10,crit:0,critDmg:0,dodge:8,icon:'🦊',img:''},
                {name:'Сапоги рейнджера',rarity:'Редкий',lvl:10,price:320,dmg:0,def:8,hp:18,crit:0,critDmg:0,dodge:12,icon:'🎯',img:''},
                {name:'Сапоги призрака',rarity:'Эпический',lvl:15,price:600,dmg:0,def:10,hp:30,crit:0,critDmg:0,dodge:16,icon:'👻',img:''},
                {name:'Сапоги тени',rarity:'Легендарный',lvl:20,price:1100,dmg:0,def:14,hp:42,crit:0,critDmg:0,dodge:20,icon:'💨',img:''},
                {name:'Сапоги сумрака',rarity:'Мифический',lvl:30,price:3200,dmg:0,def:20,hp:84,crit:0,critDmg:0,dodge:28,icon:'🌑',img:''},
                // ===== ДРЕВНИЕ И БОЖЕСТВЕННЫЕ — ТОЛЬКО КРАФТ =====
                // {name:'Сандалии древнего ветра',...},
                // {name:'Сапоги вознесения',...},
                // {name:'Сандалии абсолютной скорости',...},
                // {name:'Сандалии творца',...},
            ]
        }
    }
};
