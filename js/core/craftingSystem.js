// craftingSystem.js - Полная исправленная версия

function getExpForNextTier(currentTier) {
    const tier = parseInt(currentTier, 10) || 1;
    switch(tier) {
        case 1: return 500;
        case 2: return 1000;
        case 3: return 2000;
        case 4: return 3500;
        case 5: return 5000;
        default: return 0;
    }
}

function normalizeProfessionProf(prof) {
    if (!prof) return;
    let tier = parseInt(prof.tier, 10);
    if (!Number.isFinite(tier) || tier < 1) tier = 1;
    if (tier > 6) tier = 6;
    prof.tier = tier;
    prof.exp = Math.max(0, parseInt(prof.exp, 10) || 0);
}

function applyProfessionTierUps(prof) {
    if (!prof) return false;
    normalizeProfessionProf(prof);
    let leveledUp = false;
    let expNeeded = getExpForNextTier(prof.tier);
    while (prof.exp >= expNeeded && prof.tier < 6 && expNeeded > 0) {
        prof.exp -= expNeeded;
        prof.tier = Math.min(6, prof.tier + 1);
        expNeeded = getExpForNextTier(prof.tier);
        leveledUp = true;
    }
    if (prof.tier >= 6) {
        const cap = getExpForNextTier(5);
        prof.exp = Math.min(prof.exp, cap > 0 ? cap : prof.exp);
    }
    return leveledUp;
}

const CRAFT_RESOURCE_ALIASES = {
    'Звездный шелк': 'Звёздный шёлк',
    'Звездный шёлк': 'Звёздный шёлк',
    'Звездная пыльца': 'Звездная пыльца',
    'Мифриловая нить': 'Мифриловая нить'
};

function getCraftRarityColor(rarity) {
    const colors = {
        'Обычный': '#aaa',
        'Необычный': '#2ecc71',
        'Редкий': '#3498db',
        'Эпический': '#9b59b6',
        'Легендарный': '#f0c040',
        'Мифический': '#e74c3c',
        'Древний': '#e67e22',
        'Божественный': '#1abc9c'
    };
    return colors[rarity] || '#ccc';
}

function resolveCraftResourceKey(name) {
    return CRAFT_RESOURCE_ALIASES[name] || name;
}

function getPlayerResourceAmount(resourceName) {
    if (!player || !player.resources) return 0;
    const canonical = resolveCraftResourceKey(resourceName);
    let total = player.resources[canonical] || 0;
    if (player.resources[resourceName] && resourceName !== canonical) {
        total += player.resources[resourceName];
    }
    for (const alt in CRAFT_RESOURCE_ALIASES) {
        if (CRAFT_RESOURCE_ALIASES[alt] === canonical && alt !== resourceName) {
            total += player.resources[alt] || 0;
        }
    }
    return total;
}

function hasRecipeMaterials(recipe, craftCount) {
    const materials = recipe && (recipe.resources || recipe.materials);
    if (!materials) return true;
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    for (const mat in materials) {
        if (getPlayerResourceAmount(mat) < materials[mat] * count) return false;
    }
    return true;
}

function scaleRecipeMaterials(materials, craftCount) {
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    const scaled = {};
    for (const mat in materials) {
        scaled[mat] = materials[mat] * count;
    }
    return scaled;
}

const CRAFT_BATCH_MAX = 99;

function getCraftNonMaterialBlockReason(recipe, profId) {
    if (!recipe) return 'Рецепт не найден';
    const prof = player.professions[profId];
    if (!prof) return 'Профессия не изучена';
    normalizeProfessionProf(prof);
    const r = normalizeRecipeForCraft(recipe);
    const requiredTier = r.tier;
    const profTier = parseInt(prof.tier, 10) || 1;
    if (profTier < requiredTier) {
        const left = getExpForNextTier(profTier) - prof.exp;
        if (left > 0) return `Нужен ${requiredTier} тир (ещё ~${Math.ceil(left)} XP)`;
        return `Нужен ${requiredTier} тир профессии`;
    }
    const playerClass = (player.class || '').trim();
    const recipeClass = (r.class || '').trim();
    if (recipeClass && playerClass && recipeClass !== playerClass) {
        return `Только для класса ${recipeClass}`;
    }
    return '';
}

