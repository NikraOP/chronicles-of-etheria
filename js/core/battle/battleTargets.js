// js/core/battle/battleTargets.js — выбор цели в бою (атака, способности)

let _targetingMode = false;
let _pendingAction = null;
let _targetHoverEl = null;

function getBattleEnemySlotCount() {
    if (typeof getBattleEnemies === 'function') {
        const list = getBattleEnemies();
        if (list && list.length) return list.length;
    }
    return (typeof currentMonster !== 'undefined' && currentMonster) ? 1 : 0;
}

function lookupAbilityTargetingInDb(ability) {
    if (!ability || !ability.name || typeof ABILITIES_DB === 'undefined' || !player) return null;
    const school = ABILITIES_DB[player.class] && ABILITIES_DB[player.class][player.branch];
    if (!school || !school.abilities) return null;
    const row = school.abilities.find(ab => ab.name === ability.name);
    return row && row.targeting ? row.targeting : null;
}

/** @returns {'enemy'|'self'|'ally'|'all_enemies'} */
function getBattleAbilityTargeting(ability) {
    if (!ability) return 'enemy';
    if (ability.targeting) return ability.targeting;
    const fromDb = lookupAbilityTargetingInDb(ability);
    if (fromDb) return fromDb;
    if ((ability.heal || ability.maxHpShield) && !(ability.dmg || ability.aoe || ability.doubleHit)) {
        return 'self';
    }
    return 'enemy';
}

function targetingModeToValidKinds(mode) {
    if (mode === 'self') return ['self'];
    if (mode === 'ally') return ['ally', 'self'];
    if (mode === 'all_enemies') return ['enemy'];
    return ['enemy'];
}

function isBattleTargetingActive() {
    return _targetingMode;
}

function focusBattleEnemyAtIndex(index) {
    if (typeof setFocusedEnemyIndex === 'function') {
        setFocusedEnemyIndex(index);
        if (typeof syncCurrentMonsterFromFocus === 'function') syncCurrentMonsterFromFocus();
        return;
    }
    if (typeof getBattleEnemies === 'function') {
        const enemies = getBattleEnemies();
        if (enemies && enemies[index]) {
            currentMonster = enemies[index];
        }
    }
}

function getAutoResolveTarget(validKinds) {
    if (!validKinds || !validKinds.length) return null;
    if (validKinds.indexOf('self') >= 0 && validKinds.length === 1) {
        return { targetKind: 'self', targetIndex: 0 };
    }
    if (validKinds.indexOf('enemy') >= 0 && getBattleEnemySlotCount() <= 1) {
        return { targetKind: 'enemy', targetIndex: 0 };
    }
    return null;
}

function clearBattleTargetHover() {
    if (_targetHoverEl) {
        _targetHoverEl.classList.remove('combatant-wrapper--target-hover');
        _targetHoverEl = null;
    }
    const arena = document.getElementById('battleArena');
    if (arena) {
        arena.querySelectorAll('.combatant-wrapper--target-hover').forEach(el => {
            el.classList.remove('combatant-wrapper--target-hover');
        });
    }
}

function clearBattleTargetReticles() {
    const arena = document.getElementById('battleArena');
    if (!arena) return;
    arena.querySelectorAll('.battle-target-reticle').forEach(el => el.remove());
}

function refreshBattleTargetReticles() {
    clearBattleTargetReticles();
    if (!_targetingMode) return;
    const arena = document.getElementById('battleArena');
    if (!arena) return;
    arena.querySelectorAll('.combatant-wrapper--targetable').forEach(function (wrapper) {
        const reticle = document.createElement('span');
        reticle.className = 'battle-target-reticle';
        reticle.setAttribute('aria-hidden', 'true');
        reticle.textContent = '🎯';
        wrapper.appendChild(reticle);
    });
}

