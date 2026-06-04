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

function hasRecipeMaterials(recipe) {
    const materials = recipe && (recipe.resources || recipe.materials);
    if (!materials) return true;
    for (const mat in materials) {
        if (getPlayerResourceAmount(mat) < materials[mat]) return false;
    }
    return true;
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

function getProfessionLearnMinLevel(profId) {
    const prof = findProfessionMeta(profId);
    const lvl = prof && prof.learnMinLevel != null ? parseInt(prof.learnMinLevel, 10) : 1;
    return Number.isFinite(lvl) && lvl > 0 ? lvl : 1;
}

function getProfessionLearnBlockReason(profId) {
    if (player.professions[profId]) return 'Профессия уже изучена';
    const minLvl = getProfessionLearnMinLevel(profId);
    const playerLvl = parseInt(player.level, 10) || 1;
    if (playerLvl < minLvl) return `Нужен ${minLvl} ур. персонажа (сейчас ${playerLvl})`;
    return '';
}

/** Ресурсы на текущей локации для профессии (с учётом тира профессии). */
function getResourcesAtLocationForProfession(profId) {
    const loc = String(player.location || '').trim();
    if (!loc) return [];
    const meta = findProfessionMeta(profId);
    const profState = player.professions[profId];
    const tier = profState ? (parseInt(profState.tier, 10) || 1) : 1;
    const sourceIds = RESOURCES_DB[profId]
        ? [profId]
        : (meta && meta.relatedGathering ? meta.relatedGathering : []);
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

function getCraftBlockReason(recipe, profId) {
    if (!recipe) return 'Рецепт не найден';
    const prof = player.professions[profId];
    if (!prof) return 'Профессия не изучена';
    normalizeProfessionProf(prof);
    const r = normalizeRecipeForCraft(recipe);
    const requiredTier = r.tier;
    const profTier = parseInt(prof.tier, 10) || 1;
    if (profTier < requiredTier) {
        const left = getExpForNextTier(profTier) - prof.exp;
        if (left > 0) {
            return `Нужен ${requiredTier} тир (ещё ~${Math.ceil(left)} XP)`;
        }
        return `Нужен ${requiredTier} тир профессии`;
    }
    const playerClass = (player.class || '').trim();
    const recipeClass = (r.class || '').trim();
    if (recipeClass && playerClass && recipeClass !== playerClass) {
        return `Только для класса ${recipeClass}`;
    }
    const materials = r.resources || r.materials;
    if (materials) {
        for (const mat in materials) {
            const needed = materials[mat];
            const has = getPlayerResourceAmount(mat);
            if (has < needed) return `Не хватает: ${mat} (${has}/${needed})`;
        }
    }
    return '';
}

function bindCraftRecipeGrid(profId) {
    const grid = document.getElementById('craftRecipeGrid');
    if (!grid) return;
    grid.querySelectorAll('.craft-recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            const reason = card.getAttribute('data-block-reason') || '';
            if (reason) {
                addMessage('❌ ' + reason, 'error');
                return;
            }
            const recipeName = decodeURIComponent(card.getAttribute('data-recipe-name') || '');
            if (!recipeName) return;
            prepareCraft(profId, recipeName);
        });
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

function completeCrafting(profId, options) {
    options = options || {};
    if (!pendingCraftData) {
        addMessage('❌ Нет данных о крафте!', 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) return;
    normalizeProfessionProf(prof);
    
    const { recipe, adjustedExp, bonuses } = pendingCraftData;
    
    // Создаём предмет напрямую из полей рецепта
    const visuals = typeof pickItemVisualFields === 'function' ? pickItemVisualFields(recipe) : { icon: recipe.icon || '📦', img: recipe.img || '' };
    let newItem = {
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
    
    // Устанавливаем цену продажи из базы
    if (typeof getItemSellPrice === 'function') {
        newItem.sellPrice = getItemSellPrice(newItem);
    } else if (recipe.sellPrice) {
        newItem.sellPrice = recipe.sellPrice;
    }
    
    
    let qualityBonus = bonuses.craftQualityBonus;
    if (qualityBonus > 0 && (newItem.dmg > 0 || newItem.def > 0 || newItem.hp > 0)) {
        const qualityMultiplier = 1 + qualityBonus;
        if (newItem.dmg) newItem.dmg = Math.floor(newItem.dmg * qualityMultiplier);
        if (newItem.def) newItem.def = Math.floor(newItem.def * qualityMultiplier);
        if (newItem.hp) newItem.hp = Math.floor(newItem.hp * qualityMultiplier);
        if (newItem.crit) newItem.crit = Math.floor(newItem.crit * qualityMultiplier);
        if (newItem.critDmg) newItem.critDmg = Math.floor(newItem.critDmg * qualityMultiplier);
        if (newItem.dodge) newItem.dodge = Math.floor(newItem.dodge * qualityMultiplier);
        addMessage(`✨ Бонус качества +${Math.floor(qualityBonus * 100)}%!`, 'success');
    }
    
    // Добавляем в инвентарь в зависимости от типа
    const itemType = recipe.type;
    
    if (itemType === 'weapon') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(newItem);
        addMessage(`⚔️ Создано оружие: ${recipe.name}!`, 'success');
    } else if (itemType === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(newItem);
        addMessage(`⛑️ Создан шлем: ${recipe.name}!`, 'success');
    } else if (itemType === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(newItem);
        addMessage(`🛡️ Создан нагрудник: ${recipe.name}!`, 'success');
    } else if (itemType === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(newItem);
        addMessage(`👖 Созданы поножи: ${recipe.name}!`, 'success');
    } else if (itemType === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(newItem);
        addMessage(`👢 Созданы сапоги: ${recipe.name}!`, 'success');
    } else if (itemType === 'stone') {
        if (!player.inventory.stones) player.inventory.stones = [];
        player.inventory.stones.push(newItem);
        addMessage(`💎 Создан камень: ${recipe.name}!`, 'success');
    } else if (itemType === 'ring') {
        if (!player.inventory.rings) player.inventory.rings = [];
        player.inventory.rings.push(newItem);
        addMessage(`💍 Создано кольцо: ${recipe.name}!`, 'success');
    } else if (itemType === 'necklace') {
        if (!player.inventory.necklaces) player.inventory.necklaces = [];
        player.inventory.necklaces.push(newItem);
        addMessage(`📿 Создан амулет: ${recipe.name}!`, 'success');
    } else if (itemType === 'potion') {
        if (!player.inventory.potions) player.inventory.potions = [];
        player.inventory.potions.push(newItem);
        addMessage(`🧪 Создано зелье: ${recipe.name}!`, 'success');
    } else if (itemType === 'food') {
        if (!player.inventory.foods) player.inventory.foods = [];
        player.inventory.foods.push(newItem);
        addMessage(`🍖 Создана еда: ${recipe.name}!`, 'success');
    } else if (itemType === 'gather_scroll') {
        if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
        player.inventory.gatherScrolls.push(newItem);
        addMessage(`📜 Создан ${recipe.name}! Активируйте в меню добычи профессии.`, 'success');
    } else if (itemType === 'scroll' || itemType === 'battle_scroll') {
        if (!player.inventory.scrolls) player.inventory.scrolls = [];
        player.inventory.scrolls.push(newItem);
        addMessage(`📜 Создан свиток: ${recipe.name}!`, 'success');
    } else if (itemType === 'elixir') {
        if (!player.inventory.elixirs) player.inventory.elixirs = [];
        player.inventory.elixirs.push(newItem);
        addMessage(`💪 Создан эликсир: ${recipe.name}!`, 'success');
    } else {
        if (!player.inventory.armor) player.inventory.armor = [];
        player.inventory.armor.push(newItem);
        addMessage(`✅ Создано: ${recipe.name}!`, 'success');
    }
    
    let totalExp = Number(adjustedExp) || 0;
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
            html += '<div class="resource-grid craft-recipe-grid" id="craftRecipeGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 15px;">';
            
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
                
                html += `<div class="${cardClass}" data-recipe-name="${safeRecipe}" data-block-reason="${blockAttr}" role="button" tabindex="0">`;
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
    
    html += '<div id="craftResult" style="margin-top: 15px;"></div>';
    html += '<button class="action-btn" onclick="showProfessions()" style="margin-top:15px;width:100%; padding: 12px;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;
    bindCraftRecipeGrid(profId);
}

function prepareCraft(profId, recipeName) {
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
    const blockReason = getCraftBlockReason(normRecipe, profId);
    if (blockReason) {
        addMessage(`❌ ${blockReason}`, 'error');
        return;
    }
    
    const materials = normRecipe.resources || normRecipe.materials;
    if (!materials) {
        addMessage(`❌ У рецепта "${normRecipe.name}" нет материалов!`, 'error');
        return;
    }
    
    consumePlayerResources(materials);
    
    pendingCraftData = {
        profId: profId,
        recipe: normRecipe,
        adjustedExp: normRecipe.exp || normRecipe.time || 0,
        bonuses: bonuses,
        actualMaterials: materials,
        savedMaterials: false
    };
    
    // Показываем результат
    const resultDiv = document.getElementById('craftResult');
    if (!resultDiv) {
        completeCrafting(profId, { silent: true });
        return;
    }
    let resultHtml = '<div style="background: rgba(0,0,0,0.5); border-radius: 10px; padding: 15px; margin-top: 10px;">';
        resultHtml += '<div style="margin-bottom: 10px;">🔨 <strong>Крафт завершён!</strong></div>';
        resultHtml += '<div style="font-size: 13px; margin-bottom: 8px;">📦 Создано: <span style="color: var(--gold); font-weight: bold;">' + normRecipe.name + '</span></div>';
        resultHtml += '<div style="font-size: 11px; margin-top: 5px;">⭐ Опыт: +' + (normRecipe.exp || normRecipe.time || 0) + ' XP</div>';
        if (bonuses.craftQualityBonus > 0) {
            resultHtml += '<div style="font-size: 11px; color: #f0c040;">✨ Бонус качества: +' + Math.floor(bonuses.craftQualityBonus * 100) + '%</div>';
        }
        resultHtml += '<button id="completeCraftBtn" class="action-btn" style="margin-top: 12px; width: 100%; padding: 10px; background: linear-gradient(135deg, #27ae60, #2ecc71);">🎁 Забрать предмет</button>';
        resultHtml += '</div>';
        resultDiv.innerHTML = resultHtml;
        
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
window.formatLocationResourcesHint = formatLocationResourcesHint;
window.prepareCraft = prepareCraft;
window.showCraftingRecipes = showCraftingRecipes;
