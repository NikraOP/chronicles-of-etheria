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
        showBuffEffect('enemy', '⚔️');
    }
    if (type === 'def') {
        currentMonster.defense = Math.floor(originalMonsterStats.defense * (1 + value / 100));
        addBattleLog(`🛡️ Защита ${currentMonster.name} увеличена на ${value}% (${originalMonsterStats.defense} → ${currentMonster.defense})`, 'info');
        showBuffEffect('enemy', '🛡️');
    }
    if (type === 'dodge') {
        addBattleLog(`💨 Уклонение ${currentMonster.name} увеличено на ${value}% на ${duration} хода!`, 'info');
        showBuffEffect('enemy', '💨');
    }
    if (type === 'lifesteal') {
        addBattleLog(`🩸 Вампиризм ${currentMonster.name} увеличен на ${value}% на ${duration} хода!`, 'info');
        showBuffEffect('enemy', '🩸');
    }
    if (type === 'crit') {
        if (!currentMonster.activeBuffs) currentMonster.activeBuffs = {};
        currentMonster.activeBuffs.crit = { value: value, remainingTurns: duration };
        monsterCritBuff = value;
        addBattleLog(`💥 Критический шанс ${currentMonster.name} +${value}% на ${duration} хода!`, 'info');
        showBuffEffect('enemy', '💥');
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
            if (type === 'dodge') {
                addBattleLog(`💨 Бафф уклонения ${currentMonster.name} закончился!`, 'info');
            }
            if (type === 'lifesteal') {
                addBattleLog(`🩸 Бафф вампиризма ${currentMonster.name} закончился!`, 'info');
            }
            if (type === 'crit') {
                monsterCritBuff = 0;
                addBattleLog(`💥 Критический бафф ${currentMonster.name} закончился!`, 'info');
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
    const useCastGlow = ability.type !== 'damage';
    if (enemySprite && useCastGlow) {
        enemySprite.classList.add('casting-ability');
        setTimeout(() => enemySprite.classList.remove('casting-ability'), 520);
    }
    
    showFloatingText('enemy', ability.name, ability.type);
    addBattleLog(`🌀 ${currentMonster.name} использует ${ability.name}!`, 'info');
    
    if (ability.cooldown) monsterAbilityCooldowns[cdKey] = ability.cooldown;
    
    switch(ability.type) {
        case 'damage': {
            const hits = ability.hits || 1;
            const monsterAtk = getMonsterCurrentAttack();
            const critBuff = currentMonster.activeBuffs && currentMonster.activeBuffs.crit;
            let totalApplied = 0;
            for (let h = 0; h < hits; h++) {
                let dmg = Math.floor(monsterAtk * (ability.multiplier || 1));
                if (critBuff && critBuff.remainingTurns > 0 && Math.random() * 100 <= critBuff.value) {
                    dmg = Math.floor(dmg * 1.5);
                    if (h === 0) addBattleLog(`💥 Критический удар ${currentMonster.name}!`, 'crit');
                }
                const playerDef = getPlayerEffectiveDefense();
                dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
                totalApplied += applyDamageToPlayer(dmg);
            }
            if (hits > 1) addBattleLog(`⚔️ Серия из ${hits} ударов: всего ${totalApplied} урона`, 'dmg');
            if (typeof setStrikeImpact === 'function') {
                setStrikeImpact(() => floatDamage('player', totalApplied, false));
            }
            break;
        }
            
        case 'dot':
            const dotTarget = ability.target || 'player';
            const dotEffect = ability.effect || 'Яд';
            const dotValue = ability.value || 5;
            const dotDuration = ability.duration || 2;
            
            if (dotTarget === 'player') {
                const existingDot = player.temporaryEffects.find(e => e.type === 'dot_' + dotEffect);
                if (existingDot) {
                    existingDot.value = dotValue;
                    existingDot.dur = dotDuration;
                } else {
                    const dotIcons = { burn: '🔥', poison: '☠️', shock: '⚡' };
                    player.temporaryEffects.push({
                        type: 'dot_' + dotEffect,
                        value: dotValue,
                        dur: dotDuration,
                        isDot: true,
                        dotIcon: dotIcons[dotEffect] || '☠️'
                    });
                }
                addBattleLog(`☠️ ${ability.name}: вы получили эффект ${dotEffect} (${dotValue}% HP в ход на ${dotDuration} хода)!`, 'info');
                showDebuffEffect('player', dotEffect);
            } else {
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
            
            if (buffType === 'atk') {
                applyMonsterBuff('atk', buffValue, buffDuration);
            } else if (buffType === 'def') {
                applyMonsterBuff('def', buffValue, buffDuration);
            } else if (buffType === 'dodge') {
                applyMonsterBuff('dodge', buffValue, buffDuration);
            } else if (buffType === 'crit') {
                applyMonsterBuff('crit', buffValue, buffDuration);
            } else if (buffType === 'reflect') {
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
            } else if (buffType === 'lifesteal') {
                applyMonsterBuff('lifesteal', buffValue, buffDuration);
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
            const debuffType = ability.effect;
            const debuffValue = ability.value || 20;
            const debuffDuration = ability.duration || 2;
            
            const existingDebuff = player.temporaryEffects.find(e => e.type === 'debuff_' + debuffType);
            if (existingDebuff) {
                existingDebuff.value = debuffValue;
                existingDebuff.dur = debuffDuration;
            } else {
                player.temporaryEffects.push({ 
                    type: 'debuff_' + debuffType, 
                    value: debuffValue, 
                    dur: debuffDuration 
                });
            }
            
            let debuffIcon = '😵';
            let effectText = '';
            
            switch(debuffType) {
                case 'atk': debuffIcon = '⚔️'; effectText = 'атака'; break;
                case 'def': debuffIcon = '🛡️'; effectText = 'защита'; break;
                case 'dodge': debuffIcon = '💨'; effectText = 'уклонение'; break;
                case 'all': debuffIcon = '😵'; effectText = 'все характеристики'; break;
                case 'freeze': debuffIcon = '❄️'; effectText = 'заморозка'; break;
                case 'blind': debuffIcon = '👁️'; effectText = 'ослепление'; break;
                case 'slow': debuffIcon = '🐢'; effectText = 'замедление'; break;
                case 'hp': debuffIcon = '❤️'; effectText = 'здоровье'; break;
                default: effectText = 'характеристики';
            }
            
            const durLabel = debuffDuration === 1 ? '1 ваш ход' : debuffDuration + ' ваших хода';
            if (debuffType === 'slow') {
                addBattleLog(`${debuffIcon} ${ability.name}: ${effectText}, −${debuffValue}% к атаке на ${durLabel}!`, 'error');
            } else if (debuffType === 'freeze') {
                addBattleLog(`${debuffIcon} ${ability.name}: ${effectText} на ${durLabel}!`, 'error');
            } else if (debuffValue) {
                addBattleLog(`${debuffIcon} ${ability.name}: ${effectText} −${debuffValue}% на ${durLabel}!`, 'error');
            } else {
                addBattleLog(`${debuffIcon} ${ability.name}: ${effectText} на ${durLabel}!`, 'error');
            }
            showDebuffEffect('player', debuffType);
            
            if (debuffType === 'freeze') {
                playerFrozenTurns = Math.max(playerFrozenTurns, debuffDuration);
                addBattleLog(`❄️ Вы заморожены на ${debuffDuration} ход(ов)!`, 'error');
            }
            
            if (debuffType === 'hp') {
                const hpReductionPercent = debuffValue;
                if (!player.originalMaxHealth) {
                    player.originalMaxHealth = player.maxHealth;
                }
                const newMaxHealth = Math.max(10, Math.floor(player.originalMaxHealth * (1 - hpReductionPercent / 100)));
                const oldMaxHealth = player.maxHealth;
                player.maxHealth = newMaxHealth;
                if (player.health > player.maxHealth) {
                    player.health = player.maxHealth;
                }
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
    if (document.getElementById('battleArena')) {
        updateBattleVitality();
    } else {
        renderBattle();
    }
    return true;
}

function monsterTurn() {
    if (!currentMonster || currentMonster.health <= 0) { 
        isPlayerTurn = true; 
        updateBattleButtons(); 
        return; 
    }

    if (typeof setStrikeImpact === 'function') setStrikeImpact(null);
    updateMonsterBuffs();

    if (currentMonster.dotOverTime && currentMonster.dotOverTime.remaining > 0) {
        const dotDmg = Math.floor(getPlayerEffectiveAttack() * currentMonster.dotOverTime.dmgPercent / 100);
        const applied = applyDamageToMonster(dotDmg);
        addBattleLog(`🌪️ Продолжительный урон: ${applied}!`, 'dmg');
        currentMonster.dotOverTime.remaining--;
        if (currentMonster.health <= 0) { victory(); return; }
    }

    if (summonedSpirit) {
        const spiritDamage = Math.floor(player.attack * 0.8);
        const appliedDamage = applyDamageToMonster(spiritDamage);
        addBattleLog(`🌿 Дух природы наносит ${appliedDamage} урона!`, 'dmg');
        summonedSpirit = false;
    }
    
    if (lingeringCloud && currentMonster.effects.some(e => e.type === 'Яд')) {
        const cloudDamage = Math.floor(currentMonster.maxHealth * 0.05);
        const appliedDamage = applyDamageToMonster(cloudDamage);
        addBattleLog(`☁️ Ядовитое облако наносит ${appliedDamage} урона!`, 'dmg');
    }
    
    const stunEffect = currentMonster.effects.find(e => e.type === 'Оглушение' || e.type === 'Заморозка');
    if (stunEffect) {
        addBattleLog(`${currentMonster.name} ${stunEffect.type === 'Оглушение' ? 'оглушён' : 'заморожен'} и пропускает ход!`, 'info');
        stunEffect.dur--;
        if (stunEffect.dur <= 0) currentMonster.effects = currentMonster.effects.filter(e => e !== stunEffect);
        finishMonsterPhase();
        onPlayerTurnStart();
        if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
        else renderBattle();
        return;
    }
    
    const immune = player.temporaryEffects.find(e => e.immune);
    if (immune) {
        addBattleLog('🛡️ Иммунитет! Монстр не может атаковать!', 'info');
        immune.dur--;
        if (immune.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== immune);
        finishMonsterPhase();
        onPlayerTurnStart();
        if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
        else renderBattle();
        return;
    }
    
    let abilityUsed = false;
    if (currentMonster.abilities && currentMonster.abilities.length > 0) {
        const sortedAbilities = [...currentMonster.abilities].sort((a, b) => {
            const priority = { 'heal': 1, 'buff': 2, 'shield': 2, 'debuff': 3, 'dot': 3, 'damage': 4 };
            return (priority[a.type] || 5) - (priority[b.type] || 5);
        });
        
        for (let ability of sortedAbilities) {
            if (ability.type === 'buff' && ability.effect === 'atk' && currentMonster.activeBuffs && currentMonster.activeBuffs.atk) continue;
            if (ability.type === 'buff' && ability.effect === 'def' && currentMonster.activeBuffs && currentMonster.activeBuffs.def) continue;
            if (ability.type === 'buff' && ability.effect === 'dodge' && currentMonster.activeBuffs && currentMonster.activeBuffs.dodge) continue;
            if (ability.type === 'buff' && ability.effect === 'shield' && currentMonster.activeBuffs && currentMonster.activeBuffs.shield) continue;
            if (ability.type === 'buff' && ability.effect === 'reflect' && currentMonster.activeBuffs && currentMonster.activeBuffs.reflect) continue;
            if (ability.type === 'buff' && ability.effect === 'lifesteal' && currentMonster.activeBuffs && currentMonster.activeBuffs.lifesteal) continue;
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
    
    if (!abilityUsed) {
        if (monsterAttackMissesFromBlind()) {
            addBattleLog(`👁️ ${currentMonster.name} ослеплён и промахивается!`, 'info');
            finishMonsterPhase();
            onPlayerTurnStart();
            if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
            else renderBattle();
            return;
        }
        const monsterAtk = getMonsterCurrentAttack();
        let dmg = Math.floor(monsterAtk);
        const playerDef = getPlayerEffectiveDefense();
        dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
        
        // ПОЛУЧАЕМ БАФФЫ МОНСТРА
        const lifestealBuff = currentMonster.activeBuffs ? currentMonster.activeBuffs.lifesteal : null;
        let lifestealValue = lifestealBuff ? lifestealBuff.value : 0;
        
        const dodgeBuff = currentMonster.activeBuffs ? currentMonster.activeBuffs.dodge : null;
        let monsterDodgeBonus = dodgeBuff ? dodgeBuff.value : 0;
        
        // ПРОВЕРКА УКЛОНЕНИЯ МОНСТРА (базовое уклонение + бафф)
        let monsterDodge = 0;
        if (monsterDodgeBonus > 0) {
            monsterDodge = Math.min(50, monsterDodgeBonus);
            addBattleLog(`💨 ${currentMonster.name} уклоняется с шансом ${monsterDodge}%!`, 'info');
        }
        
        if (monsterDodge > 0 && Math.random() * 100 <= monsterDodge) {
            addBattleLog(`💨 ${currentMonster.name} уклонился от атаки!`, 'info');
            // Монстр уклонился, ничего не делаем
        } else {
            // КОНТРАТАКА ИГРОКА
            const counter = player.temporaryEffects.find(e => e.counterChance);
            if (counter && Math.random() * 100 <= counter.counterChance) {
                const counterDmg = Math.floor(getPlayerEffectiveAttack() * (counter.counterDmg || 80) / 100);
                const appliedCounter = applyDamageToMonster(counterDmg);
                addBattleLog(`↩️ Контратака! ${appliedCounter} урона!`, 'dmg');
                if (currentMonster.health <= 0) { victory(); return; }
            }
            
            // ОТРАЖЕНИЕ УРОНА ИГРОКОМ (при атаке монстра)
            const reflectEffect = player.temporaryEffects.find(e => e.reflect);
            if (reflectEffect && reflectEffect.reflect > 0 && dmg > 0) {
                const reflectedDmg = Math.floor(dmg * reflectEffect.reflect / 100);
                applyDamageToMonster(reflectedDmg);
                addBattleLog(`↩️ Отражено ${reflectedDmg} урона!`, 'dmg');
                reflectEffect.dur--;
                if (reflectEffect.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== reflectEffect);
                if (currentMonster.health <= 0) { victory(); return; }
            }
            
            // ЗАМОРОЗКА АТАКУЮЩЕГО
            const freezeOnHit = player.temporaryEffects.find(e => e.freezeOnHit);
            if (freezeOnHit && dmg > 0) {
                currentMonster.effects.push({ type: 'Заморозка', dur: 1 });
                addBattleLog(`❄️ Монстр заморожен!`, 'info');
            }
            
            // НАНЕСЕНИЕ УРОНА
            if (dmg > 0) {
                const appliedDamage = applyDamageToPlayer(dmg);
                if (appliedDamage > 0) {
                    addBattleLog(`👊 ${currentMonster.name} наносит ${appliedDamage} урона!`, 'dmg');
                    if (typeof setStrikeImpact === 'function') {
                        setStrikeImpact(() => floatDamage('player', appliedDamage, false));
                    }
                }
                
                // ВАМПИРИЗМ МОНСТРА
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
    }
    
    const monsterImpactFn = typeof consumeStrikeImpact === 'function' ? consumeStrikeImpact() : null;

    animateEnemyAttack(() => {
        if (player.health <= 0) { 
            const reviveAb = player.abilities && player.abilities.find(a => (a.reviveOnDeath || a.reviveOnce) && !reviveUsed);
            if (reviveAb && !reviveUsed) {
                reviveUsed = true;
                const hpPct = reviveAb.reviveHp || reviveAb.revive || 50;
                player.health = Math.floor(player.maxHealth * hpPct / 100);
                addBattleLog(`✨ ${reviveAb.name}! Вы воскресли с ${hpPct}% HP!`, 'success');
                finishMonsterPhase();
                onPlayerTurnStart();
                if (typeof safeRenderBattle === 'function') safeRenderBattle();
                else renderBattle({ force: true });
                return;
            }
            gameOver(); 
            return; 
        }
        finishMonsterPhase();
        onPlayerTurnStart();
    }, {
        onImpact: monsterImpactFn || undefined,
        onAnimEnd: () => syncBattleDisplayAfterAnim()
    });
    
    if (currentMonster.effects && currentMonster.effects.length > 0) {
        currentMonster.effects = currentMonster.effects.filter(e => { 
            if (e.type === 'Оглушение' || e.type === 'Заморозка') return e.dur > 0;
            if (e.val && typeof isMonsterDotEffectType === 'function' && isMonsterDotEffectType(e.type)) {
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
    
    player.temporaryEffects = player.temporaryEffects.filter(e => {
        // Дебаффы тикают после хода игрока (tickPlayerDebuffsAfterPlayerTurn), не здесь
        if (e.dur && !(e.type && e.type.startsWith('debuff_'))) e.dur--;
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
        if (e.type && e.type.startsWith('debuff_')) return true;
        return (e.dur || 0) > 0 || e.immune || e.shield || e.reflect || e.atk || e.def || e.dodge || e.crit || e.counterChance || e.freezeOnHit || e.freeOnDodge;
    });
    
    if (player.class === 'Маг') player.mana = Math.min(player.maxMana, player.mana + Math.floor(player.maxMana * 0.08));
    if (player.class === 'Воин') {
        const warriorRegen = Math.floor(player.maxHealth * 0.02);
        player.health = Math.min(player.maxHealth, player.health + warriorRegen);
        addBattleLog(`💪 Регенерация здоровья: +${warriorRegen} HP`, 'heal');
    }
    
    if (rageStack > 0) {
        rageStack = 0;
        addBattleLog(`💢 Накопление ярости сброшено!`, 'info');
    }
    
    if (currentMonster.health <= 0) { victory(); return; }
    if (player.health <= 0) {
        const reviveAb2 = player.abilities && player.abilities.find(a => (a.reviveOnDeath || a.reviveOnce) && !reviveUsed);
        if (reviveAb2 && !reviveUsed) {
            reviveUsed = true;
            const hpPct2 = reviveAb2.reviveHp || reviveAb2.revive || 50;
            player.health = Math.floor(player.maxHealth * hpPct2 / 100);
            addBattleLog(`✨ ${reviveAb2.name}! Вы воскресли с ${hpPct2}% HP!`, 'success');
            onPlayerTurnStart();
            renderBattle();
            return;
        }
        gameOver();
        return;
    }
    
}