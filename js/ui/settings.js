/**
 * Настройки игры (шестерёнка у заголовка). Оформление — вкладка с RGB-кругами.
 */
function showSettings(activeTab) {
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
        '<nav class="settings-tabs" role="tablist">' +
        '<button type="button" class="settings-tab' + (tab === 'appearance' ? ' active' : '') + '" data-tab="appearance" onclick="showSettings(\'appearance\')">Оформление</button>' +
        '<button type="button" class="settings-tab' + (tab === 'game' ? ' active' : '') + '" data-tab="game" onclick="showSettings(\'game\')">Игра</button>' +
        '</nav>' +
        '<div class="settings-tab-body" id="settingsTabBody"></div>' +
        '</div>';

    const body = document.getElementById('settingsTabBody');
    if (tab === 'appearance') {
        body.innerHTML = '<section class="settings-section" id="settingsAppearance"></section>';
        if (typeof mountAppearanceEditor === 'function') {
            mountAppearanceEditor(document.getElementById('settingsAppearance'));
        }
    } else {
        body.innerHTML =
            (typeof buildBattleKeysSettingsHtml === 'function' ? buildBattleKeysSettingsHtml() : '') +
            '<section class="settings-section settings-section-game">' +
            '<p class="theme-editor-desc">Управление сохранением и персонажем.</p>' +
            '<div class="settings-game-actions">' +
            '<button type="button" class="action-btn" onclick="closeSettings();showSaveLoadPanel()">💾 Сохранения</button>' +
            '<button type="button" class="action-btn theme-btn-ghost" onclick="if(window.createNewCharacter) window.createNewCharacter()">🔄 Новый персонаж</button>' +
            '</div></section>';
        if (typeof initBattleKeysSettings === 'function') initBattleKeysSettings();
        if (typeof sanitizeBattleKeys === 'function') sanitizeBattleKeys();
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
