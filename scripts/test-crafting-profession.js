const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync('js/core/craftingSystem.js', 'utf8');
const ctx = {
    console,
    player: {
        class: 'Маг',
        resources: { 'Звёздный шёлк': 10, 'Мифриловая нить': 6, 'Звездная пыльца': 4 },
        professions: { tailoring: { tier: '5', exp: '4850' } },
        inventory: {}
    },
    pendingCraftData: null,
    addMessage: () => {}
};
ctx.window = ctx;
ctx.CRAFTING_RECIPES = { tailoring: { weapons: [] } };
ctx.PROFESSIONS_DB = {
    gathering: [{ id: 'mining', learnMinLevel: 1 }],
    crafting: [{ id: 'jewelry', learnMinLevel: 12, relatedGathering: ['mining'] }]
};
ctx.RESOURCES_DB = {
    mining: [
        { name: 'Медная руда', tier: 1, locations: ['Сумеречный лес'] },
        { name: 'Железная руда', tier: 2, locations: ['Сумеречный лес'] }
    ]
};
ctx.player.location = 'Сумеречный лес';
ctx.player.level = 5;
vm.runInNewContext(src, ctx, { filename: 'craftingSystem.js' });

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

ctx.normalizeProfessionProf(ctx.player.professions.tailoring);
assert(ctx.player.professions.tailoring.tier === 5, 'tier parsed as number 5');
assert(ctx.player.professions.tailoring.exp === 4850, 'exp parsed as number');

const starRobe = {
    name: 'Звёздное одеяние',
    tier: 6,
    class: 'Маг',
    resources: { 'Звёздный шёлк': 8, 'Мифриловая нить': 5, 'Звездная пыльца': 3 }
};
const block6 = ctx.getCraftBlockReason(starRobe, 'tailoring');
assert(block6.indexOf('6') !== -1, 'tier 6 item blocked at prof tier 5');

const staff = {
    name: 'Жезл вечности',
    tier: 5,
    class: 'Маг',
    resources: { 'Адамантит': 8, 'Алмаз': 5, 'Звёздный шёлк': 5, 'Звездная пыльца': 5 }
};
ctx.player.resources['Адамантит'] = 10;
ctx.player.resources['Алмаз'] = 6;
ctx.player.resources['Звездная пыльца'] = 6;
const block5 = ctx.getCraftBlockReason(staff, 'tailoring');
assert(block5 === '', 'tier 5 staff craftable with resources');

ctx.player.professions.tailoring.exp = 5000;
assert(ctx.applyProfessionTierUps(ctx.player.professions.tailoring), 'auto tier up at 5000 exp');
assert(ctx.player.professions.tailoring.tier === 6, 'becomes tier 6');
assert(ctx.getCraftBlockReason(starRobe, 'tailoring') === '', 'tier 6 craft after level up');

const ancient = { name: 'X', tier: 5, rarity: 'Древний', class: 'Маг', resources: {} };
const normAncient = ctx.normalizeRecipeForCraft(ancient);
assert(normAncient.tier === 6, 'ancient rarity forces tier 6 recipe');

assert(ctx.getCraftRarityColor('Древний') === '#e67e22', 'ancient color');
assert(ctx.getCraftRarityColor('Божественный') === '#1abc9c', 'divine color');

assert(ctx.getProfessionLearnBlockReason('jewelry').indexOf('12') !== -1, 'jewelry blocked below lvl 12');
ctx.player.level = 12;
assert(ctx.getProfessionLearnBlockReason('jewelry') === '', 'jewelry learnable at 12');

const atLoc = ctx.getResourcesAtLocationForProfession('mining');
assert(atLoc.includes('Медная руда'), 'tier1 ore at location');
assert(!atLoc.includes('Железная руда'), 'tier2 ore hidden at prof tier 1');
ctx.player.professions.mining = { tier: 2, exp: 0 };
assert(ctx.getResourcesAtLocationForProfession('mining').includes('Железная руда'), 'tier2 ore at prof tier 2');

console.log('Crafting profession tests OK');
