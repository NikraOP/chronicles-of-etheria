// js/core/battle/battleUI.js

function getBattleArenaBgStyle() {
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    if (session && session.dungeonId && typeof getDungeonBattleArenaStyle === 'function') {
        return getDungeonBattleArenaStyle(session.dungeonId);
    }
    const loc = typeof LOCATIONS !== 'undefined' && player
        ? (LOCATIONS.find(function (l) { return l.name === player.location; }) || LOCATIONS[0])
        : null;
    return loc && loc.bgColor ? loc.bgColor : 'linear-gradient(135deg, #1a1a2a, #0a0a12)';
}

function buildStagingRosterPortraitHtml(m) {
    const icon = m.icon || '👹';
    const fallback = escapeBattleHtml(icon);
    if (!m.img) {
        return '<span class="battle-staging-roster-portrait battle-staging-roster-portrait--emoji">' + fallback + '</span>';
    }
    const src = typeof resolveGameAssetUrl === 'function' ? resolveGameAssetUrl(m.img) : m.img;
    return '<span class="battle-staging-roster-portrait">' +
        '<img class="battle-staging-roster-portrait-img" src="' + escapeBattleHtml(src) + '" alt="" loading="lazy" ' +
        'onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\';">' +
        '<span class="battle-staging-roster-portrait-fallback" style="display:none" aria-hidden="true">' + fallback + '</span>' +
        '</span>';
}

function buildStagingMonsterRosterHtml(candidates, isFixed) {
    if (!candidates || !candidates.length) {
        return '<div class="battle-staging-roster battle-staging-roster--empty">' +
            '<div class="battle-staging-roster-head">' +
                '<h3 class="battle-staging-roster-title">👹 Кто может выйти против вас</h3>' +
            '</div>' +
            '<p class="battle-staging-roster-empty">В этой локации нет противников.</p>' +
            '</div>';
    }
    let list = '';
    for (let i = 0; i < candidates.length; i++) {
        const m = candidates[i];
        list += '<li class="battle-staging-roster-item">' +
            buildStagingRosterPortraitHtml(m) +
            '<span class="battle-staging-roster-name">' + escapeBattleHtml(m.name || 'Монстр') + '</span>' +
            '</li>';
    }
    const title = isFixed ? '⚠️ Особый противник (бой с добычи)' : '👹 Кто может выйти против вас';
    const hint = isFixed
        ? 'Противник определён событием — появится после «В бой».'
        : 'Конкретный враг выбирается случайно из списка при нажатии «В бой».';
    const count = candidates.length;
    const countLabel = count === 1 ? '1 вариант' : count + ' вариантов';
    return '<div class="battle-staging-roster">' +
        '<div class="battle-staging-roster-head">' +
            '<h3 class="battle-staging-roster-title">' + title + '</h3>' +
            '<p class="battle-staging-roster-hint">' + hint + '</p>' +
            '<span class="battle-staging-roster-count">' + countLabel + '</span>' +
        '</div>' +
        '<ul class="battle-staging-roster-list">' + list + '</ul>' +
        '</div>';
}

function renderBattleStaging() {
    if (!player || typeof isBattleZoneStaging !== 'function' || !isBattleZoneStaging()) return;
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const candidates = typeof getStagingMonsterCandidates === 'function' ? getStagingMonsterCandidates() : [];
    const isFixed = !!(window._stagedFixedMonster && window._stagedFixedMonster.monsterData);
    const bgStyle = getBattleArenaBgStyle();
    const playerSpriteHtml = typeof getCombatantSpriteHtml === 'function' ? getCombatantSpriteHtml() : getAvatar();
    const rosterHtml = buildStagingMonsterRosterHtml(candidates, isFixed);
    const pHp = player.maxHealth > 0 ? (player.health / player.maxHealth * 100) : 100;

    const html = '<div class="battle-wrapper battle-wrapper--staging">' +
        '<div class="battle-staging-card">' +
            '<div class="battle-staging-header">' +
                '<h2 class="battle-staging-title">⚔️ ' + escapeBattleHtml(loc.name) + '</h2>' +
                '<p class="battle-staging-sub">Список возможных противников — слева. Ваш герой занимает боевую позицию справа.</p>' +
            '</div>' +
            '<div class="battle-arena battle-arena--staging" style="background:' + bgStyle + ';" id="battleArena">' +
                '<div class="combatant-wrapper battle-staging-roster-slot" id="stagingRosterSlot">' +
                    '<div class="battle-staging-roster-panel">' + rosterHtml + '</div>' +
                '</div>' +
                '<div class="combatant-wrapper battle-staging-player-slot" id="playerWrapper">' +
                    '<div class="combatant-sprite" id="playerSprite">' + playerSpriteHtml + '</div>' +
                    '<div class="combatant-info">' +
                        '<div class="combatant-name" style="color:#2ecc71;">' + escapeBattleHtml(player.name) + '</div>' +
                        '<div class="health-bar"><div class="health-fill player-hp" style="width:' + pHp + '%;"></div></div>' +
                        '<div class="health-text">' + player.health + '/' + player.maxHealth +
                            (player.class === 'Маг' ? ' | 💎' + player.mana + '/' + player.maxMana : '') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="battle-staging-commit-wrap">' +
                '<button type="button" class="action-btn battle-commit-btn" id="battleCommitBtn" onclick="commitBattleStart()">⚔️ В бой</button>' +
                '<button type="button" class="action-btn battle-staging-leave-btn" onclick="fleeBattle()">↩️ Покинуть поле</button>' +
            '</div>' +
        '</div>' +
    '</div>';

    const dc = document.getElementById('dynamicContent');
    if (dc) dc.innerHTML = html;
    if (typeof syncBattleZoneLayout === 'function') syncBattleZoneLayout();
}

function buildEnemySpriteInnerHtml(monster) {
    const monsterSrc = monster.img
        ? (typeof resolveGameAssetUrl === 'function' ? resolveGameAssetUrl(monster.img) : monster.img)
        : '';
    if (monsterSrc) {
        const icon = monster.icon || '👹';
        return '<img src="' + monsterSrc + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'' + icon + '\'">';
    }
    return '<span class="sprite-fallback">' + (monster.icon || '👹') + '</span>';
}

function buildEnemyShieldHTML(monster) {
    let monsterShieldValue = 0;
    let monsterShieldRemaining = 0;
    if (monster.activeBuffs && monster.activeBuffs.shield) {
        monsterShieldValue = monster.activeBuffs.shield.value;
        monsterShieldRemaining = monster.activeBuffs.shield.remainingTurns;
    }
    if (monsterShieldValue <= 0) return '';
    const shieldPercent = (monsterShieldValue / monster.maxHealth) * 100;
    return '<div class="shield-bar" style="width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;">' +
        '<div class="shield-fill" style="width: ' + Math.min(100, shieldPercent) + '%; height: 100%; background: #3498db;"></div></div>' +
        '<div class="shield-hp-label" style="font-size: 9px; color: #3498db; margin-top: 2px;">🛡️ Щит: ' + monsterShieldValue + ' HP (' + monsterShieldRemaining + ' ход.)</div>';
}

