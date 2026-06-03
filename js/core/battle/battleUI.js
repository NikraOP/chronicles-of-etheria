// js/core/battle/battleUI.js

function renderBattle(options) {
    options = options || {};
    if (!currentMonster) return;
    if (window._strikeAnimActive && !options.force) {
        if (options.vitalsOnly) {
            updateBattleVitality();
            updateBattleButtons();
            return;
        }
        safeRenderBattle();
        return;
    }
    if (options.skipIfAnimating && window._strikeAnimActive) return;
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const av = getAvatar();
    const pHp = player.maxHealth > 0 ? (player.health / player.maxHealth * 100) : 0;
    const mHp = currentMonster.maxHealth > 0 ? (currentMonster.health / currentMonster.maxHealth * 100) : 0;
    const bgStyle = loc.bgColor;
    const monsterImg = currentMonster.img ? '<img src="' + currentMonster.img + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'' + currentMonster.icon + '\'">' : '<span class="sprite-fallback">' + currentMonster.icon + '</span>';

    // Способности монстра
    let abilitiesHTML = '';
    if (currentMonster.abilities && currentMonster.abilities.length > 0) {
        abilitiesHTML = '<div class="monster-abilities" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; justify-content: center;">';
        for (let ability of currentMonster.abilities) {
            const currentCD = monsterAbilityCooldowns[ability.name] || 0;
            const isOnCooldown = currentCD > 0;
            let abilityColor = '', abilityIcon = '';
            switch(ability.type) {
                case 'damage': abilityIcon = '💥'; abilityColor = '#e74c3c'; break;
                case 'heal': abilityIcon = '💚'; abilityColor = '#2ecc71'; break;
                case 'buff': abilityIcon = '⚡'; abilityColor = '#f39c12'; break;
                case 'debuff': abilityIcon = '😵'; abilityColor = '#9b59b6'; break;
                case 'dot': abilityIcon = '☠️'; abilityColor = '#e67e22'; break;
                case 'shield': abilityIcon = '🛡️'; abilityColor = '#3498db'; break;
                case 'lifesteal': abilityIcon = '🩸'; abilityColor = '#e74c3c'; break;
                default: abilityIcon = '✨'; abilityColor = '#aaa';
            }
            let tooltipText = `${ability.name}\nТип: ${getAbilityTypeName(ability.type)}\n`;
            if (ability.multiplier) tooltipText += `Урон: x${ability.multiplier}\n`;
            if (ability.value) {
                if (ability.type === 'heal') tooltipText += `Лечение: ${ability.value}% HP\n`;
                else if (ability.type === 'shield') tooltipText += `Щит: ${ability.value}% HP\n`;
                else if (ability.type === 'lifesteal') tooltipText += `Вампиризм: ${ability.value}%\n`;
                else if (ability.type === 'dot') tooltipText += `Урон: ${ability.value}% HP/ход\n`;
                else if (ability.type === 'buff' || ability.type === 'debuff') tooltipText += `Эффект: ${ability.value}%\n`;
            }
            if (ability.duration) tooltipText += `Длительность: ${ability.duration} ход(а)\n`;
            if (ability.chance) tooltipText += `Шанс: ${ability.chance}%\n`;
            if (ability.cooldown) tooltipText += `Перезарядка: ${ability.cooldown} глоб. ход(а)\n`;
            tooltipText += isOnCooldown ? `⏳ Осталось: ${currentCD} глоб. ход(а)` : `✅ Готово к использованию`;
            tooltipText = tooltipText.replace(/'/g, "\\'");
            abilitiesHTML += `<div class="ability-badge" style="display: inline-flex; align-items: center; gap: 4px; background: ${isOnCooldown ? 'rgba(50,50,50,0.8)' : 'rgba(0,0,0,0.5)'}; border: 1px solid ${isOnCooldown ? '#555' : abilityColor}; border-radius: 20px; padding: 3px 8px; font-size: 11px; cursor: help; transition: all 0.2s; opacity: ${isOnCooldown ? 0.6 : 1};" title="${tooltipText}">
                <span style="font-size: 12px;">${abilityIcon}</span>
                <span style="color: ${abilityColor};">${ability.name}</span>
                ${isOnCooldown ? `<span style="color: #ffaa00; font-size: 10px;">⏳${currentCD}</span>` : ''}
            </div>`;
        }
        abilitiesHTML += '</div>';
    }

    // Эффекты монстра (DoT)
    let monsterDotHTML = '';
    if (currentMonster.effects && currentMonster.effects.length > 0) {
        const dotEffects = currentMonster.effects.filter(e => e.val);
        if (dotEffects.length > 0) {
            monsterDotHTML = '<div class="active-effects" style="margin-top: 4px;">';
            for (let effect of dotEffects) {
                let icon = '';
                if (effect.type === 'Яд' || effect.type === 'poison') icon = '☠️';
                else if (effect.type === 'Горение' || effect.type === 'burn') icon = '🔥';
                else if (effect.type === 'Шок' || effect.type === 'shock') icon = '⚡';
                else icon = '💀';
                monsterDotHTML += `<div class="effect-icon dot" style="display: inline-block; background: rgba(0,0,0,0.5); border-radius: 12px; padding: 2px 6px; margin-right: 4px; font-size: 10px;" title="${effect.type} - ${effect.val}% HP/ход (${effect.dur} ход.)">${icon} ${effect.val}%</div>`;
            }
            monsterDotHTML += '</div>';
        }
    }

    // ===== ЩИТ МОНСТРА =====
    let monsterShieldValue = 0;
    let monsterShieldRemaining = 0;
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.shield) {
        monsterShieldValue = currentMonster.activeBuffs.shield.value;
        monsterShieldRemaining = currentMonster.activeBuffs.shield.remainingTurns;
    }
    
    let monsterShieldHTML = '';
    if (monsterShieldValue > 0) {
        const shieldPercent = (monsterShieldValue / currentMonster.maxHealth) * 100;
        monsterShieldHTML = `
            <div class="shield-bar" style="width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;">
                <div class="shield-fill" style="width: ${Math.min(100, shieldPercent)}%; height: 100%; background: #3498db;"></div>
            </div>
            <div class="shield-hp-label" style="font-size: 9px; color: #3498db; margin-top: 2px;">🛡️ Щит: ${monsterShieldValue} HP (${monsterShieldRemaining} ход.)</div>
        `;
    }

    // ===== БАФФЫ МОНСТРА (ИСПРАВЛЕНО) =====
    let monsterBuffsHTML = '';
    if (currentMonster.activeBuffs) {
        const buffs = [];
        
        if (currentMonster.activeBuffs.atk) {
            buffs.push(`⚔️ Атака +${currentMonster.activeBuffs.atk.value}% (${currentMonster.activeBuffs.atk.remainingTurns} ход.)`);
        }
        if (currentMonster.activeBuffs.def) {
            buffs.push(`🛡️ Защита +${currentMonster.activeBuffs.def.value}% (${currentMonster.activeBuffs.def.remainingTurns} ход.)`);
        }
        if (currentMonster.activeBuffs.dodge) {
            buffs.push(`💨 Уклонение +${currentMonster.activeBuffs.dodge.value}% (${currentMonster.activeBuffs.dodge.remainingTurns} ход.)`);
        }
        if (currentMonster.activeBuffs.lifesteal) {
            buffs.push(`🩸 Вампиризм ${currentMonster.activeBuffs.lifesteal.value}% (${currentMonster.activeBuffs.lifesteal.remainingTurns} ход.)`);
        }
        if (currentMonster.activeBuffs.reflect) {
            buffs.push(`🔄 Отражение ${currentMonster.activeBuffs.reflect.value}% (${currentMonster.activeBuffs.reflect.remainingTurns} ход.)`);
        }
        if (currentMonster.activeBuffs.crit) {
            buffs.push(`💥 Крит +${currentMonster.activeBuffs.crit.value}% (${currentMonster.activeBuffs.crit.remainingTurns} ход.)`);
        }
        
        if (buffs.length > 0) {
            monsterBuffsHTML = `<div class="monster-buffs" style="font-size: 10px; color: #f39c12; margin-top: 4px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 10px; display: inline-block;">${buffs.join(' | ')}</div>`;
        }
    }

    // Эффекты игрока (дебаффы)
    let playerEffectsHTML = '';
    const activePlayerEffects = player.temporaryEffects.filter(e => e.type && e.type.startsWith('debuff_'));
    if (activePlayerEffects.length > 0) {
        playerEffectsHTML = '<div class="active-effects" style="margin-top: 4px;">';
        for (let effect of activePlayerEffects) {
            let icon = '', text = '';
            const debuffType = effect.type.replace('debuff_', '');
            if (debuffType === 'atk') { icon = '⚔️'; text = `Атака -${effect.value}%`; }
            else if (debuffType === 'def') { icon = '🛡️'; text = `Защита -${effect.value}%`; }
            else if (debuffType === 'dodge') { icon = '💨'; text = `Уклонение -${effect.value}%`; }
            else if (debuffType === 'all') { icon = '😵'; text = `Все -${effect.value}%`; }
            else if (debuffType === 'freeze') { icon = '❄️'; text = `Заморозка`; }
            else if (debuffType === 'blind') { icon = '👁️'; text = `Ослепление -${effect.value}%`; }
            else if (debuffType === 'slow') { icon = '🕸️'; text = `Паутина −${effect.value}% атаки (${effect.dur} ход.)`; }
            playerEffectsHTML += `<div class="effect-icon debuff" style="display: inline-block; background: rgba(155,89,182,0.3); border-radius: 12px; padding: 2px 6px; margin-right: 4px; font-size: 10px;" title="${text} (${effect.dur} ход.)">${icon} ${effect.value}%</div>`;
        }
        playerEffectsHTML += '</div>';
    }

    // Отображение DoT эффектов на игроке
    let playerDotHTML = '';
    const playerDots = player.temporaryEffects.filter(e => e.isDot && e.dur > 0);
    if (playerDots.length > 0) {
        playerDotHTML = '<div class="active-effects" style="margin-top: 4px;">';
        for (let dot of playerDots) {
            const dotType = dot.type.replace('dot_', '');
            const icon = dot.dotIcon || (dotType === 'burn' ? '🔥' : '☠️');
            playerDotHTML += `<div class="effect-icon dot" style="display: inline-block; background: rgba(230,126,34,0.3); border-radius: 12px; padding: 2px 6px; margin-right: 4px; font-size: 10px;" title="${dotType} - ${dot.value}% HP/ход (${dot.dur} ход.)">${icon} ${dot.value}%</div>`;
        }
        playerDotHTML += '</div>';
    }

    // Щит игрока
    let playerShieldHTML = '';
    const playerShield = player.temporaryEffects.find(e => e.shield !== undefined && e.shield > 0);
    if (playerShield && playerShield.shield > 0) {
        const shieldPercent = (playerShield.shield / player.maxHealth) * 100;
        playerShieldHTML = `
            <div class="shield-bar" style="width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;">
                <div class="shield-fill" style="width: ${Math.min(100, shieldPercent)}%; height: 100%; background: #3498db;"></div>
            </div>
            <div class="shield-hp-label" style="font-size: 9px; color: #3498db; margin-top: 2px;">🛡️ Щит: ${playerShield.shield} HP</div>
        `;
    }

    // Отображаемые статы игрока с учётом дебаффов
    let displayAtk = player.attack;
    let displayDef = player.defense;
    let displayDodge = player.dodgeChance;
    
    const atkDebuff = player.temporaryEffects.find(e => e.type === 'debuff_atk');
    if (atkDebuff) displayAtk = Math.floor(displayAtk * (1 - atkDebuff.value / 100));
    const defDebuff = player.temporaryEffects.find(e => e.type === 'debuff_def');
    if (defDebuff) displayDef = Math.floor(displayDef * (1 - defDebuff.value / 100));
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) {
        displayAtk = Math.floor(displayAtk * (1 - allDebuff.value / 100));
        displayDef = Math.floor(displayDef * (1 - allDebuff.value / 100));
        displayDodge = Math.max(0, displayDodge - allDebuff.value);
    }
    
    const hasDebuffs = player.temporaryEffects.some(e => e.type && e.type.startsWith('debuff_'));
    let debuffedStatsHTML = '';
    if (hasDebuffs) {
        debuffedStatsHTML = `<div style="font-size: 9px; color: #e74c3c; margin-top: 4px; background: rgba(231,76,60,0.2); border-radius: 8px; padding: 3px 6px;">
            ⚔️ ${displayAtk} (было ${player.attack}) | 🛡️ ${displayDef} (было ${player.defense}) | 💨 ${displayDodge}% (было ${player.dodgeChance}%)
        </div>`;
    }

    let logHTML = '<div class="battle-log" id="battleLog">';
    battleLogEntries.forEach(e => { logHTML += '<div class="log-entry ' + e.cls + '">' + e.msg + '</div>'; });
    logHTML += '</div>';

    const html = '<div class="battle-wrapper"><div class="battle-arena" style="background:' + bgStyle + ';" id="battleArena"><div class="ground"></div>' +
        '<div class="combatant-wrapper" id="enemyWrapper">' +
            '<div class="combatant-sprite" id="enemySprite">' + monsterImg + '</div>' +
            '<div class="combatant-info">' +
                '<div class="combatant-name" style="color:#e74c3c;">' + currentMonster.name + '</div>' +
                '<div class="health-bar"><div class="health-fill enemy-hp" style="width:' + mHp + '%;"></div></div>' +
                monsterShieldHTML +
                '<div class="health-text">' + currentMonster.health + '/' + currentMonster.maxHealth + '</div>' +
                monsterBuffsHTML +
                monsterDotHTML +
                abilitiesHTML +
            '</div>' +
        '</div>' +
        '<div class="vs-badge">⚔️ Ход ' + (typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0) + ' ⚔️</div>' +
        '<div class="combatant-wrapper" id="playerWrapper">' +
            '<div class="combatant-sprite" id="playerSprite"><span class="sprite-fallback">' + av + '</span></div>' +
            '<div class="combatant-info">' +
                '<div class="combatant-name" style="color:#2ecc71;">' + player.name + '</div>' +
                '<div class="health-bar"><div class="health-fill player-hp" style="width:' + pHp + '%;"></div></div>' +
                playerShieldHTML +
                '<div class="health-text">' + player.health + '/' + player.maxHealth + (player.class === 'Маг' ? ' | 💎' + player.mana : '') + '</div>' +
                playerDotHTML +
                debuffedStatsHTML +
                playerEffectsHTML +
            '</div>' +
        '</div>' +
        '</div><div class="action-buttons"><button class="action-btn" onclick="playerAttack()" id="btnAtk">⚔️ Атака</button><button class="action-btn" onclick="showBattleAbilities()" id="btnAbi">✨ Способности</button><button class="action-btn" onclick="attemptDodge()" id="btnDodge">💨 Уклон</button><button class="action-btn danger" onclick="fleeBattle()">🏃 Бежать</button></div>' +
        showItemCooldownsInBattle() +
        logHTML + '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
    updateBattleButtons();
}

