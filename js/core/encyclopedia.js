// encyclopedia.js - Полный справочник игры
// Версия 2.0: Улучшенный UI/UX, адаптивность, поиск

const ENCYCLOPEDIA_DATA = {
    locations: [],
    bosses: [],
    resources: [],
    crafts: [],
    dungeons: []
};

function buildEncyclopediaData() {
    // Очистка данных перед rebuild
    ENCYCLOPEDIA_DATA.locations = [];
    ENCYCLOPEDIA_DATA.bosses = [];
    ENCYCLOPEDIA_DATA.resources = [];
    ENCYCLOPEDIA_DATA.crafts = [];
    ENCYCLOPEDIA_DATA.dungeons = [];
    
    // === ЛОКАЦИИ И МОНСТРЫ ===
    if (typeof LOCATIONS !== 'undefined') {
        LOCATIONS.forEach((loc, locIndex) => {
            const locationData = {
                name: loc.name,
                icon: loc.icon,
                minLvl: loc.minLvl,
                maxLvl: loc.maxLvl,
                desc: loc.desc,
                goldMult: loc.goldMult,
                monsters: []
            };
            
            if (loc.monsters) {
                loc.monsters.forEach(monster => {
                    const monsterData = {
                        name: monster.name,
                        icon: monster.icon,
                        hp: monster.hp,
                        atk: monster.atk,
                        def: monster.def,
                        exp: monster.exp,
                        isBoss: monster.isBoss || false,
                        abilities: monster.abilities || []
                    };
                    locationData.monsters.push(monsterData);
                    
                    if (monster.isBoss) {
                        ENCYCLOPEDIA_DATA.bosses.push({
                            name: monster.name,
                            icon: monster.icon,
                            location: loc.name,
                            hp: monster.hp,
                            atk: monster.atk,
                            def: monster.def,
                            exp: monster.exp,
                            abilities: monster.abilities || [],
                            drops: getBossDrops(monster.name)
                        });
                    }
                });
            }
            
            ENCYCLOPEDIA_DATA.locations.push(locationData);
        });
    }
    
    // === РЕСУРСЫ ===
    if (typeof RESOURCES_DB !== 'undefined') {
        Object.keys(RESOURCES_DB).forEach(profId => {
            const prof = RESOURCES_DB[profId];
            prof.forEach(res => {
                const bossSources = getBossDropSources(res.name);
                
                // Иконка ресурса: приоритет - icon, затем emoji по типу
                let resourceIcon = res.icon || '📦';
                if (profId === 'mining') resourceIcon = res.icon || '🪨';
                else if (profId === 'herbalism') resourceIcon = res.icon || '🌿';
                else if (profId === 'lumberjack') resourceIcon = res.icon || '🪵';
                else if (profId === 'skinning') resourceIcon = res.icon || '🐾';
                else if (profId === 'boss_drop') resourceIcon = res.icon || '💀';
                
                ENCYCLOPEDIA_DATA.resources.push({
                    name: res.name,
                    icon: resourceIcon,
                    tier: res.tier,
                    profession: getProfessionName(profId),
                    locations: res.locations || [],
                    time: res.time,
                    exp: res.exp,
                    isBossDrop: res.bossDrop || false,
                    bossChance: res.bossChance ? (res.bossChance * 100).toFixed(1) + '%' : null,
                    bossSources: bossSources
                });
            });
        });
    }
    
    // === РЕЦЕПТЫ КРАФТА ===
    if (typeof CRAFTING_RECIPES !== 'undefined') {
        Object.keys(CRAFTING_RECIPES).forEach(profId => {
            const categories = CRAFTING_RECIPES[profId];
            Object.keys(categories).forEach(catId => {
                const items = categories[catId];
                items.forEach(item => {
                    // Иконка предмета: приоритет - icon, затем emoji по категории
                    let craftIcon = item.icon || '📦';
                    if (catId === 'weapons') craftIcon = item.icon || '⚔️';
                    else if (catId === 'armor') craftIcon = item.icon || '🛡️';
                    else if (catId === 'potions') craftIcon = item.icon || '🧪';
                    else if (catId === 'foods') craftIcon = item.icon || '🍖';
                    else if (catId === 'scrolls') craftIcon = item.icon || '📜';
                    else if (catId === 'jewelry') craftIcon = item.icon || '💍';
                    
                    ENCYCLOPEDIA_DATA.crafts.push({
                        name: item.name,
                        icon: craftIcon,
                        profession: getProfessionName(profId),
                        category: getCategoryName(catId),
                        tier: item.tier,
                        rarity: item.rarity,
                        class: item.class || 'Все',
                        time: item.time,
                        exp: item.exp,
                        resources: item.resources || {}
                    });
                });
            });
        });
    }
    
    // === ПОДЗЕМЕЛЬЯ ===
    if (typeof DUNGEONS_DB !== 'undefined') {
        DUNGEONS_DB.forEach(dungeon => {
            ENCYCLOPEDIA_DATA.dungeons.push({
                id: dungeon.id,
                name: dungeon.name,
                icon: dungeon.icon,
                mode: dungeon.mode === 'duo' ? 'Командный' : 'Одиночный',
                minLevel: dungeon.minLevel,
                maxLevel: dungeon.maxLevel,
                recommendedLevel: dungeon.recommendedLevel,
                floors: `${dungeon.floors?.min || 2}-${dungeon.floors?.max || 3}`,
                monsterPool: dungeon.monsterPool || [],
                finalBoss: dungeon.finalBossId || null,
                goldMult: dungeon.goldMult,
                expMult: dungeon.expMult
            });
        });
    }
}

