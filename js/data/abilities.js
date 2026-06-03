// abilities.js - ПОЛНАЯ ВЕРСИЯ С ПРАВИЛЬНОЙ СТРУКТУРОЙ

const RARITY_COLORS = {'Сломанный':'#888','Обычный':'#ccc','Необычный':'#2ecc71','Редкий':'#3498db','Эпический':'#9b59b6','Легендарный':'#f0c040','Мифический':'#e74c3c','Древний':'#e67e22','Божественный':'#1abc9c'};

const ABILITIES_DB = {
    'Воин': {
        'Школа Ярости': {
            img: 'classes/warrior/iros.png',
            abilities: [
                {name:'Мощный удар',desc:'130% урона, следующий удар +30%',lvl:1,cd:4,mana:10,dmg:130,icon:'💥',nextAttackBonus:30},
                {name:'Вихрь',desc:'Атакует всех врагов, снижает защиту на 20%',lvl:5,cd:5,mana:20,dmg:100,icon:'🌪️',aoe:true,enemyDebuff:{type:'def_reduce',value:20,dur:2}},
                {name:'Берсерк',desc:'+20% урона, -10% защиты на 3 хода',lvl:10,cd:6,mana:15,icon:'😤',buff:{atk:20,def:-10,dur:3}},
                {name:'Сокрушение',desc:'200% урона, следующий ход пропускается',lvl:15,cd:6,mana:25,dmg:200,icon:'🔨',skipNextTurn:true},
                {name:'Разрушитель',desc:'180% урона, игнорирует 50% защиты',lvl:20,cd:7,mana:30,dmg:180,icon:'💣',ignoreDef:50},
                {name:'Кровавая ярость',desc:'160% урона, вампиризм 40%',lvl:25,cd:6,mana:35,dmg:160,icon:'🩸',lifesteal:40},
                {name:'Ярость воина',desc:'3 удара: 80%+100%+100% урона',lvl:30,cd:7,mana:40,icon:'🔥',combo:[80,100,100]},
                {name:'Гнев титана',desc:'220% урона, оглушает на 1 ход',lvl:35,cd:7,mana:45,dmg:220,icon:'👊',effect:{type:'Оглушение',dur:1}},
                {name:'Апокалипсис',desc:'200% урона всем, кровотечение 8% HP/ход',lvl:40,cd:8,mana:55,dmg:200,icon:'☠️',aoe:true,effect:{type:'Кровотечение',dur:2,val:8}},
                {name:'Ярость берсерка',desc:'Каждый удар +15% (до 60%)',lvl:45,cd:0,mana:0,icon:'💢',rampUp:{perStack:15,maxStack:4}},
                {name:'Разрыв реальности',desc:'350% урона, добивает если HP<10%',lvl:50,cd:9,mana:70,dmg:350,icon:'🌌',executeInstant:{threshold:10,chance:100}}
            ]
        },
        'Школа Защиты': {
            img: 'classes/warrior/zach.png',
            abilities: [
                {name:'Железная воля',desc:'+35% защиты, отражает 30% входящего урона (3 хода)',lvl:1,cd:4,mana:0,icon:'🛡️',buff:{def:35,dur:3},reflect:30},
                {name:'Щитовой удар',desc:'135% урона, щит = 60% нанесённого урона',lvl:5,cd:4,mana:0,dmg:135,icon:'💢',shieldFromDamage:60},
                {name:'Стойкость',desc:'+45% защиты, +30% к лечению (3 хода)',lvl:10,cd:5,mana:0,icon:'🏰',buff:{def:45,dur:3},healBonus:30},
                {name:'Контратака',desc:'55% шанс контратаки (100% силы удара)',lvl:15,cd:0,icon:'↩️',passive:true,counterChance:55,counterDmg:100},
                {name:'Несокрушимый',desc:'Иммунитет 1 ход, лечение 20% HP',lvl:20,cd:7,mana:0,icon:'💎',immune:true,dur:1,heal:20},
                {name:'Стальная крепость',desc:'+55% защиты, реген 2% HP/ход (3 хода)',lvl:25,cd:5,mana:0,icon:'🏯',buff:{def:55,dur:3},regen:2},
                {name:'Стена стали',desc:'−35% входящего урона на 2 хода',lvl:30,cd:6,mana:0,icon:'🧱',damageReduction:35,dur:2},
                {name:'Отражение боли',desc:'Отражает 80% входящего урона (2 хода)',lvl:35,cd:5,mana:0,icon:'🔮',reflect:80,dur:2},
                {name:'Небесный щит',desc:'Щит 100% от макс. HP на 2 хода',lvl:40,cd:7,mana:0,icon:'😇',maxHpShield:100,dur:2},
                {name:'Аура защиты',desc:'+55% защиты, +15% HP (соло: на себя)',lvl:45,cd:6,mana:0,icon:'🌟',partyBuff:{def:55,dur:3},heal:15},
                {name:'Абсолютная защита',desc:'Иммунитет 1 ход, отражение 100%, +25% HP',lvl:50,cd:8,mana:0,icon:'🛡️',immune:true,dur:1,reflect:100,heal:25}
            ]
        },
        'Школа Оружия': {
            img: 'classes/warrior/weapons.png',
            abilities: [
                {name:'Рывок',desc:'120% урона, следующий удар крит',lvl:1,cd:4,mana:10,dmg:120,icon:'💨',nextCrit:true},
                {name:'Глубокий порез',desc:'130% урона, кровотечение 8% HP/ход',lvl:5,cd:5,mana:15,dmg:130,icon:'🩸',effect:{type:'Кровотечение',dur:2,val:8}},
                {name:'Боевая стойка',desc:'+20% атаки, защиты и крит урона',lvl:10,cd:6,mana:20,icon:'⚔️',buff:{atk:20,def:20,critDmg:10,dur:3}},
                {name:'Точный удар',desc:'180% урона, гарант крит',lvl:15,cd:5,mana:25,dmg:180,icon:'🎯',guaranteedCrit:true,critDmgBonus:30},
                {name:'Мастер клинка',desc:'Пассивно +10% урона, +5% крита',lvl:20,cd:0,icon:'🗡️',passive:true,permAtk:10,permCrit:5,permCritDmg:15},
                {name:'Танец клинков',desc:'3 атаки по 80%, +5% каждая',lvl:25,cd:6,mana:30,icon:'💃',multiHit:{hits:3,baseDmg:80,increment:5}},
                {name:'Финальная битва',desc:'300% урона, при убийстве +1 ход',lvl:30,cd:7,mana:40,dmg:300,icon:'⚡',extraTurnOnKill:true},
                {name:'Вихрь клинков',desc:'160% урона всем, кровотечение, -15% защиты',lvl:35,cd:7,mana:45,dmg:160,icon:'🌀',aoe:true,effect:{type:'Кровотечение',dur:2,val:6},enemyDebuff:{type:'def_reduce',value:15,dur:2}},
                {name:'Удар возмездия',desc:'200% урона, +75% если HP<30%',lvl:40,cd:6,mana:50,dmg:200,icon:'⚡',executeOnLowHp:30,lowHpBonus:75},
                {name:'Мастерство берсерка',desc:'Пассивно +15% урона, +10% крита',lvl:45,cd:0,icon:'🗡️',passive:true,permAtk:15,permCrit:10,permCritDmg:30},
                {name:'Божественное возмездие',desc:'400% урона, воскрешение 1 раз',lvl:50,cd:10,mana:80,dmg:400,icon:'✨',reviveOnDeath:true,reviveHp:30}
            ]
        }
    },
    'Маг': {
        'Школа Огня': {
            img: 'classes/mage/fire.png',
            abilities: [
                {name:'Огненная стрела',desc:'110% урона, горение 5% HP/ход',lvl:1,cd:2,mana:12,dmg:110,icon:'🔥',effect:{type:'Горение',dur:3,val:5,spread:true}},
                {name:'Огненный шар',desc:'160% урона + 40% соседям',lvl:5,cd:4,mana:20,dmg:160,icon:'☄️',splash:40},
                {name:'Огненный взрыв',desc:'120% урона всем, +30% к урону огнём',lvl:10,cd:4,mana:28,dmg:120,icon:'💥',aoe:true,fireVuln:30},
                {name:'Пламенный вихрь',desc:'140% урона + горение, +4 маны за тик',lvl:15,cd:4,mana:30,dmg:140,icon:'🌋',effect:{type:'Горение',dur:2,val:8,manaRegen:4}},
                {name:'Огненный шторм',desc:'130% урона всем 2 хода',lvl:20,cd:5,mana:38,dmg:130,icon:'🌪️',aoe:true,dotOverTime:{dur:2,dmgPerTurn:130}},
                {name:'Пекло',desc:'180% урона + горение, +20% урона огнём',lvl:25,cd:5,mana:45,dmg:180,icon:'🔥',effect:{type:'Горение',dur:2,val:12},groundBuff:'lava',value:20},
                {name:'Великий огонь',desc:'220% урона, +120% если цель горит',lvl:30,cd:5,mana:50,dmg:220,icon:'🔴',consumeBurn:120},
                {name:'Метеоритный дождь',desc:'180% урона всем, оглушение',lvl:35,cd:7,mana:60,dmg:180,icon:'☄️',aoe:true,effect:{type:'Оглушение',dur:1}},
                {name:'Ядро солнца',desc:'280% урона, ослепление 40% промах 2 хода',lvl:40,cd:7,mana:65,dmg:280,icon:'☀️',effect:{type:'Ослепление',dur:2,val:40}},
                {name:'Огненная душа',desc:'40% маны в щит, +25% урона',lvl:45,cd:7,mana:50,icon:'🔥',manaToShield:40,buff:{atk:25,dur:3}},
                {name:'Армагеддон',desc:'350% урона всем, -20% маны цели',lvl:50,cd:8,mana:80,dmg:350,icon:'🌋',aoe:true,burnMana:20}
            ]
        },
        'Школа Льда': {
            img: 'classes/mage/ice.png',
            abilities: [
                {name:'Ледяная стрела',desc:'100% урона, заморозка 1 ход',lvl:1,cd:4,mana:18,dmg:100,icon:'❄️',effect:{type:'Заморозка',dur:1}},
                {name:'Ледяная тюрьма',desc:'Заморозка 1 ход (без урона)',lvl:5,cd:6,mana:30,icon:'🧊',effect:{type:'Заморозка',dur:1},noDamage:true},
                {name:'Ледяной щит',desc:'+35% защиты + щит 30% HP',lvl:10,cd:6,mana:25,icon:'🛡️',buff:{def:35,dur:2},maxHpShield:30,dur:2},
                {name:'Ледяная буря',desc:'100% урона всем, заморозка',lvl:15,cd:7,mana:45,dmg:100,icon:'🌨️',aoe:true,effect:{type:'Заморозка',dur:1}},
                {name:'Абсолютный холод',desc:'200% урона, заморозка',lvl:20,cd:7,mana:50,dmg:200,icon:'🥶',effect:{type:'Заморозка',dur:1},dispelBuffs:true},
                {name:'Снежная буря',desc:'130% урона всем, +8 маны за заморозку',lvl:25,cd:6,mana:48,dmg:130,icon:'🌨️',aoe:true,manaPerFrozen:8},
                {name:'Великая зима',desc:'160% урона всем, -6% маны врагам',lvl:30,cd:7,mana:55,dmg:160,icon:'🏔️',aoe:true,manaDrain:6},
                {name:'Ледяной шторм',desc:'200% урона всем, удвоение заморозки',lvl:35,cd:8,mana:60,dmg:200,icon:'❄️',aoe:true,freezeExtend:true},
                {name:'Вечная мерзлота',desc:'250% урона, замедление 30%',lvl:40,cd:7,mana:65,dmg:250,icon:'🧊',effect:{type:'slow',dur:2,value:30}},
                {name:'Ледяное сердце',desc:'+45% защиты, +10% маны, щит 20% HP',lvl:45,cd:6,mana:55,icon:'💙',buff:{def:45,dur:3},maxManaBonus:10,maxHpShield:20,dur:3},
                {name:'Ледниковый период',desc:'300% урона всем, заморозка',lvl:50,cd:9,mana:85,dmg:300,icon:'🏔️',aoe:true,effect:{type:'Заморозка',dur:1}}
            ]
        },
        'Школа Утилити': {
            img: 'classes/mage/lun.png',
            abilities: [
                {name:'Магический щит',desc:'Щит 100% HP + бонус от маны',lvl:1,cd:4,mana:15,icon:'🔮',shield:100,manaScaling:true},
                {name:'Молниеносный прыжок',desc:'+60% уклонения, следующая способность бесплатна',lvl:5,cd:5,mana:15,icon:'⚡',buff:{dodge:60,dur:1},nextFree:true},
                {name:'Концентрация',desc:'+25 маны, удвоение следующего эффекта',lvl:10,cd:5,mana:0,icon:'🧘',restoreMana:25,doubleNext:true},
                {name:'Эхо заклинания',desc:'Копирует заклинание с 60% силой',lvl:15,cd:7,mana:35,icon:'🔁',echo:0.6},
                {name:'Временной барьер',desc:'Иммунитет + заморозка всех',lvl:20,cd:9,mana:50,icon:'⏳',immune:true,dur:1,effect:{type:'Заморозка',dur:1},aoe:true},
                {name:'Магический поток',desc:'+50 маны, +20% урона и КД',lvl:25,cd:7,mana:0,icon:'💎',restoreMana:50,buff:{atk:20,cdReduction:20,dur:2}},
                {name:'Возрождение духа',desc:'+30% HP и маны, воскрешение',lvl:30,cd:9,mana:70,icon:'✨',heal:30,restoreManaPercent:30,revive:25},
                {name:'Астральная проекция',desc:'+60% уклонения 2 хода',lvl:35,cd:7,mana:45,icon:'👻',buff:{dodge:60,dur:2}},
                {name:'Магический взрыв',desc:'250% урона + вся мана в урон',lvl:40,cd:7,mana:60,dmg:250,icon:'💥',manaToDamage:true},
                {name:'Всевидящее око',desc:'+25% крита, +20% урона',lvl:45,cd:8,mana:70,icon:'👁️',buff:{crit:25,atk:20,dur:3}},
                {name:'Перерождение',desc:'Полное восстановление, возврат 30% маны',lvl:50,cd:12,mana:120,icon:'🌟',heal:100,restoreManaPercent:100,immune:true,dur:1,manaRefund:30}
            ]
        }
    },
    'Лучник': {
        'Школа Снайпера': {
            img: 'classes/archer/sniper.png',
            abilities: [
                {name:'Прицельный выстрел',desc:'130% урона, +15% точности следующему',lvl:1,cd:3,mana:10,dmg:130,icon:'🎯',nextAccuracy:15},
                {name:'Смертельный выстрел',desc:'170% урона, -40% защиты цели, -8% HP',lvl:5,cd:5,mana:18,dmg:170,icon:'💀',ignoreDef:40,hpLoss:8},
                {name:'Сквозная стрела',desc:'140% урона, пробивает всех',lvl:10,cd:4,mana:15,dmg:140,icon:'🏹',pierce:true},
                {name:'Тихая охота',desc:'+25% урона, следующая атака бесплатно',lvl:15,cd:5,mana:20,icon:'🤫',buff:{atk:25,dur:1},freeNextAction:true},
                {name:'Выстрел в сердце',desc:'230% урона, +50% крита',lvl:20,cd:6,mana:25,dmg:230,icon:'❤️',critBonus:50},
                {name:'Снайперский залп',desc:'3×90% урона, +15% крита за выстрел',lvl:25,cd:6,mana:30,icon:'🎯',multiHit:{hits:3,baseDmg:90,critRamp:15}},
                {name:'Фатальный выстрел',desc:'280% урона, добивает если HP<20%',lvl:30,cd:7,mana:40,dmg:280,icon:'☠️',executeInstant:{threshold:20,chance:100}},
                {name:'Выстрел призрака',desc:'250% урона, сквозь щиты',lvl:35,cd:6,mana:45,dmg:250,icon:'👻',ignoreShields:true},
                {name:'Убийственный выстрел',desc:'320% урона, гарант крит, метка +40%',lvl:40,cd:7,mana:50,dmg:320,icon:'💀',guaranteedCrit:true,mark:40},
                {name:'Орлиный глаз',desc:'Пассивно +10% крита, +20% к слабым местам',lvl:45,cd:0,icon:'🦅',passive:true,permCrit:10,weakspot:20},
                {name:'Выстрел судьбы',desc:'380% урона, гарант крит, игнорирует всё',lvl:50,cd:8,mana:70,dmg:380,icon:'🌟',guaranteedCrit:true,ignoreAll:true}
            ]
        },
        'Школа Охотника': {
            img: 'classes/archer/oxot.png',
            abilities: [
                {name:'Оглушающая стрела',desc:'90% урона, оглушение',lvl:1,cd:4,mana:12,dmg:90,icon:'😵',effect:{type:'Оглушение',dur:1}},
                {name:'Ядовитая стрела',desc:'110% урона, яд 10% HP/ход',lvl:5,cd:5,mana:18,dmg:110,icon:'☠️',effect:{type:'Яд',dur:3,val:10,spread:true}},
                {name:'Капкан',desc:'Обездвиживание 1 ход, следующий удар крит',lvl:10,cd:6,mana:20,icon:'🪤',effect:{type:'Заморозка',dur:1},nextCrit:true,noDamage:true},
                {name:'Громовая стрела',desc:'130% урона, оглушение',lvl:15,cd:5,mana:22,dmg:130,icon:'⚡',effect:{type:'Оглушение',dur:1}},
                {name:'Стая воронов',desc:'100% урона всем, метка на всех',lvl:20,cd:6,mana:30,dmg:100,icon:'🦅',aoe:true,markAll:true},
                {name:'Ядовитое облако',desc:'100% урона всем + яд, облако 2 хода',lvl:25,cd:6,mana:35,dmg:100,icon:'☠️',aoe:true,effect:{type:'Яд',dur:2,val:8},lingeringCloud:true},
                {name:'Сеть теней',desc:'Массовое обездвиживание 1 ход',lvl:30,cd:7,mana:40,icon:'🕸️',aoe:true,effect:{type:'Заморозка',dur:1}},
                {name:'Громовой шторм',desc:'160% урона всем + оглушение',lvl:35,cd:7,mana:45,dmg:160,icon:'⚡',aoe:true,effect:{type:'Оглушение',dur:1}},
                {name:'Смертельный яд',desc:'200% урона, удваивает следующий урон',lvl:40,cd:7,mana:50,dmg:200,icon:'☠️',effect:{type:'Смертельный яд',dur:1,value:100}},
                {name:'Капкан охотника',desc:'180% урона, обездвиживание, следующая способность бесплатна',lvl:45,cd:6,mana:55,dmg:180,icon:'🪤',effect:{type:'Заморозка',dur:1},nextFree:true},
                {name:'Природный катаклизм',desc:'250% урона всем + яд, призыв духа',lvl:50,cd:8,mana:70,dmg:250,icon:'🌪️',aoe:true,effect:{type:'Яд',dur:2,val:10},summonSpirit:true}
            ]
        },
        'Школа Выживания': {
            img: 'classes/archer/vig.png',
            abilities: [
                {name:'Двойной выстрел',desc:'2×80% урона, +15% уклонения',lvl:1,cd:3,mana:10,icon:'🏹',doubleHit:true,dmg:80,buff:{dodge:15,dur:1}},
                {name:'Уклонение',desc:'+40% уклонения 2 хода',lvl:5,cd:5,mana:15,icon:'💨',buff:{dodge:40,dur:2}},
                {name:'Быстрая стрельба',desc:'3×65% урона, +3 маны за удар',lvl:10,cd:5,mana:20,icon:'⚡',tripleHit:true,dmg:65,manaPerHit:3},
                {name:'Теневой шаг',desc:'+60% уклонения, +50% след атаке',lvl:15,cd:6,mana:25,icon:'🌑',buff:{dodge:60,dur:1},nextAttackBonus:50},
                {name:'Шквал стрел',desc:'4×55% урона, -3% защиты за удар',lvl:20,cd:6,mana:30,icon:'🌪️',quadHit:true,dmg:55,armorShred:3},
                {name:'Инстинкт выживания',desc:'+20% уклонения, реген 2%, спасение от смерти',lvl:25,cd:7,mana:35,icon:'💪',buff:{dodge:20,dur:3},regen:2,deathSave:true},
                {name:'Танец смерти',desc:'+40% уклонения, 30% контратаки, при уклонении бесплатный выстрел',lvl:30,cd:7,mana:40,icon:'💃',buff:{dodge:40,dur:2},counterChance:30,counterDmg:60,freeOnDodge:true},
                {name:'Призрачный охотник',desc:'+50% уклонения 2 хода',lvl:35,cd:6,mana:45,icon:'👻',buff:{dodge:50,dur:2}},
                {name:'Град стрел',desc:'5×55% урона, 15% шанс оглушения',lvl:40,cd:7,mana:50,icon:'🌪️',quadHit:true,hitCount:5,dmg:55,stunChance:15},
                {name:'Элитный выживальщик',desc:'+30% уклонения, +15% крита',lvl:45,cd:7,mana:55,icon:'🛡️',buff:{dodge:30,crit:15,dur:3}},
                {name:'Бессмертный охотник',desc:'Иммунитет + 30% вампиризм, воскрешение 1 раз',lvl:50,cd:9,mana:70,icon:'🌟',immune:true,dur:1,lifesteal:30,reviveOnce:true,reviveHp:25}
            ]
        }
    }
};

// Для отладки - проверим структуру
console.log('=== ABILITIES_DB ЗАГРУЖЕН ===');
console.log('Воин.Школа Ярости.img:', ABILITIES_DB['Воин']['Школа Ярости']?.img);
console.log('Маг.Школа Огня.img:', ABILITIES_DB['Маг']['Школа Огня']?.img);
console.log('Лучник.Школа Снайпера.img:', ABILITIES_DB['Лучник']['Школа Снайпера']?.img);