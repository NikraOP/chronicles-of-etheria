// battle.js - Полная рабочая версия

let currentMonster = null;
let isPlayerTurn = true;
let battleLogEntries = [];
let rageStack = 0;
let lastUsedAbility = null;
let abilityComboStep = 0;
let comboAbilityId = null;
let nextFreeMana = false;
let nextDoubleEffect = false;
let nextNoCd = false;
let nextAttackBonus = 0;
let markedTarget = false;
let lingeringCloud = false;
let deathSaveActive = false;
let reviveUsed = false;
let summonedSpirit = false;

window.itemCooldowns = {
    potion: 0,
    elixir: 0,
    food: 0,
    scroll: 0
};

window.ITEM_COOLDOWNS = {
    potion: 3,
    elixir: 5,
    food: 2,
    scroll: 6
};

let monsterAbilityCooldowns = {};

window.resetItemCooldowns = function() {
    window.itemCooldowns = { potion: 0, elixir: 0, food: 0, scroll: 0 };
};

window.reduceItemCooldowns = function() {
    for (let type in window.itemCooldowns) {
        if (window.itemCooldowns[type] > 0) {
            window.itemCooldowns[type]--;
            if (window.itemCooldowns[type] === 0) {
                const typeNames = { potion: 'зелья', elixir: 'эликсиры', food: 'еду', scroll: 'свитки' };
                if (typeof addBattleLog !== 'undefined') {
                    addBattleLog(`⏳ ${typeNames[type]} снова доступны!`, 'info');
                }
            }
        }
    }
};

window.getItemCooldown = function(type) { return window.itemCooldowns[type] || 0; };
window.canUseItem = function(type) { return window.itemCooldowns[type] === 0; };
window.setItemCooldown = function(type) { window.itemCooldowns[type] = window.ITEM_COOLDOWNS[type]; };

function getWordForm(number, words) {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}

function getCappedDodge(dodge) { return Math.min(70, Math.max(0, dodge)); }

function calculateDamage(dmg, defense) {
    const defenseReduction = Math.min(70, defense / 4);
    return Math.max(1, Math.floor(dmg * (100 - defenseReduction) / 100));
}

function addBattleLog(msg, cls) {
    battleLogEntries.push({ msg: msg, cls: cls || 'info' });
    const logEl = document.getElementById('battleLog');
    if (logEl) {
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + (cls || 'info');
        entry.textContent = msg;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }
}

function updateBattleButtons() {
    const btns = document.querySelectorAll('.action-btn');
    btns.forEach(btn => { if (!btn.classList.contains('danger')) btn.disabled = !isPlayerTurn; });
}

function reduceAllCooldowns() {
    if (!player || !player.abilities) return;
    player.abilities.forEach(ab => { if (ab && ab.currentCooldown > 0) ab.currentCooldown--; });
    window.reduceItemCooldowns();
    for (let key in monsterAbilityCooldowns) {
        if (monsterAbilityCooldowns[key] > 0) monsterAbilityCooldowns[key]--;
    }
}

function resetAllCooldowns() {
    if (!player || !player.abilities) return;
    player.abilities.forEach(ab => { if (ab) ab.currentCooldown = 0; });
    window.resetItemCooldowns();
    monsterAbilityCooldowns = {};
    rageStack = 0;
    abilityComboStep = 0;
    comboAbilityId = null;
    nextFreeMana = false;
    nextDoubleEffect = false;
    nextNoCd = false;
    nextAttackBonus = 0;
    markedTarget = false;
    lingeringCloud = false;
    deathSaveActive = false;
    reviveUsed = false;
    summonedSpirit = false;

     if (player.class === 'Маг') {
        const baseMana = Math.floor(100 + player.level * 10);
        player.maxMana = baseMana;
        if (player.mana > player.maxMana) player.mana = player.maxMana;
    }

    if (player.originalMaxHealth) {
        player.maxHealth = player.originalMaxHealth;
        if (player.health > player.maxHealth) player.health = player.maxHealth;
        player.originalMaxHealth = null;
    }
}

