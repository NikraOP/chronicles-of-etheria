// Быстрый доступ: 5 активных слотов способностей (настройка + бой + бинды клавиш)
const ABILITY_QUICK_SLOT_COUNT = 5;
const DEFAULT_ABILITY_QUICK_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
const DEFAULT_BATTLE_KEYS = {
    attack: 'KeyA',
    dodge: 'KeyD',
    abilities: 'KeyE',
    continue: 'Enter'
};
const BATTLE_KEY_ACTIONS = ['attack', 'dodge', 'abilities', 'continue'];
const HOTBAR_BIND_FORBIDDEN = new Set(['Tab', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'Unidentified', 'Dead']);

let _hotbarPickName = null;
let _hotbarBindSlotIndex = null;
let _battleBindAction = null;

function escapeHotbarText(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function ensureAbilityQuickSlots(p) {
    if (!p) return;
    if (!Array.isArray(p.abilityQuickSlots)) {
        p.abilityQuickSlots = new Array(ABILITY_QUICK_SLOT_COUNT).fill(null);
    }
    while (p.abilityQuickSlots.length < ABILITY_QUICK_SLOT_COUNT) {
        p.abilityQuickSlots.push(null);
    }
    if (p.abilityQuickSlots.length > ABILITY_QUICK_SLOT_COUNT) {
        p.abilityQuickSlots = p.abilityQuickSlots.slice(0, ABILITY_QUICK_SLOT_COUNT);
    }
}

function ensureAbilityQuickKeys(p) {
    if (!p) return;
    ensureAbilityQuickSlots(p);
    if (!Array.isArray(p.abilityQuickKeys)) {
        p.abilityQuickKeys = DEFAULT_ABILITY_QUICK_KEYS.slice();
    }
    while (p.abilityQuickKeys.length < ABILITY_QUICK_SLOT_COUNT) {
        p.abilityQuickKeys.push(DEFAULT_ABILITY_QUICK_KEYS[p.abilityQuickKeys.length] || null);
    }
    if (p.abilityQuickKeys.length > ABILITY_QUICK_SLOT_COUNT) {
        p.abilityQuickKeys = p.abilityQuickKeys.slice(0, ABILITY_QUICK_SLOT_COUNT);
    }
}

function formatAbilityKeyLabel(code) {
    if (!code) return '—';
    const fixed = {
        Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
        Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',
        Space: 'Пробел', Enter: 'Enter', Backspace: 'Bksp', Delete: 'Del',
        ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
        Numpad0: 'Num0', Numpad1: 'Num1', Numpad2: 'Num2', Numpad3: 'Num3', Numpad4: 'Num4',
        Numpad5: 'Num5', Numpad6: 'Num6', Numpad7: 'Num7', Numpad8: 'Num8', Numpad9: 'Num9',
        NumpadAdd: 'Num+', NumpadSubtract: 'Num−', NumpadMultiply: 'Num*', NumpadDivide: 'Num/',
        Semicolon: ';', Equal: '=', Comma: ',', Minus: '-', Period: '.', Slash: '/',
        Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Quote: "'"
    };
    if (fixed[code]) return fixed[code];
    if (code.indexOf('Key') === 0 && code.length === 4) return code.slice(3);
    if (code.indexOf('F') === 0 && /^F\d+$/.test(code)) return code;
    return code;
}

function isAbilityHotbarBindableKey(code) {
    if (!code || HOTBAR_BIND_FORBIDDEN.has(code)) return false;
    if (code === 'Escape') return false;
    return true;
}

function isAbilityHotbarTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest('.modal-overlay, #modalOverlay, #nameInput, .settings-panel')) return true;
    return false;
}

function isBattleScreenActive() {
    return !!(typeof document !== 'undefined' && document.querySelector('.battle-wrapper'));
}

function ensureBattleKeys(p) {
    if (!p) return;
    if (!p.battleKeys || typeof p.battleKeys !== 'object') {
        p.battleKeys = Object.assign({}, DEFAULT_BATTLE_KEYS);
    }
    BATTLE_KEY_ACTIONS.forEach(action => {
        if (!p.battleKeys[action]) {
            p.battleKeys[action] = DEFAULT_BATTLE_KEYS[action];
        }
    });
}

function getBattleKey(action) {
    if (!player || BATTLE_KEY_ACTIONS.indexOf(action) < 0) return null;
    ensureBattleKeys(player);
    return player.battleKeys[action] || null;
}

