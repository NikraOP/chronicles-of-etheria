/**
 * Иконки предметов: PNG в поле img (путь от корня сайта, напр. assets/items/steel-sword.png).
 * Если img пустой — показывается emoji из icon.
 */
const ITEM_IMG_REGISTRY = {};

function registerItemDef(def) {
    if (!def || !def.name) return;
    const existing = ITEM_IMG_REGISTRY[def.name];
    if (!existing) {
        ITEM_IMG_REGISTRY[def.name] = { icon: def.icon || '📦', img: def.img || '' };
        return;
    }
    if (def.icon && !existing.icon) existing.icon = def.icon;
    if (def.img && (!existing.img || existing.img.length < def.img.length)) existing.img = def.img;
}

function buildItemImgRegistry() {
    if (typeof EQUIPMENT_DB !== 'undefined') {
        if (EQUIPMENT_DB.weapons) {
            Object.keys(EQUIPMENT_DB.weapons).forEach(function (cls) {
                (EQUIPMENT_DB.weapons[cls] || []).forEach(registerItemDef);
            });
        }
        if (EQUIPMENT_DB.armor) {
            Object.keys(EQUIPMENT_DB.armor).forEach(function (slot) {
                (EQUIPMENT_DB.armor[slot] || []).forEach(registerItemDef);
            });
        }
    }
    if (typeof CRAFTING_RECIPES !== 'undefined') {
        Object.keys(CRAFTING_RECIPES).forEach(function (profId) {
            const prof = CRAFTING_RECIPES[profId];
            if (!prof || typeof prof !== 'object') return;
            Object.keys(prof).forEach(function (cat) {
                const list = prof[cat];
                if (Array.isArray(list)) list.forEach(registerItemDef);
            });
        });
    }
    if (typeof RESOURCES_DB !== 'undefined') {
        Object.keys(RESOURCES_DB).forEach(function (profId) {
            (RESOURCES_DB[profId] || []).forEach(registerItemDef);
        });
    }
}

function findResourceDefByName(name) {
    if (!name || typeof RESOURCES_DB === 'undefined') return null;
    for (const profId in RESOURCES_DB) {
        const list = RESOURCES_DB[profId];
        if (!Array.isArray(list)) continue;
        const found = list.find(function (r) { return r.name === name; });
        if (found) return found;
    }
    return null;
}

function resolveItemImg(itemOrName) {
    if (!itemOrName) return '';
    if (typeof itemOrName === 'string') {
        const reg = ITEM_IMG_REGISTRY[itemOrName];
        if (reg && reg.img) return reg.img;
        const res = findResourceDefByName(itemOrName);
        return (res && res.img) ? res.img : '';
    }
    const direct = itemOrName.img && String(itemOrName.img).trim();
    if (direct) return direct;
    if (itemOrName.name && ITEM_IMG_REGISTRY[itemOrName.name]) {
        return ITEM_IMG_REGISTRY[itemOrName.name].img || '';
    }
    return '';
}

function resolveItemIcon(itemOrName, fallback) {
    fallback = fallback || '📦';
    if (!itemOrName) return fallback;
    if (typeof itemOrName === 'string') {
        const reg = ITEM_IMG_REGISTRY[itemOrName];
        if (reg && reg.icon) return reg.icon;
        const res = findResourceDefByName(itemOrName);
        return (res && res.icon) ? res.icon : fallback;
    }
    if (itemOrName.icon) return itemOrName.icon;
    if (itemOrName.name && ITEM_IMG_REGISTRY[itemOrName.name]) {
        return ITEM_IMG_REGISTRY[itemOrName.name].icon || fallback;
    }
    return fallback;
}

/** Поля icon/img для копирования в инвентарь при покупке/крафте */
function pickItemVisualFields(source) {
    if (!source) return { icon: '📦', img: '' };
    const directImg = source.img && String(source.img).trim();
    const regImg = resolveItemImg(source);
    return {
        icon: source.icon || resolveItemIcon(source, '📦'),
        img: directImg || regImg || ''
    };
}

/** Объект предмета с icon/img из реестра (магазин, продажа) */
function enrichItemForDisplay(item) {
    if (!item) return { icon: '📦', img: '' };
    const visuals = pickItemVisualFields(item);
    return Object.assign({}, item, visuals);
}

/**
 * HTML блока иконки предмета.
 * @param {object|string} item — предмет или имя ресурса
 * @param {{ size?: number, fallback?: string, className?: string }} options
 */
function renderItemIconHTML(item, options) {
    options = options || {};
    const size = options.size || 40;
    const fallback = resolveItemIcon(item, options.fallback || '📦');
    const extraClass = options.className || 'item-icon';
    const imgSrc = resolveItemImg(item);
    const style = 'width:' + size + 'px;height:' + size + 'px';

    if (imgSrc) {
        const resolvedSrc = typeof resolveGameAssetUrl === 'function' ? resolveGameAssetUrl(imgSrc) : imgSrc;
        const escFb = String(fallback).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return '<div class="' + extraClass + '" style="' + style + '">' +
            '<img src="' + resolvedSrc + '" alt="" class="item-icon-img" ' +
            'onerror="this.onerror=null;this.remove();var p=this.parentElement;p.classList.add(\'item-icon--emoji\');p.textContent=\'' + escFb + '\';">' +
            '</div>';
    }
    const fontSize = Math.max(14, Math.round(size * 0.52));
    return '<div class="' + extraClass + ' item-icon--emoji" style="' + style + ';font-size:' + fontSize + 'px">' + fallback + '</div>';
}

/** Подтянуть img/icon из БД в предметы старых сейвов */
function syncInventoryItemVisuals(pl) {
    if (!pl) return;
    function applyDef(item) {
        if (!item || !item.name) return;
        const reg = ITEM_IMG_REGISTRY[item.name];
        if (!reg) return;
        if (reg.img) item.img = reg.img;
        if (reg.icon) item.icon = reg.icon;
    }
    if (pl.inventory) {
        ['weapons', 'helmets', 'chests', 'pants', 'boots', 'potions', 'foods', 'elixirs', 'scrolls', 'stones', 'rings', 'necklaces'].forEach(function (key) {
            const arr = pl.inventory[key];
            if (Array.isArray(arr)) arr.forEach(applyDef);
        });
    }
    if (pl.equipment) {
        ['weapon', 'helmet', 'chest', 'pants', 'boots', 'ring', 'necklace'].forEach(function (slot) {
            applyDef(pl.equipment[slot]);
        });
    }
}

function ensureEquipmentScreenVisuals() {
    if (!player) return;
    if (typeof buildItemImgRegistry === 'function') buildItemImgRegistry();
    if (typeof syncInventoryItemVisuals === 'function') syncInventoryItemVisuals(player);
}

buildItemImgRegistry();

window.ITEM_IMG_REGISTRY = ITEM_IMG_REGISTRY;
window.syncInventoryItemVisuals = syncInventoryItemVisuals;
window.buildItemImgRegistry = buildItemImgRegistry;
window.resolveItemImg = resolveItemImg;
window.resolveItemIcon = resolveItemIcon;
window.pickItemVisualFields = pickItemVisualFields;
window.enrichItemForDisplay = enrichItemForDisplay;
window.renderItemIconHTML = renderItemIconHTML;
window.ensureEquipmentScreenVisuals = ensureEquipmentScreenVisuals;
window.findResourceDefByName = findResourceDefByName;
