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
    if (ability.chance && Math.random() * 100 > ability.chance) return 'chance_fail';
    
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
            const strikeTarget = typeof pickMonsterCombatTargetForAbility === 'function'
                ? pickMonsterCombatTargetForAbility(ability)
                : (typeof pickMonsterCombatTarget === 'function' ? pickMonsterCombatTarget() : 'player');
            let totalApplied = 0;
            let lastTarget = strikeTarget;
            for (let h = 0; h < hits; h++) {
                let dmg = Math.floor(monsterAtk * (ability.multiplier || 1));
                if (critBuff && critBuff.remainingTurns > 0 && Math.random() * 100 <= critBuff.value) {
                    dmg = Math.floor(dmg * 1.5);
                    if (h === 0) addBattleLog(`💥 Критический удар ${currentMonster.name}!`, 'crit');
                }
                const hit = applyMonsterDamageToTarget(dmg, strikeTarget);
                totalApplied += hit.applied;
                lastTarget = hit.target;
                if (hits === 1 && hit.applied > 0) {
                    const targetLabel = hit.target === 'ally' ? 'союзнику' : 'вам';
                    addBattleLog(`⚔️ ${currentMonster.name} бьёт ${targetLabel}: ${hit.applied} урона`, 'dmg');
                }
            }
            if (hits > 1) addBattleLog(`⚔️ Серия из ${hits} ударов: всего ${totalApplied} урона`, 'dmg');
            if (typeof setStrikeImpact === 'function') {
                setStrikeImpact(() => floatDamage(lastTarget, totalApplied, false));
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
            
            if (ability.purgeBurn && currentMonster.effects) {
                const hadBurn = currentMonster.effects.some(function (e) { return e.type === 'Горение'; });
                if (hadBurn) {
                    currentMonster.effects = currentMonster.effects.filter(function (e) {
                        return e.type !== 'Горение';
                    });
                    addBattleLog(`🔥 ${ability.name}: поглощает горение и усиливает атаку!`, 'info');
                    showBuffEffect('enemy', '🔥');
                }
            }
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
    if (typeof recordMonsterAbilityForMonsterAi === 'function') {
        recordMonsterAbilityForMonsterAi(ability);
    }
    return true;
}

/** Тики конца хода монстра (DoT на враге, реген, проверка победы/поражения). @returns {boolean} true — бой остановлен */
function applyMonsterTurnEndTicks() {
    if (!currentMonster) return true;
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
    if (currentMonster.health <= 0) {
        return !tryVictoryAfterEnemyDown();
    }
    if (typeof resolvePlayerDefeatInBattle === 'function') {
        return resolvePlayerDefeatInBattle() === 'defeated';
    }
    if (player.health <= 0) {
        gameOver();
        return true;
    }
    return false;
}

