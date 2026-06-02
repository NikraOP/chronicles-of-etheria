// js/data/skins.js - С разделением по полу

const SKINS_DB = {
    // Скины для ВОИНА (Мужской)
    'Воин': {
        'male': {
            'Школа Ярости': [
                {
                    id: 'warrior_rage_default_m',
                    name: 'Базовый',
                    icon: '😤',
                    img: 'classes/warrior/male/iros.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ воина ярости',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'warrior_rage_berserk_m',
                    name: 'Берсерк',
                    icon: '💢',
                    img: 'classes/warrior/male/iros_berserk.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Облик берсерка, охваченного боевой яростью',
                    gender: 'male'
                },
                {
                    id: 'warrior_rage_titan_m',
                    name: 'Титан',
                    icon: '💪',
                    img: 'classes/warrior/male/iros_titan.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ титана, крушащего всё на своём пути',
                    gender: 'male'
                },
                {
                    id: 'warrior_rage_demon_m',
                    name: 'Демон ярости',
                    icon: '👿',
                    img: 'classes/warrior/male/iros_demon.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Демонический облик, внушающий ужас врагам',
                    gender: 'male'
                },
                {
                    id: 'warrior_rage_legend_m',
                    name: 'Легендарный воин',
                    icon: '👑',
                    img: 'classes/warrior/male/iros_legend.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ легендарного героя древности',
                    gender: 'male'
                }
            ],
            'Школа Защиты': [
                {
                    id: 'warrior_def_default_m',
                    name: 'Базовый',
                    icon: '🛡️',
                    img: 'classes/warrior/male/zach.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ защитника',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'warrior_def_knight_m',
                    name: 'Рыцарь',
                    icon: '⚔️',
                    img: 'classes/warrior/male/zach_knight.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ благородного рыцаря в сияющих доспехах',
                    gender: 'male'
                },
                {
                    id: 'warrior_def_paladin_m',
                    name: 'Паладин',
                    icon: '✨',
                    img: 'classes/warrior/male/zach_paladin.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Священный воин, несущий свет и защиту',
                    gender: 'male'
                },
                {
                    id: 'warrior_def_guardian_m',
                    name: 'Страж',
                    icon: '🏛️',
                    img: 'classes/warrior/male/zach_guardian.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Древний страж, защищавший королей',
                    gender: 'male'
                },
                {
                    id: 'warrior_def_immortal_m',
                    name: 'Бессмертный',
                    icon: '🌟',
                    img: 'classes/warrior/male/zach_immortal.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ бессмертного воина, которого невозможно убить',
                    gender: 'male'
                }
            ],
            'Школа Оружия': [
                {
                    id: 'warrior_weapon_default_m',
                    name: 'Базовый',
                    icon: '⚔️',
                    img: 'classes/warrior/weapons.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ мастера оружия',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'warrior_weapon_blademaster_m',
                    name: 'Мастер клинка',
                    icon: '🗡️',
                    img: 'classes/warrior/male/weapons_blademaster.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ искусного фехтовальщика',
                    gender: 'male'
                },
                {
                    id: 'warrior_weapon_samurai_m',
                    name: 'Самурай',
                    icon: '🎌',
                    img: 'classes/warrior/male/weapons_samurai.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ благородного самурая с катаной',
                    gender: 'male'
                },
                {
                    id: 'warrior_weapon_executioner_m',
                    name: 'Палач',
                    icon: '🔪',
                    img: 'classes/warrior/male/weapons_executioner.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Мрачный образ палача с огромным топором',
                    gender: 'male'
                },
                {
                    id: 'warrior_weapon_godslayer_m',
                    name: 'Богоубийца',
                    icon: '⚡',
                    img: 'classes/warrior/male/weapons_godslayer.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ того, кто бросил вызов самим богам',
                    gender: 'male'
                }
            ]
        },
        'female': {
            'Школа Ярости': [
                {
                    id: 'warrior_rage_default_f',
                    name: 'Базовый (жен.)',
                    icon: '😤',
                    img: 'classes/warrior/warrior-women.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ воительницы ярости',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'warrior_rage_berserk_f',
                    name: 'Магическое платье',
                    icon: '💢',
                    img: 'classes/warrior/warrior-womenPlas.png',
                    price: 10000,
                    rarity: 'Легендарный',
                    description: 'Облик берсеркши, охваченной боевой яростью',
                    gender: 'female'
                },
                {
                    id: 'warrior_rage_titan_f',
                    name: 'Гамора вселенская',
                    icon: '💪',
                    img: 'classes/warrior/warrior-womenNiz.png',
                    price: 5000,
                    rarity: 'Эпический',
                    description: 'Образ титанессы, крушащей всё на своём пути',
                    gender: 'female'
                },
            ],
            'Школа Защиты': [
                {
                    id: 'warrior_def_default_f',
                    name: 'Базовый (жен.)',
                    icon: '🛡️',
                    img: 'classes/warrior/female/zach_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ защитницы',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'warrior_def_knight_f',
                    name: 'Рыцарь (жен.)',
                    icon: '⚔️',
                    img: 'classes/warrior/female/zach_knight_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ благородной рыцарши в сияющих доспехах',
                    gender: 'female'
                },
                {
                    id: 'warrior_def_paladin_f',
                    name: 'Паладин (жен.)',
                    icon: '✨',
                    img: 'classes/warrior/female/zach_paladin_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Священная воительница, несущая свет и защиту',
                    gender: 'female'
                },
                {
                    id: 'warrior_def_guardian_f',
                    name: 'Страж (жен.)',
                    icon: '🏛️',
                    img: 'classes/warrior/female/zach_guardian_f.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Древняя стража, защищавшая королей',
                    gender: 'female'
                }
            ],
            'Школа Оружия': [
                {
                    id: 'warrior_weapon_default_f',
                    name: 'Базовый (жен.)',
                    icon: '⚔️',
                    img: 'classes/warrior/female/weapons_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ мастера оружия',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'warrior_weapon_blademaster_f',
                    name: 'Мастер клинка (жен.)',
                    icon: '🗡️',
                    img: 'classes/warrior/female/weapons_blademaster_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ искусной фехтовальщицы',
                    gender: 'female'
                },
                {
                    id: 'warrior_weapon_samurai_f',
                    name: 'Самурай (жен.)',
                    icon: '🎌',
                    img: 'classes/warrior/female/weapons_samurai_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ благородной самурайки с катаной',
                    gender: 'female'
                }
            ]
        }
    },
    
    // Скины для МАГА (с разделением по полу)
    'Маг': {
        'male': {
            'Школа Огня': [
                {
                    id: 'mage_fire_default_m',
                    name: 'Базовый',
                    icon: '🔥',
                    img: 'classes/mage/fire.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ пироманта',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'mage_fire_cosmo_m',
                    name: 'Повелитель космоса',
                    icon: '🌌',
                    img: 'classes/mage/fire-cosmo.png',
                    price: 2500,
                    rarity: 'Редкий',
                    description: 'Облик, из огня с космической пылью',
                    gender: 'male'
                },
                {
                    id: 'mage_fire_vulkan_m',
                    name: 'Повелитель вулканов',
                    icon: '🌋',
                    img: 'classes/mage/fire-vulkan.png',
                    price: 5000,
                    rarity: 'Эпический',
                    description: 'Облик, объятый вулканической корой',
                    gender: 'male'
                },
                {
                    id: 'mage_fire_demon_m',
                    name: 'Демонический лорд огня',
                    icon: '🐦‍🔥',
                    img: 'classes/mage/fire-demon.png',
                    price: 15000,
                    rarity: 'Легендарный',
                    description: 'Образ возрождающегося из пепла ада',
                    gender: 'male'
                },
                {
                    id: 'mage_fire_fenix_m',
                    name: 'Феникс перерождения',
                    icon: '🐦‍🔥',
                    img: 'classes/mage/fire-fenix.png',
                    price: 20000,
                    rarity: 'Древний',
                    description: 'Образ возрождающегося из пепла феникс',
                    gender: 'male'
                }
            ],
            'Школа Льда': [
                {
                    id: 'mage_ice_default_m',
                    name: 'Базовый',
                    icon: '❄️',
                    img: 'classes/mage/ice.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ криоманта',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'mage_ice_frost_m',
                    name: 'Морозный',
                    icon: '🌨️',
                    img: 'classes/mage/male/ice_frost.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Облик, покрытый инеем',
                    gender: 'male'
                },
                {
                    id: 'mage_ice_winter_m',
                    name: 'Зимний властелин',
                    icon: '🏔️',
                    img: 'classes/mage/male/ice_winter.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ повелителя вечной зимы',
                    gender: 'male'
                },
                {
                    id: 'mage_ice_frostlich_m',
                    name: 'Ледяной лич',
                    icon: '💀',
                    img: 'classes/mage/male/ice_frostlich.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Мрачный образ могущественного лича',
                    gender: 'male'
                },
                {
                    id: 'mage_ice_absolute_m',
                    name: 'Абсолютный ноль',
                    icon: '🥶',
                    img: 'classes/mage/male/ice_absolute.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ, замораживающий саму реальность',
                    gender: 'male'
                }
            ],
            'Школа Утилити': [
                {
                    id: 'mage_util_default_m',
                    name: 'Базовый',
                    icon: '✨',
                    img: 'classes/mage/lun.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ мага',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'mage_util_arcane_m',
                    name: 'Арканный маг',
                    icon: '🔮',
                    img: 'classes/mage/male/lun_arcane.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ мага, владеющего арканной магией',
                    gender: 'male'
                },
                {
                    id: 'mage_util_chrono_m',
                    name: 'Хрономаг',
                    icon: '⏳',
                    img: 'classes/mage/male/lun_chrono.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ мага, управляющего временем',
                    gender: 'male'
                },
                {
                    id: 'mage_util_void_m',
                    name: 'Маг пустоты',
                    icon: '🌌',
                    img: 'classes/mage/male/lun_void.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Таинственный облик повелителя пустоты',
                    gender: 'male'
                },
                {
                    id: 'mage_util_archmage_m',
                    name: 'Архимаг',
                    icon: '👑',
                    img: 'classes/mage/male/lun_archmage.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ величайшего из магов',
                    gender: 'male'
                }
            ]
        },
        'female': {
            'Школа Огня': [
                {
                    id: 'mage_fire_default_f',
                    name: 'Базовый (жен.)',
                    icon: '🔥',
                    img: 'classes/mage/female/fire_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ пиромантки',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'mage_fire_cosmo_f',
                    name: 'Повелительница космоса',
                    icon: '🌌',
                    img: 'classes/mage/female/fire-cosmo_f.png',
                    price: 2500,
                    rarity: 'Редкий',
                    description: 'Облик, из огня с космической пылью',
                    gender: 'female'
                },
                {
                    id: 'mage_fire_vulkan_f',
                    name: 'Повелительница вулканов',
                    icon: '🌋',
                    img: 'classes/mage/female/fire-vulkan_f.png',
                    price: 5000,
                    rarity: 'Эпический',
                    description: 'Облик, объятый вулканической корой',
                    gender: 'female'
                },
                {
                    id: 'mage_fire_demon_f',
                    name: 'Демоническая леди огня',
                    icon: '🐦‍🔥',
                    img: 'classes/mage/female/fire-demon_f.png',
                    price: 15000,
                    rarity: 'Легендарный',
                    description: 'Образ возрождающейся из пепла ада',
                    gender: 'female'
                }
            ],
            'Школа Льда': [
                {
                    id: 'mage_ice_default_f',
                    name: 'Базовый (жен.)',
                    icon: '❄️',
                    img: 'classes/mage/female/ice_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ криомантки',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'mage_ice_frost_f',
                    name: 'Морозная (жен.)',
                    icon: '🌨️',
                    img: 'classes/mage/female/ice_frost_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Облик, покрытый инеем',
                    gender: 'female'
                },
                {
                    id: 'mage_ice_winter_f',
                    name: 'Зимняя властелина',
                    icon: '🏔️',
                    img: 'classes/mage/female/ice_winter_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ повелительницы вечной зимы',
                    gender: 'female'
                },
                {
                    id: 'mage_ice_frostlich_f',
                    name: 'Ледяная лич',
                    icon: '💀',
                    img: 'classes/mage/female/ice_frostlich_f.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Мрачный образ могущественной лича',
                    gender: 'female'
                },
                {
                    id: 'mage_ice_absolute_f',
                    name: 'Абсолютный ноль (жен.)',
                    icon: '🥶',
                    img: 'classes/mage/female/ice_absolute_f.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ, замораживающий саму реальность',
                    gender: 'female'
                }
            ],
            'Школа Утилити': [
                {
                    id: 'mage_util_default_f',
                    name: 'Базовый (жен.)',
                    icon: '✨',
                    img: 'classes/mage/female/lun_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ волшебницы',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'mage_util_arcane_f',
                    name: 'Арканная волшебница',
                    icon: '🔮',
                    img: 'classes/mage/female/lun_arcane_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ волшебницы, владеющей арканной магией',
                    gender: 'female'
                },
                {
                    id: 'mage_util_chrono_f',
                    name: 'Хрономантка',
                    icon: '⏳',
                    img: 'classes/mage/female/lun_chrono_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ волшебницы, управляющей временем',
                    gender: 'female'
                },
                {
                    id: 'mage_util_void_f',
                    name: 'Волшебница пустоты',
                    icon: '🌌',
                    img: 'classes/mage/female/lun_void_f.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Таинственный облик повелительницы пустоты',
                    gender: 'female'
                },
                {
                    id: 'mage_util_archmage_f',
                    name: 'Архимагесса',
                    icon: '👑',
                    img: 'classes/mage/female/lun_archmage_f.png',
                    price: 35000,
                    rarity: 'Легендарный',
                    description: 'Образ величайшей из волшебниц',
                    gender: 'female'
                }
            ]
        }
    },
    
    // Скины для ЛУЧНИКА (аналогично, с male/female)
    'Лучник': {
        'male': {
            'Школа Снайпера': [
                {
                    id: 'archer_sniper_default_m',
                    name: 'Базовый',
                    icon: '🎯',
                    img: 'classes/archer/sniper.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ снайпера',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'archer_sniper_hunter_m',
                    name: 'Наёмник будущего',
                    icon: '🏹',
                    img: 'classes/archer/sniper-future.png',
                    price: 10000,
                    rarity: 'Легендарный',
                    description: 'Образ опытного убийцы',
                    gender: 'male'
                },
                {
                    id: 'archer_sniper_shadow_m',
                    name: 'Демонический стрелок',
                    icon: '🌑',
                    img: 'classes/archer/sniper-demon.png',
                    price: 20000,
                    rarity: 'Древний',
                    description: 'Таинственный стрелок из ада',
                    gender: 'male'
                }
            ],
            'Школа Охотника': [
                {
                    id: 'archer_hunter_default_m',
                    name: 'Базовый',
                    icon: '🏹',
                    img: 'classes/archer/oxot.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ охотника',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'archer_hunter_ranger_m',
                    name: 'Следопыт',
                    icon: '🌿',
                    img: 'classes/archer/male/hunter_ranger.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ лесного следопыта',
                    gender: 'male'
                },
                {
                    id: 'archer_hunter_beastmaster_m',
                    name: 'Повелитель зверей',
                    icon: '🐺',
                    img: 'classes/archer/male/hunter_beastmaster.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ укротителя диких зверей',
                    gender: 'male'
                }
            ],
            'Школа Выживания': [
                {
                    id: 'archer_survival_default_m',
                    name: 'Базовый',
                    icon: '🌿',
                    img: 'classes/archer/vig.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ выживальщика',
                    unlocked: true,
                    gender: 'male'
                },
                {
                    id: 'archer_survival_scout_m',
                    name: 'Разведчик',
                    icon: '👢',
                    img: 'classes/archer/male/survival_scout.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ бывалого разведчика',
                    gender: 'male'
                },
                {
                    id: 'archer_survival_rogue_m',
                    name: 'Ловкач',
                    icon: '🗡️',
                    img: 'classes/archer/male/survival_rogue.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ хитрого и ловкого авантюриста',
                    gender: 'male'
                }
            ]
        },
        'female': {
            'Школа Снайпера': [
                {
                    id: 'archer_sniper_default_f',
                    name: 'Базовый (жен.)',
                    icon: '🎯',
                    img: 'classes/archer/female/sniper_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ снайперши',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'archer_sniper_hunter_f',
                    name: 'Охотница',
                    icon: '🏹',
                    img: 'classes/archer/female/sniper_hunter_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ опытной охотницы',
                    gender: 'female'
                },
                {
                    id: 'archer_sniper_shadow_f',
                    name: 'Демоническая стрелок',
                    icon: '🌑',
                    img: 'classes/archer/female/sniper-demon_f.png',
                    price: 1,
                    rarity: 'Древний',
                    description: 'Таинственная стрелок из теней',
                    gender: 'female'
                },
                {
                    id: 'archer_sniper_deadeye_f',
                    name: 'Смертельный глаз (жен.)',
                    icon: '👁️',
                    img: 'classes/archer/female/sniper_deadeye_f.png',
                    price: 15000,
                    rarity: 'Эпический',
                    description: 'Образ стрелка, чей взгляд неумолим',
                    gender: 'female'
                }
            ],
            'Школа Охотника': [
                {
                    id: 'archer_hunter_default_f',
                    name: 'Базовый (жен.)',
                    icon: '🏹',
                    img: 'classes/archer/female/oxot_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ охотницы',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'archer_hunter_ranger_f',
                    name: 'Следопытка',
                    icon: '🌿',
                    img: 'classes/archer/female/hunter_ranger_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ лесной следопытки',
                    gender: 'female'
                },
                {
                    id: 'archer_hunter_beastmaster_f',
                    name: 'Повелительница зверей',
                    icon: '🐺',
                    img: 'classes/archer/female/hunter_beastmaster_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ укротительницы диких зверей',
                    gender: 'female'
                }
            ],
            'Школа Выживания': [
                {
                    id: 'archer_survival_default_f',
                    name: 'Базовый (жен.)',
                    icon: '🌿',
                    img: 'classes/archer/female/vig_f.png',
                    price: 0,
                    rarity: 'Обычный',
                    description: 'Стандартный образ выживальщицы',
                    unlocked: true,
                    gender: 'female'
                },
                {
                    id: 'archer_survival_scout_f',
                    name: 'Разведчица',
                    icon: '👢',
                    img: 'classes/archer/female/survival_scout_f.png',
                    price: 1500,
                    rarity: 'Необычный',
                    description: 'Образ бывалой разведчицы',
                    gender: 'female'
                },
                {
                    id: 'archer_survival_rogue_f',
                    name: 'Ловкачка',
                    icon: '🗡️',
                    img: 'classes/archer/female/survival_rogue_f.png',
                    price: 5000,
                    rarity: 'Редкий',
                    description: 'Образ хитрой и ловкой авантюристки',
                    gender: 'female'
                }
            ]
        }
    }
};

