// js/core/battle/monsterAI.js — тактический ИИ монстров: адаптация, комбо, максимум урона (PvE).

const monsterAiState = {
    lastPlayerAction: null,
    lastMonsterAbility: null
};

function resetMonsterAiState() {
    monsterAiState.lastPlayerAction = null;
    monsterAiState.lastMonsterAbility = null;
}

function estimatePlayerAbilityThreat(ability) {
    if (!ability || ability.passive) return 10;
    let threat = 20;
    const dmg = ability.dmg || 0;
    if (ability.doubleHit || ability.tripleHit || ability.quadHit || ability.multiHit) threat += 35;
    if (dmg >= 80) threat += 50;
    else if (dmg >= 50) threat += 35;
    else if (dmg >= 30) threat += 20;
    if (ability.guaranteedCrit || ability.ignoreAll || ability.ignoreDef) threat += 25;
    if (ability.effect && (ability.effect.type === 'Заморозка' || ability.effect.type === 'Оглушение')) threat += 40;
    if (ability.hpLoss >= 15) threat += 45;
    if (ability.freezeExtend) threat += 20;
    if ((ability.cd || 0) >= 4) threat += 15;
    if (ability.heal && ability.heal >= 30) threat += 15;
    return Math.min(100, threat);
}

function recordPlayerActionForMonsterAi(action) {
    if (!action) return;
    const turn = typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0;
    if (action.kind === 'attack') {
        monsterAiState.lastPlayerAction = { kind: 'attack', name: 'Атака', threat: 25, turn };
        return;
    }
    monsterAiState.lastPlayerAction = {
        kind: 'ability',
        name: action.name || 'Способность',
        type: action.type || '',
        threat: estimatePlayerAbilityThreat(action),
        turn
    };
}

function classifyMonsterAbilityRole(ability) {
    if (!ability) return 'other';
    if (ability.type === 'heal' || ability.type === 'shield') return 'defense';
    if (ability.type === 'damage') return 'finisher';
    if (ability.type === 'dot' || ability.type === 'debuff') return 'setup';
    if (ability.type === 'buff') {
        if (ability.effect === 'reflect' || ability.effect === 'def') return 'defense';
        if (ability.effect === 'atk' || ability.effect === 'all' || ability.effect === 'crit') return 'setup';
        return 'setup';
    }
    if (ability.type === 'lifesteal') return 'finisher';
    return 'other';
}

function recordMonsterAbilityForMonsterAi(ability) {
    if (!ability) return;
    const turn = typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0;
    monsterAiState.lastMonsterAbility = {
        name: ability.name,
        type: ability.type,
        effect: ability.effect,
        role: classifyMonsterAbilityRole(ability),
        turn
    };
}

function getMonsterAttackPower() {
    if (typeof getMonsterCurrentAttack === 'function') return getMonsterCurrentAttack();
    if (typeof currentMonster !== 'undefined' && currentMonster) return currentMonster.attack || 1;
    return 1;
}

function estimateMonsterAbilityValue(ability, ctx) {
    if (!ability) return 0;
    const atk = getMonsterAttackPower();
    const playerMaxHp = ctx.playerMaxHealth || 100;

    switch (ability.type) {
        case 'damage': {
            const mult = ability.multiplier || 1;
            const hits = ability.hits || 1;
            let dmg = Math.floor(atk * mult * hits);
            if (ctx.monsterAtkBuffActive) dmg = Math.floor(dmg * (1 + (ctx.monsterAtkBuffValue || 25) / 100));
            if (ctx.monsterCritBuffActive) dmg = Math.floor(dmg * 1.25);
            if (ctx.playerDebuffedDef) dmg = Math.floor(dmg * 1.12);
            return dmg;
        }
        case 'dot': {
            const v = ability.value || 5;
            const d = ability.duration || 2;
            return Math.floor(playerMaxHp * v / 100 * Math.min(d, 4) * 0.75);
        }
        case 'debuff': {
            if (ability.effect === 'def' || ability.effect === 'all') return Math.floor(atk * 0.9);
            if (ability.effect === 'freeze') return Math.floor(atk * 0.5);
            return Math.floor(atk * 0.4);
        }
        case 'heal': {
            const mMax = ctx.monsterMaxHealth || 100;
            return Math.floor(mMax * (ability.value || 15) / 100);
        }
        case 'shield': {
            return Math.floor((ctx.monsterMaxHealth || 100) * (ability.value || 20) / 100);
        }
        case 'lifesteal': {
            return Math.floor(atk * 1.1 * (ability.value || 30) / 100);
        }
        case 'buff': {
            if (ability.effect === 'atk' || ability.effect === 'all') return Math.floor(atk * 0.85);
            return 20;
        }
        default:
            return 10;
    }
}