function monsterTurn() {
    if (window.pvpBattleActive) return;
    if (window.dungeonDuoBattleActive && typeof getDuoDungeonState === 'function') {
        const duo = getDuoDungeonState();
        if (duo.role !== 'host') return;
    }
    if (window._monsterTurnBusy) {
        if (!currentMonster || currentMonster.health <= 0) {
            window._monsterTurnBusy = false;
            if (typeof finishMonsterTurnOrQueue === 'function') finishMonsterTurnOrQueue();
            return;
        }
        if (typeof scheduleMonsterTurn === 'function') scheduleMonsterTurn(120);
        return;
    }
    if (!currentMonster || currentMonster.health <= 0) {
        if (typeof finishMonsterTurnOrQueue === 'function') finishMonsterTurnOrQueue();
        return;
    }
    window._monsterTurnBusy = true;

    if (typeof setStrikeImpact === 'function') setStrikeImpact(null);
    updateMonsterBuffs();

    if ((currentMonster.armorShredTurns || 0) > 0) {
        currentMonster.armorShredTurns--;
        if (currentMonster.armorShredTurns <= 0) currentMonster.armorShred = 0;
    }

    if (currentMonster.dotOverTime && currentMonster.dotOverTime.remaining > 0) {
        const dotDmg = Math.floor(getPlayerEffectiveAttack() * currentMonster.dotOverTime.dmgPercent / 100);
        const applied = applyDamageToMonster(dotDmg);
        addBattleLog(`🌪️ Продолжительный урон: ${applied}!`, 'dmg');
        currentMonster.dotOverTime.remaining--;
        if (typeof afterMonsterHitResolution === 'function' && afterMonsterHitResolution() === 'stop') {
            return;
        }
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
        finishMonsterTurnOrQueue();
        if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
        else renderBattle();
        return;
    }
    
    const immune = player.temporaryEffects.find(e => e.immune);
    if (immune) {
        addBattleLog('🛡️ Иммунитет! Монстр не может атаковать!', 'info');
        immune.dur--;
        if (immune.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== immune);
        finishMonsterTurnOrQueue();
        if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
        else renderBattle();
        return;
    }
    
    let abilityUsed = false;
    if (currentMonster.abilities && currentMonster.abilities.length > 0) {
        const ranked = typeof pickMonsterTacticalAbilities === 'function'
            ? pickMonsterTacticalAbilities(currentMonster.abilities)
            : currentMonster.abilities.map(a => ({ ability: a, score: 0 }));
        const aiCtx = typeof buildMonsterAiContext === 'function' ? buildMonsterAiContext() : null;

        let damageChanceMissed = false;
        const classifyRole = typeof classifyMonsterAbilityRole === 'function'
            ? classifyMonsterAbilityRole
            : () => 'other';
        for (let i = 0; i < ranked.length; i++) {
            const ability = ranked[i].ability;
            if (damageChanceMissed && classifyRole(ability) !== 'finisher') continue;
            const hint = aiCtx && typeof getMonsterTacticalHint === 'function'
                ? getMonsterTacticalHint(ability, aiCtx)
                : '';
            if (hint) addBattleLog(`${hint}: ${currentMonster.name} выбирает «${ability.name}»`, 'info');
            const used = useMonsterAbility(ability);
            if (used === true) {
                abilityUsed = true;
                if (typeof afterMonsterHitResolution === 'function' && afterMonsterHitResolution() === 'stop') {
                    return;
                }
                break;
            }
            if (used === 'chance_fail' && ability.type === 'damage') damageChanceMissed = true;
        }
    }

    // Обработка DoT эффектов на игроке
    if (player.temporaryEffects && player.temporaryEffects.length > 0) {
        player.temporaryEffects = player.temporaryEffects.filter(e => {
            if (e.isDot && e.value) {
                const dotDamage = Math.floor(player.maxHealth * e.value / 100);
                if (dotDamage > 0) {
                    player.health = Math.max(0, player.health - dotDamage);
                    const icon = e.dotIcon || '🔥';
                    addBattleLog(`${icon} ${e.type}: -${dotDamage} урона!`, 'dmg');
                    floatDamage('player', dotDamage, false);
                    if (player.health <= 0 && typeof resolvePlayerDefeatInBattle === 'function') {
                        resolvePlayerDefeatInBattle();
                    }
                }
                e.dur--;
                return e.dur > 0;
            }
            return true;
        });
        if (!currentMonster) {
            window._monsterTurnBusy = false;
            return;
        }
        if (player.health <= 0) {
            if (typeof resolvePlayerDefeatInBattle === 'function') resolvePlayerDefeatInBattle();
            window._monsterTurnBusy = false;
            return;
        }
    }
    
    if (!abilityUsed) {
        if (monsterAttackMissesFromBlind()) {
            addBattleLog(`👁️ ${currentMonster.name} ослеплён и промахивается!`, 'info');
            finishMonsterTurnOrQueue();
            if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
            else renderBattle();
            return;
        }
        const monsterAtk = getMonsterCurrentAttack();
        let dmg = Math.floor(monsterAtk);
        const combatTarget = typeof pickMonsterCombatTarget === 'function'
            ? pickMonsterCombatTarget()
            : 'player';
        const playerDef = combatTarget === 'ally'
            ? getAllyEffectiveDefense()
            : getPlayerEffectiveDefense();
        const debuffs = combatTarget === 'ally' ? [] : player.temporaryEffects;
        dmg = calculateDamageWithDebuffs(dmg, playerDef, debuffs);
        
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
                if (typeof afterMonsterHitResolution === 'function' && afterMonsterHitResolution() === 'stop') {
                    return;
                }
            }
            
            // ОТРАЖЕНИЕ УРОНА ИГРОКОМ (при атаке монстра)
            const reflectEffect = player.temporaryEffects.find(e => e.reflect);
            if (reflectEffect && reflectEffect.reflect > 0 && dmg > 0) {
                const reflectedDmg = Math.floor(dmg * reflectEffect.reflect / 100);
                applyDamageToMonster(reflectedDmg);
                addBattleLog(`↩️ Отражено ${reflectedDmg} урона!`, 'dmg');
                reflectEffect.dur--;
                if (reflectEffect.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== reflectEffect);
                if (typeof afterMonsterHitResolution === 'function' && afterMonsterHitResolution() === 'stop') {
                    return;
                }
            }
            
            // ЗАМОРОЗКА АТАКУЮЩЕГО
            const freezeOnHit = player.temporaryEffects.find(e => e.freezeOnHit);
            if (freezeOnHit && dmg > 0) {
                if (typeof upsertMonsterStatusEffect === 'function') {
                    upsertMonsterStatusEffect(currentMonster, { type: 'Заморозка', dur: 1 });
                } else if (currentMonster.effects) {
                    const existing = currentMonster.effects.find(function (e) { return e.type === 'Заморозка'; });
                    if (existing) existing.dur = Math.max(existing.dur || 0, 1);
                    else currentMonster.effects.push({ type: 'Заморозка', dur: 1 });
                }
                addBattleLog(`❄️ Монстр заморожен!`, 'info');
            }
            
            // НАНЕСЕНИЕ УРОНА
            if (dmg > 0) {
                const appliedDamage = combatTarget === 'ally'
                    ? applyDamageToAlly(dmg)
                    : applyDamageToPlayer(dmg);
                if (appliedDamage > 0) {
                    const who = combatTarget === 'ally' ? 'союзнику' : 'вам';
                    addBattleLog(`👊 ${currentMonster.name} наносит ${appliedDamage} урона ${who}!`, 'dmg');
                    if (typeof setStrikeImpact === 'function') {
                        setStrikeImpact(() => floatDamage(combatTarget, appliedDamage, false));
                    }
                }
                
                // ВАМПИРИЗМ МОНСТРА
                if (lifestealValue > 0 && appliedDamage > 0) {
                    const healAmount = Math.floor(appliedDamage * lifestealValue / 100);
                    currentMonster.health = Math.min(currentMonster.maxHealth, currentMonster.health + healAmount);
                    addBattleLog(`🩸 Монстр восстанавливает ${healAmount} HP!`, 'heal');
                }
            }
        }
    }

    if (!currentMonster) {
        window._monsterTurnBusy = false;
        return;
    }
    
    if (abilityUsed) {
        if (typeof syncBattleDisplayAfterAnim === 'function') syncBattleDisplayAfterAnim();
        else if (typeof renderBattle === 'function') renderBattle({ force: true });
        if (applyMonsterTurnEndTicks()) {
            window._monsterTurnBusy = false;
            return;
        }
        finishMonsterTurnOrQueue();
        return;
    }

    const monsterImpactFn = typeof consumeStrikeImpact === 'function' ? consumeStrikeImpact() : null;

    animateEnemyAttack(() => {
        if (!currentMonster) {
            window._monsterTurnBusy = false;
            return;
        }
        if (applyMonsterTurnEndTicks()) {
            window._monsterTurnBusy = false;
            return;
        }
        finishMonsterTurnOrQueue();
    }, {
        onImpact: monsterImpactFn || undefined,
        onAnimEnd: () => {
            syncBattleDisplayAfterAnim();
            if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
        }
    });
}