function getMaxCraftCount(recipe, profId) {
    const block = getCraftNonMaterialBlockReason(recipe, profId);
    if (block) return 0;
    const r = normalizeRecipeForCraft(recipe);
    const materials = r.resources || r.materials;
    if (!materials) return CRAFT_BATCH_MAX;
    let max = CRAFT_BATCH_MAX;
    for (const mat in materials) {
        const perCraft = materials[mat];
        if (perCraft <= 0) continue;
        max = Math.min(max, Math.floor(getPlayerResourceAmount(mat) / perCraft));
    }
    return Math.max(0, max);
}

function consumePlayerResources(materials) {
    if (!materials) return;
    for (const mat in materials) {
        let needed = materials[mat];
        const canonical = resolveCraftResourceKey(mat);
        const keys = [canonical, mat];
        for (const alt in CRAFT_RESOURCE_ALIASES) {
            if (CRAFT_RESOURCE_ALIASES[alt] === canonical) keys.push(alt);
        }
        const uniqueKeys = [...new Set(keys)];
        for (let i = 0; i < uniqueKeys.length && needed > 0; i++) {
            const k = uniqueKeys[i];
            const have = player.resources[k] || 0;
            if (have <= 0) continue;
            const take = Math.min(have, needed);
            player.resources[k] = have - take;
            needed -= take;
            if (player.resources[k] <= 0) delete player.resources[k];
        }
    }
}

function normalizeRecipeForCraft(recipe) {
    if (!recipe) return recipe;
    const r = { ...recipe };
    const tier = parseInt(r.tier, 10) || 1;
    if (r.rarity === 'Древний' || r.rarity === 'Божественный') {
        r.tier = 6;
    } else {
        r.tier = tier;
    }
    return r;
}

function findProfessionMeta(profId) {
    if (!PROFESSIONS_DB) return null;
    return PROFESSIONS_DB.gathering.find(p => p.id === profId)
        || PROFESSIONS_DB.crafting.find(p => p.id === profId)
        || null;
}

function getProfessionLearnBlockReason(profId) {
    if (player.professions[profId]) return 'Профессия уже изучена';
    return '';
}

