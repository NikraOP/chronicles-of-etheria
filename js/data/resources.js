const RESOURCES_DB = {
    'mining': [
        {name:'Медная руда',icon:'🪨',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина']},
        {name:'Железная руда',icon:'⛰️',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Серебряная руда',icon:'⚪',tier:2,exp:40,time:5,locations:['Заснеженные холмы','Заброшенное поселение']},
        {name:'Золотая руда',icon:'✨',tier:3,exp:70,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Мифриловая руда',icon:'💎',tier:4,exp:120,time:10,locations:['Вулканическое плато','Хрустальные пещеры']},
        {name:'Адамантит',icon:'🔮',tier:5,exp:200,time:14,locations:['Небесные острова','Глубины океана','Престол Богов']},
        {name:'Орихалк',icon:'🌟',tier:6,exp:300,time:18,locations:['Престол Богов']}
    ],
    'mining_gems': [
    // 1 ТИР - базовые камни для начинающих ювелиров
    {name:'Осколок кварца',icon:'⚪',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина']},
    {name:'Галька удачи',icon:'🪨',tier:1,exp:12,time:3,locations:['Сумеречный лес']},
    {name:'Полевой шпат',icon:'🔘',tier:1,exp:14,time:3,locations:['Горная низина']},
    
    // 2 ТИР
    {name:'Аметист',icon:'🟣',tier:2,exp:30,time:4,locations:['Горная низина','Заснеженные холмы']},
    {name:'Цитрин',icon:'🟡',tier:2,exp:28,time:4,locations:['Сумеречный лес','Горная низина']},
    
    // 3 ТИР
    {name:'Изумруд',icon:'🟢',tier:3,exp:60,time:6,locations:['Заброшенное поселение','Хрустальные пещеры']},
    {name:'Бирюза',icon:'🔵',tier:3,exp:55,time:6,locations:['Заброшенное поселение','Жаркие Тропики']},
    
    // 4 ТИР
    {name:'Рубин',icon:'🔴',tier:4,exp:100,time:9,locations:['Вулканическое плато']},
    {name:'Сапфир',icon:'🔵',tier:4,exp:110,time:9,locations:['Хрустальные пещеры','Глубины океана']},
    {name:'Опал',icon:'⚪',tier:4,exp:105,time:9,locations:['Хрустальные пещеры']},
    {name:'Топаз',icon:'🟡',tier:4,exp:105,time:9,locations:['Вулканическое плато']},
    {name:'Гранат',icon:'🔴',tier:4,exp:95,time:8,locations:['Вулканическое плато','Жаркие Тропики']},
    
    // 5 ТИР
    {name:'Алмаз',icon:'💎',tier:5,exp:180,time:12,locations:['Небесные острова','Престол Богов']},
    {name:'Звездный сапфир',icon:'⭐',tier:5,exp:190,time:13,locations:['Небесные острова']},
    {name:'Кровавый камень',icon:'🩸',tier:5,exp:200,time:13,locations:['Вулканическое плато','Престол Богов']},
    {name:'Лунный камень',icon:'🌙',tier:5,exp:185,time:12,locations:['Хрустальные пещеры','Небесные острова']},
    {name:'Солнечный камень',icon:'☀️',tier:5,exp:185,time:12,locations:['Вулканическое плато']},
    
    // 6 ТИР
    {name:'Звездный камень',icon:'🌟',tier:6,exp:280,time:18,locations:['Престол Богов']},
    {name:'Камень душ',icon:'💜',tier:6,exp:300,time:18,locations:['Престол Богов']},
    {name:'Сердце дракона',icon:'❤️',tier:6,exp:320,time:20,locations:['Престол Богов']},
    {name:'Эфирный кристалл',icon:'✨',tier:6,exp:350,time:20,locations:['Престол Богов','Небесные острова']}
],
    'clothier': [
        {name:'Паутина',icon:'🕸️',tier:1,exp:10,time:3,locations:['Сумеречный лес']},
        {name:'Хлопок',icon:'🌾',tier:2,exp:25,time:4,locations:['Горная низина','Жаркие Тропики']},
        {name:'Шёлк',icon:'🪶',tier:3,exp:50,time:6,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Мифриловая нить',icon:'✨',tier:4,exp:100,time:9,locations:['Хрустальные пещеры','Небесные острова']},
        {name:'Звёздный шёлк',icon:'🌟',tier:6,exp:250,time:15,locations:['Небесные острова','Престол Богов']}
    ],
    'herbalism': [
        {name:'Лечебная трава',icon:'🌱',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Синий корень',icon:'🪻',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Сердце леса',icon:'🍃',tier:2,exp:30,time:4,locations:['Сумеречный лес']},
        {name:'Призрачная грива',icon:'🍄',tier:3,exp:70,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Огненный цветок',icon:'🌺',tier:4,exp:120,time:10,locations:['Вулканическое плато']},
        {name:'Ледяная роза',icon:'🥀',tier:4,exp:110,time:9,locations:['Заснеженные холмы']},
        {name:'Звездная пыльца',icon:'✨',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']}
    ],
    'skinning': [
        {name:'Шкура волка',icon:'🐺',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Шкура медведя',icon:'🐻',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Шкура тигра',icon:'🐅',tier:3,exp:60,time:6,locations:['Жаркие Тропики']},
        {name:'Чешуя дракона',icon:'🐉',tier:3,exp:70,time:7,locations:['Жаркие Тропики','Вулканическое плато']},
        {name:'Шкура йети',icon:'🦍',tier:4,exp:120,time:10,locations:['Заснеженные холмы','Хрустальные пещеры']},
        {name:'Кожа феникса',icon:'🔥',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']},
        {name:'Шкура дракона',icon:'🐲',tier:5,exp:220,time:13,locations:['Вулканическое плато','Престол Богов']},
        {name:'Шкура левиафана',icon:'🐋',tier:6,exp:350,time:20,locations:['Глубины океана','Престол Богов']}
    ],
    'lumberjack': [
        {name:'Сосновая древесина',icon:'🌲',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Дубовая древесина',icon:'🌳',tier:2,exp:35,time:5,locations:['Горная низина']},
        {name:'Красное дерево',icon:'🪵',tier:3,exp:70,time:7,locations:['Жаркие Тропики']},
        {name:'Эбеновое дерево',icon:'🖤',tier:4,exp:120,time:10,locations:['Заброшенное поселение','Хрустальные пещеры']},
        {name:'Серебряное дерево',icon:'✨',tier:4,exp:130,time:9,locations:['Небесные острова']},
        {name:'Древесина мирового древа',icon:'🌟',tier:6,exp:250,time:16,locations:['Небесные острова','Престол Богов']}
    ],
    'fishing': [
        {name:'Речная форель',icon:'🐟',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина'],rarity:'Обычный'},
        {name:'Окунь',icon:'🐠',tier:1,exp:12,time:2,locations:['Сумеречный лес'],rarity:'Обычный'},
        {name:'Плотва',icon:'🐡',tier:1,exp:10,time:2,locations:['Горная низина'],rarity:'Обычный'},
        {name:'Озерный карп',icon:'🐠',tier:2,exp:35,time:5,locations:['Заснеженные холмы'],rarity:'Необычный'},
        {name:'Щука',icon:'🐊',tier:2,exp:40,time:5,locations:['Горная низина'],rarity:'Необычный'},
        {name:'Ледяной сиг',icon:'❄️',tier:2,exp:45,time:5,locations:['Заснеженные холмы'],rarity:'Необычный'},
        {name:'Морской окунь',icon:'🐡',tier:3,exp:70,time:7,locations:['Жаркие Тропики','Глубины океана'],rarity:'Редкий'},
        {name:'Палтус',icon:'🐋',tier:3,exp:75,time:7,locations:['Глубины океана'],rarity:'Редкий'},
        {name:'Красный тунец',icon:'🐟',tier:3,exp:80,time:7,locations:['Жаркие Тропики'],rarity:'Редкий'},
        {name:'Глубоководный тунец',icon:'🐋',tier:4,exp:120,time:10,locations:['Глубины океана'],rarity:'Эпический'},
        {name:'Королевский лосось',icon:'👑',tier:4,exp:130,time:10,locations:['Небесные острова'],rarity:'Эпический'},
        {name:'Морской змей',icon:'🐍',tier:4,exp:150,time:11,locations:['Глубины океана'],rarity:'Эпический'},
        {name:'Золотая рыбка',icon:'🥇',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов'],rarity:'Легендарный'},
        {name:'Жемчужина глубин',icon:'⚪',tier:5,exp:220,time:14,locations:['Глубины океана'],rarity:'Легендарный'},
        {name:'Дракон моря',icon:'🐉',tier:5,exp:280,time:16,locations:['Престол Богов'],rarity:'Легендарный'},
        {name:'Кракен',icon:'🐙',tier:6,exp:400,time:20,locations:['Глубины океана','Престол Богов'],rarity:'Мифический'},
        {name:'Левиафан',icon:'🐋',tier:6,exp:500,time:22,locations:['Престол Богов'],rarity:'Мифический'}
    ],
    'leatherworking': [
    // 1 ТИР
    {name:'Шкура кролика',icon:'🐰',tier:1,exp:12,time:3,locations:['Сумеречный лес']},
    {name:'Шкура лисы',icon:'🦊',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
    {name:'Мелкая шкура',icon:'🐿️',tier:1,exp:10,time:2,locations:['Сумеречный лес','Горная низина']},
    
    // 2 ТИР
    {name:'Кожа',icon:'👝',tier:2,exp:25,time:4,locations:['Сумеречный лес','Горная низина']},
    {name:'Толстая кожа',icon:'🛡️',tier:2,exp:30,time:5,locations:['Горная низина','Заснеженные холмы']},
    {name:'Выделанная кожа',icon:'👞',tier:2,exp:35,time:5,locations:['Сумеречный лес','Горная низина']},
    
    // 3 ТИР
    {name:'Закалённая кожа',icon:'⚡',tier:3,exp:60,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
    {name:'Кожа ящера',icon:'🦎',tier:3,exp:65,time:7,locations:['Жаркие Тропики','Вулканическое плато']},
    
    // 4 ТИР
    {name:'Шкура элементаля',icon:'🌪️',tier:4,exp:120,time:10,locations:['Вулканическое плато','Хрустальные пещеры']},
    {name:'Шкура йети',icon:'🦍',tier:4,exp:115,time:10,locations:['Заснеженные холмы']},
    {name:'Чешуя гидры',icon:'🐍',tier:4,exp:125,time:11,locations:['Глубины океана','Жаркие Тропики']},
    
    // 5 ТИР
    {name:'Драконья чешуя',icon:'🐉',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']},
    {name:'Шкура феникса',icon:'🔥',tier:5,exp:210,time:14,locations:['Небесные острова']},
    {name:'Кожа бехолдера',icon:'👁️',tier:5,exp:220,time:15,locations:['Хрустальные пещеры','Престол Богов']},
    
    // 6 ТИР
    {name:'Шкура титана',icon:'💪',tier:6,exp:300,time:18,locations:['Престол Богов']},
    {name:'Шкура левиафана',icon:'🐋',tier:6,exp:320,time:20,locations:['Глубины океана','Престол Богов']},
    {name:'Чешуя аспекта',icon:'🌈',tier:6,exp:350,time:20,locations:['Престол Богов']}
]
};
