// js/core/battle/battleEnemies.js — roster of enemies in battle (multi-monster foundation)

let battleEnemies = [];
let battleEnemyFocusIndex = 0;
let _monsterQueuePhaseActive = false;

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
}

/** В начале фазы монстров — фокус на первого живого. */
function beginMonsterQueuePhase() {
    const enemies = getBattleEnemies();
    if (enemies.length <= 1) {
        _monsterQueuePhaseActive = false;
        return;
    }
    _monsterQueuePhaseActive = true;
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].health > 0) {
            setFocusedEnemyIndex(i);
            syncCurrentMonsterFromFocus();
            return;
        }
    }
}

/**
 * Следующий живой враг ходит; иначе false (фаза монстров завершена).
 */
function advanceMonsterQueue() {
    const enemies = getBattleEnemies();
    if (enemies.length <= 1 || !_monsterQueuePhaseActive) return false;
    const cur = getBattleEnemyFocusIndex();
    const n = enemies.length;
    for (let step = 1; step <= n; step++) {
        const idx = (cur + step) % n;
        if (enemies[idx] && enemies[idx].health > 0) {
            setFocusedEnemyIndex(idx);
            syncCurrentMonsterFromFocus();
            if (typeof addBattleLog === 'function') {
                addBattleLog('👹 ' + enemies[idx].name + ' ходит!', 'info');
            }
            if (typeof renderBattle === 'function') renderBattle({ force: true });
            setTimeout(function () {
                if (typeof monsterTurn === 'function') monsterTurn();
            }, 150);
            return true;
        }
    }
    _monsterQueuePhaseActive = false;
    return false;
}

function finishMonsterTurnOrQueue() {
    if (typeof advanceMonsterQueue === 'function' && advanceMonsterQueue()) {
        return;
    }
    _monsterQueuePhaseActive = false;
    if (typeof finishMonsterPhase === 'function') finishMonsterPhase();
    if (typeof onPlayerTurnStart === 'function') onPlayerTurnStart();
}

/** Переключение на следующего врага или вызов victory(), если пак зачищен. */
function tryVictoryAfterEnemyDown() {
    if (!currentMonster || currentMonster.health > 0) return;
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
            return;
        }
    }
    if (typeof victory === 'function') victory();
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
