// locations.js - Монстры со способностями и картинками

const LOCATIONS = [
    {name:'Сумеречный лес',icon:'🌲',minLvl:1,maxLvl:5,desc:'Тёмный лес',goldMult:8,bgColor:'linear-gradient(135deg, #1a3a1a, #0d1f0d)',
        monsters:[
            {name:'Гоблин-берсерк',icon:'👹',img:'./monsters/goblin.png',hp:100,atk:30,exp:25,def:6,
                abilities:[
                    {name:'Ярость',type:'buff',effect:'atk',value:30,duration:2,chance:40,cooldown:3},
                    {name:'Удар',type:'damage',multiplier:1.3,chance:70}
                ]},
            {name:'Серый волк',icon:'🐺',img:'./monsters/wolf.png',hp:120,atk:28,exp:30,def:5,
                abilities:[
                    {name:'Скорость хищника',type:'buff',effect:'dodge',value:20,duration:2,chance:35,cooldown:2},
                    {name:'Укус',type:'damage',multiplier:1.2,chance:80}
                ]},
            {name:'Ядовитый паук',icon:'🕷️',img:'./monsters/spider.png',hp:180,atk:35,exp:35,def:4,
                abilities:[
                    {name:'Ядовитый укус',type:'dot',effect:'poison',value:8,duration:2,chance:50,cooldown:2},
                    {name:'Паутина',type:'debuff',effect:'slow',value:30,duration:2,chance:45,cooldown:3}
                ]}
        ]},
        
    {name:'Горная низина',icon:'⛰️',minLvl:5,maxLvl:10,desc:'Опасная местность',goldMult:9,bgColor:'linear-gradient(135deg, #2a2a3a, #1a1a2a)',
        monsters:[
            {name:'Орк-воин',icon:'👾',img:'./monsters/orkWorrior.png',hp:260,atk:52,exp:60,def:14,
                abilities:[
                    {name:'Боевой клич',type:'buff',effect:'atk',value:25,duration:3,chance:35,cooldown:4},
                    {name:'Удар щитом',type:'damage',multiplier:1.4,chance:60}
                ]},
            {name:'Орк-шаман',icon:'🧙',img:'./monsters/orkShaman.png',hp:220,atk:60,exp:70,def:10,
                abilities:[
                    {name:'Исцеление духов',type:'heal',value:15,chance:45,cooldown:3},
                    {name:'Проклятие',type:'debuff',effect:'atk',value:20,duration:2,chance:40,cooldown:3}
                ]},
            {name:'Вождь орков',icon:'👑',img:'./monsters/orkCari.png',hp:420,atk:48,exp:100,def:18,
                abilities:[
                    {name:'Приказ атаковать',type:'buff',effect:'atk',value:35,duration:2,chance:50,cooldown:3},
                    {name:'Варварский удар',type:'damage',multiplier:1.5,chance:40,cooldown:2},
                    {name:'Каменная кожа',type:'buff',effect:'def',value:40,duration:2,chance:30,cooldown:4}
                ]}
        ]},
        
    {name:'Заснеженные холмы',icon:'🏔️',minLvl:10,maxLvl:15,desc:'Ледяные просторы',goldMult:10,bgColor:'linear-gradient(135deg, #e8f0f8, #c8d8e8)',
        monsters:[
            {name:'Ледяной волк',icon:'🐺',img:'./monsters/iceWolf.png',hp:460,atk:72,exp:90,def:16,
                abilities:[
                    {name:'Ледяной вой',type:'buff',effect:'crit',value:15,duration:2,chance:35,cooldown:3},
                    {name:'Ледяной укус',type:'damage',multiplier:1.3,chance:65}
                ]},
            {name:'Элементаль льда',icon:'❄️',img:'./monsters/iceElement.png',hp:600,atk:88,exp:105,def:18,
                abilities:[
                    {name:'Ледяная броня',type:'buff',effect:'def',value:50,duration:3,chance:40,cooldown:4},
                    {name:'Заморозка',type:'debuff',effect:'freeze',duration:1,chance:30,cooldown:3},
                    {name:'Град',type:'damage',multiplier:1.2,chance:50}
                ]},
            {name:'Йети-вожак',icon:'🦍',img:'./monsters/iceEti.png',hp:750,atk:68,exp:140,def:22,
                abilities:[
                    {name:'Ледяной гнев',type:'buff',effect:'atk',value:40,duration:2,chance:45,cooldown:3},
                    {name:'Мощный удар',type:'damage',multiplier:1.6,chance:40,cooldown:2},
                    {name:'Ледяная глыба',type:'shield',value:20,duration:2,chance:35,cooldown:4}
                ]}
        ]},
        
    {name:'Заброшенное поселение',icon:'🏚️',minLvl:15,maxLvl:20,desc:'Руины',goldMult:11,bgColor:'linear-gradient(135deg, #3a2a1a, #1a0f0a)',
        monsters:[
            {name:'Хомяк-берсерк',icon:'🐹',img:'./monsters/xomVoi.png',hp:760,atk:98,exp:125,def:28,
                abilities:[
                    {name:'Ярость хомяка',type:'buff',effect:'atk',value:50,duration:2,chance:50,cooldown:3},
                    {name:'Крутящая атака',type:'damage',multiplier:1.4,chance:55}
                ]},
            {name:'Хомяк-некромант',icon:'💀',img:'./monsters/xomMAg.png',hp:870,atk:115,exp:140,def:18,
                abilities:[
                    {name:'Тёмный ритуал',type:'heal',value:20,chance:45,cooldown:3},
                    {name:'Проклятие',type:'debuff',effect:'def',value:25,duration:2,chance:35,cooldown:3}
                ]},
            {name:'Император хомяков',icon:'👑',img:'./monsters/xomImp.png',hp:1000,atk:88,exp:180,def:32,
                abilities:[
                    {name:'Императорская воля',type:'buff',effect:'all',value:30,duration:3,chance:50,cooldown:4},
                    {name:'Королевский удар',type:'damage',multiplier:1.7,chance:35,cooldown:2},
                    {name:'Священный щит',type:'shield',value:30,duration:2,chance:40,cooldown:4}
                ]}
        ]},
        
    {name:'Жаркие Тропики',icon:'🌴',minLvl:20,maxLvl:25,desc:'Влажные джунгли',goldMult:12,bgColor:'linear-gradient(135deg, #1a3a1a, #0a2a0a)',
        monsters:[
            {name:'Смертельная лягушка',icon:'🐸',img:'./monsters/lagKrov.png',hp:800,atk:125,exp:160,def:24,
                abilities:[
                    {name:'Токсичный выстрел',type:'dot',effect:'poison',value:12,duration:3,chance:55,cooldown:2},
                    {name:'Прыжок',type:'damage',multiplier:1.3,chance:60}
                ]},
            {name:'Кровавая пиявка',icon:'🪱',img:'./monsters/cherv.png',hp:1050,atk:110,exp:175,def:30,
                abilities:[
                    {name:'Кровососание',type:'lifesteal',value:40,chance:50,cooldown:3},
                    {name:'Слизь',type:'debuff',effect:'dodge',value:30,duration:2,chance:40,cooldown:3},
                    {name:'Регенерация',type:'heal',value:15,chance:35,cooldown:3}
                ]},
            {name:'Теневая пантера',icon:'🐆',img:'./monsters/blackPanter.png',hp:1250,atk:145,exp:195,def:26,
                abilities:[
                    {name:'Скрытность',type:'buff',effect:'dodge',value:40,duration:2,chance:45,cooldown:3},
                    {name:'Смертельный прыжок',type:'damage',multiplier:1.5,chance:50,cooldown:2},
                    {name:'Разорвать',type:'damage',multiplier:1.2,chance:70}
                ]}
        ]},
        
    {name:'Вулканическое плато',icon:'🌋',minLvl:25,maxLvl:30,desc:'Раскаленные земли',goldMult:13,bgColor:'linear-gradient(135deg, #3a1a1a, #1a0a0a)',
        monsters:[
            {name:'Пламенный саламандр',icon:'🦎',img:'./monsters/fireSlamandr.png',hp:1400,atk:150,exp:210,def:30,
                abilities:[
                    {name:'Огненное дыхание',type:'damage',multiplier:1.4,chance:55,cooldown:2},
                    {name:'Горение',type:'dot',target:'player',effect:'burn',value:10,duration:3,chance:50,cooldown:3},
                    {name:'Огненный щит',type:'buff',effect:'reflect',value:30,duration:2,chance:30,cooldown:4}
                ]},
            {name:'Магмовый голем',icon:'🗿',img:'./monsters/laveGolem.png',hp:1680,atk:125,exp:200,def:44,
                abilities:[
                    {name:'Каменная броня',type:'shield',value:50,duration:2,chance:60,cooldown:4},
                    {name:'Дробящий удар',type:'damage',multiplier:1.6,chance:45,cooldown:2},
                    {name:'Лавовое извержение',type:'damage',multiplier:1.3,chance:50}
                ]},
            {name:'Повелитель вулкана',icon:'👹',img:'./monsters/lavabog.png',hp:1830,atk:175,exp:265,def:27,
                abilities:[
                    {name:'Вулканический гнев',type:'buff',effect:'atk',value:60,duration:2,chance:55,cooldown:3},
                    {name:'Метеорит',type:'damage',multiplier:1.8,chance:40,cooldown:3},
                    {name:'Лавовая река',type:'dot',effect:'burn',value:15,duration:3,chance:45,cooldown:4},
                    {name:'Пепельный щит',type:'shield',value:25,duration:2,chance:35,cooldown:4}
                ]}
        ]},
        
    {name:'Хрустальные пещеры',icon:'💎',minLvl:30,maxLvl:35,desc:'Сияющие подземелья',goldMult:14,bgColor:'linear-gradient(135deg, #1a1a3a, #0a0a2a)',
        monsters:[
            {name:'Кристальный убийца',icon:'🔮',img:'./monsters/CristalElemement.png',hp:2000,atk:172,exp:245,def:36,
                abilities:[
                    {name:'Кристальный взрыв',type:'damage',multiplier:1.5,chance:50,cooldown:2},
                    {name:'Осколки',type:'damage',multiplier:0.8,hits:3,chance:40,cooldown:3},
                    {name:'Мясорубка',type:'debuff',effect:'hp',value:25,duration:2,chance:35,cooldown:3}
                ]},
            {name:'Фантомный призрак',icon:'👻',img:'./monsters/CristalPriz.png',hp:2150,atk:195,exp:265,def:24,
                abilities:[
                    {name:'Призрачный вопль',type:'debuff',effect:'atk',value:30,duration:2,chance:50,cooldown:3},
                    {name:'Фазовый сдвиг',type:'buff',effect:'atk',value:50,duration:1,chance:40,cooldown:3},
                    {name:'Энергетический вампиризм',type:'lifesteal',value:80,chance:45,cooldown:4}
                ]},
            {name:'Хранитель бездны',icon:'🕳️',img:'./monsters/cristalBog.png',hp:2500,atk:158,exp:320,def:50,
                abilities:[
                    {name:'Бездна',type:'debuff',effect:'def',value:40,duration:3,chance:55,cooldown:4},
                    {name:'Тьма',type:'damage',multiplier:1.6,chance:45,cooldown:2},
                    {name:'Тёмный щит',type:'shield',value:35,duration:2,chance:40,cooldown:4},
                    {name:'Поглощение',type:'heal',value:25,chance:35,cooldown:4}
                ]}
        ]},
        
    {name:'Небесные острова',icon:'☁️',minLvl:35,maxLvl:40,desc:'Парящие в облаках',goldMult:15,bgColor:'linear-gradient(135deg, #aac8e8, #8899bb)',
        monsters:[
            {name:'Грифон-разрушитель',icon:'🦅',img:'./monsters/grifonRaz.png',hp:2700,atk:198,exp:300,def:34,
                abilities:[
                    {name:'Орлиный глаз',type:'buff',effect:'crit',value:30,duration:3,chance:45,cooldown:4},
                    {name:'Пикирование',type:'damage',multiplier:1.7,chance:50,cooldown:2},
                    {name:'Ураган',type:'damage',multiplier:1.3,chance:55}
                ]},
            {name:'Буревестник',icon:'🌩️',img:'./monsters/byrev.png',hp:2900,atk:220,exp:320,def:30,
                abilities:[
                    {name:'Молния',type:'damage',multiplier:1.8,chance:50,cooldown:3},
                    {name:'Грозовой фронт',type:'buff',effect:'atk',value:50,duration:2,chance:45,cooldown:3},
                    {name:'Разряд',type:'dot',effect:'shock',value:12,duration:2,chance:40,cooldown:3}
                ]},
            {name:'Повелитель ураганов',icon:'🌀',img:'./monsters/veterBog.png',hp:3020,atk:182,exp:390,def:42,
                abilities:[
                    {name:'Ураган',type:'buff',effect:'all',value:40,duration:3,chance:55,cooldown:4},
                    {name:'Смерч',type:'damage',multiplier:2.0,chance:35,cooldown:3},
                    {name:'Ветряной щит',type:'shield',value:40,duration:2,chance:40,cooldown:4},
                    {name:'Шквал',type:'damage',multiplier:1.4,chance:50}
                ]}
        ]},
        
    {name:'Глубины океана',icon:'🌊',minLvl:40,maxLvl:45,desc:'Морские бездны',goldMult:16,bgColor:'linear-gradient(135deg, #0a1a3a, #050a1a)',
        monsters:[
            {name:'Кракен-ужас',icon:'🐙',img:'./monsters/crack.png',hp:3350,atk:220,exp:360,def:40,
                abilities:[
                    {name:'Щупальца',type:'damage',multiplier:1.5,chance:55},
                    {name:'Чёрнильная завеса',type:'debuff',effect:'blind',value:40,duration:2,chance:45,cooldown:3},
                    {name:'Регенерация',type:'heal',value:20,chance:40,cooldown:4}
                ]},
            {name:'Морской дракон',icon:'🐉',img:'./monsters/gid.png',hp:3770,atk:245,exp:385,def:34,
                abilities:[
                    {name:'Драконье дыхание',type:'damage',multiplier:1.6,chance:50,cooldown:2},
                    {name:'Чешуя дракона',type:'buff',effect:'def',value:70,duration:2,chance:45,cooldown:3},
                    {name:'Водяной смерч',type:'damage',multiplier:1.4,chance:60}
                ]},
            {name:'Легендарный кракен',icon:'🦑',img:'./monsters/korolCrack.png',hp:4080,atk:205,exp:450,def:50,
                abilities:[
                    {name:'Кракенов удар',type:'damage',multiplier:1.9,chance:40,cooldown:3},
                    {name:'Цунами',type:'damage',multiplier:1.5,chance:50,cooldown:2},
                    {name:'Тёмная вода',type:'debuff',effect:'atk',value:35,duration:2,chance:45,cooldown:3},
                    {name:'Гидратация',type:'heal',value:30,chance:35,cooldown:4}
                ]}
        ]},
        
    {name:'Престол Богов',icon:'👑',minLvl:45,maxLvl:50,desc:'Обитель божеств',goldMult:18,bgColor:'linear-gradient(135deg, #3a3a1a, #1a0f0a)',
        monsters:[
            {name:'Небесный каратель',icon:'😇',img:'./monsters/besk.png',hp:4380,atk:250,exp:420,def:46,
                abilities:[
                    {name:'Божественный гнев',type:'damage',multiplier:1.8,chance:62,cooldown:2},
                    {name:'Светлый щит',type:'shield',value:45,duration:2,chance:45,cooldown:3},
                    {name:'Исцеление',type:'heal',value:25,chance:40,cooldown:4},
                    {name:'Благословение',type:'buff',effect:'all',value:50,duration:2,chance:38,cooldown:5}
                ]},
            {name:'Титан-разрушитель',icon:'🗿',img:'./monsters/RazryTitan.png',hp:5620,atk:200,exp:455,def:42,
                abilities:[
                    {name:'Землетрясение',type:'damage',multiplier:1.7,chance:55,cooldown:2},
                    {name:'Титановая броня',type:'buff',effect:'def',value:100,duration:2,chance:60,cooldown:4},
                    {name:'Сокрушающий удар',type:'damage',multiplier:2.2,chance:35,cooldown:3}
                ]},
            {name:'Бог хаоса',icon:'👹',img:'./monsters/bogXaosa.png',hp:5350,atk:235,exp:530,def:58,
                abilities:[
                    {name:'Хаотический взрыв',type:'damage',multiplier:2.0,chance:45,cooldown:3},
                    {name:'Проклятие хаоса',type:'debuff',effect:'hp',value:40,duration:2,chance:55,cooldown:4},
                    {name:'Щит хаоса',type:'shield',value:50,duration:2,chance:45,cooldown:4},
                    {name:'Божественное возмездие',type:'damage',multiplier:1.5,chance:60}
                ]}
        ]},

        {name:'Место мироздания',icon:'🌌',minLvl:60,maxLvl:61,desc:'Страх всей вселенной',goldMult:18,bgColor:'linear-gradient(135deg, #1a1a3a, #0a0a2a)',
        monsters:[
            {name:'Бог бесконечности',icon:'👹',img:'./monsters/bogBesk.png',hp:8500,atk:235,exp:530,def:58,
                abilities:[
                    {name:'Пространственный разрыв',type:'damage',multiplier:3.0,chance:45,cooldown:4},
                    {name:'Проклятие бесконечности',type:'debuff',effect:'hp',value:60,duration:2,chance:55,cooldown:6},
                    {name:'Щит бесконечности',type:'shield',value:100,duration:2,chance:45,cooldown:7},
                    {name:'Божественное возмездие',type:'damage',multiplier:1.5,chance:60},
                    {name:'Возврат',type:'heal',value:70,chance:45,cooldown:10},
                ]}
        ]}
];
