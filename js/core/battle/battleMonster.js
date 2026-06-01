// js/core/battle/battleMonster.js

function applyMonsterBuff(type, value, duration) {
    if (!currentMonster.activeBuffs) currentMonster.activeBuffs = {};
    
    if (type === 'atk' && !currentMonster.activeBuffs.atk) {
        originalMonsterStats.attack = currentMonster.attack;
    }
    if (type === 'def' && !currentMonster.activeBuffs.def) {
        originalMonsterStats.defense = currentMonster.defense;
    }
    
    currentMonster.activeBuffs[type] = {
        value: value,
        remainingTurns: duration
    };
    
    if (type === 'atk') {
        currentMonster.attack = Math.floor(originalMonsterStats.attack * (1 + value / 100));
        addBattleLog(`⚔️ Атака ${currentMonster.name} увеличена на ${value}% (${originalMonsterStats.attack} → ${currentMonster.attack})`, 'info');
    }
    if (type === 'def') {
        currentMonster.defense = Math.floor(originalMonsterStats.defense * (1 + value / 100));
        addBattleLog(`🛡️ Защита ${currentMonster.name} увеличена на ${value}% (${originalMonsterStats.defense} → ${currentMonster.defense})`, 'info');
    }
}

function updateMonsterBuffs() {
    if (!currentMonster.activeBuffs) return;
    
    for (let type in currentMonster.activeBuffs) {
        const buff = currentMonster.activeBuffs[type];
        buff.remainingTurns--;
        
        if (buff.remainingTurns <= 0) {
            delete currentMonster.activeBuffs[type];
            
            if (type === 'atk') {
                currentMonster.attack = originalMonsterStats.attack;
                addBattleLog(`⚔️ Бафф атаки ${currentMonster.name} закончился! Атака восстановлена (${currentMonster.attack})`, 'info');
            }
            if (type === 'def') {
                currentMonster.defense = originalMonsterStats.defense;
                addBattleLog(`🛡️ Бафф защиты ${currentMonster.name} закончился! Защита восстановлена (${currentMonster.defense})`, 'info');
            }
            if (type === 'shield') {
                addBattleLog(`🛡️ Щит ${currentMonster.name} рассеялся!`, 'info');
            }
            if (type === 'reflect') {
                addBattleLog(`🔄 Отражение урона ${currentMonster.name} закончилось!`, 'info');
            }
        }
    }
}