// Функция для получения скинов для текущего класса, школы и пола
function getSkinsForCurrentSchool() {
    if (!player) return [];
    
    const classSkins = SKINS_DB[player.class];
    if (!classSkins) return [];
    
    const genderSkins = classSkins[player.gender || 'male'];
    if (!genderSkins) return [];
    
    const schoolSkins = genderSkins[player.branch];
    if (!schoolSkins) return [];
    
    // Загружаем сохранённые unlocked скины из player
    if (!player.unlockedSkins) player.unlockedSkins = [];
    
    // Обновляем статус unlocked для каждого скина на основе сохранённых данных
    return schoolSkins.map(skin => {
        const isUnlocked = player.unlockedSkins.includes(skin.id) || skin.price === 0;
        return { ...skin, unlocked: isUnlocked };
    });
}

// Функция для получения текущего активного скина
function getCurrentSkin() {
    if (!player.currentSkin) {
        const skins = getSkinsForCurrentSchool();
        const defaultSkin = skins.find(s => s.price === 0);
        if (defaultSkin) {
            player.currentSkin = defaultSkin.id;
            player.schoolImg = defaultSkin.img;
            saveGame();
        }
    }
    return player.currentSkin;
}

// Функция для установки нового скина
function equipSkin(skinId) {
    const skins = getSkinsForCurrentSchool();
    const skin = skins.find(s => s.id === skinId);
    if (!skin) {
        addMessage('❌ Скин не найден!', 'error');
        return false;
    }
    if (!skin.unlocked && skin.price > 0) {
        addMessage(`❌ Скин "${skin.name}" не куплен!`, 'error');
        return false;
    }
    player.currentSkin = skinId;
    player.schoolImg = skin.img;
    saveGame();
    addMessage(`✨ Экипирован скин: ${skin.name}!`, 'success');
    
    if (typeof refreshCurrentCategory !== 'undefined') {
        refreshCurrentCategory();
    }
    renderGame();
    return true;
}