function setCombatantShieldDisplay(wrapper, shieldValue, maxHp, remainingTurns) {
    const info = wrapper && wrapper.querySelector('.combatant-info');
    if (!info) return;
    const healthBar = info.querySelector('.health-bar');
    if (!healthBar) return;

    let shieldBar = info.querySelector('.shield-bar');
    let shieldLabel = info.querySelector('.shield-hp-label');

    if (!shieldValue || shieldValue <= 0) {
        if (shieldBar) shieldBar.remove();
        if (shieldLabel) shieldLabel.remove();
        return;
    }

    const shieldPercent = Math.min(100, (shieldValue / maxHp) * 100);
    const labelText = remainingTurns != null
        ? `🛡️ Щит: ${shieldValue} HP (${remainingTurns} ход.)`
        : `🛡️ Щит: ${shieldValue} HP`;

    if (!shieldBar) {
        shieldBar = document.createElement('div');
        shieldBar.className = 'shield-bar';
        shieldBar.style.cssText = 'width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;';
        const fill = document.createElement('div');
        fill.className = 'shield-fill';
        fill.style.cssText = 'height: 100%; background: #3498db;';
        shieldBar.appendChild(fill);
        healthBar.insertAdjacentElement('afterend', shieldBar);
    }
    const fill = shieldBar.querySelector('.shield-fill');
    if (fill) fill.style.width = shieldPercent + '%';

    if (!shieldLabel) {
        shieldLabel = document.createElement('div');
        shieldLabel.className = 'shield-hp-label';
        shieldLabel.style.cssText = 'font-size: 9px; color: #3498db; margin-top: 2px;';
        const healthText = info.querySelector('.health-text');
        if (healthText) healthText.insertAdjacentElement('beforebegin', shieldLabel);
        else info.appendChild(shieldLabel);
    }
    shieldLabel.textContent = labelText;
}

