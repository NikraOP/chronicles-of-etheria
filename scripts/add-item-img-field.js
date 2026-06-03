/**
 * One-off: adds img:'' after icon:'…' in item data files (skips if ,img: already present).
 * Run: node scripts/add-item-img-field.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
    'js/data/equipment.js',
    'js/data/resources.js',
    'js/data/crafting.js'
];

function addImgFields(content) {
    return content.replace(/icon:'([^']*)'(?!,img:)/g, "icon:'$1',img:''");
}

for (const rel of files) {
    const filePath = path.join(root, rel);
    const before = fs.readFileSync(filePath, 'utf8');
    const after = addImgFields(before);
    const count = (after.match(/img:''/g) || []).length - (before.match(/img:''/g) || []).length;
    if (after !== before) {
        fs.writeFileSync(filePath, after, 'utf8');
        console.log(rel + ': added img to ' + count + ' entries');
    } else {
        console.log(rel + ': no changes');
    }
}