function releaseKeyFromAllBinds(code, except) {
    if (!player || !code) return;
    ensureAbilityQuickKeys(player);
    ensureBattleKeys(player);
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        if (except && except.type === 'quick' && except.index === i) continue;
        if (player.abilityQuickKeys[i] === code) {
            player.abilityQuickKeys[i] = DEFAULT_ABILITY_QUICK_KEYS[i];
        }
    }
    BATTLE_KEY_ACTIONS.forEach(action => {
        if (except && except.type === 'battle' && except.action === action) return;
        if (player.battleKeys[action] === code) {
            player.battleKeys[action] = DEFAULT_BATTLE_KEYS[action];
        }
    });
}

function setBattleKey(action, code) {
    if (!player || BATTLE_KEY_ACTIONS.indexOf(action) < 0) return false;
    if (!isAbilityHotbarBindableKey(code)) {
        if (typeof addMessage === 'function') addMessage('Эту клавишу нельзя назначить.', 'error');
        return false;
    }
    ensureBattleKeys(player);
    releaseKeyFromAllBinds(code, { type: 'battle', action: action });
    player.battleKeys[action] = code;
    saveGame();
    return true;
}

function sanitizeBattleKeys() {
    if (!player) return;
    ensureBattleKeys(player);
    const used = new Map();
    BATTLE_KEY_ACTIONS.forEach(action => {
        let code = player.battleKeys[action];
        if (!code || !isAbilityHotbarBindableKey(code)) {
            code = DEFAULT_BATTLE_KEYS[action];
            player.battleKeys[action] = code;
        }
        if (used.has(code)) {
            player.battleKeys[action] = DEFAULT_BATTLE_KEYS[action];
            code = player.battleKeys[action];
        }
        used.set(code, action);
    });
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const code = player.abilityQuickKeys[i];
        if (code && used.has(code)) {
            player.abilityQuickKeys[i] = DEFAULT_ABILITY_QUICK_KEYS[i];
        } else if (code) {
            used.set(code, 'quick-' + i);
        }
    }
}

function cancelAllKeyBindModes() {
    _hotbarBindSlotIndex = null;
    _battleBindAction = null;
    refreshAbilityHotbarBindUi();
    refreshSettingsBattleKeysUi();
}

function startBattleKeyBind(action) {
    if (BATTLE_KEY_ACTIONS.indexOf(action) < 0) return;
    _battleBindAction = action;
    _hotbarBindSlotIndex = null;
    _hotbarPickName = null;
    refreshSettingsBattleKeysUi();
    refreshAbilityHotbarBindUi();
    const labels = getBattleKeyActionLabels();
    if (typeof addMessage === 'function') {
        addMessage('«' + labels[action] + '»: нажмите клавишу (Esc — отмена).', 'info');
    }
}

function getBattleKeyActionLabels() {
    return { attack: 'Атака', dodge: 'Уклонение', abilities: 'Меню способностей', continue: 'Продолжить после боя' };
}

function isBattleEndModalActive() {
    if (!window._battleEndModalOpen) return false;
    const modal = document.getElementById('modalOverlay');
    return !!(modal && modal.style.display === 'flex' && window.modalCallback);
}

function tryCloseBattleEndModalByKey(code) {
    if (!player || !isBattleEndModalActive()) return false;
    ensureBattleKeys(player);
    if (player.battleKeys.continue !== code) return false;
    if (typeof closeModal === 'function') closeModal();
    return true;
}

function executeBattleKeyAction(action) {
    if (!currentMonster || !isPlayerTurn || !isBattleScreenActive()) return;
    if (action === 'attack' && typeof playerAttack === 'function') playerAttack();
    else if (action === 'dodge' && typeof attemptDodge === 'function') attemptDodge();
    else if (action === 'abilities' && typeof showBattleAbilities === 'function') showBattleAbilities();
}

function buildBattleKeysSettingsHtml() {
    if (!player) return '';
    ensureBattleKeys(player);
    const labels = getBattleKeyActionLabels();
    const rows = [
        { action: 'attack', icon: '⚔️', label: labels.attack },
        { action: 'dodge', icon: '💨', label: labels.dodge },
        { action: 'abilities', icon: '✨', label: labels.abilities },
        { action: 'continue', icon: '▶️', label: labels.continue }
    ];
    let html = '<section class="settings-section settings-section-keys" id="settingsBattleKeys">' +
        '<h3 class="settings-section-title">⌨️ Клавиши боя</h3>' +
        '<p class="theme-editor-desc">Действия в бою и кнопка «Продолжить» на экране победы или поражения. Слоты 1–5 — в разделе «Способности».</p>' +
        '<div class="battle-keybind-list">';
    rows.forEach(row => {
        const listening = _battleBindAction === row.action;
        const keyLabel = listening ? '…' : formatAbilityKeyLabel(getBattleKey(row.action));
        html += '<div class="battle-keybind-row">' +
            '<span class="battle-keybind-row__label">' + row.icon + ' ' + escapeHotbarText(row.label) + '</span>' +
            '<button type="button" class="ability-hotbar__bind battle-keybind-row__btn' +
            (listening ? ' ability-hotbar__bind--listening' : '') +
            '" data-battle-bind="' + row.action + '">' + escapeHotbarText(keyLabel) + '</button>' +
            '</div>';
    });
    html += '</div></section>';
    return html;
}

