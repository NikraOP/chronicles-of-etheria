// js/core/battle/battleCore.js

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
let nextAccuracyBonus = 0;
let markedTarget = false;
let lingeringCloud = false;
let deathSaveActive = false;
let reviveUsed = false;
let summonedSpirit = false;
let nextCritGuaranteed = false;
let playerSkipNextTurn = false;
let ignoreShieldsThisHit = false;
let playerFrozenTurns = 0;
let monsterCritBuff = 0;
let globalBattleTurn = 0;

// Хранилище оригинальных статов монстра для восстановления после баффов
let originalMonsterStats = {
    attack: 0,
    defense: 0
};

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
let specialBattleRewardClaimed = false;

window.resetItemCooldowns = function() {
    window.itemCooldowns = { potion: 0, elixir: 0, food: 0, scroll: 0 };
};

window.reduceItemCooldowns = function() {
    for (let type in window.itemCooldowns) {
        if (window.itemCooldowns[type] > 0) {
            window.itemCooldowns[type]--;
            if (window.itemCooldowns[type] === 0) {
                const typeNames = { potion: 'зелья', elixir: 'эликсиры', food: 'еду', scroll: 'свитки' };
                if (typeof addBattleLog !== 'undefined') addBattleLog(`⏳ ${typeNames[type]} снова доступны!`, 'info');
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

/** Эффекты с val = % HP/ход (не путать с ослеплением, slow и т.д.) */
const MONSTER_DOT_EFFECT_TYPES = new Set([
    'Горение', 'Яд', 'Кровотечение', 'Шок', 'burn', 'poison', 'shock'
]);

function isMonsterDotEffectType(type) {
    return MONSTER_DOT_EFFECT_TYPES.has(type);
}

window.isMonsterDotEffectType = isMonsterDotEffectType;

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
    if (!currentMonster) return;
    const root = document.querySelector('.battle-wrapper');
    if (!root) return;
    root.querySelectorAll('.action-btn').forEach(btn => {
        if (!btn.classList.contains('danger')) btn.disabled = !isPlayerTurn;
    });
}

/** Вызывать, когда ход переходит к игроку после хода монстра */
function onPlayerTurnStart() {
    if (window.pvpBattleActive && typeof window.pvpOnTurnStart === 'function') {
        return window.pvpOnTurnStart(false);
    }
    if (playerFrozenTurns > 0) {
        playerFrozenTurns--;
        const freezeFx = player.temporaryEffects.find(e => e.type === 'debuff_freeze');
        if (freezeFx) {
            freezeFx.dur--;
            if (freezeFx.dur <= 0) player.temporaryEffects = player.temporaryEffects.filter(e => e !== freezeFx);
        }
        addBattleLog(`❄️ Заморозка — вы не можете действовать!`, 'info');
        isPlayerTurn = false;
        updateBattleButtons();
        renderBattle();
        setTimeout(() => monsterTurn(), 120);
        return false;
    }
    if (playerSkipNextTurn) {
        playerSkipNextTurn = false;
        isPlayerTurn = false;
        addBattleLog('💫 Вы пропускаете ход...', 'info');
        updateBattleButtons();
        renderBattle();
        setTimeout(() => monsterTurn(), 120);
        return false;
    }
    isPlayerTurn = true;
    updateBattleButtons();
    return true;
}

/** Перед атакой/способностью игрока */
function beginPlayerAction() {
    if (!isPlayerTurn) return false;
    if (window.pvpBattleActive && typeof window.pvpOnTurnStart === 'function') {
        if (!window.pvpOnTurnStart(true)) return false;
    }
    if (playerFrozenTurns > 0) {
        onPlayerTurnStart();
        return false;
    }
    return true;
}

/** Снятие длительности дебаффов с игрока — только после его хода (не в конце хода монстра). */
function tickPlayerDebuffsAfterPlayerTurn() {
    if (!player || !player.temporaryEffects) return;
    player.temporaryEffects = player.temporaryEffects.filter(e => {
        if (!e.type || !e.type.startsWith('debuff_') || typeof e.dur !== 'number') {
            return true;
        }
        e.dur--;
        if (e.dur > 0) return true;
        const debuffName = e.type.replace('debuff_', '');
        const endMessages = {
            atk: '⚔️ Проклятие слабости спало.',
            def: '🛡️ Снижение защиты спало.',
            dodge: '💨 Замедление реакции спало.',
            slow: '🐢 Паутина ослабла — скорость восстановлена.',
            blind: '👁️ Ослепление прошло.',
            freeze: '❄️ Заморозка растаяла.',
            all: '😵 Проклятие спало.',
            hp: '❤️ Максимальное здоровье восстановлено.'
        };
        if (e.type === 'debuff_hp' && player.originalMaxHealth) {
            const oldMaxHp = player.maxHealth;
            player.maxHealth = player.originalMaxHealth;
            const healthPercent = player.health / Math.max(1, oldMaxHp);
            player.health = Math.min(player.maxHealth, Math.floor(player.maxHealth * healthPercent));
            player.originalMaxHealth = null;
        }
        if (endMessages[debuffName]) addBattleLog(endMessages[debuffName], 'info');
        return false;
    });
}

function endPlayerActionChain() {
    tickPlayerDebuffsAfterPlayerTurn();
    if (window.pvpBattleActive && typeof window.pvpOnEndPlayerActionChain === 'function') {
        window.pvpOnEndPlayerActionChain();
        return;
    }
    setTimeout(() => monsterTurn(), 60);
}

function getGlobalBattleTurn() {
    return globalBattleTurn;
}

/** Один глобальный ход = игрок сходил + фаза монстра завершена. КД только здесь. */
function endGlobalTurn() {
    globalBattleTurn++;
    if (player && player.abilities) {
        player.abilities.forEach(ab => {
            if (ab && ab.currentCooldown > 0) ab.currentCooldown--;
        });
    }
    if (window.pvpBattleActive && player && player.temporaryEffects) {
        player.temporaryEffects.forEach(e => {
            if (e.regen) {
                const regenHeal = Math.floor(player.maxHealth * e.regen / 100);
                player.health = Math.min(player.maxHealth, player.health + regenHeal);
                if (regenHeal > 0) addBattleLog(`💚 Регенерация +${regenHeal} HP`, 'heal');
            }
        });
    }
    window.reduceItemCooldowns();
    for (let key in monsterAbilityCooldowns) {
        if (monsterAbilityCooldowns[key] > 0) monsterAbilityCooldowns[key]--;
    }
}

function finishMonsterPhase() {
    endGlobalTurn();
    if (window.pvpBattleActive) {
        if (typeof saveGame === 'function' && !window.pvpBattleActive) saveGame();
        return;
    }
    if (typeof saveGame === 'function') saveGame();
}

/** @deprecated Используй endGlobalTurn / finishMonsterPhase */
function reduceAllCooldowns() {
    endGlobalTurn();
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
    nextAccuracyBonus = 0;
    markedTarget = false;
    lingeringCloud = false;
    deathSaveActive = false;
    reviveUsed = false;
    summonedSpirit = false;
    nextCritGuaranteed = false;
    playerSkipNextTurn = false;
    ignoreShieldsThisHit = false;
    playerFrozenTurns = 0;
    monsterCritBuff = 0;
    globalBattleTurn = 0;
    
    // Восстанавливаем оригинальные статы монстра
    if (originalMonsterStats.attack > 0 && currentMonster) {
        currentMonster.attack = originalMonsterStats.attack;
        currentMonster.defense = originalMonsterStats.defense;
        originalMonsterStats.attack = 0;
        originalMonsterStats.defense = 0;
    }

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

function setupBattleMonster(mData, scale, goldMult) {
    const monsterAbilities = mData.abilities || [];
    currentMonster = {
        name: mData.name,
        icon: mData.icon,
        img: mData.img || '',
        health: Math.floor(mData.hp * scale),
        maxHealth: Math.floor(mData.hp * scale),
        attack: Math.floor(mData.atk * scale),
        defense: Math.floor(mData.def * scale),
        exp: Math.floor(mData.exp * scale),
        effects: [],
        goldMult: goldMult,
        marked: false,
        fireVuln: 0,
        armorShred: 0,
        abilities: monsterAbilities,
        activeBuffs: {},
        dotOverTime: null,
        damageAmp: 1,
        source: mData.source || '',
        rewards: mData.rewards || null,
        returnTo: mData.returnTo || ''
    };
}

function prepareBattleState() {
    stopGathering();
    battleLogEntries = [];
    resetAllCooldowns();
    player.originalMaxHealth = null;
    specialBattleRewardClaimed = false;
}

function startBattle() {
    prepareBattleState();
    
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const monsters = loc.monsters;
    const mData = monsters[Math.floor(Math.random() * monsters.length)];
    const scale = Math.max(1, 1 + ((player.level - loc.minLvl) * 0.2));
    setupBattleMonster(mData, scale, loc.goldMult);
    
    if (player.abilities) {
        const passiveCounter = player.abilities.find(a => a.passive && a.counterChance);
        if (passiveCounter) {
            player.temporaryEffects.push({
                counterChance: passiveCounter.counterChance,
                counterDmg: passiveCounter.counterDmg || 80,
                dur: 999
            });
        }
    }
    
    // Сохраняем оригинальные статы
    originalMonsterStats.attack = currentMonster.attack;
    originalMonsterStats.defense = currentMonster.defense;
    
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    player.temporaryEffects = [];
    window.echoActive = false;
    isPlayerTurn = true;
    renderBattle();
}

function startBattleWithMonster(monsterData, options) {
    if (!monsterData) return false;
    prepareBattleState();
    const battleOptions = options || {};
    setupBattleMonster(monsterData, battleOptions.scale || 1, battleOptions.goldMult || monsterData.goldMult || 10);
    
    if (player.abilities) {
        const passiveCounter = player.abilities.find(a => a.passive && a.counterChance);
        if (passiveCounter) {
            player.temporaryEffects.push({
                counterChance: passiveCounter.counterChance,
                counterDmg: passiveCounter.counterDmg || 80,
                dur: 999
            });
        }
    }
    
    originalMonsterStats.attack = currentMonster.attack;
    originalMonsterStats.defense = currentMonster.defense;
    
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    player.temporaryEffects = [];
    window.echoActive = false;
    isPlayerTurn = true;
    renderBattle();
    return true;
}