/** Обновляет HP/щиты/ману без пересборки спрайтов (во время анимации удара). */
function updateBattleVitality() {
    if (!currentMonster) return;

    const playerWrapper = document.getElementById('playerWrapper');
    const enemyWrapper = document.getElementById('enemyWrapper');
    if (!playerWrapper || !enemyWrapper) return;

    const pHp = player.maxHealth > 0 ? (player.health / player.maxHealth * 100) : 0;
    const mHp = currentMonster.maxHealth > 0 ? (currentMonster.health / currentMonster.maxHealth * 100) : 0;

    const playerHpFill = playerWrapper.querySelector('.health-fill.player-hp');
    if (playerHpFill) playerHpFill.style.width = pHp + '%';

    const enemyHpFill = enemyWrapper.querySelector('.health-fill.enemy-hp');
    if (enemyHpFill) enemyHpFill.style.width = mHp + '%';

    const playerHealthText = playerWrapper.querySelector('.health-text');
    if (playerHealthText) {
        playerHealthText.textContent = player.health + '/' + player.maxHealth +
            (player.class === 'Маг' ? ' | 💎' + player.mana : '');
    }

    const enemyHealthText = enemyWrapper.querySelector('.health-text');
    if (enemyHealthText) {
        enemyHealthText.textContent = currentMonster.health + '/' + currentMonster.maxHealth;
    }

    const playerShieldFx = player.temporaryEffects.find(e => e.shield !== undefined && e.shield > 0);
    setCombatantShieldDisplay(
        playerWrapper,
        playerShieldFx ? playerShieldFx.shield : 0,
        player.maxHealth,
        null
    );

    let monsterShieldValue = 0;
    let monsterShieldRemaining = null;
    if (currentMonster.activeBuffs && currentMonster.activeBuffs.shield) {
        monsterShieldValue = currentMonster.activeBuffs.shield.value;
        monsterShieldRemaining = currentMonster.activeBuffs.shield.remainingTurns;
    }
    setCombatantShieldDisplay(
        enemyWrapper,
        monsterShieldValue,
        currentMonster.maxHealth,
        monsterShieldRemaining
    );
}