function refreshSettingsBattleKeysUi() {
    const root = document.getElementById('settingsBattleKeys');
    if (!root) return;
    root.outerHTML = buildBattleKeysSettingsHtml();
    initBattleKeysSettings(document.getElementById('settingsBattleKeys'));
}

function initBattleKeysSettings(root) {
    if (!root) root = document.getElementById('settingsBattleKeys');
    if (!root) return;
    root.querySelectorAll('[data-battle-bind]').forEach(btn => {
        const action = btn.dataset.battleBind;
        btn.addEventListener('click', function () {
            if (_battleBindAction === action) {
                cancelAllKeyBindModes();
                return;
            }
            cancelAllKeyBindModes();
            startBattleKeyBind(action);
        });
    });
}

function updateBattleActionKeyHints() {
    if (!player || !isBattleScreenActive()) return;
    ensureBattleKeys(player);
    const map = {
        btnAtk: { action: 'attack', prefix: '⚔️ Атака' },
        btnDodge: { action: 'dodge', prefix: '💨 Уклон' },
        btnAbi: { action: 'abilities', prefix: '✨ Способности' }
    };
    Object.keys(map).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const key = formatAbilityKeyLabel(getBattleKey(map[id].action));
        btn.title = map[id].prefix + ' (' + key + ')';
        let hint = btn.querySelector('.battle-action-key');
        if (!hint) {
            hint = document.createElement('span');
            hint.className = 'battle-action-key';
            btn.insertBefore(hint, btn.firstChild);
        }
        hint.textContent = key;
    });
}

function getAbilityQuickKey(slotIndex) {
    if (!player || slotIndex < 0 || slotIndex >= ABILITY_QUICK_SLOT_COUNT) return null;
    ensureAbilityQuickKeys(player);
    return player.abilityQuickKeys[slotIndex] || null;
}

function findAbilityHotbarSlotByKeyCode(code) {
    if (!player || !code) return -1;
    ensureAbilityQuickKeys(player);
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        if (player.abilityQuickKeys[i] === code) return i;
    }
    return -1;
}

function sanitizeAbilityQuickKeys() {
    if (!player) return;
    ensureAbilityQuickKeys(player);
    const seen = new Set();
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        let code = player.abilityQuickKeys[i];
        if (!code || !isAbilityHotbarBindableKey(code)) {
            player.abilityQuickKeys[i] = DEFAULT_ABILITY_QUICK_KEYS[i];
            code = player.abilityQuickKeys[i];
        }
        if (seen.has(code)) {
            player.abilityQuickKeys[i] = DEFAULT_ABILITY_QUICK_KEYS[i];
        } else {
            seen.add(code);
        }
    }
}

function setAbilityQuickKey(slotIndex, code) {
    if (!player || slotIndex < 0 || slotIndex >= ABILITY_QUICK_SLOT_COUNT) return false;
    if (!isAbilityHotbarBindableKey(code)) {
        if (typeof addMessage === 'function') {
            addMessage('Эту клавишу нельзя назначить.', 'error');
        }
        return false;
    }
    releaseKeyFromAllBinds(code, { type: 'quick', index: slotIndex });
    player.abilityQuickKeys[slotIndex] = code;
    saveGame();
    return true;
}

function startAbilityHotbarBind(slotIndex) {
    if (slotIndex < 0 || slotIndex >= ABILITY_QUICK_SLOT_COUNT) return;
    _battleBindAction = null;
    _hotbarBindSlotIndex = slotIndex;
    _hotbarPickName = null;
    document.querySelectorAll('.ability-hotbar-source--picked').forEach(el => {
        el.classList.remove('ability-hotbar-source--picked');
    });
    refreshAbilityHotbarBindUi();
    if (typeof addMessage === 'function') {
        addMessage('Слот ' + (slotIndex + 1) + ': нажмите клавишу (Esc — отмена).', 'info');
    }
}

