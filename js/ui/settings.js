/**
 * Настройки игры (шестерёнка у заголовка). Оформление — вкладка с RGB-кругами.
 */
function buildSettingsTabsHtml(activeTab) {
    const tabs = [
        { id: 'appearance', label: 'Оформление' },
        { id: 'game', label: 'Игра' },
        { id: 'mail', label: 'Почта' }
    ];
    return tabs.map(t =>
        '<button type="button" class="settings-tab' + (activeTab === t.id ? ' active' : '') +
        '" data-tab="' + t.id + '" onclick="showSettings(\'' + t.id + '\')">' + t.label + '</button>'
    ).join('');
}

function showSettings(activeTab) {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof cancelAllKeyBindModes === 'function') cancelAllKeyBindModes();
    if (typeof stopGathering === 'function') stopGathering();
    const el = document.getElementById('dynamicContent');
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const tab = activeTab || 'appearance';
    document.body.classList.add('settings-open');

    el.innerHTML =
        '<div class="settings-panel">' +
        '<div class="settings-panel-head">' +
        '<h2>Настройки</h2>' +
        '<button type="button" class="settings-close-btn" onclick="closeSettings()" aria-label="Закрыть">✕</button>' +
        '</div>' +
        '<nav class="settings-tabs" role="tablist">' + buildSettingsTabsHtml(tab) + '</nav>' +
        '<div class="settings-tab-body" id="settingsTabBody"></div>' +
        '</div>';

    const body = document.getElementById('settingsTabBody');
    if (tab === 'appearance') {
        body.innerHTML = '<section class="settings-section" id="settingsAppearance"></section>';
        if (typeof mountAppearanceEditor === 'function') {
            mountAppearanceEditor(document.getElementById('settingsAppearance'));
        }
    } else if (tab === 'mail') {
        if (typeof mountGiftMailTab === 'function') {
            mountGiftMailTab(body);
        } else {
            body.innerHTML = '<p class="theme-editor-desc">Модуль почты не загружен.</p>';
        }
    } else {
        body.innerHTML =
            (typeof buildUiKeysSettingsHtml === 'function' ? buildUiKeysSettingsHtml() : '') +
            (typeof buildBattleKeysSettingsHtml === 'function' ? buildBattleKeysSettingsHtml() : '') +
            '<section class="settings-section settings-section-game">' +
            '<p class="theme-editor-desc">Управление сохранением и персонажем.</p>' +
            '<div class="settings-game-actions">' +
            '<button type="button" class="action-btn" onclick="closeSettings();showSaveLoadPanel()">💾 Сохранения</button>' +
            '<button type="button" class="action-btn theme-btn-ghost" onclick="if(window.createNewCharacter) window.createNewCharacter()">🔄 Новый персонаж</button>' +
            '</div></section>';
        if (typeof sanitizeAllPlayerKeybinds === 'function') sanitizeAllPlayerKeybinds();
        if (typeof initUiKeysSettings === 'function') initUiKeysSettings();
        if (typeof initBattleKeysSettings === 'function') initBattleKeysSettings();
    }

    const gear = document.querySelector('.settings-gear-btn');
    if (gear) gear.classList.add('active');
}

function closeSettings() {
    document.body.classList.remove('settings-open');
    const gear = document.querySelector('.settings-gear-btn');
    if (gear) gear.classList.remove('active');
    const el = document.getElementById('dynamicContent');
    if (el) el.innerHTML = '';
}

window.showSettings = showSettings;
window.closeSettings = closeSettings;

// Совместимость со старыми вызовами
window.showThemeEditor = function () { showSettings('appearance'); };
