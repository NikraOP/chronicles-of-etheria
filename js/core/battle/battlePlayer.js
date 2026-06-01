// js/core/battle/battlePlayer.js

function playerAttack() {
    if (!isPlayerTurn) return;
    isPlayerTurn = false;
    updateBattleButtons();
    
    let dmg = getPlayerEffectiveAttack();
    
    if (nextAttackBonus > 0) {
        dmg = Math.floor(dmg * (1 + nextAttackBonus / 100));
        addBattleLog(`⚡ Бонус следующей атаки: +${nextAttackBonus}%!`, 'crit');
        nextAttackBonus = 0;
    }
    const crit = Math.random() * 100 <= player.criticalChance;
    if (crit) dmg = Math.floor(dmg * (player.criticalDamage / 100));
    dmg = calculateDamage(dmg, currentMonster.defense);
    
    const appliedDamage = applyDamageToMonster(dmg);
    const msg = (crit ? '💥 КРИТ! ' : '⚔️ ') + appliedDamage + ' урона';
    addBattleLog(msg, crit ? 'crit' : 'dmg');
    
    animatePlayerAttack(() => {
        floatDamage('enemy', appliedDamage, crit);
        if (currentMonster.health <= 0) { victory(); return; }
        setTimeout(() => { monsterTurn(); }, 300);
    });
    renderBattle();
    saveGame();
}

function attemptDodge() {
    if (!isPlayerTurn) return;
    isPlayerTurn = false;
    updateBattleButtons();
    
    let totalDodge = player.dodgeChance;
    const dodgeBonus = player.temporaryEffects.reduce((s, e) => s + (e.dodge || 0), 0);
    totalDodge = totalDodge + dodgeBonus;
    totalDodge = Math.min(70, totalDodge);
    
    addBattleLog(`💨 Попытка уклониться... (шанс ${totalDodge}%)`, 'info');
    
    if (Math.random() * 100 <= totalDodge) {
        addBattleLog('✅ Уклонились! Монстр промахнулся!', 'success');
        
        const hasFreeOnDodge = player.temporaryEffects.some(e => e.freeOnDodge);
        if (hasFreeOnDodge) {
            nextFreeMana = true;
            addBattleLog(`🔄 Уклонение активировало бесплатный выстрел!`, 'info');
        }
        
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
    } else {
        addBattleLog('❌ Не удалось уклониться! Монстр атакует!', 'error');
        setTimeout(() => { monsterTurn(); }, 500);
    }
    renderBattle();
}