function cancelAbilityHotbarBind() {
    if (_hotbarBindSlotIndex === null) return;
    _hotbarBindSlotIndex = null;
    refreshAbilityHotbarBindUi();
    refreshSettingsBattleKeysUi();
}

function refreshAbilityHotbarBindUi() {
    const editor = document.getElementById('abilityHotbarEditor');
    if (!editor) return;
    editor.querySelectorAll('[data-bind-slot]').forEach(btn => {
        const idx = parseInt(btn.dataset.bindSlot, 10);
        const listening = _hotbarBindSlotIndex === idx;
        btn.classList.toggle('ability-hotbar__bind--listening', listening);
        btn.textContent = listening ? '…' : formatAbilityKeyLabel(getAbilityQuickKey(idx));
    });
    editor.classList.toggle('ability-hotbar-editor--binding', _hotbarBindSlotIndex !== null);
}

function buildAbilityHotbarBindBtnHtml(slotIndex) {
    const listening = _hotbarBindSlotIndex === slotIndex;
    const label = listening ? '…' : formatAbilityKeyLabel(getAbilityQuickKey(slotIndex));
    return '<button type="button" class="ability-hotbar__bind' + (listening ? ' ability-hotbar__bind--listening' : '') +
        '" data-bind-slot="' + slotIndex + '" title="Назначить клавишу для слота ' + (slotIndex + 1) + '">' +
        escapeHotbarText(label) + '</button>';
}

function buildAbilityHotbarKeyHintHtml(slotIndex) {
    const code = getAbilityQuickKey(slotIndex);
    if (!code) return '';
    return '<span class="ability-hotbar__key" aria-hidden="true">' + escapeHotbarText(formatAbilityKeyLabel(code)) + '</span>';
}

function getAbilityMetaByName(name) {
    if (!name || !player) return null;
    const fromActive = player.abilities && player.abilities.find(a => a.name === name);
    if (fromActive) return fromActive;
    const school = ABILITIES_DB[player.class] && ABILITIES_DB[player.class][player.branch];
    if (!school || !school.abilities) return null;
    return school.abilities.find(a => a.name === name) || null;
}

function isAbilityAssignableToQuickbar(meta) {
    if (!meta || meta.passive) return false;
    return player.level >= (meta.lvl || 1);
}

function getAbilityBattleIndexByName(name) {
    if (!name || !player.abilities) return -1;
    return player.abilities.findIndex(a => a.name === name);
}

function sanitizeAbilityQuickSlots() {
    if (!player) return;
    ensureAbilityQuickSlots(player);
    const seen = new Set();
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const name = player.abilityQuickSlots[i];
        if (!name) continue;
        const meta = getAbilityMetaByName(name);
        if (!isAbilityAssignableToQuickbar(meta) || seen.has(name)) {
            player.abilityQuickSlots[i] = null;
            continue;
        }
        seen.add(name);
    }
}

function setAbilityQuickSlot(slotIndex, abilityName) {
    if (!player || slotIndex < 0 || slotIndex >= ABILITY_QUICK_SLOT_COUNT) return false;
    ensureAbilityQuickSlots(player);
    if (!abilityName) {
        player.abilityQuickSlots[slotIndex] = null;
        saveGame();
        return true;
    }
    const meta = getAbilityMetaByName(abilityName);
    if (!isAbilityAssignableToQuickbar(meta)) {
        if (typeof addMessage === 'function') {
            addMessage('Эту способность нельзя добавить в быстрый доступ (пассивная или закрыта).', 'error');
        }
        return false;
    }
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        if (i !== slotIndex && player.abilityQuickSlots[i] === abilityName) {
            player.abilityQuickSlots[i] = null;
        }
    }
    player.abilityQuickSlots[slotIndex] = abilityName;
    saveGame();
    return true;
}

function swapAbilityQuickSlots(fromIdx, toIdx) {
    if (!player || fromIdx === toIdx) return;
    ensureAbilityQuickSlots(player);
    ensureAbilityQuickKeys(player);
    const tmp = player.abilityQuickSlots[fromIdx];
    player.abilityQuickSlots[fromIdx] = player.abilityQuickSlots[toIdx];
    player.abilityQuickSlots[toIdx] = tmp;
    const tk = player.abilityQuickKeys[fromIdx];
    player.abilityQuickKeys[fromIdx] = player.abilityQuickKeys[toIdx];
    player.abilityQuickKeys[toIdx] = tk;
    saveGame();
}

