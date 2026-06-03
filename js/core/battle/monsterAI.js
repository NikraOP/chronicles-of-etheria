// js/core/battle/monsterAI.js — тактический выбор способностей монстра (PvE).

const monsterAiState = {
    lastPlayerAction: null,
    playerActionTurn: 0
};

function resetMonsterAiState() {
    monsterAiState.lastPlayerAction = null;
    monsterAiState.playerActionTurn = 0;
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
        monsterAiState.lastPlayerAction = {
            kind: 'attack',
            name: 'Атака',
            threat: 25,
            turn
        };
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

function buildMonsterAiContext() {
    const monster = typeof currentMonster !== 'undefined' ? currentMonster : null;
    const pl = typeof player !== 'undefined' ? player : null;
    const turn = typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0;
    const monsterHpRatio = monster && monster.maxHealth > 0
        ? monster.health / monster.maxHealth
        : 1;
    const playerHpRatio = pl && pl.maxHealth > 0 ? pl.health / pl.maxHealth : 1;
    const last = monsterAiState.lastPlayerAction;
    const playerJustActed = last && (turn - last.turn) <= 1;
    const playerThreatHigh = playerJustActed && last.threat >= 45;
    const playerThreatExtreme = playerJustActed && last.threat >= 70;

    const playerBuffed = pl && pl.temporaryEffects && pl.temporaryEffects.some(e =>
        (e.atk || e.def || e.crit || (e.type && e.type.startsWith('buff_'))) && (e.dur || 0) > 0
    );
    const monsterHasShield = !!(monster && monster.activeBuffs && monster.activeBuffs.shield
        && monster.activeBuffs.shield.value > 0
        && monster.activeBuffs.shield.remainingTurns > 0);

    return {
        monsterHpRatio,
        playerHpRatio,
        playerThreatHigh,
        playerThreatExtreme,
        playerBuffed,
        monsterHasShield,
        playerJustActed,
        lastPlayerAction: last
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
    }
    if (ability.type === 'shield' && b.shield && b.shield.value > 0) return true;
    return false;
}

function canMonsterConsiderAbility(ability) {
    if (!ability) return false;
    if (monsterAbilityOnCooldown(ability)) return false;
    if (monsterBuffAlreadyActive(ability)) return false;
    if (ability.type === 'heal' && currentMonster
        && currentMonster.health > currentMonster.maxHealth * 0.92) return false;
    return true;
}

function scoreMonsterAbility(ability, ctx) {
    let score = 0;
    const baseChance = ability.chance != null ? ability.chance : 70;
    score += baseChance * 0.15;

    switch (ability.type) {
        case 'heal': {
            if (ctx.monsterHpRatio < 0.3) score += 120;
            else if (ctx.monsterHpRatio < 0.5) score += 75;
            else if (ctx.monsterHpRatio < 0.7) score += 25;
            else score -= 50;
            break;
        }
        case 'shield': {
            if (ctx.playerThreatExtreme) score += 110;
            else if (ctx.playerThreatHigh) score += 85;
            if (ctx.monsterHpRatio < 0.45) score += 45;
            if (!ctx.monsterHasShield) score += 30;
            else score -= 80;
            break;
        }
        case 'buff': {
            if (ability.effect === 'reflect' || ability.effect === 'def') {
                if (ctx.playerThreatHigh) score += 70;
                if (ctx.monsterHpRatio < 0.5) score += 25;
            } else if (ability.effect === 'shield') {
                if (ctx.playerThreatHigh && !ctx.monsterHasShield) score += 90;
            } else if (ability.effect === 'atk' || ability.effect === 'all') {
                if (ctx.monsterHpRatio > 0.5 && ctx.playerHpRatio > 0.4) score += 40;
                if (ctx.playerHpRatio < 0.35) score += 30;
            } else if (ability.effect === 'dodge') {
                if (ctx.playerThreatHigh) score += 35;
            } else if (ability.effect === 'crit') {
                if (ctx.playerHpRatio > 0.5) score += 35;
            }
            break;
        }
        case 'debuff': {
            if (ctx.playerBuffed) score += 55;
            if (ctx.playerThreatHigh && (ability.effect === 'freeze' || ability.effect === 'slow')) score += 50;
            if (ctx.monsterHpRatio > 0.4) score += 20;
            if (ctx.playerHpRatio < 0.25) score -= 20;
            break;
        }
        case 'dot': {
            if (ctx.playerHpRatio > 0.45 && ctx.monsterHpRatio > 0.35) score += 45;
            break;
        }
        case 'damage': {
            if (ctx.playerHpRatio < 0.35) score += 70;
            if (ctx.monsterHpRatio > 0.5) score += 35;
            if (ctx.playerThreatExtreme && !ctx.monsterHasShield) score -= 25;
            if ((ability.multiplier || 1) >= 1.4) score += 15;
            break;
        }
        case 'lifesteal': {
            if (ctx.monsterHpRatio < 0.6) score += 40;
            if (ctx.playerHpRatio < 0.4) score += 25;
            break;
        }
        default:
            score += 10;
    }

    return score;
}

function pickMonsterTacticalAbilities(abilities) {
    if (!abilities || !abilities.length) return [];
    const ctx = buildMonsterAiContext();
    let ranked = abilities
        .filter(canMonsterConsiderAbility)
        .map(ability => ({ ability, score: scoreMonsterAbility(ability, ctx) }))
        .filter(entry => entry.score > -20)
        .sort((a, b) => b.score - a.score);

    if (ctx.monsterHpRatio < 0.32) {
        const healEntry = ranked.find(r => r.ability.type === 'heal');
        if (healEntry) {
            ranked = [healEntry, ...ranked.filter(r => r !== healEntry)];
        }
    }

    return ranked;
}

function pickMonsterTacticalAbility(abilities) {
    const ranked = pickMonsterTacticalAbilities(abilities);
    return ranked.length ? ranked[0].ability : null;
}

function getMonsterTacticalHint(ability, ctx) {
    if (!ability || !ctx) return '';
    if (ability.type === 'heal' && ctx.monsterHpRatio < 0.5) return '🧠 Спасение';
    if ((ability.type === 'shield' || (ability.type === 'buff' && ability.effect === 'reflect'))
        && ctx.playerThreatHigh) return '🧠 Защита';
    if (ability.type === 'debuff' && ctx.playerThreatHigh) return '🧠 Контр';
    if (ability.type === 'damage' && ctx.playerHpRatio < 0.35) return '🧠 Добивание';
    return '';
}

window.resetMonsterAiState = resetMonsterAiState;
window.recordPlayerActionForMonsterAi = recordPlayerActionForMonsterAi;
window.pickMonsterTacticalAbilities = pickMonsterTacticalAbilities;
window.pickMonsterTacticalAbility = pickMonsterTacticalAbility;
window.buildMonsterAiContext = buildMonsterAiContext;
window.getMonsterTacticalHint = getMonsterTacticalHint;