function showBattleAbilities() {
    let html = '<h3>✨ Способности</h3><div class="ability-grid">';
    player.abilities.forEach((a, i) => {
        const onCd = a.currentCooldown > 0;
        const noMana = player.class === 'Маг' && a.mana && player.mana < a.mana;
        let stats = '';
        if (a.dmg) stats += '<span>⚔️' + a.dmg + '%</span>';
        if (a.mana) stats += '<span>💎' + a.mana + '</span>';
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
            const word = getWordForm(remaining, ['ход', 'хода', 'ходов']);
            cdText = ` (⌛ ${remaining} ${word})`;
        } else if (a.cd && a.cd > 0) cdText = ` (⚡ готово)`;
        
        html += '<div class="ability-card' + (onCd || noMana || !isPlayerTurn ? ' on-cooldown' : '') + '" onclick="' + (onCd || noMana || !isPlayerTurn ? '' : 'useBattleAbility(' + i + ')') + '"><div class="ability-header"><span class="ability-icon">' + (a.icon || '✨') + '</span><span class="ability-name">' + a.name + cdText + '</span>' + (onCd ? '<span class="cooldown-badge">' + a.currentCooldown + '</span>' : '') + '</div><div class="ability-desc">' + a.desc + '</div>' + (stats ? '<div class="ability-stats">' + stats + '</div>' : '') + (noMana ? '<div style="color:#e74c3c;font-size:9px;">❌ Нет маны</div>' : '') + '</div>';
    });
    html += '</div><button class="action-btn" onclick="renderBattle()" style="margin-top:10px;width:100%;">↩️ Назад к бою</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function useBattleAbility(index) {
    if (!isPlayerTurn) return;
    const a = player.abilities[index];
    
    if (a.currentCooldown > 0 && !nextNoCd) {
        const remaining = a.currentCooldown;
        const word = getWordForm(remaining, ['ход', 'хода', 'ходов']);
        addBattleLog(`❌ "${a.name}" перезаряжается (ещё ${remaining} ${word})!`, 'error');
        return;
    }
    
    let manaCost = a.mana || 0;
    if (nextFreeMana) {
        manaCost = 0;
        nextFreeMana = false;
        addBattleLog(`✨ Бесплатная способность!`, 'success');
    }
    if (player.class === 'Маг' && manaCost > 0 && player.mana < manaCost) {
        addBattleLog(`❌ Не хватает маны! (нужно ${manaCost})`, 'error');
        return;
    }
    
    isPlayerTurn = false;
    updateBattleButtons();
    
    if (manaCost > 0) player.mana -= manaCost;
    if (nextDoubleEffect) {
        addBattleLog(`🔁 Удвоенный эффект!`, 'crit');
        nextDoubleEffect = false;
    }
    
    let dmg = a.dmg ? Math.floor(getPlayerEffectiveAttack() * a.dmg / 100) : 0;
    
    if (a.rampUp && rageStack > 0) {
        const bonus = Math.min(a.rampUp.maxStack, rageStack) * a.rampUp.perStack;
        dmg = Math.floor(dmg * (1 + bonus / 100));
        addBattleLog(`💢 Накопление ярости: +${bonus}% урона!`, 'crit');
    }
    
    if (markedTarget && currentMonster.marked) {
        dmg = Math.floor(dmg * 1.5);
        addBattleLog(`🎯 Урон по отмеченной цели +50%!`, 'crit');
        currentMonster.marked = false;
        markedTarget = false;
    }
    
    if (a.combo) {
        if (comboAbilityId === a.name) {
            abilityComboStep++;
            if (abilityComboStep >= a.combo.length) { abilityComboStep = 0; comboAbilityId = null; }
            const currentStep = Math.min(abilityComboStep, a.combo.length - 1);
            dmg = Math.floor(getPlayerEffectiveAttack() * a.combo[currentStep] / 100);
            addBattleLog(`🔁 Комбо-удар ${abilityComboStep + 1}/${a.combo.length}!`, 'info');
        } else {
            comboAbilityId = a.name;
            abilityComboStep = 0;
            dmg = Math.floor(getPlayerEffectiveAttack() * a.combo[0] / 100);
            addBattleLog(`🌀 Начало комбо!`, 'info');
        }
    }
    
    if (a.rampUp && dmg > 0) {
        rageStack = Math.min(a.rampUp.maxStack, rageStack + 1);
        addBattleLog(`💢 Ярость растёт! Текущий уровень: ${rageStack}/${a.rampUp.maxStack}`, 'info');
    }
    
    if (a.freeNextAction) {
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
        markedTarget = true;
        addBattleLog(`🎯 Цель отмечена! Следующий удар +${a.mark}%`, 'info');
    }
    
    if (a.markAll) {
        currentMonster.marked = true;
        markedTarget = true;
        addBattleLog(`🎯 Все враги отмечены!`, 'info');
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
    
    if (a.executeOnLowHp && player.health < player.maxHealth * a.executeOnLowHp / 100) {
        dmg = Math.floor(dmg * (1 + (a.lowHpBonus || 0) / 100));
        addBattleLog(`⚡ Эффект казни! Урон +${a.lowHpBonus}%`, 'crit');
    }
    
    if (a.freezeExtend) {
        currentMonster.effects.forEach(e => { if (e.type === 'Заморозка') e.dur *= 2; });
        addBattleLog(`❄️ Длительность заморозки удвоена!`, 'info');
    }
    
    if (a.groundBuff === 'lava') {
        currentMonster.fireVuln = a.value;
        addBattleLog(`🌋 Поле лавы! Уязвимость к огню +${a.value}%`, 'info');
    }
    
    if (a.effect && a.effect.type === 'Ослепление') {
        player.temporaryEffects.push({ blind: true, dur: a.effect.dur, value: a.effect.value });
        addBattleLog(`👁️ Цель ослеплена! Точность -${a.effect.value}%`, 'info');
    }
    
    if (a.armorShred) {
        currentMonster.armorShred += a.armorShred;
        addBattleLog(`🛡️ Защита цели снижена на ${currentMonster.armorShred}%`, 'info');
        dmg = calculateDamageWithShred(dmg, currentMonster.defense, currentMonster.armorShred);
    }
    
    if (a.ignoreDef) {
        const defAfterIgnore = Math.max(0, currentMonster.defense - a.ignoreDef);
        dmg = Math.max(1, Math.floor(dmg * (100 - defAfterIgnore / 3) / 100));
    }
    
    if (a.ignoreAll) {
        dmg = Math.max(1, Math.floor(dmg * (100) / 100));
        addBattleLog(`✨ Игнорирует всю защиту и иммунитеты!`, 'crit');
    }
    
    if (a.guaranteedCrit) {
        dmg = Math.floor(dmg * (player.criticalDamage / 100));
        addBattleLog(`✨ ГАРАНТИРОВАННЫЙ КРИТИЧЕСКИЙ УДАР!`, 'crit');
    }
    
    if (a.effect) {
        let effectDur = a.effect.dur;
        let effectVal = a.effect.val;
        if (nextDoubleEffect) {
            effectDur = Math.floor(effectDur * 1.5);
            effectVal = Math.floor(effectVal * 1.5);
        }
        currentMonster.effects.push({ type: a.effect.type, dur: effectDur, val: effectVal, spread: a.effect.spread, manaRegen: a.effect.manaRegen });
        addBattleLog(`🌀 Наложен эффект "${a.effect.type}" на ${effectDur} хода!`, 'info');
    }
    
    if (a.enemyDebuff) {
        currentMonster.armorShred = (currentMonster.armorShred || 0) + a.enemyDebuff.value;
        addBattleLog(`🛡️ Защита врага снижена на ${a.enemyDebuff.value}%!`, 'info');
    }
    
    if (a.buff) {
        let buffDur = a.buff.dur;
        if (nextDoubleEffect) buffDur = Math.floor(buffDur * 1.5);
        player.temporaryEffects.push({ atk: a.buff.atk || 0, def: a.buff.def || 0, dodge: a.buff.dodge || 0, crit: a.buff.crit || 0, critDmg: a.buff.critDmg || 0, dur: buffDur, cdReduction: a.buff.cdReduction, freezeOnHit: a.freezeOnHit, counterChance: a.counterChance, counterDmg: a.counterDmg, freeOnDodge: a.freeOnDodge, ccImmune: a.ccImmune });
        let buffText = [];
        if (a.buff.atk) buffText.push(`+${a.buff.atk}% атаки`);
        if (a.buff.def) buffText.push(`+${a.buff.def}% защиты`);
        if (a.buff.dodge) buffText.push(`+${a.buff.dodge}% уклонения`);
        if (a.buff.crit) buffText.push(`+${a.buff.crit}% крита`);
        if (a.buff.critDmg) buffText.push(`+${a.buff.critDmg}% крит урона`);
        addBattleLog(`💪 Наложен бафф: ${buffText.join(', ')} на ${buffDur} хода!`, 'heal');
    }
    
    if (a.selfBuff) {
        player.temporaryEffects.push({ next_damage_mult: a.selfBuff.value, dur: a.selfBuff.dur });
        addBattleLog(`😤 ${a.selfBuff.type}! Следующий удар +${a.selfBuff.value}%`, 'info');
    }
    
    if (a.skipNextTurn) addBattleLog(`💫 Мощный удар! Следующий ход пропускается...`, 'info');
    
    if (a.bleedPercent) {
        const bleedDamage = Math.floor(currentMonster.maxHealth * a.bleedPercent / 100);
        applyDamageToMonster(bleedDamage);
        addBattleLog(`🩸 Кровотечение: -${bleedDamage} урона!`, 'dmg');
    }
    
    if (a.heal) {
        let healAmount = Math.floor(player.maxHealth * a.heal / 100);
        if (player.temporaryEffects.some(e => e.healBonus)) {
            const healBonus = player.temporaryEffects.find(e => e.healBonus).healBonus;
            healAmount = Math.floor(healAmount * (1 + healBonus / 100));
        }
        player.health = Math.min(player.maxHealth, player.health + healAmount);
        addBattleLog(`💚 +${healAmount} HP`, 'heal');
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
        const manaBurn = Math.floor((player.maxMana || 100) * a.burnMana / 100);
        player.temporaryEffects.push({ manaBurn: manaBurn, dur: 1 });
        addBattleLog(`🔥 Выжжено ${manaBurn} маны врага!`, 'dmg');
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
    
    if (a.echo) { 
        window.echoActive = true; 
        addBattleLog(`🔁 Эхо заклинания! Следующее заклинание сработает дважды`, 'info');
    }
    
    if (a.immune) { 
        player.temporaryEffects.push({ immune: true, dur: a.dur || 1 }); 
        addBattleLog(`🛡️ Иммунитет на ${a.dur || 1} ход!`, 'heal');
    }
    
    if (a.reflect) {
        player.temporaryEffects.push({ reflect: a.reflect, dur: a.dur || 1 });
        addBattleLog(`↩️ Отражение ${a.reflect}% урона на ${a.dur || 1} ход!`, 'info');
    }
    
    if (a.damageReduction) {
        player.temporaryEffects.push({ damageReduction: a.damageReduction, dur: a.dur || 1 });
        addBattleLog(`🛡️ Получаемый урон снижен на ${a.damageReduction}%!`, 'info');
    }
    
    if (a.deathSave) {
        deathSaveActive = true;
        addBattleLog(`💪 Инстинкт выживания! Вы не умрёте от одного удара!`, 'success');
    }
    
    let crit = Math.random() * 100 <= player.criticalChance;
    if (crit && !a.guaranteedCrit) {
        dmg = Math.floor(dmg * (player.criticalDamage / 100));
        addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР!`, 'crit');
    }
    
    if (a.doubleHit) {
        dmg = Math.floor(getPlayerEffectiveAttack() * a.dmg / 100) * 2;
        addBattleLog(`🏹 Двойной выстрел!`, 'info');
    }
    if (a.tripleHit) {
        dmg = Math.floor(getPlayerEffectiveAttack() * a.dmg / 100) * 3;
        addBattleLog(`🏹 Тройной выстрел!`, 'info');
    }
    if (a.quadHit) {
        dmg = Math.floor(getPlayerEffectiveAttack() * a.dmg / 100) * 4;
        addBattleLog(`🏹 Четыре выстрела!`, 'info');
    }
    if (a.multiHit) {
        let totalDmg = 0;
        for (let h = 0; h < a.multiHit.hits; h++) {
            let hitDmg = Math.floor(getPlayerEffectiveAttack() * (a.multiHit.baseDmg + (h * (a.multiHit.ramp || 0))) / 100);
            if (a.multiHit.critRamp && h > 0) {
                if (Math.random() * 100 <= (player.criticalChance + h * a.multiHit.critRamp)) {
                    hitDmg = Math.floor(hitDmg * (player.criticalDamage / 100));
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
    
    const appliedDamage = applyDamageToMonster(dmg);
    addBattleLog(`✨ ${a.name}: ${appliedDamage} урона!`, 'dmg');
    
    if (!nextNoCd) a.currentCooldown = a.cd;
    else {
        nextNoCd = false;
        addBattleLog(`⚡ Способность использована без перезарядки!`, 'info');
    }
    
    animatePlayerAttack(() => {
        floatDamage('enemy', appliedDamage, crit);
        if (currentMonster.health <= 0) { 
            if (extraTurn) {
                addBattleLog(`⚡ Дополнительный ход за убийство!`, 'crit');
                isPlayerTurn = true;
                renderBattle();
                updateBattleButtons();
                return;
            }
            victory(); 
            return; 
        }
        setTimeout(() => { monsterTurn(); }, 300);
    });
    
    if (window.echoActive && appliedDamage > 0) { 
        window.echoActive = false; 
        const echoDamage = applyDamageToMonster(appliedDamage);
        addBattleLog(`🔁 Эхо: +${echoDamage} урона!`, 'info'); 
        if (currentMonster.health <= 0) setTimeout(() => victory(), 100);
    }
    
    renderBattle();
    saveGame();
}

function fleeBattle() {
    if (Math.random() * 100 <= 50) {
        addBattleLog('🏃 Сбежали!', 'info');
        currentMonster = null;
        document.getElementById('dynamicContent').innerHTML = '';
        document.body.classList.remove('low-hp');
        renderGame();
    } else {
        addBattleLog('❌ Побег не удался!', 'info');
        setTimeout(() => { monsterTurn(); }, 500);
    }
}

// ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.playerAttack = playerAttack;
window.attemptDodge = attemptDodge;
window.showBattleAbilities = showBattleAbilities;
window.useBattleAbility = useBattleAbility;
window.fleeBattle = fleeBattle;