function getProfessionName(profId) {
    const names = {
        'mining': 'Горное дело',
        'herbalism': 'Травничество',
        'lumberjack': 'Лесозаготовка',
        'skinning': 'Кожевничество',
        'clothier': 'Портняжное дело',
        'fishing': 'Рыболовство',
        'blacksmith': 'Кузнечное дело',
        'leatherworking': 'Кожевничество',
        'tailoring': 'Портняжное дело',
        'jewelry': 'Ювелирное дело',
        'alchemy': 'Алхимия',
        'cooking': 'Кулинария',
        'scrollcraft': 'Свиткотворчество',
        'boss_drop': 'С боссов'
    };
    return names[profId] || profId;
}

function getCategoryName(catId) {
    const names = {
        'weapons': 'Оружие',
        'armor': 'Броня',
        'potions': 'Зелья',
        'foods': 'Еда',
        'scrolls': 'Свитки',
        'gems': 'Камни',
        'rings': 'Кольца',
        'amulets': 'Амулеты'
    };
    return names[catId] || catId;
}

function getBossDrops(bossName) {
    // Таблица дропа с боссов
    const drops = {
        'Бог бесконечности': ['Слёзы божества (5%)', 'Искра творца (3%)', 'Камень душ (15%)', 'Звездный камень (25%)'],
        'Титан-разрушитель': ['Орихалк (20%)', 'Адамантит (35%)', 'Шкура титана (8%)'],
        'Бог хаоса': ['Эссенция пустоты (8%)', 'Камень душ (12%)', 'Звездный камень (20%)'],
        'Легендарный кракен': ['Жемчужина глубин (15%)', 'Шкура левиафана (5%)', 'Драконья чешуя (25%)'],
        'Богиня моря': ['Левиафан бруйна (3%)', 'Жемчужина глубин (20%)', 'Дракон моря (8%)'],
        'Дракон забвения': ['Искра творца (4%)', 'Эссенция пустоты (10%)', 'Слёзы божества (6%)', 'Камень душ (20%)', 'Звездный камень (30%)']
    };
    return drops[bossName] || ['Нет данных'];
}

function getBossNameById(bossId) {
    // Преобразуем ID босса в имя
    const bossNames = {
        'three_headed_hydra': 'Трёхголовая гидра',
        'ash_lord': 'Пепельный лорд',
        'glacier_heart': 'Ледяное сердце',
        'distorted_warden': 'Искажённый страж',
        'neon_dragon': 'Неоновый дракон',
        'crystal_sentinel': 'Кристальный страж',
        'fungal_matriarch': 'Грибная матриарх',
        'infinity_god': 'Бог бесконечности',
        'oblivion_dragon': 'Дракон забвения'
    };
    return bossNames[bossId] || bossId;
}

function getBossDropSources(resourceName) {
    // С каких боссов падает ресурс
    const sources = {
        'Слёзы божества': ['Бог бесконечности (5%)', 'Дракон забвения (6%)'],
        'Искра творца': ['Бог бесконечности (3%)', 'Дракон забвения (4%)'],
        'Эссенция пустоты': ['Бог хаоса (8%)', 'Дракон забвения (10%)'],
        'Камень душ': ['Бог бесконечности (15%)', 'Бог хаоса (12%)', 'Дракон забвения (20%)'],
        'Звездный камень': ['Бог бесконечности (25%)', 'Бог хаоса (20%)', 'Дракон забвения (30%)'],
        'Шкура титана': ['Титан-разрушитель (8%)'],
        'Орихалк': ['Титан-разрушитель (20%)'],
        'Адамантит': ['Титан-разрушитель (35%)'],
        'Жемчужина глубин': ['Легендарный кракен (15%)', 'Богиня моря (20%)'],
        'Шкура левиафана': ['Легендарный кракен (5%)'],
        'Драконья чешуя': ['Легендарный кракен (25%)'],
        'Левиафан бруйна': ['Богиня моря (3%)'],
        'Дракон моря': ['Богиня моря (8%)']
    };
    return sources[resourceName] || null;
}