function buildEnemyCombatantWrapperHtml(monster, enemyIndex, isFocused, statusSlotHtml) {
    const mHp = monster.maxHealth > 0 ? (monster.health / monster.maxHealth * 100) : 0;
    const deadClass = monster.health <= 0 ? ' battle-enemy--defeated' : '';
    const focusClass = isFocused ? ' battle-enemy--focused' : '';
    const wrapperId = isFocused ? ' id="enemyWrapper"' : '';
    const spriteId = isFocused ? ' id="enemySprite"' : '';
    return '<div class="combatant-wrapper' + deadClass + focusClass + '"' + wrapperId +
        ' data-enemy-index="' + enemyIndex + '">' +
        '<div class="combatant-sprite"' + spriteId + '>' + buildEnemySpriteInnerHtml(monster) + '</div>' +
        '<div class="combatant-info">' +
        '<div class="combatant-name" style="color:#e74c3c;">' + escapeBattleHtml(monster.name) + '</div>' +
        '<div class="health-bar"><div class="health-fill enemy-hp" style="width:' + mHp + '%;"></div></div>' +
        buildEnemyShieldHTML(monster) +
        '<div class="health-text">' + monster.health + '/' + monster.maxHealth + '</div>' +
        (statusSlotHtml ? '<div class="combatant-status-slot" data-side="enemy">' + statusSlotHtml + '</div>' : '') +
        '</div></div>';
}

function getDuoAllyFallbackAvatar(ally) {
    if (!ally) return '👥';
    if (ally.skinIcon) return ally.skinIcon;
    if (ally.class === 'Воин') return '🗡️';
    if (ally.class === 'Маг') return '🧙';
    if (ally.class === 'Лучник') return '🏹';
    return '👥';
}

function buildDuoAllySpriteInnerHtml(ally) {
    const portrait = typeof resolveDuoPlayerPortrait === 'function'
        ? resolveDuoPlayerPortrait(ally)
        : { img: ally && (ally.portraitImg || ally.avatar || ally.schoolImg || ''), skinName: ally && ally.skinName, skinIcon: ally && ally.skinIcon };
    const img = portrait && portrait.img
        ? (typeof resolveGameAssetUrl === 'function' ? resolveGameAssetUrl(portrait.img) : portrait.img)
        : '';
    const fb = escapeBattleHtml(getDuoAllyFallbackAvatar(Object.assign({}, ally || {}, portrait || {})));
    if (!img) return '<span class="sprite-fallback">' + fb + '</span>';
    return '<img class="player-avatar" src="' + escapeBattleHtml(img) + '" alt=""' +
        ' onerror="this.onerror=null;this.classList.add(\'combatant-avatar--hidden\');' +
        'var n=this.nextElementSibling;if(n)n.classList.add(\'sprite-fallback--show\');">' +
        '<span class="sprite-fallback sprite-fallback--reserve" aria-hidden="true">' + fb + '</span>';
}

function buildDungeonAllyCombatantHtml() {
    if (!window.dungeonDuoBattleActive || typeof getDungeonDuoAlly !== 'function') return '';
    const ally = getDungeonDuoAlly();
    if (!ally) return '';
    const aHp = ally.maxHealth > 0 ? (ally.health / ally.maxHealth * 100) : 0;
    const portrait = typeof resolveDuoPlayerPortrait === 'function' ? resolveDuoPlayerPortrait(ally) : ally;
    const manaText = ally.class === 'Маг' && ally.maxMana > 0
        ? ' | 💎' + (ally.mana || 0) + '/' + ally.maxMana
        : '';
    const skinText = portrait && portrait.skinName
        ? '<div class="combatant-skin-name">' + escapeBattleHtml((portrait.skinIcon ? portrait.skinIcon + ' ' : '') + portrait.skinName) + '</div>'
        : '';
    const defeatedCls = (ally.health || 0) <= 0 ? ' battle-ally--defeated' : '';
    const allyShield = Array.isArray(ally.temporaryEffects)
        ? ally.temporaryEffects.find(function (e) { return e && e.shield > 0; })
        : null;
    let allyShieldHtml = '';
    if (allyShield && ally.maxHealth > 0) {
        const shieldPct = Math.min(100, (allyShield.shield / ally.maxHealth) * 100);
        allyShieldHtml =
            '<div class="shield-bar" style="width:100%;height:4px;background:rgba(52,152,219,0.3);border-radius:2px;margin-top:2px;overflow:hidden;">' +
            '<div class="shield-fill" style="width:' + shieldPct + '%;height:100%;background:#3498db;"></div></div>' +
            '<div class="shield-hp-label" style="font-size:9px;color:#3498db;margin-top:2px;">🛡️ Щит: ' + allyShield.shield + ' HP</div>';
    }
    const allyStatusHtml = buildPlayerTemporaryBuffsHTML(ally.temporaryEffects);
    return '<div class="combatant-wrapper combatant-wrapper--ally' + defeatedCls + '" id="allyWrapper">' +
        '<div class="combatant-sprite" id="allySprite">' + buildDuoAllySpriteInnerHtml(ally) + '</div>' +
        '<div class="combatant-info">' +
        '<div class="combatant-name" style="color:#3498db;">' + escapeBattleHtml(ally.name || 'Союзник') + '</div>' +
        '<div class="health-bar"><div class="health-fill player-hp" style="width:' + aHp + '%;"></div></div>' +
        allyShieldHtml +
        '<div class="health-text">' + (ally.health || 0) + '/' + (ally.maxHealth || 0) + manaText + '</div>' +
        skinText +
        '<div class="combatant-status-slot" data-side="ally">' + allyStatusHtml + '</div>' +
        '</div></div>';
}

function buildBattleEnemiesRowHtml() {
    const enemies = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
    if (enemies.length <= 1) return '';
    const resolvedFocus = typeof getBattleEnemyFocusIndex === 'function'
        ? getBattleEnemyFocusIndex()
        : 0;
    const packCount = enemies.length >= 3 ? 3 : 2;
    let row = '';
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const isFocused = i === resolvedFocus;
        const statusSlot = buildMonsterBuffsHTML(enemy) +
            buildMonsterStatusEffectsHTML(enemy) +
            buildMonsterAbilitiesHTML(enemy);
        row += buildEnemyCombatantWrapperHtml(enemy, i, isFocused, statusSlot);
    }
    return '<div class="battle-enemies-pack battle-enemies-pack--count-' + packCount + '" id="enemyPack">' + row + '</div>';
}

