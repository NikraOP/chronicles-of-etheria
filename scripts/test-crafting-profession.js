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

console.log('Crafting profession tests OK');
