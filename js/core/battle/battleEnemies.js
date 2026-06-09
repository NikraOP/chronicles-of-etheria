// js/core/battle/battleEnemies.js — roster of enemies in battle (multi-monster foundation)

let battleEnemies = [];
let battleEnemyFocusIndex = 0;
let _monsterQueuePhaseActive = false;
/** Порядок индексов в текущей фазе монстров */
let _monsterQueueOrder = [];
/** Индексы, которые уже сходили в этой фазе */
let _monsterQueueActed = {};
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
        returnTo: mData.returnTo || '',
        isBoss: !!mData.isBoss,
        aiProfile: mData.aiProfile || ''
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

function getBattleEnemyFocusIndex() {
    return battleEnemyFocusIndex;
}

/**
 * Выполняет callback для каждого живого врага, временно переключая currentMonster.
 */
function forEachLivingBattleEnemy(callback) {
    if (typeof callback !== 'function') return;
    const enemies = getBattleEnemies();
    const list = enemies.length ? enemies : (typeof currentMonster !== 'undefined' && currentMonster ? [currentMonster] : []);
    if (!list.length) return;
    const savedFocus = battleEnemyFocusIndex;
    for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m || m.health <= 0) continue;
        if (enemies.length) {
            setFocusedEnemyIndex(i);
            syncCurrentMonsterFromFocus();
        }
        callback(m, i);
    }
    if (enemies.length) {
        setFocusedEnemyIndex(savedFocus);
        syncCurrentMonsterFromFocus();
    }
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
    clearMonsterQueueState();
}

/** Сброс очереди фазы монстров (победа / поражение / выход из боя). */
function clearMonsterQueueState() {
    _monsterQueuePhaseActive = false;
    _monsterQueueOrder = [];
    _monsterQueueActed = {};
    window._monsterTurnBusy = false;
}

/**
 * После урона по монстру или игроку: победа, поражение или продолжение.
 * @returns {'stop'|'continue'}
 */
function afterMonsterHitResolution() {
    if (typeof resolvePlayerDefeatInBattle === 'function' && player && player.health <= 0) {
        resolvePlayerDefeatInBattle();
        window._monsterTurnBusy = false;
        return 'stop';
    }
    if (!currentMonster || currentMonster.health <= 0) {
        const cont = typeof tryVictoryAfterEnemyDown === 'function' ? tryVictoryAfterEnemyDown() : false;
        if (!cont) {
            window._monsterTurnBusy = false;
            return 'stop';
        }
        if (typeof finishMonsterTurnOrQueue === 'function') finishMonsterTurnOrQueue();
        return 'stop';
    }
    return 'continue';
}

function getNextUnactedMonsterIndex() {
    const enemies = getBattleEnemies();
    for (let k = 0; k < _monsterQueueOrder.length; k++) {
        const idx = _monsterQueueOrder[k];
        if (_monsterQueueActed[idx]) continue;
        if (enemies[idx] && enemies[idx].health > 0) return idx;
        _monsterQueueActed[idx] = true;
    }
    return -1;
}

function startMonsterAtIndex(idx) {
    const enemies = getBattleEnemies();
    if (!enemies[idx] || enemies[idx].health <= 0) return false;
    setFocusedEnemyIndex(idx);
    syncCurrentMonsterFromFocus();
    _monsterQueueActed[idx] = true;
    if (typeof addBattleLog === 'function') {
        const acted = Object.keys(_monsterQueueActed).length;
        const total = _monsterQueueOrder.length;
        addBattleLog('👹 ' + enemies[idx].name + ' ходит! (' + acted + '/' + total + ')', 'info');
    }
    if (typeof renderBattle === 'function') renderBattle({ force: true });
    return true;
}

/** В начале фазы монстров — список живых без старта хода. */
function beginMonsterQueuePhase() {
    const enemies = getBattleEnemies();
    _monsterQueueOrder = [];
    _monsterQueueActed = {};
    _monsterQueuePhaseActive = false;
    if (enemies.length <= 1) return;
    for (let i = 0; i < enemies.length; i++) {
        if (enemies[i] && enemies[i].health > 0) _monsterQueueOrder.push(i);
    }
    if (_monsterQueueOrder.length <= 1) {
        _monsterQueueOrder = [];
        return;
    }
    _monsterQueuePhaseActive = true;
    if (typeof addBattleLog === 'function') {
        addBattleLog('⚔️ Фаза монстров: по одному ходу каждого (' + _monsterQueueOrder.length + ')', 'info');
    }
}

function scheduleMonsterTurn(delayMs) {
    const delay = delayMs != null ? delayMs : 150;
    setTimeout(function () {
        if (typeof monsterTurn === 'function') monsterTurn();
    }, delay);
}

/** @deprecated */
function advanceMonsterQueue() {
    return _monsterQueuePhaseActive && getNextUnactedMonsterIndex() >= 0;
}

function finishMonsterTurnOrQueue() {
    window._monsterTurnBusy = false;
    if (!currentMonster && !window.pvpBattleActive && !window.dungeonDuoBattleActive) {
        _monsterQueuePhaseActive = false;
        _monsterQueueOrder = [];
        _monsterQueueActed = {};
        return;
    }

    if (_monsterQueuePhaseActive) {
        const next = getNextUnactedMonsterIndex();
        if (next >= 0) {
            startMonsterAtIndex(next);
            scheduleMonsterTurn(150);
            return;
        }
    }

    _monsterQueuePhaseActive = false;
    _monsterQueueOrder = [];
    _monsterQueueActed = {};
    if (typeof finishMonsterPhase === 'function') finishMonsterPhase();
    if (typeof onPlayerTurnStart === 'function') onPlayerTurnStart();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
}

/** Запуск фазы монстров после хода игрока — каждый живой враг ходит ровно один раз. */
function startMonsterPhaseAfterPlayer() {
    beginMonsterQueuePhase();
    if (_monsterQueuePhaseActive) {
        const idx = getNextUnactedMonsterIndex();
        if (idx >= 0) {
            startMonsterAtIndex(idx);
            scheduleMonsterTurn(60);
        }
        return;
    }
    scheduleMonsterTurn(60);
}

/** @returns {boolean} true — бой продолжается; false — вызвана victory() */
function tryVictoryAfterEnemyDown() {
    if (!currentMonster || currentMonster.health > 0) return true;
    
    // Проверяем, был ли это one-hit kill (монстр умер с первого удара в бою)
    if (typeof globalBattleTurn !== 'undefined' && globalBattleTurn === 1) {
        if (typeof onAchievementOneHitKill === 'function') onAchievementOneHitKill();
    }
    
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
    window._monsterTurnBusy = false;
    if (typeof victory === 'function') victory();
    return false;
}

function getBattleEnemyFocusIndex() {
    return battleEnemyFocusIndex;
}

window.getBattleEnemies = getBattleEnemies;
window.getBattleEnemyFocusIndex = getBattleEnemyFocusIndex;
window.forEachLivingBattleEnemy = forEachLivingBattleEnemy;
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
window.scheduleMonsterTurn = scheduleMonsterTurn;
window.clearMonsterQueueState = clearMonsterQueueState;
window.afterMonsterHitResolution = afterMonsterHitResolution;
