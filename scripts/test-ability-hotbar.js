const fs = require('fs');
const vm = require('vm');

const hotbarSrc = fs.readFileSync('js/core/abilityHotbar.js', 'utf8');
const abilitiesSrc = fs.readFileSync('js/data/abilities.js', 'utf8');

const ctx = {
    console,
    player: {
        name: 'Test',
        class: 'Маг',
        branch: 'Школа Льда',
        level: 50,
        mana: 100,
        maxMana: 100,
        abilities: [
            { name: 'Ледяная стрела', icon: '❄️', lvl: 1, passive: false, currentCooldown: 0, mana: 18 },
            { name: 'Ледяной щит', icon: '🛡️', lvl: 10, passive: false, currentCooldown: 2, mana: 25 },
            { name: 'Пассивка', icon: '✨', lvl: 1, passive: true, currentCooldown: 0 }
        ],
        abilityQuickSlots: [null, null, null, null, null],
        abilityQuickKeys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
        battleKeys: { attack: 'KeyA', dodge: 'KeyD', abilities: 'KeyE', continue: 'Enter' }
    },
    currentMonster: { name: 'Slime', health: 10, maxHealth: 10 },
    isPlayerTurn: true,
    ABILITIES_DB: null,
    saveGame: () => {},
    addMessage: () => {},
    addBattleLog: () => {},
    useBattleAbility: (idx) => { ctx._lastBattleIdx = idx; }
};
ctx.window = ctx;

vm.runInNewContext(abilitiesSrc, ctx, { filename: 'abilities.js' });
vm.runInNewContext(hotbarSrc, ctx, { filename: 'abilityHotbar.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

ctx.ensureAbilityQuickSlots(ctx.player);
ctx.ensureAbilityQuickKeys(ctx.player);
assert(ctx.player.abilityQuickSlots.length === 5, '5 slots');
assert(ctx.player.abilityQuickKeys.length === 5, '5 key binds');
assert(ctx.formatAbilityKeyLabel('Digit1') === '1', 'key label digit');
assert(ctx.formatAbilityKeyLabel('KeyQ') === 'Q', 'key label letter');

assert(ctx.setAbilityQuickSlot(0, 'Пассивка') === false, 'passive rejected');
assert(ctx.setAbilityQuickSlot(0, 'Ледяная стрела') === true, 'assign slot 0');
assert(ctx.player.abilityQuickSlots[0] === 'Ледяная стрела', 'slot 0 saved');

ctx.setAbilityQuickSlot(1, 'Ледяная стрела');
assert(ctx.player.abilityQuickSlots[0] === null, 'duplicate clears old slot');
assert(ctx.player.abilityQuickSlots[1] === 'Ледяная стрела', 'slot 1 has ability');

const html = ctx.buildBattleAbilityHotbarHtml();
assert(html.indexOf('ability-hotbar--battle') !== -1, 'battle bar html');
assert(html.indexOf('hotbarBtn1') !== -1, 'battle button id');

ctx.useQuickAbility(1);
assert(ctx._lastBattleIdx === 0, 'useQuickAbility calls useBattleAbility');

ctx.sanitizeAbilityQuickSlots();
assert(ctx.player.abilityQuickSlots[1] === 'Ледяная стрела', 'sanitize keeps valid slot');

ctx.setAbilityQuickKey(2, 'KeyQ');
assert(ctx.player.abilityQuickKeys[2] === 'KeyQ', 'assign key slot 2');
ctx.setAbilityQuickKey(3, 'KeyQ');
assert(ctx.player.abilityQuickKeys[2] === 'Digit3', 'duplicate key resets other to default');
assert(ctx.player.abilityQuickKeys[3] === 'KeyQ', 'duplicate key on new slot');
assert(ctx.findAbilityHotbarSlotByKeyCode('KeyQ') === 3, 'find slot by key');

const editorHtml = ctx.buildAbilityHotbarEditorHtml();
assert(editorHtml.indexOf('ability-hotbar__bind') !== -1, 'editor has bind buttons');
assert(editorHtml.indexOf('data-bind-slot="0"') !== -1, 'bind slot 0');

ctx.ensureBattleKeys(ctx.player);
ctx.setBattleKey('attack', 'KeyQ');
assert(ctx.player.battleKeys.attack === 'KeyQ', 'battle attack key');
ctx.setBattleKey('dodge', 'KeyQ');
assert(ctx.player.battleKeys.attack === 'KeyA', 'duplicate battle key resets attack default');
assert(ctx.player.battleKeys.dodge === 'KeyQ', 'dodge gets KeyQ');

const settingsHtml = ctx.buildBattleKeysSettingsHtml();
assert(settingsHtml.indexOf('data-battle-bind="attack"') !== -1, 'settings attack bind');
assert(settingsHtml.indexOf('data-battle-bind="abilities"') !== -1, 'settings abilities bind');
assert(settingsHtml.indexOf('data-battle-bind="continue"') !== -1, 'settings continue bind');
assert(ctx.getBattleKey('continue') === 'Enter', 'default continue key');

ctx.document = {
    querySelector(sel) {
        return sel === '.battle-wrapper' ? {} : null;
    }
};
ctx._battleAbilitiesMenuOpen = true;
let escClosed = false;
ctx.closeBattleAbilitiesMenu = () => {
    escClosed = true;
    ctx._battleAbilitiesMenuOpen = false;
};
const escEvent = {
    code: 'Escape',
    target: { tagName: 'DIV', isContentEditable: false, closest: () => null },
    preventDefault() {},
    repeat: false
};
ctx.handleAbilityHotbarKeydown(escEvent);
assert(escClosed, 'Escape closes battle abilities menu');
assert(!ctx._battleAbilitiesMenuOpen, 'menu flag cleared');

ctx._battleEndModalOpen = true;
ctx.modalCallback = () => { ctx._modalClosed = true; };
ctx.document.getElementById = (id) => {
    if (id === 'modalOverlay') return { style: { display: 'flex' } };
    return null;
};
ctx.closeModal = () => {
    ctx._battleEndModalOpen = false;
    if (ctx.modalCallback) {
        ctx.modalCallback();
        ctx.modalCallback = null;
    }
};
assert(ctx.tryCloseBattleEndModalByKey('Enter') === true, 'Enter closes battle end modal');
assert(ctx._modalClosed, 'modal callback ran');

console.log('test-ability-hotbar: OK');