function getHotbarSlotMeta(slotIndex) {
    const name = player && player.abilityQuickSlots && player.abilityQuickSlots[slotIndex];
    if (!name) return null;
    const battleIdx = getAbilityBattleIndexByName(name);
    const meta = getAbilityMetaByName(name);
    if (!meta || battleIdx < 0) return null;
    const active = player.abilities[battleIdx];
    return { name, battleIdx, meta, active };
}

function buildHotbarSlotInnerHtml(slotIndex, mode) {
    const info = getHotbarSlotMeta(slotIndex);
    if (!info) {
        return '<span class="ability-hotbar__empty">' + (mode === 'battle' ? '—' : String(slotIndex + 1)) + '</span>';
    }
    const icon = info.meta.icon || '✨';
    let cdHtml = '';
    if (mode === 'battle' && info.active) {
        const cd = info.active.currentCooldown || 0;
        if (cd > 0) {
            cdHtml = '<span class="ability-hotbar__cd">' + cd + '</span>';
        }
    }
    const title = escapeHotbarText(info.name);
    return '<span class="ability-hotbar__icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="ability-hotbar__label">' + title + '</span>' + cdHtml;
}

function buildSidebarAbilityQuickbarHtml() {
    if (!player) return '';
    ensureAbilityQuickSlots(player);
    ensureAbilityQuickKeys(player);
    let slots = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        const keyHint = buildAbilityHotbarKeyHintHtml(i);
        slots += '<button type="button" class="ability-hotbar__slot ability-hotbar__slot--sidebar' +
            (info ? ' ability-hotbar__slot--filled' : '') +
            '" data-slot="' + i + '" onclick="showAbilities()" title="' +
            (info ? escapeHotbarText(info.name) : 'Слот ' + (i + 1) + ' — настроить') + '">' +
            keyHint + buildHotbarSlotInnerHtml(i, 'sidebar') + '</button>';
    }
    return '<div class="ability-hotbar-panel ability-hotbar-panel--sidebar">' +
        '<div class="ability-hotbar-panel__head">' +
        '<span class="ability-hotbar-panel__title">⚡ Быстрый доступ</span>' +
        '<button type="button" class="ability-hotbar-panel__link" onclick="showAbilities()">Настроить</button>' +
        '</div>' +
        '<div class="ability-hotbar ability-hotbar--sidebar" role="group" aria-label="Быстрый доступ к способностям">' +
        slots + '</div></div>';
}

function buildAbilityHotbarEditorHtml() {
    ensureAbilityQuickSlots(player);
    ensureAbilityQuickKeys(player);
    let slots = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        slots += '<div class="ability-hotbar__cell">' +
            buildAbilityHotbarBindBtnHtml(i) +
            '<div class="ability-hotbar__slot ability-hotbar__slot--editor' +
            (info ? ' ability-hotbar__slot--filled' : '') +
            '" data-slot="' + i + '" data-drop-slot="' + i + '" tabindex="0" role="button" aria-label="Слот ' + (i + 1) + '">' +
            buildHotbarSlotInnerHtml(i, 'editor') +
            '<button type="button" class="ability-hotbar__clear" data-clear-slot="' + i + '" aria-label="Очистить слот ' + (i + 1) + '">×</button>' +
            '</div></div>';
    }
    const bindingHint = _hotbarBindSlotIndex !== null
        ? '<p class="ability-hotbar-editor__binding">Ожидание клавиши для слота ' + (_hotbarBindSlotIndex + 1) + '… (Esc — отмена)</p>'
        : '';
    return '<section class="ability-hotbar-editor' + (_hotbarBindSlotIndex !== null ? ' ability-hotbar-editor--binding' : '') + '" id="abilityHotbarEditor">' +
        '<div class="ability-hotbar-panel__head">' +
        '<h3 class="ability-hotbar-panel__title">⚡ Быстрый доступ</h3>' +
        '<span class="ability-hotbar-panel__hint">5 слотов · перетащите способность · назначьте клавишу</span>' +
        '</div>' +
        '<div class="ability-hotbar ability-hotbar--editor" role="group">' + slots + '</div>' +
        bindingHint +
        '<p class="ability-hotbar-editor__help">Над слотом — клавиша боя. Нажмите на неё и задайте любую кнопку. Перетащите способность в слот. На телефоне: тап по способности → тап по слоту. «✨ Способности» в бою — полный список.</p>' +
        '</section>';
}

