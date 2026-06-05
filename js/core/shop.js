// shop.js - Полная рабочая версия

function showShop() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('renderGame', []);
    if (typeof buildItemImgRegistry === 'function') buildItemImgRegistry();
    stopGathering();
    let html = '<h2>🏪 Магазин</h2><p>💰 Золото: <span style="color:var(--gold);" id="shopGoldAmount">' + player.gold + '</span></p><div class="shop-tabs">';
    const tabs = ['Оружие', 'Шлемы', 'Нагрудники', 'Поножи', 'Сапоги', '📜 Свитки добычи', 'Продажа ресурсов', 'Продажа предметов', '🎨 Скины'];
    const categories = ['weapons', 'helmet', 'chest', 'pants', 'boots', 'gatherScrolls', 'sellResources', 'sellItems', 'skins'];
    
    tabs.forEach((t, i) => {
        const isActive = (window.currentShopCategory === categories[i]) || (i === 0 && !window.currentShopCategory);
        html += '<div class="shop-tab' + (isActive ? ' active' : '') + '" data-cat="' + categories[i] + '" onclick="showShopCategory(\'' + categories[i] + '\')">' + t + '</div>';
    });
    html += '</div><div id="shopItems" class="shop-items"></div>';
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
    } else if (cat === 'skins') {
        renderSkins();
    } else if (cat === 'gatherScrolls') {
        renderGatherScrollShop();
    } else {
        renderBuyItems(cat);
    }
}

