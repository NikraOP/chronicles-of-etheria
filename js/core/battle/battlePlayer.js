// js/core/battle/battlePlayer.js

function getScaledAbilityManaCost(rawCost) {
    let c = rawCost || 0;
    if (c > 0 && typeof getGlobalManaCostMult === 'function') {
        c = Math.max(0, Math.ceil(c * getGlobalManaCostMult(player)));
    }
    return c;
}

function applyLessonAbilityDmgMult(dmg) {
    if (!dmg) return 0;
    if (typeof getGlobalAbilityDmgMult === 'function') {
        return Math.floor(dmg * getGlobalAbilityDmgMult(player));
    }
    return dmg;
}

function applyLessonHealMult(amount) {
    if (!amount) return 0;
    if (typeof getHealPotencyMult === 'function') {
        return Math.floor(amount * getHealPotencyMult(player));
    }
    return amount;
}

const MONSTER_CC_EFFECT_TYPES = ['Заморозка', 'Оглушение'];

function upsertMonsterStatusEffect(monster, effectEntry) {
    if (!monster || !effectEntry || !effectEntry.type) return;
    if (!monster.effects) monster.effects = [];
    if (MONSTER_CC_EFFECT_TYPES.indexOf(effectEntry.type) >= 0) {
        const existing = monster.effects.find(function (e) { return e.type === effectEntry.type; });
        if (existing) {
            existing.dur = Math.max(existing.dur || 0, effectEntry.dur || 1);
            if (effectEntry.val != null) existing.val = effectEntry.val;
            if (effectEntry.spread != null) existing.spread = effectEntry.spread;
            if (effectEntry.manaRegen != null) existing.manaRegen = effectEntry.manaRegen;
            return;
        }
    }
    monster.effects.push(effectEntry);
}

function applyAoeMonsterSideEffects(m, a, doubleThisCast) {
    if (!m || m.health <= 0) return;
    if (a.effect) {
        let effectDur = a.effect.dur;
        let effectVal = a.effect.val ?? a.effect.value;
        if (effectVal != null && typeof getLessonEffectMultiplier === 'function') {
            effectVal = Math.floor(effectVal * getLessonEffectMultiplier(player, a.effect.type));
        }
        if (doubleThisCast) {
            effectDur = Math.floor(effectDur * 1.5);
            effectVal = Math.floor(effectVal * 1.5);
        }
        if (a.effect.type === 'Смертельный яд') {
            m.damageAmp = 2;
        } else {
            upsertMonsterStatusEffect(m, {
                type: a.effect.type,
                dur: effectDur,
                val: effectVal,
                spread: a.effect.spread,
                manaRegen: a.effect.manaRegen
            });
        }
    }
    if (a.enemyDebuff) {
        m.armorShred = (m.armorShred || 0) + a.enemyDebuff.value;
        if (a.enemyDebuff.dur) {
            m.armorShredTurns = Math.max(m.armorShredTurns || 0, a.enemyDebuff.dur);
        }
    }
    if (a.dotOverTime) {
        m.dotOverTime = { remaining: a.dotOverTime.dur, dmgPercent: a.dotOverTime.dmgPerTurn };
    }
    if (a.groundBuff === 'lava') m.fireVuln = a.value;
    if (a.fireVuln) m.fireVuln = a.fireVuln;
    if (a.armorShred) m.armorShred = (m.armorShred || 0) + a.armorShred;
    if (a.freezeExtend && m.effects) {
        m.effects.forEach(function (e) {
            if (e.type === 'Заморозка') e.dur *= 2;
        });
    }
    if (a.markAll) {
        m.marked = true;
        m.markBonus = a.mark || 40;
    }
}

function spreadAoeMonsterEffects(a, doubleThisCast) {
    if (!a.aoe || typeof forEachLivingBattleEnemy !== 'function') return;
    const primaryIdx = typeof getBattleEnemyFocusIndex === 'function' ? getBattleEnemyFocusIndex() : 0;
    forEachLivingBattleEnemy(function (m, idx) {
        if (idx === primaryIdx) return;
        applyAoeMonsterSideEffects(m, a, doubleThisCast);
    });
}

function resolveHitDamageForFocusedMonster(baseDmg, a) {
    let hitDmg = baseDmg;
    const defenseAlreadyApplied = a.ignoreDef || a.armorShred || a.ignoreAll;
    if (currentMonster.damageAmp > 1) {
        hitDmg = Math.floor(hitDmg * currentMonster.damageAmp);
        currentMonster.damageAmp = 1;
    }
    if (hitDmg > 0 && !defenseAlreadyApplied) {
        hitDmg = calculateDamageWithShred(hitDmg, getMonsterCurrentDefense(), currentMonster.armorShred || 0);
    } else if (hitDmg > 0 && a.pierce) {
        hitDmg = calculateDamage(hitDmg, 0);
    } else if (hitDmg > 0 && a.ignoreDef) {
        const effDef = Math.floor(getMonsterCurrentDefense() * (1 - a.ignoreDef / 100));
        hitDmg = calculateDamage(hitDmg, effDef);
    }
    return hitDmg;
}

function applyAbilityDamageAtTargets(a, baseDmg, ignoreShields) {
    if (a.aoe && typeof forEachLivingBattleEnemy === 'function' && getBattleEnemySlotCount() > 0) {
        let totalApplied = 0;
        const aoeHits = [];
        forEachLivingBattleEnemy(function (m, idx) {
            const hitDmg = resolveHitDamageForFocusedMonster(baseDmg, a);
            const applied = applyDamageToMonster(hitDmg, ignoreShields);
            totalApplied += applied;
            applyMonsterReflectDamage(applied);
            if (applied > 0) aoeHits.push({ index: idx, damage: applied, crit: false });
        });
        window._lastAoeVisualHits = aoeHits;
        return totalApplied;
    }
    window._lastAoeVisualHits = null;
    const hitDmg = resolveHitDamageForFocusedMonster(baseDmg, a);
    const applied = applyDamageToMonster(hitDmg, ignoreShields);
    applyMonsterReflectDamage(applied);
    return applied;
}

function requireBattleEngaged() {
    if (typeof isBattleEngaged === 'function' && !isBattleEngaged()) {
        if (typeof addMessage === 'function') addMessage('⚔️ Сначала нажмите «В бой» на поле сражения.', 'error');
        return false;
    }
    return true;
}