function pickMonsterCombatTarget() {
    if (!window.dungeonDuoBattleActive || typeof getDungeonDuoAlly !== 'function') return 'player';
    const ally = getDungeonDuoAlly();
    if (!ally || ally.health <= 0) return 'player';
    if (!player || player.health <= 0) return 'ally';
    const pRatio = player.health / Math.max(1, player.maxHealth);
    const aRatio = ally.health / Math.max(1, ally.maxHealth || 1);
    let allyWeight = 0.34;
    if (aRatio < pRatio * 0.72) allyWeight = 0.58;
    if (aRatio < 0.32) allyWeight = 0.74;
    const last = monsterAiState.lastPlayerAction;
    if (last && last.kind === 'ability' && last.threat >= 42) allyWeight += 0.1;
    if (last && last.kind === 'ability' && (last.type === 'heal' || last.type === 'shield')) allyWeight += 0.14;
    return Math.random() < Math.min(0.82, allyWeight) ? 'ally' : 'player';
}

function buildMonsterAiContext() {
    const monster = typeof currentMonster !== 'undefined' ? currentMonster : null;
    const pl = typeof player !== 'undefined' ? player : null;
    const ally = window.dungeonDuoBattleActive && typeof getDungeonDuoAlly === 'function'
        ? getDungeonDuoAlly()
        : null;
    const turn = typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0;
    const monsterHpRatio = monster && monster.maxHealth > 0
        ? monster.health / monster.maxHealth
        : 1;
    const playerHpRatio = pl && pl.maxHealth > 0 ? pl.health / pl.maxHealth : 1;
    const allyHpRatio = ally && ally.maxHealth > 0 ? ally.health / ally.maxHealth : 1;
    const allyAlive = !!(ally && ally.health > 0);
    const lastPlayer = monsterAiState.lastPlayerAction;
    const lastMonster = monsterAiState.lastMonsterAbility;
    const playerJustActed = lastPlayer && (turn - lastPlayer.turn) <= 1;
    const playerThreatHigh = playerJustActed && lastPlayer.threat >= 45;
    const playerThreatExtreme = playerJustActed && lastPlayer.threat >= 70;
    const recentMonsterSetup = lastMonster && (turn - lastMonster.turn) <= 2
        && lastMonster.role === 'setup';

    const buffs = monster && monster.activeBuffs ? monster.activeBuffs : {};
    const monsterAtkBuff = buffs.atk;
    const monsterCritBuff = buffs.crit;
    const monsterHasShield = !!(buffs.shield && buffs.shield.value > 0 && buffs.shield.remainingTurns > 0);

    const playerEffects = pl && pl.temporaryEffects ? pl.temporaryEffects : [];
    const playerHasDot = playerEffects.some(e => e.isDot && (e.dur || 0) > 0);
    const playerDebuffedDef = playerEffects.some(e =>
        e.type === 'debuff_def' || e.type === 'debuff_all' || e.type === 'debuff_atk'
    );
    const playerBuffed = playerEffects.some(e =>
        (e.atk || e.def || e.crit || (e.type && e.type.startsWith('buff_'))) && (e.dur || 0) > 0
    );
    const playerFrozen = (typeof playerFrozenTurns !== 'undefined' && playerFrozenTurns > 0)
        || playerEffects.some(e => e.type === 'debuff_freeze');

    const offensivePhase = monsterHpRatio >= 0.38 && !playerThreatExtreme;
    const burstPhase = offensivePhase && (recentMonsterSetup || monsterAtkBuff || playerHasDot);

    return {
        turn,
        monsterHpRatio,
        playerHpRatio,
        allyHpRatio,
        allyAlive,
        allyWeaker: allyAlive && allyHpRatio < playerHpRatio * 0.78,
        monsterMaxHealth: monster ? monster.maxHealth : 100,
        playerMaxHealth: pl ? pl.maxHealth : 100,
        playerThreatHigh,
        playerThreatExtreme,
        playerBuffed,
        playerHasDot,
        playerDebuffedDef,
        playerFrozen,
        monsterHasShield,
        monsterAtkBuffActive: !!monsterAtkBuff && (monsterAtkBuff.remainingTurns || 0) > 0,
        monsterAtkBuffValue: monsterAtkBuff ? monsterAtkBuff.value : 0,
        monsterCritBuffActive: !!monsterCritBuff && (monsterCritBuff.remainingTurns || 0) > 0,
        playerJustActed,
        recentMonsterSetup,
        offensivePhase,
        burstPhase,
        lastPlayerAction: lastPlayer,
        lastMonsterAbility: lastMonster
    };
}