function buildBattleAbilityHotbarHtml() {
    if (!player || !currentMonster) return '';
    ensureAbilityQuickSlots(player);
    ensureAbilityQuickKeys(player);
    let btns = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        const disabled = !info || !isPlayerTurn;
        let extraClass = '';
        let onclick = '';
        if (info && info.active) {
            const onCd = info.active.currentCooldown > 0;
            const noMana = player.class === 'Маг' && info.active.mana && player.mana < info.active.mana;
            if (onCd || noMana || info.active.passive) extraClass += ' ability-hotbar__btn--blocked';
            if (!disabled && !onCd && !noMana && !info.active.passive) {
                onclick = 'onclick="useQuickAbility(' + i + ')"';
            }
        }
        const keyLabel = formatAbilityKeyLabel(getAbilityQuickKey(i));
        const title = (info ? info.name + ' (' + keyLabel + ')' : 'Пустой слот (' + keyLabel + ')');
        btns += '<div class="ability-hotbar__cell ability-hotbar__cell--battle">' +
            buildAbilityHotbarKeyHintHtml(i) +
            '<button type="button" class="ability-hotbar__btn' + (info ? ' ability-hotbar__btn--filled' : '') +
            extraClass + '" id="hotbarBtn' + i + '" data-hotbar-slot="' + i + '" ' + onclick +
            (disabled ? ' disabled' : '') + ' title="' + escapeHotbarText(title) + '">' +
            buildHotbarSlotInnerHtml(i, 'battle') + '</button></div>';
    }
    return '<div class="ability-hotbar ability-hotbar--battle" role="group" aria-label="Быстрые способности">' + btns + '</div>';
}

function updateAbilityBattleHotbar() {
    const bar = document.querySelector('.ability-hotbar--battle');
    if (!bar || !player) return;
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const btn = document.getElementById('hotbarBtn' + i);
        if (!btn) continue;
        const info = getHotbarSlotMeta(i);
        const disabled = !info || !isPlayerTurn;
        btn.disabled = disabled;
        btn.innerHTML = buildHotbarSlotInnerHtml(i, 'battle');
        btn.classList.toggle('ability-hotbar__btn--filled', !!info);
        btn.classList.remove('ability-hotbar__btn--blocked');
        let canUse = false;
        if (info && info.active && isPlayerTurn) {
            const onCd = info.active.currentCooldown > 0;
            const noMana = player.class === 'Маг' && info.active.mana && player.mana < info.active.mana;
            if (onCd || noMana || info.active.passive) {
                btn.classList.add('ability-hotbar__btn--blocked');
            } else {
                canUse = true;
            }
        }
        btn.onclick = canUse ? function () { useQuickAbility(i); } : null;
        const keyLabel = formatAbilityKeyLabel(getAbilityQuickKey(i));
        btn.title = info ? info.name + ' (' + keyLabel + ')' : 'Пустой слот (' + keyLabel + ')';
        const cell = btn.closest('.ability-hotbar__cell--battle');
        if (cell) {
            let keyEl = cell.querySelector('.ability-hotbar__key');
            if (!keyEl) {
                keyEl = document.createElement('span');
                keyEl.className = 'ability-hotbar__key';
                cell.insertBefore(keyEl, btn);
            }
            keyEl.textContent = keyLabel;
        }
    }
}

function useQuickAbility(slotIndex) {
    const info = getHotbarSlotMeta(slotIndex);
    if (!info) {
        if (typeof addBattleLog === 'function') addBattleLog('Пустой слот быстрого доступа.', 'info');
        return;
    }
    if (typeof useBattleAbility === 'function') {
        useBattleAbility(info.battleIdx);
    }
}