// Функция для покупки скина
function buySkin(skinId) {
    const skins = getSkinsForCurrentSchool();
    const skin = skins.find(s => s.id === skinId);
    if (!skin) {
        addMessage('❌ Скин не найден!', 'error');
        return false;
    }
    
    if (player.unlockedSkins && player.unlockedSkins.includes(skinId)) {
        addMessage(`❌ Скин "${skin.name}" уже куплен!`, 'error');
        return false;
    }
    
    if (player.gold < skin.price) {
        addMessage(`❌ Не хватает золота! Нужно ${skin.price}`, 'error');
        return false;
    }
    
    player.gold -= skin.price;
    
    if (!player.unlockedSkins) player.unlockedSkins = [];
    player.unlockedSkins.push(skinId);
    
    player.currentSkin = skinId;
    player.schoolImg = skin.img;
    
    saveGame();
    addMessage(`✅ Куплен скин: ${skin.name}! Он автоматически экипирован.`, 'success');
    
    if (typeof refreshCurrentCategory !== 'undefined') {
        refreshCurrentCategory();
    }
    renderGame();
    return true;
}

// Функция для проверки, куплен ли скин
function isSkinUnlocked(skinId) {
    if (!player.unlockedSkins) player.unlockedSkins = [];
    return player.unlockedSkins.includes(skinId);
}

// Функция для инициализации скинов при загрузке игры
function initSkins() {
    if (!player) return;
    
    if (!player.unlockedSkins) player.unlockedSkins = [];
    
    const skins = getSkinsForCurrentSchool();
    for (let skin of skins) {
        if (skin.price === 0 && !player.unlockedSkins.includes(skin.id)) {
            player.unlockedSkins.push(skin.id);
        }
    }
    
    if (!player.currentSkin) {
        const defaultSkin = skins.find(s => s.price === 0);
        if (defaultSkin) {
            player.currentSkin = defaultSkin.id;
            player.schoolImg = defaultSkin.img;
        }
    }
    
    saveGame();
}

// Экспорт функций
window.getSkinsForCurrentSchool = getSkinsForCurrentSchool;
window.getCurrentSkin = getCurrentSkin;
window.equipSkin = equipSkin;
window.buySkin = buySkin;
window.isSkinUnlocked = isSkinUnlocked;
window.initSkins = initSkins;