/** Объекты ресурсов на текущей локации (добывающая профессия — свой RESOURCES_DB). */
function getGatherableResourceDefsAtLocation(profId) {
    const loc = String(player.location || '').trim();
    if (!loc) return [];
    const profState = player.professions[profId];
    const tier = profState ? (parseInt(profState.tier, 10) || 1) : 1;
    const list = RESOURCES_DB[profId] || [];
    const seen = new Set();
    const defs = [];
    for (const r of list) {
        if (!r || !r.name || seen.has(r.name)) continue;
        const resTier = parseInt(r.tier, 10) || 1;
        const locs = r.locations || [];
        if (locs.indexOf(loc) === -1 || tier < resTier) continue;
        seen.add(r.name);
        defs.push(r);
    }
    return defs.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

/** Ресурсы на текущей локации для профессии (с учётом тира профессии). */
function getResourcesAtLocationForProfession(profId) {
    const loc = String(player.location || '').trim();
    if (!loc) return [];
    if (RESOURCES_DB[profId]) {
        return getGatherableResourceDefsAtLocation(profId).map(r => r.name);
    }
    const meta = findProfessionMeta(profId);
    const profState = player.professions[profId];
    const tier = profState ? (parseInt(profState.tier, 10) || 1) : 1;
    const sourceIds = meta && meta.relatedGathering ? meta.relatedGathering : [];
    const names = [];
    const seen = new Set();
    for (const srcId of sourceIds) {
        const list = RESOURCES_DB[srcId] || [];
        for (const r of list) {
            if (!r || !r.name || seen.has(r.name)) continue;
            const resTier = parseInt(r.tier, 10) || 1;
            const locs = r.locations || [];
            if (locs.indexOf(loc) === -1 || tier < resTier) continue;
            seen.add(r.name);
            names.push(r.name);
        }
    }
    return names.sort((a, b) => a.localeCompare(b, 'ru'));
}

function renderGatherProfessionIconsHtml(profId) {
    const defs = getGatherableResourceDefsAtLocation(profId);
    if (!defs.length) {
        return '<div class="profession-resource-icons profession-resource-icons--empty" title="На этой локации нет ресурсов для вашего тира">' +
            '<span class="profession-resource-empty">∅</span></div>';
    }
    const maxShow = 8;
    let html = '<div class="profession-resource-icons">';
    for (let i = 0; i < Math.min(defs.length, maxShow); i++) {
        const r = defs[i];
        const tip = (r.name || '') + ' · T' + (r.tier || 1);
        html += '<div class="profession-resource-icon-chip" title="' + tip.replace(/"/g, '&quot;') + '">';
        html += typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(r, { size: 32, fallback: r.icon || '📦' })
            : '<span>' + (r.icon || '📦') + '</span>';
        html += '</div>';
    }
    if (defs.length > maxShow) {
        html += '<span class="prof-resource-more">+' + (defs.length - maxShow) + '</span>';
    }
    html += '</div>';
    return html;
}

function formatLocationResourcesHint(profId) {
    const list = getResourcesAtLocationForProfession(profId);
    const loc = player.location || '—';
    if (!list.length) {
        return `📍 ${loc}: нет ресурсов для этой профессии на вашем тире`;
    }
    const preview = list.slice(0, 6).join(', ');
    const more = list.length > 6 ? ` +${list.length - 6}` : '';
    return `📍 ${loc}: ${preview}${more}`;
}

function getCraftBlockReason(recipe, profId, craftCount) {
    const nonMat = getCraftNonMaterialBlockReason(recipe, profId);
    if (nonMat) return nonMat;
    const r = normalizeRecipeForCraft(recipe);
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    const materials = r.resources || r.materials;
    if (materials) {
        for (const mat in materials) {
            const needed = materials[mat] * count;
            const has = getPlayerResourceAmount(mat);
            if (has < needed) {
                return count > 1
                    ? `Не хватает для ×${count}: ${mat} (${has}/${needed})`
                    : `Не хватает: ${mat} (${has}/${needed})`;
            }
        }
    }
    return '';
}

function decodeCraftBlockReason(raw) {
    if (!raw) return '';
    try {
        return decodeURIComponent(raw);
    } catch (e) {
        return raw;
    }
}

function bindCraftRecipeGrid(profId) {
    const root = document.getElementById('dynamicContent');
    if (!root) return;
    root.querySelectorAll('.craft-recipe-card').forEach(card => {
        if (card.dataset.craftBound === '1') return;
        card.dataset.craftBound = '1';
        card.addEventListener('click', () => {
            const reason = decodeCraftBlockReason(card.getAttribute('data-block-reason'));
            if (reason) {
                addMessage('❌ ' + reason, 'error');
                return;
            }
            const recipeName = decodeURIComponent(card.getAttribute('data-recipe-name') || '');
            if (!recipeName) return;
            const qtyInput = document.getElementById('craftBatchQty');
            let qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
            if (!Number.isFinite(qty) || qty < 1) qty = 1;
            prepareCraft(profId, recipeName, qty);
        });
    });
}

function clampCraftBatchInput() {
    const input = document.getElementById('craftBatchQty');
    if (!input) return 1;
    let v = parseInt(input.value, 10);
    if (!Number.isFinite(v) || v < 1) v = 1;
    v = Math.min(CRAFT_BATCH_MAX, v);
    input.value = String(v);
    return v;
}

function adjustCraftBatchQty(delta) {
    const input = document.getElementById('craftBatchQty');
    if (!input) return;
    let v = parseInt(input.value, 10) || 1;
    v = Math.max(1, Math.min(CRAFT_BATCH_MAX, v + delta));
    input.value = String(v);
}

function scrollCraftResultIntoView() {
    const resultDiv = document.getElementById('craftResult');
    if (!resultDiv) return;
    requestAnimationFrame(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const main = document.querySelector('.main-content');
        if (main) {
            const top = resultDiv.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 12;
            main.scrollTop = Math.max(0, top);
        }
    });
}

function getProfessionBonuses(tier) {
    const effectiveLevel = (tier - 1) * 10 + 5;
    return {
        gatherSpeedBonus: Math.min(0.5, effectiveLevel * 0.01),
        doubleGatherChance: Math.min(0.5, effectiveLevel * 0.01),
        expBonus: Math.min(1.0, effectiveLevel * 0.02),
        rareResourceChance: Math.min(0.3, effectiveLevel * 0.006),
        craftQualityBonus: Math.min(0.5, effectiveLevel * 0.01),
        materialSaveChance: Math.min(0.3, effectiveLevel * 0.006)
    };
}

let pendingCraftData = null;

function flushPendingCraft() {
    if (!pendingCraftData || !pendingCraftData.profId) return;
    completeCrafting(pendingCraftData.profId, { silent: true });
}

// Функция для сбора всех рецептов профессии из всех категорий
function getAllRecipesForProfession(profId) {
    const recipesData = CRAFTING_RECIPES[profId];
    if (!recipesData) return [];
    
    let allRecipes = [];
    const categories = ['weapons', 'armor', 'potions', 'gather_scrolls', 'scrolls', 'foods', 'gems', 'rings', 'amulets', 'consumables', 'items', 'stones'];
    
    for (const category of categories) {
        if (recipesData[category] && Array.isArray(recipesData[category])) {
            allRecipes = allRecipes.concat(recipesData[category]);
        }
    }
    
    return allRecipes.map(normalizeRecipeForCraft);
}

function buildCraftedItemFromRecipe(recipe, bonuses) {
    const visuals = typeof pickItemVisualFields === 'function' ? pickItemVisualFields(recipe) : { icon: recipe.icon || '📦', img: recipe.img || '' };
    const newItem = {
        name: recipe.name,
        rarity: recipe.rarity || 'Обычный',
        icon: visuals.icon,
        img: visuals.img,
        type: recipe.type,
        class: recipe.class || null,
        effect: recipe.effect || null,
        value: recipe.value || null,
        scrollTier: recipe.scrollTier || null,
        durationMs: recipe.durationMs || null,
        maxGathers: recipe.maxGathers || null,
        expMultiplier: recipe.expMultiplier != null ? recipe.expMultiplier : null,
        dmg: recipe.dmg || 0,
        def: recipe.def || 0,
        hp: recipe.hp || 0,
        crit: recipe.crit || 0,
        critDmg: recipe.critDmg || 0,
        dodge: recipe.dodge || 0,
        mana: recipe.mana || 0,
        baseDmg: recipe.baseDmg || recipe.dmg || 0,
        baseDef: recipe.baseDef || recipe.def || 0,
        upgradeLevel: 0
    };
    if (typeof getItemSellPrice === 'function') {
        newItem.sellPrice = getItemSellPrice(newItem);
    } else if (recipe.sellPrice) {
        newItem.sellPrice = recipe.sellPrice;
    }
    const qualityBonus = bonuses.craftQualityBonus;
    if (qualityBonus > 0 && (newItem.dmg > 0 || newItem.def > 0 || newItem.hp > 0)) {
        const qualityMultiplier = 1 + qualityBonus;
        if (newItem.dmg) newItem.dmg = Math.floor(newItem.dmg * qualityMultiplier);
        if (newItem.def) newItem.def = Math.floor(newItem.def * qualityMultiplier);
        if (newItem.hp) newItem.hp = Math.floor(newItem.hp * qualityMultiplier);
        if (newItem.crit) newItem.crit = Math.floor(newItem.crit * qualityMultiplier);
        if (newItem.critDmg) newItem.critDmg = Math.floor(newItem.critDmg * qualityMultiplier);
        if (newItem.dodge) newItem.dodge = Math.floor(newItem.dodge * qualityMultiplier);
    }
    return newItem;
}

function pushCraftedItemToInventory(recipe, newItem) {
    const itemType = recipe.type;
    if (itemType === 'weapon') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(newItem);
    } else if (itemType === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(newItem);
    } else if (itemType === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(newItem);
    } else if (itemType === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(newItem);
    } else if (itemType === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(newItem);
    } else if (itemType === 'stone') {
        if (!player.inventory.stones) player.inventory.stones = [];
        player.inventory.stones.push(newItem);
    } else if (itemType === 'ring') {
        if (!player.inventory.rings) player.inventory.rings = [];
        player.inventory.rings.push(newItem);
    } else if (itemType === 'necklace') {
        if (!player.inventory.necklaces) player.inventory.necklaces = [];
        player.inventory.necklaces.push(newItem);
    } else if (itemType === 'potion') {
        if (!player.inventory.potions) player.inventory.potions = [];
        player.inventory.potions.push(newItem);
    } else if (itemType === 'food') {
        if (!player.inventory.foods) player.inventory.foods = [];
        player.inventory.foods.push(newItem);
    } else if (itemType === 'gather_scroll') {
        if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
        player.inventory.gatherScrolls.push(newItem);
    } else if (itemType === 'scroll' || itemType === 'battle_scroll') {
        if (!player.inventory.scrolls) player.inventory.scrolls = [];
        player.inventory.scrolls.push(newItem);
    } else if (itemType === 'elixir') {
        if (!player.inventory.elixirs) player.inventory.elixirs = [];
        player.inventory.elixirs.push(newItem);
    } else {
        if (!player.inventory.armor) player.inventory.armor = [];
        player.inventory.armor.push(newItem);
    }
}