function handleAbilityHotbarKeydown(e) {
    if (!player) return;

    if (_battleBindAction !== null) {
        if (e.code === 'Escape') {
            e.preventDefault();
            const action = _battleBindAction;
            cancelAllKeyBindModes();
            if (typeof addMessage === 'function') addMessage('Назначение клавиши отменено.', 'info');
            return;
        }
        if (!isAbilityHotbarBindableKey(e.code)) return;
        e.preventDefault();
        e.stopPropagation();
        const action = _battleBindAction;
        setBattleKey(action, e.code);
        _battleBindAction = null;
        refreshSettingsBattleKeysUi();
        const labels = getBattleKeyActionLabels();
        if (typeof addMessage === 'function') {
            addMessage('«' + labels[action] + '»: клавиша «' + formatAbilityKeyLabel(e.code) + '».', 'success');
        }
        return;
    }

    if (_hotbarBindSlotIndex !== null) {
        if (e.code === 'Escape') {
            e.preventDefault();
            cancelAbilityHotbarBind();
            if (typeof addMessage === 'function') addMessage('Назначение клавиши отменено.', 'info');
            return;
        }
        if (!isAbilityHotbarBindableKey(e.code)) return;
        e.preventDefault();
        e.stopPropagation();
        const slot = _hotbarBindSlotIndex;
        setAbilityQuickKey(slot, e.code);
        _hotbarBindSlotIndex = null;
        refreshAbilityHotbarEditor();
        refreshSettingsBattleKeysUi();
        if (typeof addMessage === 'function') {
            addMessage('Слот ' + (slot + 1) + ': клавиша «' + formatAbilityKeyLabel(e.code) + '».', 'success');
        }
        return;
    }

    if (e.code === 'Escape' && currentMonster && window._battleAbilitiesMenuOpen) {
        e.preventDefault();
        if (typeof closeBattleAbilitiesMenu === 'function') closeBattleAbilitiesMenu();
        return;
    }

    if (!e.repeat && tryCloseBattleEndModalByKey(e.code)) {
        e.preventDefault();
        return;
    }

    if (isAbilityHotbarTypingTarget(e.target)) return;
    if (e.repeat) return;

    if (currentMonster && isPlayerTurn && isBattleScreenActive()) {
        ensureBattleKeys(player);
        for (let a = 0; a < BATTLE_KEY_ACTIONS.length; a++) {
            const action = BATTLE_KEY_ACTIONS[a];
            if (player.battleKeys[action] === e.code) {
                e.preventDefault();
                executeBattleKeyAction(action);
                return;
            }
        }
        const slotIndex = findAbilityHotbarSlotByKeyCode(e.code);
        if (slotIndex >= 0) {
            e.preventDefault();
            useQuickAbility(slotIndex);
            return;
        }
    }
}

function initAbilityHotbarKeyListener() {
    if (window._abilityHotbarKeyListenerReady || typeof document === 'undefined') return;
    document.addEventListener('keydown', handleAbilityHotbarKeydown, true);
    window._abilityHotbarKeyListenerReady = true;
}

function refreshAbilityHotbarSidebar() {
    const panel = document.querySelector('.ability-hotbar-panel--sidebar');
    if (!panel) return;
    const bar = panel.querySelector('.ability-hotbar--sidebar');
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ability-hotbar__slot ability-hotbar__slot--sidebar' + (info ? ' ability-hotbar__slot--filled' : '');
        btn.dataset.slot = String(i);
        btn.onclick = function () { showAbilities(); };
        const keyLabel = formatAbilityKeyLabel(getAbilityQuickKey(i));
        btn.title = info ? info.name + ' (' + keyLabel + ')' : 'Слот ' + (i + 1) + ' — настроить';
        btn.innerHTML = buildAbilityHotbarKeyHintHtml(i) + buildHotbarSlotInnerHtml(i, 'sidebar');
        bar.appendChild(btn);
    }
}

function refreshAbilityHotbarEditor() {
    const bindSlot = _hotbarBindSlotIndex;
    const editor = document.getElementById('abilityHotbarEditor');
    if (!editor) return;
    editor.outerHTML = buildAbilityHotbarEditorHtml();
    _hotbarBindSlotIndex = bindSlot;
    const newEditor = document.getElementById('abilityHotbarEditor');
    if (newEditor) initAbilityHotbarEditor(newEditor);
    refreshAbilityHotbarSidebar();
}

