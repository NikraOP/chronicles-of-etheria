// abilityProgression.js — прокачка способностей (A) + уроки школы (E)

var CC_EFFECT_TYPES = ['Оглушение', 'Ослепление', 'Заморозка', 'slow'];

function ensurePlayerProgression(p) {
    if (!p) return;
    if (!p.abilityUpgrades || typeof p.abilityUpgrades !== 'object') p.abilityUpgrades = {};
    if (!p.abilityUpgradeFocus || typeof p.abilityUpgradeFocus !== 'object') p.abilityUpgradeFocus = {};
    if (!Array.isArray(p.schoolLessons)) p.schoolLessons = [];
}

function abilityHasDmgTrack(a) {
    return !!(a && (a.dmg || a.combo || a.multiHit || a.doubleHit || a.tripleHit || a.quadHit));
}

function getAbilityTemplateForPlayer(p, abilityName) {
    const school = ABILITIES_DB[p.class] && ABILITIES_DB[p.class][p.branch];
    if (!school || !school.abilities) return null;
    return school.abilities.find(function (ab) { return ab.name === abilityName; }) || null;
}

function getEffectTrackLabel(effectType) {
    if (effectType === 'Горение') return 'Сила горения';
    if (effectType === 'Заморозка' || effectType === 'slow') return 'Сила контроля';
    if (effectType === 'Яд' || effectType === 'Смертельный яд' || effectType === 'Кровотечение') return 'Сила DoT';
    if (effectType === 'Оглушение' || effectType === 'Ослепление') return 'Сила эффекта';
    return 'Сила эффекта';
}

/** Доступные ветки прокачки для способности (2+ — выбор игрока) */
function getAbilityUpgradeTracks(ability) {
    if (!ability) return [];
    const tracks = [];
    const seen = {};

    function add(id, label, kind) {
        if (seen[id]) return;
        seen[id] = true;
        tracks.push({ id: id, label: label, kind: kind });
    }

    if (abilityHasDmgTrack(ability)) add('dmg', 'Урон', 'dmg');
    if (ability.effect && ability.effect.val != null) {
        add('effect', getEffectTrackLabel(ability.effect.type), 'effect');
    }
    if (ability.effect && ability.effect.dur >= 1 && CC_EFFECT_TYPES.indexOf(ability.effect.type) >= 0) {
        add('effectDur', 'Длительность', 'effectDur');
    }
    if (ability.splash != null) add('splash', 'Урон по соседям', 'scalar');
    if (ability.fireVuln != null) add('fireVuln', 'Уязвимость к огню', 'scalar');
    if (ability.consumeBurn != null) add('consumeBurn', 'Бонус по горению', 'scalar');
    if (ability.burnMana != null) add('burnMana', 'Сжигание маны', 'scalar');
    if (ability.manaToShield != null) add('manaToShield', 'Щит от маны', 'heal');
    if (ability.buff && ability.buff.atk != null) add('buffAtk', 'Сила баффа', 'scalar');
    if (ability.dotOverTime && ability.dotOverTime.dmgPerTurn != null) {
        add('dotOverTime', 'Урон за ход', 'dmg');
    }
    if (ability.echo != null) add('echo', 'Сила эха', 'scalar');
    if (ability.passive && ability.permAtk != null) add('permAtk', 'Пост. атака', 'permAtk');
    if (ability.passive && ability.weakspot != null) add('weakspot', 'Слабые места', 'scalar');
    if (ability.passive && ability.permCrit != null) add('permCrit', 'Шанс крита', 'scalar');
    if (ability.heal || ability.maxHpShield || ability.shieldFromDamage || ability.shield) {
        add('heal', 'Лечение / щит', 'heal');
    }
    if (ability.mana != null && ability.mana > 0) add('mana', 'Стоимость маны', 'mana');
    if (ability.lifesteal != null) add('lifesteal', 'Вампиризм', 'lifesteal');
    if (ability.cd >= 4) add('cd', 'Перезарядка', 'cd');

    if (!tracks.length) add('dmg', 'Урон', 'dmg');
    return tracks;
}

