// Зона боя: сначала экран подготовки, затем «В бой» — полный бой; выход только побегом.

let battleZoneActive = false;
let battleEngaged = false;
let stagedBattleRoll = null;

function isBattleZoneStaging() {
    return battleZoneActive && !battleEngaged && !window.pvpBattleActive;
}

function isBattleEngaged() {
    if (window.pvpBattleActive && !!currentMonster) return true;
    return battleEngaged && !!currentMonster && !window.pvpBattleActive;
}

function isBattleNavigationBlocked() {
    return isBattleEngaged();
}

function guardBattleNavigation() {
    if (!isBattleNavigationBlocked()) return true;
    if (typeof addMessage === 'function') {
        addMessage('⚔️ Бой идёт! Выйти можно только побегом (штраф к золоту и опыту).', 'error');
    }
    if (typeof renderBattle === 'function') renderBattle({ force: true });
    if (typeof syncBattleZoneLayout === 'function') syncBattleZoneLayout();
    return false;
}

function cancelBattleZoneStaging() {
    if (isBattleEngaged()) return false;
    if (!battleZoneActive) return true;
    clearBattleZoneState();
    return true;
}

function clearBattleZoneState() {
    battleZoneActive = false;
    battleEngaged = false;
    stagedBattleRoll = null;
    window._stagedFixedMonster = null;
    window._battleAbilitiesMenuOpen = false;
    if (typeof clearBattleEnemies === 'function') clearBattleEnemies();
    syncBattleZoneLayout();
}

function syncBattleZoneLayout() {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('battle-zone-active', isBattleZoneStaging());
    document.body.classList.toggle('battle-engaged', isBattleEngaged());
    const main = document.getElementById('mainContent');
    if (main) {
        main.classList.toggle('main-content--battle-zone', battleZoneActive && !window.pvpBattleActive);
        main.classList.toggle('main-content--battle-engaged', isBattleEngaged());
    }
}

function computeRandomBattleRoll() {
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    const monsters = loc.monsters || [];
    if (!monsters.length) return null;
    const mData = monsters[Math.floor(Math.random() * monsters.length)];
    const scale = Math.max(1, 1 + ((player.level - loc.minLvl) * 0.2));
    return { mData: mData, scale: scale, goldMult: loc.goldMult };
}

function applyFleePenalty() {
    if (!player) return;
    const goldLoss = Math.max(1, Math.floor((player.gold || 0) * 0.08));
    const xpLoss = Math.max(0, Math.floor((player.experience || 0) * 0.05));
    player.gold = Math.max(0, (player.gold || 0) - goldLoss);
    player.experience = Math.max(0, (player.experience || 0) - xpLoss);
    if (typeof addMessage === 'function') {
        addMessage('🏃 Побег: −' + goldLoss + ' золота, −' + xpLoss + ' опыта.', 'warning');
    }
    if (typeof saveGame === 'function') saveGame();
}

function initPlayerCombatState() {
    player.temporaryEffects = [];
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
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    window.echoActive = false;
    isPlayerTurn = true;
}

function getStagingMonsterCandidates() {
    if (window._stagedFixedMonster && window._stagedFixedMonster.monsterData) {
        return [window._stagedFixedMonster.monsterData];
    }
    const loc = LOCATIONS.find(l => l.name === player.location) || LOCATIONS[0];
    return (loc && loc.monsters) ? loc.monsters.slice() : [];
}

function beginEngagedCombatFromStaging() {
    if (!window._stagedFixedMonster) {
        const candidates = getStagingMonsterCandidates();
        if (!candidates.length) return false;
    }

    if (typeof prepareBattleState === 'function') prepareBattleState();

    if (window._stagedFixedMonster) {
        const pack = window._stagedFixedMonster;
        const opts = pack.options || {};
        const scale = opts.scale || 1;
        const goldMult = opts.goldMult || pack.monsterData.goldMult || 10;
        setupBattleMonster(pack.monsterData, scale, goldMult);
        if (typeof applyBattleEnemyRoster === 'function') applyBattleEnemyRoster(opts, scale, goldMult);
        window._stagedFixedMonster = null;
    } else {
        const roll = computeRandomBattleRoll();
        if (!roll) return false;
        setupBattleMonster(roll.mData, roll.scale, roll.goldMult);
        if (typeof applyBattleEnemyRoster === 'function') applyBattleEnemyRoster(null, roll.scale, roll.goldMult);
    }

    originalMonsterStats.attack = currentMonster.attack;
    originalMonsterStats.defense = currentMonster.defense;
    initPlayerCombatState();
    battleEngaged = true;
    stagedBattleRoll = null;
    syncBattleZoneLayout();
    if (typeof renderBattle === 'function') renderBattle({ force: true });
    return true;
}

function enterBattleZone() {
    if (!player) return;
    if (isBattleEngaged()) return;
    if (typeof stopGathering === 'function') stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();

    const candidates = getStagingMonsterCandidates();
    if (!candidates.length) {
        if (typeof addMessage === 'function') addMessage('❌ В этой локации нет монстров для боя.', 'error');
        return;
    }

    battleZoneActive = true;
    battleEngaged = false;
    stagedBattleRoll = null;
    window._stagedFixedMonster = null;
    currentMonster = null;
    battleLogEntries = [];
    syncBattleZoneLayout();
    if (typeof renderBattleStaging === 'function') renderBattleStaging();
}

function enterBattleZoneWithMonster(monsterData, options) {
    if (!monsterData) return false;
    if (isBattleEngaged()) return false;
    if (typeof stopGathering === 'function') stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();

    battleZoneActive = true;
    battleEngaged = false;
    stagedBattleRoll = null;
    window._stagedFixedMonster = { monsterData: monsterData, options: options || {} };
    currentMonster = null;
    battleLogEntries = [];
    syncBattleZoneLayout();
    if (typeof renderBattleStaging === 'function') renderBattleStaging();
    return true;
}

function commitBattleStart() {
    if (!isBattleZoneStaging()) return;
    beginEngagedCombatFromStaging();
}

function leaveBattleZoneAfterFlee(returnTo) {
    const dest = returnTo;
    clearBattleZoneState();
    currentMonster = null;
    document.body.classList.remove('low-hp');
    const dc = document.getElementById('dynamicContent');
    if (dc) dc.innerHTML = '';
    if (dest && typeof showGatheringResources === 'function') showGatheringResources(dest);
    else if (typeof renderGame === 'function') renderGame();
}

window.isBattleZoneStaging = isBattleZoneStaging;
window.isBattleEngaged = isBattleEngaged;
window.isBattleNavigationBlocked = isBattleNavigationBlocked;
window.guardBattleNavigation = guardBattleNavigation;
window.cancelBattleZoneStaging = cancelBattleZoneStaging;
window.clearBattleZoneState = clearBattleZoneState;
window.syncBattleZoneLayout = syncBattleZoneLayout;
window.enterBattleZone = enterBattleZone;
window.enterBattleZoneWithMonster = enterBattleZoneWithMonster;
window.commitBattleStart = commitBattleStart;
window.applyFleePenalty = applyFleePenalty;
window.leaveBattleZoneAfterFlee = leaveBattleZoneAfterFlee;
window.getStagingMonsterCandidates = getStagingMonsterCandidates;