function monsterAbilityOnCooldown(ability) {
    if (!ability || !ability.name) return false;
    if (typeof monsterAbilityCooldowns === 'undefined') return false;
    return (monsterAbilityCooldowns[ability.name] || 0) > 0;
}

function monsterBuffAlreadyActive(ability) {
    if (!ability || !currentMonster || !currentMonster.activeBuffs) return false;
    const b = currentMonster.activeBuffs;
    if (ability.type === 'buff') {
        if (ability.effect === 'atk' && b.atk) return true;
        if (ability.effect === 'def' && b.def) return true;
        if (ability.effect === 'dodge' && b.dodge) return true;
        if (ability.effect === 'shield' && b.shield) return true;
        if (ability.effect === 'reflect' && b.reflect) return true;
        if (ability.effect === 'lifesteal' && b.lifesteal) return true;
        if (ability.effect === 'crit' && b.crit) return true;
        if (ability.effect === 'all') {
            const atkUp = b.atk && (b.atk.remainingTurns || 0) > 0;
            const defUp = b.def && (b.def.remainingTurns || 0) > 0;
            if (atkUp || defUp) return true;
        }
    }
    if (ability.type === 'shield' && b.shield && b.shield.value > 0) return true;
    return false;
}

function canMonsterConsiderAbility(ability) {
    if (!ability) return false;
    if (monsterAbilityOnCooldown(ability)) return false;
    if (monsterBuffAlreadyActive(ability)) return false;
    if (ability.type === 'heal' && currentMonster) {
        const hpRatio = currentMonster.health / currentMonster.maxHealth;
        if (hpRatio > 0.92) return false;
        const ctx = typeof buildMonsterAiContext === 'function' ? buildMonsterAiContext() : null;
        if (ctx && ctx.offensivePhase && hpRatio > 0.78) return false;
    }
    return true;
}

function getComboBonus(ability, ctx) {
    const role = classifyMonsterAbilityRole(ability);
    let bonus = 0;

    if (role === 'finisher' && ctx.burstPhase) {
        if (ctx.recentMonsterSetup) bonus += 100;
        if (ctx.monsterAtkBuffActive) bonus += 60;
        if (ctx.playerHasDot) bonus += 50;
        if (ctx.playerDebuffedDef) bonus += 40;
        if (ctx.playerFrozen) bonus += 35;
        if (ctx.monsterCritBuffActive) bonus += 35;
    }

    if (role === 'setup' && ctx.offensivePhase && !ctx.recentMonsterSetup) {
        if (!ctx.monsterAtkBuffActive && !ctx.playerHasDot && !ctx.playerDebuffedDef) bonus += 55;
        if (ctx.playerHpRatio > 0.55) bonus += 25;
    }

    if (role === 'finisher' && ctx.offensivePhase) {
        bonus += Math.min(80, estimateMonsterAbilityValue(ability, ctx) / 8);
    }

    if (role === 'setup' && ctx.burstPhase) bonus -= 30;

    return bonus;
}

