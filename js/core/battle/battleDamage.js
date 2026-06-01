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
    return Math.max(1, attack);
}

function getMonsterCurrentAttack() {
    // Если есть активный бафф атаки - возвращаем увеличенное значение
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.atk) {
        const buff = currentMonster.activeBuffs.atk;
        return Math.floor(originalMonsterStats.attack * (1 + buff.value / 100));
    }
    return currentMonster.attack;
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

function applyDamageToMonster(damage) {
    let remainingDamage = damage;
    const monsterShield = getMonsterCurrentShield();
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