function getCraftSuccessMessage(recipe, batchCount) {
    const n = Math.max(1, batchCount || 1);
    const label = n > 1 ? `×${n} ` : '';
    const itemType = recipe.type;
    if (itemType === 'weapon') return `⚔️ Создано ${label}оружие: ${recipe.name}!`;
    if (itemType === 'helmet') return `⛑️ Создано ${label}шлемов: ${recipe.name}!`;
    if (itemType === 'chest') return `🛡️ Создано ${label}нагрудников: ${recipe.name}!`;
    if (itemType === 'pants') return `👖 Создано ${label}поножей: ${recipe.name}!`;
    if (itemType === 'boots') return `👢 Создано ${label}сапог: ${recipe.name}!`;
    if (itemType === 'stone') return `💎 Создано ${label}камней: ${recipe.name}!`;
    if (itemType === 'ring') return `💍 Создано ${label}колец: ${recipe.name}!`;
    if (itemType === 'necklace') return `📿 Создано ${label}амулетов: ${recipe.name}!`;
    if (itemType === 'potion') return `🧪 Создано ${label}зелий: ${recipe.name}!`;
    if (itemType === 'food') return `🍖 Создано ${label}еды: ${recipe.name}!`;
    if (itemType === 'gather_scroll') return `📜 Создано ${label}${recipe.name}! Активируйте в меню добычи.`;
    if (itemType === 'scroll' || itemType === 'battle_scroll') return `📜 Создано ${label}свитков: ${recipe.name}!`;
    if (itemType === 'elixir') return `💪 Создано ${label}эликсиров: ${recipe.name}!`;
    return `✅ Создано ${label}: ${recipe.name}!`;
}

