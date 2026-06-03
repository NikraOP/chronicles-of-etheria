// js/core/battle/battleDamage.js

function calculateDamage(dmg, defense) {
    const defenseReduction = Math.min(70, defense / 4);
    return Math.max(1, Math.floor(dmg * (100 - defenseReduction) / 100));
}

function calculateDamageWithDebuffs(dmg, defense, playerDebuffs) {
    let finalDamage = dmg;
    const atkDebuff = playerDebuffs.find(e => e.type === 'debuff_atk');
    if (atkDebuff) finalDamage = Math.floor(finalDamage * (1 - atkDebuff.value / 100));
    const allDebuff = playerDebuffs.find(e => e.type === 'debuff_all');
    if (allDebuff) finalDamage = Math.floor(finalDamage * (1 - allDebuff.value / 100));
    const defenseReduction = Math.min(70, defense / 4);
    return Math.max(1, Math.floor(finalDamage * (100 - defenseReduction) / 100));
}

function calculateDamageWithShred(dmg, defense, shred) {
    const effectiveDefense = Math.max(0, defense * (1 - shred / 100));
    const reduction = effectiveDefense / 4;
    return Math.max(1, Math.floor(dmg * (100 - Math.min(reduction, 70)) / 100));
}

function getPlayerEffectiveDefense() {
    let defense = player.defense;
    let defBonusPercent = 0;
    if (player.temporaryEffects) {
        player.temporaryEffects.forEach(e => {
            if (e.def) defBonusPercent += e.def;
        });
    }
    if (defBonusPercent > 0) {
        defBonusPercent = Math.min(120, defBonusPercent);
        defense = Math.floor(defense * (1 + defBonusPercent / 100));
    }
    const defDebuff = player.temporaryEffects.find(e => e.type === 'debuff_def');
    if (defDebuff) defense = Math.floor(defense * (1 - defDebuff.value / 100));
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) defense = Math.floor(defense * (1 - allDebuff.value / 100));
    return Math.max(0, defense);
}

function getPlayerEffectiveAttack() {
    let attack = player.attack;
    const atkDebuff = player.temporaryEffects.find(e => e.type === 'debuff_atk');
    if (atkDebuff) attack = Math.floor(attack * (1 - atkDebuff.value / 100));
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) attack = Math.floor(attack * (1 - allDebuff.value / 100));
    const slowDebuff = player.temporaryEffects.find(e => e.type === 'debuff_slow');
    if (slowDebuff) attack = Math.floor(attack * (1 - slowDebuff.value / 100));
    const atkBuff = player.temporaryEffects.find(e => e.atk);
    if (atkBuff && atkBuff.atk) attack = Math.floor(attack * (1 + atkBuff.atk / 100));
    return Math.max(1, attack);
}

function getPlayerEffectiveDodge() {
    let dodge = player.dodgeChance;
    const dodgeBuff = player.temporaryEffects.reduce((s, e) => s + (e.dodge || 0), 0);
    dodge += dodgeBuff;
    const dodgeDebuff = player.temporaryEffects.find(e => e.type === 'debuff_dodge');
    if (dodgeDebuff) dodge = Math.max(0, dodge - dodgeDebuff.value);
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) dodge = Math.max(0, Math.floor(dodge * (1 - allDebuff.value / 100)));
    return Math.min(70, dodge);
}

function getPlayerCritDamagePercent(extraBonus) {
    let cd = player.criticalDamage + (extraBonus || 0);
    const critDmgBuff = player.temporaryEffects.find(e => e.critDmg);
    if (critDmgBuff && critDmgBuff.critDmg) cd += critDmgBuff.critDmg;
    return cd;
}

function playerAttackMissesFromBlind() {
    const blind = player.temporaryEffects.find(e => e.type === 'debuff_blind');
    if (!blind) return false;
    let missChance = blind.value || 40;
    if (typeof nextAccuracyBonus !== 'undefined' && nextAccuracyBonus > 0) {
        missChance = Math.max(0, missChance - nextAccuracyBonus);
        nextAccuracyBonus = 0;
    }
    return Math.random() * 100 < missChance;
}

function monsterDodgesPlayerHit() {
    const dodgeBuff = currentMonster.activeBuffs && currentMonster.activeBuffs.dodge;
    if (!dodgeBuff || dodgeBuff.remainingTurns <= 0) return false;
    const chance = Math.min(50, dodgeBuff.value);
    return Math.random() * 100 <= chance;
}