function playerAttack() {
    if (!requireBattleEngaged()) return;
    if (typeof isBattleTargetingActive === 'function' && isBattleTargetingActive()) return;
    if (!beginPlayerAction()) return;

    const beginAttack = function (targetKind, targetIndex) {
        executePlayerAttackAtTarget(targetKind, targetIndex);
    };

    if (typeof beginBattleTargeting === 'function') {
        const forceTarget = typeof isDungeonBattleContext === 'function' && isDungeonBattleContext();
        if (!forceTarget && getBattleEnemySlotCount() <= 1) {
            if (typeof focusBattleEnemyAtIndex === 'function') focusBattleEnemyAtIndex(0);
            beginAttack('enemy', 0);
            return;
        }
        if (typeof closeBattleAbilitiesMenu === 'function') closeBattleAbilitiesMenu();
        beginBattleTargeting({
            type: 'attack',
            targeting: 'enemy',
            validKinds: ['enemy'],
            hint: '🎯 Выберите врага для атаки',
            handler: beginAttack
        });
        return;
    }

    executePlayerAttackAtTarget('enemy', 0);
}

function executePlayerAttackAtTarget(targetKind, targetIndex) {
    if (targetKind === 'enemy' && typeof focusBattleEnemyAtIndex === 'function') {
        focusBattleEnemyAtIndex(targetIndex);
    }
    if (playerAttackMissesFromBlind()) {
        addBattleLog('👁️ Ослепление — промах!', 'error');
        isPlayerTurn = false;
        updateBattleButtons();
        endPlayerActionChain();
        renderBattle();
        return;
    }
    if (monsterDodgesPlayerHit()) {
        addBattleLog(`💨 ${currentMonster.name} уклонился от атаки!`, 'info');
        isPlayerTurn = false;
        updateBattleButtons();
        endPlayerActionChain();
        renderBattle();
        return;
    }
    isPlayerTurn = false;
    updateBattleButtons();
    if (typeof recordPlayerActionForMonsterAi === 'function') {
        recordPlayerActionForMonsterAi({ kind: 'attack' });
    }

    let dmg = getPlayerEffectiveAttack();
    
    if (nextAttackBonus > 0) {
        dmg = Math.floor(dmg * (1 + nextAttackBonus / 100));
        addBattleLog(`⚡ Бонус следующей атаки: +${nextAttackBonus}%!`, 'crit');
        nextAttackBonus = 0;
    }
    dmg = Math.floor(dmg * getWeakspotDamageMultiplier());
    if (currentMonster.damageAmp > 1) {
        dmg = Math.floor(dmg * currentMonster.damageAmp);
        currentMonster.damageAmp = 1;
        addBattleLog(`☠️ Удвоенный урон от яда!`, 'crit');
    }
    let crit = nextCritGuaranteed || Math.random() * 100 <= player.criticalChance;
    if (nextCritGuaranteed) nextCritGuaranteed = false;
    if (crit) dmg = Math.floor(dmg * (player.criticalDamage / 100));
    dmg = calculateDamageWithShred(dmg, getMonsterCurrentDefense(), currentMonster.armorShred || 0);

    const appliedDamage = applyDamageToMonster(dmg);
    applyMonsterReflectDamage(appliedDamage);
    const msg = (crit ? '💥 КРИТ! ' : '⚔️ ') + appliedDamage + ' урона';
    addBattleLog(msg, crit ? 'crit' : 'dmg');

    if (window.dungeonDuoBattleActive && typeof pushDungeonDuoBattleVisual === 'function') {
        const focusIdx = typeof getBattleFocusIndex === 'function' ? getBattleFocusIndex() : 0;
        pushDungeonDuoBattleVisual({
            action: 'attack',
            damage: appliedDamage,
            crit: crit,
            targetIndex: focusIdx,
            heavy: crit
        });
    }

    animatePlayerAttack(() => {
        if (currentMonster.health <= 0) {
            if (tryVictoryAfterEnemyDown()) endPlayerActionChain();
            return;
        }
        endPlayerActionChain();
    }, {
        onImpact: () => floatDamage('enemy', appliedDamage, crit),
        isCrit: crit,
        onAnimEnd: () => syncBattleDisplayAfterAnim()
    });
    updateBattleVitality();
    setTimeout(() => { if (typeof saveGame === 'function') saveGame(); }, 0);
}

function attemptDodge() {
    if (!requireBattleEngaged()) return;
    if (!beginPlayerAction()) return;
    isPlayerTurn = false;
    updateBattleButtons();
    
    const totalDodge = getPlayerEffectiveDodge();
    
    addBattleLog(`💨 Попытка уклониться... (шанс ${totalDodge}%)`, 'info');
    
    if (Math.random() * 100 <= totalDodge) {
        addBattleLog('✅ Уклонились! Монстр промахнулся!', 'success');
        
        const hasFreeOnDodge = player.temporaryEffects.some(e => e.freeOnDodge);
        if (hasFreeOnDodge) {
            nextFreeMana = true;
            addBattleLog(`🔄 Уклонение активировало бесплатный выстрел!`, 'info');
        }

        if (window.pvpBattleActive) {
            window.pvpDodgeSkipOpponent = true;
            if (typeof window.pvpOnEndPlayerActionChain === 'function') {
                window.pvpOnEndPlayerActionChain();
            }
            renderBattle();
            return;
        }
        
        finishMonsterPhase();
        onPlayerTurnStart();
        renderBattle();
    } else {
        addBattleLog('❌ Не удалось уклониться! Монстр атакует!', 'error');
        if (window.pvpBattleActive && typeof window.pvpOnDodgeFailed === 'function') {
            window.pvpOnDodgeFailed();
            renderBattle();
            return;
        }
        if (typeof startMonsterPhaseAfterPlayer === 'function') startMonsterPhaseAfterPlayer();
        else setTimeout(() => { monsterTurn(); }, 500);
    }
    renderBattle();
}

function closeBattleAbilitiesMenu() {
    if (!window._battleAbilitiesMenuOpen) return false;
    window._battleAbilitiesMenuOpen = false;
    if (typeof renderBattle === 'function') renderBattle();
    return true;
}