function getAbilityUpgradeFocus(p, abilityName) {
    ensurePlayerProgression(p);
    const stored = p.abilityUpgradeFocus[abilityName];
    if (stored) return stored;
    const rank = getAbilityUpgradeRank(p, abilityName);
    if (rank <= 0) return null;
    const tpl = getAbilityTemplateForPlayer(p, abilityName);
    const tracks = getAbilityUpgradeTracks(tpl || {});
    if (tracks.length) {
        const legacy = abilityHasDmgTrack(tpl) ? 'dmg' : tracks[0].id;
        p.abilityUpgradeFocus[abilityName] = legacy;
        return legacy;
    }
    return null;
}

function setAbilityUpgradeFocus(p, abilityName, trackId) {
    if (!p || !abilityName || !trackId) return false;
    if (getAbilityUpgradeRank(p, abilityName) > 0) return false;
    const tpl = getAbilityTemplateForPlayer(p, abilityName);
    if (!tpl) return false;
    const tracks = getAbilityUpgradeTracks(tpl);
    if (!tracks.some(function (t) { return t.id === trackId; })) return false;
    ensurePlayerProgression(p);
    p.abilityUpgradeFocus[abilityName] = trackId;
    if (typeof saveGame === 'function') saveGame();
    return true;
}

function getProgressionPointsEarned(level) {
    const step = PROGRESSION_BALANCE.pointsEveryLevels || 5;
    const lv = Math.max(1, level || 1);
    return Math.min(
        PROGRESSION_BALANCE.maxAbilityPoints || 10,
        Math.floor(lv / step)
    );
}

function getLessonPointsEarned(level) {
    const step = PROGRESSION_BALANCE.pointsEveryLevels || 5;
    const lv = Math.max(1, level || 1);
    return Math.min(
        PROGRESSION_BALANCE.maxLessonPoints || 6,
        Math.floor(lv / step)
    );
}

function countAbilityUpgradeSpent(p) {
    ensurePlayerProgression(p);
    let n = 0;
    const keys = Object.keys(p.abilityUpgrades);
    for (let i = 0; i < keys.length; i++) {
        n += Math.max(0, Math.min(PROGRESSION_BALANCE.maxRanksPerAbility || 3, p.abilityUpgrades[keys[i]] || 0));
    }
    return n;
}

function getAbilityUpgradePointsAvailable(p) {
    return getProgressionPointsEarned(p.level) - countAbilityUpgradeSpent(p);
}

function getLessonPointsAvailable(p) {
    ensurePlayerProgression(p);
    return getLessonPointsEarned(p.level) - (p.schoolLessons.length || 0);
}

function getAbilityUpgradeRank(p, abilityName) {
    ensurePlayerProgression(p);
    return Math.max(0, Math.min(PROGRESSION_BALANCE.maxRanksPerAbility || 3, p.abilityUpgrades[abilityName] || 0));
}

function hasSchoolLesson(p, lessonId) {
    ensurePlayerProgression(p);
    return p.schoolLessons.indexOf(lessonId) >= 0;
}

function getRespecGoldCost(p) {
    if (!p) return 0;
    if (p.level <= (PROGRESSION_BALANCE.freeRespecMaxLevel || 20)) return 0;
    return (PROGRESSION_BALANCE.respecGoldBase || 500) +
        p.level * (PROGRESSION_BALANCE.respecGoldPerLevel || 100);
}

function sumRankBonuses(bonuses, rank) {
    let total = 0;
    for (let r = 0; r < rank && r < bonuses.length; r++) total += bonuses[r];
    return total;
}

