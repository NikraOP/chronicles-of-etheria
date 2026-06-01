// shop.js - Исправленная версия с поддержкой всех редкостей

function showShop() {
    stopGathering();
    let html = '<h2>🏪 Магазин</h2><p>💰 Золото: <span style="color:var(--gold);" id="shopGoldAmount">' + player.gold + '</span></p><div class="shop-tabs">';
    const tabs = ['Оружие', 'Шлемы', 'Нагрудники', 'Поножи', 'Сапоги', 'Продажа ресурсов', 'Продажа предметов'];
    const categories = ['weapons', 'helmet', 'chest', 'pants', 'boots', 'sellResources', 'sellItems'];
    
    tabs.forEach((t, i) => {
        const isActive = (window.currentShopCategory === categories[i]) || (i === 0 && !window.currentShopCategory);
        html += '<div class="shop-tab' + (isActive ? ' active' : '') + '" data-cat="' + categories[i] + '" onclick="showShopCategory(\'' + categories[i] + '\')">' + t + '</div>';
    });
    html += '</div><div id="shopItems"></div>';
    document.getElementById('dynamicContent').innerHTML = html;
    
    if (!window.currentShopCategory) window.currentShopCategory = 'weapons';
    showShopCategory(window.currentShopCategory);
}

function showShopCategory(cat) {
    window.currentShopCategory = cat;
    
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.shop-tab[data-cat="${cat}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    const goldSpan = document.getElementById('shopGoldAmount');
    if (goldSpan) goldSpan.textContent = player.gold;
    
    if (cat === 'sellResources') {
        renderSellResources();
    } else if (cat === 'sellItems') {
        renderSellItems();
    } else {
        renderBuyItems(cat);
    }
}

// Цвета для всех редкостей
function getRarityColor(rarity) {
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

// Порядок редкостей для сортировки (чем меньше число, тем выше ранг)
function getRarityOrder(rarity) {
    const order = {
        'Божественный': 1,
        'Древний': 2,
        'Мифический': 3,
        'Легендарный': 4,
        'Эпический': 5,
        'Редкий': 6,
        'Необычный': 7,
        'Обычный': 8
    };
    return order[rarity] || 99;
}

// Русское название редкости с иконкой
function getRarityDisplay(rarity) {
    const displays = {
        'Обычный': '⚪ Обычный',
        'Необычный': '🟢 Необычный',
        'Редкий': '🔵 Редкий',
        'Эпический': '🟣 Эпический',
        'Легендарный': '🟡 Легендарный',
        'Мифический': '🔴 Мифический',
        'Древний': '🟠 Древний',
        'Божественный': '🔹 Божественный'
    };
    return displays[rarity] || '⚪ ' + rarity;
}

// Описание характеристик предмета
function getItemStatsDescription(item) {
    let stats = [];
    if (item.dmg) stats.push(`⚔️ **Атака:** +${item.dmg}`);
    if (item.def) stats.push(`🛡️ **Защита:** +${item.def}`);
    if (item.hp) stats.push(`❤️ **Здоровье:** +${item.hp}`);
    if (item.crit) stats.push(`💥 **Крит:** +${item.crit}%`);
    if (item.critDmg) stats.push(`⭐ **Крит урон:** +${item.critDmg}%`);
    if (item.dodge) stats.push(`💨 **Уклонение:** +${item.dodge}%`);
    
    if (stats.length === 0) return '—';
    return stats.join(' · ');
}

function renderSellResources() {
    const resources = Object.keys(player.resources);
    if (resources.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Нет ресурсов для продажи</p>';
        return;
    }
    
    resources.sort();
    
    let html = '<h3>💰 Продажа ресурсов</h3><div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">';
    const prices = { 
        'Медная руда':5, 'Железная руда':15, 'Серебряная руда':25, 'Золотая руда':40, 'Мифриловая руда':100, 'Адамантит':250, 'Орихалк':500,
        'Аметист':30, 'Изумруд':50, 'Рубин':80, 'Сапфир':80, 'Алмаз':150, 'Звездный камень':300,
        'Паутина':8, 'Хлопок':15, 'Шёлк':35, 'Мифриловая нить':80, 'Звёздный шёлк':200,
        'Лечебная трава':4, 'Синий корень':12, 'Сердце леса':20, 'Призрачная грива':35, 'Огненный цветок':90, 'Ледяная роза':80, 'Звездная пыльца':220,
        'Шкура волка':6, 'Шкура медведя':18, 'Шкура тигра':40, 'Чешуя дракона':50, 'Шкура йети':120, 'Кожа феникса':280, 'Шкура дракона':250,
        'Сосновая древесина':4, 'Дубовая древесина':14, 'Красное дерево':40, 'Эбеновое дерево':100, 'Серебряное дерево':120, 'Древесина мирового древа':240,
        'Речная форель':5, 'Окунь':4, 'Плотва':3, 'Озерный карп':15, 'Щука':18, 'Ледяной сиг':20,
        'Морской окунь':45, 'Палтус':50, 'Красный тунец':55, 'Глубоководный тунец':110, 'Королевский лосось':130, 'Морской змей':150,
        'Золотая рыбка':300, 'Жемчужина глубин':350, 'Дракон моря':500, 'Кракен':800, 'Левиафан':1000
    };
    
    for (let res of resources) {
        const count = player.resources[res];
        const price = prices[res] || 10;
        const totalPrice = count * price;
        html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; display: flex; gap: 12px;" onclick="sellResourceKeepOpen('${res}', ${price})">
            <div style="font-size: 28px;">📦</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 14px;">${res}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${count} шт.</div>
            </div>
            <div style="color: var(--gold); font-weight: 700;">💰 ${totalPrice}</div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function renderSellItems() {
    let allItems = [];
    
    if (player.inventory.weapons) {
        player.inventory.weapons.forEach((item, idx) => {
            allItems.push({ ...item, type: 'weapon', typeName: '⚔️ Оружие', idx: idx });
        });
    }
    if (player.inventory.helmets) {
        player.inventory.helmets.forEach((item, idx) => {
            allItems.push({ ...item, type: 'helmet', typeName: '⛑️ Шлемы', idx: idx });
        });
    }
    if (player.inventory.chests) {
        player.inventory.chests.forEach((item, idx) => {
            allItems.push({ ...item, type: 'chest', typeName: '🛡️ Нагрудники', idx: idx });
        });
    }
    if (player.inventory.pants) {
        player.inventory.pants.forEach((item, idx) => {
            allItems.push({ ...item, type: 'pants', typeName: '👖 Поножи', idx: idx });
        });
    }
    if (player.inventory.boots) {
        player.inventory.boots.forEach((item, idx) => {
            allItems.push({ ...item, type: 'boots', typeName: '👢 Сапоги', idx: idx });
        });
    }
    if (player.inventory.potions) {
        player.inventory.potions.forEach((item, idx) => {
            allItems.push({ ...item, type: 'potion', typeName: '🧪 Зелья', idx: idx });
        });
    }
    if (player.inventory.foods) {
        player.inventory.foods.forEach((item, idx) => {
            allItems.push({ ...item, type: 'food', typeName: '🍖 Еда', idx: idx });
        });
    }
    if (player.inventory.elixirs) {
        player.inventory.elixirs.forEach((item, idx) => {
            allItems.push({ ...item, type: 'elixir', typeName: '💪 Эликсиры', idx: idx });
        });
    }
    if (player.inventory.scrolls) {
        player.inventory.scrolls.forEach((item, idx) => {
            allItems.push({ ...item, type: 'scroll', typeName: '📜 Свитки', idx: idx });
        });
    }
    if (player.inventory.stones) {
        player.inventory.stones.forEach((item, idx) => {
            allItems.push({ ...item, type: 'stone', typeName: '💎 Камни', idx: idx });
        });
    }
    
    if (allItems.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Нет предметов для продажи</p>';
        return;
    }
    
    const typeOrder = {
        '⚔️ Оружие': 1,
        '⛑️ Шлемы': 2,
        '🛡️ Нагрудники': 3,
        '👖 Поножи': 4,
        '👢 Сапоги': 5,
        '🧪 Зелья': 6,
        '🍖 Еда': 7,
        '💪 Эликсиры': 8,
        '📜 Свитки': 9,
        '💎 Камни': 10
    };
    
    allItems.sort((a, b) => {
        const typeCompare = (typeOrder[a.typeName] || 99) - (typeOrder[b.typeName] || 99);
        if (typeCompare !== 0) return typeCompare;
        const rarityCompare = getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
        if (rarityCompare !== 0) return rarityCompare;
        return (a.name || '').localeCompare(b.name || '');
    });
    
    let html = '<h3>💰 Продажа предметов</h3>';
    let currentType = '';
    
    for (let item of allItems) {
        if (currentType !== item.typeName) {
            currentType = item.typeName;
            const countInType = allItems.filter(i => i.typeName === currentType).length;
            html += `<h4 style="margin-top: 20px; margin-bottom: 10px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 5px;">${currentType} (${countInType})</h4>`;
            html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin-bottom: 15px;">';
        }
        
        // ИСПРАВЛЕННАЯ ЛОГИКА: sellPrice имеет приоритет
        let sellPrice = 25;
        if (item.sellPrice) {
            sellPrice = item.sellPrice;
        } else if (item.price) {
            sellPrice = Math.floor(item.price * 0.3);
        } else if (item.effect === 'heal') {
            sellPrice = Math.floor((item.value || 50) * 2);
        } else if (item.effect === 'atk' || item.effect === 'def') {
            sellPrice = Math.floor((item.value || 30) * 3);
        } else if (item.dmg) {
            sellPrice = Math.floor((item.dmg || 10) * 8);
        }
        
        const statsText = getItemStatsDescription(item);
        const rarityColor = getRarityColor(item.rarity);
        const rarityDisplay = getRarityDisplay(item.rarity);
        const icon = item.icon || '📦';
        
        html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; display: flex; gap: 12px;" onclick="sellItemKeepOpen('${item.type}', ${item.idx}, ${sellPrice})">
            <div style="font-size: 36px;">${icon}</div>
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 14px; color: ${rarityColor};">${item.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">${statsText}</div>
                <div style="font-size: 10px; color: ${rarityColor}; margin-top: 3px;">${rarityDisplay}</div>
            </div>
            <div style="color: #2ecc71; font-weight: 700; white-space: nowrap;">💰 +${sellPrice}</div>
        </div>`;
    }
    
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function renderBuyItems(cat) {
    let items = [];
    if (cat === 'weapons') {
        items = [...(EQUIPMENT_DB.weapons[player.class] || [])];
    } else {
        items = [...(EQUIPMENT_DB.armor[cat] || [])];
    }
    
    if (items.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Нет предметов в этой категории</p>';
        return;
    }
    
    // Сортировка по уровню и редкости
    items.sort((a, b) => {
        if (a.lvl !== b.lvl) return a.lvl - b.lvl;
        return getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
    });
    
    let html = '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">';
    
    for (let item of items) {
        const canBuy = player.gold >= item.price && player.level >= item.lvl;
        const locked = player.level < item.lvl;
        
        const statsText = getItemStatsDescription(item);
        const rarityColor = getRarityColor(item.rarity);
        const rarityDisplay = getRarityDisplay(item.rarity);
        
        // Уровневая полоска (визуально показывает насколько предмет доступен)
        const levelDiff = item.lvl - player.level;
        let levelStatus = '';
        if (levelDiff <= 0) {
            levelStatus = '<span style="color: #2ecc71;">✅ Доступно</span>';
        } else {
            levelStatus = `<span style="color: #e74c3c;">🔒 Требуется ${item.lvl} уровень (ещё ${levelDiff})</span>`;
        }
        
        html += `<div class="item-card" style="${canBuy ? 'cursor: pointer;' : 'opacity:0.7;'} background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 14px;" onclick="${canBuy ? `buyItemKeepOpen('${cat}', '${item.name.replace(/'/g, "\\'")}')` : ''}">
            <div style="display: flex; gap: 14px;">
                <div style="font-size: 42px;">${item.icon || (cat === 'weapons' ? '⚔️' : '🛡️')}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px; color: ${rarityColor};">${item.name}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin: 5px 0;">${statsText}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                        <div style="font-size: 10px; color: ${rarityColor};">${rarityDisplay}</div>
                        <div style="font-size: 10px;">${levelStatus}</div>
                    </div>
                </div>
                <div style="color: var(--gold); font-weight: 700; font-size: 16px; white-space: nowrap;">💰 ${item.price}</div>
            </div>
            ${!canBuy && !locked ? '<div style="margin-top: 8px; font-size: 10px; color: #e74c3c; text-align: center;">❌ Не хватает золота</div>' : ''}
        </div>`;
    }
    
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function sellResourceKeepOpen(resName, pricePerUnit) {
    const count = player.resources[resName];
    if (!count || count <= 0) return;
    
    player.gold += count * pricePerUnit;
    delete player.resources[resName];
    saveGame();
    addMessage(`💰 Продано ${count}x ${resName} за ${count * pricePerUnit} золота!`, 'success');
    refreshCurrentCategory();
}

function sellItemKeepOpen(type, index, price) {
    let itemsList = null;
    
    switch(type) {
        case 'weapon': itemsList = player.inventory.weapons; break;
        case 'helmet': itemsList = player.inventory.helmets; break;
        case 'chest': itemsList = player.inventory.chests; break;
        case 'pants': itemsList = player.inventory.pants; break;
        case 'boots': itemsList = player.inventory.boots; break;
        case 'potion': itemsList = player.inventory.potions; break;
        case 'food': itemsList = player.inventory.foods; break;
        case 'elixir': itemsList = player.inventory.elixirs; break;
        case 'scroll': itemsList = player.inventory.scrolls; break;
        case 'stone': itemsList = player.inventory.stones; break;
        default: return;
    }
    
    if (!itemsList || index >= itemsList.length) return;
    
    const item = itemsList[index];
    if (!item) return;
    
    let finalPrice = price;
    if (item.sellPrice) finalPrice = item.sellPrice;

    player.gold += price;
    itemsList.splice(index, 1);
    saveGame();
    addMessage(`💰 Продано: ${item.name} за ${price} золота!`, 'success');
    refreshCurrentCategory();
}

function buyItemKeepOpen(cat, name) {
    let items = [];
    if (cat === 'weapons') {
        items = EQUIPMENT_DB.weapons[player.class] || [];
    } else {
        items = EQUIPMENT_DB.armor[cat] || [];
    }
    
    const item = items.find(i => i.name === name);
    if (!item) return;
    if (player.gold < item.price) {
        addMessage('❌ Не хватает золота!', 'error');
        return;
    }
    if (player.level < item.lvl) {
        addMessage(`❌ Требуется ${item.lvl} уровень!`, 'error');
        return;
    }
    
    player.gold -= item.price;
    
    const newItem = { 
        name: item.name, 
        rarity: item.rarity, 
        icon: item.icon, 
        dmg: item.dmg || 0, 
        def: item.def || 0, 
        hp: item.hp || 0, 
        crit: item.crit || 0, 
        critDmg: item.critDmg || 0, 
        dodge: item.dodge || 0,
        baseDmg: item.dmg || 0,
        baseDef: item.def || 0,
        upgradeLevel: 0
    };
    
    if (cat === 'weapons') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(newItem);
    } else if (cat === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(newItem);
    } else if (cat === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(newItem);
    } else if (cat === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(newItem);
    } else if (cat === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(newItem);
    }
    
    saveGame();
    addMessage(`✅ Куплено: ${item.name} за ${item.price} золота!`, 'success');
    refreshCurrentCategory();
}

function refreshCurrentCategory() {
    if (!window.currentShopCategory) return;
    
    const goldSpan = document.getElementById('shopGoldAmount');
    if (goldSpan) goldSpan.textContent = player.gold;
    
    const statItems = document.querySelectorAll('.stat-item');
    for (let item of statItems) {
        const iconSpan = item.querySelector('.stat-icon');
        if (iconSpan && iconSpan.textContent === '💰') {
            const valueDiv = item.querySelector('.stat-value');
            if (valueDiv) valueDiv.textContent = player.gold;
            break;
        }
    }
    
    showShopCategory(window.currentShopCategory);
}

// Совместимость
function sellResource(resName, pricePerUnit) {
    sellResourceKeepOpen(resName, pricePerUnit);
}

function sellItemByCategory(category, index, price) {
    sellItemKeepOpen(category, index, price);
}

function buyItem(cat, name) {
    buyItemKeepOpen(cat, name);
}