function completeCrafting(profId, options) {
    options = options || {};
    if (!pendingCraftData) {
        addMessage('❌ Нет данных о крафте!', 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) return;
    normalizeProfessionProf(prof);
    
    const { recipe, adjustedExp, bonuses, batchCount } = pendingCraftData;
    const count = Math.max(1, parseInt(batchCount, 10) || 1);
    let qualityMsgShown = false;

    for (let i = 0; i < count; i++) {
        const newItem = buildCraftedItemFromRecipe(recipe, bonuses);
        if (bonuses.craftQualityBonus > 0 && !qualityMsgShown &&
            (newItem.dmg > 0 || newItem.def > 0 || newItem.hp > 0)) {
            qualityMsgShown = true;
        }
        pushCraftedItemToInventory(recipe, newItem);
    }
    if (qualityMsgShown) {
        addMessage(`✨ Бонус качества +${Math.floor(bonuses.craftQualityBonus * 100)}%!`, 'success');
    }
    addMessage(getCraftSuccessMessage(recipe, count), 'success');
    
    let totalExp = (Number(adjustedExp) || 0) * count;
    prof.exp += totalExp;
    const leveledUp = applyProfessionTierUps(prof);
    if (leveledUp) {
        addMessage(`🎉 ПОВЫШЕНИЕ ТИРА! Профессия → ${prof.tier} тир!`, 'success');
        const newBonuses = getProfessionBonuses(prof.tier);
        addMessage(`📈 Новые бонусы: качество +${Math.floor(newBonuses.craftQualityBonus * 100)}%, экономия +${Math.floor(newBonuses.materialSaveChance * 100)}%`, 'info');
    }
    
    addMessage(`⭐ +${totalExp} XP профессии!`, 'success');
    if (leveledUp) {
        addMessage(`🏆 Теперь у вас ${prof.tier} тир профессии!`, 'success');
    }
    
    saveGame();
    pendingCraftData = null;
    if (!options.silent) showCraftingRecipes(profId);
}

function showCraftingRecipes(profId) {
    stopGathering();
    if (pendingCraftData) flushPendingCraft();
    
    const allRecipes = getAllRecipesForProfession(profId);
    
    const prof = PROFESSIONS_DB.crafting.find(p => p.id === profId);
    if (!prof) {
        console.error('Профессия не найдена:', profId);
        return;
    }
    
    const profState = player.professions[profId];
    if (profState) {
        normalizeProfessionProf(profState);
        if (applyProfessionTierUps(profState)) {
            saveGame();
            addMessage(`🎉 Профессия повышена до ${profState.tier} тира!`, 'success');
        }
    }
    const currentTier = profState ? profState.tier : 1;
    const exp = profState ? profState.exp : 0;
    const bonuses = getProfessionBonuses(currentTier);
    const expNeeded = getExpForNextTier(currentTier);
    const percent = (expNeeded > 0 && currentTier < 6) ? (exp / expNeeded * 100) : 100;
    
    const classRecipes = allRecipes.filter(r => !r.class || r.class === player.class);
    const availableRecipes = classRecipes.filter(r => {
        const norm = normalizeRecipeForCraft(r);
        return norm.tier <= currentTier;
    });
    const lockedByTierCount = classRecipes.filter(r => normalizeRecipeForCraft(r).tier > currentTier).length;
    
    let html = '<h2>' + prof.icon + ' ' + prof.name + ' — Создание предметов</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">';
    html += '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">';
    html += '<div><span style="color: var(--gold);">⭐</span> Тир профессии: <strong>' + currentTier + '</strong>/6</div>';
    html += '<div><span style="color: var(--gold);">⚔️</span> Ваш класс: <strong>' + player.class + '</strong></div>';
    html += '</div>';
    
    if (currentTier < 6) {
        html += '<div class="progress-bar" style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 10px 0; overflow: hidden;">' +
                '<div style="width:' + percent + '%; height: 100%; background: linear-gradient(90deg, #9b59b6, #8e44ad); transition: width 0.3s;"></div></div>';
        html += '<div style="font-size: 11px;">До ' + (currentTier + 1) + ' тира: ' + Math.floor(exp) + '/' + expNeeded + ' XP</div>';
    } else {
        html += '<div style="color: gold; font-size: 12px; margin: 8px 0;">🏆 МАКСИМАЛЬНЫЙ ТИР! Все бонусы доступны</div>';
    }
    
    html += '<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">✨ Качество: +' + Math.floor(bonuses.craftQualityBonus * 100) + '%</span>';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">💎 Экономия: ' + Math.floor(bonuses.materialSaveChance * 100) + '%</span>';
    html += '</div>';
    if (lockedByTierCount > 0) {
        html += '<div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">🔒 Ещё ' + lockedByTierCount
            + ' рецепт(ов) откроются с повышением тира профессии</div>';
    }
    html += '</div>';
    html += '<div class="craft-batch-bar">';
    html += '<span class="craft-batch-label">🔢 Создать за раз:</span>';
    html += '<button type="button" class="craft-batch-btn" onclick="adjustCraftBatchQty(-1)" aria-label="Меньше">−</button>';
    html += '<input type="number" id="craftBatchQty" class="craft-batch-input" min="1" max="' + CRAFT_BATCH_MAX + '" value="1" onchange="clampCraftBatchInput()" onblur="clampCraftBatchInput()">';
    html += '<button type="button" class="craft-batch-btn" onclick="adjustCraftBatchQty(1)" aria-label="Больше">+</button>';
    html += '<span class="craft-batch-hint">макс. ' + CRAFT_BATCH_MAX + ' · по материалам</span>';
    html += '</div>';
    html += '<div id="craftResult" class="craft-result-panel"></div>';
    
    if (availableRecipes.length === 0) {
        html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; text-align: center;">';
        html += '<p style="color:#e74c3c;">❌ Нет доступных рецептов для вашего класса!</p>';
        html += '<p style="font-size: 12px; color: #aaa;">Эта профессия создаёт предметы для других классов.</p>';
        html += '<p style="font-size: 12px; color: #aaa; margin-top: 10px;">Попробуйте другие профессии:</p>';
        html += '<ul style="text-align: left; font-size: 11px; color: #aaa; margin-top: 5px;">';
        if (player.class === 'Маг') {
            html += '<li>• Портняжное дело 🧥 - создаёт магическое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Свиткотворчество 📜 - создаёт магические свитки</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        } else if (player.class === 'Воин') {
            html += '<li>• Кузнечное дело ⚒️ - создаёт тяжёлое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        } else if (player.class === 'Лучник') {
            html += '<li>• Кожевенное дело 👞 - создаёт лёгкое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        }
        html += '</ul>';
        html += '</div>';
    } else {
        // Группируем рецепты по типу
        const grouped = {};
        for (const recipe of availableRecipes) {
            const itemType = recipe.type || 'other';
            if (!grouped[itemType]) grouped[itemType] = [];
            grouped[itemType].push(recipe);
        }
        
        const typeNames = {
            'weapon': '⚔️ Оружие',
            'helmet': '⛑️ Шлемы',
            'chest': '🛡️ Нагрудники',
            'pants': '👖 Поножи',
            'boots': '👢 Сапоги',
            'ring': '💍 Кольца',
            'necklace': '📿 Амулеты',
            'stone': '💎 Камни',
            'potion': '🧪 Зелья',
            'elixir': '💪 Эликсиры',
            'scroll': '📜 Свитки',
            'battle_scroll': '⚔️ Боевые свитки',
            'food': '🍖 Еда',
            'gather_scroll': '📜 Свитки добычи'
        };
        
        for (const [itemType, recipes] of Object.entries(grouped)) {
            html += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 5px;">${typeNames[itemType] || itemType}</h3>`;
            html += '<div class="resource-grid craft-recipe-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 15px;">';
            
            for (const r of recipes) {
                const norm = normalizeRecipeForCraft(r);
                const blockReason = getCraftBlockReason(norm, profId);
                const canCraft = !blockReason;
                const hasMats = hasRecipeMaterials(norm);
                let cardClass = 'resource-card craft-recipe-card';
                if (canCraft) cardClass += ' craft-recipe-ready';
                else if (hasMats) cardClass += ' craft-recipe-mats';
                else cardClass += ' craft-recipe-locked';

                let previewMatText = '';
                const materials = norm.resources || norm.materials;
                
                if (materials) {
                    for (let mat in materials) {
                        const needed = materials[mat];
                        const has = getPlayerResourceAmount(mat);
                        const ok = has >= needed;
                        previewMatText += `<div style="font-size: 10px; color:${ok ? '#8fd4a0' : '#e74c3c'};">${mat}: ${has}/${needed}</div>`;
                    }
                }
                if (!canCraft && blockReason) {
                    previewMatText += `<div style="font-size: 10px; color: #e74c3c; margin-top: 4px;">🔒 ${blockReason}</div>`;
                }
                
                const rarityColor = getCraftRarityColor(norm.rarity || 'Обычный');
                const rarityLabel = norm.rarity || 'Обычный';
                
                let statsText = '';
                if (norm.dmg) statsText += `⚔️+${norm.dmg} `;
                if (norm.def) statsText += `🛡️+${norm.def} `;
                if (norm.hp) statsText += `❤️+${norm.hp} `;
                if (norm.crit) statsText += `💥+${norm.crit}% `;
                if (norm.critDmg) statsText += `⭐+${norm.critDmg}% `;
                if (norm.dodge) statsText += `💨+${norm.dodge}% `;
                if (norm.mana) statsText += `💎+${norm.mana} `;
                
                const safeRecipe = encodeURIComponent(norm.name);
                const blockAttr = blockReason ? encodeURIComponent(blockReason) : '';
                const blockDataAttr = blockReason ? ` data-block-reason="${blockAttr}"` : '';
                
                html += `<div class="${cardClass}" data-recipe-name="${safeRecipe}"${blockDataAttr} role="button" tabindex="0">`;
                html += '<div style="display: flex; gap: 12px;">';
                html += typeof renderItemIconHTML === 'function'
                    ? renderItemIconHTML(norm, { size: 44, fallback: norm.icon || '📦' })
                    : '<div class="item-icon" style="font-size:35px">' + (norm.icon || '📦') + '</div>';
                html += '<div style="flex: 1;">';
                html += `<div style="font-weight: 700; font-size: 14px; color: ${rarityColor};">${norm.name}</div>`;
                html += `<div style="font-size: 10px; color: ${rarityColor}; opacity: 0.9;">${rarityLabel}</div>`;
                if (statsText) html += `<div style="font-size: 11px; color: var(--text-secondary);">${statsText}</div>`;
                html += `<div style="font-size: 10px; margin-top: 5px;">${previewMatText || 'Нет материалов'}</div>`;
                html += `<div style="font-size: 10px; color: var(--gold); margin-top: 4px;">⭐ +${norm.exp || norm.time || 0} XP | 🔓 Тир ${norm.tier}</div>`;
                if (canCraft) html += '<div class="craft-ready-badge">✓ Можно создать</div>';
                html += '</div></div></div>';
            }
            html += '</div>';
        }
    }
    
    html += '<button class="action-btn craft-back-btn" onclick="showProfessions()" style="margin-top:15px;width:100%; padding: 12px;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;
    bindCraftRecipeGrid(profId);
}

function prepareCraft(profId, recipeName, craftCount) {
    if (pendingCraftData) flushPendingCraft();
    const allRecipes = getAllRecipesForProfession(profId);
    const recipe = allRecipes.find(r => r.name === recipeName);
    const normRecipe = normalizeRecipeForCraft(recipe);
    
    if (!recipe) {
        addMessage(`❌ Рецепт "${recipeName}" не найден!`, 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) {
        addMessage('❌ Профессия не изучена!', 'error');
        return;
    }
    normalizeProfessionProf(prof);
    applyProfessionTierUps(prof);
    const bonuses = getProfessionBonuses(prof.tier);

    let qty = parseInt(craftCount, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    qty = Math.min(CRAFT_BATCH_MAX, Math.floor(qty));
    const maxCraft = getMaxCraftCount(normRecipe, profId);
    if (maxCraft <= 0) {
        const blockReason = getCraftBlockReason(normRecipe, profId, 1);
        addMessage(`❌ ${blockReason || 'Нельзя создать'}`, 'error');
        return;
    }
    qty = Math.min(qty, maxCraft);

    const blockReason = getCraftBlockReason(normRecipe, profId, qty);
    if (blockReason) {
        addMessage(`❌ ${blockReason}`, 'error');
        return;
    }
    
    const materials = normRecipe.resources || normRecipe.materials;
    if (!materials) {
        addMessage(`❌ У рецепта "${normRecipe.name}" нет материалов!`, 'error');
        return;
    }
    
    consumePlayerResources(scaleRecipeMaterials(materials, qty));
    
    const perExp = normRecipe.exp || normRecipe.time || 0;
    pendingCraftData = {
        profId: profId,
        recipe: normRecipe,
        adjustedExp: perExp,
        bonuses: bonuses,
        actualMaterials: scaleRecipeMaterials(materials, qty),
        savedMaterials: false,
        batchCount: qty
    };
    
    // Показываем результат
    const resultDiv = document.getElementById('craftResult');
    if (!resultDiv) {
        completeCrafting(profId, { silent: true });
        saveGame();
        return;
    }
    const qtyLabel = qty > 1 ? ' ×' + qty : '';
    let resultHtml = '<div style="background: rgba(0,0,0,0.5); border-radius: 10px; padding: 15px;">';
    resultHtml += '<div style="margin-bottom: 10px;">🔨 <strong>Крафт завершён!</strong></div>';
    resultHtml += '<div style="font-size: 13px; margin-bottom: 8px;">📦 Создано' + qtyLabel + ': <span style="color: var(--gold); font-weight: bold;">' + normRecipe.name + '</span></div>';
    resultHtml += '<div style="font-size: 11px; margin-top: 5px;">⭐ Опыт: +' + (perExp * qty) + ' XP</div>';
    if (bonuses.craftQualityBonus > 0) {
        resultHtml += '<div style="font-size: 11px; color: #f0c040;">✨ Бонус качества: +' + Math.floor(bonuses.craftQualityBonus * 100) + '%</div>';
    }
    resultHtml += '<button id="completeCraftBtn" class="action-btn" style="margin-top: 12px; width: 100%; padding: 10px; background: linear-gradient(135deg, #27ae60, #2ecc71);">🎁 Забрать предмет</button>';
    resultHtml += '</div>';
    resultDiv.innerHTML = resultHtml;
    scrollCraftResultIntoView();

    const completeBtn = document.getElementById('completeCraftBtn');
    if (completeBtn) {
        completeBtn.onclick = () => {
            completeCrafting(profId);
        };
    }

    saveGame();
}

window.getCraftRarityColor = getCraftRarityColor;
window.normalizeRecipeForCraft = normalizeRecipeForCraft;
window.getCraftBlockReason = getCraftBlockReason;
window.getProfessionLearnBlockReason = getProfessionLearnBlockReason;
window.getResourcesAtLocationForProfession = getResourcesAtLocationForProfession;
window.getGatherableResourceDefsAtLocation = getGatherableResourceDefsAtLocation;
window.renderGatherProfessionIconsHtml = renderGatherProfessionIconsHtml;
window.formatLocationResourcesHint = formatLocationResourcesHint;
window.getMaxCraftCount = getMaxCraftCount;
window.scaleRecipeMaterials = scaleRecipeMaterials;
window.clampCraftBatchInput = clampCraftBatchInput;
window.adjustCraftBatchQty = adjustCraftBatchQty;
window.prepareCraft = prepareCraft;
window.showCraftingRecipes = showCraftingRecipes;
