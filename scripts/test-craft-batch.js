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
    document: { getElementById: () => null },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {}
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
ctx.startCraftProgress('jewelry', 'Медное кольцо', null);
assert(ctx.player.resources['Медная руда'] === 97, 'consumed 3 ore after craft');
assert(ctx.player.inventory.rings.length === 1, 'one ring created');
assert(ctx.player.professions.jewelry.exp === 30, '30 exp');
assert(!ctx.pendingCraftData, 'pending cleared after craft');

console.log('test-craft-batch: OK');
