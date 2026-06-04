// js/core/battle/battleEnemies.js — roster of enemies in battle (multi-monster foundation)

let battleEnemies = [];
let battleEnemyFocusIndex = 0;
let _monsterQueuePhaseActive = false;
/** Индексы врагов, которые ещё не ходили в текущей фазе монстров */
let _monsterQueuePending = [];

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
}

/** В начале фазы монстров — очередь живых (каждый бьёт ровно один раз за фазу). */
function beginMonsterQueuePhase() {
    const enemies = getBattleEnemies();
    _monsterQueuePending = [];
    if (enemies.length <= 1) {
        _monsterQueuePhaseActive = false;
        return;
    }
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].health > 0) _monsterQueuePending.push(i);
    }
    if (_monsterQueuePending.length <= 1) {
        _monsterQueuePhaseActive = false;
        _monsterQueuePending = [];
        return;
    }
    _monsterQueuePhaseActive = true;
    setFocusedEnemyIndex(_monsterQueuePending[0]);
    syncCurrentMonsterFromFocus();
}

function startNextMonsterInQueue() {
    const enemies = getBattleEnemies();
    if (!_monsterQueuePending.length) return false;
    const next = _monsterQueuePending[0];
    if (!enemies[next] || enemies[next].health <= 0) {
        _monsterQueuePending.shift();
        return startNextMonsterInQueue();
    }
    setFocusedEnemyIndex(next);
    syncCurrentMonsterFromFocus();
    if (typeof addBattleLog === 'function') {
        addBattleLog('👹 ' + enemies[next].name + ' ходит!', 'info');
    }
    if (typeof renderBattle === 'function') renderBattle({ force: true });
    setTimeout(function () {
        if (typeof monsterTurn === 'function') monsterTurn();
    }, 150);
    return true;
}

/** @deprecated Используйте finishMonsterTurnOrQueue */
function advanceMonsterQueue() {
    return _monsterQueuePhaseActive && _monsterQueuePending.length > 0;
}

function finishMonsterTurnOrQueue() {
    const enemies = getBattleEnemies();
    const cur = getBattleEnemyFocusIndex();

    if (_monsterQueuePhaseActive && _monsterQueuePending.length) {
        _monsterQueuePending = _monsterQueuePending.filter(function (i) {
            return i !== cur && enemies[i] && enemies[i].health > 0;
        });
        if (_monsterQueuePending.length > 0) {
            startNextMonsterInQueue();
            return;
        }
    }

    _monsterQueuePhaseActive = false;
    _monsterQueuePending = [];
    if (typeof finishMonsterPhase === 'function') finishMonsterPhase();
    if (typeof onPlayerTurnStart === 'function') onPlayerTurnStart();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
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