// Анимации боя (синхрон с CSS ~0.78s)
const STRIKE_DURATION_MS = 780;
const STRIKE_HEAVY_MS = 880;
const ENEMY_STRIKE_MS = 780;
const CAST_VISUAL_MS = 500;
const CAST_RESOLVE_MS = 120;
let pendingStrikeImpact = null;

function abilityNeedsStrike(ability, appliedDamage) {
    if (appliedDamage > 0) return true;
    if (!ability) return false;
    return !!(ability.dmg || ability.doubleHit || ability.tripleHit || ability.quadHit ||
        ability.multiHit || ability.bleedPercent || ability.hpLoss || ability.manaDrain);
}

function setStrikeImpact(fn) {
    pendingStrikeImpact = typeof fn === 'function' ? fn : null;
}

function consumeStrikeImpact() {
    const fn = pendingStrikeImpact;
    pendingStrikeImpact = null;
    return fn;
}

function getLungeDistance() {
    const arena = document.getElementById('battleArena');
    if (!arena) return 140;
    return Math.min(200, Math.max(64, Math.floor(arena.clientWidth * 0.17)));
}

function spawnCombatSlash(attackerSide) {
    const defenderWrap = document.getElementById(
        attackerSide === 'player' ? 'enemyWrapper' : 'playerWrapper'
    );
    if (!defenderWrap) return;
    const slash = document.createElement('div');
    slash.className = 'combat-slash ' + (
        attackerSide === 'player' ? 'combat-slash--from-right' : 'combat-slash--from-left'
    );
    defenderWrap.style.position = 'relative';
    defenderWrap.appendChild(slash);
    setTimeout(() => slash.remove(), 420);
}