function getAbilityUpgradePreview(ability, nextRank, trackId) {
    if (!ability || nextRank < 1) return '';
    const B = PROGRESSION_BALANCE;
    const tracks = getAbilityUpgradeTracks(ability);
    const tid = trackId || (tracks.length === 1 ? tracks[0].id : null);
    if (!tid) return 'выберите ветку';
    const pct = function (arr) {
        return '+' + (arr[nextRank - 1] || arr[arr.length - 1] || 5) + '%';
    };
    const scalar = B.abilityRankScalar || B.abilityRankDmg;

    switch (tid) {
        case 'dmg':
            return pct(B.abilityRankDmg) + ' урона';
        case 'effect':
            return pct(B.abilityRankDot) + ' силы эффекта';
        case 'effectDur':
            return nextRank >= 3 ? '+1 ход длительности' : 'к 3-му рангу: +1 ход';
        case 'splash':
            return pct(scalar) + ' урона по соседям';
        case 'fireVuln':
            return pct(scalar) + ' уязвимости к огню';
        case 'consumeBurn':
            return pct(scalar) + ' бонуса по горению';
        case 'burnMana':
            return pct(scalar) + ' сжигания маны';
        case 'manaToShield':
            return pct(B.abilityRankHeal) + ' щита от маны';
        case 'buffAtk':
            return pct(scalar) + ' силы баффа';
        case 'dotOverTime':
            return pct(B.abilityRankDmg) + ' урона за ход';
        case 'echo':
            return pct(scalar) + ' силы эха';
        case 'permAtk':
            return '+' + (B.abilityRankPermAtk[nextRank - 1] || 2) + '% пост. атаки';
        case 'weakspot':
            return pct(scalar) + ' к слабым местам';
        case 'permCrit':
            return pct(scalar) + ' шанса крита';
        case 'heal':
            return pct(B.abilityRankHeal) + ' лечения/щита';
        case 'mana':
            return '−' + (B.abilityRankManaReduce[nextRank - 1] || 8) + '% маны';
        case 'lifesteal':
            return pct(B.abilityRankLifesteal) + ' вампиризма';
        case 'cd':
            if (nextRank >= 3) {
                return '−1 ход КД (мин. ' + (B.minCdAfterUpgrade || 2) + ')';
            }
            if (ability.mana > 0) {
                return '−' + (B.abilityRankManaReduce[nextRank - 1] || 3) + '% маны (ранг ' + nextRank + ')';
            }
            return 'к 3-му рангу: −1 КД';
        default:
            return pct(B.abilityRankDmg) + ' урона';
    }
}

function canUpgradeAbility(p, abilityName, trackId) {
    if (!p || !abilityName) return false;
    if (getAbilityUpgradePointsAvailable(p) <= 0) return false;
    const rank = getAbilityUpgradeRank(p, abilityName);
    if (rank >= (PROGRESSION_BALANCE.maxRanksPerAbility || 3)) return false;
    const tpl = getAbilityTemplateForPlayer(p, abilityName);
    if (!tpl || p.level < tpl.lvl) return false;
    const tracks = getAbilityUpgradeTracks(tpl);
    if (tracks.length > 1) {
        const focus = trackId || getAbilityUpgradeFocus(p, abilityName);
        if (!focus) return false;
        if (!tracks.some(function (t) { return t.id === focus; })) return false;
    }
    return true;
}

function upgradeAbility(p, abilityName, trackId) {
    const tpl = getAbilityTemplateForPlayer(p, abilityName);
    if (!tpl) return false;
    const tracks = getAbilityUpgradeTracks(tpl);
    let focus = trackId || getAbilityUpgradeFocus(p, abilityName);
    if (tracks.length === 1) focus = tracks[0].id;
    if (!focus) return false;
    if (!canUpgradeAbility(p, abilityName, focus)) return false;
    ensurePlayerProgression(p);
    if (getAbilityUpgradeRank(p, abilityName) === 0) {
        p.abilityUpgradeFocus[abilityName] = focus;
    } else if (p.abilityUpgradeFocus[abilityName] !== focus) {
        return false;
    }
    p.abilityUpgrades[abilityName] = getAbilityUpgradeRank(p, abilityName) + 1;
    if (typeof updateAllAbilities === 'function') updateAllAbilities();
    if (typeof resetBaseStats === 'function') resetBaseStats();
    if (typeof saveGame === 'function') saveGame();
    return true;
}

function canLearnSchoolLesson(p, lessonId) {
    if (!p || !lessonId) return false;
    if (getLessonPointsAvailable(p) <= 0) return false;
    if (hasSchoolLesson(p, lessonId)) return false;
    const lessons = typeof getSchoolLessonsForPlayer === 'function' ? getSchoolLessonsForPlayer(p) : [];
    return lessons.some(function (l) { return l.id === lessonId; });
}

function learnSchoolLesson(p, lessonId) {
    if (!canLearnSchoolLesson(p, lessonId)) return false;
    ensurePlayerProgression(p);
    p.schoolLessons.push(lessonId);
    if (typeof applyPassiveAbilityBonuses === 'function') applyPassiveAbilityBonuses();
    if (typeof resetBaseStats === 'function') resetBaseStats();
    if (typeof saveGame === 'function') saveGame();
    return true;
}

