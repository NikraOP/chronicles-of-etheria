// schoolProgression.js — уроки школ (E) и константы прогрессии A+E

const PROGRESSION_BALANCE = {
    pointsEveryLevels: 5,
    maxAbilityPoints: 10,
    maxLessonPoints: 6,
    maxRanksPerAbility: 3,
    abilityRankDmg: [5, 4, 3],
    abilityRankHeal: [8, 6, 5],
    abilityRankManaReduce: [8, 6, 5],
    abilityRankLifesteal: [5, 4, 3],
    abilityRankDot: [10, 8, 6],
    abilityRankPermAtk: [2, 2, 1],
    minManaAfterUpgrade: 0.5,
    minCdAfterUpgrade: 2,
    respecGoldBase: 500,
    respecGoldPerLevel: 100,
    freeRespecMaxLevel: 20,
    applyInPvp: false,
    applyInDungeon: true
};

const SCHOOL_LESSONS_DB = {
    'Воин': { 'Школа Ярости': [
        { id: 'wrath_ember_spark', name: 'Искра ярости', desc: '+3% постоянной атаки', icon: '🔥', effect: { type: 'permAtk', value: 3 } },
        { id: 'wrath_scorch_vein', name: 'Жгучие вены', desc: '+4% силы DoT', icon: '🩸', effect: { type: 'dotPotency', value: 4 } },
        { id: 'wrath_fury_blow', name: 'Удар ярости', desc: '+5% урона способностей', icon: '💥', effect: { type: 'abilityDmgPct', value: 5 } },
        { id: 'wrath_rage_pulse', name: 'Пульс гнева', desc: '+4% постоянной атаки', icon: '😤', effect: { type: 'permAtk', value: 4 } },
        { id: 'wrath_burn_mark', name: 'Печать ожога', desc: '+3% силы DoT', icon: '♨️', effect: { type: 'dotPotency', value: 3 } },
        { id: 'wrath_crimson_edge', name: 'Алая кромка', desc: '+2% шанса крита', icon: '⚔️', effect: { type: 'permCrit', value: 2 } },
        { id: 'wrath_inferno_will', name: 'Воля пламени', desc: '+4% урона способностей', icon: '🌋', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'wrath_blaze_surge', name: 'Всплеск пламени', desc: '+5% критического урона', icon: '💢', effect: { type: 'permCritDmg', value: 5 } },
        { id: 'wrath_berserk_flow', name: 'Поток берсерка', desc: '−3% стоимости маны', icon: '⚡', effect: { type: 'manaCostPct', value: -3 } },
        { id: 'wrath_titan_fury', name: 'Гнев титана', desc: '+5% постоянной атаки', icon: '👊', effect: { type: 'permAtk', value: 5 } }
    ], 'Школа Защиты': [
        { id: 'guard_iron_skin', name: 'Железная кожа', desc: '+4% максимального HP', icon: '🛡️', effect: { type: 'maxHealthPct', value: 4 } },
        { id: 'guard_steadfast', name: 'Стойкость', desc: '+3% уклонения', icon: '🏰', effect: { type: 'dodgeFlat', value: 3 } },
        { id: 'guard_shield_heart', name: 'Сердце щита', desc: '+4% силы лечения', icon: '💚', effect: { type: 'healPotency', value: 4 } },
        { id: 'guard_mirror_reflex', name: 'Зеркальный рефлекс', desc: '+3% шанса контратаки', icon: '↩️', effect: { type: 'counterChance', value: 3 } },
        { id: 'guard_fortress_blood', name: 'Кровь крепости', desc: '+5% максимального HP', icon: '🏯', effect: { type: 'maxHealthPct', value: 5 } },
        { id: 'guard_parry_instinct', name: 'Инстинкт парирования', desc: '+4% шанса контратаки', icon: '⚔️', effect: { type: 'counterChance', value: 4 } },
        { id: 'guard_wound_mend', name: 'Заживление ран', desc: '+3% силы лечения', icon: '✨', effect: { type: 'healPotency', value: 3 } },
        { id: 'guard_steel_step', name: 'Стальной шаг', desc: '+4% уклонения', icon: '💨', effect: { type: 'dodgeFlat', value: 4 } },
        { id: 'guard_bastion_core', name: 'Ядро бастиона', desc: '+3% максимального HP', icon: '🧱', effect: { type: 'maxHealthPct', value: 3 } },
        { id: 'guard_vengeful_guard', name: 'Мстительная стража', desc: '+5% шанса контратаки', icon: '🔮', effect: { type: 'counterChance', value: 5 } }
    ], 'Школа Оружия': [
        { id: 'arms_blade_focus', name: 'Фокус клинка', desc: '+4% шанса крита', icon: '🗡️', effect: { type: 'permCrit', value: 4 } },
        { id: 'arms_deep_cut', name: 'Глубокий порез', desc: '+5% силы DoT', icon: '🩸', effect: { type: 'dotPotency', value: 5 } },
        { id: 'arms_precision', name: 'Точность', desc: '+3% критического урона', icon: '🎯', effect: { type: 'permCritDmg', value: 3 } },
        { id: 'arms_weapon_mastery', name: 'Мастерство оружия', desc: '+3% постоянной атаки', icon: '⚔️', effect: { type: 'permAtk', value: 3 } },
        { id: 'arms_bleed_art', name: 'Искусство крови', desc: '+4% силы DoT', icon: '💉', effect: { type: 'dotPotency', value: 4 } },
        { id: 'arms_critical_eye', name: 'Критический взгляд', desc: '+5% шанса крита', icon: '👁️', effect: { type: 'permCrit', value: 5 } },
        { id: 'arms_strike_power', name: 'Сила удара', desc: '+3% урона способностей', icon: '💥', effect: { type: 'abilityDmgPct', value: 3 } },
        { id: 'arms_lethal_edge', name: 'Смертельная кромка', desc: '+5% критического урона', icon: '⚡', effect: { type: 'permCritDmg', value: 5 } },
        { id: 'arms_whirl_slash', name: 'Вихрь рассечений', desc: '+4% урона способностей', icon: '🌀', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'arms_honed_steel', name: 'Закалённая сталь', desc: '+4% постоянной атаки', icon: '🔪', effect: { type: 'permAtk', value: 4 } }
    ] },
    'Маг': { 'Школа Огня': [
        { id: 'fire_ember_spark', name: 'Искра пламени', desc: '+3% постоянной атаки', icon: '🔥', effect: { type: 'permAtk', value: 3 } },
        { id: 'fire_scorch_vein', name: 'Жгучие вены', desc: '+4% силы горения', icon: '♨️', effect: { type: 'burnPotency', value: 4 } },
        { id: 'fire_inferno_blow', name: 'Удар инферно', desc: '+5% урона способностей', icon: '💥', effect: { type: 'abilityDmgPct', value: 5 } },
        { id: 'fire_blaze_pulse', name: 'Пульс пламени', desc: '+4% постоянной атаки', icon: '🌋', effect: { type: 'permAtk', value: 4 } },
        { id: 'fire_burn_mark', name: 'Печать ожога', desc: '+3% силы DoT', icon: '🩸', effect: { type: 'dotPotency', value: 3 } },
        { id: 'fire_crimson_flame', name: 'Багряное пламя', desc: '+2% шанса крита', icon: '⚡', effect: { type: 'permCrit', value: 2 } },
        { id: 'fire_volcano_will', name: 'Воля вулкана', desc: '+4% урона способностей', icon: '☄️', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'fire_pyre_heat', name: 'Жар костра', desc: '+5% силы горения', icon: '🔴', effect: { type: 'burnPotency', value: 5 } },
        { id: 'fire_mana_flare', name: 'Вспышка маны', desc: '−3% стоимости маны', icon: '✨', effect: { type: 'manaCostPct', value: -3 } },
        { id: 'fire_titan_pyre', name: 'Костёр титана', desc: '+5% постоянной атаки', icon: '👊', effect: { type: 'permAtk', value: 5 } }
    ], 'Школа Льда': [
        { id: 'ice_frost_spark', name: 'Искра мороза', desc: '+3% постоянной атаки', icon: '❄️', effect: { type: 'permAtk', value: 3 } },
        { id: 'ice_crystal_vein', name: 'Кристальные вены', desc: '+4% силы заморозки', icon: '🧊', effect: { type: 'freezePotency', value: 4 } },
        { id: 'ice_glacial_blow', name: 'Ледниковый удар', desc: '+5% урона способностей', icon: '💠', effect: { type: 'abilityDmgPct', value: 5 } },
        { id: 'ice_cold_pulse', name: 'Пульс холода', desc: '+4% максимальной маны', icon: '💎', effect: { type: 'maxManaPct', value: 4 } },
        { id: 'ice_rime_mark', name: 'Метка инея', desc: '+3% силы заморозки', icon: '🌨️', effect: { type: 'freezePotency', value: 3 } },
        { id: 'ice_snow_crit', name: 'Снежный крит', desc: '+2% шанса крита', icon: '🎯', effect: { type: 'permCrit', value: 2 } },
        { id: 'ice_blizzard_will', name: 'Воля метели', desc: '+4% урона способностей', icon: '🏔️', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'ice_mana_shard', name: 'Осколок маны', desc: '+5% максимальной маны', icon: '💙', effect: { type: 'maxManaPct', value: 5 } },
        { id: 'ice_cost_chill', name: 'Холодная экономия', desc: '−3% стоимости маны', icon: '❄️', effect: { type: 'manaCostPct', value: -3 } },
        { id: 'ice_eternal_frost', name: 'Вечный мороз', desc: '+5% силы заморозки', icon: '🥶', effect: { type: 'freezePotency', value: 5 } }
    ], 'Школа Утилити': [
        { id: 'util_arcane_spark', name: 'Искра арканы', desc: '+3% постоянной атаки', icon: '🔮', effect: { type: 'permAtk', value: 3 } },
        { id: 'util_mana_well', name: 'Колодец маны', desc: '+5% максимальной маны', icon: '💎', effect: { type: 'maxManaPct', value: 5 } },
        { id: 'util_spell_flow', name: 'Поток заклинаний', desc: '+4% урона способностей', icon: '✨', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'util_ward_step', name: 'Шаг защиты', desc: '+4% уклонения', icon: '👻', effect: { type: 'dodgeFlat', value: 4 } },
        { id: 'util_heal_mend', name: 'Целительный поток', desc: '+4% силы лечения', icon: '💚', effect: { type: 'healPotency', value: 4 } },
        { id: 'util_crit_eye', name: 'Всевидящий взгляд', desc: '+3% шанса крита', icon: '👁️', effect: { type: 'permCrit', value: 3 } },
        { id: 'util_echo_power', name: 'Сила эха', desc: '+3% урона способностей', icon: '🔁', effect: { type: 'abilityDmgPct', value: 3 } },
        { id: 'util_life_weave', name: 'Плетение жизни', desc: '+5% силы лечения', icon: '🌟', effect: { type: 'healPotency', value: 5 } },
        { id: 'util_cost_eff', name: 'Эффективная магия', desc: '−4% стоимости маны', icon: '⚡', effect: { type: 'manaCostPct', value: -4 } },
        { id: 'util_void_guard', name: 'Страж пустоты', desc: '+5% уклонения', icon: '🛡️', effect: { type: 'dodgeFlat', value: 5 } }
    ] },
    'Лучник': { 'Школа Снайпера': [
        { id: 'snp_steady_aim', name: 'Твёрдая рука', desc: '+3% постоянной атаки', icon: '🎯', effect: { type: 'permAtk', value: 3 } },
        { id: 'snp_eagle_eye', name: 'Орлиный глаз', desc: '+4% шанса крита', icon: '🦅', effect: { type: 'permCrit', value: 4 } },
        { id: 'snp_vital_point', name: 'Уязвимая точка', desc: '+5% урона по слабым местам', icon: '❤️', effect: { type: 'weakspotBonus', value: 5 } },
        { id: 'snp_long_range', name: 'Дальний прицел', desc: '+4% урона способностей', icon: '🏹', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'snp_deadshot', name: 'Смертельный выстрел', desc: '+3% критического урона', icon: '💀', effect: { type: 'permCritDmg', value: 3 } },
        { id: 'snp_focus_ring', name: 'Кольцо фокуса', desc: '+4% постоянной атаки', icon: '🔭', effect: { type: 'permAtk', value: 4 } },
        { id: 'snp_piercing_gaze', name: 'Пронзающий взгляд', desc: '+4% урона по слабым местам', icon: '👁️', effect: { type: 'weakspotBonus', value: 4 } },
        { id: 'snp_headhunter', name: 'Охота на головы', desc: '+5% урона способностей', icon: '☠️', effect: { type: 'abilityDmgPct', value: 5 } },
        { id: 'snp_perfect_scope', name: 'Идеальный прицел', desc: '+5% шанса крита', icon: '🎯', effect: { type: 'permCrit', value: 5 } },
        { id: 'snp_fate_arrow', name: 'Стрела судьбы', desc: '+5% критического урона', icon: '🌟', effect: { type: 'permCritDmg', value: 5 } }
    ], 'Школа Охотника': [
        { id: 'hunt_poison_tip', name: 'Ядовитый наконечник', desc: '+4% силы DoT', icon: '☠️', effect: { type: 'dotPotency', value: 4 } },
        { id: 'hunt_trap_mastery', name: 'Мастер капканов', desc: '+3% урона способностей', icon: '🪤', effect: { type: 'abilityDmgPct', value: 3 } },
        { id: 'hunt_tracker_sense', name: 'Чутьё следопыта', desc: '+3% постоянной атаки', icon: '🐾', effect: { type: 'permAtk', value: 3 } },
        { id: 'hunt_venom_brew', name: 'Варево яда', desc: '+5% силы DoT', icon: '🧪', effect: { type: 'dotPotency', value: 5 } },
        { id: 'hunt_mark_prey', name: 'Метка добычи', desc: '+4% урона по слабым местам', icon: '🎯', effect: { type: 'weakspotBonus', value: 4 } },
        { id: 'hunt_wild_instinct', name: 'Дикий инстинкт', desc: '+3% шанса крита', icon: '🦅', effect: { type: 'permCrit', value: 3 } },
        { id: 'hunt_nature_sting', name: 'Укус природы', desc: '+3% силы DoT', icon: '🌿', effect: { type: 'dotPotency', value: 3 } },
        { id: 'hunt_pack_tactics', name: 'Тактика стаи', desc: '+4% урона способностей', icon: '🦅', effect: { type: 'abilityDmgPct', value: 4 } },
        { id: 'hunt_predator_edge', name: 'Клинок хищника', desc: '+5% постоянной атаки', icon: '⚔️', effect: { type: 'permAtk', value: 5 } },
        { id: 'hunt_beast_bane', name: 'Губитель зверей', desc: '+4% силы DoT', icon: '🐺', effect: { type: 'dotPotency', value: 4 } }
    ], 'Школа Выживания': [
        { id: 'surv_light_step', name: 'Лёгкий шаг', desc: '+4% уклонения', icon: '💨', effect: { type: 'dodgeFlat', value: 4 } },
        { id: 'surv_thick_hide', name: 'Крепкая шкура', desc: '+4% максимального HP', icon: '🛡️', effect: { type: 'maxHealthPct', value: 4 } },
        { id: 'surv_field_bandage', name: 'Полевая перевязка', desc: '+3% силы лечения', icon: '💚', effect: { type: 'healPotency', value: 3 } },
        { id: 'surv_reflex_shot', name: 'Рефлексивный выстрел', desc: '+3% шанса контратаки', icon: '↩️', effect: { type: 'counterChance', value: 3 } },
        { id: 'surv_wind_dance', name: 'Танец ветра', desc: '+5% уклонения', icon: '💃', effect: { type: 'dodgeFlat', value: 5 } },
        { id: 'surv_endurance', name: 'Выносливость', desc: '+5% максимального HP', icon: '💪', effect: { type: 'maxHealthPct', value: 5 } },
        { id: 'surv_second_wind', name: 'Второе дыхание', desc: '+4% силы лечения', icon: '✨', effect: { type: 'healPotency', value: 4 } },
        { id: 'surv_riposte', name: 'Ответный удар', desc: '+4% шанса контратаки', icon: '⚡', effect: { type: 'counterChance', value: 4 } },
        { id: 'surv_shadow_feet', name: 'Теневые ступни', desc: '+3% уклонения', icon: '🌑', effect: { type: 'dodgeFlat', value: 3 } },
        { id: 'surv_last_stand', name: 'Последний рубеж', desc: '+5% шанса контратаки', icon: '🌟', effect: { type: 'counterChance', value: 5 } }
    ] }
};

function getSchoolLessonsForPlayer(p) {
    if (!p || !SCHOOL_LESSONS_DB[p.class]) return [];
    const branch = p.branch;
    return (SCHOOL_LESSONS_DB[p.class][branch] || []).slice();
}

if (typeof window !== 'undefined') {
    window.PROGRESSION_BALANCE = PROGRESSION_BALANCE;
    window.SCHOOL_LESSONS_DB = SCHOOL_LESSONS_DB;
    window.getSchoolLessonsForPlayer = getSchoolLessonsForPlayer;
}