function renderGatherScrollShop() {
    if (typeof GATHER_SCROLL_TIERS === 'undefined') {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666;">Свитки добычи не загружены</p>';
        return;
    }
    let html = '<h3>📜 Свитки добычи</h3>';
    html += '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Активируются в меню профессии (сбор ресурсов). Авто-сбор только пока вы в этом меню. Тир свитка ограничивает тир ресурса. Опыт снижен.</p>';
    html += '<div class="shop-items-grid shop-items-grid--buy">';
    GATHER_SCROLL_TIERS.forEach(meta => {
        const canBuy = player.gold >= meta.shopPrice && player.level >= meta.minPlayerLevel;
        const locked = player.level < meta.minPlayerLevel;
        const rarityColor = getRarityColor(meta.rarity);
        const mins = Math.round(meta.durationMs / 60000);
        html += '<div class="item-card shop-item-card shop-item-card--buy gather-scroll-shop-card' + (canBuy ? '' : ' shop-item-card--disabled') + '" onclick="' +
            (canBuy ? "buyGatherScroll('" + meta.name.replace(/'/g, "\\'") + "')" : '') + '">';
        html += '<div class="shop-item-card__row">';
        html += '<div class="shop-item-card__icon"><div class="shop-item-card__emoji">' + meta.icon + '</div></div>';
        html += '<div class="shop-item-card__body">';
        html += '<div class="shop-item-card__name" style="color:' + rarityColor + ';">' + meta.name + '</div>';
        html += '<div class="shop-item-card__stats"><ul class="shop-item-card__stat-list">';
        html += '<li class="shop-item-card__stat-line">📜 Тир ресурсов ≤ ' + meta.scrollTier + '</li>';
        html += '<li class="shop-item-card__stat-line">🔄 Сборов: ' + meta.maxGathers + '</li>';
        html += '<li class="shop-item-card__stat-line">⏱️ ' + mins + ' мин</li>';
        html += '<li class="shop-item-card__stat-line">✨ XP ×' + Math.round(meta.expMultiplier * 100) + '%</li>';
        html += '</ul></div>';
        html += '<div class="shop-item-card__meta"><span class="shop-item-card__rarity" style="color:' + rarityColor + ';">' + getRarityDisplay(meta.rarity) + '</span>';
        if (locked) html += '<span class="shop-item-card__warn" style="margin:0;text-align:left;">🔒 Ур. ' + meta.minPlayerLevel + '+</span>';
        html += '</div></div>';
        html += '<div class="shop-item-card__price shop-item-card__price--gold">💰 ' + meta.shopPrice + '</div></div></div>';
    });
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function buyGatherScroll(name) {
    const meta = typeof getGatherScrollMetaByName === 'function' ? getGatherScrollMetaByName(name) : null;
    if (!meta) return;
    if (player.level < meta.minPlayerLevel) {
        addMessage('❌ Недостаточный уровень для покупки!', 'error');
        return;
    }
    if (player.gold < meta.shopPrice) {
        addMessage('❌ Не хватает золота!', 'error');
        return;
    }
    if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
    player.gold -= meta.shopPrice;
    player.inventory.gatherScrolls.push({
        name: meta.name,
        icon: meta.icon,
        rarity: meta.rarity,
        type: 'gather_scroll',
        effect: 'auto_gather',
        scrollTier: meta.scrollTier,
        durationMs: meta.durationMs,
        maxGathers: meta.maxGathers,
        expMultiplier: meta.expMultiplier,
        tier: meta.tier
    });
    saveGame();
    addMessage('📜 Куплен ' + meta.name + '!', 'success');
    const goldSpan = document.getElementById('shopGoldAmount');
    if (goldSpan) goldSpan.textContent = player.gold;
    renderGatherScrollShop();
}

window.buyGatherScroll = buyGatherScroll;

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

// Порядок редкостей для сортировки
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

// Строки характеристик предмета (по одной на строку в карточке)
function collectItemStatsLines(item) {
    const stats = [];
    if (item.dmg) stats.push(`⚔️ Атака: +${item.dmg}`);
    if (item.def) stats.push(`🛡️ Защита: +${item.def}`);
    if (item.hp) stats.push(`❤️ Здоровье: +${item.hp}`);
    if (item.crit) stats.push(`💥 Крит: +${item.crit}%`);
    if (item.critDmg) stats.push(`⭐ Крит урон: +${item.critDmg}%`);
    if (item.dodge) stats.push(`💨 Уклонение: +${item.dodge}%`);
    if (item.mana) stats.push(`🔷 Мана: +${item.mana}`);
    if (item.effect === 'auto_gather' || item.type === 'gather_scroll') {
        const st = item.scrollTier || item.tier || 1;
        stats.push(`📜 Тир ресурсов ≤ ${st}`);
        stats.push(`🔄 Сборов: ${item.maxGathers || '?'}`);
    }
    return stats;
}

function renderItemStatsHtml(item) {
    const lines = collectItemStatsLines(item);
    if (lines.length === 0) {
        return '<span class="shop-item-card__stat-empty">—</span>';
    }
    return '<ul class="shop-item-card__stat-list">' +
        lines.map(line => '<li class="shop-item-card__stat-line">' + line + '</li>').join('') +
        '</ul>';
}

function getItemStatsDescription(item) {
    const lines = collectItemStatsLines(item);
    if (lines.length === 0) return '—';
    return lines.join(' · ');
}

function resolveItemSellPrice(item) {
    if (typeof getItemSellPrice === 'function') {
        return getItemSellPrice(item);
    }
    if (item.sellPrice) return item.sellPrice;
    if (item.price) return Math.floor(item.price * 0.3);
    if (item.effect === 'heal') return Math.floor((item.value || 50) * 2);
    if (item.effect === 'atk' || item.effect === 'def') return Math.floor((item.value || 30) * 3);
    if (item.dmg) return Math.floor((item.dmg || 10) * 8);
    return 25;
}

function pushSellInventoryBatch(allItems, list, type, typeName) {
    if (!list || !list.length) return;
    list.forEach((item, idx) => {
        allItems.push({ ...item, type, typeName, idx });
    });
}

function collectSellableInventoryItems() {
    const allItems = [];
    if (!player.inventory) return allItems;

    pushSellInventoryBatch(allItems, player.inventory.weapons, 'weapon', '⚔️ Оружие');
    pushSellInventoryBatch(allItems, player.inventory.helmets, 'helmet', '⛑️ Шлемы');
    pushSellInventoryBatch(allItems, player.inventory.chests, 'chest', '🛡️ Нагрудники');
    pushSellInventoryBatch(allItems, player.inventory.pants, 'pants', '👖 Поножи');
    pushSellInventoryBatch(allItems, player.inventory.boots, 'boots', '👢 Сапоги');
    pushSellInventoryBatch(allItems, player.inventory.rings, 'ring', '💍 Кольца');
    pushSellInventoryBatch(allItems, player.inventory.necklaces, 'necklace', '📿 Амулеты');
    pushSellInventoryBatch(allItems, player.inventory.stones, 'stone', '💎 Камни');
    pushSellInventoryBatch(allItems, player.inventory.potions, 'potion', '🧪 Зелья здоровья');
    pushSellInventoryBatch(allItems, player.inventory.manaPotions, 'mana_potion', '💎 Зелья маны');
    pushSellInventoryBatch(allItems, player.inventory.foods, 'food', '🍖 Еда');
    pushSellInventoryBatch(allItems, player.inventory.elixirs, 'elixir', '💪 Эликсиры');
    pushSellInventoryBatch(allItems, player.inventory.scrolls, 'scroll', '📜 Свитки');
    pushSellInventoryBatch(allItems, player.inventory.gatherScrolls, 'gather_scroll', '📜 Свитки добычи');

    if (player.inventory.armor && player.inventory.armor.length > 0) {
        for (const item of player.inventory.armor) {
            const name = (item.name || '').toLowerCase();
            let type = 'chest';
            let typeName = '🛡️ Нагрудники';
            if (name.includes('шлем')) { type = 'helmet'; typeName = '⛑️ Шлемы'; }
            else if (name.includes('понож')) { type = 'pants'; typeName = '👖 Поножи'; }
            else if (name.includes('сапог')) { type = 'boots'; typeName = '👢 Сапоги'; }
            const list = player.inventory[type === 'helmet' ? 'helmets' : type === 'pants' ? 'pants' : type === 'boots' ? 'boots' : type === 'chest' ? 'chests' : 'chests'];
            if (!list) continue;
            const idx = list.length;
            list.push(item);
            allItems.push({ ...item, type, typeName, idx });
        }
        player.inventory.armor = [];
    }
    return allItems;
}

function buildShopSellItemCardHtml(item, sellPrice) {
    const statsHtml = renderItemStatsHtml(item);
    const rarityColor = getRarityColor(item.rarity);
    const rarityDisplay = getRarityDisplay(item.rarity);
    const sellDisplay = typeof enrichItemForDisplay === 'function'
        ? enrichItemForDisplay(item)
        : (typeof pickItemVisualFields === 'function'
            ? Object.assign({}, item, pickItemVisualFields(item))
            : item);
    const itemIconHtml = typeof renderItemIconHTML === 'function'
        ? renderItemIconHTML(sellDisplay, { size: 40, fallback: sellDisplay.icon || '📦' })
        : '<div class="shop-item-card__emoji">' + (sellDisplay.icon || '📦') + '</div>';
    return '<div class="item-card shop-item-card" onclick="sellItemKeepOpen(\'' + item.type + '\', ' + item.idx + ', ' + sellPrice + ')">' +
        '<div class="shop-item-card__row">' +
        '<div class="shop-item-card__icon">' + itemIconHtml + '</div>' +
        '<div class="shop-item-card__body">' +
        '<div class="shop-item-card__name" style="color:' + rarityColor + ';">' + item.name + '</div>' +
        '<div class="shop-item-card__stats">' + statsHtml + '</div>' +
        '<div class="shop-item-card__rarity" style="color:' + rarityColor + ';">' + rarityDisplay + '</div>' +
        '</div>' +
        '<div class="shop-item-card__price">💰 +' + sellPrice + '</div>' +
        '</div></div>';
}

function renderSellResources() {
    const resources = Object.keys(player.resources);
    if (resources.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Нет ресурсов для продажи</p>';
        return;
    }
    
    resources.sort();
    
    let html = '<h3 class="shop-panel-title">💰 Продажа ресурсов</h3><div class="shop-items-grid shop-items-grid--resources">';
    const prices = { 
        'Медная руда':5, 'Железная руда':15, 'Серебряная руда':25, 'Золотая руда':40, 'Мифриловая руда':100, 'Адамантит':250, 'Орихалк':500,
        'Аметист':30, 'Изумруд':50, 'Рубин':80, 'Сапфир':80, 'Алмаз':150, 'Звездный камень':300, 'Камень душ':420,'Элементальный кристалл':500,
        'Паутина':8, 'Хлопок':15, 'Шёлк':35, 'Мифриловая нить':80, 'Звёздный шёлк':200,
        'Лечебная трава':4, 'Синий корень':12, 'Сердце леса':20, 'Призрачная грива':35, 'Огненный цветок':90, 'Ледяная роза':80, 'Звездная пыльца':220,
        'Шкура волка':6, 'Шкура медведя':18, 'Шкура тигра':40, 'Чешуя дракона':50, 'Шкура йети':120, 'Кожа феникса':280, 'Шкура дракона':250, 'Шкура левиафана':500,
        'Шкура кролика':4, 'Шкура лисы':6, 'Мелкая шкура':4, 'Кожа':15, 'Толстая кожа':25, 'Выделанная кожа':30, 'Закалённая кожа':50, 'Кожа ящера':60,
        'Шкура элементаля':120, 'Чешуя гидры':130, 'Драконья чешуя':240, 'Шкура феникса':280, 'Кожа бехолдера':300, 'Шкура титана':500, 'Чешуя аспекта':650,
        'Сосновая древесина':4, 'Дубовая древесина':14, 'Красное дерево':40, 'Эбеновое дерево':100, 'Серебряное дерево':120, 'Древесина мирового древа':240,
        'Речная форель':5, 'Окунь':4, 'Плотва':3, 'Озерный карп':15, 'Щука':18, 'Ледяной сиг':20,
        'Морской окунь':45, 'Палтус':50, 'Красный тунец':55, 'Глубоководный тунец':110, 'Королевский лосось':130, 'Морской змей':150,
        'Золотая рыбка':300, 'Жемчужина глубин':350, 'Дракон моря':650, 'Богиня моря':950, 'Левиафан бруйна':1400
    };
    
    for (let res of resources) {
        const count = player.resources[res];
        const price = prices[res] || 10;
        const totalPrice = count * price;
        const resIcon = typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(res, { size: 36, fallback: resolveItemIcon(res, '📦') })
            : '<div style="font-size:28px">📦</div>';
        html += `<div class="item-card shop-item-card" onclick="sellResourceKeepOpen('${res.replace(/'/g, "\\'")}', ${price})">
            <div class="shop-item-card__row">
            ${resIcon}
            <div class="shop-item-card__body">
                <div class="shop-item-card__name">${res}</div>
                <div class="shop-item-card__stats"><ul class="shop-item-card__stat-list">
                    <li class="shop-item-card__stat-line">📦 ${count} шт.</li>
                    <li class="shop-item-card__stat-line">💰 ${price} за ед.</li>
                </ul></div>
            </div>
            <div class="shop-item-card__price shop-item-card__price--gold">💰 ${totalPrice}</div>
            </div></div>`;
    }
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function renderSellItems() {
    const allItems = collectSellableInventoryItems();

    if (allItems.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p class="shop-empty">Нет предметов для продажи</p>';
        return;
    }

    const typeOrder = {
        '⚔️ Оружие': 1,
        '⛑️ Шлемы': 2,
        '🛡️ Нагрудники': 3,
        '👖 Поножи': 4,
        '👢 Сапоги': 5,
        '💍 Кольца': 6,
        '📿 Амулеты': 7,
        '💎 Камни': 8,
        '🧪 Зелья': 9,
        '🍖 Еда': 10,
        '💪 Эликсиры': 11,
        '📜 Свитки': 12,
        '📜 Свитки добычи': 13
    };

    allItems.sort((a, b) => {
        const typeCompare = (typeOrder[a.typeName] || 99) - (typeOrder[b.typeName] || 99);
        if (typeCompare !== 0) return typeCompare;
        const rarityCompare = getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
        if (rarityCompare !== 0) return rarityCompare;
        return (a.name || '').localeCompare(b.name || '', 'ru');
    });

    let html = '<h3 class="shop-panel-title">💰 Продажа предметов</h3>';
    let currentType = '';
    let gridOpen = false;

    for (const item of allItems) {
        if (currentType !== item.typeName) {
            if (gridOpen) html += '</div>';
            currentType = item.typeName;
            const countInType = allItems.filter(i => i.typeName === currentType).length;
            html += '<h4 class="shop-section-title">' + currentType + ' (' + countInType + ')</h4>';
            html += '<div class="shop-items-grid shop-items-grid--sell">';
            gridOpen = true;
        }
        html += buildShopSellItemCardHtml(item, resolveItemSellPrice(item));
    }
    if (gridOpen) html += '</div>';

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
    
    items.sort((a, b) => {
        if (a.lvl !== b.lvl) return a.lvl - b.lvl;
        return getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
    });
    
    let html = '<div class="shop-items-grid shop-items-grid--buy">';
    
    for (let item of items) {
        const canBuy = player.gold >= item.price && player.level >= item.lvl;
        const locked = player.level < item.lvl;
        
        const statsHtml = renderItemStatsHtml(item);
        const rarityColor = getRarityColor(item.rarity);
        const rarityDisplay = getRarityDisplay(item.rarity);
        
        const levelDiff = item.lvl - player.level;
        let levelStatus = '';
        if (levelDiff <= 0) {
            levelStatus = '<span style="color: #2ecc71;">✅ Доступно</span>';
        } else {
            levelStatus = `<span style="color: #e74c3c;">🔒 Требуется ${item.lvl} уровень (ещё ${levelDiff})</span>`;
        }
        
        // Принудительно проставляем иконку для брони (как в крафтах)
        var itemIcon = item.icon || '';
        if (!itemIcon && cat !== 'weapons') {
            var iconMap = { 'helmet': '⛑️', 'chest': '🛡️', 'pants': '👖', 'boots': '👢' };
            itemIcon = iconMap[cat] || '🛡️';
        }
        var shopDisplayItem = typeof enrichItemForDisplay === 'function'
            ? enrichItemForDisplay(item)
            : item;
        if (!shopDisplayItem.icon) shopDisplayItem.icon = itemIcon;
        html += `<div class="item-card shop-item-card shop-item-card--buy${canBuy ? '' : ' shop-item-card--disabled'}" onclick="${canBuy ? `buyItemKeepOpen('${cat}', '${item.name.replace(/'/g, "\\'")}')` : ''}">
            <div class="shop-item-card__row">
                <div class="shop-item-card__icon">${typeof renderItemIconHTML === 'function' ? renderItemIconHTML(shopDisplayItem, { size: 48, fallback: itemIcon || (cat === 'weapons' ? '⚔️' : '🛡️') }) : '<div class="shop-item-card__emoji">' + (itemIcon || '📦') + '</div>'}</div>
                <div class="shop-item-card__body">
                    <div class="shop-item-card__name" style="color: ${rarityColor};">${item.name}</div>
                    <div class="shop-item-card__stats">${statsHtml}</div>
                    <div class="shop-item-card__meta">
                        <span class="shop-item-card__rarity" style="color: ${rarityColor};">${rarityDisplay}</span>
                        <span>${levelStatus}</span>
                    </div>
                </div>
                <div class="shop-item-card__price shop-item-card__price--gold">💰 ${item.price}</div>
            </div>
            ${!canBuy && !locked ? '<div class="shop-item-card__warn">❌ Не хватает золота</div>' : ''}
        </div>`;
    }
    
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

function renderSkins() {
    if (typeof getSkinsForCurrentSchool === 'undefined') {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Система скинов не загружена</p>';
        return;
    }
    
    const skins = getSkinsForCurrentSchool();
    if (skins.length === 0) {
        document.getElementById('shopItems').innerHTML = '<p style="color:#666; text-align: center; padding: 20px;">Нет доступных скинов для вашей школы</p>';
        return;
    }
    
    const currentSkinId = getCurrentSkin();
    
    skins.sort((a, b) => {
        if (a.price === 0) return -1;
        if (b.price === 0) return 1;
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
    });
    
    let html = '<h3>🎨 Скины персонажа</h3>';
    html += `<div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; margin-bottom: 15px;">
        <div style="font-size: 12px; color: var(--gold);">👤 Ваш класс: ${player.class} · ${player.branch}</div>
        <div style="font-size: 11px; color: #aaa; margin-top: 5px;">Скины меняют внешний вид вашего персонажа в бою</div>
    </div>`;
    html += '<div class="item-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">';
    
    for (let skin of skins) {
        const isOwned = skin.unlocked || skin.price === 0;
        const isEquipped = currentSkinId === skin.id;
        const rarityColor = getRarityColor(skin.rarity);
        const rarityDisplay = getRarityDisplay(skin.rarity);
        
        html += `<div class="item-card" style="background: rgba(0,0,0,0.2); border: 2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}; border-radius: 10px; padding: 14px; ${!isOwned ? 'opacity:0.8;' : ''}">
            <div style="display: flex; gap: 14px;">
                <div style="font-size: 48px; text-align: center; min-width: 60px;">
                    <img src="${skin.img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 10px;" onerror="this.style.display='none';this.parentElement.innerHTML='${skin.icon}'">
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px; color: ${rarityColor};">${skin.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary); margin: 5px 0;">${skin.description}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                        <div style="font-size: 10px; color: ${rarityColor};">${rarityDisplay}</div>
                        ${isEquipped ? '<div style="font-size: 10px; color: #2ecc71;">✅ Экипирован</div>' : ''}
                        ${!isOwned ? `<div style="font-size: 10px; color: var(--gold);">💰 ${skin.price}</div>` : ''}
                    </div>
                </div>
            </div>
            <div style="margin-top: 10px;">
                ${!isOwned ? 
                    `<button class="action-btn" onclick="buyAndEquipSkinFromShop('${skin.id}')" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #f39c12, #e67e22);">💰 Купить за ${skin.price}</button>` :
                    (isEquipped ? 
                        `<button class="action-btn" disabled style="width: 100%; padding: 8px; opacity: 0.5;">✅ Экипирован</button>` :
                        `<button class="action-btn" onclick="equipSkinFromShop('${skin.id}')" style="width: 100%; padding: 8px;">✨ Экипировать</button>`
                    )
                }
            </div>
        </div>`;
    }
    
    html += '</div>';
    document.getElementById('shopItems').innerHTML = html;
}

// Функции для работы со скинами из магазина
function buyAndEquipSkinFromShop(skinId) {
    if (typeof buySkin !== 'undefined') {
        if (buySkin(skinId)) {
            refreshCurrentCategory();
            renderGame();
        }
    }
}

function equipSkinFromShop(skinId) {
    if (typeof equipSkin !== 'undefined') {
        if (equipSkin(skinId)) {
            refreshCurrentCategory();
            renderGame();
        }
    }
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
        case 'mana_potion': itemsList = player.inventory.manaPotions; break;
        case 'food': itemsList = player.inventory.foods; break;
        case 'elixir': itemsList = player.inventory.elixirs; break;
        case 'scroll': itemsList = player.inventory.scrolls; break;
        case 'stone': itemsList = player.inventory.stones; break;
        case 'ring': itemsList = player.inventory.rings; break;
        case 'necklace': itemsList = player.inventory.necklaces; break;
        case 'gather_scroll': itemsList = player.inventory.gatherScrolls; break;
        default: return;
    }
    
    if (!itemsList || index >= itemsList.length) return;
    
    const item = itemsList[index];
    if (!item) return;

    if (type === 'ring' && player.equipment && player.equipment.ring === item) {
        player.equipment.ring = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'necklace' && player.equipment && player.equipment.necklace === item) {
        player.equipment.necklace = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'weapon' && player.equipment && player.equipment.weapon === item) {
        player.equipment.weapon = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'helmet' && player.equipment && player.equipment.helmet === item) {
        player.equipment.helmet = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'chest' && player.equipment && player.equipment.chest === item) {
        player.equipment.chest = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'pants' && player.equipment && player.equipment.pants === item) {
        player.equipment.pants = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    if (type === 'boots' && player.equipment && player.equipment.boots === item) {
        player.equipment.boots = null;
        if (typeof resetBaseStats === 'function') resetBaseStats();
    }
    
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
    
    const visuals = typeof pickItemVisualFields === 'function' ? pickItemVisualFields(item) : { icon: item.icon, img: item.img || '' };
    const newItem = { 
        name: item.name, 
        rarity: item.rarity, 
        icon: visuals.icon, 
        img: visuals.img,
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

// Совместимость со старыми функциями
function sellResource(resName, pricePerUnit) {
    sellResourceKeepOpen(resName, pricePerUnit);
}

function sellItemByCategory(category, index, price) {
    sellItemKeepOpen(category, index, price);
}

function buyItem(cat, name) {
    buyItemKeepOpen(cat, name);
}

window.collectSellableInventoryItems = collectSellableInventoryItems;
window.resolveItemSellPrice = resolveItemSellPrice;
window.buildShopSellItemCardHtml = buildShopSellItemCardHtml;