function refreshBattleTargetableHighlights(validKinds) {
    const arena = document.getElementById('battleArena');
    if (!arena) return;
    arena.querySelectorAll('.combatant-wrapper--targetable').forEach(el => {
        el.classList.remove('combatant-wrapper--targetable');
    });
    if (!_targetingMode || !validKinds) return;

    if (validKinds.indexOf('enemy') >= 0) {
        arena.querySelectorAll('.combatant-wrapper[data-enemy-index]').forEach(el => {
            if (el.classList.contains('battle-enemy--defeated')) return;
            el.classList.add('combatant-wrapper--targetable');
        });
    }
    if (validKinds.indexOf('self') >= 0) {
        const pw = document.getElementById('playerWrapper');
        if (pw) pw.classList.add('combatant-wrapper--targetable');
    }
    if (validKinds.indexOf('ally') >= 0) {
        const aw = document.getElementById('allyWrapper');
        if (aw) aw.classList.add('combatant-wrapper--targetable');
    }
}

function refreshBattleTargetingUi() {
    if (!_targetingMode || !_pendingAction) return;
    refreshBattleTargetableHighlights(_pendingAction.validKinds);
    refreshBattleTargetReticles();
}

function parseTargetFromWrapper(wrapper) {
    if (!wrapper) return null;
    if (wrapper.id === 'playerWrapper') return { targetKind: 'self', targetIndex: 0 };
    if (wrapper.id === 'allyWrapper') return { targetKind: 'ally', targetIndex: 0 };
    if (wrapper.hasAttribute('data-enemy-index')) {
        const idx = parseInt(wrapper.getAttribute('data-enemy-index'), 10);
        return { targetKind: 'enemy', targetIndex: isNaN(idx) ? 0 : idx };
    }
    return null;
}

function isTargetAllowed(targetKind, validKinds) {
    if (!validKinds || !validKinds.length) return false;
    if (validKinds.indexOf(targetKind) >= 0) return true;
    if (targetKind === 'self' && validKinds.indexOf('ally') >= 0) return true;
    return false;
}

function cancelBattleTargeting() {
    if (!_targetingMode) return;
    _targetingMode = false;
    _pendingAction = null;
    clearBattleTargetHover();
    const arena = document.getElementById('battleArena');
    if (arena) {
        arena.classList.remove('battle-targeting-active');
        arena.querySelectorAll('.combatant-wrapper--targetable').forEach(el => {
            el.classList.remove('combatant-wrapper--targetable');
        });
        clearBattleTargetReticles();
        const hint = arena.querySelector('.battle-targeting-hint');
        if (hint) hint.remove();
    }
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
}

function resolveBattleTargeting(targetKind, targetIndex) {
    if (!_targetingMode || !_pendingAction) return false;
    const validKinds = _pendingAction.validKinds || ['enemy'];
    if (!isTargetAllowed(targetKind, validKinds)) return false;

    const action = _pendingAction;
    const handler = action.handler;
    cancelBattleTargeting();

    if (targetKind === 'enemy') {
        focusBattleEnemyAtIndex(targetIndex);
    }

    if (typeof handler === 'function') {
        handler(targetKind, targetIndex, action);
    }
    return true;
}

function beginBattleTargeting(opts) {
    opts = opts || {};
    if (_targetingMode) cancelBattleTargeting();

    const validKinds = opts.validKinds || targetingModeToValidKinds(opts.targeting || 'enemy');
    const auto = getAutoResolveTarget(validKinds);
    if (auto && opts.skipAutoResolve !== true) {
        if (auto.targetKind === 'enemy') focusBattleEnemyAtIndex(auto.targetIndex);
        if (typeof opts.handler === 'function') {
            opts.handler(auto.targetKind, auto.targetIndex, opts);
        }
        return true;
    }

    const arena = document.getElementById('battleArena');
    if (!arena) {
        if (typeof opts.handler === 'function') opts.handler('enemy', 0, opts);
        return false;
    }

    _targetingMode = true;
    _pendingAction = {
        type: opts.type || 'action',
        abilityId: opts.abilityId,
        validKinds: validKinds,
        handler: opts.handler
    };

    arena.classList.add('battle-targeting-active');
    let hint = arena.querySelector('.battle-targeting-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'battle-targeting-hint';
        hint.setAttribute('role', 'status');
        arena.insertBefore(hint, arena.firstChild);
    }
    hint.textContent = opts.hint || 'Выберите цель (Esc — отмена)';

    refreshBattleTargetingUi();
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
    return true;
}

