// img: путь к PNG от корня сайта, напр. 'png/resources/leather/fox-hide.png' (пусто = emoji icon)
const RESOURCES_DB = {
    'mining': [
        {name:'Медная руда',icon:'🪨',img:'png/resources/ores/copper-ore.png',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина']},
        {name:'Железная руда',icon:'⛰️',img:'png/resources/ores/iron-ore.png',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Серебряная руда',icon:'⚪',img:'png/resources/ores/silver-ore.png',tier:2,exp:40,time:5,locations:['Заснеженные холмы','Заброшенное поселение']},
        {name:'Золотая руда',icon:'✨',img:'png/resources/ores/gold-ore.png',tier:3,exp:70,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Мифриловая руда',icon:'💎',img:'png/resources/ores/mithril-ore.png',tier:4,exp:120,time:10,locations:['Вулканическое плато','Хрустальные пещеры']},
        {name:'Адамантит',icon:'🔮',img:'png/resources/ores/adamantite-ore.png',tier:5,exp:200,time:14,locations:['Небесные острова','Глубины океана','Престол Богов']},
        {name:'Орихалк',icon:'🌟',img:'png/resources/ores/orichel-ore.png',tier:6,exp:300,time:18,locations:['Престол Богов']},
        
        // 1 ТИР - базовые камни для начинающих ювелиров
    {name:'Осколок кварца',icon:'⚪',img:'png/resources/gems/quartz-shard.png',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина']},
    {name:'Галька удачи',icon:'🪨',img:'png/resources/gems/lucky-rock.png',tier:1,exp:12,time:3,locations:['Сумеречный лес']},
    {name:'Полевой шпат',icon:'🔘',img:'png/resources/gems/feldspar.png',tier:1,exp:14,time:3,locations:['Горная низина']},
    
    // 2 ТИР
    {name:'Аметист',icon:'🟣',img:'png/resources/gems/amethyst.png',tier:2,exp:30,time:4,locations:['Горная низина','Заснеженные холмы']},
    {name:'Цитрин',icon:'🟡',img:'png/resources/gems/citrine.png',tier:2,exp:28,time:4,locations:['Сумеречный лес','Горная низина']},
    
    // 3 ТИР
    {name:'Изумруд',icon:'🟢',img:'png/resources/gems/emerald.png',tier:3,exp:60,time:6,locations:['Заброшенное поселение','Хрустальные пещеры']},
    {name:'Бирюза',icon:'🔵',img:'png/resources/gems/aquamarine.png',tier:3,exp:55,time:6,locations:['Заброшенное поселение','Жаркие Тропики']},
    
    // 4 ТИР
    {name:'Рубин',icon:'🔴',img:'png/resources/gems/ruby.png',tier:4,exp:100,time:9,locations:['Вулканическое плато']},
    {name:'Сапфир',icon:'🔵',img:'png/resources/gems/sapphire.png',tier:4,exp:110,time:9,locations:['Хрустальные пещеры','Глубины океана']},
    {name:'Опал',icon:'⚪',img:'png/resources/gems/opal.png',tier:4,exp:105,time:9,locations:['Хрустальные пещеры']},
    {name:'Топаз',icon:'🟡',img:'png/resources/gems/topaz.png',tier:4,exp:105,time:9,locations:['Вулканическое плато']},
    {name:'Гранат',icon:'🔴',img:'png/resources/gems/granate.png',tier:4,exp:95,time:8,locations:['Вулканическое плато','Жаркие Тропики']},
    
    // 5 ТИР
    {name:'Алмаз',icon:'💎',img:'png/resources/gems/diamond.png',tier:5,exp:180,time:12,locations:['Небесные острова','Престол Богов']},
    {name:'Звездный сапфир',icon:'⭐',img:'png/resources/gems/star-sapphire.png',tier:5,exp:190,time:13,locations:['Небесные острова']},
    {name:'Кровавый камень',icon:'🩸',img:'png/resources/gems/bloodstone.png',tier:5,exp:200,time:13,locations:['Вулканическое плато','Престол Богов']},
    {name:'Лунный камень',icon:'🌙',img:'png/resources/gems/moonstone.png',tier:5,exp:185,time:12,locations:['Хрустальные пещеры','Небесные острова']},
    {name:'Солнечный камень',icon:'☀️',img:'png/resources/gems/sunstone.png',tier:5,exp:185,time:12,locations:['Вулканическое плато']},
    
    // 6 ТИР
    {name:'Звездный камень',icon:'🌟',img:'png/resources/gems/star-stone.png',tier:6,exp:280,time:18,locations:['Престол Богов']},
    {name:'Камень душ',icon:'💜',img:'png/resources/gems/soulstone.png',tier:6,exp:300,time:18,locations:['Престол Богов']},
    {name:'Сердце дракона',icon:'❤️',img:'png/resources/gems/dragonheart.png',tier:6,exp:320,time:20,locations:['Престол Богов']},
    {name:'Эфирный кристалл',icon:'✨',img:'png/resources/gems/etherstone.png',tier:6,exp:350,time:20,locations:['Престол Богов','Небесные острова']},
    ],
    'clothier': [
        {name:'Паутина',icon:'🕸️',img:'',tier:1,exp:10,time:3,locations:['Сумеречный лес']},
        {name:'Хлопок',icon:'🌾',img:'png/resources/cloth/cotton.png',tier:2,exp:25,time:4,locations:['Горная низина','Жаркие Тропики']},
        {name:'Шёлк',icon:'🪶',img:'png/resources/cloth/silk.png',tier:3,exp:50,time:6,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Мифриловая нить',icon:'✨',img:'png/resources/cloth/mithril-thread.png',tier:4,exp:100,time:9,locations:['Хрустальные пещеры','Небесные острова']},
        {name:'Звёздный шёлк',icon:'🌟',img:'png/resources/cloth/star-silk.png',tier:6,exp:250,time:15,locations:['Небесные острова','Престол Богов']}
    ],
    'herbalism': [
        {name:'Лечебная трава',icon:'🌱',img:'png/resources/herbs/healing-herb.png',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Синий корень',icon:'🪻',img:'png/resources/herbs/blue-root.png',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Сердце леса',icon:'🍃',img:'png/resources/herbs/heart-of-the-forest.png',tier:2,exp:30,time:4,locations:['Сумеречный лес']},
        {name:'Призрачная грива',icon:'🍄',img:'png/resources/herbs/ghostly-hairy.png',tier:3,exp:70,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Огненный цветок',icon:'🌺',img:'png/resources/herbs/fire-flower.png',tier:4,exp:120,time:10,locations:['Вулканическое плато']},
        {name:'Ледяная роза',icon:'🥀',img:'png/resources/herbs/ice-rose.png',tier:4,exp:110,time:9,locations:['Заснеженные холмы']},
        {name:'Звездная пыльца',icon:'✨',img:'png/resources/herbs/star-pollen.png',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']}
    ],
    'skinning': [
        {name:'Шкура волка',icon:'🐺',img:'png/resources/leather/wolf-hide.png',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Шкура медведя',icon:'🐻',img:'png/resources/leather/bear-hide.png',tier:2,exp:35,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Шкура тигра',icon:'🐅',img:'png/resources/leather/tiger-hide.png',tier:3,exp:60,time:6,locations:['Жаркие Тропики']},
        {name:'Чешуя дракона',icon:'🐉',img:'png/resources/leather/dragon-scale.png',tier:3,exp:70,time:7,locations:['Жаркие Тропики','Вулканическое плато']},
        {name:'Шкура йети',icon:'🦍',img:'png/resources/leather/yeti-hide.png',tier:4,exp:120,time:10,locations:['Заснеженные холмы','Хрустальные пещеры']},
        {name:'Кожа феникса',icon:'🔥',img:'png/resources/leather/phoenix-hide.png',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']},
        {name:'Шкура дракона',icon:'🐲',img:'png/resources/leather/dragon-hide.png',tier:5,exp:220,time:13,locations:['Вулканическое плато','Престол Богов']},
        {name:'Шкура левиафана',icon:'🐋',img:'png/resources/leather/leviathan-hide.png',tier:6,exp:350,time:20,locations:['Глубины океана','Престол Богов']},
        {name:'Шкура кролика',icon:'🐰',img:'png/resources/leather/rabbit-hide.png',tier:1,exp:12,time:3,locations:['Сумеречный лес']},
        {name:'Шкура лисы',icon:'🦊',img:'png/resources/leather/fox-hide.png',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Мелкая шкура',icon:'🐿️',img:'png/resources/leather/small-hide.png',tier:1,exp:10,time:2,locations:['Сумеречный лес','Горная низина']},
        {name:'Кожа',icon:'👝',img:'png/resources/leather/leather.png',tier:1,exp:18,time:3,locations:['Сумеречный лес','Горная низина']},
        {name:'Толстая кожа',icon:'🛡️',img:'png/resources/leather/thick-leather.png',tier:2,exp:30,time:5,locations:['Горная низина','Заснеженные холмы']},
        {name:'Выделанная кожа',icon:'👞',img:'png/resources/leather/tanned-leather.png',tier:2,exp:35,time:5,locations:['Сумеречный лес','Горная низина']},
        {name:'Закалённая кожа',icon:'⚡',img:'png/resources/leather/hardened-leather.png',tier:3,exp:60,time:7,locations:['Заброшенное поселение','Жаркие Тропики']},
        {name:'Кожа ящера',icon:'🦎',img:'png/resources/leather/lizard-hide.png',tier:3,exp:65,time:7,locations:['Жаркие Тропики','Вулканическое плато']},
        {name:'Шкура элементаля',icon:'🌪️',img:'png/resources/leather/elemental-hide.png',tier:4,exp:120,time:10,locations:['Вулканическое плато','Хрустальные пещеры']},
        {name:'Чешуя гидры',icon:'🐍',img:'png/resources/leather/hydra-scale.png',tier:4,exp:125,time:11,locations:['Глубины океана','Жаркие Тропики']},
        {name:'Драконья чешуя',icon:'🐉',img:'png/resources/leather/dragon-scale.png',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов']},
        {name:'Шкура феникса',icon:'🔥',img:'png/resources/leather/phoenix-hide.png',tier:5,exp:210,time:14,locations:['Небесные острова']},
        {name:'Кожа бехолдера',icon:'👁️',img:'png/resources/leather/beholder-hide.png',tier:5,exp:220,time:15,locations:['Хрустальные пещеры','Престол Богов']},
        {name:'Шкура титана',icon:'💪',img:'png/resources/leather/titan-hide.png',tier:6,exp:300,time:18,locations:['Престол Богов']},
        {name:'Чешуя аспекта',icon:'🌈',img:'png/resources/leather/aspect-scale.png',tier:6,exp:350,time:20,locations:['Престол Богов']}
    ],
    'lumberjack': [
        {name:'Сосновая древесина',icon:'🌲',img:'png/resources/wood/pine-wood.png',tier:1,exp:15,time:3,locations:['Сумеречный лес']},
        {name:'Дубовая древесина',icon:'🌳',img:'png/resources/wood/oak-wood.png',tier:2,exp:35,time:5,locations:['Горная низина']},
        {name:'Красное дерево',icon:'🪵',img:'png/resources/wood/redwood.png',tier:3,exp:70,time:7,locations:['Жаркие Тропики']},
        {name:'Эбеновое дерево',icon:'🖤',img:'png/resources/wood/ebony-wood.png',tier:4,exp:120,time:10,locations:['Заброшенное поселение','Хрустальные пещеры']},
        {name:'Серебряное дерево',icon:'✨',img:'png/resources/wood/silverwood.png',tier:4,exp:130,time:9,locations:['Небесные острова']},
        {name:'Древесина мирового древа',icon:'🌟',img:'png/resources/wood/worldwood.png',tier:6,exp:250,time:16,locations:['Небесные острова','Престол Богов']}
    ],
    'fishing': [
        {name:'Речная форель',icon:'🐟',img:'png/resources/fish/forel.png',tier:1,exp:15,time:3,locations:['Сумеречный лес','Горная низина'],rarity:'Обычный'},
        {name:'Окунь',icon:'🐠',img:'png/resources/fish/perch.png',tier:1,exp:12,time:2,locations:['Сумеречный лес'],rarity:'Обычный'},
        {name:'Плотва',icon:'🐡',img:'png/resources/fish/platva.png',tier:1,exp:10,time:2,locations:['Горная низина'],rarity:'Обычный'},
        {name:'Озерный карп',icon:'🐠',img:'png/resources/fish/carp.png',tier:2,exp:35,time:5,locations:['Заснеженные холмы'],rarity:'Необычный'},
        {name:'Щука',icon:'🐊',img:'png/resources/fish/pike.png',tier:2,exp:40,time:5,locations:['Горная низина'],rarity:'Необычный'},
        {name:'Ледяной сиг',icon:'❄️',img:'png/resources/fish/ice-pike.png',tier:2,exp:45,time:5,locations:['Заснеженные холмы'],rarity:'Необычный'},
        {name:'Морской окунь',icon:'🐡',img:'png/resources/fish/salmon.png',tier:3,exp:70,time:7,locations:['Жаркие Тропики','Глубины океана'],rarity:'Редкий'},
        {name:'Палтус',icon:'🐋',img:'png/resources/fish/tuna.png',tier:3,exp:75,time:7,locations:['Глубины океана'],rarity:'Редкий'},
        {name:'Красный тунец',icon:'🐟',img:'png/resources/fish/red-tuna.png',tier:3,exp:80,time:7,locations:['Жаркие Тропики'],rarity:'Редкий'},
        {name:'Глубоководный тунец',icon:'🐋',img:'png/resources/fish/deep-tuna.png',tier:4,exp:120,time:10,locations:['Глубины океана'],rarity:'Эпический'},
        {name:'Королевский лосось',icon:'👑',img:'png/resources/fish/royal-salmon.png',tier:4,exp:130,time:10,locations:['Небесные острова'],rarity:'Эпический'},
        {name:'Морской змей',icon:'🐍',img:'png/resources/fish/sea-serpent.png',tier:4,exp:150,time:11,locations:['Глубины океана'],rarity:'Эпический'},
        {name:'Золотая рыбка',icon:'🥇',img:'png/resources/fish/golden-fish.png',tier:5,exp:200,time:14,locations:['Небесные острова','Престол Богов'],rarity:'Легендарный'},
        {name:'Жемчужина глубин',icon:'⚪',img:'png/resources/fish/deep-pearl.png',tier:5,exp:220,time:14,locations:['Глубины океана'],rarity:'Легендарный'},
        {name:'Дракон моря',icon:'🐉',img:'png/resources/fish/sea-dragon.png',tier:5,exp:280,time:16,locations:['Престол Богов'],rarity:'Легендарный',battle:true,bossId:'sea_dragon'},
        {name:'Богиня моря',icon:'🐙',img:'png/resources/fish/kraken.png',tier:6,exp:400,time:20,locations:['Глубины океана','Престол Богов'],rarity:'Мифический',battle:true,bossId:'sea_goddess'},
        {name:'Левиафан бруйна',icon:'🐋',img:'png/resources/fish/leviathan.png',tier:6,exp:500,time:22,locations:['Престол Богов'],rarity:'Мифический',battle:true,bossId:'bruina_leviathan'}
    ],
};