function showBattleAbilities() {
    if (!requireBattleEngaged()) return;
    if (!currentMonster) return;
    window._battleAbilitiesMenuOpen = true;
    let html = '<h3>✨ Способности</h3><p class="battle-abilities-hint">Esc — назад к бою</p><div class="ability-grid">';
    player.abilities.forEach((a, i) => {
        const onCd = a.currentCooldown > 0;
        const noMana = player.class === 'Маг' && a.mana && player.mana < a.mana;
        const isPassive = a.passive;
        let stats = '';
        if (a.dmg) stats += '<span>⚔️' + a.dmg + '%</span>';
        if (a.mana && player.class === 'Маг') stats += '<span>💎' + a.mana + '</span>';
        if (a.cd) stats += '<span>⏱️КД:' + a.cd + '</span>';
        if (a.lifesteal) stats += '<span>🩸' + a.lifesteal + '%</span>';
        if (a.heal) stats += '<span>💚' + a.heal + '%</span>';
        if (a.immune) stats += '<span>🛡️Иммун</span>';
        if (a.reflect) stats += '<span>↩️Отражение:' + a.reflect + '%</span>';
        if (a.aoe) stats += '<span>🌪️AoE</span>';
        if (a.effect) stats += '<span>🌀' + a.effect.type + '</span>';
        
        let cdText = '';
        if (onCd) {
            const remaining = a.currentCooldown;
            const word = getWordForm(remaining, ['гл. ход', 'гл. хода', 'гл. ходов']);
            cdText = ` (⌛ ${remaining} ${word})`;
        } else if (a.cd && a.cd > 0) cdText = ` (⚡ готово)`;
        
        html += '<div class="ability-card' + (onCd || noMana || !isPlayerTurn || isPassive ? ' on-cooldown' : '') + '" onclick="' + (onCd || noMana || !isPlayerTurn || isPassive ? '' : 'useBattleAbility(' + i + ')') + '"><div class="ability-header"><span class="ability-icon">' + (a.icon || '✨') + '</span><span class="ability-name">' + a.name + cdText + '</span>' + (onCd ? '<span class="cooldown-badge">' + a.currentCooldown + '</span>' : '') + '</div><div class="ability-desc">' + a.desc + '</div>' + (stats ? '<div class="ability-stats">' + stats + '</div>' : '') + (noMana ? '<div style="color:#e74c3c;font-size:9px;">❌ Нет маны</div>' : '') + '</div>';
    });
    html += '</div><button type="button" class="action-btn" onclick="closeBattleAbilitiesMenu()" style="margin-top:10px;width:100%;">↩️ Назад к бою (Esc)</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function useBattleAbility(index) {
    if (!requireBattleEngaged()) return;
    if (typeof isBattleTargetingActive === 'function' && isBattleTargetingActive()) return;
    const a = player.abilities[index];
    
    if (a.passive) {
        addBattleLog(`ℹ️ «${a.name}» — пассивная способность (уже действует).`, 'info');
        return;
    }
    
    if (a.currentCooldown > 0 && !nextNoCd) {
        const remaining = a.currentCooldown;
        const word = getWordForm(remaining, ['гл. ход', 'гл. хода', 'гл. ходов']);
        addBattleLog(`❌ "${a.name}" перезаряжается (ещё ${remaining} ${word})!`, 'error');
        return;
    }
    
    let manaCost = getScaledAbilityManaCost(a.mana || 0);
    if (nextFreeMana) {
        manaCost = 0;
        nextFreeMana = false;
        addBattleLog(`✨ Бесплатная способность!`, 'success');
    }
    if (player.class === 'Маг' && manaCost > 0 && player.mana < manaCost) {
        addBattleLog(`❌ Не хватает маны! (нужно ${manaCost})`, 'error');
        return;
    }

    if (typeof beginBattleTargeting === 'function' && typeof getBattleAbilityTargeting === 'function') {
        const targeting = getBattleAbilityTargeting(a);
        const validKinds = targeting === 'self' ? ['self']
            : targeting === 'ally' ? ['ally', 'self']
            : ['enemy'];
        const hints = {
            self: '💚 Выберите себя',
            ally: '🤝 Выберите союзника',
            enemy: '🎯 Выберите цель'
        };
        const runAbility = function (kind, idx) {
            executeUseBattleAbilityAtTarget(index, kind, idx);
        };
        if (typeof closeBattleAbilitiesMenu === 'function') closeBattleAbilitiesMenu();

        const launchTargeting = function () {
            beginBattleTargeting({
                type: 'ability',
                abilityId: index,
                targeting: targeting,
                validKinds: validKinds,
                hint: hints[targeting] || hints.enemy,
                handler: runAbility
            });
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(launchTargeting);
        } else {
            launchTargeting();
        }
        return;
    }

    if (!beginPlayerAction()) return;
    executeUseBattleAbilityAtTarget(index, 'enemy', 0);
}