function initAbilityHotbarEditor(root) {
    if (!root) root = document.getElementById('abilityHotbarEditor');
    if (!root) return;

    root.querySelectorAll('[data-bind-slot]').forEach(bindBtn => {
        const idx = parseInt(bindBtn.dataset.bindSlot, 10);
        bindBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (_hotbarBindSlotIndex === idx) {
                cancelAbilityHotbarBind();
                return;
            }
            startAbilityHotbarBind(idx);
        });
    });

    const slots = root.querySelectorAll('[data-drop-slot]');
    const sources = document.querySelectorAll('.ability-hotbar-source');

    function clearDragOver() {
        slots.forEach(s => s.classList.remove('drag-over'));
        sources.forEach(s => s.classList.remove('drag-over'));
    }

    sources.forEach(src => {
        const name = src.dataset.abilityName;
        if (!name) return;
        src.setAttribute('draggable', 'true');
        src.addEventListener('dragstart', function (e) {
            cancelAbilityHotbarBind();
            _hotbarPickName = name;
            e.dataTransfer.setData('text/plain', name);
            e.dataTransfer.effectAllowed = 'copy';
            src.classList.add('dragging');
        });
        src.addEventListener('dragend', function () {
            src.classList.remove('dragging');
            clearDragOver();
        });
        src.addEventListener('click', function () {
            cancelAbilityHotbarBind();
            _hotbarPickName = (_hotbarPickName === name) ? null : name;
            sources.forEach(s => s.classList.toggle('ability-hotbar-source--picked', s.dataset.abilityName === _hotbarPickName));
            if (_hotbarPickName && typeof addMessage === 'function') {
                addMessage('Выбрано: «' + _hotbarPickName + '» — нажмите слот.', 'info');
            }
        });
    });

    slots.forEach(slot => {
        const idx = parseInt(slot.dataset.dropSlot, 10);
        slot.addEventListener('dragover', function (e) {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', function () {
            slot.classList.remove('drag-over');
        });
        slot.addEventListener('drop', function (e) {
            e.preventDefault();
            clearDragOver();
            const fromSlot = e.dataTransfer.getData('application/x-hotbar-slot');
            const name = e.dataTransfer.getData('text/plain') || _hotbarPickName;
            if (fromSlot !== '' && fromSlot != null) {
                swapAbilityQuickSlots(parseInt(fromSlot, 10), idx);
            } else if (name) {
                setAbilityQuickSlot(idx, name);
            }
            _hotbarPickName = null;
            sources.forEach(s => s.classList.remove('ability-hotbar-source--picked'));
            refreshAbilityHotbarEditor();
        });
        slot.addEventListener('click', function (e) {
            if (e.target.closest('[data-clear-slot]')) return;
            if (_hotbarBindSlotIndex !== null) return;
            if (_hotbarPickName) {
                setAbilityQuickSlot(idx, _hotbarPickName);
                _hotbarPickName = null;
                sources.forEach(s => s.classList.remove('ability-hotbar-source--picked'));
                refreshAbilityHotbarEditor();
                return;
            }
            startAbilityHotbarBind(idx);
        });
        slot.setAttribute('draggable', 'true');
        slot.addEventListener('dragstart', function (e) {
            if (!player.abilityQuickSlots[idx]) {
                e.preventDefault();
                return;
            }
            cancelAbilityHotbarBind();
            e.dataTransfer.setData('application/x-hotbar-slot', String(idx));
            e.dataTransfer.setData('text/plain', player.abilityQuickSlots[idx]);
            e.dataTransfer.effectAllowed = 'move';
        });
        const clearBtn = slot.querySelector('[data-clear-slot]');
        if (clearBtn) {
            clearBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                setAbilityQuickSlot(idx, null);
                refreshAbilityHotbarEditor();
            });
        }
    });

    refreshAbilityHotbarBindUi();
}

initAbilityHotbarKeyListener();

window.ABILITY_QUICK_SLOT_COUNT = ABILITY_QUICK_SLOT_COUNT;
window.DEFAULT_ABILITY_QUICK_KEYS = DEFAULT_ABILITY_QUICK_KEYS;
window.ensureAbilityQuickSlots = ensureAbilityQuickSlots;
window.ensureAbilityQuickKeys = ensureAbilityQuickKeys;
window.sanitizeAbilityQuickSlots = sanitizeAbilityQuickSlots;
window.sanitizeAbilityQuickKeys = sanitizeAbilityQuickKeys;
window.formatAbilityKeyLabel = formatAbilityKeyLabel;
window.buildSidebarAbilityQuickbarHtml = buildSidebarAbilityQuickbarHtml;
window.buildAbilityHotbarEditorHtml = buildAbilityHotbarEditorHtml;
window.buildBattleAbilityHotbarHtml = buildBattleAbilityHotbarHtml;
window.updateAbilityBattleHotbar = updateAbilityBattleHotbar;
window.useQuickAbility = useQuickAbility;
window.initAbilityHotbarEditor = initAbilityHotbarEditor;
window.initAbilityHotbarKeyListener = initAbilityHotbarKeyListener;
window.refreshAbilityHotbarEditor = refreshAbilityHotbarEditor;
window.setAbilityQuickKey = setAbilityQuickKey;
window.findAbilityHotbarSlotByKeyCode = findAbilityHotbarSlotByKeyCode;
window.DEFAULT_BATTLE_KEYS = DEFAULT_BATTLE_KEYS;
window.ensureBattleKeys = ensureBattleKeys;
window.getBattleKey = getBattleKey;
window.sanitizeBattleKeys = sanitizeBattleKeys;
window.setBattleKey = setBattleKey;
window.tryCloseBattleEndModalByKey = tryCloseBattleEndModalByKey;
window.buildBattleKeysSettingsHtml = buildBattleKeysSettingsHtml;
window.initBattleKeysSettings = initBattleKeysSettings;
window.refreshSettingsBattleKeysUi = refreshSettingsBattleKeysUi;
window.updateBattleActionKeyHints = updateBattleActionKeyHints;
