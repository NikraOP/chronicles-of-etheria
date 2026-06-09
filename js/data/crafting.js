// crafting.js - Крафтовые предметы ДОРОЖЕ магазинных (в 1.5 раза по ресурсам)
// img: путь к PNG от корня сайта, напр. 'assets/items/health-potion.png' (пусто = emoji icon)

const CRAFTING_RECIPES = {
    // ===== КУЗНЕЧНОЕ ДЕЛО (для Воина) - ресурсов на 50% больше =====
    'blacksmith': {
        weapons: [
            // Базовые (тир 1-2) - магазин: 4 руды, крафт: 6 руды (+50%)
            {name:'Стальной меч',icon:'🗡️',img:'',tier:1,exp:60,time:4,resources:{'Железная руда':6},type:'weapon',class:'Воин',rarity:'Обычный',dmg:12,def:2,baseDmg:12},
            {name:'Боевой топор',icon:'🪓',img:'',tier:1,exp:65,time:4,resources:{'Железная руда':6,'Медная руда':3},type:'weapon',class:'Воин',rarity:'Обычный',dmg:14,hp:12,baseDmg:14},
            {name:'Закаленный клинок',icon:'⚔️',img:'',tier:2,exp:120,time:5,resources:{'Железная руда':8,'Серебряная руда':3},type:'weapon',class:'Воин',rarity:'Необычный',dmg:19,def:5,crit:6,baseDmg:19},
            {name:'Секира ярости',icon:'🔪',img:'',tier:2,exp:130,time:5,resources:{'Железная руда':8,'Серебряная руда':3,'Рубин':2},type:'weapon',class:'Воин',rarity:'Необычный',dmg:21,hp:18,critDmg:18,baseDmg:21},
            
            // Редкие (тир 3)
            {name:'Рыцарский меч',icon:'⚔️',img:'',tier:3,exp:250,time:7,resources:{'Железная руда':9,'Золотая руда':5,'Рубин':2},type:'weapon',class:'Воин',rarity:'Редкий',dmg:26,def:7,crit:7,baseDmg:26},
            {name:'Рыцарский топор',icon:'🪓',img:'',tier:3,exp:260,time:7,resources:{'Железная руда':9,'Золотая руда':5,'Изумруд':2},type:'weapon',class:'Воин',rarity:'Редкий',dmg:29,hp:30,critDmg:21,baseDmg:29},
            
            // Эпические (тир 4)
            {name:'Благословенный клинок',icon:'✨',img:'',tier:4,exp:400,time:10,resources:{'Мифриловая руда':8,'Аметист':3,'Золотая руда':6},type:'weapon',class:'Воин',rarity:'Эпический',dmg:35,def:9,hp:48,crit:9,baseDmg:35},
            {name:'Молот правосудия',icon:'🔨',img:'',tier:4,exp:420,time:10,resources:{'Мифриловая руда':8,'Сапфир':3,'Железная руда':9},type:'weapon',class:'Воин',rarity:'Эпический',dmg:41,def:6,critDmg:30,dodge:6,baseDmg:41},
            
            // Легендарные (тир 5)
            {name:'Меч короля-воина',icon:'👑',img:'',tier:5,exp:650,time:14,resources:{'Адамантит':8,'Алмаз':3,'Мифриловая руда':6},type:'weapon',class:'Воин',rarity:'Легендарный',dmg:49,def:12,crit:12,critDmg:23,baseDmg:49},
            {name:'Секира великана',icon:'🪓',img:'',tier:5,exp:700,time:14,resources:{'Адамантит':8,'Алмаз':3,'Шкура дракона':2},type:'weapon',class:'Воин',rarity:'Легендарный',dmg:56,hp:72,crit:9,critDmg:29,baseDmg:56},
            {name:'Клинок тысячелетия',icon:'💎',img:'',tier:5,exp:750,time:15,resources:{'Адамантит':9,'Алмаз':5,'Мифриловая руда':8},type:'weapon',class:'Воин',rarity:'Легендарный',dmg:67,def:14,hp:96,crit:14,critDmg:35,baseDmg:67},
            
            // Древние (тир 6) - ТОЛЬКО КРАФТ
            {name:'Древний клинок предков',icon:'🌌',img:'',tier:6,exp:900,time:18,resources:{'Орихалк':8,'Адамантит':6,'Звездный камень':3},type:'weapon',class:'Воин',rarity:'Древний',dmg:85,def:18,crit:18,critDmg:42,dodge:6,baseDmg:85},
            {name:'Молот титанов',icon:'🔨',img:'',tier:6,exp:950,time:18,resources:{'Орихалк':8,'Адамантит':6,'Шкура титана':3},type:'weapon',class:'Воин',rarity:'Древний',dmg:100,hp:144,crit:12,critDmg:48,baseDmg:100},
            
            // Божественные (тир 6+) - ТОЛЬКО КРАФТ
            {name:'Клинок разрушителя миров',icon:'🌌',img:'',tier:6,exp:1200,time:20,resources:{'Орихалк':10,'Звездный камень':5,'Камень душ':3,'Искра творца':3,'Эссенция пустоты':2},type:'weapon',class:'Воин',rarity:'Божественный',dmg:96,def:22,hp:240,crit:30,critDmg:66,baseDmg:96},
            {name:'Топор армагеддона',icon:'☠️',img:'',tier:6,exp:1300,time:20,resources:{'Орихалк':12,'Звездный камень':5,'Шкура титана':3,'Искра творца':4,'Эссенция пустоты':3},type:'weapon',class:'Воин',rarity:'Божественный',dmg:132,def:26,hp:312,crit:34,critDmg:78,baseDmg:132},
            {name:'Меч богов',icon:'⚜️',img:'',tier:6,exp:1500,time:22,resources:{'Орихалк':14,'Звездный камень':6,'Камень душ':5,'Искра творца':5,'Эссенция пустоты':3},type:'weapon',class:'Воин',rarity:'Божественный',dmg:156,def:34,hp:420,crit:38,critDmg:90,baseDmg:156},
            {name:'Оружие Судьбы',icon:'🔱',img:'',tier:6,exp:1800,time:25,resources:{'Орихалк':15,'Звездный камень':8,'Камень душ':6,'Шкура титана':5,'Искра творца':6,'Эссенция пустоты':4},type:'weapon',class:'Воин',rarity:'Божественный',dmg:180,def:38,hp:540,crit:42,critDmg:102,baseDmg:180}
        ],
        armor: [
            // Шлемы - ресурсов на 50% больше
            {name:'Стальной шлем',icon:'⛑️',img:'',tier:1,exp:50,time:4,resources:{'Железная руда':5},type:'helmet',class:'Воин',rarity:'Обычный',def:12,hp:14,baseDef:12},
            {name:'Закаленный шлем',icon:'🪖',img:'',tier:2,exp:100,time:5,resources:{'Железная руда':6,'Серебряная руда':3},type:'helmet',class:'Воин',rarity:'Необычный',def:17,hp:24,crit:2,baseDef:17},
            {name:'Шлем рыцаря',icon:'👑',img:'',tier:3,exp:200,time:7,resources:{'Железная руда':8,'Золотая руда':3},type:'helmet',class:'Воин',rarity:'Редкий',def:24,hp:36,crit:5,baseDef:24},
            {name:'Титановый шлем',icon:'🛡️',img:'',tier:4,exp:350,time:9,resources:{'Мифриловая руда':6,'Аметист':2},type:'helmet',class:'Воин',rarity:'Эпический',def:34,hp:54,crit:7,baseDef:34},
            {name:'Шлем доблести',icon:'⭐',img:'',tier:5,exp:550,time:12,resources:{'Адамантит':6,'Алмаз':2},type:'helmet',class:'Воин',rarity:'Легендарный',def:38,hp:72,dmg:6,crit:6,baseDef:38},
            {name:'Корона бессмертных',icon:'👑',img:'',tier:5,exp:700,time:13,resources:{'Адамантит':8,'Алмаз':3},type:'helmet',class:'Воин',rarity:'Мифический',def:58,hp:132,crit:12,dodge:6,baseDef:58},
            
            // Древние/Божественные шлемы - ТОЛЬКО КРАФТ
            {name:'Венец древних знаний',icon:'📜',img:'',tier:6,exp:800,time:300,resources:{'Орихалк':6,'Звездный камень':2},type:'helmet',class:'Воин',rarity:'Древний',def:70,hp:168,crit:14,critDmg:12,baseDef:70},
            {name:'Шлем просветленного',icon:'💫',img:'',tier:6,exp:900,time:600,resources:{'Орихалк':8,'Звездный камень':3,'Камень душ':2,'Слёзы божества':2,'Искра творца':1},type:'helmet',class:'Воин',rarity:'Божественный',def:84,hp:216,crit:18,dodge:6,baseDef:84},
            {name:'Корона власти',icon:'👑',img:'',tier:6,exp:1000,time:600,resources:{'Орихалк':9,'Звездный камень':3,'Камень душ':3,'Слёзы божества':3,'Искра творца':2},type:'helmet',class:'Воин',rarity:'Божественный',def:96,hp:276,dmg:12,crit:22,baseDef:96},
            {name:'Венец всевластия',icon:'⚜️',img:'',tier:6,exp:1200,time:600,resources:{'Орихалк':10,'Звездный камень':5,'Камень душ':5,'Слёзы божества':4,'Искра творца':2},type:'helmet',class:'Воин',rarity:'Божественный',def:118,hp:348,crit:24,critDmg:18,baseDef:118},
            
            // Нагрудники
            {name:'Стальной нагрудник',icon:'🛡️',img:'',tier:1,exp:70,time:5,resources:{'Железная руда':8},type:'chest',class:'Воин',rarity:'Обычный',def:24,hp:30,baseDef:24},
            {name:'Закаленная броня',icon:'⚔️',img:'',tier:2,exp:130,time:6,resources:{'Железная руда':9,'Серебряная руда':5},type:'chest',class:'Воин',rarity:'Необычный',def:34,hp:48,dodge:1,baseDef:34},
            {name:'Драконья броня',icon:'🐉',img:'',tier:3,exp:250,time:8,resources:{'Железная руда':10,'Чешуя дракона':3,'Золотая руда':5},type:'chest',class:'Воин',rarity:'Редкий',def:43,hp:72,critDmg:10,baseDef:43},
            {name:'Титановый доспех',icon:'💪',img:'',tier:4,exp:450,time:11,resources:{'Мифриловая руда':9,'Сапфир':2},type:'chest',class:'Воин',rarity:'Эпический',def:58,hp:108,dodge:4,baseDef:58},
            {name:'Броня бессмертных',icon:'🌟',img:'',tier:5,exp:700,time:14,resources:{'Адамантит':9,'Алмаз':3},type:'chest',class:'Воин',rarity:'Легендарный',def:67,hp:144,dmg:6,critDmg:12,baseDef:67},
            {name:'Панцирь титана',icon:'🦾',img:'',tier:5,exp:800,time:15,resources:{'Адамантит':10,'Алмаз':5},type:'chest',class:'Воин',rarity:'Мифический',def:94,hp:240,dodge:7,baseDef:94},
            
            // Древние/Божественные нагрудники - ТОЛЬКО КРАФТ
            {name:'Доспех перворожденных',icon:'🌌',img:'',tier:6,exp:900,time:300,resources:{'Орихалк':8,'Звездный камень':3,'Адамантит':6},type:'chest',class:'Воин',rarity:'Древний',def:110,hp:300,critDmg:18,dodge:10,baseDef:110},
            {name:'Броня вознесения',icon:'✨',img:'',tier:6,exp:1000,time:600,resources:{'Орихалк':9,'Звездный камень':3,'Камень душ':3,'Слёзы божества':3,'Эссенция пустоты':2},type:'chest',class:'Воин',rarity:'Божественный',def:132,hp:372,dmg:12,dodge:12,baseDef:132},
            {name:'Доспех абсолюта',icon:'💫',img:'',tier:6,exp:1200,time:600,resources:{'Орихалк':10,'Звездный камень':5,'Камень душ':5,'Слёзы божества':4,'Эссенция пустоты':3},type:'chest',class:'Воин',rarity:'Божественный',def:156,hp:456,critDmg:24,dodge:14,baseDef:156},
            {name:'Панцирь божества',icon:'🌟',img:'',tier:6,exp:1500,time:600,resources:{'Орихалк':14,'Звездный камень':6,'Камень душ':6,'Слёзы божества':5,'Эссенция пустоты':3},type:'chest',class:'Воин',rarity:'Божественный',def:186,hp:564,dmg:18,dodge:18,baseDef:186},
            
            // Поножи
            {name:'Стальные поножи',icon:'👖',img:'',tier:1,exp:45,time:4,resources:{'Железная руда':5},type:'pants',class:'Воин',rarity:'Обычный',def:17,hp:22,baseDef:17},
            {name:'Закаленные поножи',icon:'🦵',img:'',tier:2,exp:90,time:5,resources:{'Железная руда':6,'Серебряная руда':3},type:'pants',class:'Воин',rarity:'Необычный',def:24,hp:34,dodge:2,baseDef:24},
            {name:'Поножи рыцаря',icon:'⚡',img:'',tier:3,exp:180,time:6,resources:{'Железная руда':8,'Золотая руда':3},type:'pants',class:'Воин',rarity:'Редкий',def:31,hp:50,crit:4,baseDef:31},
            {name:'Титановые поножи',icon:'🔩',img:'',tier:4,exp:300,time:8,resources:{'Мифриловая руда':6,'Аметист':2},type:'pants',class:'Воин',rarity:'Эпический',def:41,hp:72,dodge:6,baseDef:41},
            {name:'Поножи бессмертного',icon:'✨',img:'',tier:5,exp:500,time:11,resources:{'Адамантит':6,'Алмаз':2},type:'pants',class:'Воин',rarity:'Легендарный',def:48,hp:96,dmg:4,dodge:7,baseDef:48},
            {name:'Поножи вечности',icon:'🔱',img:'',tier:5,exp:600,time:12,resources:{'Адамантит':8,'Алмаз':3},type:'pants',class:'Воин',rarity:'Мифический',def:67,hp:156,dodge:10,baseDef:67},
            
            // Древние/Божественные поножи - ТОЛЬКО КРАФТ
            {name:'Поножи древнего героя',icon:'🌌',img:'',tier:6,exp:700,time:300,resources:{'Орихалк':6,'Звездный камень':3},type:'pants',class:'Воин',rarity:'Древний',def:82,hp:204,critDmg:12,dodge:12,baseDef:82},
            {name:'Набедренники возмездия',icon:'⚡',img:'',tier:6,exp:800,time:600,resources:{'Орихалк':8,'Звездный камень':3,'Камень душ':2,'Эссенция пустоты':3,'Искра творца':1},type:'pants',class:'Воин',rarity:'Божественный',def:96,hp:264,dmg:10,crit:6,dodge:14,baseDef:96},
            {name:'Поножи просветленного',icon:'💫',img:'',tier:6,exp:900,time:600,resources:{'Орихалк':9,'Звездный камень':5,'Камень душ':3,'Эссенция пустоты':4,'Искра творца':2},type:'pants',class:'Воин',rarity:'Божественный',def:115,hp:336,critDmg:18,dodge:17,baseDef:115},
            {name:'Набедренники творца',icon:'🔱',img:'',tier:6,exp:1100,time:600,resources:{'Орихалк':10,'Звездный камень':5,'Камень душ':5,'Эссенция пустоты':5,'Искра творца':2},type:'pants',class:'Воин',rarity:'Божественный',def:138,hp:432,dmg:14,dodge:22,baseDef:138},
            
            // Сапоги
            {name:'Стальные сапоги',icon:'👢',img:'',tier:1,exp:40,time:3,resources:{'Железная руда':3},type:'boots',class:'Воин',rarity:'Обычный',def:8,dodge:2,baseDef:8},
            {name:'Сапоги скорости',icon:'👟',img:'',tier:2,exp:80,time:5,resources:{'Железная руда':5,'Серебряная руда':3},type:'boots',class:'Воин',rarity:'Необычный',def:12,hp:14,dodge:7,baseDef:12},
            {name:'Сапоги странника',icon:'🥾',img:'',tier:3,exp:150,time:7,resources:{'Железная руда':6,'Золотая руда':3},type:'boots',class:'Воин',rarity:'Редкий',def:16,hp:24,dodge:12,baseDef:16},
            {name:'Крылатые сандалии',icon:'🪽',img:'',tier:4,exp:250,time:10,resources:{'Мифриловая руда':5,'Сапфир':2},type:'boots',class:'Воин',rarity:'Эпический',def:19,hp:42,dodge:17,baseDef:19},
            {name:'Сапоги ветра',icon:'💨',img:'',tier:5,exp:400,time:14,resources:{'Адамантит':5,'Алмаз':2},type:'boots',class:'Воин',rarity:'Легендарный',def:24,hp:60,dodge:22,baseDef:24},
            {name:'Сапоги вселенной',icon:'🌠',img:'',tier:5,exp:500,time:15,resources:{'Адамантит':6,'Алмаз':3},type:'boots',class:'Воин',rarity:'Мифический',def:36,hp:120,dodge:32,baseDef:36},
            
            // Древние/Божественные сапоги - ТОЛЬКО КРАФТ
            {name:'Сандалии древнего ветра',icon:'🌬️',img:'',tier:6,exp:600,time:300,resources:{'Орихалк':6,'Звездный камень':3},type:'boots',class:'Воин',rarity:'Древний',def:43,hp:156,dodge:40,baseDef:43},
            {name:'Сапоги вознесения',icon:'💫',img:'',tier:6,exp:700,time:600,resources:{'Орихалк':8,'Звездный камень':3,'Камень душ':2,'Искра творца':2,'Слёзы божества':1},type:'boots',class:'Воин',rarity:'Божественный',def:53,hp:204,dmg:6,dodge:48,baseDef:53},
            {name:'Сандалии абсолютной скорости',icon:'⚡',img:'',tier:6,exp:800,time:600,resources:{'Орихалк':9,'Звездный камень':5,'Камень душ':3,'Искра творца':3,'Слёзы божества':2},type:'boots',class:'Воин',rarity:'Божественный',def:62,hp:264,crit:6,dodge:56,baseDef:62},
            {name:'Сандалии творца',icon:'🔱',img:'',tier:6,exp:1000,time:600,resources:{'Орихалк':10,'Звездный камень':5,'Камень душ':5,'Искра творца':4,'Слёзы божества':2},type:'boots',class:'Воин',rarity:'Божественный',def:77,hp:336,dmg:10,critDmg:12,dodge:66,baseDef:77}
        ]
    },

    // ===== КОЖЕВЕННОЕ ДЕЛО (для Лучника) - ресурсов на 50% больше =====
    'leatherworking': {
        weapons: [
            {name:'Охотничий лук',icon:'🏹',img:'',tier:1,exp:55,time:4,resources:{'Сосновая древесина':5,'Кожа':3,'Шкура волка':2},type:'weapon',class:'Лучник',rarity:'Обычный',dmg:13,dodge:4,baseDmg:13},
            {name:'Легкий арбалет',icon:'🔫',img:'',tier:1,exp:60,time:4,resources:{'Железная руда':5,'Сосновая древесина':3,'Шкура лисы':1},type:'weapon',class:'Лучник',rarity:'Обычный',dmg:16,crit:7,baseDmg:16},
            {name:'Составной лук',icon:'🏹',img:'',tier:2,exp:110,time:5,resources:{'Серебряная руда':3,'Дубовая древесина':6,'Толстая кожа':3,'Шкура медведя':2},type:'weapon',class:'Лучник',rarity:'Необычный',dmg:22,crit:11,dodge:6,baseDmg:22},
            {name:'Боевой арбалет',icon:'⚔️',img:'',tier:2,exp:120,time:5,resources:{'Железная руда':6,'Серебряная руда':3,'Толстая кожа':3,'Шкура медведя':2},type:'weapon',class:'Лучник',rarity:'Необычный',dmg:24,hp:14,critDmg:22,baseDmg:24},
            {name:'Снайперский лук',icon:'🎯',img:'',tier:3,exp:250,time:7,resources:{'Золотая руда':5,'Красное дерево':6,'Закалённая кожа':3,'Шкура тигра':2},type:'weapon',class:'Лучник',rarity:'Редкий',dmg:31,crit:14,critDmg:18,dodge:6,baseDmg:31},
            {name:'Убойный арбалет',icon:'🏹',img:'',tier:3,exp:270,time:7,resources:{'Золотая руда':5,'Красное дерево':5,'Закалённая кожа':5,'Шкура тигра':2,'Чешуя дракона':1},type:'weapon',class:'Лучник',rarity:'Редкий',dmg:34,def:6,hp:18,crit:12,critDmg:22,baseDmg:34},
            {name:'Лук ветра',icon:'💨',img:'',tier:4,exp:400,time:10,resources:{'Мифриловая руда':5,'Эбеновое дерево':6,'Закалённая кожа':5,'Шкура йети':2,'Сапфир':2},type:'weapon',class:'Лучник',rarity:'Эпический',dmg:43,crit:19,critDmg:26,dodge:10,baseDmg:43},
            {name:'Арбалет шторма',icon:'⚡',img:'',tier:4,exp:420,time:10,resources:{'Мифриловая руда':6,'Эбеновое дерево':6,'Закалённая кожа':6,'Шкура йети':3,'Рубин':2},type:'weapon',class:'Лучник',rarity:'Эпический',dmg:48,def:10,hp:36,crit:17,critDmg:29,baseDmg:48},
            {name:'Лук короля-охотника',icon:'👑',img:'',tier:5,exp:650,time:14,resources:{'Адамантит':6,'Древесина мирового древа':5,'Драконья чешуя':3,'Кожа феникса':2,'Алмаз':2},type:'weapon',class:'Лучник',rarity:'Легендарный',dmg:58,crit:22,critDmg:34,dodge:12,baseDmg:58},
            {name:'Арбалет драконобойца',icon:'🐉',img:'',tier:5,exp:680,time:14,resources:{'Адамантит':6,'Древесина мирового древа':5,'Драконья чешуя':5,'Шкура дракона':2,'Алмаз':2},type:'weapon',class:'Лучник',rarity:'Легендарный',dmg:65,hp:54,crit:19,critDmg:36,dodge:6,baseDmg:65},
            {name:'Лук звездного пути',icon:'⭐',img:'',tier:5,exp:750,time:15,resources:{'Адамантит':8,'Древесина мирового древа':6,'Кожа феникса':3,'Звездный камень':3},type:'weapon',class:'Лучник',rarity:'Легендарный',dmg:79,hp:72,crit:26,critDmg:46,dodge:14,baseDmg:79},
            
            // Древние/Божественные - ТОЛЬКО КРАФТ
            {name:'Лук древнего снайпера',icon:'🌌',img:'',tier:6,exp:900,time:18,resources:{'Орихалк':8,'Древесина мирового древа':6,'Шкура левиафана':2,'Звездный камень':3},type:'weapon',class:'Лучник',rarity:'Древний',dmg:96,hp:96,crit:31,critDmg:54,dodge:18,baseDmg:96},
            {name:'Арбалет первобытного ужаса',icon:'💀',img:'',tier:6,exp:950,time:18,resources:{'Орихалк':8,'Древесина мирового древа':6,'Шкура левиафана':2,'Звездный камень':3,'Камень душ':2},type:'weapon',class:'Лучник',rarity:'Древний',dmg:114,hp:120,crit:29,critDmg:60,dodge:12,baseDmg:114},
            {name:'Лук судьбы',icon:'🎯',img:'',tier:6,exp:1100,time:20,resources:{'Орихалк':9,'Древесина мирового древа':8,'Шкура левиафана':3,'Звездный камень':5,'Камень душ':3,'Искра творца':4,'Эссенция пустоты':3},type:'weapon',class:'Лучник',rarity:'Божественный',dmg:126,hp:144,crit:36,critDmg:78,dodge:19,baseDmg:126},
            {name:'Арбалет возмездия',icon:'⚡',img:'',tier:6,exp:1200,time:20,resources:{'Орихалк':10,'Древесина мирового древа':8,'Шкура левиафана':3,'Звездный камень':5,'Камень душ':3,'Искра творца':5,'Эссенция пустоты':3},type:'weapon',class:'Лучник',rarity:'Божественный',dmg:150,hp:180,crit:41,critDmg:90,dodge:22,baseDmg:150},
            {name:'Лук небесного охотника',icon:'🌟',img:'',tier:6,exp:1400,time:22,resources:{'Орихалк':12,'Древесина мирового древа':9,'Шкура левиафана':4,'Звездный камень':6,'Камень душ':5,'Искра творца':5,'Эссенция пустоты':4},type:'weapon',class:'Лучник',rarity:'Божественный',dmg:174,hp:216,crit:46,critDmg:102,dodge:24,baseDmg:174},
            {name:'Оружие перворожденных',icon:'🔱',img:'',tier:6,exp:1600,time:25,resources:{'Орихалк':14,'Древесина мирового древа':10,'Шкура левиафана':4,'Звездный камень':8,'Камень душ':6,'Искра творца':6,'Эссенция пустоты':4},type:'weapon',class:'Лучник',rarity:'Божественный',dmg:204,hp:264,crit:50,critDmg:120,dodge:29,baseDmg:204}
        ],
        armor: [
            {name:'Кожаный шлем',icon:'🎭',img:'',tier:1,exp:40,time:3,resources:{'Кожа':5,'Шкура кролика':1},type:'helmet',class:'Лучник',rarity:'Обычный',def:5,hp:10,dodge:4,baseDef:5},
            {name:'Кожаная куртка',icon:'🧥',img:'',tier:1,exp:50,time:4,resources:{'Кожа':6,'Шкура кролика':2},type:'chest',class:'Лучник',rarity:'Обычный',def:7,hp:14,dodge:5,baseDef:7},
            {name:'Кожаные поножи',icon:'👖',img:'',tier:1,exp:35,time:3,resources:{'Кожа':5,'Мелкая шкура':1},type:'pants',class:'Лучник',rarity:'Обычный',def:5,hp:12,dodge:4,baseDef:5},
            {name:'Кожаные сапоги',icon:'👢',img:'',tier:1,exp:35,time:3,resources:{'Кожа':5,'Шкура лисы':1},type:'boots',class:'Лучник',rarity:'Обычный',def:5,dodge:6,baseDef:5},
            {name:'Сапоги скорости',icon:'👟',img:'',tier:2,exp:80,time:5,resources:{'Кожа':5,'Толстая кожа':3,'Шкура медведя':2},type:'boots',class:'Лучник',rarity:'Необычный',def:12,hp:14,dodge:7,baseDef:12},
            {name:'Сапоги странника',icon:'🥾',img:'',tier:3,exp:150,time:7,resources:{'Закалённая кожа':5,'Толстая кожа':3,'Шкура тигра':2},type:'boots',class:'Лучник',rarity:'Редкий',def:16,hp:24,dodge:12,baseDef:16},
            {name:'Крылатые сандалии',icon:'🪽',img:'',tier:4,exp:250,time:10,resources:{'Закалённая кожа':6,'Шкура йети':2,'Шёлк':3,'Сапфир':2},type:'boots',class:'Лучник',rarity:'Эпический',def:19,hp:42,dodge:17,baseDef:19},
            {name:'Сапоги ветра',icon:'💨',img:'',tier:5,exp:400,time:14,resources:{'Драконья чешуя':5,'Закалённая кожа':6,'Кожа феникса':2,'Алмаз':2},type:'boots',class:'Лучник',rarity:'Легендарный',def:24,hp:60,dodge:22,baseDef:24},
            {name:'Сапоги вселенной',icon:'🌠',img:'',tier:5,exp:500,time:15,resources:{'Драконья чешуя':6,'Закалённая кожа':8,'Шкура дракона':2,'Алмаз':3},type:'boots',class:'Лучник',rarity:'Мифический',def:36,hp:120,dodge:32,baseDef:36},

            // Древние/Божественные шлем, нагрудник, поножи — ТОЛЬКО КРАФТ
            {name:'Капюшон древнего следопыта',icon:'🎯',img:'',tier:6,exp:800,time:300,resources:{'Шкура титана':3,'Шкура левиафана':2,'Древесина мирового древа':4,'Звездный камень':2},type:'helmet',class:'Лучник',rarity:'Древний',def:52,hp:144,crit:16,dodge:10,baseDef:52},
            {name:'Койф звёздного охотника',icon:'🏹',img:'',tier:6,exp:900,time:600,resources:{'Шкура титана':4,'Шкура левиафана':2,'Драконья чешуя':5,'Звездный камень':3,'Орихалк':4,'Искра творца':2,'Слёзы божества':2},type:'helmet',class:'Лучник',rarity:'Божественный',def:67,hp:192,crit:20,dodge:12,baseDef:67},
            {name:'Шлем небесного лучника',icon:'⭐',img:'',tier:6,exp:1000,time:600,resources:{'Шкура титана':5,'Шкура левиафана':3,'Драконья чешуя':6,'Звездный камень':3,'Орихалк':6,'Камень душ':2,'Искра творца':2,'Слёзы божества':3},type:'helmet',class:'Лучник',rarity:'Божественный',def:77,hp:240,dmg:8,crit:22,dodge:14,baseDef:77},
            {name:'Корона меткого стрелка',icon:'👑',img:'',tier:6,exp:1200,time:600,resources:{'Шкура титана':6,'Шкура левиафана':3,'Драконья чешуя':8,'Звездный камень':5,'Орихалк':8,'Камень душ':3,'Искра творца':3,'Слёзы божества':3},type:'helmet',class:'Лучник',rarity:'Божественный',def:94,hp:300,crit:26,critDmg:14,dodge:16,baseDef:94},

            {name:'Кираса древнего охотника',icon:'🌌',img:'',tier:6,exp:900,time:300,resources:{'Шкура титана':4,'Шкура левиафана':2,'Драконья чешуя':5,'Древесина мирового древа':5,'Орихалк':4},type:'chest',class:'Лучник',rarity:'Древний',def:82,hp:252,critDmg:14,dodge:14,baseDef:82},
            {name:'Панцирь ветра',icon:'💨',img:'',tier:6,exp:1000,time:600,resources:{'Шкура титана':5,'Шкура левиафана':3,'Драконья чешуя':6,'Древесина мирового древа':6,'Орихалк':6,'Звездный камень':3,'Эссенция пустоты':3,'Искра творца':2},type:'chest',class:'Лучник',rarity:'Божественный',def:106,hp:312,dmg:8,dodge:16,baseDef:106},
            {name:'Грудник левиафана',icon:'🐋',img:'',tier:6,exp:1200,time:600,resources:{'Шкура титана':6,'Шкура левиафана':3,'Драконья чешуя':8,'Древесина мирового древа':6,'Орихалк':8,'Звездный камень':5,'Камень душ':3,'Эссенция пустоты':4,'Искра творца':3},type:'chest',class:'Лучник',rarity:'Божественный',def:125,hp:384,critDmg:18,dodge:18,baseDef:125},
            {name:'Броня перворожденного лучника',icon:'🌟',img:'',tier:6,exp:1500,time:600,resources:{'Шкура титана':6,'Шкура левиафана':4,'Драконья чешуя':8,'Древесина мирового древа':8,'Орихалк':10,'Звездный камень':6,'Камень душ':5,'Эссенция пустоты':5,'Искра творца':3},type:'chest',class:'Лучник',rarity:'Божественный',def:149,hp:468,dmg:12,critDmg:22,dodge:22,baseDef:149},

            {name:'Поножи древнего следопыта',icon:'🦵',img:'',tier:6,exp:700,time:300,resources:{'Шкура титана':3,'Шкура левиафана':2,'Драконья чешуя':4,'Звездный камень':2},type:'pants',class:'Лучник',rarity:'Древний',def:62,hp:180,critDmg:10,dodge:16,baseDef:62},
            {name:'Наголенники меткого выстрела',icon:'⚡',img:'',tier:6,exp:800,time:600,resources:{'Шкура титана':4,'Шкура левиафана':2,'Драконья чешуя':5,'Орихалк':6,'Звездный камень':3,'Камень душ':2,'Эссенция пустоты':3,'Искра творца':2},type:'pants',class:'Лучник',rarity:'Божественный',def:77,hp:228,dmg:6,crit:8,dodge:18,baseDef:77},
            {name:'Поножи небесного стремления',icon:'💫',img:'',tier:6,exp:900,time:600,resources:{'Шкура титана':5,'Шкура левиафана':3,'Драконья чешуя':6,'Орихалк':8,'Звездный камень':5,'Камень душ':3,'Эссенция пустоты':4,'Искра творца':2},type:'pants',class:'Лучник',rarity:'Божественный',def:92,hp:288,critDmg:16,dodge:22,baseDef:92},
            {name:'Набедренники древнего ветра',icon:'🔱',img:'',tier:6,exp:1100,time:600,resources:{'Шкура титана':6,'Шкура левиафана':3,'Драконья чешуя':8,'Орихалк':10,'Звездный камень':5,'Камень душ':5,'Эссенция пустоты':5,'Искра творца':3},type:'pants',class:'Лучник',rarity:'Божественный',def:110,hp:372,dmg:10,dodge:26,baseDef:110},

            // Древние/Божественные сапоги - ТОЛЬКО КРАФТ
            {name:'Сандалии древнего ветра',icon:'🌬️',img:'',tier:6,exp:600,time:300,resources:{'Шкура титана':3,'Шкура левиафана':2,'Драконья чешуя':5,'Звездный камень':2},type:'boots',class:'Лучник',rarity:'Древний',def:43,hp:156,dodge:40,baseDef:43},
            {name:'Сапоги вознесения',icon:'💫',img:'',tier:6,exp:700,time:600,resources:{'Шкура титана':4,'Шкура левиафана':2,'Драконья чешуя':6,'Звездный камень':3,'Искра творца':2,'Слёзы божества':1},type:'boots',class:'Лучник',rarity:'Божественный',def:53,hp:204,dodge:48,baseDef:53},
            {name:'Сандалии абсолютной скорости',icon:'⚡',img:'',tier:6,exp:800,time:600,resources:{'Шкура титана':6,'Шкура левиафана':2,'Драконья чешуя':8,'Звездный камень':3,'Камень душ':2,'Искра творца':3,'Слёзы божества':2},type:'boots',class:'Лучник',rarity:'Божественный',def:62,hp:264,dodge:56,baseDef:62},
            {name:'Сандалии творца',icon:'🔱',img:'',tier:6,exp:1000,time:600,resources:{'Шкура титана':6,'Шкура левиафана':3,'Драконья чешуя':8,'Звездный камень':5,'Камень душ':3,'Искра творца':4,'Слёзы божества':2},type:'boots',class:'Лучник',rarity:'Божественный',def:77,hp:336,dodge:66,baseDef:77}
        ]
    },

    // ===== ПОРТНЯЖНОЕ ДЕЛО (для Мага) - ресурсов на 50% больше =====
    'tailoring': {
        weapons: [
            {name:'Дубовый посох',icon:'🪄',img:'png/weapons/mage/mage_staff_1.png',tier:1,exp:55,time:4,resources:{'Дубовая древесина':6,'Паутина':3},type:'weapon',class:'Маг',rarity:'Обычный',dmg:10,hp:18,baseDmg:10},
            {name:'Кристальный скипетр',icon:'💠',img:'png/weapons/mage/mage_staff_2.png',tier:1,exp:60,time:4,resources:{'Медная руда':5,'Аметист':2,'Паутина':3},type:'weapon',class:'Маг',rarity:'Обычный',dmg:12,crit:5,baseDmg:12},
            {name:'Посох элементаля',icon:'🌍',img:'png/weapons/mage/mage_staff_3.png',tier:2,exp:120,time:5,resources:{'Серебряная руда':5,'Аметист':3,'Шёлк':3},type:'weapon',class:'Маг',rarity:'Необычный',dmg:18,hp:24,crit:10,baseDmg:18},
            {name:'Скипетр мудреца',icon:'📜',img:'png/weapons/mage/mage_staff_4.png',tier:2,exp:130,time:5,resources:{'Серебряная руда':5,'Сапфир':2,'Шёлк':5},type:'weapon',class:'Маг',rarity:'Необычный',dmg:20,critDmg:22,dodge:4,baseDmg:20},
            {name:'Посох архимага',icon:'🧙',img:'png/weapons/mage/mage_staff_5.png',tier:3,exp:260,time:7,resources:{'Золотая руда':5,'Рубин':2,'Мифриловая нить':3},type:'weapon',class:'Маг',rarity:'Редкий',dmg:26,crit:12,critDmg:22,baseDmg:26},
            {name:'Скипетр волшебника',icon:'✨',img:'png/weapons/mage/mage_staff_6.png',tier:3,exp:280,time:7,resources:{'Золотая руда':5,'Изумруд':2,'Мифриловая нить':3},type:'weapon',class:'Маг',rarity:'Редкий',dmg:30,def:6,hp:24,crit:10,critDmg:24,baseDmg:30},
            {name:'Жезл чародея',icon:'🔮',img:'png/weapons/mage/mage_staff_7.png',tier:4,exp:420,time:10,resources:{'Мифриловая руда':6,'Изумруд':3,'Мифриловая нить':5,'Звездная пыльца':2},type:'weapon',class:'Маг',rarity:'Эпический',dmg:38,hp:48,crit:14,critDmg:30,dodge:6,baseDmg:38},
            {name:'Посох заклинаний',icon:'📜',img:'png/weapons/mage/mage_staff_8.png',tier:4,exp:440,time:10,resources:{'Мифриловая руда':6,'Рубин':3,'Мифриловая нить':5,'Звездная пыльца':2},type:'weapon',class:'Маг',rarity:'Эпический',dmg:43,hp:72,crit:17,critDmg:34,baseDmg:43},
            {name:'Посох короля-мага',icon:'👑',img:'png/weapons/mage/mage_staff_9.png',tier:5,exp:680,time:14,resources:{'Адамантит':6,'Алмаз':3,'Звёздный шёлк':3,'Звездная пыльца':3},type:'weapon',class:'Маг',rarity:'Легендарный',dmg:53,hp:60,crit:19,critDmg:36,baseDmg:53},
            {name:'Скипетр драконьей магии',icon:'🐉',img:'png/weapons/mage/mage_staff_10.png',tier:5,exp:700,time:14,resources:{'Адамантит':6,'Алмаз':3,'Звёздный шёлк':5,'Драконья чешуя':2},type:'weapon',class:'Маг',rarity:'Легендарный',dmg:60,def:10,hp:84,crit:17,critDmg:38,baseDmg:60},
            {name:'Жезл вечности',icon:'💎',img:'png/weapons/mage/mage_staff_11.png',tier:5,exp:800,time:15,resources:{'Адамантит':8,'Алмаз':5,'Звёздный шёлк':5,'Звездная пыльца':5},type:'weapon',class:'Маг',rarity:'Мифический',dmg:72,hp:96,crit:22,critDmg:46,dodge:6,baseDmg:72},
            
            // Древние/Божественные - ТОЛЬКО КРАФТ
            {name:'Посох древнего мага',icon:'🌌',img:'png/weapons/mage/mage_staff_12.png',tier:6,exp:900,time:18,resources:{'Орихалк':8,'Звездный камень':3,'Звёздный шёлк':5,'Звездная пыльца':5},type:'weapon',class:'Маг',rarity:'Древний',dmg:89,hp:120,crit:26,critDmg:54,dodge:6,baseDmg:89},
            {name:'Скипетр первозданной магии',icon:'✨',img:'png/weapons/mage/mage_staff_13.png',tier:6,exp:1000,time:18,resources:{'Орихалк':8,'Звездный камень':3,'Звёздный шёлк':6,'Камень душ':2},type:'weapon',class:'Маг',rarity:'Древний',dmg:106,def:12,hp:156,crit:24,critDmg:60,baseDmg:106},
            {name:'Посох абсолютной магии',icon:'🔮',img:'png/weapons/mage/mage_staff_14.png',tier:6,exp:1200,time:20,resources:{'Орихалк':9,'Звездный камень':5,'Звёздный шёлк':6,'Камень душ':3,'Искра творца':4,'Эссенция пустоты':3},type:'weapon',class:'Маг',rarity:'Божественный',dmg:114,hp:192,crit:34,critDmg:90,dodge:4,baseDmg:114},
            {name:'Жезл вселенной',icon:'🌠',img:'png/weapons/mage/mage_staff_15.png',tier:6,exp:1300,time:20,resources:{'Орихалк':10,'Звездный камень':5,'Звёздный шёлк':8,'Камень душ':3,'Искра творца':5,'Эссенция пустоты':3},type:'weapon',class:'Маг',rarity:'Божественный',dmg:132,hp:240,crit:38,critDmg:102,baseDmg:132},
            {name:'Скипетр божественной силы',icon:'👑',img:'png/weapons/mage/PS> git status.png',tier:6,exp:1500,time:22,resources:{'Орихалк':12,'Звездный камень':6,'Звёздный шёлк':8,'Камень душ':5,'Искра творца':5,'Эссенция пустоты':4},type:'weapon',class:'Маг',rarity:'Божественный',dmg:156,hp:300,crit:42,critDmg:120,baseDmg:156},
            {name:'Посох мироздания',icon:'🌟',img:'png/weapons/mage/mage_staff_17.png',tier:6,exp:1800,time:25,resources:{'Орихалк':14,'Звездный камень':8,'Звёздный шёлк':9,'Камень душ':6,'Искра творца':6,'Эссенция пустоты':4},type:'weapon',class:'Маг',rarity:'Божественный',dmg:180,hp:384,crit:48,critDmg:144,baseDmg:180}
        ],
        armor: [
            // === СЕТ "КОЖАНЫЙ" (базовый, тир 1-5) ===
            {name:'Кожаная роба',icon:'👘',img:'png/armor/mage/kox-nag.png',tier:1,exp:50,time:3,resources:{'Кожа':6},type:'chest',class:'Маг',rarity:'Обычный',def:3,hp:14,mana:14,baseDef:3},
            {name:'Кожаная роба зачарованная',icon:'👘',img:'png/armor/mage/kox-nag.png',tier:2,exp:80,time:4,resources:{'Кожа':7,'Паутина':2},type:'chest',class:'Маг',rarity:'Необычный',def:5,hp:22,mana:24,baseDef:5},
            {name:'Кожаная роба рейнджера',icon:'👘',img:'png/armor/mage/kox-nag.png',tier:3,exp:150,time:6,resources:{'Кожа':8,'Шёлк':3},type:'chest',class:'Маг',rarity:'Редкий',def:10,hp:36,mana:48,baseDef:10},
            {name:'Кожаная роба тени',icon:'👘',img:'png/armor/mage/kox-nag.png',tier:4,exp:280,time:9,resources:{'Кожа':9,'Мифриловая нить':3},type:'chest',class:'Маг',rarity:'Эпический',def:18,hp:56,mana:84,baseDef:18},
            {name:'Кожаная роба призрака',icon:'👘',img:'png/armor/mage/kox-nag.png',tier:5,exp:450,time:12,resources:{'Кожа':10,'Драконья чешуя':2},type:'chest',class:'Маг',rarity:'Легендарный',def:20,hp:80,mana:120,baseDef:20},
            
            {name:'Кожаный колпак',icon:'🎭',img:'png/armor/mage/kox-helm.png',tier:1,exp:40,time:2,resources:{'Кожа':5},type:'helmet',class:'Маг',rarity:'Обычный',def:1,hp:7,mana:7,baseDef:1},
            {name:'Кожаный колпак зачарованный',icon:'🎭',img:'png/armor/mage/kox-helm.png',tier:2,exp:60,time:3,resources:{'Кожа':6,'Паутина':2},type:'helmet',class:'Маг',rarity:'Необычный',def:3,hp:12,mana:14,baseDef:3},
            {name:'Кожаный колпак рейнджера',icon:'🎭',img:'png/armor/mage/kox-helm.png',tier:3,exp:120,time:5,resources:{'Кожа':7,'Шёлк':2},type:'helmet',class:'Маг',rarity:'Редкий',def:6,hp:24,mana:30,baseDef:6},
            {name:'Кожаный колпак тени',icon:'🎭',img:'png/armor/mage/kox-helm.png',tier:4,exp:220,time:7,resources:{'Кожа':8,'Мифриловая нить':2},type:'helmet',class:'Маг',rarity:'Эпический',def:11,hp:36,mana:54,baseDef:11},
            {name:'Кожаный колпак призрака',icon:'🎭',img:'png/armor/mage/kox-helm.png',tier:5,exp:350,time:10,resources:{'Кожа':9,'Драконья чешуя':1},type:'helmet',class:'Маг',rarity:'Легендарный',def:14,hp:50,mana:72,baseDef:14},
            
            {name:'Кожаные штаны',icon:'👖',img:'png/armor/mage/kox-wtan.png',tier:1,exp:35,time:2,resources:{'Кожа':5},type:'pants',class:'Маг',rarity:'Обычный',def:1,hp:8,mana:8,baseDef:1},
            {name:'Кожаные штаны зачарованные',icon:'👖',img:'png/armor/mage/kox-wtan.png',tier:2,exp:55,time:3,resources:{'Кожа':6,'Паутина':2},type:'pants',class:'Маг',rarity:'Необычный',def:3,hp:12,mana:14,baseDef:3},
            {name:'Кожаные штаны рейнджера',icon:'👖',img:'png/armor/mage/kox-wtan.png',tier:3,exp:100,time:4,resources:{'Кожа':7,'Шёлк':2},type:'pants',class:'Маг',rarity:'Редкий',def:5,hp:20,mana:24,baseDef:5},
            {name:'Кожаные штаны тени',icon:'👖',img:'png/armor/mage/kox-wtan.png',tier:4,exp:200,time:7,resources:{'Кожа':8,'Мифриловая нить':2},type:'pants',class:'Маг',rarity:'Эпический',def:10,hp:30,mana:42,baseDef:10},
            {name:'Кожаные штаны призрака',icon:'👖',img:'png/armor/mage/kox-wtan.png',tier:5,exp:320,time:10,resources:{'Кожа':9,'Драконья чешуя':1},type:'pants',class:'Маг',rarity:'Легендарный',def:12,hp:42,mana:60,baseDef:12},
            
            {name:'Кожаные сапоги',icon:'👢',img:'png/armor/mage/kox-buc.png',tier:1,exp:35,time:2,resources:{'Кожа':5},type:'boots',class:'Маг',rarity:'Обычный',def:1,dodge:3,mana:6,baseDef:1},
            {name:'Кожаные сапоги зачарованные',icon:'👢',img:'png/armor/mage/kox-buc.png',tier:2,exp:55,time:3,resources:{'Кожа':6,'Паутина':2},type:'boots',class:'Маг',rarity:'Необычный',def:3,dodge:5,mana:10,baseDef:3},
            {name:'Кожаные сапоги рейнджера',icon:'👢',img:'png/armor/mage/kox-buc.png',tier:3,exp:100,time:4,resources:{'Кожа':7,'Шёлк':2},type:'boots',class:'Маг',rarity:'Редкий',def:5,dodge:7,mana:22,baseDef:5},
            {name:'Кожаные сапоги тени',icon:'👢',img:'png/armor/mage/kox-buc.png',tier:4,exp:200,time:7,resources:{'Кожа':8,'Мифриловая нить':2},type:'boots',class:'Маг',rarity:'Эпический',def:10,dodge:10,mana:36,baseDef:10},
            {name:'Кожаные сапоги призрака',icon:'👢',img:'png/armor/mage/kox-buc.png',tier:5,exp:320,time:10,resources:{'Кожа':9,'Драконья чешуя':1},type:'boots',class:'Маг',rarity:'Легендарный',def:10,dodge:12,mana:48,baseDef:10},
            
            // === СЕТ "КОЛЬЧУЖНЫЙ" (продвинутый, тир 2-5) ===
            {name:'Кольчужная мантия',icon:'👘',img:'png/armor/mage/kolch-nag.png',tier:2,exp:80,time:4,resources:{'Медная руда':4,'Кожа':4},type:'chest',class:'Маг',rarity:'Необычный',def:4,hp:20,mana:20,baseDef:4},
            {name:'Кольчужная мантия мудреца',icon:'👘',img:'png/armor/mage/kolch-nag.png',tier:3,exp:150,time:6,resources:{'Серебряная руда':4,'Кожа':5},type:'chest',class:'Маг',rarity:'Редкий',def:10,hp:35,mana:42,baseDef:10},
            {name:'Кольчужная мантия архимага',icon:'👘',img:'png/armor/mage/kolch-nag.png',tier:4,exp:280,time:9,resources:{'Золотая руда':4,'Кожа':6},type:'chest',class:'Маг',rarity:'Эпический',def:18,hp:56,mana:72,baseDef:18},
            {name:'Кольчужная мантия провидца',icon:'👘',img:'png/armor/mage/kolch-nag.png',tier:5,exp:450,time:12,resources:{'Мифриловая руда':4,'Кожа':7},type:'chest',class:'Маг',rarity:'Легендарный',def:20,hp:80,mana:108,baseDef:20},
            
            {name:'Кольчужный капюшон',icon:'🎭',img:'png/armor/mage/kolch-helm.png',tier:2,exp:60,time:3,resources:{'Медная руда':3,'Кожа':3},type:'helmet',class:'Маг',rarity:'Необычный',def:2,hp:11,mana:12,baseDef:2},
            {name:'Кольчужный капюшон мудреца',icon:'🎭',img:'png/armor/mage/kolch-helm.png',tier:3,exp:120,time:5,resources:{'Серебряная руда':3,'Кожа':4},type:'helmet',class:'Маг',rarity:'Редкий',def:6,hp:22,mana:24,baseDef:6},
            {name:'Кольчужный капюшон архимага',icon:'🎭',img:'png/armor/mage/kolch-helm.png',tier:4,exp:220,time:7,resources:{'Золотая руда':3,'Кожа':5},type:'helmet',class:'Маг',rarity:'Эпический',def:11,hp:35,mana:42,baseDef:11},
            {name:'Кольчужный капюшон провидца',icon:'🎭',img:'png/armor/mage/kolch-helm.png',tier:5,exp:350,time:10,resources:{'Мифриловая руда':3,'Кожа':6},type:'helmet',class:'Маг',rarity:'Легендарный',def:14,hp:50,mana:60,baseDef:14},
            
            {name:'Кольчужные поножи',icon:'👖',img:'png/armor/mage/kolch-wtan.png',tier:2,exp:55,time:3,resources:{'Медная руда':3,'Кожа':3},type:'pants',class:'Маг',rarity:'Необычный',def:2,hp:10,mana:10,baseDef:2},
            {name:'Кольчужные поножи мудреца',icon:'👖',img:'png/armor/mage/kolch-wtan.png',tier:3,exp:100,time:4,resources:{'Серебряная руда':3,'Кожа':4},type:'pants',class:'Маг',rarity:'Редкий',def:5,hp:18,mana:18,baseDef:5},
            {name:'Кольчужные поножи архимага',icon:'👖',img:'png/armor/mage/kolch-wtan.png',tier:4,exp:200,time:7,resources:{'Золотая руда':3,'Кожа':5},type:'pants',class:'Маг',rarity:'Эпический',def:10,hp:28,mana:30,baseDef:10},
            {name:'Кольчужные поножи провидца',icon:'👖',img:'png/armor/mage/kolch-wtan.png',tier:5,exp:320,time:10,resources:{'Мифриловая руда':3,'Кожа':6},type:'pants',class:'Маг',rarity:'Легендарный',def:12,hp:42,mana:48,baseDef:12},
            
            {name:'Кольчужные сапоги',icon:'👢',img:'png/armor/mage/kolch-buc.png',tier:2,exp:55,time:3,resources:{'Медная руда':3,'Кожа':3},type:'boots',class:'Маг',rarity:'Необычный',def:2,dodge:3,mana:8,baseDef:2},
            {name:'Кольчужные сапоги мудреца',icon:'👢',img:'png/armor/mage/kolch-buc.png',tier:3,exp:100,time:4,resources:{'Серебряная руда':3,'Кожа':4},type:'boots',class:'Маг',rarity:'Редкий',def:5,dodge:5,mana:16,baseDef:5},
            {name:'Кольчужные сапоги архимага',icon:'👢',img:'png/armor/mage/kolch-buc.png',tier:4,exp:200,time:7,resources:{'Золотая руда':3,'Кожа':5},type:'boots',class:'Маг',rarity:'Эпический',def:10,dodge:5,mana:28,baseDef:10},
            {name:'Кольчужные сапоги провидца',icon:'👢',img:'png/armor/mage/kolch-buc.png',tier:5,exp:320,time:10,resources:{'Мифриловая руда':3,'Кожа':6},type:'boots',class:'Маг',rarity:'Легендарный',def:10,dodge:12,mana:42,baseDef:10},
            
            // === СЕТ "ЗВЁЗДНЫЙ" (топовый, тир 6, объединяет Мифриловый + Тайные знания) ===
            {name:'Звёздное одеяние',icon:'🌟',img:'png/armor/mage/mage_armor_13.png',tier:6,exp:500,time:14,resources:{'Звёздный шёлк':8,'Мифриловая нить':5,'Звездная пыльца':3,'Алмаз':2},type:'chest',class:'Маг',rarity:'Мифический',def:38,hp:108,mana:144,critDmg:14,dodge:4,baseDef:38},
            {name:'Звёздный капюшон',icon:'🎭',img:'png/armor/mage/mage_armor_14.png',tier:6,exp:400,time:11,resources:{'Звёздный шёлк':6,'Мифриловая нить':3,'Звездная пыльца':2,'Алмаз':1},type:'helmet',class:'Маг',rarity:'Мифический',def:26,hp:72,mana:96,crit:10,dodge:5,baseDef:26},
            {name:'Звёздные штаны',icon:'👖',img:'png/armor/mage/mage_armor_15.png',tier:6,exp:380,time:11,resources:{'Звёздный шёлк':6,'Мифриловая нить':3,'Звездная пыльца':2},type:'pants',class:'Маг',rarity:'Мифический',def:22,hp:60,mana:78,dodge:8,baseDef:22},
            {name:'Звёздные сапоги',icon:'👢',img:'png/armor/mage/mage_armor_16.png',tier:6,exp:380,time:11,resources:{'Звёздный шёлк':6,'Мифриловая нить':3,'Звездная пыльца':2},type:'boots',class:'Маг',rarity:'Мифический',def:22,dodge:14,mana:66,baseDef:22},

            // Древние/Божественные — ТОЛЬКО КРАФТ
            {name:'Капюшон звёздного пророка',icon:'🔮',img:'png/armor/mage/mage_armor_17.png',tier:6,exp:800,time:300,resources:{'Орихалк':6,'Звёздный шёлк':5,'Звездный камень':2},type:'helmet',class:'Маг',rarity:'Древний',def:46,hp:132,mana:120,crit:18,critDmg:14,baseDef:46},
            {name:'Диадема небесного чародея',icon:'✨',img:'png/armor/mage/mage_armor_18.png',tier:6,exp:900,time:600,resources:{'Орихалк':8,'Звёздный шёлк':6,'Звездный камень':3,'Камень душ':2,'Слёзы божества':2,'Искра творца':1},type:'helmet',class:'Маг',rarity:'Божественный',def:69,hp:168,mana:156,crit:22,dodge:4,baseDef:69},
            {name:'Венец манапотока',icon:'💫',img:'png/armor/mage/mage_armor_19.png',tier:6,exp:1000,time:600,resources:{'Орихалк':9,'Звёздный шёлк':7,'Звездный камень':3,'Камень душ':3,'Слёзы божества':3,'Искра творца':2},type:'helmet',class:'Маг',rarity:'Божественный',def:79,hp:216,mana:192,crit:26,critDmg:12,baseDef:79},
            {name:'Корона первозданной мудрости',icon:'👑',img:'png/armor/mage/mage_armor_20.png',tier:6,exp:1200,time:600,resources:{'Орихалк':10,'Звёздный шёлк':8,'Звездный камень':5,'Камень душ':5,'Слёзы божества':4,'Искра творца':2},type:'helmet',class:'Маг',rarity:'Божественный',def:97,hp:276,mana:240,crit:28,critDmg:18,baseDef:97},

            {name:'Мантия древнего архимага',icon:'🌌',img:'png/armor/mage/mage_armor_21.png',tier:6,exp:900,time:300,resources:{'Орихалк':8,'Звёздный шёлк':6,'Звездный камень':3,'Адамантит':4},type:'chest',class:'Маг',rarity:'Древний',def:72,hp:240,mana:192,critDmg:16,dodge:6,baseDef:72},
            {name:'Одеяние звёздного суверена',icon:'✨',img:'png/armor/mage/mage_armor_22.png',tier:6,exp:1000,time:600,resources:{'Орихалк':9,'Звёздный шёлк':7,'Звездный камень':3,'Камень душ':3,'Слёзы божества':3,'Эссенция пустоты':2},type:'chest',class:'Маг',rarity:'Божественный',def:112,hp:300,mana:240,dodge:8,baseDef:112},
            {name:'Роба божественного прорицания',icon:'🔮',img:'png/armor/mage/mage_armor_23.png',tier:6,exp:1200,time:600,resources:{'Орихалк':10,'Звёздный шёлк':8,'Звездный камень':5,'Камень душ':5,'Слёзы божества':4,'Эссенция пустоты':3},type:'chest',class:'Маг',rarity:'Божественный',def:133,hp:372,mana:288,critDmg:20,dodge:10,baseDef:133},
            {name:'Мантия творца миров',icon:'🌟',img:'png/armor/mage/mage_armor_24.png',tier:6,exp:1500,time:600,resources:{'Орихалк':12,'Звёздный шёлк':9,'Звездный камень':6,'Камень душ':6,'Звездная пыльца':4,'Слёзы божества':5,'Эссенция пустоты':3},type:'chest',class:'Маг',rarity:'Божественный',def:158,hp:456,mana:336,crit:8,critDmg:24,dodge:12,baseDef:158},

            {name:'Штаны древнего мудреца',icon:'📜',img:'png/armor/mage/mage_armor_25.png',tier:6,exp:700,time:300,resources:{'Орихалк':6,'Звёздный шёлк':5,'Звездная пыльца':3},type:'pants',class:'Маг',rarity:'Древний',def:54,hp:168,mana:144,critDmg:10,dodge:8,baseDef:54},
            {name:'Порты магического вознесения',icon:'💫',img:'png/armor/mage/mage_armor_26.png',tier:6,exp:800,time:600,resources:{'Орихалк':8,'Звёздный шёлк':6,'Звездный камень':3,'Камень душ':2,'Эссенция пустоты':3,'Искра творца':1},type:'pants',class:'Маг',rarity:'Божественный',def:79,hp:216,mana:168,crit:10,dodge:10,baseDef:79},
            {name:'Штаны звёздного паломника',icon:'🌠',img:'png/armor/mage/mage_armor_27.png',tier:6,exp:900,time:600,resources:{'Орихалк':9,'Звёздный шёлк':7,'Звездный камень':5,'Камень душ':3,'Эссенция пустоты':4,'Искра творца':2},type:'pants',class:'Маг',rarity:'Божественный',def:94,hp:276,mana:204,critDmg:16,dodge:12,baseDef:94},
            {name:'Набедренники тайницы',icon:'🔱',img:'png/armor/mage/mage_armor_28.png',tier:6,exp:1100,time:600,resources:{'Орихалк':10,'Звёздный шёлк':8,'Звездный камень':5,'Камень душ':5,'Звездная пыльца':3,'Эссенция пустоты':5,'Искра творца':2},type:'pants',class:'Маг',rarity:'Божественный',def:113,hp:348,mana:252,crit:8,dodge:14,baseDef:113},

            {name:'Сапоги лунного шага',icon:'🌙',img:'png/armor/mage/mage_armor_29.png',tier:6,exp:600,time:300,resources:{'Орихалк':6,'Звёздный шёлк':5,'Звездная пыльца':3},type:'boots',class:'Маг',rarity:'Древний',def:28,hp:120,mana:108,dodge:28,baseDef:28},
            {name:'Тапочки эфирного странника',icon:'👣',img:'png/armor/mage/mage_armor_30.png',tier:6,exp:700,time:600,resources:{'Орихалк':8,'Звёздный шёлк':6,'Звездный камень':3,'Камень душ':2,'Искра творца':2,'Слёзы божества':1},type:'boots',class:'Маг',rarity:'Божественный',def:43,hp:156,mana:132,dodge:36,baseDef:43},
            {name:'Сапоги манавихря',icon:'💨',img:'png/armor/mage/mage_armor_31.png',tier:6,exp:800,time:600,resources:{'Орихалк':9,'Звёздный шёлк':7,'Звездный камень':5,'Камень душ':3,'Искра творца':3,'Слёзы божества':2},type:'boots',class:'Маг',rarity:'Божественный',def:51,hp:204,mana:156,crit:8,dodge:42,baseDef:51},
            {name:'Тапочки созидателя',icon:'⚡',img:'png/armor/mage/mage_armor_32.png',tier:6,exp:1000,time:600,resources:{'Орихалк':10,'Звёздный шёлк':8,'Звездный камень':5,'Камень душ':5,'Звездная пыльца':3,'Искра творца':4,'Слёзы божества':2},type:'boots',class:'Маг',rarity:'Божественный',def:63,hp:264,mana:180,critDmg:10,dodge:48,baseDef:63}
        ]
    },

    // ===== ЮВЕЛИРНОЕ ДЕЛО (для всех классов) - ресурсов на 50% больше =====
    'jewelry': {
        gems: [
            {name:'Аметист (огранённый)',icon:'🟣',img:'',tier:2,exp:50,time:3,resources:{'Аметист':3},type:'stone',rarity:'Необычный',dmg:5,baseDmg:5},
            {name:'Изумруд (огранённый)',icon:'🟢',img:'',tier:3,exp:80,time:4,resources:{'Изумруд':3},type:'stone',rarity:'Редкий',dmg:7,crit:4,baseDmg:7},
            {name:'Рубин (огранённый)',icon:'🔴',img:'',tier:4,exp:150,time:6,resources:{'Рубин':3},type:'stone',rarity:'Эпический',dmg:12,hp:36,baseDmg:12},
            {name:'Сапфир (огранённый)',icon:'🔵',img:'',tier:4,exp:150,time:6,resources:{'Сапфир':3},type:'stone',rarity:'Эпический',def:10,hp:42,mana:24,baseDef:10},
            {name:'Алмаз (огранённый)',icon:'💎',img:'',tier:5,exp:250,time:8,resources:{'Алмаз':5},type:'stone',rarity:'Легендарный',dmg:22,crit:10,critDmg:36,baseDmg:22},
            {name:'Звездный камень (огранённый)',icon:'🌟',img:'',tier:6,exp:400,time:10,resources:{'Звездный камень':5},type:'stone',rarity:'Мифический',dmg:36,crit:14,critDmg:60,hp:72,baseDmg:36}
        ],
        rings: [
            {name:'Медное кольцо',icon:'💍',img:'',tier:1,exp:30,time:2,resources:{'Медная руда':3},type:'ring',rarity:'Обычный',dmg:4,baseDmg:4},
            {name:'Серебряное кольцо',icon:'💍',img:'',tier:2,exp:70,time:4,resources:{'Серебряная руда':3,'Аметист':2},type:'ring',rarity:'Необычный',dmg:7,crit:4,baseDmg:7},
            {name:'Золотое кольцо',icon:'💍',img:'',tier:3,exp:140,time:6,resources:{'Золотая руда':5,'Рубин':2},type:'ring',rarity:'Редкий',dmg:14,crit:6,hp:24,baseDmg:14},
            {name:'Мифриловое кольцо',icon:'💍',img:'',tier:4,exp:250,time:8,resources:{'Мифриловая руда':5,'Алмаз':2},type:'ring',rarity:'Эпический',dmg:24,crit:10,hp:48,baseDmg:24},
            {name:'Кольцо дракона',icon:'💍',img:'',tier:5,exp:400,time:10,resources:{'Адамантит':5,'Алмаз':3,'Драконья чешуя':2},type:'ring',rarity:'Легендарный',dmg:36,crit:14,hp:72,baseDmg:36},
            {name:'Кольцо титана',icon:'💍',img:'',tier:6,exp:600,time:12,resources:{'Орихалк':6,'Звездный камень':3,'Шкура титана':2},type:'ring',rarity:'Мифический',dmg:54,crit:22,hp:120,baseDmg:54}
        ],
        amulets: [
            {name:'Медный амулет',icon:'📿',img:'',tier:1,exp:30,time:2,resources:{'Медная руда':3},type:'necklace',rarity:'Обычный',def:4,baseDef:4},
            {name:'Серебряный амулет',icon:'📿',img:'',tier:2,exp:70,time:4,resources:{'Серебряная руда':3,'Сапфир':2},type:'necklace',rarity:'Необычный',def:7,dodge:4,baseDef:7},
            {name:'Золотой амулет',icon:'📿',img:'',tier:3,exp:140,time:6,resources:{'Золотая руда':5,'Изумруд':2},type:'necklace',rarity:'Редкий',def:14,dodge:6,hp:24,baseDef:14},
            {name:'Амулет защиты',icon:'📿',img:'',tier:4,exp:250,time:8,resources:{'Мифриловая руда':5,'Сапфир':3},type:'necklace',rarity:'Эпический',def:26,dodge:10,hp:48,baseDef:26},
            {name:'Амулет дракона',icon:'📿',img:'',tier:5,exp:400,time:10,resources:{'Адамантит':5,'Алмаз':3,'Шкура дракона':2},type:'necklace',rarity:'Легендарный',def:42,dodge:14,hp:72,baseDef:42},
            {name:'Амулет богов',icon:'📿',img:'',tier:6,exp:600,time:12,resources:{'Орихалк':6,'Звездный камень':3,'Камень душ':2},type:'necklace',rarity:'Мифический',def:60,dodge:22,hp:120,baseDef:60},
            {name:'Амулет бездны Бруйна',icon:'🌊',img:'',tier:6,exp:680,time:14,resources:{'Левиафан бруйна':1,'Орихалк':4,'Жемчужина глубин':2,'Звездный камень':2},type:'necklace',rarity:'Мифический',def:72,dodge:26,hp:156,baseDef:72}
        ]
    },

    // ===== АЛХИМИЯ (для всех классов) - ресурсов на 50% больше =====
    'alchemy': {
        potions: [
            {name:'Малое зелье здоровья',icon:'🧪',img:'',tier:1,exp:30,time:2,resources:{'Лечебная трава':3},type:'potion',effect:'heal',value:72,rarity:'Обычный'},
            {name:'Зелье здоровья',icon:'🧪',img:'',tier:2,exp:60,time:3,resources:{'Лечебная трава':4,'Синий корень':2},type:'potion',effect:'heal',value:144,rarity:'Необычный', sellPrice: 50},
            {name:'Большое зелье здоровья',icon:'🧪',img:'',tier:3,exp:120,time:5,resources:{'Лечебная трава':5,'Сердце леса':3, 'Огненный цветок': 2},type:'potion',effect:'heal',value:300,rarity:'Редкий'},
            {name:'Малое зелье маны',icon:'💧',img:'',tier:1,exp:30,time:2,resources:{'Синий корень':3},type:'mana_potion',effect:'restoreMana',value:72,rarity:'Обычный'},
            {name:'Зелье маны',icon:'💧',img:'',tier:2,exp:60,time:3,resources:{'Синий корень':4,'Ледяная роза':2},type:'mana_potion',effect:'restoreMana',value:144,rarity:'Необычный',sellPrice:50},
            {name:'Большое зелье маны',icon:'💧',img:'',tier:3,exp:120,time:5,resources:{'Синий корень':5,'Ледяная роза':3,'Звездная пыльца':2},type:'mana_potion',effect:'restoreMana',value:300,rarity:'Редкий'},
            {name:'Эликсир силы',icon:'💪',img:'',tier:2,exp:70,time:3,resources:{'Синий корень':3,'Сердце леса':2},type:'elixir',effect:'atk',value:30,rarity:'Необычный'},
            {name:'Эликсир защиты',icon:'🛡️',img:'',tier:2,exp:70,time:3,resources:{'Синий корень':3,'Лечебная трава':3},type:'elixir',effect:'def',value:30,rarity:'Необычный'},
            {name:'Эликсир ловкости',icon:'💨',img:'',tier:3,exp:100,time:4,resources:{'Призрачная грива':3,'Лечебная трава':3},type:'elixir',effect:'dodge',value:24,rarity:'Редкий'},
            {name:'Эликсир берсерка',icon:'😤',img:'',tier:3,exp:150,time:6,resources:{'Огненный цветок':3,'Призрачная грива':2},type:'elixir',effect:'berserk',value:48,rarity:'Редкий'},
            {name:'Эликсир неуязвимости',icon:'✨',img:'',tier:4,exp:250,time:10,resources:{'Звездная пыльца':3,'Огненный цветок':3,'Сердце леса':3},type:'elixir',effect:'immortal',value:0,rarity:'Эпический'},
            {name:'Эликсир прилива',icon:'🌊',img:'',tier:6,exp:420,time:12,resources:{'Богиня моря':1,'Сапфир':2,'Синий корень':4,'Звездная пыльца':3},type:'elixir',effect:'dodge',value:32,rarity:'Мифический'},
            {name:'Божественный эликсир',icon:'🌟',img:'',tier:6,exp:500,time:15,resources:{'Звездная пыльца':8,'Огненный цветок':5,'Сердце леса':5},type:'elixir',effect:'immortal',value:0,rarity:'Легендарный'}
        ],
        gather_scrolls: typeof buildGatherScrollCraftRecipes === 'function'
            ? buildGatherScrollCraftRecipes()
            : []
    },

    // ===== СВИТКОТВОРЧЕСТВО (для всех классов) - ресурсов на 50% больше =====
    'scrollcraft': {
        scrolls: [
            {name:'Свиток слабого зачарования',icon:'📜',img:'',tier:2,exp:80,time:4,resources:{'Паутина':3,'Синий корень':2,'Сосновая древесина':2},type:'scroll',effect:'enchant',value:12,rarity:'Необычный'},
            {name:'Свиток зачарования оружия',icon:'📜',img:'',tier:3,exp:150,time:6,resources:{'Шёлк':3,'Огненный цветок':2,'Дубовая древесина':3},type:'scroll',effect:'enchant',value:24,rarity:'Редкий'},
            {name:'Великий свиток зачарования',icon:'✨',img:'',tier:4,exp:250,time:8,resources:{'Мифриловая нить':3,'Звездная пыльца':2,'Эбеновое дерево':3},type:'scroll',effect:'enchant',value:42,rarity:'Эпический'},
            {name:'Легендарный свиток',icon:'🌟',img:'',tier:6,exp:450,time:12,resources:{'Звёздный шёлк':3,'Звездный камень':2,'Древесина мирового древа':3},type:'scroll',effect:'enchant',value:72,rarity:'Легендарный'},
            {name:'Свиток огненного шара',icon:'🔥',img:'',tier:3,exp:120,time:5,resources:{'Огненный цветок':3,'Рубин':2,'Шёлк':3},type:'battle_scroll',effect:'fireball',value:96,rarity:'Редкий'},
            {name:'Свиток исцеления',icon:'💚',img:'',tier:3,exp:120,time:5,resources:{'Лечебная трава':5,'Изумруд':2,'Шёлк':3},type:'battle_scroll',effect:'heal',value:180,rarity:'Редкий'}
        ]
    },

    // ===== КУЛИНАРИЯ (для всех классов) - ресурсов на 50% больше =====
    'cooking': {
        foods: [
            {name:'Жареная рыба',icon:'🍣',img:'',tier:1,exp:20,time:2,resources:{'Речная форель':2},type:'food',effect:'heal',value:48,rarity:'Обычный'},
            {name:'Рыбный суп',icon:'🥣',img:'',tier:2,exp:50,time:3,resources:{'Окунь':3,'Плотва':2},type:'food',effect:'heal',value:96,rarity:'Необычный'},
            {name:'Стейк из медведя',icon:'🍖',img:'',tier:2,exp:60,time:3,resources:{'Шкура медведя':2,'Сосновая древесина':2},type:'food',effect:'heal',value:108,rarity:'Необычный'},
            {name:'Пряный стейк',icon:'🔥',img:'',tier:3,exp:100,time:4,resources:{'Шкура тигра':2,'Огненный цветок':2},type:'food',effect:'heal',value:156,rarity:'Редкий'},
            {name:'Драконье филе',icon:'🐉',img:'',tier:5,exp:300,time:10,resources:{'Шкура дракона':2,'Чешуя дракона':3,'Огненный цветок':3},type:'food',effect:'heal',value:420,rarity:'Легендарный'},
            {name:'Королевский пир',icon:'👑',img:'',tier:5,exp:350,time:12,resources:{'Королевский лосось':3,'Золотая рыбка':2,'Лечебная трава':5},type:'food',effect:'heal',value:480,rarity:'Легендарный'},
            {name:'Филе дракона моря',icon:'🐉',img:'',tier:5,exp:380,time:12,resources:{'Дракон моря':1,'Огненный цветок':3,'Сапфир':1},type:'food',effect:'heal',value:540,rarity:'Легендарный'},
            {name:'Похлёбка богини моря',icon:'🌊',img:'',tier:6,exp:440,time:14,resources:{'Богиня моря':1,'Жемчужина глубин':1,'Ледяная роза':3,'Звездная пыльца':2},type:'food',effect:'heal',value:640,rarity:'Мифический'},
            {name:'Нектар богов',icon:'✨',img:'',tier:6,exp:500,time:15,resources:{'Левиафан бруйна':1,'Звездный камень':2,'Звездная пыльца':5},type:'food',effect:'heal',value:820,rarity:'Мифический'},
            {name:'Нектар Бруйна',icon:'🐋',img:'',tier:6,exp:620,time:18,resources:{'Левиафан бруйна':1,'Камень душ':2,'Звездная пыльца':5},type:'food',effect:'heal',value:900,rarity:'Мифический'}
        ]
    }
};
