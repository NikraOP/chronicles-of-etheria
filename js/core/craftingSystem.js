// craftingSystem.js - Полная исправленная версия

function getExpForNextTier(currentTier) {
    switch(currentTier) {
        case 1: return 500;
        case 2: return 1000;
        case 3: return 2000;
        case 4: return 3500;
        case 5: return 5000;
        default: return 0;
    }
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
    const categories = ['weapons', 'armor', 'potions', 'scrolls', 'foods', 'gems', 'rings', 'amulets', 'consumables', 'items', 'stones'];
    
    for (const category of categories) {
        if (recipesData[category] && Array.isArray(recipesData[category])) {
            allRecipes = allRecipes.concat(recipesData[category]);
        }
    }
    
    return allRecipes;
}

function completeCrafting(profId, options) {
    options = options || {};
    if (!pendingCraftData) {
        addMessage('❌ Нет данных о крафте!', 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) return;
    
    const { recipe, adjustedExp, bonuses } = pendingCraftData;
    
    // Создаём предмет напрямую из полей рецепта
    let newItem = {
        name: recipe.name,
        rarity: recipe.rarity || 'Обычный',
        icon: recipe.icon || '📦',
        type: recipe.type,
        class: recipe.class || null,
        effect: recipe.effect || null,
        value: recipe.value || null,
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
    
    // Добавляем опыт
    let totalExp = adjustedExp;
    prof.exp += totalExp;
    
    let expNeeded = getExpForNextTier(prof.tier);
    let leveledUp = false;
    
    while (prof.exp >= expNeeded && prof.tier < 6) {
        prof.exp -= expNeeded;
        prof.tier = (prof.tier || 1) + 1;
        expNeeded = getExpForNextTier(prof.tier);
        leveledUp = true;
        addMessage(`🎉 ПОВЫШЕНИЕ ТИРА! Профессия → ${prof.tier} тир!`, 'success');
        const newBonuses = getProfessionBonuses(prof.tier);
        addMessage(`📈 Новые бонусы: качество +${Math.floor(newBonuses.craftQualityBonus * 100)}%, экономия +${Math.floor(newBonuses.materialSaveChance * 100)}%`, 'info');
    }
    if (prof.tier >= 6) prof.exp = Math.min(prof.exp, expNeeded);
    
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
    
    const currentTier = player.professions[profId] ? (player.professions[profId].tier || 1) : 1;
    const exp = player.professions[profId]?.exp || 0;
    const bonuses = getProfessionBonuses(currentTier);
    const expNeeded = getExpForNextTier(currentTier);
    const percent = (expNeeded > 0 && currentTier < 6) ? (exp / expNeeded * 100) : 100;
    
    // Фильтруем рецепты: по тиру И по классу (если класс указан)
    const availableRecipes = allRecipes.filter(r => {
        // Проверка по тиру
        if (currentTier < (r.tier || 1)) return false;
        // Проверка по классу - показываем только предметы для класса игрока
        if (r.class && r.class !== player.class) return false;
        return true;
    });
    
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
    html += '</div></div>';
    
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
            'food': '🍖 Еда'
        };
        
        for (const [itemType, recipes] of Object.entries(grouped)) {
            html += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 5px;">${typeNames[itemType] || itemType}</h3>`;
            html += '<div class="resource-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 15px;">';
            
            for (const r of recipes) {
                let canCraft = true;
                let previewMatText = '';
                const materials = r.resources || r.materials;
                
                if (materials) {
                    for (let mat in materials) {
                        const needed = materials[mat];
                        const has = player.resources[mat] || 0;
                        previewMatText += `<div style="font-size: 10px;">${mat}: ${has}/${needed}</div>`;
                        if (has < needed) canCraft = false;
                    }
                }
                
                const rarityColor = {
                    'Обычный': '#ccc',
                    'Необычный': '#2ecc71',
                    'Редкий': '#3498db',
                    'Эпический': '#9b59b6',
                    'Легендарный': '#f0c040',
                    'Мифический': '#e74c3c'
                }[r.rarity || 'Обычный'] || '#ccc';
                
                let statsText = '';
                if (r.dmg) statsText += `⚔️+${r.dmg} `;
                if (r.def) statsText += `🛡️+${r.def} `;
                if (r.hp) statsText += `❤️+${r.hp} `;
                if (r.crit) statsText += `💥+${r.crit}% `;
                if (r.critDmg) statsText += `⭐+${r.critDmg}% `;
                if (r.dodge) statsText += `💨+${r.dodge}% `;
                if (r.mana) statsText += `💎+${r.mana} `;
                
                html += `<div class="resource-card" style="${canCraft ? 'background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.3s;' : 'opacity:0.5;cursor:not-allowed;'}" onclick="${canCraft ? `prepareCraft('${profId}', '${r.name.replace(/'/g, "\\'")}')` : ''}">
                    <div style="display: flex; gap: 12px;">
                        <div style="font-size: 35px;">${r.icon || '📦'}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 14px; color: ${rarityColor};">${r.name}</div>
                            ${statsText ? `<div style="font-size: 11px; color: var(--text-secondary);">${statsText}</div>` : ''}
                            <div style="font-size: 10px; margin-top: 5px;">${previewMatText || 'Нет материалов'}</div>
                            <div style="font-size: 10px; color: var(--gold); margin-top: 4px;">⭐ +${r.exp || r.time || 0} XP | 🔓 Тир ${r.tier || 1}</div>
                        </div>
                    </div>
                </div>`;
            }
            html += '</div>';
        }
    }
    
    html += '<div id="craftResult" style="margin-top: 15px;"></div>';
    html += '<button class="action-btn" onclick="showProfessions()" style="margin-top:15px;width:100%; padding: 12px;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function prepareCraft(profId, recipeName) {
    if (pendingCraftData) {
        addMessage('⏳ Сначала заберите созданный предмет!', 'error');
        return;
    }
    const allRecipes = getAllRecipesForProfession(profId);
    const recipe = allRecipes.find(r => r.name === recipeName);
    
    if (!recipe) {
        addMessage(`❌ Рецепт "${recipeName}" не найден!`, 'error');
        return;
    }
    
    const prof = player.professions[profId];
    const currentTier = prof ? (prof.tier || 1) : 1;
    const bonuses = getProfessionBonuses(currentTier);
    const requiredTier = recipe.tier || 1;
    
    // Проверка по классу
    if (recipe.class && recipe.class !== player.class) {
        addMessage(`❌ Этот предмет предназначен для класса ${recipe.class}!`, 'error');
        return;
    }
    
    if (currentTier < requiredTier) {
        addMessage(`❌ Нужен ${requiredTier} тир профессии для крафта! (сейчас ${currentTier})`, 'error');
        return;
    }
    
    const materials = recipe.resources || recipe.materials;
    if (!materials) {
        addMessage(`❌ У рецепта "${recipe.name}" нет материалов!`, 'error');
        return;
    }
    
    // Проверяем материалы
    for (let mat in materials) {
        let needed = materials[mat];
        const has = player.resources[mat] || 0;
        if (has < needed) { 
            addMessage(`❌ Не хватает материалов: ${mat} (нужно ${needed})!`, 'error'); 
            return; 
        }
    }
    
    // Списываем материалы
    for (let mat in materials) {
        player.resources[mat] -= materials[mat];
        if (player.resources[mat] <= 0) delete player.resources[mat];
    }
    
    // Сохраняем данные о крафте
    pendingCraftData = {
        profId: profId,
        recipe: recipe,
        adjustedExp: recipe.exp || recipe.time || 0,
        bonuses: bonuses,
        actualMaterials: materials,
        savedMaterials: false
    };
    
    // Показываем результат
    const resultDiv = document.getElementById('craftResult');
    if (resultDiv) {
        let resultHtml = '<div style="background: rgba(0,0,0,0.5); border-radius: 10px; padding: 15px; margin-top: 10px;">';
        resultHtml += '<div style="margin-bottom: 10px;">🔨 <strong>Крафт завершён!</strong></div>';
        resultHtml += '<div style="font-size: 13px; margin-bottom: 8px;">📦 Создано: <span style="color: var(--gold); font-weight: bold;">' + recipe.name + '</span></div>';
        resultHtml += '<div style="font-size: 11px; margin-top: 5px;">⭐ Опыт: +' + (recipe.exp || recipe.time || 0) + ' XP</div>';
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
    }
    
    saveGame();
}
