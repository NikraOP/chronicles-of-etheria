const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('js/core/craftingSystem.js', 'utf8');
const ctx = {
    console,
    player: {
        class: 'Воин',
        location: 'Сумеречный лес',
        resources: { 'Медная руда': 100 },
        professions: { jewelry: { tier: 5, exp: 0 } },
        inventory: { rings: [], weapons: [] }
    },
    pendingCraftData: null,
    addMessage: () => {},
    pickItemVisualFields: r => ({ icon: r.icon || '💍', img: '' }),
    getItemSellPrice: () => 10,
    stopGathering: () => {},
    saveGame: () => {},
    showCraftingRecipes: () => {},
    document: { getElementById: () => null }
};
ctx.window = ctx;
ctx.CRAFTING_RECIPES = {
    jewelry: {
        rings: [{ name: 'Медное кольцо', tier: 1, type: 'ring', resources: { 'Медная руда': 3 }, exp: 30, dmg: 4 }]
    }
};
ctx.PROFESSIONS_DB = { gathering: [], crafting: [{ id: 'jewelry' }] };
ctx.RESOURCES_DB = {};
vm.runInNewContext(src, ctx, { filename: 'craftingSystem.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const recipe = ctx.CRAFTING_RECIPES.jewelry.rings[0];
assert(ctx.getMaxCraftCount(recipe, 'jewelry') === 33, 'max 33 crafts');
ctx.prepareCraft('jewelry', 'Медное кольцо', 5);
assert(ctx.player.resources['Медная руда'] === 85, 'consumed 15 ore');
assert(ctx.player.inventory.rings.length === 5, 'five rings created');
assert(ctx.player.professions.jewelry.exp === 150, '5x30 exp');
assert(!ctx.pendingCraftData, 'pending cleared after auto-claim');

console.log('test-craft-batch: OK');