function useMonsterAbility(ability) {
    if (!ability || !currentMonster) return false;
    
    const cdKey = ability.name;
    if (monsterAbilityCooldowns[cdKey] > 0) return false;
    if (ability.chance && Math.random() * 100 > ability.chance) return false;
    
    const enemySprite = document.getElementById('enemySprite');
    if (enemySprite) {
        enemySprite.classList.add('casting-ability');
        setTimeout(() => enemySprite.classList.remove('casting-ability'), 800);
    }
    
    showFloatingText('enemy', ability.name, ability.type);
    addBattleLog(`🌀 ${currentMonster.name} использует ${ability.name}!`, 'info');
    
    if (ability.cooldown) monsterAbilityCooldowns[cdKey] = ability.cooldown;
    
    switch(ability.type) {
        case 'damage':
            const monsterAtk = getMonsterCurrentAttack();
            let dmg = Math.floor(monsterAtk * (ability.multiplier || 1));
            const playerDef = getPlayerEffectiveDefense();
            dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
            applyDamageToPlayer(dmg);
            floatDamage('player', dmg, false);
            showHitEffect('player');
            break;
            
        case 'dot':
            const dotTarget = ability.target || 'player';
            const dotEffect = ability.effect || 'Яд';
            const dotValue = ability.value || 5;
            const dotDuration = ability.duration || 2;
            
            if (dotTarget === 'player') {
                // Накладываем DoT на игрока
                const existingDot = player.temporaryEffects.find(e => e.type === 'dot_' + dotEffect);
                if (existingDot) {
                    existingDot.value = dotValue;
                    existingDot.dur = dotDuration;
                } else {
                    player.temporaryEffects.push({
                        type: 'dot_' + dotEffect,
                        value: dotValue,
                        dur: dotDuration,
                        isDot: true,
                        dotIcon: dotEffect === 'burn' ? '🔥' : '☠️'
                    });
                }
                addBattleLog(`☠️ ${ability.name}: вы получили эффект ${dotEffect} (${dotValue}% HP в ход на ${dotDuration} хода)!`, 'info');
                showDebuffEffect('player', dotEffect);
            } else {
                // Накладываем DoT на монстра
                currentMonster.effects.push({ 
                    type: dotEffect, 
                    val: dotValue, 
                    dur: dotDuration 
                });
                addBattleLog(`☠️ ${ability.name}: наложен эффект ${dotEffect} (${dotValue}% HP в ход)!`, 'info');
                showDebuffEffect('enemy', dotEffect);
            }
            break;
            
        case 'heal':
            const healPercent = ability.value || 15;
            const healAmount = Math.floor(currentMonster.maxHealth * healPercent / 100);
            currentMonster.health = Math.min(currentMonster.maxHealth, currentMonster.health + healAmount);
            addBattleLog(`💚 ${ability.name} восстанавливает ${healAmount} HP!`, 'heal');
            showHealEffect('enemy', healAmount);
            break;
            
        case 'buff':
            const buffType = ability.effect;
            const buffValue = ability.value || 20;
            const buffDuration = ability.duration || 2;
            
            if (buffType === 'atk' || buffType === 'def') {
                applyMonsterBuff(buffType, buffValue, buffDuration);
            } else if (buffType === 'crit') {
                addBattleLog(`✨ ${ability.name}: крит увеличен на ${buffValue}% на ${buffDuration} хода!`, 'info');
            } else if (buffType === 'dodge') {
                addBattleLog(`💨 ${ability.name}: уклонение увеличено на ${buffValue}% на ${buffDuration} хода!`, 'info');
            } else if (buffType === 'reflect') {
                // ДОБАВЛЕНА ОБРАБОТКА ОТРАЖЕНИЯ
                if (!currentMonster.activeBuffs) currentMonster.activeBuffs = {};
                currentMonster.activeBuffs.reflect = {
                    value: buffValue,
                    remainingTurns: buffDuration
                };
                addBattleLog(`🔄 ${ability.name}: отражение урона увеличено на ${buffValue}% на ${buffDuration} хода!`, 'info');
                showBuffEffect('enemy', '🔄');
            } else if (buffType === 'all') {
                applyMonsterBuff('atk', buffValue, buffDuration);
                applyMonsterBuff('def', buffValue, buffDuration);
                addBattleLog(`✨ ${ability.name}: все характеристики увеличены на ${buffValue}%!`, 'info');
            } else {
                addBattleLog(`⚠️ Неизвестный тип баффа: ${buffType}`, 'error');
            }
            break;
            
        case 'shield':
            const shieldValue = Math.floor(currentMonster.maxHealth * (ability.value || 20) / 100);
            if (!currentMonster.activeBuffs) currentMonster.activeBuffs = {};
            currentMonster.activeBuffs.shield = { 
                value: shieldValue, 
                remainingTurns: ability.duration || 2 
            };
            const shieldPercent = Math.floor((shieldValue / currentMonster.maxHealth) * 100);
            addBattleLog(`🛡️ ${ability.name}: создан щит на ${shieldValue} HP (${shieldPercent}% от макс. HP) на ${ability.duration || 2} хода!`, 'info');
            showShieldEffect('enemy', shieldValue);
            break;
            
        case 'debuff':
            const existingDebuff = player.temporaryEffects.find(e => e.type === 'debuff_' + ability.effect);
            if (existingDebuff) {
                existingDebuff.value = ability.value || 20;
                existingDebuff.dur = ability.duration || 2;
            } else {
                player.temporaryEffects.push({ type: 'debuff_' + ability.effect, value: ability.value || 20, dur: ability.duration || 2 });
            }
            
            let debuffIcon = { atk:'⚔️', def:'🛡️', dodge:'💨', all:'😵', freeze:'❄️', blind:'👁️', slow:'🐢', hp:'❤️' }[ability.effect] || '😵';
            let effectText = { atk:'атака', def:'защита', dodge:'уклонение', hp:'здоровье', all:'все характеристики', freeze:'заморозка', blind:'ослепление', slow:'замедление' }[ability.effect] || 'характеристики';
            
            addBattleLog(`${debuffIcon} ${ability.name}: ${effectText} -${ability.value || 20}% на ${ability.duration || 2} хода!`, 'error');
            showDebuffEffect('player', ability.effect);
            
            if (ability.effect === 'hp') {
                const hpReductionPercent = ability.value || 20;
                if (!player.originalMaxHealth) player.originalMaxHealth = player.maxHealth;
                const newMaxHealth = Math.max(10, Math.floor(player.originalMaxHealth * (1 - hpReductionPercent / 100)));
                const oldMaxHealth = player.maxHealth;
                player.maxHealth = newMaxHealth;
                if (player.health > player.maxHealth) player.health = player.maxHealth;
                addBattleLog(`❤️ Максимальное здоровье снижено на ${hpReductionPercent}% (было ${oldMaxHealth}, стало ${player.maxHealth})!`, 'error');
            }
            break;
            
        case 'lifesteal':
            if (!currentMonster.activeBuffs) currentMonster.activeBuffs = {};
            currentMonster.activeBuffs.lifesteal = { value: ability.value || 30, remainingTurns: ability.duration || 2 };
            addBattleLog(`🩸 ${ability.name}: вампиризм ${ability.value || 30}% на ${ability.duration || 2} хода!`, 'info');
            showBuffEffect('enemy', '🩸');
            break;
            
        case 'summon':
            addBattleLog(`✨ ${ability.name}: призыв миньона!`, 'info');
            showFloatingText('enemy', 'ПРИЗЫВ', 'summon');
            break;
            
        default:
            addBattleLog(`⚠️ Неизвестный тип способности: ${ability.type}`, 'error');
            return false;
    }
    renderBattle();
    return true;
}