function showEncyclopedia() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showEncyclopedia', []);
    
    buildEncyclopediaData();
    
    let html = '<div class="encyclopedia-container">';
    html += '<div class="encyclopedia-header">';
    html += '<h2 class="encyclopedia-title">📖 Справочник Этерии</h2>';
    html += '<p class="encyclopedia-subtitle">Полная база знаний по миру игры</p>';
    html += '</div>';
    
    // Навигация по разделам
    html += '<div class="encyclopedia-nav">';
    html += '<button class="encyclopedia-tab active" data-tab="locations"><span class="tab-icon">🗺️</span><span class="tab-text">Локации</span></button>';
    html += '<button class="encyclopedia-tab" data-tab="bosses"><span class="tab-icon">💀</span><span class="tab-text">Боссы</span></button>';
    html += '<button class="encyclopedia-tab" data-tab="resources"><span class="tab-icon">⛏️</span><span class="tab-text">Ресурсы</span></button>';
    html += '<button class="encyclopedia-tab" data-tab="crafts"><span class="tab-icon">⚒️</span><span class="tab-text">Рецепты</span></button>';
    html += '<button class="encyclopedia-tab" data-tab="dungeons"><span class="tab-icon">🏰</span><span class="tab-text">Подземелья</span></button>';
    html += '</div>';
    
    // Контент
    html += '<div class="encyclopedia-content">';
    
    // === ЛОКАЦИИ ===
    html += '<div class="encyclopedia-section active" id="encyclopedia-locations">';
    html += '<div class="section-header">';
    html += '<h3>🗺️ Локации мира</h3>';
    html += '<input type="text" class="encyclopedia-search" placeholder="🔍 Поиск локации..." oninput="filterEncyclopedia(\'locations\', this.value)">';
    html += '</div>';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.locations.forEach(loc => {
        html += '<div class="encyclopedia-card location-card" data-name="' + loc.name.toLowerCase() + '">';
        html += '<div class="card-banner" style="background: ' + (loc.bgColor || 'linear-gradient(135deg, #2a3a5a, #101828)') + '">';
        html += '<span class="card-icon-large">' + loc.icon + '</span>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<h4 class="card-title">' + loc.name + '</h4>';
        html += '<div class="loc-badges">';
        html += '<span class="badge badge-level">📊 ' + loc.minLvl + '-' + loc.maxLvl + ' ур.</span>';
        html += '<span class="badge badge-gold">💰 ×' + loc.goldMult + '</span>';
        html += '</div>';
        html += '<p class="loc-desc">' + loc.desc + '</p>';
        
        if (loc.monsters && loc.monsters.length > 0) {
            const bossCount = loc.monsters.filter(m => m.isBoss).length;
            const normalCount = loc.monsters.length - bossCount;
            html += '<div class="loc-monsters">';
            html += '<div class="loc-monsters-title">';
            html += '<span>👹 Монстры</span>';
            html += '<span class="monster-count">(' + loc.monsters.length + ')</span>';
            html += '</div>';
            html += '<div class="monster-list">';
            loc.monsters.forEach((monster, idx) => {
                const bossClass = monster.isBoss ? ' monster-boss' : '';
                const bossBadge = monster.isBoss ? ' <span class="boss-badge-mini">💀 БОСС</span>' : '';
                html += '<div class="monster-item' + bossClass + '">';
                html += '<span class="monster-icon">' + monster.icon + '</span>';
                html += '<span class="monster-name">' + monster.name + bossBadge + '</span>';
                html += '<div class="monster-stats-compact">';
                html += '<span class="stat-mini hp">❤️' + monster.hp + '</span>';
                html += '<span class="stat-mini atk">⚔️' + monster.atk + '</span>';
                html += '<span class="stat-mini def">🛡️' + monster.def + '</span>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div></div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === БОССЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-bosses">';
    html += '<div class="section-header">';
    html += '<h3>💀 Легендарные боссы</h3>';
    html += '<input type="text" class="encyclopedia-search" placeholder="🔍 Поиск босса..." oninput="filterEncyclopedia(\'bosses\', this.value)">';
    html += '</div>';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.bosses.forEach(boss => {
        html += '<div class="encyclopedia-card boss-card" data-name="' + boss.name.toLowerCase() + '">';
        html += '<div class="boss-header">';
        html += '<span class="boss-icon">' + boss.icon + '</span>';
        html += '<div class="boss-info">';
        html += '<h4 class="boss-name">' + boss.name + '</h4>';
        html += '<span class="boss-location">📍 ' + boss.location + '</span>';
        html += '</div></div>';
        html += '<div class="boss-stats-grid">';
        html += '<div class="stat-box hp"><span class="stat-icon">❤️</span><span class="stat-value">' + boss.hp + '</span><span class="stat-label">HP</span></div>';
        html += '<div class="stat-box atk"><span class="stat-icon">⚔️</span><span class="stat-value">' + boss.atk + '</span><span class="stat-label">ATK</span></div>';
        html += '<div class="stat-box def"><span class="stat-icon">🛡️</span><span class="stat-value">' + boss.def + '</span><span class="stat-label">DEF</span></div>';
        html += '<div class="stat-box exp"><span class="stat-icon">⭐</span><span class="stat-value">' + boss.exp + '</span><span class="stat-label">XP</span></div>';
        html += '</div>';
        
        if (boss.abilities && boss.abilities.length > 0) {
            html += '<div class="boss-section">';
            html += '<div class="section-label">⚡ Способности (' + boss.abilities.length + ')</div>';
            html += '<div class="abilities-list">';
            boss.abilities.forEach(ab => {
                const typeClass = 'ability-type-' + ab.type;
                html += '<div class="ability-item ' + typeClass + '">';
                html += '<span class="ability-name">' + ab.name + '</span>';
                html += '<span class="ability-badge">' + getAbilityTypeName(ab.type) + '</span>';
                if (ab.chance) html += '<span class="ability-chance">' + ab.chance + '%</span>';
                html += '</div>';
            });
            html += '</div></div>';
        }
        
        if (boss.drops) {
            html += '<div class="boss-section">';
            html += '<div class="section-label">🎁 Таблица добычи</div>';
            html += '<div class="drops-list">';
            boss.drops.forEach(drop => {
                html += '<span class="drop-item">' + drop + '</span>';
            });
            html += '</div></div>';
        }
        html += '</div>';
    });
    html += '</div></div>';
    
    // === РЕСУРСЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-resources">';
    html += '<div class="section-header">';
    html += '<h3>⛏️ Ресурсы и материалы</h3>';
    html += '<div class="filter-group">';
    html += '<input type="text" class="encyclopedia-search search-wide" placeholder="🔍 Поиск ресурса..." oninput="filterEncyclopedia(\'resources\', this.value)">';
    html += '<select id="resource-tier-filter" onchange="filterResources()" class="filter-select">';
    html += '<option value="all">Все тиры</option>';
    for (let i = 1; i <= 6; i++) {
        html += '<option value="' + i + '">' + i + ' тир</option>';
    }
    html += '</select>';
    html += '<select id="resource-prof-filter" onchange="filterResources()" class="filter-select">';
    html += '<option value="all">Все профессии</option>';
    const profs = [...new Set(ENCYCLOPEDIA_DATA.resources.map(r => r.profession))];
    profs.forEach(prof => {
        html += '<option value="' + prof + '">' + prof + '</option>';
    });
    html += '</select>';
    html += '</div></div>';
    
    html += '<div class="encyclopedia-grid" id="resource-grid">';
    ENCYCLOPEDIA_DATA.resources.forEach(res => {
        const tierColors = ['', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#f1c40f'];
        const tierColor = tierColors[res.tier] || '#3498db';
        const bossDropBadge = res.isBossDrop ? '<span class="badge badge-boss-drop">💀 С босса</span>' : '';
        
        // Рендерим иконку ресурса через renderItemIconHTML (PNG)
        const resourceIconHtml = typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(res, { size: 40, fallback: res.icon || '📦' })
            : '<span class="resource-icon-emoji">' + (res.icon || '📦') + '</span>';
        
        html += '<div class="encyclopedia-card resource-card" data-tier="' + res.tier + '" data-prof="' + res.profession + '" data-name="' + res.name.toLowerCase() + '">';
        html += '<div class="resource-header">';
        html += '<div class="resource-icon-wrapper">' + resourceIconHtml + '</div>';
        html += '<div class="resource-title-group">';
        html += '<h4 class="resource-name">' + res.name + '</h4>';
        html += '<div class="resource-badges">';
        html += '<span class="badge badge-tier" style="background: ' + tierColor + '">T' + res.tier + '</span>';
        html += bossDropBadge;
        html += '</div></div></div>';
        
        html += '<div class="resource-body">';
        html += '<div class="info-row"><span class="info-label">🔨 Профессия:</span><span class="info-value">' + res.profession + '</span></div>';
        html += '<div class="info-row"><span class="info-label">⏱️ Время:</span><span class="info-value">' + res.time + ' сек</span></div>';
        html += '<div class="info-row"><span class="info-label">✨ Опыт:</span><span class="info-value">+' + res.exp + ' XP</span></div>';
        
        if (res.locations && res.locations.length > 0) {
            html += '<div class="info-row locations-row"><span class="info-label">📍 Локации:</span><span class="info-value">' + res.locations.join(', ') + '</span></div>';
        }
        if (res.bossChance) {
            html += '<div class="info-row"><span class="info-label">🎲 Шанс:</span><span class="info-value">' + res.bossChance + '</span></div>';
        }
        
        if (res.bossSources && res.bossSources.length > 0) {
            html += '<div class="boss-sources-box">';
            html += '<div class="boss-sources-title">💀 Источники:</div>';
            res.bossSources.forEach(source => {
                html += '<div class="boss-source-item">' + source + '</div>';
            });
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === РЕЦЕПТЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-crafts">';
    html += '<div class="section-header">';
    html += '<h3>⚒️ Рецепты крафта</h3>';
    html += '<div class="filter-group">';
    html += '<input type="text" class="encyclopedia-search search-wide" placeholder="🔍 Поиск рецепта..." oninput="filterEncyclopedia(\'crafts\', this.value)">';
    html += '<select id="craft-tier-filter" onchange="filterCrafts()" class="filter-select">';
    html += '<option value="all">Все тиры</option>';
    for (let i = 1; i <= 6; i++) {
        html += '<option value="' + i + '">' + i + ' тир</option>';
    }
    html += '</select>';
    html += '<select id="craft-prof-filter" onchange="filterCrafts()" class="filter-select">';
    html += '<option value="all">Все профессии</option>';
    const craftProfs = [...new Set(ENCYCLOPEDIA_DATA.crafts.map(c => c.profession))];
    craftProfs.forEach(prof => {
        html += '<option value="' + prof + '">' + prof + '</option>';
    });
    html += '</select>';
    html += '</div></div>';
    
    html += '<div class="encyclopedia-grid" id="craft-grid">';
    ENCYCLOPEDIA_DATA.crafts.forEach(craft => {
        const tierColors = ['', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#f1c40f'];
        const tierColor = tierColors[craft.tier] || '#3498db';
        const rarityColors = { 'Обычный': '#bdc3c7', 'Редкий': '#3498db', 'Эпический': '#9b59b6', 'Легендарный': '#f1c40f' };
        const rarityColor = rarityColors[craft.rarity] || '#bdc3c7';
        
        // Рендерим иконку предмета через renderItemIconHTML (PNG)
        const craftIconHtml = typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(craft, { size: 40, fallback: craft.icon || '📦' })
            : '<span class="craft-icon-emoji">' + (craft.icon || '📦') + '</span>';
        
        html += '<div class="encyclopedia-card craft-card" data-tier="' + craft.tier + '" data-prof="' + craft.profession + '" data-name="' + craft.name.toLowerCase() + '">';
        html += '<div class="craft-header">';
        html += '<div class="craft-icon-wrapper">' + craftIconHtml + '</div>';
        html += '<div class="craft-title-group">';
        html += '<h4 class="craft-name">' + craft.name + '</h4>';
        html += '<div class="craft-badges">';
        html += '<span class="badge badge-tier" style="background: ' + tierColor + '">T' + craft.tier + '</span>';
        html += '<span class="badge badge-rarity" style="background: ' + rarityColor + '">' + craft.rarity + '</span>';
        html += '</div></div></div>';
        
        html += '<div class="craft-body">';
        html += '<div class="info-row"><span class="info-label">🔨 Профессия:</span><span class="info-value">' + craft.profession + '</span></div>';
        html += '<div class="info-row"><span class="info-label">📦 Категория:</span><span class="info-value">' + craft.category + '</span></div>';
        if (craft.class !== 'Все') {
            html += '<div class="info-row"><span class="info-label">⚔️ Класс:</span><span class="info-value">' + craft.class + '</span></div>';
        }
        html += '<div class="info-row"><span class="info-label">⏱️ Время:</span><span class="info-value">' + craft.time + ' сек</span></div>';
        html += '<div class="info-row"><span class="info-label">✨ Опыт:</span><span class="info-value">+' + craft.exp + ' XP</span></div>';
        
        if (craft.resources && Object.keys(craft.resources).length > 0) {
            html += '<div class="craft-resources-box">';
            html += '<div class="section-label">📦 Требуемые ресурсы:</div>';
            html += '<div class="resources-grid">';
            Object.entries(craft.resources).forEach(([resName, count]) => {
                html += '<span class="resource-requirement">' + resName + ' <strong>×' + count + '</strong></span>';
            });
            html += '</div></div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === ПОДЗЕМЕЛЬЯ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-dungeons">';
    html += '<div class="section-header">';
    html += '<h3>🏰 Подземелья и рейды</h3>';
    html += '<input type="text" class="encyclopedia-search" placeholder="🔍 Поиск подземелья..." oninput="filterEncyclopedia(\'dungeons\', this.value)">';
    html += '</div>';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.dungeons.forEach(dungeon => {
        html += '<div class="encyclopedia-card dungeon-card" data-name="' + dungeon.name.toLowerCase() + '">';
        html += '<div class="dungeon-banner">';
        html += '<span class="dungeon-icon-large">' + dungeon.icon + '</span>';
        html += '<span class="dungeon-mode-badge">' + dungeon.mode + '</span>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<h4 class="card-title">' + dungeon.name + '</h4>';
        
        html += '<div class="dungeon-stats-grid">';
        html += '<div class="dungeon-stat"><span class="stat-label">Уровни:</span><span class="stat-value">' + dungeon.minLevel + '-' + dungeon.maxLevel + '</span></div>';
        html += '<div class="dungeon-stat"><span class="stat-label">Реком.:</span><span class="stat-value">' + dungeon.recommendedLevel + '</span></div>';
        html += '<div class="dungeon-stat"><span class="stat-label">Этажи:</span><span class="stat-value">' + dungeon.floors + '</span></div>';
        html += '<div class="dungeon-stat"><span class="stat-label">Золото:</span><span class="stat-value">×' + dungeon.goldMult + '</span></div>';
        html += '<div class="dungeon-stat"><span class="stat-label">Опыт:</span><span class="stat-value">×' + dungeon.expMult + '</span></div>';
        html += '</div>';
        
        if (dungeon.monsterPool && dungeon.monsterPool.length > 0) {
            html += '<div class="dungeon-section">';
            html += '<div class="section-label">👹 Монстры (' + dungeon.monsterPool.length + ')</div>';
            html += '<div class="monster-tags">';
            dungeon.monsterPool.slice(0, 6).forEach(monsterId => {
                const monsterName = getBossNameById(monsterId) || monsterId;
                html += '<span class="monster-tag">' + monsterName + '</span>';
            });
            if (dungeon.monsterPool.length > 6) {
                html += '<span class="monster-tag more">+' + (dungeon.monsterPool.length - 6) + '</span>';
            }
            html += '</div></div>';
        }
        
        if (dungeon.finalBoss) {
            const bossName = getBossNameById(dungeon.finalBoss);
            html += '<div class="dungeon-boss-box">';
            html += '<div class="section-label">💀 Финальный босс:</div>';
            html += '<div class="final-boss-name">' + bossName + '</div>';
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    html += '</div></div>';
    
    // Стили - Версия 2.0
    html += '<style>';
    // Container & Header
    html += '.encyclopedia-container { padding: 15px; max-width: 1400px; margin: 0 auto; }';
    html += '.encyclopedia-header { text-align: center; margin-bottom: 20px; }';
    html += '.encyclopedia-title { font-size: 28px; margin: 0 0 5px 0; color: var(--primary); }';
    html += '.encyclopedia-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }';
    
    // Section visibility
    html += '.encyclopedia-section { display: none; animation: fadeIn 0.3s ease; }';
    html += '.encyclopedia-section.active { display: block; }';
    html += '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }';
    
    // Navigation tabs
    html += '.encyclopedia-nav { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; position: sticky; top: 0; z-index: 100; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 12px; backdrop-filter: blur(10px); }';
    html += '.encyclopedia-tab { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: none; border-radius: 8px; background: rgba(255,255,255,0.08); color: var(--text); cursor: pointer; transition: all 0.2s; font-size: 14px; }';
    html += '.encyclopedia-tab:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }';
    html += '.encyclopedia-tab.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }';
    html += '.tab-icon { font-size: 18px; }';
    html += '.tab-text { font-weight: 500; }';
    
    // Section header & search
    html += '.section-header { margin-bottom: 15px; }';
    html += '.section-header h3 { margin: 0 0 12px 0; font-size: 20px; color: var(--text); }';
    html += '.encyclopedia-search { width: 100%; max-width: 400px; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: var(--text); font-size: 14px; }';
    html += '.encyclopedia-search:focus { outline: none; border-color: var(--primary); }';
    html += '.search-wide { max-width: 100%; }';
    html += '.filter-group { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }';
    html += '.filter-select { padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: var(--text); font-size: 13px; cursor: pointer; }';
    html += '.filter-select:focus { outline: none; border-color: var(--primary); }';
    
    // Grid & Cards
    html += '.encyclopedia-content { position: relative; }';
    html += '.encyclopedia-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }';
    html += '.encyclopedia-card { background: rgba(0,0,0,0.35); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; transition: all 0.2s; }';
    html += '.encyclopedia-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.15); }';
    html += '.card-body { padding: 14px; }';
    html += '.card-title { font-size: 16px; font-weight: bold; color: var(--primary); margin: 0 0 8px 0; }';
    
    // Badges
    html += '.badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin: 2px; color: white; }';
    html += '.badge-level { background: rgba(52, 152, 219, 0.8); }';
    html += '.badge-gold { background: rgba(241, 196, 15, 0.8); }';
    html += '.badge-tier { background: rgba(155, 89, 182, 0.8); }';
    html += '.badge-rarity { background: rgba(52, 152, 219, 0.8); }';
    html += '.badge-boss-drop { background: rgba(231, 76, 60, 0.8); }';
    html += '.loc-badges, .resource-badges, .craft-badges { margin: 6px 0; }';
    
    // Location cards
    html += '.card-banner { height: 80px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #2a3a5a, #101828); }';
    html += '.card-icon-large { font-size: 48px; }';
    html += '.loc-desc { font-size: 13px; color: var(--text-secondary); margin: 8px 0; font-style: italic; }';
    html += '.loc-monsters { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }';
    html += '.loc-monsters-title { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; margin-bottom: 8px; }';
    html += '.monster-count { color: var(--text-secondary); font-weight: normal; }';
    html += '.monster-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }';
    html += '.monster-item { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 6px; background: rgba(255,255,255,0.03); }';
    html += '.monster-item.monster-boss { background: rgba(231, 76, 60, 0.1); border-left: 2px solid #e74c3c; }';
    html += '.monster-icon { font-size: 20px; }';
    html += '.monster-name { flex: 1; font-size: 13px; }';
    html += '.monster-stats-compact { display: flex; gap: 6px; font-size: 11px; }';
    html += '.stat-mini { padding: 2px 4px; border-radius: 4px; background: rgba(0,0,0,0.2); }';
    html += '.stat-mini.hp { color: #e74c3c; }';
    html += '.stat-mini.atk { color: #e67e22; }';
    html += '.stat-mini.def { color: #3498db; }';
    html += '.boss-badge-mini { background: #e74c3c; color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-left: 4px; }';
    
    // Boss cards
    html += '.boss-header { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(231, 76, 60, 0.1); border-bottom: 1px solid rgba(231, 76, 60, 0.2); }';
    html += '.boss-icon { font-size: 40px; }';
    html += '.boss-info { flex: 1; }';
    html += '.boss-name { font-size: 17px; font-weight: bold; color: #e74c3c; margin: 0; }';
    html += '.boss-location { font-size: 12px; color: var(--text-secondary); }';
    html += '.boss-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px; }';
    html += '.stat-box { display: flex; flex-direction: column; align-items: center; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.2); }';
    html += '.stat-box .stat-icon { font-size: 18px; }';
    html += '.stat-box .stat-value { font-size: 16px; font-weight: bold; margin: 2px 0; }';
    html += '.stat-box .stat-label { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; }';
    html += '.stat-box.hp { border: 1px solid rgba(231, 76, 60, 0.3); }';
    html += '.stat-box.atk { border: 1px solid rgba(230, 126, 34, 0.3); }';
    html += '.stat-box.def { border: 1px solid rgba(52, 152, 219, 0.3); }';
    html += '.stat-box.exp { border: 1px solid rgba(241, 196, 15, 0.3); }';
    html += '.boss-section { padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); }';
    html += '.section-label { font-size: 12px; font-weight: 600; color: var(--primary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }';
    html += '.abilities-list { display: flex; flex-direction: column; gap: 6px; }';
    html += '.ability-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,0.2); font-size: 12px; }';
    html += '.ability-name { flex: 1; font-weight: 500; }';
    html += '.ability-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; background: rgba(52, 152, 219, 0.2); color: #3498db; }';
    html += '.ability-type-damage .ability-badge { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }';
    html += '.ability-type-heal .ability-badge { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }';
    html += '.ability-type-buff .ability-badge { background: rgba(52, 152, 219, 0.2); color: #3498db; }';
    html += '.ability-type-debuff .ability-badge { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }';
    html += '.ability-type-shield .ability-badge { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }';
    html += '.ability-type-dot .ability-badge { background: rgba(230, 126, 34, 0.2); color: #e67e22; }';
    html += '.ability-type-lifesteal .ability-badge { background: rgba(192, 57, 43, 0.2); color: #c0392b; }';
    html += '.ability-chance { font-size: 11px; color: var(--gold); font-weight: 600; }';
    html += '.drops-list { display: flex; flex-wrap: wrap; gap: 6px; }';
    html += '.drop-item { padding: 4px 8px; border-radius: 6px; background: rgba(241, 196, 15, 0.1); color: #f1c40f; font-size: 11px; }';
    
    // Resource cards
    html += '.resource-header { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,0,0,0.2); }';
    html += '.resource-icon-wrapper { width: 48px; height: 48px; flex-shrink: 0; }';
    html += '.resource-icon-wrapper .item-icon { width: 100%; height: 100%; }';
    html += '.resource-icon-wrapper .item-icon-img { width: 100%; height: 100%; object-fit: contain; }';
    html += '.resource-icon-emoji { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(0,0,0,0.2); border-radius: 8px; }';
    html += '.resource-title-group { flex: 1; }';
    html += '.resource-name { font-size: 15px; font-weight: bold; margin: 0; color: var(--text); }';
    html += '.resource-body { padding: 12px; }';
    html += '.info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.05); }';
    html += '.info-row:last-child { border-bottom: none; }';
    html += '.info-label { color: var(--text-secondary); }';
    html += '.info-value { font-weight: 500; }';
    html += '.locations-row .info-value { font-size: 12px; }';
    html += '.boss-sources-box { margin-top: 10px; padding: 10px; border-radius: 8px; background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.2); }';
    html += '.boss-sources-title { font-size: 12px; font-weight: 600; color: #e74c3c; margin-bottom: 6px; }';
    html += '.boss-source-item { font-size: 11px; color: var(--text); padding: 3px 0; }';
    
    // Craft cards
    html += '.craft-header { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,0,0,0.2); }';
    html += '.craft-icon-wrapper { width: 48px; height: 48px; flex-shrink: 0; }';
    html += '.craft-icon-wrapper .item-icon { width: 100%; height: 100%; }';
    html += '.craft-icon-wrapper .item-icon-img { width: 100%; height: 100%; object-fit: contain; }';
    html += '.craft-icon-emoji { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(0,0,0,0.2); border-radius: 8px; }';
    html += '.craft-title-group { flex: 1; }';
    html += '.craft-name { font-size: 15px; font-weight: bold; margin: 0; color: var(--text); }';
    html += '.craft-body { padding: 12px; }';
    html += '.craft-resources-box { margin-top: 10px; padding: 10px; border-radius: 8px; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.2); }';
    html += '.resources-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }';
    html += '.resource-requirement { padding: 4px 8px; border-radius: 6px; background: rgba(0,0,0,0.2); font-size: 11px; }';
    html += '.resource-requirement strong { color: var(--primary); }';
    
    // Dungeon cards
    html += '.dungeon-banner { height: 70px; display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, #3a2a5a, #1a1028); position: relative; }';
    html += '.dungeon-icon-large { font-size: 42px; }';
    html += '.dungeon-mode-badge { position: absolute; top: 8px; right: 8px; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; background: rgba(155, 89, 182, 0.3); color: #9b59b6; }';
    html += '.dungeon-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 10px 0; }';
    html += '.dungeon-stat { display: flex; flex-direction: column; padding: 6px; border-radius: 6px; background: rgba(0,0,0,0.15); }';
    html += '.dungeon-stat .stat-label { font-size: 10px; color: var(--text-secondary); }';
    html += '.dungeon-stat .stat-value { font-size: 13px; font-weight: 600; color: var(--text); }';
    html += '.dungeon-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }';
    html += '.monster-tags { display: flex; flex-wrap: wrap; gap: 4px; }';
    html += '.monster-tag { padding: 3px 6px; border-radius: 4px; background: rgba(0,0,0,0.2); font-size: 10px; color: var(--text-secondary); }';
    html += '.monster-tag.more { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }';
    html += '.dungeon-boss-box { margin-top: 10px; padding: 10px; border-radius: 8px; background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.2); text-align: center; }';
    html += '.final-boss-name { font-size: 14px; font-weight: bold; color: #e74c3c; }';
    
    // Mobile responsive
    html += '@media (max-width: 768px) {';
    html += '.encyclopedia-container { padding: 10px; }';
    html += '.encyclopedia-title { font-size: 22px; }';
    html += '.encyclopedia-nav { gap: 6px; }';
    html += '.encyclopedia-tab { padding: 8px 12px; font-size: 12px; }';
    html += '.tab-text { display: none; }';
    html += '.encyclopedia-grid { grid-template-columns: 1fr; gap: 12px; }';
    html += '.boss-stats-grid { grid-template-columns: repeat(2, 1fr); }';
    html += '.dungeon-stats-grid { grid-template-columns: repeat(2, 1fr); }';
    html += '.filter-group { flex-direction: column; align-items: stretch; }';
    html += '.filter-select, .encyclopedia-search { width: 100%; max-width: 100%; }';
    html += '.monster-list { max-height: 150px; }';
    html += '}';
    
    html += '</style>';
    
    document.getElementById('dynamicContent').innerHTML = html;
    
    // Навигация по табам
    document.querySelectorAll('.encyclopedia-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.encyclopedia-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.encyclopedia-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('encyclopedia-' + tab.dataset.tab).classList.add('active');
        });
    });
}

function filterEncyclopedia(section, query) {
    const searchQuery = query.toLowerCase().trim();
    const selector = '#' + section + ' .encyclopedia-card';
    document.querySelectorAll(selector).forEach(card => {
        const name = card.dataset.name || '';
        const matches = searchQuery === '' || name.includes(searchQuery);
        card.style.display = matches ? 'block' : 'none';
    });
}

function filterResources() {
    const tierFilter = document.getElementById('resource-tier-filter')?.value || 'all';
    const profFilter = document.getElementById('resource-prof-filter')?.value || 'all';
    const searchQuery = (document.querySelector('#resources .encyclopedia-search')?.value || '').toLowerCase().trim();
    
    document.querySelectorAll('#encyclopedia-resources .resource-card').forEach(card => {
        const tier = card.dataset.tier;
        const prof = card.dataset.prof;
        const name = card.dataset.name || '';
        
        const tierMatch = tierFilter === 'all' || tier === tierFilter;
        const profMatch = profFilter === 'all' || prof === profFilter;
        const searchMatch = searchQuery === '' || name.includes(searchQuery);
        
        card.style.display = (tierMatch && profMatch && searchMatch) ? 'block' : 'none';
    });
}

function filterCrafts() {
    const tierFilter = document.getElementById('craft-tier-filter')?.value || 'all';
    const profFilter = document.getElementById('craft-prof-filter')?.value || 'all';
    const searchQuery = (document.querySelector('#crafts .encyclopedia-search')?.value || '').toLowerCase().trim();
    
    document.querySelectorAll('#encyclopedia-crafts .craft-card').forEach(card => {
        const tier = card.dataset.tier;
        const prof = card.dataset.prof;
        const name = card.dataset.name || '';
        
        const tierMatch = tierFilter === 'all' || tier === tierFilter;
        const profMatch = profFilter === 'all' || prof === profFilter;
        const searchMatch = searchQuery === '' || name.includes(searchQuery);
        
        card.style.display = (tierMatch && profMatch && searchMatch) ? 'block' : 'none';
    });
}

function getAbilityTypeName(type) {
    const names = {
        'buff': 'Бафф',
        'debuff': 'Дебафф',
        'damage': 'Урон',
        'heal': 'Лечение',
        'dot': 'DoT',
        'shield': 'Щит',
        'lifesteal': 'Вампиризм'
    };
    return names[type] || type;
}

// Инициализация при загрузке
if (typeof window !== 'undefined') {
    window.showEncyclopedia = showEncyclopedia;
    window.filterResources = filterResources;
    window.filterCrafts = filterCrafts;
}
