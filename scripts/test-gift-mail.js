const fs = require('fs');
const vm = require('vm');

const giftSrc = fs.readFileSync('js/core/giftMail.js', 'utf8');
const ctx = {
    console,
    player: {
        name: 'Sender',
        gold: 500,
        inventory: {
            weapons: [{ name: 'Test Sword', rarity: 'Обычный', dmg: 5 }],
            helmets: [], chests: [], pants: [], boots: [],
            rings: [], necklaces: [], stones: [],
            potions: [], foods: [], elixirs: [], scrolls: [], gatherScrolls: []
        },
        equipment: { weapon: null, helmet: null, chest: null, pants: null, boots: null, ring: null, necklace: null },
        redeemedGiftIds: []
    },
    localStorage: {
        _d: {},
        getItem(k) { return this._d[k] || null; },
        setItem(k, v) { this._d[k] = v; }
    },
    saveGame: () => {},
    addMessage: () => {},
    renderGame: () => {},
    resetBaseStats: () => {}
};
ctx.window = ctx;

vm.runInNewContext(giftSrc, ctx, { filename: 'giftMail.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

ctx._giftDraftGold = 100;
ctx._giftDraftSelected = { weapons: { 0: true } };

const gift = ctx.buildGiftPayloadFromDraft();
assert(gift.kind === 'etheria_gift', 'gift kind');
assert(gift.consumed === false, 'not consumed');
assert(gift.payload.gold === 100, 'gold packed');
assert(gift.payload.items.length === 1, 'one item');
assert(ctx.player.gold === 400, 'gold deducted');
assert(ctx.player.inventory.weapons.length === 0, 'item removed');

assert(ctx.validateGiftObject(gift) === null, 'valid gift');

const consumedBefore = ctx.isGiftIdConsumed(gift.id);
assert(!consumedBefore, 'not consumed yet');

ctx.grantGiftPayload(gift.payload);
ctx.markGiftConsumed(gift.id);
assert(ctx.isGiftIdConsumed(gift.id), 'marked consumed');
assert(ctx.validateGiftObject(gift).indexOf('уже получен') !== -1, 'id consumed blocks reuse');
assert(ctx.validateGiftObject({ ...gift, consumed: true }) === 'Подарок уже был распакован.', 'consumed flag');

const used = ctx.buildConsumedGiftJson(gift);
assert(used.consumed === true, 'used json');
assert(used.payload.items.length === 0, 'items cleared');

console.log('test-gift-mail: OK');