function executeUseBattleAbilityAtTarget(index, targetKind, targetIndex) {
    if (!beginPlayerAction()) return;
    if (targetKind === 'enemy' && typeof focusBattleEnemyAtIndex === 'function') {
        focusBattleEnemyAtIndex(targetIndex);
    }
    const a = player.abilities[index];
    if (!a) {
        if (typeof addBattleLog === 'function') addBattleLog('❌ Способность не найдена.', 'error');
        isPlayerTurn = true;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return;
    }

    let manaCost = getScaledAbilityManaCost(a.mana || 0);
    if (nextFreeMana) {
        manaCost = 0;
        nextFreeMana = false;
        addBattleLog('✨ Бесплатная способность!', 'success');
    }
    if (player.class === 'Маг' && manaCost > 0 && player.mana < manaCost) {
        addBattleLog('❌ Не хватает маны! (нужно ' + manaCost + ')', 'error');
        isPlayerTurn = true;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return;
    }

    isPlayerTurn = false;
    updateBattleButtons();
    renderBattle({ force: true });

    if (typeof recordPlayerActionForMonsterAi === 'function') {
        recordPlayerActionForMonsterAi(a);
    }

    if (playerAttackMissesFromBlind() && (a.dmg || a.doubleHit || a.tripleHit || a.quadHit || a.multiHit)) {
        addBattleLog('👁️ Ослепление — способность промахнулась!', 'error');
        if (!nextNoCd) a.currentCooldown = a.cd;
        isPlayerTurn = false;
        endPlayerActionChain();
        renderBattle({ force: true });
        return;
    }
    if (currentMonster && monsterDodgesPlayerHit() && (a.dmg || a.doubleHit || a.tripleHit || a.quadHit || a.multiHit)) {
        addBattleLog(`💨 ${currentMonster.name} уклонился!`, 'info');
        if (!nextNoCd) a.currentCooldown = a.cd;
        isPlayerTurn = false;
        endPlayerActionChain();
        renderBattle();
        return;
    }

    if (manaCost > 0) player.mana -= manaCost;

    if (!currentMonster && !(a.heal || a.maxHpShield || a.immune || a.buff || a.restoreMana)) {
        addBattleLog('❌ Нет цели для способности.', 'error');
        isPlayerTurn = true;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        renderBattle({ force: true });
        return;
    }

    const doubleThisCast = nextDoubleEffect;
    if (doubleThisCast) {
        addBattleLog(`🔁 Удвоенный эффект!`, 'crit');
        nextDoubleEffect = false;
    }
    
    let dmg = (a.noDamage || !a.dmg) ? 0 : Math.floor(getPlayerEffectiveAttack() * a.dmg / 100);
    dmg = applyLessonAbilityDmgMult(dmg);
    ignoreShieldsThisHit = !!a.ignoreShields;
    
    if (a.rampUp && rageStack > 0) {
        const bonus = Math.min(a.rampUp.maxStack, rageStack) * a.rampUp.perStack;
        dmg = Math.floor(dmg * (1 + bonus / 100));
        addBattleLog(`💢 Накопление ярости: +${bonus}% урона!`, 'crit');
    }
    
    if (currentMonster.marked) {
        const markPct = currentMonster.markBonus || 40;
        dmg = Math.floor(dmg * (1 + markPct / 100));
        addBattleLog(`🎯 Урон по отмеченной цели +${markPct}%!`, 'crit');
        currentMonster.marked = false;
        currentMonster.markBonus = 0;
        markedTarget = false;
    }
    
    if (a.combo) {
        if (comboAbilityId === a.name) {
            abilityComboStep++;
            if (abilityComboStep >= a.combo.length) { abilityComboStep = 0; comboAbilityId = null; }
            const currentStep = Math.min(abilityComboStep, a.combo.length - 1);
            dmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * a.combo[currentStep] / 100));
            addBattleLog(`🔁 Комбо-удар ${abilityComboStep + 1}/${a.combo.length}!`, 'info');
        } else {
            comboAbilityId = a.name;
            abilityComboStep = 0;
            dmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * a.combo[0] / 100));
            addBattleLog(`🌀 Начало комбо!`, 'info');
        }
    }
    
    if (a.rampUp && (dmg > 0 || a.noDamage || !a.dmg)) {
        rageStack = Math.min(a.rampUp.maxStack, rageStack + 1);
        addBattleLog(`💢 Ярость растёт! Текущий уровень: ${rageStack}/${a.rampUp.maxStack}`, 'info');
    }
    
    if (a.freeNextAction || a.nextFree) {
        nextFreeMana = true;
        addBattleLog(`✨ Следующая способность бесплатна!`, 'info');
    }
    
    if (a.nextAttackBonus) {
        nextAttackBonus += a.nextAttackBonus;
        addBattleLog(`⚡ Следующая атака +${a.nextAttackBonus}%!`, 'info');
    }
    
    if (a.doubleNext) {
        nextDoubleEffect = true;
        addBattleLog(`🔁 Следующая способность с удвоенным эффектом!`, 'info');
    }
    
    if (a.noCdNext) {
        nextNoCd = true;
        addBattleLog(`⚡ Следующая способность без перезарядки!`, 'info');
    }
    
    if (a.summonSpirit) {
        summonedSpirit = true;
        addBattleLog(`🌿 Дух природы призван и будет атаковать в следующем ходу!`, 'success');
    }
    
    if (a.lingeringCloud) {
        lingeringCloud = true;
        addBattleLog(`☁️ Облако яда останется на поле боя!`, 'info');
    }
    
    if (a.mark) {
        currentMonster.marked = true;
        currentMonster.markBonus = a.mark || 40;
        markedTarget = true;
        addBattleLog(`🎯 Цель отмечена! Следующий удар +${currentMonster.markBonus}%`, 'info');
    }
    
    if (a.markAll) {
        if (typeof forEachLivingBattleEnemy === 'function') {
            forEachLivingBattleEnemy(function (m) {
                m.marked = true;
                m.markBonus = a.mark || 40;
            });
        } else {
            currentMonster.marked = true;
            currentMonster.markBonus = a.mark || 40;
        }
        markedTarget = true;
        addBattleLog(`🎯 Все враги отмечены!`, 'info');
    }

    if (a.nextAccuracy) {
        nextAccuracyBonus += a.nextAccuracy;
        addBattleLog(`🎯 Точность следующей атаки +${a.nextAccuracy}%!`, 'info');
    }
    
    if (a.reveal) {
        addBattleLog(`👁️ Невидимость снята!`, 'info');
    }
    
    let extraTurn = false;
    if (a.extraTurnOnKill && currentMonster.health - dmg <= 0) {
        extraTurn = true;
        addBattleLog(`🔥 Убийство! Дополнительный ход!`, 'crit');
    }
    
    if (a.executeInstant && currentMonster.health < currentMonster.maxHealth * a.executeInstant.threshold / 100) {
        if (Math.random() * 100 <= a.executeInstant.chance) {
            dmg = currentMonster.health;
            addBattleLog(`💀 МГНОВЕННОЕ УБИЙСТВО!`, 'crit');
        }
    }
    
    if (a.executeOnLowHp && currentMonster.health < currentMonster.maxHealth * a.executeOnLowHp / 100) {
        dmg = Math.floor(dmg * (1 + (a.lowHpBonus || 0) / 100));
        addBattleLog(`⚡ Удар по ослабленной цели! Урон +${a.lowHpBonus}%`, 'crit');
    }
    
    if (a.consumeBurn && currentMonster.effects.some(e => e.type === 'Горение')) {
        dmg = Math.floor(dmg * (1 + a.consumeBurn / 100));
        currentMonster.effects = currentMonster.effects.filter(e => e.type !== 'Горение');
        addBattleLog(`🔥 Поглощено горение: +${a.consumeBurn}% урона!`, 'crit');
    }
    
    if (a.splash && dmg > 0) {
        dmg += Math.floor(dmg * a.splash / 100);
        addBattleLog(`☄️ Разброс урона +${a.splash}%!`, 'info');
    }
    
    if (a.dotOverTime) {
        currentMonster.dotOverTime = { remaining: a.dotOverTime.dur, dmgPercent: a.dotOverTime.dmgPerTurn };
        addBattleLog(`🌪️ Урон в течение ${a.dotOverTime.dur} ходов!`, 'info');
    }
    
    if (a.dispelBuffs && currentMonster.activeBuffs) {
        currentMonster.activeBuffs = {};
        if (originalMonsterStats.attack) currentMonster.attack = originalMonsterStats.attack;
        if (originalMonsterStats.defense) currentMonster.defense = originalMonsterStats.defense;
        addBattleLog(`✨ Баффы врага сняты!`, 'info');
    }
    
    if (a.hpLoss) {
        const applyHpLossToFocused = function () {
            const hpLossDmg = Math.floor(currentMonster.maxHealth * a.hpLoss / 100);
            if (hpLossDmg > 0) applyDamageToMonster(hpLossDmg, ignoreShieldsThisHit);
        };
        if (a.aoe && typeof forEachLivingBattleEnemy === 'function') {
            forEachLivingBattleEnemy(applyHpLossToFocused);
            addBattleLog(`💀 Потеря ${a.hpLoss}% HP всех целей!`, 'dmg');
        } else {
            const hpLossDmg = Math.floor(currentMonster.maxHealth * a.hpLoss / 100);
            if (hpLossDmg > 0) {
                applyDamageToMonster(hpLossDmg, ignoreShieldsThisHit);
                addBattleLog(`💀 Потеря ${a.hpLoss}% HP цели (-${hpLossDmg})!`, 'dmg');
            }
        }
    }
    
    if (a.manaDrain) {
        let manaDrained = false;
        if (window.pvpBattleActive && typeof getLocalPvPRole === 'function' && typeof pvpState !== 'undefined' && pvpState && pvpState.match) {
            const remoteRole = getLocalPvPRole() === 'host' ? 'guest' : 'host';
            const remote = pvpState.match.players[remoteRole];
            if (remote && remote.class === 'Маг' && (remote.maxMana || 0) > 0) {
                const drain = Math.floor(remote.maxMana * a.manaDrain / 100);
                remote.mana = Math.max(0, (remote.mana || 0) - drain);
                addBattleLog(`🏔️ Высосано ${drain} маны соперника!`, 'dmg');
                manaDrained = true;
            }
        }
        if (!manaDrained && dmg > 0) {
            const drainDmg = Math.floor(currentMonster.maxHealth * a.manaDrain / 100);
            applyDamageToMonster(drainDmg, ignoreShieldsThisHit);
            addBattleLog(`🏔️ Мороз высасывает силы: -${drainDmg} HP!`, 'dmg');
        }
    }
    
    if (a.freezeExtend) {
        if (!currentMonster.effects) currentMonster.effects = [];
        currentMonster.effects.forEach(e => { if (e.type === 'Заморозка') e.dur *= 2; });
        addBattleLog(`❄️ Длительность заморозки удвоена!`, 'info');
        if (window.pvpBattleActive && typeof window.syncPvPRemoteFromMonster === 'function') {
            window.syncPvPRemoteFromMonster();
        }
    }
    
    if (a.groundBuff === 'lava') {
        currentMonster.fireVuln = a.value;
        addBattleLog(`🌋 Поле лавы! Уязвимость к огню +${a.value}%`, 'info');
    }
    if (a.fireVuln) {
        currentMonster.fireVuln = a.fireVuln;
        addBattleLog(`🔥 Уязвимость к огню +${a.fireVuln}%!`, 'info');
    }
    
    if (a.armorShred) {
        currentMonster.armorShred += a.armorShred;
        addBattleLog(`🛡️ Защита цели снижена на ${currentMonster.armorShred}%`, 'info');
        dmg = calculateDamageWithShred(dmg, currentMonster.defense, currentMonster.armorShred);
    }
    
    if (a.pierce && dmg > 0) {
        dmg = calculateDamage(dmg, 0);
        addBattleLog('🏹 Сквозной выстрел — защита не учитывается!', 'crit');
    } else if (a.ignoreDef) {
        const effDef = Math.floor(getMonsterCurrentDefense() * (1 - a.ignoreDef / 100));
        dmg = calculateDamage(dmg, effDef);
    }
    
    if (a.ignoreAll) {
        dmg = Math.max(1, Math.floor(dmg * (100) / 100));
        addBattleLog(`✨ Игнорирует всю защиту и иммунитеты!`, 'crit');
    }
    
    if (a.guaranteedCrit) {
        dmg = Math.floor(dmg * (getPlayerCritDamagePercent(a.critDmgBonus || 0) / 100));
        addBattleLog(`✨ ГАРАНТИРОВАННЫЙ КРИТИЧЕСКИЙ УДАР!`, 'crit');
    }
    
    if (a.effect) {
        let effectDur = a.effect.dur;
        let effectVal = a.effect.val ?? a.effect.value;
        if (effectVal != null && typeof getLessonEffectMultiplier === 'function') {
            effectVal = Math.floor(effectVal * getLessonEffectMultiplier(player, a.effect.type));
        }
        if (doubleThisCast) {
            effectDur = Math.floor(effectDur * 1.5);
            effectVal = Math.floor(effectVal * 1.5);
        }
        if (a.effect.type === 'Смертельный яд') {
            currentMonster.damageAmp = 2;
            addBattleLog(`☠️ Следующий удар по цели удвоит урон!`, 'info');
        } else {
            upsertMonsterStatusEffect(currentMonster, {
                type: a.effect.type,
                dur: effectDur,
                val: effectVal,
                spread: a.effect.spread,
                manaRegen: a.effect.manaRegen
            });
            addBattleLog(`🌀 Наложен эффект «${a.effect.type}» на ${effectDur} хода!`, 'info');
            if (window.pvpBattleActive && typeof window.syncPvPRemoteFromMonster === 'function') {
                window.syncPvPRemoteFromMonster();
            }
        }
        if (a.manaPerFrozen && player.class === 'Маг' && a.effect.type === 'Заморозка') {
            player.mana = Math.min(player.maxMana, player.mana + a.manaPerFrozen);
            addBattleLog(`💎 +${a.manaPerFrozen} маны за заморозку`, 'heal');
        }
    }
    
    if (a.enemyDebuff) {
        currentMonster.armorShred = (currentMonster.armorShred || 0) + a.enemyDebuff.value;
        if (a.enemyDebuff.dur) {
            currentMonster.armorShredTurns = Math.max(currentMonster.armorShredTurns || 0, a.enemyDebuff.dur);
        }
        addBattleLog(a.aoe ? `🛡️ Защита всех врагов снижена на ${a.enemyDebuff.value}%!` : `🛡️ Защита врага снижена на ${a.enemyDebuff.value}%!`, 'info');
    }

    spreadAoeMonsterEffects(a, doubleThisCast);

    if (window.dungeonDuoBattleActive && (a.effect || a.enemyDebuff || a.aoe) &&
        typeof requestDungeonDuoStateSync === 'function') {
        requestDungeonDuoStateSync();
    }
    
    if (a.partyBuff) {
        const pbDur = a.partyBuff.dur || 3;
        player.temporaryEffects.push({ def: a.partyBuff.def || 0, dur: pbDur });
        addBattleLog(`🌟 Аура: +${a.partyBuff.def || 0}% защиты на ${pbDur} хода!`, 'heal');
    }
    
    if (a.healBonus && a.buff) {
        player.temporaryEffects.push({ healBonus: a.healBonus, dur: a.buff.dur || 3 });
    }
    
    if (a.regen) {
        player.temporaryEffects.push({ regen: a.regen, dur: (a.buff && a.buff.dur) || a.dur || 3 });
    }
    
    if (a.nextCrit) nextCritGuaranteed = true;
    if (a.skipNextTurn) playerSkipNextTurn = true;
    
    if (a.buff) {
        let buffDur = a.buff.dur;
        if (doubleThisCast) buffDur = Math.floor(buffDur * 1.5);
        const buffFx = { atk: a.buff.atk || 0, def: a.buff.def || 0, dodge: a.buff.dodge || 0, crit: a.buff.crit || 0, critDmg: a.buff.critDmg || 0, dur: buffDur, cdReduction: a.buff.cdReduction, freezeOnHit: a.freezeOnHit, counterChance: a.counterChance, counterDmg: a.counterDmg, freeOnDodge: a.freeOnDodge, ccImmune: a.ccImmune };
        player.temporaryEffects.push(buffFx);
        let buffText = [];
        if (a.buff.atk) buffText.push(`+${a.buff.atk}% атаки`);
        if (a.buff.def) buffText.push(`+${a.buff.def}% защиты`);
        if (a.buff.dodge) buffText.push(`+${a.buff.dodge}% уклонения`);
        if (a.buff.crit) buffText.push(`+${a.buff.crit}% крита`);
        if (a.buff.critDmg) buffText.push(`+${a.buff.critDmg}% крит урона`);
        const effDef = getPlayerEffectiveDefense();
        addBattleLog(`💪 ${buffText.length ? buffText.join(', ') : 'Бафф'} на ${buffDur} хода! (🛡️ защита сейчас: ${effDef})`, 'heal');
    }
    
    if (a.selfBuff) {
        player.temporaryEffects.push({ next_damage_mult: a.selfBuff.value, dur: a.selfBuff.dur });
        addBattleLog(`😤 ${a.selfBuff.type}! Следующий удар +${a.selfBuff.value}%`, 'info');
    }
    
    if (a.skipNextTurn) addBattleLog(`💫 Следующий ход пропускается...`, 'info');
    
    if (a.bleedPercent) {
        const applyBleed = function () {
            const bleedDamage = Math.floor(currentMonster.maxHealth * a.bleedPercent / 100);
            if (bleedDamage > 0) applyDamageToMonster(bleedDamage);
        };
        if (a.aoe && typeof forEachLivingBattleEnemy === 'function') {
            forEachLivingBattleEnemy(applyBleed);
            addBattleLog(`🩸 Кровотечение по всем врагам!`, 'dmg');
        } else {
            const bleedDamage = Math.floor(currentMonster.maxHealth * a.bleedPercent / 100);
            applyDamageToMonster(bleedDamage);
            addBattleLog(`🩸 Кровотечение: -${bleedDamage} урона!`, 'dmg');
        }
    }
    
    if (a.heal) {
        let healAmount = Math.floor(player.maxHealth * a.heal / 100);
        healAmount = applyLessonHealMult(healAmount);
        if (player.temporaryEffects.some(e => e.healBonus)) {
            const healBonus = player.temporaryEffects.find(e => e.healBonus).healBonus;
            healAmount = Math.floor(healAmount * (1 + healBonus / 100));
        }
        if (targetKind === 'ally' && typeof getDungeonDuoAlly === 'function') {
            const ally = getDungeonDuoAlly();
            if (ally) {
                const allyHeal = Math.floor((ally.maxHealth || 100) * a.heal / 100);
                ally.health = Math.min(ally.maxHealth || allyHeal, (ally.health || 0) + allyHeal);
                addBattleLog('💚 Союзник +' + allyHeal + ' HP', 'heal');
                if (typeof requestDungeonDuoStateSync === 'function') requestDungeonDuoStateSync();
            }
        } else {
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            addBattleLog(`💚 +${healAmount} HP`, 'heal');
        }
    }
    
    if (a.lifesteal) {
        const ls = Math.floor(dmg * a.lifesteal / 100);
        player.health = Math.min(player.maxHealth, player.health + ls);
        addBattleLog(`🩸 +${ls} HP (вампиризм ${a.lifesteal}%)`, 'heal');
    }
    
    if (a.maxHpShield) {
        const shieldValue = Math.floor(player.maxHealth * a.maxHpShield / 100);
        const existingShield = player.temporaryEffects.find(e => e.shield);
        if (existingShield) player.temporaryEffects = player.temporaryEffects.filter(e => e !== existingShield);
        player.temporaryEffects.push({ shield: shieldValue, dur: a.dur || 3 });
        addBattleLog(`🔮 Создан щит на ${shieldValue} HP (${a.maxHpShield}% от макс. HP)!`, 'heal');
    }
    
    if (a.maxManaBonus) {
        const oldMaxMana = player.maxMana;
        player.maxMana = Math.floor(player.maxMana * (1 + a.maxManaBonus / 100));
        const manaIncrease = player.maxMana - oldMaxMana;
        player.mana += manaIncrease;
        addBattleLog(`💎 Максимальная мана увеличена на ${a.maxManaBonus}% (+${manaIncrease})!`, 'heal');
        player.temporaryEffects.push({ type: 'maxManaBonus', value: a.maxManaBonus, oldMaxMana: oldMaxMana, dur: a.dur || 3 });
    }
    
    if (a.shieldFromDamage && dmg > 0) {
        const shieldValue = Math.floor(dmg * a.shieldFromDamage / 100);
        const existingShield = player.temporaryEffects.find(e => e.shield);
        if (existingShield) player.temporaryEffects = player.temporaryEffects.filter(e => e !== existingShield);
        player.temporaryEffects.push({ shield: shieldValue, dur: 2 });
        addBattleLog(`🛡️ Щит от урона: ${shieldValue} HP!`, 'heal');
    }
    
    if (a.manaScaling && a.shield) {
        const manaBonus = Math.floor(player.mana * 0.5);
        const shieldValue = Math.floor(player.maxHealth * a.shield / 100) + manaBonus;
        const existingShield = player.temporaryEffects.find(e => e.shield);
        if (existingShield) player.temporaryEffects = player.temporaryEffects.filter(e => e !== existingShield);
        player.temporaryEffects.push({ shield: shieldValue, dur: a.dur || 3 });
        addBattleLog(`🔮 Щит с масштабированием от маны: ${shieldValue} HP!`, 'heal');
    }
    
    if (a.manaToShield) {
        const manaUsed = Math.floor(player.mana * a.manaToShield / 100);
        const shieldValue = manaUsed * 2;
        player.mana -= manaUsed;
        const existingShield = player.temporaryEffects.find(e => e.shield);
        if (existingShield) player.temporaryEffects = player.temporaryEffects.filter(e => e !== existingShield);
        player.temporaryEffects.push({ shield: shieldValue, dur: a.dur || 3 });
        addBattleLog(`💎 ${manaUsed} маны превращено в щит (${shieldValue} HP)!`, 'heal');
    }
    
    if (a.manaToDamage && dmg > 0) {
        const manaBonus = Math.floor(player.mana);
        dmg += manaBonus;
        player.mana = 0;
        addBattleLog(`✨ Мана превращена в урон! +${manaBonus} к урону!`, 'crit');
    }
    
    if (a.burnMana && player.class === 'Маг') {
        let burned = false;
        if (window.pvpBattleActive && typeof getLocalPvPRole === 'function' && typeof pvpState !== 'undefined' && pvpState && pvpState.match) {
            const remoteRole = getLocalPvPRole() === 'host' ? 'guest' : 'host';
            const remote = pvpState.match.players[remoteRole];
            if (remote && remote.class === 'Маг' && (remote.maxMana || 0) > 0) {
                const manaBurn = Math.floor(remote.maxMana * a.burnMana / 100);
                remote.mana = Math.max(0, (remote.mana || 0) - manaBurn);
                addBattleLog(`🔥 Сожжено ${manaBurn} маны соперника!`, 'dmg');
                burned = true;
            }
        }
        if (!burned) {
            const manaBurn = Math.floor((player.maxMana || 100) * a.burnMana / 100);
            player.temporaryEffects.push({ manaBurn: manaBurn, dur: 1 });
            addBattleLog(`🔥 Выжжено ${manaBurn} маны (урон по цели)!`, 'dmg');
        }
    }
    
    if (a.cdReduction) {
        player.abilities.forEach(ab => {
            if (ab.currentCooldown > 0) ab.currentCooldown = Math.max(0, ab.currentCooldown - Math.floor(ab.cd * a.cdReduction / 100));
        });
        addBattleLog(`⚡ Перезарядка способностей ускорена на ${a.cdReduction}%!`, 'info');
    }
    
    if (a.restoreMana) {
        player.mana = Math.min(player.maxMana, player.mana + a.restoreMana);
        addBattleLog(`💎 +${a.restoreMana} маны`, 'heal');
    }
    if (a.restoreManaPercent) {
        const manaRestore = Math.floor(player.maxMana * a.restoreManaPercent / 100);
        player.mana = Math.min(player.maxMana, player.mana + manaRestore);
        addBattleLog(`💎 +${manaRestore} маны (${a.restoreManaPercent}%)`, 'heal');
    }
    if (a.manaRefund && player.class === 'Маг') {
        const refund = Math.floor(player.maxMana * a.manaRefund / 100);
        player.mana = Math.min(player.maxMana, player.mana + refund);
        addBattleLog(`💎 Возврат ${refund} маны (${a.manaRefund}%)`, 'heal');
    }
    
    if (a.echo) { 
        window.echoActive = true;
        window.echoMultiplier = a.echo;
        addBattleLog(`🔁 Эхо: следующее заклинание повторится с ${Math.floor(a.echo * 100)}% силы`, 'info');
    }
    
    if (a.immune) { 
        player.temporaryEffects.push({ immune: true, dur: a.dur || 1 }); 
        addBattleLog(`🛡️ Иммунитет на ${a.dur || 1} ход!`, 'heal');
    }
    
    if (a.reflect) {
        const reflectDur = a.dur || (a.buff && a.buff.dur) || 1;
        player.temporaryEffects.push({ reflect: a.reflect, dur: reflectDur });
        addBattleLog(`↩️ Отражение ${a.reflect}% урона на ${reflectDur} ход(ов)!`, 'info');
    }
    
    if (a.damageReduction) {
        const drDur = a.dur || 2;
        player.temporaryEffects.push({ damageReduction: a.damageReduction, dur: drDur });
        addBattleLog(`🛡️ Получаемый урон снижен на ${a.damageReduction}% (${drDur} хода)!`, 'info');
    }
    
    if (a.deathSave) {
        deathSaveActive = true;
        addBattleLog(`💪 Инстинкт выживания! Вы не умрёте от одного удара!`, 'success');
    }
    
    let critChance = player.criticalChance + (a.critBonus || 0);
    let crit = a.guaranteedCrit || nextCritGuaranteed || Math.random() * 100 <= critChance;
    if (nextCritGuaranteed) nextCritGuaranteed = false;
    if (crit && !a.guaranteedCrit) {
        dmg = Math.floor(dmg * (getPlayerCritDamagePercent() / 100));
        addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР!`, 'crit');
    }
    
    dmg = Math.floor(dmg * getWeakspotDamageMultiplier());
    if (!a.aoe && currentMonster.damageAmp > 1) {
        dmg = Math.floor(dmg * currentMonster.damageAmp);
        currentMonster.damageAmp = 1;
    }
    
    const defenseAlreadyApplied = a.ignoreDef || a.armorShred || a.ignoreAll;
    if (!a.aoe && dmg > 0 && !defenseAlreadyApplied) {
        dmg = calculateDamageWithShred(dmg, getMonsterCurrentDefense(), currentMonster.armorShred || 0);
    }
    
    if (a.doubleHit) {
        dmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * a.dmg / 100)) * 2;
        addBattleLog(`🏹 Двойной выстрел!`, 'info');
        if (a.manaPerHit && player.class === 'Маг') {
            player.mana = Math.min(player.maxMana, player.mana + a.manaPerHit * 2);
        }
    }
    if (a.tripleHit) {
        dmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * a.dmg / 100)) * 3;
        addBattleLog(`🏹 Тройной выстрел!`, 'info');
        if (a.manaPerHit && player.class === 'Маг') {
            player.mana = Math.min(player.maxMana, player.mana + a.manaPerHit * 3);
        }
    }
    if (a.quadHit) {
        const hits = a.hitCount || 4;
        dmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * a.dmg / 100)) * hits;
        addBattleLog(`🏹 ${hits} выстрела!`, 'info');
        if (a.manaPerHit && player.class === 'Маг') {
            player.mana = Math.min(player.maxMana, player.mana + a.manaPerHit * hits);
        }
        if (a.stunChance && Math.random() * 100 <= a.stunChance) {
            if (!currentMonster.effects) currentMonster.effects = [];
            upsertMonsterStatusEffect(currentMonster, { type: 'Оглушение', dur: 1, val: 0 });
            addBattleLog(`😵 Оглушение сработало!`, 'info');
            if (window.pvpBattleActive && typeof window.syncPvPRemoteFromMonster === 'function') {
                window.syncPvPRemoteFromMonster();
            }
        }
    }
    if (a.multiHit) {
        let totalDmg = 0;
        for (let h = 0; h < a.multiHit.hits; h++) {
            const step = a.multiHit.ramp ?? a.multiHit.increment ?? 0;
            let hitDmg = applyLessonAbilityDmgMult(Math.floor(getPlayerEffectiveAttack() * (a.multiHit.baseDmg + h * step) / 100));
            if (a.multiHit.critRamp) {
                if (Math.random() * 100 <= (player.criticalChance + h * a.multiHit.critRamp)) {
                    hitDmg = Math.floor(hitDmg * (getPlayerCritDamagePercent() / 100));
                    totalDmg += hitDmg;
                    addBattleLog(`💥 ${h + 1}-й удар КРИТИЧЕСКИЙ (${hitDmg})!`, 'crit');
                    continue;
                }
            }
            totalDmg += hitDmg;
            addBattleLog(`🏹 ${h + 1}-й удар: ${hitDmg} урона`, 'dmg');
        }
        dmg = totalDmg;
    }
    
    if (a.aoe) addBattleLog(`🌪️ Урон наносится по всем врагам!`, 'info');
    if (a.chain) addBattleLog(`⚡ Цепная молния!`, 'info');
    
    const appliedDamage = applyAbilityDamageAtTargets(a, dmg, ignoreShieldsThisHit);
    ignoreShieldsThisHit = false;
    if (appliedDamage > 0) addBattleLog(`✨ ${a.name}: ${appliedDamage} урона!`, 'dmg');
    else addBattleLog(`✨ ${a.name}!`, 'info');
    
    if (!nextNoCd) a.currentCooldown = a.cd;
    else {
        nextNoCd = false;
        addBattleLog(`⚡ Способность использована без перезарядки!`, 'info');
    }

    if (typeof updateBattlePackVitality === 'function') updateBattlePackVitality();
    else updateBattleVitality();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();

    if (window.dungeonDuoBattleActive && typeof pushDungeonDuoBattleVisual === 'function') {
        const focusIdx = typeof getBattleEnemyFocusIndex === 'function' ? getBattleEnemyFocusIndex() : 0;
        const visualPayload = {
            action: 'ability',
            abilityName: a.name || '',
            damage: appliedDamage,
            crit: crit,
            targetIndex: focusIdx,
            aoe: !!a.aoe,
            heavy: !!crit || appliedDamage >= Math.floor((typeof getPlayerEffectiveAttack === 'function' ? getPlayerEffectiveAttack() : 0) * 1.2)
        };
        if (a.aoe && window._lastAoeVisualHits && window._lastAoeVisualHits.length) {
            visualPayload.hits = window._lastAoeVisualHits.slice();
        }
        pushDungeonDuoBattleVisual(visualPayload);
    }

    const afterAbilityResolve = () => {
        if (currentMonster.health <= 0) {
            const pack = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
            const living = pack.filter(function (e) { return e && e.health > 0; });
            if (living.length > 0) {
                tryVictoryAfterEnemyDown();
                endPlayerActionChain();
                return;
            }
            if (extraTurn && !window.pvpBattleActive) {
                addBattleLog(`⚡ Дополнительный ход за убийство!`, 'crit');
                isPlayerTurn = true;
                renderBattle();
                updateBattleButtons();
                return;
            }
            tryVictoryAfterEnemyDown();
            return;
        }
        endPlayerActionChain();
    };

    animatePlayerAbility(afterAbilityResolve, a, appliedDamage, crit, {
        onImpact: () => {
            if (a.aoe && window._lastAoeVisualHits && window._lastAoeVisualHits.length) {
                window._lastAoeVisualHits.forEach(function (hit) {
                    if (hit.damage > 0 && typeof floatDamageOnEnemyIndex === 'function') {
                        floatDamageOnEnemyIndex(hit.index, hit.damage, hit.crit);
                    }
                });
                window._lastAoeVisualHits = null;
            } else if (appliedDamage > 0) {
                floatDamage('enemy', appliedDamage, crit);
            }
        },
        onAnimEnd: () => syncBattleDisplayAfterAnim()
    });
    
    if (window.echoActive && appliedDamage > 0) { 
        window.echoActive = false;
        const echoDmg = Math.floor(appliedDamage * (window.echoMultiplier || 0.6));
        const echoDamage = applyDamageToMonster(echoDmg);
        addBattleLog(`🔁 Эхо: +${echoDamage} урона!`, 'info'); 
        if (currentMonster.health <= 0) {
            setTimeout(function () {
                if (tryVictoryAfterEnemyDown()) endPlayerActionChain();
            }, 100);
        }
    }
    
    if (a.revive && player.health <= 0) {
        player.health = Math.floor(player.maxHealth * (a.revive / 100));
        addBattleLog(`✨ Возрождение духа! ${player.health} HP`, 'success');
        updateBattleVitality();
    }

    setTimeout(() => { if (typeof saveGame === 'function') saveGame(); }, 0);
}

function fleeBattle() {
    if (window.pvpBattleActive && typeof forfeitPvPMatch === 'function') {
        forfeitPvPMatch();
        return;
    }
    if (typeof isBattleZoneStaging === 'function' && isBattleZoneStaging()) {
        if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
        if (typeof addMessage === 'function') addMessage('↩️ Вы покинули поле боя.', 'info');
        if (typeof renderGame === 'function') renderGame();
        return;
    }
    if (!currentMonster) return;
    if (Math.random() * 100 <= 50) {
        const returnTo = currentMonster.returnTo;
        addBattleLog('🏃 Сбежали! Штраф за трусость.', 'info');
        if (typeof applyFleePenalty === 'function') applyFleePenalty();
        if (typeof leaveBattleZoneAfterFlee === 'function') leaveBattleZoneAfterFlee(returnTo);
        else {
            currentMonster = null;
            if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
            document.getElementById('dynamicContent').innerHTML = '';
            document.body.classList.remove('low-hp');
            if (returnTo && typeof showGatheringResources === 'function') showGatheringResources(returnTo);
            else renderGame();
        }
    } else {
        addBattleLog('❌ Побег не удался!', 'info');
        if (typeof startMonsterPhaseAfterPlayer === 'function') startMonsterPhaseAfterPlayer();
        else setTimeout(() => { monsterTurn(); }, 500);
    }
}

// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.playerAttack = playerAttack;
window.attemptDodge = attemptDodge;
window.showBattleAbilities = showBattleAbilities;
window.closeBattleAbilitiesMenu = closeBattleAbilitiesMenu;
window.useBattleAbility = useBattleAbility;
window.fleeBattle = fleeBattle;
window.upsertMonsterStatusEffect = upsertMonsterStatusEffect;