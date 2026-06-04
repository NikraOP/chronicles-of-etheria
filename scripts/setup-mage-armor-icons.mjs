/**
 * Copy CC0 armor icons into png/armor/mage/ and print crafting.js img lines.
 * Sources: Idylwild's Armory (CC0), OpenGameArt flare_armor (CC0)
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, '_tmp_idylwild');
const outDir = join(root, 'png', 'armor', 'mage');

const MAP = [
    ['mage_armor_01.png', 'cloth_robe.png'],
    ['mage_armor_02.png', 'cloth_hood.png'],
    ['mage_armor_03.png', 'cloth_pants.png'],
    ['mage_armor_04.png', 'cloth_shoes.png'],
    ['mage_armor_05.png', 'leather_jacket.png'],
    ['mage_armor_06.png', 'leather_cap.png'],
    ['mage_armor_07.png', 'leather_pants.png'],
    ['mage_armor_08.png', 'leather_boots.png'],
    ['mage_armor_09.png', 'studded_jacket.png'],
    ['mage_armor_10.png', 'studded_helmet.png'],
    ['mage_armor_11.png', 'studded_pants.png'],
    ['mage_armor_12.png', 'studded_boots.png'],
    ['mage_armor_13.png', 'chainmail_jacket.png'],
    ['mage_armor_14.png', 'chainmail_coif.png'],
    ['mage_armor_15.png', 'chainmail_pants.png'],
    ['mage_armor_16.png', 'chainmail_boots.png'],
    ['mage_armor_17.png', 'cloak.png'],
    ['mage_armor_18.png', 'horned_helmet.png'], // overwritten by magic hat if present
    ['mage_armor_19.png', 'close_helmet.png'],
    ['mage_armor_20.png', 'platemail_helmet.png'],
    ['mage_armor_21.png', 'quilted_armor.png'],
    ['mage_armor_22.png', 'studded_jacket_alt.png'],
    ['mage_armor_23.png', 'leather_jacket_alt.png'],
    ['mage_armor_24.png', 'breastplate.png'],
    ['mage_armor_25.png', 'chainmail_alt.png'],
    ['mage_armor_26.png', 'platemail_pants.png'],
    ['mage_armor_27.png', 'greaves.png'],
    ['mage_armor_28.png', 'tile046.png'],
    ['mage_armor_29.png', 'tile047.png'],
    ['mage_armor_30.png', 'tile048.png'],
    ['mage_armor_31.png', 'tile049.png'],
    ['mage_armor_32.png', 'platemail.png']
];

const ITEMS = [
    'Хлопковая мантия',
    'Хлопковый капюшон',
    'Хлопковые штаны',
    'Хлопковые сапоги',
    'Шёлковая мантия',
    'Шёлковый капюшон',
    'Шёлковые штаны',
    'Шёлковые сапоги',
    'Мифриловое одеяние',
    'Мифриловый капюшон',
    'Мифриловые штаны',
    'Мифриловые сапоги',
    'Звёздное одеяние',
    'Звёздный капюшон',
    'Звёздные штаны',
    'Звёздные сапоги',
    'Капюшон звёздного пророка',
    'Диадема небесного чародея',
    'Венец манапотока',
    'Корона первозданной мудрости',
    'Мантия древнего архимага',
    'Одеяние звёздного суверена',
    'Роба божественного прорицания',
    'Мантия творца миров',
    'Штаны древнего мудреца',
    'Порты магического вознесения',
    'Штаны звёздного паломника',
    'Набедренники тайницы',
    'Сапоги лунного шага',
    'Тапочки эфирного странника',
    'Сапоги манавихря',
    'Тапочки созидателя'
];

mkdirSync(outDir, { recursive: true });

const hatSrc = join(root, '_tmp_magic_hat.png');

for (let i = 0; i < MAP.length; i++) {
    const [outName, srcName] = MAP[i];
    const from = join(srcDir, srcName);
    const to = join(outDir, outName);
    if (!existsSync(from)) throw new Error('missing source: ' + from);
    copyFileSync(from, to);
}

if (existsSync(hatSrc)) {
    copyFileSync(hatSrc, join(outDir, 'mage_armor_18.png'));
}

console.log('ok copied', MAP.length, 'icons to png/armor/mage/');
ITEMS.forEach((name, i) => {
    const n = String(i + 1).padStart(2, '0');
    console.log(name, '->', `png/armor/mage/mage_armor_${n}.png`);
});
