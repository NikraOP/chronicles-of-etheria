// abilityProgression.js — прокачка способностей (A) + уроки школы (E)

function ensurePlayerProgression(p) {
    if (!p) return;
    if (!p.abilityUpgrades || typeof p.abilityUpgrades !== 'object') p.abilityUpgrades = {};
    if (!Array.isArray(p.schoolLessons)) p.schoolLessons = [];
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

function getAbilityUpgradePreview(ability, nextRank) {
    if (!ability || nextRank < 1) return '';
    const B = PROGRESSION_BALANCE;
    if (ability.dmg || ability.combo || ability.multiHit || ability.doubleHit || ability.tripleHit || ability.quadHit) {
        return '+' + (B.abilityRankDmg[nextRank - 1] || 5) + '% урона';
    }
    if (ability.passive && ability.permAtk) {
        return '+' + (B.abilityRankPermAtk[nextRank - 1] || 2) + '% пост. атаки';
    }
    if (ability.heal || ability.maxHpShield || ability.shieldFromDamage || ability.shield) {
        return '+' + (B.abilityRankHeal[nextRank - 1] || 8) + '% лечения/щита';
    }
    if (ability.mana) {
        return '−' + (B.abilityRankManaReduce[nextRank - 1] || 8) + '% маны';
    }
    if (ability.lifesteal) {
        return '+' + (B.abilityRankLifesteal[nextRank - 1] || 5) + '% вампиризма';
    }
    if (ability.effect && ability.effect.val) {
        return '+' + (B.abilityRankDot[nextRank - 1] || 10) + '% силы эффекта';
    }
    if (ability.cd >= 4 && nextRank === 3) {
        return '−1 ход КД (мин. ' + (B.minCdAfterUpgrade || 2) + ')';
    }
    return '+5% урона';
}

function canUpgradeAbility(p, abilityName) {
    if (!p || !abilityName) return false;
    if (getAbilityUpgradePointsAvailable(p) <= 0) return false;
    const rank = getAbilityUpgradeRank(p, abilityName);
    if (rank >= (PROGRESSION_BALANCE.maxRanksPerAbility || 3)) return false;
    const school = ABILITIES_DB[p.class] && ABILITIES_DB[p.class][p.branch];
    if (!school) return false;
    const tpl = school.abilities.find(function (a) { return a.name === abilityName; });
    if (!tpl || p.level < tpl.lvl) return false;
    return true;
}

function upgradeAbility(p, abilityName) {
    if (!canUpgradeAbility(p, abilityName)) return false;
    ensurePlayerProgression(p);
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
    p.schoolLessons = [];
    if (typeof updateAllAbilities === 'function') updateAllAbilities();
    if (typeof resetBaseStats === 'function') resetBaseStats();
}

function applyAbilityRankUpgrades(ability, rank) {
    if (!ability || rank <= 0) return;
    const B = PROGRESSION_BALANCE;
    ability._upgradeRank = rank;
    ability._baseDesc = ability._baseDesc || ability.desc;

    function addPct(field, bonuses) {
        if (ability[field] == null) return;
        if (ability['_' + field + 'Base'] == null) ability['_' + field + 'Base'] = ability[field];
        let total = 0;
        for (let r = 0; r < rank && r < bonuses.length; r++) total += bonuses[r];
        ability[field] = Math.floor(ability['_' + field + 'Base'] * (1 + total / 100));
    }

    if (ability.dmg || ability.combo || ability.multiHit || ability.doubleHit || ability.tripleHit || ability.quadHit) {
        if (ability.dmg) addPct('dmg', B.abilityRankDmg);
        if (ability.combo && !ability._comboBase) ability._comboBase = ability.combo.slice();
        if (ability.combo && ability._comboBase) {
            ability.combo = ability._comboBase.map(function (v, i) {
                let t = 0;
                for (let r = 0; r < rank && r < B.abilityRankDmg.length; r++) t += B.abilityRankDmg[r];
                return Math.floor(v * (1 + t / 100));
            });
        }
        if (ability.multiHit && !ability._multiHitBase) ability._multiHitBase = Object.assign({}, ability.multiHit);
        if (ability.multiHit && ability._multiHitBase) {
            let t = 0;
            for (let r = 0; r < rank && r < B.abilityRankDmg.length; r++) t += B.abilityRankDmg[r];
            ability.multiHit = Object.assign({}, ability._multiHitBase, {
                baseDmg: Math.floor(ability._multiHitBase.baseDmg * (1 + t / 100))
            });
        }
    } else if (ability.passive && ability.permAtk) {
        if (ability._permAtkBase == null) ability._permAtkBase = ability.permAtk;
        let t = 0;
        for (let r = 0; r < rank && r < B.abilityRankPermAtk.length; r++) t += B.abilityRankPermAtk[r];
        ability.permAtk = ability._permAtkBase + t;
    } else if (ability.heal || ability.maxHpShield || ability.shieldFromDamage || ability.shield) {
        addPct('heal', B.abilityRankHeal);
        addPct('maxHpShield', B.abilityRankHeal);
        addPct('shieldFromDamage', B.abilityRankHeal);
        addPct('shield', B.abilityRankHeal);
    } else if (ability.mana) {
        if (ability._manaBase == null) ability._manaBase = ability.mana;
        let reduce = 0;
        for (let r = 0; r < rank && r < B.abilityRankManaReduce.length; r++) reduce += B.abilityRankManaReduce[r];
        ability.mana = Math.max(
            Math.ceil(ability._manaBase * (B.minManaAfterUpgrade || 0.5)),
            Math.floor(ability._manaBase * (1 - reduce / 100))
        );
    } else if (ability.lifesteal) {
        addPct('lifesteal', B.abilityRankLifesteal);
    } else if (ability.effect && ability.effect.val) {
        if (!ability._effectBase) ability._effectBase = Object.assign({}, ability.effect);
        let t = 0;
        for (let r = 0; r < rank && r < B.abilityRankDot.length; r++) t += B.abilityRankDot[r];
        ability.effect = Object.assign({}, ability._effectBase, {
            val: Math.floor(ability._effectBase.val * (1 + t / 100))
        });
    }

    if (rank >= 3 && ability.cd >= 4 && ability._cdBase == null) {
        ability._cdBase = ability.cd;
    }
    if (ability._cdBase != null && rank >= 3) {
        ability.cd = Math.max(B.minCdAfterUpgrade || 2, ability._cdBase - 1);
    }

    const stars = '★'.repeat(rank);
    ability.desc = ability._baseDesc + ' <span class="ability-upgrade-tag">' + stars + '</span>';
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
    const dotTypes = ['Горение', 'Кровотечение', 'Яд', 'Смертельный яд'];
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
        if (!skipUpgrades) {
            const rank = getAbilityUpgradeRank(p, a.name);
            applyAbilityRankUpgrades(clone, rank);
        }
        return clone;
    });
}

function getPlayerAbilitiesForBattle(p, options) {
    return buildPlayerAbilitiesFromSchool(p, options);
}

window.ensurePlayerProgression = ensurePlayerProgression;
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
