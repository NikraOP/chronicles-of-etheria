const FISHING_BOSSES = {
    sea_dragon: {
        name: 'Дракон моря',
        icon: '🐉',
        img: 'png/resources/fish/sea-dragon.png',
        hp: 5200,
        atk: 255,
        def: 52,
        exp: 650,
        goldMult: 18,
        source: 'fishing_boss',
        returnTo: 'fishing',
        rewards: {
            resources: {'Дракон моря': 1},
            chanceResources: [{name: 'Чешуя дракона', chance: 25, amount: 1}],
            professionExp: {fishing: 360}
        },
        abilities: [
            {name:'Дыхание глубин',type:'damage',multiplier:1.6,chance:50,cooldown:2},
            {name:'Чешуя глубин',type:'buff',effect:'def',value:70,duration:2,chance:45,cooldown:3},
            {name:'Водяной смерч',type:'damage',multiplier:1.4,chance:55}
        ]
    },
    sea_goddess: {
        name: 'Богиня моря',
        icon: '🐙',
        img: 'png/resources/fish/kraken.png',
        hp: 6800,
        atk: 250,
        def: 68,
        exp: 850,
        goldMult: 18,
        source: 'fishing_boss',
        returnTo: 'fishing',
        rewards: {
            resources: {'Богиня моря': 1},
            chanceResources: [{name: 'Жемчужина глубин', chance: 30, amount: 1}],
            professionExp: {fishing: 500}
        },
        abilities: [
            {name:'Цунами',type:'damage',multiplier:1.6,chance:50,cooldown:2},
            {name:'Благословение прилива',type:'heal',value:25,chance:40,cooldown:4},
            {name:'Глубинный сон',type:'debuff',effect:'blind',value:35,duration:2,chance:40,cooldown:3},
            {name:'Пучина',type:'debuff',effect:'atk',value:30,duration:2,chance:35,cooldown:3}
        ]
    },
    bruina_leviathan: {
        name: 'Левиафан бруйна',
        icon: '🐋',
        img: 'png/resources/fish/leviathan.png',
        hp: 8500,
        atk: 285,
        def: 62,
        exp: 1100,
        goldMult: 20,
        source: 'fishing_boss',
        returnTo: 'fishing',
        rewards: {
            resources: {'Левиафан бруйна': 1, 'Шкура левиафана': 1},
            professionExp: {fishing: 700}
        },
        abilities: [
            {name:'Разлом бездны',type:'damage',multiplier:2.1,chance:38,cooldown:3},
            {name:'Панцирь древних вод',type:'shield',value:35,duration:2,chance:42,cooldown:4},
            {name:'Пожирание',type:'lifesteal',value:35,duration:2,chance:35,cooldown:4},
            {name:'Давление глубин',type:'debuff',effect:'atk',value:30,duration:2,chance:40,cooldown:3}
        ]
    }
};
