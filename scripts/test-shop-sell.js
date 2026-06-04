const fs = require('fs');
const vm = require('vm');

const shopSrc = fs.readFileSync('js/core/shop.js', 'utf8');
const pricesSrc = fs.readFileSync('js/data/itemPrices.js', 'utf8');
const ctx = {
    console,
    player: {
        gold: 100,
        class: 'Воин',
        level: 10,
        equipment: { ring: null, necklace: null, weapon: null },
        inventory: {
            rings: [{ name: 'Медное кольцо', rarity: 'Обычный', dmg: 4 }],
            necklaces: [{ name: 'Медный амулет', rarity: 'Обычный', def: 4 }],
            gatherScrolls: [{ name: 'Свиток добычи I', type: 'gather_scroll', scrollTier: 1, maxGathers: 10 }],
            weapons: [],
            helmets: [], chests: [], pants: [], boots: [],
            potions: [], foods: [], elixirs: [], scrolls: [], stones: []
        },
        resources: {}
    },
    addMessage: () => {},
    saveGame: () => {},
    renderGame: () => {},
    EQUIPMENT_DB: { weapons: { Воин: [] }, armor: { helmet: [], chest: [], pants: [], boots: [] } },
    document: { getElementById: () => ({ innerHTML: '' }) }
};
ctx.window = ctx;
vm.runInNewContext(pricesSrc, ctx, { filename: 'itemPrices.js' });
vm.runInNewContext(shopSrc, ctx, { filename: 'shop.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const items = ctx.collectSellableInventoryItems();
const types = items.map(i => i.type);
assert(types.includes('ring'), 'rings sellable');
assert(types.includes('necklace'), 'necklaces sellable');
assert(types.includes('gather_scroll'), 'gather scrolls sellable');
assert(ctx.resolveItemSellPrice({ name: 'Медное кольцо' }) === 15, 'ring price from itemPrices');
assert(ctx.resolveItemSellPrice({ name: 'Амулет бездны Бруйна' }) === 900, 'amulet price from itemPrices');

const html = ctx.buildShopSellItemCardHtml(items[0], 15);
assert(html.indexOf('shop-item-card') !== -1, 'sell card uses shop classes');

console.log('test-shop-sell: OK');