function startBattle() {
    stopGathering();
    battleLogEntries = [];
    resetAllCooldowns();

    player.originalMaxHealth = null;
    
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const monsters = loc.monsters;
    const mData = monsters[Math.floor(Math.random() * monsters.length)];
    const scale = Math.max(1, 1 + ((player.level - loc.minLvl) * 0.2));
    
    const monsterAbilities = mData.abilities || [];
    
    currentMonster = {
        name: mData.name, icon: mData.icon, img: mData.img || '',
        health: Math.floor(mData.hp * scale), maxHealth: Math.floor(mData.hp * scale),
        attack: Math.floor(mData.atk * scale), defense: Math.floor(mData.def * scale),
        exp: Math.floor(mData.exp * scale), effects: [], goldMult: loc.goldMult,
        marked: false, fireVuln: 0, armorShred: 0,
        abilities: monsterAbilities, buffs: {}, shield: 0
    };
    
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    player.temporaryEffects = [];
    window.echoActive = false;
    isPlayerTurn = true;
    renderBattle();
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

function getPlayerEffectiveDefense() {
    let defense = player.defense;
    const defDebuff = player.temporaryEffects.find(e => e.type === 'debuff_def');
    if (defDebuff) defense = Math.floor(defense * (1 - defDebuff.value / 100));
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) defense = Math.floor(defense * (1 - allDebuff.value / 100));
    return Math.max(0, defense);
}

function getMonsterEffectiveAttack() {
    return currentMonster.effectiveAttack || currentMonster.attack;
}