function onBattleTargetingClick(ev) {
    if (!_targetingMode) return;
    const arena = document.getElementById('battleArena');
    if (!arena || !arena.classList.contains('battle-targeting-active')) return;

    const wrapper = ev.target.closest(
        '.combatant-wrapper[data-enemy-index], #playerWrapper, #allyWrapper'
    );
    if (!wrapper || !arena.contains(wrapper)) return;
    if (!wrapper.classList.contains('combatant-wrapper--targetable')) return;

    const parsed = parseTargetFromWrapper(wrapper);
    if (!parsed) return;

    ev.preventDefault();
    ev.stopPropagation();
    resolveBattleTargeting(parsed.targetKind, parsed.targetIndex);
}

function onBattleTargetingHover(ev) {
    if (!_targetingMode) return;
    const arena = document.getElementById('battleArena');
    if (!arena) return;

    const wrapper = ev.target.closest(
        '.combatant-wrapper[data-enemy-index], #playerWrapper, #allyWrapper'
    );
    if (!wrapper || !arena.contains(wrapper) || !wrapper.classList.contains('combatant-wrapper--targetable')) {
        clearBattleTargetHover();
        return;
    }
    if (_targetHoverEl === wrapper) return;
    clearBattleTargetHover();
    _targetHoverEl = wrapper;
    wrapper.classList.add('combatant-wrapper--target-hover');
}

function onBattleTargetingKeydown(ev) {
    if (!_targetingMode || ev.key !== 'Escape') return;
    const menuOpen = window._battleAbilitiesMenuOpen;
    if (menuOpen) return;
    ev.preventDefault();
    ev.stopPropagation();
    cancelBattleTargeting();
    if (typeof addBattleLog === 'function') {
        addBattleLog('↩️ Выбор цели отменён.', 'info');
    }
    if (typeof renderBattle === 'function') renderBattle({ force: true });
}

(function initBattleTargetingListeners() {
    document.addEventListener('click', onBattleTargetingClick, true);
    document.addEventListener('mouseover', onBattleTargetingHover);
    document.addEventListener('keydown', onBattleTargetingKeydown, true);
})();

window.beginBattleTargeting = beginBattleTargeting;
window.cancelBattleTargeting = cancelBattleTargeting;
window.resolveBattleTargeting = resolveBattleTargeting;
window.isBattleTargetingActive = isBattleTargetingActive;
window.getBattleAbilityTargeting = getBattleAbilityTargeting;
window.getBattleEnemySlotCount = getBattleEnemySlotCount;
window.focusBattleEnemyAtIndex = focusBattleEnemyAtIndex;

function restoreBattleTargetingUi() {
    if (!_targetingMode || !_pendingAction) return;
    const arena = document.getElementById('battleArena');
    if (!arena) return;
    arena.classList.add('battle-targeting-active');
    let hint = arena.querySelector('.battle-targeting-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.className = 'battle-targeting-hint';
        hint.setAttribute('role', 'status');
        arena.insertBefore(hint, arena.firstChild);
    }
    hint.textContent = 'Выберите цель (Esc — отмена)';
    refreshBattleTargetingUi();
}

window.restoreBattleTargetingUi = restoreBattleTargetingUi;
window.refreshBattleTargetingUi = refreshBattleTargetingUi;
window.refreshBattleTargetReticles = refreshBattleTargetReticles;
