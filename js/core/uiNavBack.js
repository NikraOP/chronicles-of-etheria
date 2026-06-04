// Шаг назад по меню (профессии, крафт, инвентарь…) + привязка клавиши в настройках

let uiNavStack = [];
let _uiNavInternalInvoke = false;

function uiNavEntriesEqual(a, b) {
    if (!a || !b) return false;
    if (a.fn !== b.fn) return false;
    const aa = a.args || [];
    const bb = b.args || [];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
        if (aa[i] !== bb[i]) return false;
    }
    return true;
}

function uiNavReset() {
    uiNavStack = [];
}

function uiNavPushReturn(fn, args) {
    if (!fn || _uiNavInternalInvoke) return;
    const entry = { fn: fn, args: args || [] };
    const top = uiNavStack[uiNavStack.length - 1];
    if (uiNavEntriesEqual(top, entry)) return;
    uiNavStack.push(entry);
}

function uiNavOnScreenOpen(parentFn, parentArgs) {
    if (_uiNavInternalInvoke || !parentFn) return;
    uiNavPushReturn(parentFn, parentArgs);
}

function invokeUiNavEntry(entry) {
    if (!entry || !entry.fn) return;
    const fn = window[entry.fn];
    if (typeof fn !== 'function') {
        if (entry.fn === 'renderGame' && typeof renderGame === 'function') renderGame();
        return;
    }
    _uiNavInternalInvoke = true;
    try {
        fn.apply(window, entry.args || []);
    } finally {
        _uiNavInternalInvoke = false;
    }
}

function clickPrimaryBackButton() {
    if (typeof document === 'undefined') return false;
    const dc = document.getElementById('dynamicContent');
    if (!dc) return false;

    const preferred = dc.querySelector('.craft-back-btn, .ui-nav-back, [data-ui-nav-back]');
    if (preferred) {
        preferred.click();
        return true;
    }

    const buttons = dc.querySelectorAll('button.action-btn, button[type="button"].action-btn');
    for (let i = buttons.length - 1; i >= 0; i--) {
        const btn = buttons[i];
        const label = (btn.textContent || '').trim();
        const onclick = btn.getAttribute('onclick') || '';
        if (!/назад|↩/i.test(label) && !/showProfessions|renderGame|showEquipment/i.test(onclick)) continue;
        if (/к бою|pvp|способност|лобби/i.test(label + onclick)) continue;
        btn.click();
        return true;
    }
    return false;
}

function executeNavigateBack() {
    if (typeof isBattleEngaged === 'function' && isBattleEngaged()) return false;
    if (typeof isBattleNavigationBlocked === 'function' && isBattleNavigationBlocked()) return false;

    if (typeof document !== 'undefined' && document.body.classList.contains('settings-open')) {
        if (typeof closeSettings === 'function') closeSettings();
        if (typeof renderGame === 'function') renderGame();
        return true;
    }

    const modal = typeof document !== 'undefined' ? document.getElementById('modalOverlay') : null;
    if (modal && modal.style.display === 'flex' && window.modalCallback && !window._battleEndModalOpen) {
        if (typeof closeModal === 'function') closeModal();
        return true;
    }

    if (window._battleAbilitiesMenuOpen && typeof closeBattleAbilitiesMenu === 'function') {
        closeBattleAbilitiesMenu();
        return true;
    }

    if (typeof isBattleZoneStaging === 'function' && isBattleZoneStaging()) {
        if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
        if (typeof renderGame === 'function') renderGame();
        return true;
    }

    if (uiNavStack.length) {
        const entry = uiNavStack.pop();
        invokeUiNavEntry(entry);
        return true;
    }

    if (clickPrimaryBackButton()) return true;

    if (typeof renderGame === 'function') {
        renderGame();
        return true;
    }
    return false;
}

window.uiNavReset = uiNavReset;
window.uiNavOnScreenOpen = uiNavOnScreenOpen;
window.executeNavigateBack = executeNavigateBack;
window.getUiNavStackDepth = function () { return uiNavStack.length; };
