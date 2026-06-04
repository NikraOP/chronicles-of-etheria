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
        { name: 'Медная руда', tier: 1, exp: 15, time: 3, locations: ['Сумеречный лес'] },
        { name: 'Железная руда', tier: 2, exp: 35, time: 5, locations: ['Сумеречный лес'] }
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

assert(ctx.getProfessionLearnBlockReason('jewelry') === '', 'any profession learnable without level gate');
ctx.player.professions.jewelry = { tier: 1, exp: 0 };
assert(ctx.getProfessionLearnBlockReason('jewelry').indexOf('изучена') !== -1, 'already learned blocked');
delete ctx.player.professions.jewelry;

const atLoc = ctx.getResourcesAtLocationForProfession('mining');
assert(atLoc.includes('Медная руда'), 'tier1 ore at location');
assert(!atLoc.includes('Железная руда'), 'tier2 ore hidden at prof tier 1');
ctx.player.professions.mining = { tier: 2, exp: 0 };
assert(ctx.getResourcesAtLocationForProfession('mining').includes('Железная руда'), 'tier2 ore at prof tier 2');

const defs = ctx.getGatherableResourceDefsAtLocation('mining');
assert(defs.length >= 1 && defs[0].name, 'gather defs return objects with name');
assert(ctx.getGatherableResourceDefsAtLocation('mining').every(d => d.tier <= 2), 'defs respect prof tier');

const iconsHtml = ctx.renderGatherProfessionIconsHtml('mining');
assert(iconsHtml.indexOf('prof-resource-tooltip') !== -1, 'tooltip markup in profession icons');
assert(iconsHtml.indexOf('XP') !== -1, 'tooltip shows exp');
assert(iconsHtml.indexOf('Тир') !== -1, 'tooltip shows tier');
const adjExp = ctx.getAdjustedGatherExpForResource(defs[0], 'mining');
assert(adjExp >= 15, 'adjusted exp includes profession bonus at tier 2');
assert(iconsHtml.indexOf('+') !== -1 && iconsHtml.indexOf('XP') !== -1, 'tooltip shows exp line');

ctx.player.resources = { 'Медная руда': 20 };
const ringRecipe = { name: 'Медное кольцо', tier: 1, resources: { 'Медная руда': 3 } };
ctx.player.professions.jewelry = { tier: 3, exp: 0 };
assert(ctx.getMaxCraftCount(ringRecipe, 'jewelry') === 6, 'max craft from materials');
assert(ctx.getCraftBlockReason(ringRecipe, 'jewelry', 7).indexOf('хватает') !== -1, 'batch over max blocked');
const scaled = ctx.scaleRecipeMaterials(ringRecipe.resources, 3);
assert(scaled['Медная руда'] === 9, 'scale materials x3');

const potion = { name: 'Зелье', type: 'potion', effect: 'heal', value: 144 };
assert(ctx.getCraftRecipeEffectText(potion).indexOf('144') !== -1, 'heal potion tooltip');
assert(ctx.getCraftRecipeCombatStatsText({ dmg: 10, def: 5 }).indexOf('⚔️') !== -1, 'combat stats');
const food = { type: 'food', effect: 'heal', value: 48 };
assert(ctx.getCraftRecipeEffectText(food).indexOf('HP') !== -1, 'food heal text');
assert(ctx.buildCraftRecipeTooltipHtml(potion).indexOf('prof-resource-tooltip') !== -1, 'tooltip html');

console.log('Crafting profession tests OK');