/** Полная перерисовка боя, но не во время анимации удара/каста (чтобы не сбивать спрайт). */
function safeRenderBattle() {
    if (window._strikeAnimActive) {
        setTimeout(safeRenderBattle, 50);
        return;
    }
    renderBattle();
}

/** Лёгкое обновление после анимации — без пересборки спрайтов (нет «телепорта»). */
function syncBattleDisplayAfterAnim() {
    updateBattleVitality();
    updateBattleButtons();
}

/** Снимает CSS-классы анимации по animationend (с запасным таймаутом). */
function bindAnimationEndCleanup(el, classNames, maxMs, afterCleanup, requiredAnimName) {
    if (!el) {
        if (afterCleanup) afterCleanup();
        return;
    }
    const names = Array.isArray(classNames) ? classNames : [classNames];
    let done = false;
    let fallbackId = null;
    const finish = () => {
        if (done) return;
        done = true;
        if (fallbackId != null) clearTimeout(fallbackId);
        el.removeEventListener('animationend', onEnd);
        names.forEach(c => el.classList.remove(c));
        el.style.animationDuration = '';
        if (afterCleanup) afterCleanup();
    };
    const onEnd = (ev) => {
        if (ev.target !== el) return;
        if (requiredAnimName && ev.animationName && ev.animationName !== requiredAnimName) return;
        finish();
    };
    el.addEventListener('animationend', onEnd);
    fallbackId = setTimeout(finish, (maxMs || 780) + 120);
}