function resetPlayerProgression(p) {
    ensurePlayerProgression(p);
    p.abilityUpgrades = {};
    p.abilityUpgradeFocus = {};
    p.schoolLessons = [];
    if (typeof updateAllAbilities === 'function') updateAllAbilities();
    if (typeof resetBaseStats === 'function') resetBaseStats();
}

function applyRankPctField(ability, field, bonuses, rank) {
    if (ability[field] == null) return;
    if (ability['_' + field + 'Base'] == null) ability['_' + field + 'Base'] = ability[field];
    const total = sumRankBonuses(bonuses, rank);
    ability[field] = Math.floor(ability['_' + field + 'Base'] * (1 + total / 100));
}

function applyAbilityRankUpgrades(ability, rank, trackId) {
    if (!ability || rank <= 0 || !trackId) return;
    const B = PROGRESSION_BALANCE;
    const scalar = B.abilityRankScalar || B.abilityRankDmg;
    ability._upgradeRank = rank;
    ability._upgradeFocus = trackId;
    ability._baseDesc = ability._baseDesc || ability.desc;

    function applyDmgTrack() {
        if (ability.dmg) applyRankPctField(ability, 'dmg', B.abilityRankDmg, rank);
        if (ability.combo && !ability._comboBase) ability._comboBase = ability.combo.slice();
        if (ability.combo && ability._comboBase) {
            const t = sumRankBonuses(B.abilityRankDmg, rank);
            ability.combo = ability._comboBase.map(function (v) {
                return Math.floor(v * (1 + t / 100));
            });
        }
        if (ability.multiHit && !ability._multiHitBase) ability._multiHitBase = Object.assign({}, ability.multiHit);
        if (ability.multiHit && ability._multiHitBase) {
            const t = sumRankBonuses(B.abilityRankDmg, rank);
            ability.multiHit = Object.assign({}, ability._multiHitBase, {
                baseDmg: Math.floor(ability._multiHitBase.baseDmg * (1 + t / 100))
            });
        }
    }

    switch (trackId) {
        case 'dmg':
            applyDmgTrack();
            break;
        case 'effect':
            if (ability.effect && ability.effect.val != null) {
                if (!ability._effectBase) ability._effectBase = Object.assign({}, ability.effect);
                const t = sumRankBonuses(B.abilityRankDot, rank);
                ability.effect = Object.assign({}, ability._effectBase, {
                    val: Math.floor(ability._effectBase.val * (1 + t / 100))
                });
            }
            break;
        case 'effectDur':
            if (ability.effect && rank >= 3) {
                if (!ability._effectBase) ability._effectBase = Object.assign({}, ability.effect);
                ability.effect = Object.assign({}, ability._effectBase, {
                    dur: (ability._effectBase.dur || 1) + 1
                });
            }
            break;
        case 'splash':
            applyRankPctField(ability, 'splash', scalar, rank);
            break;
        case 'fireVuln':
            applyRankPctField(ability, 'fireVuln', scalar, rank);
            break;
        case 'consumeBurn':
            applyRankPctField(ability, 'consumeBurn', scalar, rank);
            break;
        case 'burnMana':
            applyRankPctField(ability, 'burnMana', scalar, rank);
            break;
        case 'manaToShield':
            applyRankPctField(ability, 'manaToShield', B.abilityRankHeal, rank);
            break;
        case 'buffAtk':
            if (ability.buff) {
                if (!ability._buffBase) ability._buffBase = Object.assign({}, ability.buff);
                const t = sumRankBonuses(scalar, rank);
                ability.buff = Object.assign({}, ability._buffBase, {
                    atk: Math.floor((ability._buffBase.atk || 0) * (1 + t / 100))
                });
            }
            break;
        case 'dotOverTime':
            if (ability.dotOverTime) {
                if (!ability._dotOverTimeBase) ability._dotOverTimeBase = Object.assign({}, ability.dotOverTime);
                const t = sumRankBonuses(B.abilityRankDmg, rank);
                ability.dotOverTime = Object.assign({}, ability._dotOverTimeBase, {
                    dmgPerTurn: Math.floor(ability._dotOverTimeBase.dmgPerTurn * (1 + t / 100))
                });
            }
            break;
        case 'echo':
            applyRankPctField(ability, 'echo', scalar, rank);
            break;
        case 'permAtk':
            if (ability._permAtkBase == null) ability._permAtkBase = ability.permAtk;
            ability.permAtk = ability._permAtkBase + sumRankBonuses(B.abilityRankPermAtk, rank);
            break;
        case 'weakspot':
            applyRankPctField(ability, 'weakspot', scalar, rank);
            break;
        case 'permCrit':
            applyRankPctField(ability, 'permCrit', scalar, rank);
            break;
        case 'heal':
            applyRankPctField(ability, 'heal', B.abilityRankHeal, rank);
            applyRankPctField(ability, 'maxHpShield', B.abilityRankHeal, rank);
            applyRankPctField(ability, 'shieldFromDamage', B.abilityRankHeal, rank);
            applyRankPctField(ability, 'shield', B.abilityRankHeal, rank);
            break;
        case 'mana':
            if (ability._manaBase == null) ability._manaBase = ability.mana;
            const reduce = sumRankBonuses(B.abilityRankManaReduce, rank);
            ability.mana = Math.max(
                Math.ceil(ability._manaBase * (B.minManaAfterUpgrade || 0.5)),
                Math.floor(ability._manaBase * (1 - reduce / 100))
            );
            break;
        case 'lifesteal':
            applyRankPctField(ability, 'lifesteal', B.abilityRankLifesteal, rank);
            break;
        case 'cd':
            if (ability.mana > 0 && rank < 3) {
                if (ability._manaBase == null) ability._manaBase = ability.mana;
                const reduceCd = sumRankBonuses(B.abilityRankManaReduce, rank);
                ability.mana = Math.max(
                    Math.ceil(ability._manaBase * (B.minManaAfterUpgrade || 0.5)),
                    Math.floor(ability._manaBase * (1 - reduceCd / 100))
                );
            }
            if (rank >= 3 && ability.cd >= 4) {
                if (ability._cdBase == null) ability._cdBase = ability.cd;
                ability.cd = Math.max(B.minCdAfterUpgrade || 2, ability._cdBase - 1);
            }
            break;
        default:
            applyDmgTrack();
    }

    const trackLabel = (getAbilityUpgradeTracks(ability).find(function (t) { return t.id === trackId; }) || {}).label || trackId;
    const stars = '★'.repeat(rank);
    ability.desc = ability._baseDesc +
        ' <span class="ability-upgrade-tag" title="' + trackLabel + '">' + stars + '</span>';
}

