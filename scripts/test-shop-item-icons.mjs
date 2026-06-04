/**
 * Магазин: те же PNG, что в крафте (по имени предмета).
 */
import fs from 'fs';
import vm from 'vm';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const ctx = { window: {} };
vm.createContext(ctx);

function loadExport(rel, exportNames) {
    const tail = exportNames.map((n) => `this.${n} = typeof ${n} !== 'undefined' ? ${n} : this.${n};`).join('\n');
    vm.runInContext(fs.readFileSync(root + '/' + rel, 'utf8') + '\n' + tail, ctx, { filename: rel });
}

loadExport('js/data/crafting.js', ['CRAFTING_RECIPES']);
loadExport('js/data/equipment.js', ['EQUIPMENT_DB']);
loadExport('js/ui/itemIcons.js', []);
ctx.enrichItemForDisplay = ctx.window.enrichItemForDisplay;
ctx.renderItemIconHTML = ctx.window.renderItemIconHTML;
ctx.buildItemImgRegistry = ctx.window.buildItemImgRegistry;

ctx.buildItemImgRegistry();

const shopItem = ctx.EQUIPMENT_DB.weapons['Маг'].find((i) => i.name === 'Дубовый посох');
const enriched = ctx.enrichItemForDisplay(shopItem);
const html = ctx.renderItemIconHTML(enriched, { size: 48 });

if (!enriched.img || !enriched.img.includes('mage_staff_1')) {
    console.error('FAIL: enrichItemForDisplay img', enriched.img);
    process.exit(1);
}
if (!html.includes('mage_staff_1.png')) {
    console.error('FAIL: renderItemIconHTML', html);
    process.exit(1);
}
console.log('OK shop mage weapon icon');