function scoreMonsterAbility(ability, ctx) {
    let score = 0;
    const role = classifyMonsterAbilityRole(ability);
    const baseChance = ability.chance != null ? ability.chance : 70;
    score += baseChance * 0.12;
    score += getComboBonus(ability, ctx);

    switch (ability.type) {
        case 'heal': {
            if (ctx.monsterHpRatio < 0.3) score += 120;
            else if (ctx.monsterHpRatio < 0.5) score += 75;
            else if (ctx.monsterHpRatio < 0.7) score += 25;
            else score -= 50;
            if (ctx.offensivePhase && ctx.monsterHpRatio > 0.65) score -= 70;
            break;
        }
        case 'shield': {
            if (ctx.playerThreatExtreme) score += 110;
            else if (ctx.playerThreatHigh) score += 85;
            if (ctx.monsterHpRatio < 0.45) score += 45;
            if (!ctx.monsterHasShield) score += 30;
            else score -= 80;
            if (ctx.burstPhase && ctx.monsterHpRatio > 0.5) score -= 40;
            if (ctx.offensivePhase && !ctx.playerThreatHigh) score -= 55;
            break;
        }
        case 'buff': {
            if (ability.effect === 'reflect' || ability.effect === 'def') {
                if (ctx.playerThreatHigh) score += 70;
                if (ctx.monsterHpRatio < 0.5) score += 25;
            } else if (ability.effect === 'shield') {
                if (ctx.playerThreatHigh && !ctx.monsterHasShield) score += 90;
            } else if (ability.effect === 'atk' || ability.effect === 'all') {
                if (ctx.offensivePhase && ctx.playerHpRatio > 0.45 && !ctx.monsterAtkBuffActive) score += 55;
                if (ctx.playerHpRatio < 0.35) score += 25;
                if (ctx.monsterAtkBuffActive) score -= 90;
            } else if (ability.effect === 'dodge') {
                if (ctx.playerThreatHigh) score += 35;
            } else if (ability.effect === 'crit') {
                if (ctx.offensivePhase && ctx.playerHpRatio > 0.4) score += 50;
            }
            break;
        }
        case 'debuff': {
            if (ctx.playerBuffed) score += 55;
            if (ctx.offensivePhase && (ability.effect === 'def' || ability.effect === 'slow')) score += 45;
            if (ctx.playerThreatHigh && (ability.effect === 'freeze' || ability.effect === 'slow')) score += 50;
            if (ctx.monsterHpRatio > 0.4) score += 20;
            if (ctx.playerHpRatio < 0.22) score -= 35;
            break;
        }
        case 'dot': {
            if (ctx.offensivePhase && ctx.playerHpRatio > 0.5 && !ctx.playerHasDot) score += 60;
            else if (ctx.playerHpRatio > 0.45 && ctx.monsterHpRatio > 0.35) score += 45;
            break;
        }
        case 'damage': {
            if (ctx.playerHpRatio < 0.35) score += 85;
            if (ctx.allyAlive && ctx.allyHpRatio < 0.35) score += 72;
            if (ctx.allyWeaker) score += 28;
            if (ctx.burstPhase) score += 70;
            if (ctx.offensivePhase) score += 55;
            if (ctx.monsterAtkBuffActive) score += 45;
            if (ctx.playerThreatExtreme && !ctx.monsterHasShield && ctx.monsterHpRatio > 0.45) score -= 20;
            if ((ability.multiplier || 1) >= 1.45) score += 25;
            if ((ability.hits || 1) > 1) score += 20;
            score += estimateMonsterAbilityValue(ability, ctx) / 10;
            break;
        }
        case 'lifesteal': {
            if (ctx.monsterHpRatio < 0.55) score += 45;
            if (ctx.offensivePhase && ctx.playerHpRatio < 0.5) score += 35;
            break;
        }
        default:
            score += 10;
    }

    return score;
}