function getWeakspotDamageMultiplier() {
    if (!currentMonster || !player._passiveWeakspot) return 1;
    if (currentMonster.health < currentMonster.maxHealth * 0.5) {
        return 1 + player._passiveWeakspot / 100;
    }
    return 1;
}

function getMonsterCurrentAttack() {
    let atk = currentMonster.attack;
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.atk) {
        const buff = currentMonster.activeBuffs.atk;
        atk = Math.floor(originalMonsterStats.attack * (1 + buff.value / 100));
    }
    const slow = currentMonster.effects && currentMonster.effects.find(e => e.type === 'slow');
    if (slow && slow.val) atk = Math.floor(atk * (1 - slow.val / 100));
    return atk;
}

function monsterAttackMissesFromBlind() {
    if (!currentMonster.effects) return false;
    const blind = currentMonster.effects.find(e => e.type === 'Ослепление');
    if (!blind) return false;
    const missChance = blind.val || blind.value || 40;
    return Math.random() * 100 < missChance;
}

function getMonsterCurrentDefense() {
    // Если есть активный бафф защиты - возвращаем увеличенное значение
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.def) {
        const buff = currentMonster.activeBuffs.def;
        return Math.floor(originalMonsterStats.defense * (1 + buff.value / 100));
    }
    return currentMonster.defense;
}

function getMonsterCurrentShield() {
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.shield) {
        return currentMonster.activeBuffs.shield.value;
    }
    return 0;
}

function applyDamageToPlayer(damage) {
    let remainingDamage = damage;
    const dr = player.temporaryEffects.find(e => e.damageReduction);
    if (dr && remainingDamage > 0) {
        remainingDamage = Math.max(1, Math.floor(remainingDamage * (1 - dr.damageReduction / 100)));
    }
    const playerShieldIndex = player.temporaryEffects.findIndex(e => e.shield !== undefined && e.shield > 0);
    if (playerShieldIndex !== -1) {
        const playerShield = player.temporaryEffects[playerShieldIndex];
        const absorbed = Math.min(playerShield.shield, remainingDamage);
        playerShield.shield -= absorbed;
        remainingDamage -= absorbed;
        addBattleLog(`🛡️ Ваш щит поглотил ${absorbed} урона! Осталось щита: ${playerShield.shield}`, 'info');
        if (playerShield.shield <= 0) {
            player.temporaryEffects.splice(playerShieldIndex, 1);
            addBattleLog(`🛡️ Ваш щит разрушен!`, 'info');
        }
    }
    if (remainingDamage > 0) player.health -= remainingDamage;
    return remainingDamage;
}

/** Урон игроку от отражения монстра (огненный щит и т.п.) */
function applyMonsterReflectDamage(appliedDamage) {
    if (!currentMonster || !currentMonster.activeBuffs || !currentMonster.activeBuffs.reflect || appliedDamage <= 0) return 0;
    const reflected = Math.floor(appliedDamage * currentMonster.activeBuffs.reflect.value / 100);
    if (reflected > 0) {
        applyDamageToPlayer(reflected);
        addBattleLog(`🔄 ${currentMonster.name} отражает ${reflected} урона!`, 'info');
        if (typeof showReflectEffect === 'function') showReflectEffect('player', reflected);
        if (typeof floatDamage === 'function') floatDamage('player', reflected, false);
    }
    return reflected;
}

function applyDamageToMonster(damage, ignoreShields) {
    let remainingDamage = damage;
    const monsterShield = ignoreShields ? 0 : getMonsterCurrentShield();
    if (monsterShield > 0) {
        const absorbed = Math.min(monsterShield, remainingDamage);
        currentMonster.activeBuffs.shield.value -= absorbed;
        remainingDamage -= absorbed;
        addBattleLog(`🛡️ Щит ${currentMonster.name} поглотил ${absorbed} урона! Осталось щита: ${currentMonster.activeBuffs.shield.value}`, 'info');
        if (currentMonster.activeBuffs.shield.value <= 0) {
            delete currentMonster.activeBuffs.shield;
            addBattleLog(`🛡️ Щит ${currentMonster.name} разрушен!`, 'info');
        }
    }
    if (remainingDamage > 0) currentMonster.health -= remainingDamage;
    return remainingDamage;
}