function aggregateSchoolLessonBonuses(p) {
    const out = {
        permAtk: 0,
        permCrit: 0,
        permCritDmg: 0,
        maxHealthPct: 0,
        maxManaPct: 0,
        dodgeFlat: 0,
        healPotency: 0,
        dotPotency: 0,
        burnPotency: 0,
        freezePotency: 0,
        abilityDmgPct: 0,
        manaCostPct: 0,
        counterChance: 0,
        weakspotBonus: 0
    };
    ensurePlayerProgression(p);
    const lessons = typeof getSchoolLessonsForPlayer === 'function' ? getSchoolLessonsForPlayer(p) : [];
    for (let i = 0; i < p.schoolLessons.length; i++) {
        const lesson = lessons.find(function (l) { return l.id === p.schoolLessons[i]; });
        if (!lesson || !lesson.effect) continue;
        const t = lesson.effect.type;
        const v = lesson.effect.value || 0;
        if (out[t] != null) out[t] += v;
    }
    return out;
}

function applySchoolLessonBonusesToPlayer(p) {
    if (!p) return;
    p._lessonBonuses = aggregateSchoolLessonBonuses(p);
}

function getLessonEffectMultiplier(p, effectType) {
    if (!p || !p._lessonBonuses) return 1;
    let mult = 1;
    if (p._lessonBonuses.dotPotency) mult += p._lessonBonuses.dotPotency / 100;
    if (effectType === 'Горение' && p._lessonBonuses.burnPotency) {
        mult += p._lessonBonuses.burnPotency / 100;
    }
    if ((effectType === 'Заморозка' || effectType === 'slow') && p._lessonBonuses.freezePotency) {
        mult += p._lessonBonuses.freezePotency / 100;
    }
    return mult;
}