function playPlayerCast(callback, options) {
    options = options || {};
    window._strikeAnimActive = true;
    const el = document.getElementById('playerSprite');
    const onCastVisualEnd = () => {
        window._strikeAnimActive = false;
        if (typeof options.onAnimEnd === 'function') options.onAnimEnd();
    };
    if (el) {
        el.classList.remove('casting-ability');
        void el.offsetWidth;
        el.style.animationDuration = (CAST_VISUAL_MS / 1000) + 's';
        el.classList.add('casting-ability');
        bindAnimationEndCleanup(el, 'casting-ability', CAST_VISUAL_MS, onCastVisualEnd, 'castGlow');
    } else {
        setTimeout(onCastVisualEnd, CAST_VISUAL_MS);
    }
    setTimeout(() => { if (callback) callback(); }, CAST_RESOLVE_MS);
}

function playStrikeAnimation(attackerSide, callback, options) {
    options = options || {};
    window._strikeAnimActive = true;
    const isPlayer = attackerSide === 'player';
    const attackerEl = document.getElementById(isPlayer ? 'playerSprite' : 'enemySprite');
    const defenderEl = document.getElementById(isPlayer ? 'enemySprite' : 'playerSprite');
    const defenderWrap = document.getElementById(isPlayer ? 'enemyWrapper' : 'playerWrapper');
    const arena = document.getElementById('battleArena');
    const isCrit = !!options.isCrit;
    const heavy = !!options.heavy;
    let duration = options.duration;
    if (duration == null) {
        if (isPlayer) duration = heavy ? STRIKE_HEAVY_MS : STRIKE_DURATION_MS;
        else duration = heavy ? ENEMY_STRIKE_MS + 50 : ENEMY_STRIKE_MS;
    }
    const impactMs = Math.round(duration * 0.4);
    const animSec = (duration / 1000) + 's';

    const dist = getLungeDistance();
    if (arena) {
        arena.style.setProperty('--lunge-dist', dist + 'px');
        arena.style.setProperty('--kb-x', Math.max(10, Math.round(dist * 0.14)) + 'px');
    }

    const hitClass = isPlayer ? 'taking-damage-from-player' : 'taking-damage-from-enemy';
    const attackClass = isPlayer ? 'player-attacking' : 'enemy-attacking';

    let animEndHandled = false;
    const onAttackAnimComplete = () => {
        if (animEndHandled) return;
        animEndHandled = true;
        window._strikeAnimActive = false;
        if (callback && !options.fastResolve) callback();
        if (typeof options.onAnimEnd === 'function') options.onAnimEnd();
    };

    if (attackerEl) {
        attackerEl.classList.remove('player-attacking', 'enemy-attacking', 'is-striking', 'casting-ability');
        void attackerEl.offsetWidth;
        attackerEl.style.animationDuration = animSec;
        attackerEl.classList.add(attackClass, 'is-striking');
        bindAnimationEndCleanup(
            attackerEl,
            [attackClass, 'is-striking'],
            duration,
            onAttackAnimComplete,
            isPlayer ? 'playerLungeStrike' : 'enemyLungeStrike'
        );
    } else {
        setTimeout(onAttackAnimComplete, duration);
    }

    let impactFired = false;
    const fireImpact = () => {
        if (impactFired) return;
        impactFired = true;

        if (duration >= 280) spawnCombatSlash(attackerSide);

        if (defenderEl) {
            defenderEl.classList.remove(hitClass, 'taking-damage');
            void defenderEl.offsetWidth;
            defenderEl.classList.add(hitClass);
            bindAnimationEndCleanup(
                defenderEl,
                hitClass,
                520,
                null,
                isPlayer ? 'victimKnockbackFromPlayer' : 'victimKnockbackFromEnemy'
            );
        }
        if (defenderWrap) {
            defenderWrap.classList.remove('combat-hit-flash');
            void defenderWrap.offsetWidth;
            defenderWrap.classList.add('combat-hit-flash');
            bindAnimationEndCleanup(defenderWrap, 'combat-hit-flash', 480);
        }
        if (arena && heavy) {
            arena.classList.remove('arena-hit-flash');
            void arena.offsetWidth;
            arena.classList.add('arena-hit-flash');
            bindAnimationEndCleanup(arena, 'arena-hit-flash', 350);
        }

        if (typeof options.onImpact === 'function') options.onImpact();
        else if (typeof pendingStrikeImpact === 'function') {
            pendingStrikeImpact();
            pendingStrikeImpact = null;
        }
    };

    setTimeout(fireImpact, impactMs);

    if (callback && options.fastResolve) {
        setTimeout(() => callback(), impactMs + 40);
    }
}

