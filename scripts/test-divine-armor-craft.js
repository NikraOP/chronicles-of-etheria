const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

const craftingSrc = fs.readFileSync('js/data/crafting.js', 'utf8');
const equipmentSrc = fs.readFileSync('js/data/equipment.js', 'utf8');
const craftSystemSrc = fs.readFileSync('js/core/craftingSystem.js', 'utf8');

// Parse recipe names from crafting (simple regex)
const divineArmorNames = [
    'Капюшон звёздного пророка',
    'Мантия творца миров',
    'Кираса древнего охотника',
    'Броня перворожденного лучника',
    'Корона первозданной мудрости',
    'Набедренники древнего ветра'
];

for (const name of divineArmorNames) {
    assert(craftingSrc.includes("name:'" + name + "'"), 'recipe exists: ' + name);
    const line = craftingSrc.split('\n').find(l => l.includes("name:'" + name + "'"));
    assert(line && (line.includes("rarity:'Древний'") || line.includes("rarity:'Божественный'")), 'ancient/divine rarity: ' + name);
    assert(line && line.includes("tier:6"), 'tier 6: ' + name);
}

// Not in shop (active entries only — lines starting with {name:)
const activeShopLines = equipmentSrc.split('\n').filter(l => /^\s*\{name:/.test(l));
const shopNames = activeShopLines.map(l => {
    const m = l.match(/name:'([^']+)'/);
    return m ? m[1] : '';
}).filter(Boolean);

for (const name of divineArmorNames) {
    assert(!shopNames.includes(name), 'not in shop buy list: ' + name);
}

// Warrior divine still craft-only in shop check
assert(!shopNames.includes('Панцирь божества'), 'warrior divine chest not in shop');

const ctx = {
    console,
    player: {
        class: 'Маг',
        resources: {
            'Орихалк': 20,
            'Звёздный шёлк': 15,
            'Звездный камень': 10,
            'Камень душ': 8,
            'Адамантит': 10,
            'Звездная пыльца': 8
        },
        professions: { tailoring: { tier: 6, exp: 0 } },
        inventory: { chests: [] }
    },
    pendingCraftData: null,
    addMessage: () => {},
    CRAFTING_RECIPES: null,
    PROFESSIONS_DB: { gathering: [], crafting: [{ id: 'tailoring' }] }
};
const CRAFTING_RECIPES = new Function(craftingSrc + '\nreturn CRAFTING_RECIPES;')();
ctx.CRAFTING_RECIPES = CRAFTING_RECIPES;
ctx.window = ctx;
vm.runInNewContext(craftSystemSrc, ctx, { filename: 'craftingSystem.js' });

const recipe = ctx.getAllRecipesForProfession('tailoring').find(r => r.name === 'Мантия творца миров');
assert(recipe, 'mage divine chest recipe found');
assert(ctx.getCraftBlockReason(recipe, 'tailoring') === '', 'craftable at tier 6 with resources');
assert(recipe.rarity === 'Божественный' || recipe.tier === 6, 'divine or tier6 after normalize');

const archerChest = ctx.getAllRecipesForProfession('leatherworking').find(r => r.name === 'Броня перворожденного лучника');
assert(archerChest && archerChest.class === 'Лучник', 'archer divine chest class lock');

console.log('test-divine-armor-craft: OK');
