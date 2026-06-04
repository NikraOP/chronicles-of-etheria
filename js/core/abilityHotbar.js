// Быстрый доступ: 5 активных слотов способностей (настройка + бой)
const ABILITY_QUICK_SLOT_COUNT = 5;

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
    const tmp = player.abilityQuickSlots[fromIdx];
    player.abilityQuickSlots[fromIdx] = player.abilityQuickSlots[toIdx];
    player.abilityQuickSlots[toIdx] = tmp;
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
    let slots = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        slots += '<button type="button" class="ability-hotbar__slot ability-hotbar__slot--sidebar' +
            (info ? ' ability-hotbar__slot--filled' : '') +
            '" data-slot="' + i + '" onclick="showAbilities()" title="' +
            (info ? escapeHotbarText(info.name) : 'Слот ' + (i + 1) + ' — настроить') + '">' +
            buildHotbarSlotInnerHtml(i, 'sidebar') + '</button>';
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
    let slots = '';
    for (let i = 0; i < ABILITY_QUICK_SLOT_COUNT; i++) {
        const info = getHotbarSlotMeta(i);
        slots += '<div class="ability-hotbar__slot ability-hotbar__slot--editor' +
            (info ? ' ability-hotbar__slot--filled' : '') +
            '" data-slot="' + i + '" data-drop-slot="' + i + '" tabindex="0" role="button" aria-label="Слот ' + (i + 1) + '">' +
            buildHotbarSlotInnerHtml(i, 'editor') +
            '<button type="button" class="ability-hotbar__clear" data-clear-slot="' + i + '" aria-label="Очистить слот ' + (i + 1) + '">×</button>' +
            '</div>';
    }
    return '<section class="ability-hotbar-editor" id="abilityHotbarEditor">' +
        '<div class="ability-hotbar-panel__head">' +
        '<h3 class="ability-hotbar-panel__title">⚡ Быстрый доступ</h3>' +
        '<span class="ability-hotbar-panel__hint">5 слотов для боя · перетащите или нажмите</span>' +
        '</div>' +
        '<div class="ability-hotbar ability-hotbar--editor" role="group">' + slots + '</div>' +
        '<p class="ability-hotbar-editor__help">Перетащите способность в слот. На телефоне: нажмите способность, затем слот. Кнопка «✨ Способности» в бою остаётся для полного списка.</p>' +
        '</section>';
}

function buildBattleAbilityHotbarHtml() {
    if (!player || !currentMonster) return '';
    ensureAbilityQuickSlots(player);
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
        btns += '<button type="button" class="ability-hotbar__btn' + (info ? ' ability-hotbar__btn--filled' : '') +
            extraClass + '" id="hotbarBtn' + i + '" data-hotbar-slot="' + i + '" ' + onclick +
            (disabled ? ' disabled' : '') + ' title="' + (info ? escapeHotbarText(info.name) : 'Пустой слот') + '">' +
            buildHotbarSlotInnerHtml(i, 'battle') + '</button>';
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
        if (info) btn.title = info.name;
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
        btn.title = info ? info.name : 'Слот ' + (i + 1) + ' — настроить';
        btn.innerHTML = buildHotbarSlotInnerHtml(i, 'sidebar');
        bar.appendChild(btn);
    }
}

function refreshAbilityHotbarEditor() {
    const editor = document.getElementById('abilityHotbarEditor');
    if (!editor) return;
    const parent = editor.parentElement;
    const next = editor.nextElementSibling;
    editor.outerHTML = buildAbilityHotbarEditorHtml();
    const newEditor = document.getElementById('abilityHotbarEditor');
    if (newEditor) initAbilityHotbarEditor(newEditor);
    refreshAbilityHotbarSidebar();
}

let _hotbarPickName = null;

function initAbilityHotbarEditor(root) {
    if (!root) root = document.getElementById('abilityHotbarEditor');
    if (!root) return;

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
        slot.addEventListener('click', function () {
            if (_hotbarPickName) {
                setAbilityQuickSlot(idx, _hotbarPickName);
                _hotbarPickName = null;
                sources.forEach(s => s.classList.remove('ability-hotbar-source--picked'));
                refreshAbilityHotbarEditor();
                return;
            }
        });
        slot.setAttribute('draggable', 'true');
        slot.addEventListener('dragstart', function (e) {
            if (!player.abilityQuickSlots[idx]) {
                e.preventDefault();
                return;
            }
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
}

window.ABILITY_QUICK_SLOT_COUNT = ABILITY_QUICK_SLOT_COUNT;
window.ensureAbilityQuickSlots = ensureAbilityQuickSlots;
window.sanitizeAbilityQuickSlots = sanitizeAbilityQuickSlots;
window.buildSidebarAbilityQuickbarHtml = buildSidebarAbilityQuickbarHtml;
window.buildAbilityHotbarEditorHtml = buildAbilityHotbarEditorHtml;
window.buildBattleAbilityHotbarHtml = buildBattleAbilityHotbarHtml;
window.updateAbilityBattleHotbar = updateAbilityBattleHotbar;
window.useQuickAbility = useQuickAbility;
window.initAbilityHotbarEditor = initAbilityHotbarEditor;
window.refreshAbilityHotbarEditor = refreshAbilityHotbarEditor;
