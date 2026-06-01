// abilities.js - Сбалансированная версия

const RARITY_COLORS = {'Сломанный':'#888','Обычный':'#ccc','Необычный':'#2ecc71','Редкий':'#3498db','Эпический':'#9b59b6','Легендарный':'#f0c040','Мифический':'#e74c3c','Древний':'#e67e22','Божественный':'#1abc9c'};

const ABILITIES_DB = {
    'Воин': {
        'Школа Ярости': [
            {name:'Мощный удар',desc:'130% урона, накладывает Гнев (следующий удар +30%)',lvl:1,cd:4,mana:10,dmg:130,icon:'💥',selfBuff:{type:'Гнев',dur:2,effect:'next_damage_mult',value:30}},
            {name:'Вихрь',desc:'Атакует всех врагов, накладывает Ослабление (-20% защиты)',lvl:5,cd:5,mana:20,dmg:100,icon:'🌪️',aoe:true,enemyDebuff:{type:'Ослабление',dur:2,effect:'def_reduce',value:20}},
            {name:'Берсерк',desc:'Входит в ярость: +20% урона, но -10% защиты',lvl:10,cd:6,mana:15,icon:'😤',selfBuff:{atk:20,def:-10,dur:3}},
            {name:'Сокрушение',desc:'200% урона, но следующий ход пропускается',lvl:15,cd:6,mana:25,dmg:200,icon:'🔨',skipNextTurn:true},
            {name:'Разрушитель',desc:'180% урона, игнорирует 50% защиты',lvl:20,cd:7,mana:30,dmg:180,icon:'💣',ignoreDef:50},
            {name:'Кровавая ярость',desc:'160% урона, вампиризм 40% от нанесённого урона',lvl:25,cd:6,mana:35,dmg:160,icon:'🩸',lifesteal:40},
            {name:'Ярость воина',desc:'За 3 хода наносит 280% урона (80%+100%+100%)',lvl:30,cd:7,mana:40,icon:'🔥',combo:[80,100,100]},
            {name:'Гнев титана',desc:'220% урона, оглушает цель на 1 ход',lvl:35,cd:7,mana:45,dmg:220,icon:'👊',effect:{type:'Оглушение',dur:1}},
            {name:'Апокалипсис',desc:'200% урона всем врагам, оставляет кровотечение (8% HP/ход)',lvl:40,cd:8,mana:55,dmg:200,icon:'☠️',aoe:true,effect:{type:'Кровотечение',dur:2,val:8}},
            {name:'Ярость берсерка',desc:'Каждый следующий удар +15% (до 60%), бафф сбрасывается при промахе',lvl:45,cd:0,mana:0,icon:'💢',rampUp:{perStack:15,maxStack:4}},
            {name:'Разрыв реальности',desc:'350% урона, мгновенно убивает если цель <10% HP',lvl:50,cd:9,mana:70,dmg:350,icon:'🌌',executeInstant:{threshold:10,chance:100}}
        ],
        'Школа Защиты': [
            {name:'Железная воля',desc:'+30% защиты, отражает 25% урона на 3 хода',lvl:1,cd:5,mana:10,icon:'🛡️',buff:{def:30,dur:3},reflect:25},
            {name:'Щитовой удар',desc:'120% урона, создаёт щит на 50% от нанесённого урона',lvl:5,cd:5,mana:15,dmg:120,icon:'💢',shieldFromDamage:50},
            {name:'Стойкость',desc:'+40% защиты, получаемое лечение +25% на 3 хода',lvl:10,cd:6,mana:20,icon:'🏰',buff:{def:40,dur:3},healBonus:25},
            {name:'Контратака',desc:'Пассивно: 50% шанс контратаки при получении урона (80% урона)',lvl:15,cd:0,icon:'↩️',passive:true,counterChance:50,counterDmg:80},
            {name:'Несокрушимый',desc:'Иммунитет к урону на 1 ход, лечит 15% HP',lvl:20,cd:8,mana:30,icon:'💎',immune:true,dur:1,heal:15},
            {name:'Стальная крепость',desc:'+50% защиты, +1% реген HP каждый ход на 3 хода',lvl:25,cd:6,mana:25,icon:'🏯',buff:{def:50,dur:3},regen:1},
            {name:'Стена стали',desc:'Уменьшает весь входящий урон на 30% на 2 хода',lvl:30,cd:7,mana:35,icon:'🧱',damageReduction:30,dur:2},
            {name:'Отражение боли',desc:'Отражает 80% урона в течение 1 хода',lvl:35,cd:6,mana:40,icon:'🔮',reflect:80,dur:1},
            {name:'Небесный щит',desc:'Создаёт щит на 100% от максимального здоровья, длится 2 хода',lvl:40,cd:8,mana:50,icon:'😇',maxHpShield:100,dur:2},
            {name:'Аура защиты',desc:'+50% защиты союзникам, лечит 10% HP',lvl:45,cd:7,mana:60,icon:'🌟',partyBuff:{def:50,dur:3},heal:10},
            {name:'Абсолютная защита',desc:'Иммунитет + отражение 100%, лечит 20% HP',lvl:50,cd:9,mana:70,icon:'🛡️',immune:true,dur:1,reflect:100,heal:20}
        ],
        'Школа Оружия': [
            {name:'Рывок',desc:'120% урона, следующий удар гарантированно критический',lvl:1,cd:4,mana:10,dmg:120,icon:'💨',nextCrit:true},
            {name:'Глубокий порез',desc:'130% урона, цель истекает кровью (8% HP за ход, 2 хода)',lvl:5,cd:5,mana:15,dmg:130,icon:'🩸',effect:{type:'Кровотечение',dur:2,val:8}},
            {name:'Боевая стойка',desc:'+20% урона и защиты, +10% к критическому урону на 3 хода',lvl:10,cd:6,mana:20,icon:'⚔️',buff:{atk:20,def:20,critDmg:10,dur:3}},
            {name:'Точный удар',desc:'Критический удар с 180% урона, +30% к крит урону',lvl:15,cd:5,mana:25,dmg:180,icon:'🎯',guaranteedCrit:true,critDmgBonus:30},
            {name:'Мастер клинка',desc:'Пассивно +10% урона, +5% крита, +15% крит урона',lvl:20,cd:0,icon:'🗡️',passive:true,permAtk:10,permCrit:5,permCritDmg:15},
            {name:'Танец клинков',desc:'3 атаки по 80% урона, каждая следующая +5%',lvl:25,cd:6,mana:30,icon:'💃',multiHit:{hits:3,baseDmg:80,increment:5}},
            {name:'Финальная битва',desc:'300% урона, если цель умирает — немедленный дополнительный ход',lvl:30,cd:7,mana:40,dmg:300,icon:'⚡',extraTurnOnKill:true},
            {name:'Вихрь клинков',desc:'160% урона всем, накладывает кровотечение, снижает защиту на 15%',lvl:35,cd:7,mana:45,dmg:160,icon:'🌀',aoe:true,effect:{type:'Кровотечение',dur:2,val:6},enemyDebuff:{type:'def_reduce',value:15,dur:2}},
            {name:'Удар возмездия',desc:'200% урона, +75% если у тебя меньше 30% HP',lvl:40,cd:6,mana:50,dmg:200,icon:'⚡',executeOnLowHp:30,lowHpBonus:75},
            {name:'Мастерство берсерка',desc:'Пассивно +15% урона, +10% крита, +30% крит урона',lvl:45,cd:0,icon:'🗡️',passive:true,permAtk:15,permCrit:10,permCritDmg:30},
            {name:'Божественное возмездие',desc:'400% урона, воскрешает с 30% HP если умер в этом бою',lvl:50,cd:10,mana:80,dmg:400,icon:'✨',reviveOnDeath:true,reviveHp:30}
        ]
    },
    'Маг': {
        'Школа Огня': [
            {name:'Огненная стрела',desc:'110% урона, поджигает цель (5% HP за ход, 3 хода), может распространяться',lvl:1,cd:2,mana:12,dmg:110,icon:'🔥',effect:{type:'Горение',dur:3,val:5,spread:true}},
            {name:'Огненный шар',desc:'160% урона, взрыв наносит 40% урона соседним врагам',lvl:5,cd:4,mana:20,dmg:160,icon:'☄️',splash:40},
            {name:'Огненный взрыв',desc:'120% урона всем, накладывает "Уязвимость к огню" (+30% урона от огня)',lvl:10,cd:4,mana:28,dmg:120,icon:'💥',aoe:true,fireVuln:30},
            {name:'Пламенный вихрь',desc:'140% урона + горение, каждое тикание горения восстанавливает 4 маны',lvl:15,cd:4,mana:30,dmg:140,icon:'🌋',effect:{type:'Горение',dur:2,val:8,manaRegen:4}},
            {name:'Огненный шторм',desc:'130% урона всем, длится 2 хода (всего 260%)',lvl:20,cd:5,mana:38,dmg:130,icon:'🌪️',aoe:true,dotOverTime:{dur:2,dmgPerTurn:130}},
            {name:'Пекло',desc:'180% урона + сильное горение, превращает землю в лаву (+20% урона огнём)',lvl:25,cd:5,mana:45,dmg:180,icon:'🔥',effect:{type:'Горение',dur:2,val:12},groundBuff:'lava',value:20},
            {name:'Великий огонь',desc:'220% урона, если цель горит — сжигает все эффекты и наносит дополнительно 120%',lvl:30,cd:5,mana:50,dmg:220,icon:'🔴',consumeBurn:120},
            {name:'Метеоритный дождь',desc:'180% урона всем, оглушает на 1 ход',lvl:35,cd:7,mana:60,dmg:180,icon:'☄️',aoe:true,effect:{type:'Оглушение',dur:1}},
            {name:'Ядро солнца',desc:'280% урона, ослепляет цель (-40% точность на 2 хода)',lvl:40,cd:7,mana:65,dmg:280,icon:'☀️',effect:{type:'Ослепление',dur:2,value:40}},
            {name:'Огненная душа',desc:'Превращает 40% маны в щит, на 3 хода урон увеличен на 25%',lvl:45,cd:7,mana:50,icon:'🔥',manaToShield:40,buff:{atk:25,dur:3}},
            {name:'Армагеддон',desc:'350% урона всем, уничтожает 20% максимальной маны цели',lvl:50,cd:8,mana:80,dmg:350,icon:'🌋',aoe:true,burnMana:20}
        ],
        // Школа Льда - исправленные способности
'Школа Льда': [
    {name:'Ледяная стрела',desc:'100% урона, замораживает цель на 1 ход',lvl:1,cd:4,mana:18,dmg:100,icon:'❄️',effect:{type:'Заморозка',dur:1}},
    {name:'Ледяная тюрьма',desc:'Не наносит урон, замораживает цель на 1 ход',lvl:5,cd:6,mana:30,icon:'🧊',effect:{type:'Заморозка',dur:1},noDamage:true},
    {name:'Ледяной щит',desc:'+35% защиты на 2 хода, создаёт щит на 30% от макс. HP',lvl:10,cd:6,mana:25,icon:'🛡️',buff:{def:35,dur:2},maxHpShield:30,dur:2},
    {name:'Ледяная буря',desc:'100% урона всем, замораживает всех врагов на 1 ход',lvl:15,cd:7,mana:45,dmg:100,icon:'🌨️',aoe:true,effect:{type:'Заморозка',dur:1}},
    {name:'Абсолютный холод',desc:'200% урона, снимает все баффы с цели, замораживает на 1 ход',lvl:20,cd:7,mana:50,dmg:200,icon:'🥶',dispelBuffs:true,effect:{type:'Заморозка',dur:1}},
    {name:'Снежная буря',desc:'130% урона всем, каждый замороженный враг даёт +8 маны',lvl:25,cd:6,mana:48,dmg:130,icon:'🌨️',aoe:true,manaPerFrozen:8},
    {name:'Великая зима',desc:'160% урона всем, поле холода: враги теряют 6% маны за ход',lvl:30,cd:7,mana:55,dmg:160,icon:'🏔️',aoe:true,manaDrain:6},
    {name:'Ледяной шторм',desc:'200% урона всем, удваивает длительность заморозки',lvl:35,cd:8,mana:60,dmg:200,icon:'❄️',aoe:true,freezeExtend:true},
    {name:'Вечная мерзлота',desc:'250% урона, накладывает "Вечный холод" (30% замедление на 2 хода)',lvl:40,cd:7,mana:65,dmg:250,icon:'🧊',effect:{type:'slow',dur:2,value:30}},
    {name:'Ледяное сердце',desc:'+45% защиты, +10% к макс. мане, создаёт щит на 20% от макс. HP',lvl:45,cd:6,mana:55,icon:'💙',buff:{def:45,dur:3},maxManaBonus:10,maxHpShield:20,dur:3},
    {name:'Ледниковый период',desc:'300% урона всем, замораживает всех врагов на 1 ход',lvl:50,cd:9,mana:85,dmg:300,icon:'🏔️',aoe:true,effect:{type:'Заморозка',dur:1}}
],
        'Школа Утилити': [
            {name:'Магический щит',desc:'Поглощает 100% урона, остаток маны увеличивает щит',lvl:1,cd:4,mana:15,icon:'🔮',shield:100,manaScaling:true},
            {name:'Молниеносный прыжок',desc:'+60% уклонение на 1 ход, следующая способность бесплатна по мане',lvl:5,cd:5,mana:15,icon:'⚡',buff:{dodge:60,dur:1},nextFree:true},
            {name:'Концентрация',desc:'Восстанавливает 25 маны, следующее заклинание имеет удвоенный эффект',lvl:10,cd:5,mana:0,icon:'🧘',restoreMana:25,doubleNext:true},
            {name:'Эхо заклинания',desc:'Копирует последнее использованное заклинание с 60% эффективности',lvl:15,cd:7,mana:35,icon:'🔁',echo:0.6},
            {name:'Временной барьер',desc:'Иммунитет на 1 ход, замораживает всех врагов на 1 ход',lvl:20,cd:9,mana:50,icon:'⏳',immune:true,dur:1,effect:{type:'Заморозка',dur:1},aoe:true},
            {name:'Магический поток',desc:'+50 маны, +20% урона, +20% скорости перезарядки на 2 хода',lvl:25,cd:7,mana:0,icon:'💎',restoreMana:50,buff:{atk:20,cdReduction:20,dur:2}},
            {name:'Возрождение духа',desc:'+30% HP и маны, воскрешает с 25% если умер',lvl:30,cd:9,mana:70,icon:'✨',heal:30,restoreManaPercent:30,revive:25},
            {name:'Астральная проекция',desc:'+60% уклонение на 2 хода',lvl:35,cd:7,mana:45,icon:'👻',buff:{dodge:60,dur:2}},
            {name:'Магический взрыв',desc:'250% урона, вся оставшаяся мана превращается в дополнительный урон (1 мана = 0.5% урона)',lvl:40,cd:7,mana:60,dmg:250,icon:'💥',manaToDamage:true},
            {name:'Всевидящее око',desc:'+25% крита, +20% урона на 3 хода',lvl:45,cd:8,mana:70,icon:'👁️',buff:{crit:25,atk:20,dur:3}},
            {name:'Перерождение',desc:'Полное восстановление, возвращает 30% потраченной маны за бой',lvl:50,cd:12,mana:120,icon:'🌟',heal:100,restoreManaPercent:100,immune:true,dur:1,manaRefund:30}
        ]
    },
    'Лучник': {
        'Школа Снайпера': [
            {name:'Прицельный выстрел',desc:'130% урона, каждый выстрел увеличивает точность следующего на 15%',lvl:1,cd:3,mana:10,dmg:130,icon:'🎯',accuracyStack:15},
            {name:'Смертельный выстрел',desc:'170% урона, игнорирует 40% защиты, цель теряет 8% максимального HP',lvl:5,cd:5,mana:18,dmg:170,icon:'💀',ignoreDef:40,hpLoss:8},
            {name:'Сквозная стрела',desc:'140% урона, пробивает всех врагов на линии',lvl:10,cd:4,mana:15,dmg:140,icon:'🏹',pierce:true},
            {name:'Тихая охота',desc:'+25% урона на 1 ход, следующая атака не расходует ход',lvl:15,cd:5,mana:20,icon:'🤫',buff:{atk:25,dur:1},freeNextAction:true},
            {name:'Выстрел в сердце',desc:'230% урона, +50% крита',lvl:20,cd:6,mana:25,dmg:230,icon:'❤️',critBonus:50},
            {name:'Снайперский залп',desc:'3×90% урона, каждый последующий выстрел +15% крит шанса',lvl:25,cd:6,mana:30,icon:'🎯',multiHit:{hits:3,baseDmg:90,critRamp:15}},
            {name:'Фатальный выстрел',desc:'280% урона, если HP цели <20% — мгновенная смерть',lvl:30,cd:7,mana:40,dmg:280,icon:'☠️',executeInstant:{threshold:20,chance:100}},
            {name:'Выстрел призрака',desc:'250% урона, проходит сквозь щиты, игнорирует иммунитет',lvl:35,cd:6,mana:45,dmg:250,icon:'👻',ignoreShields:true,ignoreImmune:true},
            {name:'Убийственный выстрел',desc:'320% урона, гарантированный крит, оставляет метку (следующий удар +40%)',lvl:40,cd:7,mana:50,dmg:320,icon:'💀',guaranteedCrit:true,mark:40},
            {name:'Орлиный глаз',desc:'Пассивно +10% крита, +20% к урону по слабым местам',lvl:45,cd:0,icon:'🦅',passive:true,permCrit:10,weakspot:20},
            {name:'Выстрел судьбы',desc:'380% урона, гарантированный крит, игнорирует всё',lvl:50,cd:8,mana:70,dmg:380,icon:'🌟',guaranteedCrit:true,ignoreAll:true}
        ],
        'Школа Охотника': [
            {name:'Оглушающая стрела',desc:'90% урона, оглушает цель на 1 ход',lvl:1,cd:4,mana:12,dmg:90,icon:'😵',effect:{type:'Оглушение',dur:1}},
            {name:'Ядовитая стрела',desc:'110% урона, сильный яд (10% HP за ход, 3 хода), распространяется',lvl:5,cd:5,mana:18,dmg:110,icon:'☠️',effect:{type:'Яд',dur:3,val:10,spread:true}},
            {name:'Капкан',desc:'Не наносит урон, обездвиживает цель на 1 ход, следующий удар гарантированно критический',lvl:10,cd:6,mana:20,icon:'🪤',effect:{type:'Заморозка',dur:1},nextCrit:true,noDamage:true},
            {name:'Громовая стрела',desc:'130% урона, оглушает цель на 1 ход',lvl:15,cd:5,mana:22,dmg:130,icon:'⚡',effect:{type:'Оглушение',dur:1}},
            {name:'Стая воронов',desc:'100% урона всем, снимает невидимость, помечает всех врагов',lvl:20,cd:6,mana:30,dmg:100,icon:'🦅',aoe:true,reveal:true,markAll:true},
            {name:'Ядовитое облако',desc:'100% урона всем + яд (8% HP/ход), облако остаётся на 2 хода',lvl:25,cd:6,mana:35,dmg:100,icon:'☠️',aoe:true,effect:{type:'Яд',dur:2,val:8},lingeringCloud:true},
            {name:'Сеть теней',desc:'Не наносит урон, массовое обездвиживание на 1 ход',lvl:30,cd:7,mana:40,icon:'🕸️',aoe:true,effect:{type:'Заморозка',dur:1}},
            {name:'Громовой шторм',desc:'160% урона всем + оглушение на 1 ход',lvl:35,cd:7,mana:45,dmg:160,icon:'⚡',aoe:true,effect:{type:'Оглушение',dur:1}},
            {name:'Смертельный яд',desc:'200% урона, накладывает "Смертельный яд" (удваивает весь следующий урон)',lvl:40,cd:7,mana:50,dmg:200,icon:'☠️',effect:{type:'Смертельный яд',dur:1,value:100}},
            {name:'Капкан охотника',desc:'180% урона, обездвиживает на 1 ход, следующая способность охотника не требует маны',lvl:45,cd:6,mana:55,dmg:180,icon:'🪤',effect:{type:'Заморозка',dur:1},nextFree:true},
            {name:'Природный катаклизм',desc:'250% урона всем + яд (10% HP/ход), призывает духа природы на 2 хода',lvl:50,cd:8,mana:70,dmg:250,icon:'🌪️',aoe:true,effect:{type:'Яд',dur:2,val:10},summonSpirit:true}
        ],
        'Школа Выживания': [
            {name:'Двойной выстрел',desc:'2×80% урона, +15% уклонения на 1 ход',lvl:1,cd:3,mana:10,icon:'🏹',doubleHit:true,dmg:80,buff:{dodge:15,dur:1}},
            {name:'Уклонение',desc:'+40% уклонения на 2 хода',lvl:5,cd:5,mana:15,icon:'💨',buff:{dodge:40,dur:2}},
            {name:'Быстрая стрельба',desc:'3×65% урона, каждый выстрел восстанавливает 3 маны',lvl:10,cd:5,mana:20,icon:'⚡',tripleHit:true,dmg:65,manaPerHit:3},
            {name:'Теневой шаг',desc:'+60% уклонения на 1 ход, следующая атака +50%',lvl:15,cd:6,mana:25,icon:'🌑',buff:{dodge:60,dur:1},nextAttackBonus:50},
            {name:'Шквал стрел',desc:'4×55% урона, каждый выстрел уменьшает защиту цели на 3%',lvl:20,cd:6,mana:30,icon:'🌪️',quadHit:true,dmg:55,armorShred:3},
            {name:'Инстинкт выживания',desc:'+20% уклонения, реген 2% HP, автоматическое уклонение от смертельного удара (1 раз за бой)',lvl:25,cd:7,mana:35,icon:'💪',buff:{dodge:20,dur:3},regen:2,deathSave:true},
            {name:'Танец смерти',desc:'+40% уклонения, 30% контратаки, при уклонении следующий выстрел бесплатен',lvl:30,cd:7,mana:40,icon:'💃',buff:{dodge:40,dur:2},counterChance:30,counterDmg:60,freeOnDodge:true},
            {name:'Призрачный охотник',desc:'+50% уклонения на 2 хода',lvl:35,cd:6,mana:45,icon:'👻',buff:{dodge:50,dur:2}},
            {name:'Град стрел',desc:'5×55% урона, 15% шанс оглушить цель',lvl:40,cd:7,mana:50,icon:'🌪️',quadHit:true,dmg:55,stunChance:15},
            {name:'Элитный выживальщик',desc:'+30% уклонения, +15% крита на 3 хода',lvl:45,cd:7,mana:55,icon:'🛡️',buff:{dodge:30,crit:15,dur:3}},
            {name:'Бессмертный охотник',desc:'Иммунитет на 1 ход + 30% вампиризм, воскресает 1 раз за бой с 25% HP',lvl:50,cd:9,mana:70,icon:'🌟',immune:true,dur:1,lifesteal:30,reviveOnce:true,reviveHp:25}
        ]
    }
};
