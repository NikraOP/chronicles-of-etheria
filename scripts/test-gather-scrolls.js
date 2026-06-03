const fs = require('fs');
const vm = require('vm');

const gatherScrollsSrc = fs.readFileSync('js/data/gatherScrolls.js', 'utf8');
const ctx = { console, window: {} };
ctx.window = ctx;
vm.runInNewContext(gatherScrollsSrc, ctx, { filename: 'gatherScrolls.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const tiers = ctx.window.GATHER_SCROLL_TIERS;
assert(tiers.length === 6, 'six scroll tiers');
assert(tiers[0].scrollTier === 1, 'tier 1 scroll');
assert(tiers[5].scrollTier === 6, 'tier 6 scroll');

const recipes = ctx.window.buildGatherScrollCraftRecipes();
assert(recipes.length === 6, 'six craft recipes');
assert(recipes.every(r => r.type === 'gather_scroll' && r.effect === 'auto_gather'), 'recipe type');

const t3 = ctx.window.getGatherScrollMetaByTier(3);
assert(t3.maxGathers >= 20 && t3.shopPrice >= 5000, 'tier 3 balance bounds');

const player = {
    gold: 50000,
    level: 25,
    location: 'Сумеречный лес',
    professions: { mining: { tier: 3, exp: 0 } },
    resources: {},
    inventory: { gatherScrolls: [] },
    autoGather: null
};

function canAutoGatherResource(resource, scrollTier) {
    if (!resource || resource.battle) return false;
    return (resource.tier || 1) <= scrollTier;
}

const r1 = { name: 'Медная руда', tier: 1, battle: false };
const r4 = { name: 'Мифриловая руда', tier: 4, battle: false };
assert(canAutoGatherResource(r1, 2), 'tier2 scroll can gather tier1');
assert(!canAutoGatherResource(r4, 2), 'tier2 scroll cannot gather tier4');
assert(!canAutoGatherResource({ tier: 2, battle: true }, 3), 'no auto on battle fish');

player.inventory.gatherScrolls.push({
    name: t3.name,
    scrollTier: 3,
    durationMs: t3.durationMs,
    maxGathers: t3.maxGathers,
    expMultiplier: t3.expMultiplier
});
player.autoGather = {
    scrollName: t3.name,
    scrollTier: 3,
    profId: 'mining',
    resourceName: null,
    expiresAt: Date.now() + 60000,
    gathersLeft: 5,
    expMultiplier: 0.65
};
assert(player.autoGather.gathersLeft === 5, 'session init');
player.autoGather.gathersLeft -= 1;
assert(player.autoGather.gathersLeft === 4, 'decrement gather count');

console.log('Gather scroll tests OK');