function monsterTurn() {
    if (!currentMonster || currentMonster.health <= 0) { 
        isPlayerTurn = true; 
        updateBattleButtons(); 
        return; 
    }

    // Обновляем баффы монстра
    updateMonsterBuffs();

    // Призванный дух
    if (summonedSpirit) {
        const spiritDamage = Math.floor(player.attack * 0.8);
        const appliedDamage = applyDamageToMonster(spiritDamage);
        addBattleLog(`🌿 Дух природы наносит ${appliedDamage} урона!`, 'dmg');
        summonedSpirit = false;
    }
    
    // Ядовитое облако
    if (lingeringCloud && currentMonster.effects.some(e => e.type === 'Яд')) {
        const cloudDamage = Math.floor(currentMonster.maxHealth * 0.05);
        const appliedDamage = applyDamageToMonster(cloudDamage);
        addBattleLog(`☁️ Ядовитое облако наносит ${appliedDamage} урона!`, 'dmg');
    }
    
    // Заморозка/оглушение монстра
    const stunEffect = currentMonster.effects.find(e => e.type === 'Оглушение' || e.type === 'Заморозка');
    if (stunEffect) {
        addBattleLog(`${currentMonster.name} ${stunEffect.type === 'Оглушение' ? 'оглушён' : 'заморожен'} и пропускает ход!`, 'info');
        stunEffect.dur--;
        if (stunEffect.dur <= 0) currentMonster.effects = currentMonster.effects.filter(e => e !== stunEffect);
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
        return;
    }
    
    // Иммунитет игрока
    const immune = player.temporaryEffects.find(e => e.immune);
    if (immune) {
        addBattleLog('🛡️ Иммунитет! Монстр не может атаковать!', 'info');
        immune.dur--;
        if (immune.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== immune);
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
        return;
    }
    
    // =================================================================
    // НЕТ НИКАКОГО ПАССИВНОГО УКЛОНЕНИЯ! МОНСТР ВСЕГДА АТАКУЕТ!
    // =================================================================
    
    // Пытаемся использовать способность монстра
    let abilityUsed = false;
    if (currentMonster.abilities && currentMonster.abilities.length > 0) {
        const sortedAbilities = [...currentMonster.abilities].sort((a, b) => {
            const priority = { 'heal': 1, 'buff': 2, 'shield': 2, 'debuff': 3, 'dot': 3, 'damage': 4 };
            return (priority[a.type] || 5) - (priority[b.type] || 5);
        });
        
        for (let ability of sortedAbilities) {
            if (ability.type === 'buff' && ability.effect === 'atk' && currentMonster.activeBuffs && currentMonster.activeBuffs.atk) continue;
            if (ability.type === 'buff' && ability.effect === 'def' && currentMonster.activeBuffs && currentMonster.activeBuffs.def) continue;
            if (ability.type === 'buff' && ability.effect === 'shield' && currentMonster.activeBuffs && currentMonster.activeBuffs.shield) continue;
            if (ability.type === 'buff' && ability.effect === 'reflect' && currentMonster.activeBuffs && currentMonster.activeBuffs.reflect) continue;
            if (ability.type === 'heal' && currentMonster.health > currentMonster.maxHealth * 0.5) continue;
            if (useMonsterAbility(ability)) { abilityUsed = true; break; }
        }
    }

    // Обработка DoT эффектов на игроке
    if (player.temporaryEffects && player.temporaryEffects.length > 0) {
        player.temporaryEffects = player.temporaryEffects.filter(e => {
            if (e.isDot && e.value) {
                const dotDamage = Math.floor(player.maxHealth * e.value / 100);
                if (dotDamage > 0) {
                    player.health -= dotDamage;
                    const icon = e.dotIcon || '🔥';
                    addBattleLog(`${icon} ${e.type}: -${dotDamage} урона!`, 'dmg');
                    floatDamage('player', dotDamage, false);
                }
                e.dur--;
                return e.dur > 0;
            }
            return true;
        });
    }
    
    // Если способность не использована - обычная атака
    if (!abilityUsed) {
        const monsterAtk = getMonsterCurrentAttack();
        let dmg = Math.floor(monsterAtk);
        const playerDef = getPlayerEffectiveDefense();
        dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
        
        const lifestealBuff = currentMonster.activeBuffs ? currentMonster.activeBuffs.lifesteal : null;
        let lifestealValue = lifestealBuff ? lifestealBuff.value : 0;
        
        const reflectBuff = currentMonster.activeBuffs ? currentMonster.activeBuffs.reflect : null;
        let reflectValue = reflectBuff ? reflectBuff.value : 0;
        
        // Контратака игрока
        const counter = player.temporaryEffects.find(e => e.counterChance);
        if (counter && Math.random() * 100 <= counter.counterChance) {
            const counterDmg = Math.floor(dmg * (counter.counterDmg || 80) / 100);
            applyDamageToMonster(counterDmg);
            addBattleLog(`↩️ Контратака! ${counterDmg} урона!`, 'dmg');
        }
        
        // Отражение урона монстром
        if (reflectValue > 0 && dmg > 0) {
            const reflectedDmg = Math.floor(dmg * reflectValue / 100);
            if (reflectedDmg > 0) {
                applyDamageToPlayer(reflectedDmg);
                addBattleLog(`🔄 Отражение урона! Вы получили ${reflectedDmg} урона!`, 'dmg');
                floatDamage('player', reflectedDmg, false);
            }
        }
        
        // Отражение урона игроком
        const reflectEffect = player.temporaryEffects.find(e => e.reflect);
        if (reflectEffect && reflectEffect.reflect > 0 && dmg > 0) {
            const reflectedDmg = Math.floor(dmg * reflectEffect.reflect / 100);
            applyDamageToMonster(reflectedDmg);
            addBattleLog(`↩️ Отражено ${reflectedDmg} урона!`, 'dmg');
            reflectEffect.dur--;
            if (reflectEffect.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== reflectEffect);
            if (currentMonster.health <= 0) { victory(); return; }
        }
        
        // Заморозка атакующего
        const freezeOnHit = player.temporaryEffects.find(e => e.freezeOnHit);
        if (freezeOnHit && dmg > 0) {
            currentMonster.effects.push({ type: 'Заморозка', dur: 1 });
            addBattleLog(`❄️ Монстр заморожен!`, 'info');
        }
        
        if (dmg > 0) {
            const appliedDamage = applyDamageToPlayer(dmg);
            if (appliedDamage > 0) {
                addBattleLog(`👊 ${currentMonster.name} наносит ${appliedDamage} урона!`, 'dmg');
                floatDamage('player', appliedDamage, false);
            }
            if (lifestealValue > 0 && appliedDamage > 0) {
                const healAmount = Math.floor(appliedDamage * lifestealValue / 100);
                currentMonster.health = Math.min(currentMonster.maxHealth, currentMonster.health + healAmount);
                addBattleLog(`🩸 Монстр восстанавливает ${healAmount} HP!`, 'heal');
            }
            if (player.health <= 0 && deathSaveActive) {
                player.health = Math.floor(player.maxHealth * 0.1);
                deathSaveActive = false;
                addBattleLog(`🛡️ Инстинкт выживания! Вы выжили с 10% HP!`, 'success');
            }
        }
    }
    
    animateEnemyAttack(() => {
        if (player.health <= 0) { 
            const hasRevive = player.abilities && player.abilities.some(a => a.reviveOnDeath && !reviveUsed);
            if (hasRevive && !reviveUsed) {
                reviveUsed = true;
                player.health = Math.floor(player.maxHealth * 0.5);
                addBattleLog(`✨ Божественное возмездие! Вы воскресли с 50% HP!`, 'success');
                isPlayerTurn = true;
                renderBattle();
                updateBattleButtons();
                return;
            }
            gameOver(); 
            return; 
        }
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
    });
    
    // Обработка эффектов у монстра (DoT)
    if (currentMonster.effects && currentMonster.effects.length > 0) {
        currentMonster.effects = currentMonster.effects.filter(e => { 
            if (e.type === 'Оглушение' || e.type === 'Заморозка') return e.dur > 0;
            if (e.val) {
                let dotDamage = Math.floor(currentMonster.maxHealth * e.val / 100);
                if (e.type === 'Горение' && currentMonster.fireVuln) dotDamage = Math.floor(dotDamage * (1 + currentMonster.fireVuln / 100));
                const appliedDamage = applyDamageToMonster(dotDamage);
                addBattleLog(`🔥 ${e.type}: -${appliedDamage} урона`, 'dmg');
                if (e.manaRegen && player.class === 'Маг') {
                    player.mana = Math.min(player.maxMana, player.mana + e.manaRegen);
                    addBattleLog(`💎 +${e.manaRegen} маны от горения`, 'heal');
                }
                if (e.spread && currentMonster.health > 0 && Math.random() < 0.3) addBattleLog(`🔥 Горение распространяется!`, 'info');
            }
            e.dur--; 
            return e.dur > 0; 
        });
    }
    
    // Обработка эффектов у игрока
    player.temporaryEffects = player.temporaryEffects.filter(e => {
        if (e.dur) e.dur--;
        if (e.regen) {
            const regenHeal = Math.floor(player.maxHealth * e.regen / 100);
            player.health = Math.min(player.maxHealth, player.health + regenHeal);
            addBattleLog(`💚 Регенерация +${regenHeal} HP`, 'heal');
        }
        if (e.regenMana) {
            const regenMana = Math.floor(player.maxMana * e.regenMana / 100);
            player.mana = Math.min(player.maxMana, player.mana + regenMana);
            addBattleLog(`💎 Регенерация +${regenMana} маны`, 'heal');
        }
        if (e.manaBurn && currentMonster) {
            const burnDamage = applyDamageToMonster(e.manaBurn);
            addBattleLog(`💀 Эффект маны: -${burnDamage} урона`, 'dmg');
        }
        if (e.type === 'maxManaBonus' && e.dur <= 0) {
            player.maxMana = e.oldMaxMana;
            player.mana = Math.min(player.maxMana, player.mana);
            addBattleLog(`💎 Бонус максимальной маны закончился!`, 'info');
            return false;
        }
        if (e.type === 'debuff_hp' && e.dur <= 0) {
            if (player.originalMaxHealth) {
                const oldMaxHp = player.maxHealth;
                player.maxHealth = player.originalMaxHealth;
                const healthPercent = player.health / oldMaxHp;
                player.health = Math.floor(player.maxHealth * healthPercent);
                if (player.health > player.maxHealth) player.health = player.maxHealth;
                addBattleLog(`❤️ Максимальное здоровье восстановлено! Было ${oldMaxHp}, стало ${player.maxHealth}`, 'info');
                player.originalMaxHealth = null;
            }
            return false;
        }
        if (e.type && e.type.startsWith('debuff_') && e.dur <= 0) return false;
        return (e.dur || 0) > 0 || e.immune || e.shield || e.reflect || e.atk || e.def || e.dodge || e.crit || e.counterChance || e.freezeOnHit || e.freeOnDodge;
    });
    
    // Регенерация маны для мага
    if (player.class === 'Маг') player.mana = Math.min(player.maxMana, player.mana + Math.floor(player.maxMana * 0.08));
    
    // Регенерация здоровья для воина
    if (player.class === 'Воин') {
        const warriorRegen = Math.floor(player.maxHealth * 0.02);
        player.health = Math.min(player.maxHealth, player.health + warriorRegen);
        addBattleLog(`💪 Регенерация здоровья: +${warriorRegen} HP`, 'heal');
    }
    
    // Сброс ярости берсерка
    if (rageStack > 0) {
        rageStack = 0;
        addBattleLog(`💢 Накопление ярости сброшено!`, 'info');
    }
    
    // Проверка смерти монстра
    if (currentMonster.health <= 0) { victory(); return; }
    
    // Проверка смерти игрока с возможностью воскрешения
    if (player.health <= 0) {
        const hasRevive = player.abilities && player.abilities.some(a => a.reviveOnDeath && !reviveUsed);
        if (hasRevive && !reviveUsed) {
            reviveUsed = true;
            player.health = Math.floor(player.maxHealth * 0.5);
            addBattleLog(`✨ Божественное возмездие! Вы воскресли с 50% HP!`, 'success');
            isPlayerTurn = true;
            renderBattle();
            updateBattleButtons();
            return;
        }
        gameOver();
        return;
    }
    
    reduceAllCooldowns();
    saveGame();
}