function getPlayerEffectiveAttack() {
    let attack = player.attack;
    const atkDebuff = player.temporaryEffects.find(e => e.type === 'debuff_atk');
    if (atkDebuff) attack = Math.floor(attack * (1 - atkDebuff.value / 100));
    const allDebuff = player.temporaryEffects.find(e => e.type === 'debuff_all');
    if (allDebuff) attack = Math.floor(attack * (1 - allDebuff.value / 100));
    return Math.max(1, attack);
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
    if (currentMonster.shield && currentMonster.shield > 0) {
        const absorbed = Math.min(currentMonster.shield, remainingDamage);
        currentMonster.shield -= absorbed;
        remainingDamage -= absorbed;
        addBattleLog(`🛡️ Щит ${currentMonster.name} поглотил ${absorbed} урона! Осталось щита: ${currentMonster.shield}`, 'info');
        if (currentMonster.shield <= 0) {
            addBattleLog(`🛡️ Щит ${currentMonster.name} разрушен!`, 'info');
            if (currentMonster.buffs && currentMonster.buffs.shield) delete currentMonster.buffs.shield;
        }
    }
    if (remainingDamage > 0) currentMonster.health -= remainingDamage;
    return remainingDamage;
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
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    wrapper.style.animation = 'hitShake 0.3s ease-in-out';
    setTimeout(() => { wrapper.style.animation = ''; }, 300);
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
            let monsterAtk = getMonsterEffectiveAttack();
            let dmg = Math.floor(monsterAtk * (ability.multiplier || 1));
            const playerDef = getPlayerEffectiveDefense();
            dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
            applyDamageToPlayer(dmg);
            floatDamage('player', dmg, false);
            showHitEffect('player');
            break;
            
        case 'dot':
            currentMonster.effects.push({ type: ability.effect || 'Яд', val: ability.value || 5, dur: ability.duration || 2 });
            addBattleLog(`☠️ ${ability.name}: наложен эффект ${ability.effect || 'Яд'} (${ability.value || 5}% HP в ход)!`, 'info');
            showDebuffEffect('enemy', ability.effect || 'poison');
            break;
            
        case 'heal':
            const healAmount = Math.floor(currentMonster.maxHealth * (ability.value || 15) / 100);
            const oldHealth = currentMonster.health;
            currentMonster.health = Math.min(currentMonster.maxHealth, currentMonster.health + healAmount);
            addBattleLog(`💚 ${ability.name} восстанавливает ${currentMonster.health - oldHealth} HP!`, 'heal');
            showHealEffect('enemy', currentMonster.health - oldHealth);
            break;
            
        case 'buff':
            if (!currentMonster.buffs) currentMonster.buffs = {};
            currentMonster.buffs[ability.effect] = { value: ability.value || 20, duration: ability.duration || 2 };
            let buffIcon = { atk:'⚔️', def:'🛡️', dodge:'💨', crit:'💥', all:'✨', reflect:'🔄' }[ability.effect] || '✨';
            addBattleLog(`${buffIcon} ${ability.name}: ${ability.effect === 'atk' ? 'атака' : ability.effect === 'def' ? 'защита' : 'характеристики'} +${ability.value || 20}% на ${ability.duration || 2} хода!`, 'info');
            showBuffEffect('enemy', buffIcon);
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
            
            let effectText = '';
            if (ability.effect === 'atk') effectText = 'атака';
            else if (ability.effect === 'def') effectText = 'защита';
            else if (ability.effect === 'dodge') effectText = 'уклонение';
            else if (ability.effect === 'hp') effectText = 'здоровье';
            else if (ability.effect === 'all') effectText = 'все характеристики';
            else if (ability.effect === 'freeze') effectText = 'заморозка';
            else if (ability.effect === 'blind') effectText = 'ослепление';
            else if (ability.effect === 'slow') effectText = 'замедление';
            else effectText = 'характеристики';
            
            addBattleLog(`${debuffIcon} ${ability.name}: ${effectText} -${ability.value || 20}% на ${ability.duration || 2} хода!`, 'error');
            showDebuffEffect('player', ability.effect);
            
            // Обработка снижения максимального здоровья
            if (ability.effect === 'hp') {
                const hpReductionPercent = ability.value || 20;
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
            
        case 'shield':
            const shieldValue = Math.floor(currentMonster.maxHealth * (ability.value || 20) / 100);
            currentMonster.shield = shieldValue;
            if (!currentMonster.buffs) currentMonster.buffs = {};
            currentMonster.buffs.shield = { value: shieldValue, duration: ability.duration || 2 };
            addBattleLog(`🛡️ ${ability.name}: создан щит на ${shieldValue} HP (${ability.value || 20}% от макс. HP) на ${ability.duration || 2} хода!`, 'info');
            showShieldEffect('enemy', shieldValue);
            break;
            
        case 'lifesteal':
            if (!currentMonster.buffs) currentMonster.buffs = {};
            currentMonster.buffs.lifesteal = { value: ability.value || 30, duration: ability.duration || 2 };
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

function updateMonsterBuffs() {
    if (!currentMonster.buffs) return;
    let effectiveAttack = currentMonster.attack;
    let effectiveDefense = currentMonster.defense;
    for (let [type, buff] of Object.entries(currentMonster.buffs)) {
        if (buff.duration <= 0) {
            delete currentMonster.buffs[type];
            continue;
        }
        if (type === 'atk') effectiveAttack = Math.floor(currentMonster.attack * (1 + buff.value / 100));
        else if (type === 'def') effectiveDefense = Math.floor(currentMonster.defense * (1 + buff.value / 100));
        else if (type === 'shield') {
            buff.duration--;
            if (buff.duration <= 0) {
                delete currentMonster.buffs[type];
                currentMonster.shield = 0;
                addBattleLog(`🛡️ Щит ${currentMonster.name} рассеялся!`, 'info');
            }
            continue;
        }
        buff.duration--;
    }
    currentMonster.effectiveAttack = effectiveAttack;
    currentMonster.effectiveDefense = effectiveDefense;
}

function renderBattle() {
    if (!currentMonster) return;
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const av = getAvatar();
    const pHp = (player.health / player.maxHealth * 100);
    const mHp = (currentMonster.health / currentMonster.maxHealth * 100);
    const bgStyle = loc.bgColor;
    const monsterImg = currentMonster.img ? '<img src="' + currentMonster.img + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'' + currentMonster.icon + '\'">' : '<span class="sprite-fallback">' + currentMonster.icon + '</span>';

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
            if (ability.cooldown) tooltipText += `Перезарядка: ${ability.cooldown} ход(а)\n`;
            tooltipText += isOnCooldown ? `⏳ Осталось: ${currentCD} ход(а)` : `✅ Готово к использованию`;
            tooltipText = tooltipText.replace(/'/g, "\\'");
            abilitiesHTML += `<div class="ability-badge" style="display: inline-flex; align-items: center; gap: 4px; background: ${isOnCooldown ? 'rgba(50,50,50,0.8)' : 'rgba(0,0,0,0.5)'}; border: 1px solid ${isOnCooldown ? '#555' : abilityColor}; border-radius: 20px; padding: 3px 8px; font-size: 11px; cursor: help; transition: all 0.2s; opacity: ${isOnCooldown ? 0.6 : 1};" title="${tooltipText}">
                <span style="font-size: 12px;">${abilityIcon}</span>
                <span style="color: ${abilityColor};">${ability.name}</span>
                ${isOnCooldown ? `<span style="color: #ffaa00; font-size: 10px;">⏳${currentCD}</span>` : ''}
            </div>`;
        }
        abilitiesHTML += '</div>';
    }

    let monsterEffectsHTML = '';
    if (currentMonster.buffs && Object.keys(currentMonster.buffs).length > 0) {
        monsterEffectsHTML = '<div class="active-effects">';
        for (let [type, buff] of Object.entries(currentMonster.buffs)) {
            if (buff.duration > 0) {
                let icon = '', text = '';
                if (type === 'atk') { icon = '⚔️'; text = `Атака +${buff.value}%`; }
                else if (type === 'def') { icon = '🛡️'; text = `Защита +${buff.value}%`; }
                else if (type === 'dodge') { icon = '💨'; text = `Уклонение +${buff.value}%`; }
                else if (type === 'crit') { icon = '💥'; text = `Крит +${buff.value}%`; }
                else if (type === 'all') { icon = '✨'; text = `Все +${buff.value}%`; }
                else if (type === 'shield') { icon = '🛡️'; text = `Щит ${Math.floor((buff.value / currentMonster.maxHealth) * 100)}% (${buff.value} HP)`; }
                else if (type === 'lifesteal') { icon = '🩸'; text = `Вампиризм ${buff.value}%`; }
                else if (type === 'reflect') { icon = '🔄'; text = `Отражение ${buff.value}%`; }
                monsterEffectsHTML += `<div class="effect-icon buff" title="${text} (${buff.duration} ход.)">${icon} ${buff.value}%</div>`;
            }
        }
        monsterEffectsHTML += '</div>';
    }

    let monsterShieldHTML = '';
    if (currentMonster.shield > 0) {
        const shieldPercent = (currentMonster.shield / currentMonster.maxHealth) * 100;
        monsterShieldHTML = `<div class="shield-bar" style="width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;"><div class="shield-fill" style="width: ${shieldPercent}%; height: 100%; background: #3498db;"></div></div>`;
    }

    let playerEffectsHTML = '';
    const activePlayerEffects = player.temporaryEffects.filter(e => e.type && e.type.startsWith('debuff_'));
    if (activePlayerEffects.length > 0) {
        playerEffectsHTML = '<div class="active-effects">';
        for (let effect of activePlayerEffects) {
            let icon = '', text = '';
            const debuffType = effect.type.replace('debuff_', '');
            if (debuffType === 'atk') { icon = '⚔️'; text = `Атака -${effect.value}%`; }
            else if (debuffType === 'def') { icon = '🛡️'; text = `Защита -${effect.value}%`; }
            else if (debuffType === 'dodge') { icon = '💨'; text = `Уклонение -${effect.value}%`; }
            else if (debuffType === 'all') { icon = '😵'; text = `Все -${effect.value}%`; }
            else if (debuffType === 'freeze') { icon = '❄️'; text = `Заморозка`; }
            else if (debuffType === 'blind') { icon = '👁️'; text = `Ослепление -${effect.value}%`; }
            else if (debuffType === 'slow') { icon = '🐢'; text = `Замедление -${effect.value}%`; }
            playerEffectsHTML += `<div class="effect-icon debuff" title="${text} (${effect.dur} ход.)">${icon} ${effect.value}%</div>`;
        }
        playerEffectsHTML += '</div>';
    }

    let playerShieldHTML = '';
    const playerShield = player.temporaryEffects.find(e => e.shield !== undefined && e.shield > 0);
    if (playerShield && playerShield.shield > 0) {
        const shieldPercent = (playerShield.shield / player.maxHealth) * 100;
        playerShieldHTML = `<div class="shield-bar" style="width: 100%; height: 4px; background: rgba(52,152,219,0.3); border-radius: 2px; margin-top: 2px; overflow: hidden;"><div class="shield-fill" style="width: ${Math.min(100, shieldPercent)}%; height: 100%; background: #3498db;"></div></div>`;
    }

    let monsterDotHTML = '';
    if (currentMonster.effects && currentMonster.effects.length > 0) {
        const dotEffects = currentMonster.effects.filter(e => e.val);
        if (dotEffects.length > 0) {
            monsterDotHTML = '<div class="active-effects">';
            for (let effect of dotEffects) {
                let icon = '';
                if (effect.type === 'Яд' || effect.type === 'poison') icon = '☠️';
                else if (effect.type === 'Горение' || effect.type === 'burn') icon = '🔥';
                else if (effect.type === 'Шок' || effect.type === 'shock') icon = '⚡';
                else icon = '💀';
                monsterDotHTML += `<div class="effect-icon dot" title="${effect.type} - ${effect.val}% HP/ход (${effect.dur} ход.)">${icon} ${effect.val}%</div>`;
            }
            monsterDotHTML += '</div>';
        }
    }

    let logHTML = '<div class="battle-log" id="battleLog">';
    battleLogEntries.forEach(e => { logHTML += '<div class="log-entry ' + e.cls + '">' + e.msg + '</div>'; });
    logHTML += '</div>';

    const html = '<div class="battle-wrapper"><div class="battle-arena" style="background:' + bgStyle + ';" id="battleArena"><div class="ground"></div>' +
        '<div class="combatant-wrapper" id="enemyWrapper"><div class="combatant-sprite" id="enemySprite">' + monsterImg + '</div><div class="combatant-info"><div class="combatant-name" style="color:#e74c3c;">' + currentMonster.name + '</div><div class="health-bar"><div class="health-fill enemy-hp" style="width:' + mHp + '%;"></div></div>' + monsterShieldHTML + '<div class="health-text">' + currentMonster.health + '/' + currentMonster.maxHealth + '</div>' + monsterEffectsHTML + monsterDotHTML + abilitiesHTML + '</div></div>' +
        '<div class="vs-badge">⚔️ VS ⚔️</div>' +
        '<div class="combatant-wrapper" id="playerWrapper"><div class="combatant-sprite" id="playerSprite"><span class="sprite-fallback">' + av + '</span></div><div class="combatant-info"><div class="combatant-name" style="color:#2ecc71;">' + player.name + '</div><div class="health-bar"><div class="health-fill player-hp" style="width:' + pHp + '%;"></div></div>' + playerShieldHTML + '<div class="health-text">' + player.health + '/' + player.maxHealth + (player.class === 'Маг' ? ' | 💎' + player.mana : '') + '</div>' + playerEffectsHTML + '</div></div>' +
        '</div><div class="action-buttons"><button class="action-btn" onclick="playerAttack()" id="btnAtk">⚔️ Атака</button><button class="action-btn" onclick="showBattleAbilities()" id="btnAbi">✨ Способности</button><button class="action-btn" onclick="attemptDodge()" id="btnDodge">💨 Уклон</button><button class="action-btn danger" onclick="fleeBattle()">🏃 Бежать</button></div>' +
        showItemCooldownsInBattle() +
        logHTML + '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
    updateBattleButtons();
}

function animatePlayerAttack(callback) {
    const ps = document.getElementById('playerSprite');
    const es = document.getElementById('enemySprite');
    if (ps) {
        ps.classList.remove('player-attacking');
        void ps.offsetWidth;
        ps.classList.add('player-attacking');
        setTimeout(() => ps.classList.remove('player-attacking'), 850);
    }
    if (es) {
        setTimeout(() => {
            es.classList.remove('taking-damage');
            void es.offsetWidth;
            es.classList.add('taking-damage');
            setTimeout(() => es.classList.remove('taking-damage'), 400);
        }, 380);
    }
    if (callback) setTimeout(callback, 850);
}

function animateEnemyAttack(callback) {
    const ps = document.getElementById('playerSprite');
    const es = document.getElementById('enemySprite');
    if (es) {
        es.classList.remove('enemy-attacking');
        void es.offsetWidth;
        es.classList.add('enemy-attacking');
        setTimeout(() => es.classList.remove('enemy-attacking'), 850);
    }
    if (ps) {
        setTimeout(() => {
            ps.classList.remove('taking-damage');
            void ps.offsetWidth;
            ps.classList.add('taking-damage');
            setTimeout(() => ps.classList.remove('taking-damage'), 400);
        }, 380);
    }
    if (callback) setTimeout(callback, 850);
}

function floatDamage(target, amount, isCrit) {
    const wrapper = target === 'player' ? document.getElementById('playerWrapper') : document.getElementById('enemyWrapper');
    if (!wrapper) return;
    const el = document.createElement('div');
    el.className = 'damage-float';
    el.textContent = (isCrit ? '💥 ' : '') + '-' + amount;
    el.style.color = target === 'player' ? '#ff4444' : '#ffaa00';
    if (isCrit) { el.style.fontSize = '32px'; el.style.color = '#ff5500'; }
    el.style.left = '50%';
    el.style.top = '10px';
    el.style.transform = 'translateX(-50%)';
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

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

function monsterTurn() {
    if (!currentMonster || currentMonster.health <= 0) { 
        isPlayerTurn = true; 
        updateBattleButtons(); 
        return; 
    }

    updateMonsterBuffs();

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
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
        return;
    }
    
    const blindEffect = player.temporaryEffects.find(e => e.type === 'debuff_blind');
    let playerMissChance = 0;
    if (blindEffect) playerMissChance = blindEffect.value || 25;
    
    let dodgeBonus = player.temporaryEffects.reduce((s, e) => s + (e.dodge || 0), 0);
    const dodgeDebuff = player.temporaryEffects.find(e => e.type === 'debuff_dodge');
    if (dodgeDebuff) dodgeBonus = dodgeBonus - dodgeDebuff.value;
    
    let totalDodge = getCappedDodge(player.dodgeChance + dodgeBonus);
    if (playerMissChance > 0) totalDodge = totalDodge + playerMissChance;
    
    if (Math.random() * 100 <= totalDodge) {
        addBattleLog('💨 Вы уклонились от атаки!', 'info');
        const hasFreeOnDodge = player.temporaryEffects.some(e => e.freeOnDodge);
        if (hasFreeOnDodge) {
            nextFreeMana = true;
            addBattleLog(`🔄 Уклонение активировало бесплатный выстрел!`, 'info');
        }
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
        return;
    }
    
    const immune = player.temporaryEffects.find(e => e.immune);
    if (immune) {
        addBattleLog('🛡️ Иммунитет!', 'info');
        immune.dur--;
        if (immune.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== immune);
        reduceAllCooldowns();
        isPlayerTurn = true;
        renderBattle();
        updateBattleButtons();
        return;
    }
    
    let abilityUsed = false;
    if (currentMonster.abilities && currentMonster.abilities.length > 0) {
        const sortedAbilities = [...currentMonster.abilities].sort((a, b) => {
            const priority = { 'heal': 1, 'buff': 2, 'shield': 2, 'debuff': 3, 'dot': 3, 'damage': 4 };
            return (priority[a.type] || 5) - (priority[b.type] || 5);
        });
        
        for (let ability of sortedAbilities) {
            if (ability.type === 'buff' && ability.effect === 'atk' && currentMonster.buffs && currentMonster.buffs.atk) continue;
            if (ability.type === 'buff' && ability.effect === 'def' && currentMonster.buffs && currentMonster.buffs.def) continue;
            if (ability.type === 'shield' && currentMonster.shield > 0) continue;
            if (ability.type === 'heal' && currentMonster.health > currentMonster.maxHealth * 0.5) continue;
            if (useMonsterAbility(ability)) { abilityUsed = true; break; }
        }
    }
    
    if (!abilityUsed) {
        const monsterAtk = getMonsterEffectiveAttack();
        let dmg = Math.floor(monsterAtk);
        const playerDef = getPlayerEffectiveDefense();
        dmg = calculateDamageWithDebuffs(dmg, playerDef, player.temporaryEffects);
        
        const lifestealBuff = currentMonster.buffs ? currentMonster.buffs.lifesteal : null;
        let lifestealValue = lifestealBuff ? lifestealBuff.value : 0;
        
        const counter = player.temporaryEffects.find(e => e.counterChance);
        if (counter && Math.random() * 100 <= counter.counterChance) {
            const counterDmg = Math.floor(dmg * (counter.counterDmg || 80) / 100);
            applyDamageToMonster(counterDmg);
            addBattleLog(`↩️ Контратака! ${counterDmg} урона!`, 'dmg');
        }
        
        const reflectEffect = player.temporaryEffects.find(e => e.reflect);
        if (reflectEffect && reflectEffect.reflect > 0 && dmg > 0) {
            const reflectedDmg = Math.floor(dmg * reflectEffect.reflect / 100);
            applyDamageToMonster(reflectedDmg);
            addBattleLog(`↩️ Отражено ${reflectedDmg} урона!`, 'dmg');
            reflectEffect.dur--;
            if (reflectEffect.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== reflectEffect);
            if (currentMonster.health <= 0) { victory(); return; }
        }
        
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
    
    // ИСПРАВЛЕННЫЙ БЛОК - удалены дублирования
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
            // Восстанавливаем здоровье пропорционально
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
    // Добавляем временный эффект, который вернёт ману после окончания
    player.temporaryEffects.push({ 
        type: 'maxManaBonus', 
        value: a.maxManaBonus, 
        oldMaxMana: oldMaxMana,
        dur: a.dur || 3 
    });
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

function calculateDamageWithShred(dmg, defense, shred) {
    const effectiveDefense = Math.max(0, defense * (1 - shred / 100));
    const reduction = effectiveDefense / 4;
    return Math.max(1, Math.floor(dmg * (100 - Math.min(reduction, 70)) / 100));
}

function attemptDodge() {
    if (!isPlayerTurn) return;
    isPlayerTurn = false;
    updateBattleButtons();
    
    const dodgeBonus = player.temporaryEffects.reduce((s, e) => s + (e.dodge || 0), 0);
    const totalDodge = getCappedDodge(player.dodgeChance + dodgeBonus + 30);
    
    if (Math.random() * 100 <= totalDodge) {
        addBattleLog('💨 Уклонились!', 'info');
        setTimeout(() => { isPlayerTurn = true; renderBattle(); updateBattleButtons(); }, 500);
    } else {
        addBattleLog('❌ Не удалось уклониться!', 'info');
        setTimeout(() => { monsterTurn(); }, 500);
    }
    renderBattle();
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

function victory() {
    let gold = Math.floor((currentMonster.exp / 4 + player.level * 1.5) * currentMonster.goldMult / 15);
    gold = Math.floor(gold * 1.0);
    
    window.lastVictoryData = { exp: currentMonster.exp, gold: gold };
    player.gold += gold;
    player.experience += currentMonster.exp;
    player.victories = (player.victories || 0) + 1;
    
    while (player.experience >= player.maxExperience) {
        player.experience -= player.maxExperience;
        player.level++;
        player.maxExperience = Math.floor(player.level * 70 + 250);
        resetBaseStats();
        player.health = player.maxHealth;
        if (player.class === 'Маг') player.mana = player.maxMana;
        updateAllAbilities();
        addMessage(`🎉 ПОВЫШЕНИЕ УРОВНЯ! Теперь вы ${player.level} уровень!`, 'success');
    }
    currentMonster = null;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    showModal('🎉 Победа!', '🏆', 'Вы победили!\n⭐ Опыт: +' + window.lastVictoryData.exp + '\n💰 Золото: +' + window.lastVictoryData.gold + '\n📊 Уровень: ' + player.level, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
}

function gameOver() {
    const xpLoss = Math.floor(player.experience * 0.1);
    const goldLoss = Math.floor(player.gold * 0.15);
    player.experience = Math.max(0, player.experience - xpLoss);
    player.gold = Math.max(0, player.gold - goldLoss);
    player.health = Math.floor(player.maxHealth / 2);
    if (player.class === 'Маг') player.mana = Math.floor(player.maxMana / 2);
    currentMonster = null;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    showModal('💀 Поражение', '💀', 'Вы погибли!\n💔 Опыт: -' + xpLoss + '\n💰 Золото: -' + goldLoss, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
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

window.startBattle = startBattle;
window.playerAttack = playerAttack;
window.showBattleAbilities = showBattleAbilities;
window.useBattleAbility = useBattleAbility;
window.attemptDodge = attemptDodge;
window.fleeBattle = fleeBattle;
window.showItemCooldownsInBattle = showItemCooldownsInBattle;
window.monsterTurn = monsterTurn;
window.victory = victory;
window.gameOver = gameOver;

