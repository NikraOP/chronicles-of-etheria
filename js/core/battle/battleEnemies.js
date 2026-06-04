// js/core/battle/battleEnemies.js — roster of enemies in battle (multi-monster foundation)

let battleEnemies = [];
let battleEnemyFocusIndex = 0;
let _monsterQueuePhaseActive = false;
/** Индексы врагов, которые ещё должны походить в этой фазе (shift при старте хода) */
let _monsterQueuePending = [];
window._monsterTurnBusy = false;

function cloneBattleEnemyFromTemplate(mData, scale, goldMult) {
    const monsterAbilities = mData.abilities || [];
    return {
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

function setupBattleEnemiesFromTemplates(templates, scale, goldMult) {
    if (!templates || !templates.length) return [];
    return templates.map(t => cloneBattleEnemyFromTemplate(t, scale, goldMult));
}

function getBattleEnemies() {
    return battleEnemies;
}

function setBattleEnemies(list) {
    battleEnemies = Array.isArray(list) ? list.slice() : [];
    if (battleEnemyFocusIndex >= battleEnemies.length) {
        battleEnemyFocusIndex = Math.max(0, battleEnemies.length - 1);
    }
}

function getFocusedEnemy() {
    if (!battleEnemies.length) return null;
    return battleEnemies[battleEnemyFocusIndex] || null;
}

function setFocusedEnemyIndex(i) {
    if (!battleEnemies.length) {
        battleEnemyFocusIndex = 0;
        return;
    }
    const idx = Math.max(0, Math.min(battleEnemies.length - 1, Math.floor(i)));
    battleEnemyFocusIndex = idx;
}

function syncCurrentMonsterFromFocus() {
    const focused = getFocusedEnemy();
    if (focused) {
        currentMonster = focused;
        return;
    }
    if (battleEnemies.length === 0 && typeof currentMonster !== 'undefined') {
        return;
    }
    currentMonster = null;
}

function clearBattleEnemies() {
    battleEnemies = [];
    battleEnemyFocusIndex = 0;
    _monsterQueuePhaseActive = false;
    _monsterQueuePending = [];
    window._monsterTurnBusy = false;
}

/** Следующий враг из очереди; при старте хода индекс снимается с очереди (каждый бьёт один раз). */
function takeNextMonsterFromQueue() {
    const enemies = getBattleEnemies();
    while (_monsterQueuePending.length > 0) {
        const idx = _monsterQueuePending.shift();
        if (enemies[idx] && enemies[idx].health > 0) {
            setFocusedEnemyIndex(idx);
            syncCurrentMonsterFromFocus();
            if (typeof addBattleLog === 'function') {
                addBattleLog('👹 ' + enemies[idx].name + ' ходит!', 'info');
            }
            if (typeof renderBattle === 'function') renderBattle({ force: true });
            return idx;
        }
    }
    return -1;
}

/** В начале фазы монстров — очередь живых (без старта хода). */
function beginMonsterQueuePhase() {
    const enemies = getBattleEnemies();
    _monsterQueuePending = [];
    _monsterQueuePhaseActive = false;
    if (enemies.length <= 1) return;
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].health > 0) _monsterQueuePending.push(i);
    }
    if (_monsterQueuePending.length <= 1) {
        _monsterQueuePending = [];
        return;
    }
    _monsterQueuePhaseActive = true;
}

function scheduleMonsterTurn(delayMs) {
    const delay = delayMs != null ? delayMs : 150;
    setTimeout(function () {
        if (typeof monsterTurn === 'function') monsterTurn();
    }, delay);
}

/** @deprecated */
function advanceMonsterQueue() {
    return _monsterQueuePhaseActive && _monsterQueuePending.length > 0;
}

function finishMonsterTurnOrQueue() {
    window._monsterTurnBusy = false;

    if (_monsterQueuePhaseActive && _monsterQueuePending.length > 0) {
        if (takeNextMonsterFromQueue() >= 0) {
            scheduleMonsterTurn(150);
            return;
        }
    }

    _monsterQueuePhaseActive = false;
    _monsterQueuePending = [];
    if (typeof finishMonsterPhase === 'function') finishMonsterPhase();
    if (typeof onPlayerTurnStart === 'function') onPlayerTurnStart();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
}

/** Запуск фазы монстров после хода игрока */
function startMonsterPhaseAfterPlayer() {
    beginMonsterQueuePhase();
    if (_monsterQueuePhaseActive) {
        if (takeNextMonsterFromQueue() >= 0) scheduleMonsterTurn(60);
        return;
    }
    scheduleMonsterTurn(60);
}

/** @returns {boolean} true — бой продолжается; false — вызвана victory() или враг ещё жив */
function tryVictoryAfterEnemyDown() {
    if (!currentMonster || currentMonster.health > 0) return true;
    const enemies = getBattleEnemies();
    if (enemies.length > 1) {
        const living = enemies.filter(function (e) { return e && e.health > 0; });
        if (living.length > 0) {
            const idx = enemies.indexOf(living[0]);
            setFocusedEnemyIndex(idx >= 0 ? idx : 0);
            syncCurrentMonsterFromFocus();
            if (typeof addBattleLog === 'function') {
                addBattleLog('⚔️ Следующий враг: ' + living[0].name, 'info');
            }
            if (typeof renderBattle === 'function') renderBattle({ force: true });
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return true;
        }
    }
    if (typeof victory === 'function') victory();
    return false;
}

function getBattleEnemyFocusIndex() {
    return battleEnemyFocusIndex;
}

window.getBattleEnemies = getBattleEnemies;
window.getBattleEnemyFocusIndex = getBattleEnemyFocusIndex;
window.setBattleEnemies = setBattleEnemies;
window.getFocusedEnemy = getFocusedEnemy;
window.setFocusedEnemyIndex = setFocusedEnemyIndex;
window.syncCurrentMonsterFromFocus = syncCurrentMonsterFromFocus;
window.setupBattleEnemiesFromTemplates = setupBattleEnemiesFromTemplates;
window.clearBattleEnemies = clearBattleEnemies;
window.tryVictoryAfterEnemyDown = tryVictoryAfterEnemyDown;
window.beginMonsterQueuePhase = beginMonsterQueuePhase;
window.advanceMonsterQueue = advanceMonsterQueue;
window.finishMonsterTurnOrQueue = finishMonsterTurnOrQueue;
window.startMonsterPhaseAfterPlayer = startMonsterPhaseAfterPlayer;