function animatePlayerAbility(callback, ability, appliedDamage, crit, extraOptions) {
    extraOptions = extraOptions || {};
    if (!abilityNeedsStrike(ability, appliedDamage)) {
        playPlayerCast(callback, { onAnimEnd: extraOptions.onAnimEnd });
        return;
    }
    const atk = typeof getPlayerEffectiveAttack === 'function' ? getPlayerEffectiveAttack() : (player ? player.attack : 0);
    const heavy = !!extraOptions.heavy || !!crit || appliedDamage >= Math.floor(atk * 1.2);
    playStrikeAnimation('player', callback, {
        onImpact: extraOptions.onImpact,
        onAnimEnd: extraOptions.onAnimEnd,
        isCrit: crit,
        heavy: heavy,
        duration: heavy ? STRIKE_HEAVY_MS : STRIKE_DURATION_MS,
        fastResolve: false
    });
}

function animatePlayerAttack(callback, options) {
    options = options || {};
    if (options.fastResolve === undefined) options.fastResolve = false;
    if (options.duration == null) {
        options.duration = options.heavy || options.isCrit ? STRIKE_HEAVY_MS : STRIKE_DURATION_MS;
    }
    playStrikeAnimation('player', callback, options);
}

function animateEnemyAttack(callback, options) {
    options = options || {};
    // У монстра ход игрока после полной анимации; у игрока — fastResolve (см. animatePlayerAttack)
    if (options.fastResolve === undefined) options.fastResolve = false;
    if (options.duration == null) {
        options.duration = options.heavy ? STRIKE_HEAVY_MS : ENEMY_STRIKE_MS;
    }
    playStrikeAnimation('enemy', callback, options);
}

function floatDamage(target, amount, isCrit) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' damage-float--crit' : '');
    el.textContent = (isCrit ? '💥 ' : '') + '-' + amount;
    if (!isCrit) el.style.color = target === 'player' ? '#ff5555' : '#ffcc44';
    el.style.top = '8px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), isCrit ? 1200 : 1050);
}

function showFloatingText(target, text, type) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    switch(type) {
        case 'heal': el.style.color = '#2ecc71'; break;
        case 'damage': el.style.color = '#e74c3c'; break;
        case 'buff': el.style.color = '#f39c12'; break;
        case 'debuff': el.style.color = '#9b59b6'; break;
        case 'shield': el.style.color = '#3498db'; break;
        case 'dot': el.style.color = '#e67e22'; break;
        case 'summon': el.style.color = '#f0c040'; break;
        default: el.style.color = '#ffffff';
    }
    el.style.fontSize = '20px';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '0px';
    el.style.transform = 'translateX(-50%)';
    el.style.whiteSpace = 'nowrap';
    el.style.zIndex = '100';
    el.style.pointerEvents = 'none';
    el.style.animation = 'floatUp 1s ease-out forwards';
    wrapper.style.position = 'relative';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showHitEffect(target) {
    const sprite = document.getElementById(target === 'player' ? 'playerSprite' : 'enemySprite');
    const wrap = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (sprite) {
        const cls = target === 'player' ? 'taking-damage-from-enemy' : 'taking-damage-from-player';
        sprite.classList.remove(cls);
        void sprite.offsetWidth;
        sprite.classList.add(cls);
        setTimeout(() => sprite.classList.remove(cls), 450);
    }
    if (wrap) {
        wrap.classList.remove('combat-hit-flash');
        void wrap.offsetWidth;
        wrap.classList.add('combat-hit-flash');
        setTimeout(() => wrap.classList.remove('combat-hit-flash'), 420);
    }
}

function showHealEffect(target, amount) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'heal-effect';
    el.textContent = `+${amount}`;
    el.style.color = '#2ecc71';
    el.style.fontSize = '24px';
    el.style.fontWeight = 'bold';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '-10px';
    el.style.transform = 'translateX(-50%)';
    el.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
    el.style.animation = 'floatUp 0.8s ease-out forwards';
    el.style.zIndex = '100';
    wrapper.style.position = 'relative';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function showBuffEffect(target, icon) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'buff-effect';
    el.textContent = icon;
    el.style.fontSize = '30px';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '-20px';
    el.style.transform = 'translateX(-50%)';
    el.style.filter = 'drop-shadow(0 0 5px gold)';
    el.style.animation = 'buffPulse 0.6s ease-out';
    el.style.zIndex = '100';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

function showDebuffEffect(target, type) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    let icon = '😵';
    if (type === 'freeze') icon = '❄️';
    else if (type === 'blind') icon = '👁️';
    else if (type === 'poison') icon = '☠️';
    else if (type === 'burn') icon = '🔥';
    else if (type === 'slow') icon = '🐢';
    const el = document.createElement('div');
    el.className = 'debuff-effect';
    el.textContent = icon;
    el.style.fontSize = '30px';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '-20px';
    el.style.transform = 'translateX(-50%)';
    el.style.filter = 'drop-shadow(0 0 5px purple)';
    el.style.animation = 'debuffPulse 0.6s ease-out';
    el.style.zIndex = '100';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