function getHealPotencyMult(p) {
    if (!p || !p._lessonBonuses || !p._lessonBonuses.healPotency) return 1;
    return 1 + p._lessonBonuses.healPotency / 100;
}

function getGlobalAbilityDmgMult(p) {
    if (!p || !p._lessonBonuses || !p._lessonBonuses.abilityDmgPct) return 1;
    return 1 + p._lessonBonuses.abilityDmgPct / 100;
}

function getGlobalManaCostMult(p) {
    if (!p || !p._lessonBonuses || !p._lessonBonuses.manaCostPct) return 1;
    return Math.max(0.5, 1 + p._lessonBonuses.manaCostPct / 100);
}

function buildPlayerAbilitiesFromSchool(p, options) {
    options = options || {};
    const skipUpgrades = options.pvp && PROGRESSION_BALANCE.applyInPvp === false;
    const school = ABILITIES_DB[p.class] && ABILITIES_DB[p.class][p.branch];
    if (!school || !school.abilities) return [];
    ensurePlayerProgression(p);
    return school.abilities.filter(function (a) {
        return p.level >= a.lvl;
    }).map(function (a) {
        const clone = Object.assign({}, a, { currentCooldown: 0 });
        if (clone.combo) clone.combo = clone.combo.slice();
        if (clone.multiHit) clone.multiHit = Object.assign({}, clone.multiHit);
        if (clone.effect) clone.effect = Object.assign({}, clone.effect);
        if (clone.buff) clone.buff = Object.assign({}, clone.buff);
        if (clone.dotOverTime) clone.dotOverTime = Object.assign({}, clone.dotOverTime);
        if (!skipUpgrades) {
            const rank = getAbilityUpgradeRank(p, a.name);
            const focus = getAbilityUpgradeFocus(p, a.name);
            if (rank > 0 && focus) applyAbilityRankUpgrades(clone, rank, focus);
        }
        return clone;
    });
}

function getPlayerAbilitiesForBattle(p, options) {
    return buildPlayerAbilitiesFromSchool(p, options);
}

function getAbilityUpgradeTrackLabel(p, abilityName) {
    const tpl = getAbilityTemplateForPlayer(p, abilityName);
    const focus = getAbilityUpgradeFocus(p, abilityName);
    if (!tpl || !focus) return '';
    const tr = getAbilityUpgradeTracks(tpl).find(function (t) { return t.id === focus; });
    return tr ? tr.label : '';
}

window.ensurePlayerProgression = ensurePlayerProgression;
window.getAbilityUpgradeTracks = getAbilityUpgradeTracks;
window.getAbilityUpgradeFocus = getAbilityUpgradeFocus;
window.setAbilityUpgradeFocus = setAbilityUpgradeFocus;
window.getAbilityUpgradeTrackLabel = getAbilityUpgradeTrackLabel;
window.getProgressionPointsEarned = getProgressionPointsEarned;
window.getAbilityUpgradePointsAvailable = getAbilityUpgradePointsAvailable;
window.getLessonPointsAvailable = getLessonPointsAvailable;
window.getAbilityUpgradeRank = getAbilityUpgradeRank;
window.hasSchoolLesson = hasSchoolLesson;
window.getRespecGoldCost = getRespecGoldCost;
window.getAbilityUpgradePreview = getAbilityUpgradePreview;
window.canUpgradeAbility = canUpgradeAbility;
window.upgradeAbility = upgradeAbility;
window.canLearnSchoolLesson = canLearnSchoolLesson;
window.learnSchoolLesson = learnSchoolLesson;
window.resetPlayerProgression = resetPlayerProgression;
window.applyAbilityRankUpgrades = applyAbilityRankUpgrades;
window.applySchoolLessonBonusesToPlayer = applySchoolLessonBonusesToPlayer;
window.getLessonEffectMultiplier = getLessonEffectMultiplier;
window.getHealPotencyMult = getHealPotencyMult;
window.getGlobalAbilityDmgMult = getGlobalAbilityDmgMult;
window.getGlobalManaCostMult = getGlobalManaCostMult;
window.buildPlayerAbilitiesFromSchool = buildPlayerAbilitiesFromSchool;
window.getPlayerAbilitiesForBattle = getPlayerAbilitiesForBattle;
window.countAbilityUpgradeSpent = countAbilityUpgradeSpent;
window.getLessonPointsEarned = getLessonPointsEarned;