function applyMonsterAiTurnPriorities(ranked, ctx) {
    if (!ranked.length || !ctx) return ranked;

    if (ctx.monsterHpRatio < 0.32) {
        const healEntry = ranked.find(r => r.ability.type === 'heal');
        if (healEntry) {
            return [healEntry, ...ranked.filter(r => r !== healEntry)];
        }
    }

    if (ctx.monsterHpRatio > 0.28 && ctx.playerHpRatio < 0.38) {
        const finishers = ranked.filter(r => classifyMonsterAbilityRole(r.ability) === 'finisher');
        const rest = ranked.filter(r => classifyMonsterAbilityRole(r.ability) !== 'finisher');
        if (finishers.length) {
            finishers.sort((a, b) => estimateMonsterAbilityValue(b.ability, ctx) - estimateMonsterAbilityValue(a.ability, ctx));
            return [...finishers, ...rest];
        }
    }

    if (ctx.burstPhase) {
        const finishers = ranked.filter(r => classifyMonsterAbilityRole(r.ability) === 'finisher');
        const setups = ranked.filter(r => classifyMonsterAbilityRole(r.ability) === 'setup');
        const other = ranked.filter(r => {
            const role = classifyMonsterAbilityRole(r.ability);
            return role !== 'finisher' && role !== 'setup';
        });
        if (finishers.length) {
            finishers.sort((a, b) => b.score - a.score);
            return [...finishers, ...setups, ...other];
        }
    }

    if (ctx.offensivePhase && !ctx.recentMonsterSetup && !ctx.playerHasDot && !ctx.monsterAtkBuffActive) {
        const bestSetup = ranked
            .filter(r => classifyMonsterAbilityRole(r.ability) === 'setup')
            .sort((a, b) => b.score - a.score)[0];
        const withoutSetup = ranked.filter(r => r !== bestSetup);
        if (bestSetup && bestSetup.score >= 50 && withoutSetup.length) {
            const topFinisher = withoutSetup.find(r => classifyMonsterAbilityRole(r.ability) === 'finisher');
            const setupAbility = bestSetup.ability;
            const setupIsDotOrDebuff = setupAbility.type === 'dot' || setupAbility.type === 'debuff';
            const setupIsStatBuff = setupAbility.type === 'buff'
                && (setupAbility.effect === 'atk' || setupAbility.effect === 'all' || setupAbility.effect === 'crit');
            if (setupIsDotOrDebuff && (!topFinisher || bestSetup.score >= topFinisher.score * 0.85)) {
                return [bestSetup, ...withoutSetup];
            }
            if (setupIsStatBuff && topFinisher && bestSetup.score > topFinisher.score) {
                return [bestSetup, ...withoutSetup];
            }
        }
    }

    return ranked;
}

function pickMonsterTacticalAbilities(abilities) {
    if (!abilities || !abilities.length) return [];
    const ctx = buildMonsterAiContext();
    let ranked = abilities
        .filter(canMonsterConsiderAbility)
        .map(ability => ({
            ability,
            score: scoreMonsterAbility(ability, ctx),
            estValue: estimateMonsterAbilityValue(ability, ctx),
            role: classifyMonsterAbilityRole(ability)
        }))
        .filter(entry => entry.score > -20)
        .sort((a, b) => b.score - a.score);

    ranked = applyMonsterAiTurnPriorities(ranked, ctx);
    return ranked;
}

function pickMonsterTacticalAbility(abilities) {
    const ranked = pickMonsterTacticalAbilities(abilities);
    return ranked.length ? ranked[0].ability : null;
}

function getMonsterTacticalHint(ability, ctx) {
    if (!ability || !ctx) return '';
    const role = classifyMonsterAbilityRole(ability);
    if (ability.type === 'heal' && ctx.monsterHpRatio < 0.5) return '🧠 Спасение';
    if ((ability.type === 'shield' || (ability.type === 'buff' && ability.effect === 'reflect'))
        && ctx.playerThreatHigh) return '🧠 Защита';
    if (role === 'finisher' && ctx.burstPhase) return '🔗 Комбо · удар';
    if (role === 'setup' && ctx.offensivePhase && !ctx.recentMonsterSetup) return '🔗 Комбо · подготовка';
    if (role === 'finisher' && ctx.playerHpRatio < 0.35) return '🧠 Добивание';
    if (role === 'finisher' && ctx.allyAlive && ctx.allyHpRatio < 0.35) return '🧠 Добивание союзника';
    if (role === 'debuff' && ctx.playerThreatHigh) return '🧠 Контр';
    return '';
}

window.resetMonsterAiState = resetMonsterAiState;
window.recordPlayerActionForMonsterAi = recordPlayerActionForMonsterAi;
window.recordMonsterAbilityForMonsterAi = recordMonsterAbilityForMonsterAi;
window.pickMonsterTacticalAbilities = pickMonsterTacticalAbilities;
window.pickMonsterTacticalAbility = pickMonsterTacticalAbility;
window.buildMonsterAiContext = buildMonsterAiContext;
window.getMonsterTacticalHint = getMonsterTacticalHint;
window.estimateMonsterAbilityValue = estimateMonsterAbilityValue;
window.classifyMonsterAbilityRole = classifyMonsterAbilityRole;
window.pickMonsterCombatTarget = pickMonsterCombatTarget;