function showShieldEffect(target, value) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'shield-effect';
    el.textContent = `🛡️ ${value}`;
    el.style.color = '#3498db';
    el.style.fontSize = '18px';
    el.style.fontWeight = 'bold';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '-30px';
    el.style.transform = 'translateX(-50%)';
    el.style.backgroundColor = 'rgba(52,152,219,0.3)';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '20px';
    el.style.whiteSpace = 'nowrap';
    el.style.animation = 'shieldAppear 0.5s ease-out';
    el.style.zIndex = '100';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function showItemCooldownsInBattle() {
    if (!player.inventory) return '';
    
    const hasPotions = (player.inventory.potions && player.inventory.potions.length > 0) ||
                       (player.inventory.foods && player.inventory.foods.length > 0) ||
                       (player.inventory.elixirs && player.inventory.elixirs.length > 0) ||
                       (player.inventory.scrolls && player.inventory.scrolls.length > 0);
    if (!hasPotions) return '';
    
    let html = '<div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px;">';
    html += '<div style="font-size: 11px; color: var(--gold); margin-bottom: 8px;">📦 Предметы:</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    
    if (player.inventory.potions && player.inventory.potions.length > 0) {
        const cd = window.getItemCooldown('potion');
        html += `<button class="action-btn" onclick="showInventoryAndUse('potion')" style="padding: 6px 12px; font-size: 11px; background: ${cd > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(46,204,113,0.2)'};">🧪 Зелья (${player.inventory.potions.length})${cd > 0 ? ` ⏳${cd}` : ''}</button>`;
    }
    if (player.inventory.foods && player.inventory.foods.length > 0) {
        const cd = window.getItemCooldown('food');
        html += `<button class="action-btn" onclick="showInventoryAndUse('food')" style="padding: 6px 12px; font-size: 11px; background: ${cd > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(243,156,18,0.2)'};">🍖 Еда (${player.inventory.foods.length})${cd > 0 ? ` ⏳${cd}` : ''}</button>`;
    }
    if (player.inventory.elixirs && player.inventory.elixirs.length > 0) {
        const cd = window.getItemCooldown('elixir');
        html += `<button class="action-btn" onclick="showInventoryAndUse('elixir')" style="padding: 6px 12px; font-size: 11px; background: ${cd > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(155,89,182,0.2)'};">💪 Эликсиры (${player.inventory.elixirs.length})${cd > 0 ? ` ⏳${cd}` : ''}</button>`;
    }
    if (player.inventory.scrolls && player.inventory.scrolls.length > 0) {
        const cd = window.getItemCooldown('scroll');
        html += `<button class="action-btn" onclick="showInventoryAndUse('scroll')" style="padding: 6px 12px; font-size: 11px; background: ${cd > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(52,152,219,0.2)'};">📜 Свитки (${player.inventory.scrolls.length})${cd > 0 ? ` ⏳${cd}` : ''}</button>`;
    }
    
    html += '</div></div>';
    return html;
}

function getAbilityTypeName(type) {
    const types = {
        'damage': '💥 Урон',
        'heal': '💚 Лечение',
        'buff': '⚡ Усиление',
        'debuff': '😵 Ослабление',
        'dot': '☠️ Урон с течением времени',
        'shield': '🛡️ Барьер',
        'lifesteal': '🩸 Вампиризм',
        'summon': '✨ Призыв'
    };
    return types[type] || '✨ Другое';
}

function showReflectEffect(target, value) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'reflect-effect';
    el.textContent = `🔄 ${value}`;
    el.style.color = '#ff6600';
    el.style.fontSize = '18px';
    el.style.fontWeight = 'bold';
    el.style.position = 'absolute';
    el.style.left = '50%';
    el.style.top = '-30px';
    el.style.transform = 'translateX(-50%)';
    el.style.backgroundColor = 'rgba(255,102,0,0.3)';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '20px';
    el.style.whiteSpace = 'nowrap';
    el.style.animation = 'reflectPulse 0.5s ease-out';
    el.style.zIndex = '100';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

window.showReflectEffect = showReflectEffect;
window.setStrikeImpact = setStrikeImpact;
window.consumeStrikeImpact = consumeStrikeImpact;
window.safeRenderBattle = safeRenderBattle;
window.syncBattleDisplayAfterAnim = syncBattleDisplayAfterAnim;
window.updateBattleVitality = updateBattleVitality;