function renderBattle(options) {
    options = options || {};
    if (!currentMonster) return;
    if (typeof isBattleEngaged === 'function' && !isBattleEngaged()) return;
    if (!options.vitalsOnly) window._battleAbilitiesMenuOpen = false;
    if (window._strikeAnimActive && !options.force) {
        if (options.vitalsOnly) {
            updateBattleVitality();
            updateBattleStatusPanels();
            updateBattleButtons();
            return;
        }
        safeRenderBattle();
        return;
    }
    if (options.skipIfAnimating && window._strikeAnimActive) return;
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const playerSpriteHtml = typeof getCombatantSpriteHtml === 'function' ? getCombatantSpriteHtml() : getAvatar();
    const pHp = player.maxHealth > 0 ? (player.health / player.maxHealth * 100) : 0;
    const mHp = currentMonster.maxHealth > 0 ? (currentMonster.health / currentMonster.maxHealth * 100) : 0;
    const bgStyle = getBattleArenaBgStyle();
    const multiEnemyRow = buildBattleEnemiesRowHtml();
    const monsterImg = buildEnemySpriteInnerHtml(currentMonster);

    const abilitiesHTML = buildMonsterAbilitiesHTML();
    const monsterDotHTML = buildMonsterStatusEffectsHTML();

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

    const monsterBuffsHTML = buildMonsterBuffsHTML();
    const playerStatusHTML = buildPlayerBattleStatusHTML();

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

    const turnNum = typeof getGlobalBattleTurn === 'function' ? getGlobalBattleTurn() : 0;
    const enemyBlockHtml = multiEnemyRow
        ? multiEnemyRow
        : ('<div class="combatant-wrapper" id="enemyWrapper" data-enemy-index="0">' +
            '<div class="combatant-sprite" id="enemySprite">' + monsterImg + '</div>' +
            '<div class="combatant-info">' +
                '<div class="combatant-name" style="color:#e74c3c;">' + escapeBattleHtml(currentMonster.name) + '</div>' +
                '<div class="health-bar"><div class="health-fill enemy-hp" style="width:' + mHp + '%;"></div></div>' +
                monsterShieldHTML +
                '<div class="health-text">' + currentMonster.health + '/' + currentMonster.maxHealth + '</div>' +
                '<div class="combatant-status-slot" data-side="enemy">' + monsterBuffsHTML + monsterDotHTML + abilitiesHTML + '</div>' +
            '</div>' +
        '</div>');
    const html = '<div class="battle-wrapper"><div class="battle-arena" style="background:' + bgStyle + ';" id="battleArena">' +
        enemyBlockHtml +
        '<div class="vs-badge">⚔️ Ход ' + turnNum + ' ⚔️</div>' +
        '<div class="battle-party-row">' +
        '<div class="combatant-wrapper" id="playerWrapper">' +
            '<div class="combatant-sprite" id="playerSprite">' + playerSpriteHtml + '</div>' +
            '<div class="combatant-info">' +
                '<div class="combatant-name" style="color:#2ecc71;">' + escapeBattleHtml(player.name) + '</div>' +
                '<div class="health-bar"><div class="health-fill player-hp" style="width:' + pHp + '%;"></div></div>' +
                playerShieldHTML +
                '<div class="health-text">' + player.health + '/' + player.maxHealth + (player.class === 'Маг' ? ' | 💎' + player.mana : '') + '</div>' +
                '<div class="combatant-status-slot" data-side="player">' + playerStatusHTML + debuffedStatsHTML + '</div>' +
            '</div>' +
        '</div>' +
        buildDungeonAllyCombatantHtml() +
        '</div>' +
        '</div>' + (typeof buildBattleAbilityHotbarHtml === 'function' ? buildBattleAbilityHotbarHtml() : '') +
        buildPotionQuickRowHtml() +
        '<div class="action-buttons"><button class="action-btn" onclick="playerAttack()" id="btnAtk">⚔️ Атака</button><button class="action-btn" onclick="showBattleAbilities()" id="btnAbi">✨ Способности</button><button class="action-btn" onclick="attemptDodge()" id="btnDodge">💨 Уклон</button><button class="action-btn danger" onclick="fleeBattle()">🏃 Бежать</button></div>' +
        logHTML + '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
    updateBattleButtons();
    if (typeof updateBattleActionKeyHints === 'function') updateBattleActionKeyHints();
    if (typeof restoreBattleTargetingUi === 'function') restoreBattleTargetingUi();
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

function updateOneEnemyVitality(monster, wrapper) {
    if (!monster || !wrapper) return;
    const mHp = monster.maxHealth > 0 ? (monster.health / monster.maxHealth * 100) : 0;
    const enemyHpFill = wrapper.querySelector('.health-fill.enemy-hp');
    if (enemyHpFill) enemyHpFill.style.width = mHp + '%';
    const enemyHealthText = wrapper.querySelector('.health-text');
    if (enemyHealthText) enemyHealthText.textContent = monster.health + '/' + monster.maxHealth;
    let monsterShieldValue = 0;
    let monsterShieldRemaining = null;
    if (monster.activeBuffs && monster.activeBuffs.shield) {
        monsterShieldValue = monster.activeBuffs.shield.value;
        monsterShieldRemaining = monster.activeBuffs.shield.remainingTurns;
    }
    setCombatantShieldDisplay(wrapper, monsterShieldValue, monster.maxHealth, monsterShieldRemaining);
}

/** Обновляет HP/щиты/ману без пересборки спрайтов (во время анимации удара). */
function updateBattleVitality() {
    if (!player) return;

    const playerWrapper = document.getElementById('playerWrapper');
    if (playerWrapper) {
        const pHp = player.maxHealth > 0 ? (player.health / player.maxHealth * 100) : 0;
        const playerHpFill = playerWrapper.querySelector('.health-fill.player-hp');
        if (playerHpFill) playerHpFill.style.width = pHp + '%';
        const playerHealthText = playerWrapper.querySelector('.health-text');
        if (playerHealthText) {
            playerHealthText.textContent = player.health + '/' + player.maxHealth +
                (player.class === 'Маг' ? ' | 💎' + player.mana : '');
        }
        const playerShieldFx = player.temporaryEffects.find(e => e.shield !== undefined && e.shield > 0);
        setCombatantShieldDisplay(
            playerWrapper,
            playerShieldFx ? playerShieldFx.shield : 0,
            player.maxHealth,
            null
        );
    }

    const roster = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
    const pack = document.getElementById('enemyPack');
    if (pack && roster.length > 1) {
        pack.querySelectorAll('.combatant-wrapper[data-enemy-index]').forEach(function (wrap) {
            const idx = parseInt(wrap.getAttribute('data-enemy-index'), 10);
            if (!isNaN(idx) && roster[idx]) updateOneEnemyVitality(roster[idx], wrap);
        });
    } else if (currentMonster) {
        const enemyWrapper = document.getElementById('enemyWrapper');
        if (enemyWrapper) updateOneEnemyVitality(currentMonster, enemyWrapper);
    }

    if (window.dungeonDuoBattleActive && typeof getDungeonDuoAlly === 'function') {
        const ally = getDungeonDuoAlly();
        const allyWrap = document.getElementById('allyWrapper');
        if (ally && allyWrap) {
            const aHp = ally.maxHealth > 0 ? (ally.health / ally.maxHealth * 100) : 0;
            const fill = allyWrap.querySelector('.health-fill.player-hp');
            if (fill) fill.style.width = aHp + '%';
            const text = allyWrap.querySelector('.health-text');
            if (text) {
                text.textContent = (ally.health || 0) + '/' + (ally.maxHealth || 0) +
                    (ally.class === 'Маг' && ally.maxMana > 0 ? ' | 💎' + (ally.mana || 0) + '/' + ally.maxMana : '');
            }
            const allyShieldFx = Array.isArray(ally.temporaryEffects)
                ? ally.temporaryEffects.find(function (e) { return e && e.shield > 0; })
                : null;
            setCombatantShieldDisplay(
                allyWrap,
                allyShieldFx ? allyShieldFx.shield : 0,
                ally.maxHealth,
                allyShieldFx ? allyShieldFx.dur : 0
            );
            const allySlot = allyWrap.querySelector('.combatant-status-slot[data-side="ally"]');
            if (allySlot) {
                allySlot.innerHTML = buildPlayerTemporaryBuffsHTML(ally.temporaryEffects);
            }
        }
    }
}

function updateBattlePackVitality() {
    updateBattleVitality();
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
    if (typeof updateBattlePackVitality === 'function') updateBattlePackVitality();
    else updateBattleVitality();
    updateBattleStatusPanels();
    updateBattleButtons();
}

/** Обновляет эффекты/баффы/способности монстра и статусы игрока без полного renderBattle. */
function updateBattleStatusPanels() {
    if (!currentMonster) return;

    const packSlots = document.querySelectorAll('#enemyPack .combatant-wrapper[data-enemy-index] .combatant-status-slot');
    if (packSlots.length && typeof getBattleEnemies === 'function') {
        const roster = getBattleEnemies();
        packSlots.forEach(function (slot) {
            const wrap = slot.closest('.combatant-wrapper[data-enemy-index]');
            if (!wrap) return;
            const idx = parseInt(wrap.getAttribute('data-enemy-index'), 10);
            const monster = roster[idx];
            if (!monster) return;
            slot.innerHTML = buildMonsterBuffsHTML(monster) +
                buildMonsterStatusEffectsHTML(monster) +
                buildMonsterAbilitiesHTML(monster);
        });
    } else {
        const enemySlot = document.querySelector('#enemyWrapper .combatant-status-slot');
        if (enemySlot) {
            enemySlot.innerHTML = buildMonsterBuffsHTML() +
                buildMonsterStatusEffectsHTML() +
                buildMonsterAbilitiesHTML();
        }
    }

    const playerSlot = document.querySelector('#playerWrapper .combatant-status-slot');
    if (playerSlot) {
        let debuffed = '';
        const hasDebuffs = player.temporaryEffects.some(e => e.type && e.type.startsWith('debuff_'));
        if (hasDebuffs) {
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
            debuffed = `<div class="debuffed-stats-hint">⚔️ ${displayAtk} · 🛡️ ${displayDef} · 💨 ${displayDodge}%</div>`;
        }
        playerSlot.innerHTML = buildPlayerBattleStatusHTML() + debuffed;
    }

    if (window.dungeonDuoBattleActive && typeof getDungeonDuoAlly === 'function') {
        const ally = getDungeonDuoAlly();
        const allyWrap = document.getElementById('allyWrapper');
        if (ally && allyWrap) {
            const allySlot = allyWrap.querySelector('.combatant-status-slot[data-side="ally"]');
            if (allySlot) {
                allySlot.innerHTML = buildPlayerTemporaryBuffsHTML(ally.temporaryEffects);
            }
            const allyShieldFx = Array.isArray(ally.temporaryEffects)
                ? ally.temporaryEffects.find(function (e) { return e && e.shield > 0; })
                : null;
            setCombatantShieldDisplay(
                allyWrap,
                allyShieldFx ? allyShieldFx.shield : 0,
                ally.maxHealth,
                allyShieldFx ? allyShieldFx.dur : 0
            );
        }
    }

    const vs = document.querySelector('.vs-badge');
    if (vs && typeof getGlobalBattleTurn === 'function') {
        vs.textContent = '⚔️ Ход ' + getGlobalBattleTurn() + ' ⚔️';
    }
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
    const isAlly = attackerSide === 'ally';
    const attackerEl = document.getElementById(
        isPlayer ? 'playerSprite' : (isAlly ? 'allySprite' : 'enemySprite')
    );
    const defenderEl = document.getElementById(
        isPlayer || isAlly ? 'enemySprite' : 'playerSprite'
    );
    const defenderWrap = document.getElementById(
        isPlayer || isAlly ? 'enemyWrapper' : 'playerWrapper'
    );
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

    const hitClass = (isPlayer || isAlly) ? 'taking-damage-from-player' : 'taking-damage-from-enemy';
    const attackClass = isPlayer || isAlly ? 'player-attacking' : 'enemy-attacking';

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
            (isPlayer || isAlly) ? 'playerLungeStrike' : 'enemyLungeStrike'
        );
    } else {
        setTimeout(onAttackAnimComplete, duration);
    }

    let impactFired = false;
    const fireImpact = () => {
        if (impactFired) return;
        impactFired = true;

        if (duration >= 280) spawnCombatSlash((isPlayer || isAlly) ? 'player' : attackerSide);

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

function floatDamageOnEnemyIndex(index, amount, isCrit) {
    const pack = document.getElementById('enemyPack');
    let wrapper = null;
    if (pack) {
        wrapper = pack.querySelector('.combatant-wrapper[data-enemy-index="' + index + '"]');
    }
    if (!wrapper && index === 0) wrapper = document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'damage-float' + (isCrit ? ' damage-float--crit' : '');
    el.textContent = (isCrit ? '💥 ' : '') + '-' + amount;
    if (!isCrit) el.style.color = '#ffcc44';
    el.style.top = '8px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), isCrit ? 1200 : 1050);
}

function floatDamage(target, amount, isCrit) {
    const wrapper = target === 'player'
        ? document.getElementById('playerWrapper')
        : target === 'ally'
            ? document.getElementById('allyWrapper')
            : document.getElementById('enemyWrapper');
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

// ── Вторая строка быстрого доступа: зелья ──
// 3 слота, конфигурируются в player.potionQuickSlots
// Каждый слот показывает тип зелья, иконку и количество в инвентаре

// Вспомогательная: описание эффекта расходника по категории
function getConsumableEffectText(item, type) {
    if (type === 'potion') return '❤️ Восстанавливает ' + (item.value || 50) + ' HP';
    if (type === 'mana_potion') return '💎 Восстанавливает ' + (item.value || 50) + ' маны';
    if (type === 'food') return '❤️ Восстанавливает ' + (item.value || 30) + ' HP';
    if (type === 'elixir') {
        if (item.effect === 'atk') return '⚔️ +' + item.value + '% атаки на 3 хода';
        if (item.effect === 'def') return '🛡️ +' + item.value + '% защиты на 3 хода';
        if (item.effect === 'dodge') return '💨 +' + item.value + '% уклонения на 3 хода';
        if (item.effect === 'crit') return '💥 +' + item.value + '% крита на 3 хода';
        if (item.effect === 'berserk') return '😤 +' + item.value + '% урона на 3 хода';
        if (item.effect === 'immortal') return '✨ Иммунитет на 1 ход';
        return '✨ Усиление на 3 хода';
    }
    if (type === 'scroll') return '✨ Улучшает оружие на +' + (item.value || 5) + '%';
    return '✨ Предмет';
}

// Вспомогательная: HTML одного предмета в раскрывающемся списке
function buildPotionExpandItemHtml(item, type, index, cdType) {
    var iconHtml = typeof renderItemIconHTML === 'function'
        ? renderItemIconHTML(item, { size: 32, fallback: getConsumableTypeIcon(type) })
        : '<span style="font-size:24px;">' + getConsumableTypeIcon(type) + '</span>';
    var cd = (window.getItemCooldown && typeof window.getItemCooldown === 'function')
        ? window.getItemCooldown(cdType) : 0;
    var disabled = cd > 0;
    var effectText = getConsumableEffectText(item, type);
    var rarityColor = item.rarity === 'Легендарный' ? '#fbbf24' :
                      item.rarity === 'Эпический' ? '#a855f7' :
                      item.rarity === 'Редкий' ? '#3b82f6' : '#8b8aa8';
    return '<div class="potion-expand-item' + (disabled ? ' potion-expand-item--cd' : '') + '">' +
        '<div class="potion-expand-item__icon">' + iconHtml + '</div>' +
        '<div class="potion-expand-item__info">' +
            '<div class="potion-expand-item__name">' + escapeBattleHtml(item.name) +
                ' <span style="color:' + rarityColor + ';font-size:10px;">' + (item.rarity || 'Обычный') + '</span></div>' +
            '<div class="potion-expand-item__effect">' + effectText + '</div>' +
        '</div>' +
        '<button class="potion-expand-item__btn" onclick="event.stopPropagation();useConsumable(\'' + type + '\',' + index + ')"' +
            (disabled ? ' disabled' : '') + '>' +
            (disabled ? '⏳' : '🧪') +
        '</button>' +
    '</div>';
}

function getConsumableTypeIcon(type) {
    var map = { 'potion': '🧪', 'mana_potion': '💎', 'food': '🍖', 'elixir': '💪', 'scroll': '📜' };
    return map[type] || '📦';
}

// Строит раскрывающийся блок со ВСЕМИ зельями/едой/эликсирами/свитками
function buildPotionExpandHtml() {
    var categories = [
        { type: 'potion',      arr: player.inventory.potions,     cdKey: 'potion',      label: '🧪 Зелья здоровья' },
        { type: 'mana_potion', arr: player.inventory.manaPotions, cdKey: 'mana_potion', label: '💎 Зелья маны' },
        { type: 'food',        arr: player.inventory.foods,       cdKey: 'food',         label: '🍖 Еда' },
        { type: 'elixir',      arr: player.inventory.elixirs,     cdKey: 'elixir',       label: '💪 Эликсиры' },
        { type: 'scroll',      arr: player.inventory.scrolls,     cdKey: 'scroll',       label: '📜 Свитки' }
    ];

    var hasAny = false;
    for (var c = 0; c < categories.length; c++) {
        if (categories[c].arr && categories[c].arr.length > 0) { hasAny = true; break; }
    }
    if (!hasAny) return '';

    var html = '<div class="potion-quick-expand" id="potionQuickExpand" style="display:none;">';
    html += '<div class="potion-quick-expand__inner">';

    for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        if (!cat.arr || cat.arr.length === 0) continue;
        var cdVal = (window.getItemCooldown && typeof window.getItemCooldown === 'function')
            ? window.getItemCooldown(cat.cdKey) : 0;
        var cdText = cdVal > 0 ? ' ⏳' + cdVal + ' ходов' : ' ✅ Готово';
        html += '<div class="potion-expand-category">' +
            '<div class="potion-expand-category__header">' +
                '<span>' + cat.label + ' (' + cat.arr.length + ')</span>' +
                '<span class="potion-expand-category__cd" style="color:' + (cdVal > 0 ? 'var(--orange)' : 'var(--green)') + ';font-size:10px;">' + cdText + '</span>' +
            '</div>';
        html += '<div class="potion-expand-category__items">';
        for (var j = 0; j < cat.arr.length; j++) {
            html += buildPotionExpandItemHtml(cat.arr[j], cat.type, j, cat.cdKey);
        }
        html += '</div></div>';
    }

    // Строка с кулдаунами в самом низу
    html += '<div class="potion-quick-expand__cds">';
    html += '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;">⏳ Кулдауны:</div>';
    for (var k = 0; k < categories.length; k++) {
        var cat2 = categories[k];
        if (!cat2.arr || cat2.arr.length === 0) continue;
        var cd2 = (window.getItemCooldown && typeof window.getItemCooldown === 'function')
            ? window.getItemCooldown(cat2.cdKey) : 0;
        var cdWord = cd2 === 1 ? 'ход' : (cd2 >= 2 && cd2 <= 4 ? 'хода' : 'ходов');
        html += '<span class="potion-quick-expand__cd-tag">' +
            cat2.label.split(' ')[0] + ' ' +
            (cd2 > 0 ? '⏳ ' + cd2 + ' ' + cdWord : '✅') +
            '</span>';
    }
    html += '</div>';

    html += '</div></div>';
    return html;
}

// Переключение раскрывающегося списка зелий
function togglePotionExpand() {
    var el = document.getElementById('potionQuickExpand');
    if (!el) return;
    if (el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

function buildPotionQuickRowHtml() {
    if (!player || !player.potionQuickSlots) return '';
    if (window.pvpBattleActive) return '';

    var slots = player.potionQuickSlots;
    if (!slots || slots.length === 0) return '';

    var typeConfig = {
        'potion':      { icon: '🧪', name: 'Здоровье', color: '#4ade80' },
        'mana_potion': { icon: '💎', name: 'Мана',     color: '#a78bfa' },
        'food':        { icon: '🍖', name: 'Еда',       color: '#f59e42' },
        'elixir':      { icon: '💪', name: 'Эликсир',   color: '#fbbf24' },
        'scroll':      { icon: '📜', name: 'Свиток',    color: '#60a5fa' }
    };

    var hasAny = false;
    for (var i = 0; i < slots.length; i++) {
        if (slots[i] && getPotionCount(slots[i]) > 0) { hasAny = true; break; }
    }
    if (!hasAny) return '';

    // Раскрывающийся блок ВСЕХ зелий (expand-up — над строкой быстрого доступа)
    var html = buildPotionExpandHtml();

    html += '<div class="potion-quick-row"><div class="potion-quick-row__label">🧪 Быстрый доступ <span class="potion-quick-row__expand-arrow" onclick="togglePotionExpand()" title="Все зелья">▲</span></div><div class="potion-quick-row__slots">';
    for (var j = 0; j < slots.length; j++) {
        var type = slots[j];
        if (!type) {
            html += '<div class="potion-quick-row__slot potion-quick-row__slot--empty"></div>';
            continue;
        }
        var cfg = typeConfig[type] || { icon: '❓', name: '?', color: '#888' };
        var count = getPotionCount(type);
        var cd = getPotionCooldownSec(type);
        var disabled = (count <= 0);
        var cdText = cd > 0 ? ' ⏳' + cd + 'с' : '';

        html += '<button class="potion-quick-row__slot' +
            (disabled ? ' potion-quick-row__slot--empty' : '') +
            '" onclick="usePotionFromQuickSlot(\'' + type + '\')"' +
            ' title="' + cfg.name + ': ' + count + ' шт."' +
            (disabled ? ' disabled' : '') +
            ' style="border-color:' + cfg.color + '">' +
            '<span class="potion-quick-row__icon">' + cfg.icon + '</span>' +
            '<span class="potion-quick-row__count">' + count + '</span>' +
            (cd > 0 ? '<span class="potion-quick-row__cd">⏳' + cd + 'с</span>' : '') +
            '</button>';
    }
    html += '</div></div>';
    return html;
}

function getPotionCount(type) {
    if (!player || !player.inventory) return 0;
    var map = {
        'potion': (player.inventory.potions || []).length,
        'mana_potion': (player.inventory.manaPotions || []).length,
        'food': (player.inventory.foods || []).length,
        'elixir': (player.inventory.elixirs || []).length,
        'scroll': (player.inventory.scrolls || []).length
    };
    return map[type] || 0;
}

function getPotionCooldownSec(type) {
    var cooldownKey = 'item_' + type;
    if (window.getItemCooldown && typeof window.getItemCooldown === 'function') {
        var cd = window.getItemCooldown(cooldownKey);
        if (cd > 0) return Math.ceil(cd / 1000);
    }
    return 0;
}

// Использование зелья из быстрого слота
function usePotionFromQuickSlot(type) {
    if (!currentMonster) return;
    if (typeof useConsumable !== 'function') return;
    var map = {
        'potion': 'potion',
        'mana_potion': 'mana_potion',
        'food': 'food',
        'elixir': 'elixir',
        'scroll': 'scroll'
    };
    var cat = map[type] || type;
    var arr = null;
    if (cat === 'potion') arr = player.inventory.potions;
    else if (cat === 'mana_potion') arr = player.inventory.manaPotions;
    else if (cat === 'food') arr = player.inventory.foods;
    else if (cat === 'elixir') arr = player.inventory.elixirs;
    else if (cat === 'scroll') arr = player.inventory.scrolls;
    if (!arr || arr.length === 0) return;
    useConsumable(cat, 0); // используем первое доступное зелье этого типа
}

// Управление слотами быстрого доступа к зельям
function getPotionQuickSlotIndex(type) {
    if (!player || !player.potionQuickSlots) return -1;
    return player.potionQuickSlots.indexOf(type);
}

function cyclePotionQuickSlot(type) {
    if (!player || !player.potionQuickSlots) return;
    var slots = player.potionQuickSlots;
    var idx = slots.indexOf(type);

    if (idx >= 0) {
        // Уже в слоте — убираем
        slots[idx] = null;
        addMessage('⚡ ' + type + ' убран из быстрого доступа', 'info');
    } else {
        // Ищем пустой слот
        var empty = -1;
        for (var i = 0; i < slots.length; i++) { if (!slots[i]) { empty = i; break; } }
        if (empty >= 0) {
            slots[empty] = type;
            addMessage('⚡ Назначен в слот ' + (empty + 1) + ' быстрого доступа', 'success');
        } else {
            // Все заняты — циклически заменяем первый
            var old = slots[0];
            slots[0] = type;
            addMessage('⚡ Заменён слот 1 (' + (old || 'пусто') + ' → ' + type + ')', 'info');
        }
    }
    saveGame();
    if (typeof showInventory === 'function') showInventory();
}

function showItemCooldownsInBattle() {
    if (window.pvpBattleActive) return '';
    if (!player.inventory) return '';
    
    const manaPotCount = (player.inventory.manaPotions && player.inventory.manaPotions.length) || 0;
    const hasPotions = (player.inventory.potions && player.inventory.potions.length > 0) ||
                       manaPotCount > 0 ||
                       (player.inventory.foods && player.inventory.foods.length > 0) ||
                       (player.inventory.elixirs && player.inventory.elixirs.length > 0) ||
                       (player.inventory.scrolls && player.inventory.scrolls.length > 0);
    if (!hasPotions) return '';
    
    let html = '<div class="battle-consumables-panel" style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px;">';
    html += '<div style="font-size: 11px; color: var(--gold); margin-bottom: 8px;">📦 Предметы (зелья, еда, эликсиры, свитки):</div>';
    html += '<div class="battle-consumables-panel__buttons" style="display: flex; flex-wrap: wrap; gap: 8px;">';
    
    if (player.inventory.potions && player.inventory.potions.length > 0) {
        const cd = window.getItemCooldown('potion');
        html += `<button class="action-btn" onclick="showInventoryAndUse('potion')" style="padding: 6px 12px; font-size: 11px; background: ${cd > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(46,204,113,0.2)'};">🧪 Здоровье (${player.inventory.potions.length})${cd > 0 ? ` ⏳${cd}` : ''}</button>`;
    }
    if (manaPotCount > 0 && player.class === 'Маг') {
        const cdMana = window.getItemCooldown('mana_potion');
        html += `<button class="action-btn" onclick="showInventoryAndUse('mana_potion')" style="padding: 6px 12px; font-size: 11px; background: ${cdMana > 0 ? 'rgba(100,100,100,0.3)' : 'rgba(52,152,219,0.25)'};">💎 Мана (${manaPotCount})${cdMana > 0 ? ` ⏳${cdMana}` : ''}</button>`;
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

function escapeBattleHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getMonsterDebuffEffectDescription(effectKey, value) {
    const v = value != null ? value : 0;
    const labels = {
        blind: 'Ослепление',
        atk: 'Атака',
        def: 'Защита',
        dodge: 'Уклонение',
        all: 'Все характеристики',
        slow: 'Замедление',
        freeze: 'Заморозка'
    };
    const name = labels[effectKey] || effectKey;
    if (effectKey === 'blind') return `${name}: ${v}% шанс промаха`;
    if (effectKey === 'slow') return `${name}: −${v}% к атаке`;
    return `${name}: −${v}%`;
}

function buildMonsterAbilityTooltip(ability, currentCD) {
    const isOnCooldown = currentCD > 0;
    const rows = [];

    if (ability.multiplier) {
        rows.push(['Урон', `×${ability.multiplier} от атаки монстра`]);
    }
    if (ability.type === 'heal' && ability.value != null) {
        rows.push(['Лечение', `${ability.value}% от макс. HP`]);
    }
    if (ability.type === 'shield' && ability.value != null) {
        rows.push(['Щит', `${ability.value}% от макс. HP`]);
    }
    if (ability.type === 'lifesteal' && ability.value != null) {
        rows.push(['Вампиризм', `${ability.value}% от нанесённого урона`]);
    }
    if (ability.type === 'dot' && ability.value != null) {
        const dotName = ability.effect === 'shock' ? 'Шок' : (ability.effect || 'DoT');
        rows.push(['Урон со временем', `${ability.value}% HP/ход (${dotName})`]);
    }
    if (ability.type === 'buff' && ability.effect && ability.value != null) {
        let buffText = `${ability.effect}: +${ability.value}%`;
        if (ability.effect === 'atk') buffText = `Атака: +${ability.value}%`;
        else if (ability.effect === 'def') buffText = `Защита: +${ability.value}%`;
        else if (ability.effect === 'all') buffText = `Все статы: +${ability.value}%`;
        rows.push(['Усиление', buffText]);
    }
    if (ability.type === 'debuff' && ability.effect && ability.value != null) {
        rows.push(['Ослабление', getMonsterDebuffEffectDescription(ability.effect, ability.value)]);
    }
    if (ability.duration) {
        rows.push(['Длительность', `${ability.duration} глоб. ход(а)`]);
    }
    if (ability.chance != null) {
        rows.push(['Шанс срабатывания', `${ability.chance}%`]);
    }
    if (ability.cooldown) {
        rows.push(['Перезарядка', `${ability.cooldown} глоб. ход(а)`]);
    }

    let body = '';
    if (rows.length) {
        body = '<div class="mat-rows">' + rows.map(([k, v]) =>
            `<div class="mat-row"><span class="mat-k">${escapeBattleHtml(k)}</span><span class="mat-v">${escapeBattleHtml(v)}</span></div>`
        ).join('') + '</div>';
    } else {
        body = '<div class="mat-rows"><div class="mat-row mat-muted">Базовая атака монстра</div></div>';
    }

    const footer = isOnCooldown
        ? `<span class="mat-status mat-cd">⏳ Перезарядка: ${currentCD} глоб. ход.</span>`
        : '<span class="mat-status mat-ready">✓ Может сработать при атаке</span>';

    return `<div class="monster-ability-tooltip" role="tooltip">` +
        `<div class="mat-head">${escapeBattleHtml(ability.name)}</div>` +
        `<div class="mat-type">${getAbilityTypeName(ability.type)}</div>` +
        body +
        `<div class="mat-foot">${footer}</div>` +
        `</div>`;
}

function buildMonsterBuffsHTML(monster) {
    const m = monster || currentMonster;
    if (!m || !m.activeBuffs) return '';
    const buffs = [];
    const b = m.activeBuffs;
    if (b.atk) buffs.push(`⚔️ +${b.atk.value}% (${b.atk.remainingTurns})`);
    if (b.def) buffs.push(`🛡️ +${b.def.value}% (${b.def.remainingTurns})`);
    if (b.dodge) buffs.push(`💨 +${b.dodge.value}% (${b.dodge.remainingTurns})`);
    if (b.lifesteal) buffs.push(`🩸 ${b.lifesteal.value}% (${b.lifesteal.remainingTurns})`);
    if (b.reflect) buffs.push(`🔄 ${b.reflect.value}% (${b.reflect.remainingTurns})`);
    if (b.crit) buffs.push(`💥 +${b.crit.value}% (${b.crit.remainingTurns})`);
    if (!buffs.length) return '';
    return `<div class="monster-buffs">${buffs.join(' · ')}</div>`;
}

function buildMonsterAbilitiesHTML(monster) {
    const m = monster || currentMonster;
    if (!m || !m.abilities || !m.abilities.length) return '';
    let html = '<div class="monster-abilities">';
    for (const ability of m.abilities) {
        const currentCD = monsterAbilityCooldowns[ability.name] || 0;
        const isOnCooldown = currentCD > 0;
        let abilityColor = '', abilityIcon = '';
        switch (ability.type) {
            case 'damage': abilityIcon = '💥'; abilityColor = '#e74c3c'; break;
            case 'heal': abilityIcon = '💚'; abilityColor = '#2ecc71'; break;
            case 'buff': abilityIcon = '⚡'; abilityColor = '#f39c12'; break;
            case 'debuff': abilityIcon = '😵'; abilityColor = '#9b59b6'; break;
            case 'dot': abilityIcon = '☠️'; abilityColor = '#e67e22'; break;
            case 'shield': abilityIcon = '🛡️'; abilityColor = '#3498db'; break;
            case 'lifesteal': abilityIcon = '🩸'; abilityColor = '#e74c3c'; break;
            default: abilityIcon = '✨'; abilityColor = '#aaa';
        }
        const tooltipHtml = buildMonsterAbilityTooltip(ability, currentCD);
        html += `<div class="ability-badge monster-ability-badge${isOnCooldown ? ' on-cooldown' : ''}" style="--ability-accent:${abilityColor}">` +
            tooltipHtml +
            `<span class="mab-icon">${abilityIcon}</span>` +
            `<span class="mab-name">${escapeBattleHtml(ability.name)}</span>` +
            (isOnCooldown ? `<span class="mab-cd">⏳${currentCD}</span>` : '') +
            '</div>';
    }
    html += '</div>';
    return html;
}

const PVP_FIGHTER_CC_DEBUFF_CHIPS = new Set(['debuff_freeze', 'debuff_blind', 'debuff_slow']);

function buildPlayerTemporaryBuffsHTML(effects) {
    if (!Array.isArray(effects) || !effects.length) return '';
    const chips = [];
    effects.forEach(function (e) {
        if (!e) return;
        if (e.dur != null && e.dur <= 0) return;
        if (e.type && String(e.type).startsWith('debuff_')) return;
        if (e.isDot) return;
        if (e.shield) {
            chips.push({ icon: '🛡️', text: 'Щит ' + e.shield, dur: e.dur });
            return;
        }
        if (e.immune) {
            chips.push({ icon: '✨', text: 'Иммунитет', dur: e.dur });
            return;
        }
        if (e.reflect) {
            chips.push({ icon: '↩️', text: 'Отраж ' + e.reflect + '%', dur: e.dur });
            return;
        }
        if (e.regen) {
            chips.push({ icon: '💚', text: 'Реген ' + e.regen + '%', dur: e.dur });
            return;
        }
        if (e.damageReduction) {
            chips.push({ icon: '🛡️', text: '−урон ' + e.damageReduction + '%', dur: e.dur });
            return;
        }
        if (e.healBonus) {
            chips.push({ icon: '💚', text: 'Леч +' + e.healBonus + '%', dur: e.dur });
        }
        if (e.atk) chips.push({ icon: '⚔️', text: 'АТК +' + e.atk + '%', dur: e.dur });
        if (e.def) chips.push({ icon: '🛡️', text: 'ЗАЩ +' + e.def + '%', dur: e.dur });
        if (e.dodge) chips.push({ icon: '💨', text: 'Уклон +' + e.dodge + '%', dur: e.dur });
        if (e.crit) chips.push({ icon: '💥', text: 'Крит +' + e.crit + '%', dur: e.dur });
        if (e.critDmg) chips.push({ icon: '💥', text: 'Критур +' + e.critDmg + '%', dur: e.dur });
    });
    if (!chips.length) return '';
    let html = '<div class="active-effects player-buffs">';
    chips.forEach(function (c) {
        const dur = c.dur != null ? c.dur : '?';
        html += '<span class="effect-chip effect-chip-buff" title="' + escapeBattleHtml(c.text) + ' (' + dur + ' ход.)">' +
            c.icon + ' ' + escapeBattleHtml(c.text) + ' · ' + dur + '</span>';
    });
    html += '</div>';
    return html;
}

function buildPlayerDebuffsHTML(skipCcChips) {
    const activePlayerEffects = player.temporaryEffects.filter(e => {
        if (!e.type || !e.type.startsWith('debuff_')) return false;
        if (skipCcChips && PVP_FIGHTER_CC_DEBUFF_CHIPS.has(e.type)) return false;
        return true;
    });
    if (!activePlayerEffects.length) return '';
    let html = '<div class="active-effects player-debuffs">';
    for (const effect of activePlayerEffects) {
        let icon = '', text = '';
        const debuffType = effect.type.replace('debuff_', '');
        if (debuffType === 'atk') { icon = '⚔️'; text = `Атака −${effect.value}%`; }
        else if (debuffType === 'def') { icon = '🛡️'; text = `Защита −${effect.value}%`; }
        else if (debuffType === 'dodge') { icon = '💨'; text = `Уклонение −${effect.value}%`; }
        else if (debuffType === 'all') { icon = '😵'; text = `Все −${effect.value}%`; }
        else if (debuffType === 'freeze') { icon = '❄️'; text = 'Заморозка'; }
        else if (debuffType === 'blind') { icon = '👁️'; text = `Ослепление −${effect.value}%`; }
        else if (debuffType === 'slow') { icon = '🕸️'; text = `Паутина −${effect.value}%`; }
        const valLabel = debuffType === 'freeze' ? '' : ` ${effect.value}%`;
        html += `<span class="effect-chip effect-chip-debuff" title="${escapeBattleHtml(text)} (${effect.dur} ход.)">${icon}${valLabel} · ${effect.dur}</span>`;
    }
    html += '</div>';
    return html;
}

function buildPlayerDotsHTML() {
    const playerDots = player.temporaryEffects.filter(e => e.isDot && e.dur > 0);
    if (!playerDots.length) return '';
    let html = '<div class="active-effects player-dots">';
    for (const dot of playerDots) {
        const dotType = dot.type.replace('dot_', '');
        const icon = dot.dotIcon || (dotType === 'burn' ? '🔥' : '☠️');
        html += `<span class="effect-chip effect-chip-dot" title="${escapeBattleHtml(dotType)} ${dot.value}%/ход · ${dot.dur}">${icon} ${dot.value}% · ${dot.dur}</span>`;
    }
    html += '</div>';
    return html;
}

function buildStatusEffectsHTML(effects, extraClass) {
    if (!effects || !effects.length) return '';
    const slotClass = extraClass ? ' ' + extraClass : '';

    let html = '<div class="active-effects combatant-status-effects' + slotClass + '">';
    for (const effect of effects) {
        const dur = effect.dur != null ? effect.dur : '?';
        const isDot = typeof isMonsterDotEffectType === 'function' && isMonsterDotEffectType(effect.type) && effect.val;

        if (isDot) {
            let icon = '💀';
            if (effect.type === 'Яд' || effect.type === 'poison') icon = '☠️';
            else if (effect.type === 'Горение' || effect.type === 'burn') icon = '🔥';
            else if (effect.type === 'Шок' || effect.type === 'shock') icon = '⚡';
            html += `<span class="effect-chip effect-chip-dot" title="${escapeBattleHtml(effect.type)}: ${effect.val}% HP за глоб. ход, осталось ${dur}">${icon} ${effect.val}%/ход · ${dur}</span>`;
        } else if (effect.type === 'Ослепление') {
            const miss = effect.val ?? effect.value ?? 0;
            html += `<span class="effect-chip effect-chip-blind" title="Ослепление: ${miss}% шанс промаха, ${dur} глоб. ход.">👁️ промах ${miss}% · ${dur}</span>`;
        } else if (effect.type === 'Оглушение') {
            html += `<span class="effect-chip effect-chip-stun" title="Оглушение: пропуск хода, ${dur} глоб. ход.">💫 оглушён · ${dur}</span>`;
        } else if (effect.type === 'Заморозка') {
            html += `<span class="effect-chip effect-chip-freeze" title="Заморозка: не действует, ${dur} глоб. ход.">❄️ заморозка · ${dur}</span>`;
        } else if (effect.type === 'slow' && effect.val) {
            html += `<span class="effect-chip effect-chip-slow" title="Замедление: −${effect.val}% атаки, ${dur} глоб. ход.">🐢 −${effect.val}% АТК · ${dur}</span>`;
        } else if (effect.dur > 0) {
            html += `<span class="effect-chip" title="${escapeBattleHtml(effect.type)} · ${dur} ход.">${escapeBattleHtml(effect.type)} · ${dur}</span>`;
        }
    }
    html += '</div>';
    return html;
}

function buildMonsterStatusEffectsHTML(monster) {
    const m = monster || currentMonster;
    if (!m || !m.effects || !m.effects.length) return '';
    return buildStatusEffectsHTML(m.effects, 'monster-status-effects');
}

/** PvP: authoritative chips from match fighter.effects; PvE: dots + debuff chips on player. */
function buildPlayerBattleStatusHTML() {
    if (window.pvpBattleActive && typeof getLocalPvPRole === 'function' && typeof pvpState !== 'undefined' && pvpState && pvpState.match) {
        const localRole = getLocalPvPRole();
        const lf = pvpState.match.players && pvpState.match.players[localRole];
        const effects = (lf && lf.effects) ? lf.effects : [];
        let html = buildStatusEffectsHTML(effects, 'player-status-effects');
        html += buildPlayerDebuffsHTML(true);
        return html;
    }
    return buildPlayerTemporaryBuffsHTML(player.temporaryEffects) +
        buildPlayerDotsHTML() + buildPlayerDebuffsHTML();
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
window.updateBattlePackVitality = updateBattlePackVitality;
window.floatDamageOnEnemyIndex = floatDamageOnEnemyIndex;
window.updateBattleStatusPanels = updateBattleStatusPanels;
window.buildPotionQuickRowHtml = buildPotionQuickRowHtml;
window.getPotionCount = getPotionCount;
window.getPotionCooldownSec = getPotionCooldownSec;
window.usePotionFromQuickSlot = usePotionFromQuickSlot;
window.getPotionQuickSlotIndex = getPotionQuickSlotIndex;
window.cyclePotionQuickSlot = cyclePotionQuickSlot;
window.togglePotionExpand = togglePotionExpand;