const fs = require('fs');
const vm = require('vm');

const navSrc = fs.readFileSync('js/core/uiNavBack.js', 'utf8');
const hotbarSrc = fs.readFileSync('js/core/abilityHotbar.js', 'utf8');

const ctx = {
    console,
    player: { uiKeys: { back: 'Backspace' }, battleKeys: { attack: 'KeyA', dodge: 'KeyD', abilities: 'KeyE', continue: 'Enter' }, abilityQuickKeys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'], abilityQuickSlots: [null, null, null, null, null] },
    saveGame: () => {},
    addMessage: () => {},
    renderGame: () => { ctx._rendered = true; },
    showProfessions: () => { ctx._prof = true; },
    document: {
        body: { classList: { contains: () => false } },
        getElementById: () => null,
        addEventListener: () => {}
    },
    isBattleEngaged: () => false,
    isBattleNavigationBlocked: () => false
};
ctx.window = ctx;

vm.runInNewContext(navSrc + '\n' + hotbarSrc, ctx, { filename: 'ui-nav-test.js' });

function assert(c, m) { if (!c) throw new Error(m); }

ctx.ensureUiKeys(ctx.player);
assert(ctx.getUiKey('back') === 'Backspace', 'default back key');
assert(ctx.setUiKey('back', 'KeyB') === true, 'set back key');
assert(ctx.player.uiKeys.back === 'KeyB', 'back saved');

ctx.uiNavReset();
ctx.uiNavOnScreenOpen('renderGame', []);
ctx.uiNavOnScreenOpen('showProfessions', []);
assert(ctx.executeNavigateBack() === true, 'back to professions');
assert(ctx._prof === true, 'showProfessions invoked');
assert(ctx.getUiNavStackDepth() === 1, 'one level left');

ctx._rendered = false;
ctx.executeNavigateBack();
assert(ctx._rendered === true, 'back to renderGame');

const html = ctx.buildUiKeysSettingsHtml();
assert(html.indexOf('data-ui-bind="back"') !== -1, 'settings back bind');
assert(html.indexOf('Навигация') !== -1, 'nav settings section');

assert(ctx.setUiKey('back', 'KeyA') === true, 'bind back to KeyA');
ctx.sanitizeAllPlayerKeybinds();
assert(ctx.player.uiKeys.back === 'KeyA', 'ui back kept after sanitize');
assert(ctx.player.battleKeys.attack !== 'KeyA', 'attack moved from KeyA');

ctx.startUiKeyBind('back');
const bindEvent = {
    code: 'KeyG',
    target: { tagName: 'BUTTON', isContentEditable: false, closest: (sel) => (sel && sel.indexOf('settingsUiKeys') >= 0 ? {} : null) },
    preventDefault() {},
    stopPropagation() {},
    repeat: false
};
ctx.handleAbilityHotbarKeydown(bindEvent);
assert(ctx.player.uiKeys.back === 'KeyG', 'bind mode assigns KeyG');

console.log('test-ui-nav-back: OK');
