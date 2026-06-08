// encyclopedia.js - Полный справочник игры

const ENCYCLOPEDIA_DATA = {
    locations: [],
    bosses: [],
    resources: [],
    crafts: [],
    dungeons: []
};

function buildEncyclopediaData() {
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
                    
                    // Добавляем боссов в отдельный список
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
                ENCYCLOPEDIA_DATA.resources.push({
                    name: res.name,
                    icon: res.icon,
                    tier: res.tier,
                    profession: getProfessionName(profId),
                    locations: res.locations || [],
                    time: res.time,
                    exp: res.exp,
                    isBossDrop: res.bossDrop || false,
                    bossChance: res.bossChance ? (res.bossChance * 100).toFixed(1) + '%' : null
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
                    ENCYCLOPEDIA_DATA.crafts.push({
                        name: item.name,
                        icon: item.icon,
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
        'Богиня моря': ['Левиафан бруйна (3%)', 'Жемчужина глубин (20%)', 'Дракон моря (8%)']
    };
    return drops[bossName] || ['Нет данных'];
}

function showEncyclopedia() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showEncyclopedia', []);
    
    buildEncyclopediaData();
    
    let html = '<div class="encyclopedia-container">';
    html += '<h2>📖 Справочник Этерии</h2>';
    
    // Навигация по разделам
    html += '<div class="encyclopedia-nav">';
    html += '<button class="encyclopedia-tab active" data-tab="locations">🗺️ Локации</button>';
    html += '<button class="encyclopedia-tab" data-tab="bosses">💀 Боссы</button>';
    html += '<button class="encyclopedia-tab" data-tab="resources">⛏️ Ресурсы</button>';
    html += '<button class="encyclopedia-tab" data-tab="crafts">⚒️ Рецепты</button>';
    html += '<button class="encyclopedia-tab" data-tab="dungeons">🏰 Подземелья</button>';
    html += '</div>';
    
    // Контент
    html += '<div class="encyclopedia-content">';
    
    // === ЛОКАЦИИ ===
    html += '<div class="encyclopedia-section active" id="encyclopedia-locations">';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.locations.forEach(loc => {
        html += '<div class="encyclopedia-card location-card">';
        html += '<div class="card-header">';
        html += '<span class="card-icon">' + loc.icon + '</span>';
        html += '<div class="card-title">' + loc.name + '</div>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="loc-info">📊 Уровни: ' + loc.minLvl + '-' + loc.maxLvl + '</div>';
        html += '<div class="loc-info">💰 Множитель золота: ×' + loc.goldMult + '</div>';
        html += '<div class="loc-desc">' + loc.desc + '</div>';
        
        if (loc.monsters && loc.monsters.length > 0) {
            html += '<div class="loc-monsters">';
            html += '<div class="loc-monsters-title">👹 Монстры (' + loc.monsters.length + '):</div>';
            loc.monsters.forEach((monster, idx) => {
                const bossBadge = monster.isBoss ? '<span class="boss-badge">💀 БОСС</span>' : '';
                html += '<div class="monster-row">';
                html += '<span class="monster-icon">' + monster.icon + '</span>';
                html += '<span class="monster-name">' + monster.name + bossBadge + '</span>';
                html += '<span class="monster-stats">❤️' + monster.hp + ' ⚔️' + monster.atk + ' 🛡️' + monster.def + '</span>';
                if (idx < loc.monsters.length - 1) html += '<hr class="monster-divider">';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === БОССЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-bosses">';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.bosses.forEach(boss => {
        html += '<div class="encyclopedia-card boss-card">';
        html += '<div class="card-header">';
        html += '<span class="card-icon">' + boss.icon + '</span>';
        html += '<div class="card-title">' + boss.name + '</div>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="boss-loc">📍 ' + boss.location + '</div>';
        html += '<div class="boss-stats">';
        html += '<span>❤️ ' + boss.hp + ' HP</span>';
        html += '<span>⚔️ ' + boss.atk + ' ATK</span>';
        html += '<span>🛡️ ' + boss.def + ' DEF</span>';
        html += '<span>⭐ ' + boss.exp + ' XP</span>';
        html += '</div>';
        
        if (boss.abilities && boss.abilities.length > 0) {
            html += '<div class="boss-abilities">';
            html += '<div class="section-title">⚡ Способности:</div>';
            boss.abilities.forEach(ab => {
                html += '<div class="ability-row">';
                html += '<span class="ability-name">' + ab.name + '</span>';
                html += '<span class="ability-type">' + getAbilityTypeName(ab.type) + '</span>';
                if (ab.chance) html += '<span class="ability-chance">' + ab.chance + '%</span>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        if (boss.drops) {
            html += '<div class="boss-drops">';
            html += '<div class="section-title">🎁 Добыча:</div>';
            boss.drops.forEach(drop => {
                html += '<div class="drop-row">' + drop + '</div>';
            });
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === РЕСУРСЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-resources">';
    html += '<div class="encyclopedia-filters">';
    html += '<select id="resource-tier-filter" onchange="filterResources()">';
    html += '<option value="all">Все тиры</option>';
    for (let i = 1; i <= 6; i++) {
        html += '<option value="' + i + '">' + i + ' тир</option>';
    }
    html += '</select>';
    html += '<select id="resource-prof-filter" onchange="filterResources()">';
    html += '<option value="all">Все профессии</option>';
    const profs = [...new Set(ENCYCLOPEDIA_DATA.resources.map(r => r.profession))];
    profs.forEach(prof => {
        html += '<option value="' + prof + '">' + prof + '</option>';
    });
    html += '</select>';
    html += '</div>';
    
    html += '<div class="encyclopedia-grid" id="resource-grid">';
    ENCYCLOPEDIA_DATA.resources.forEach(res => {
        const bossDropBadge = res.isBossDrop ? '<span class="boss-drop-badge">💀 С босса</span>' : '';
        html += '<div class="encyclopedia-card resource-card" data-tier="' + res.tier + '" data-prof="' + res.profession + '">';
        html += '<div class="card-header">';
        html += '<span class="card-icon">' + res.icon + '</span>';
        html += '<div class="card-title">' + res.name + '</div>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="res-info">⭐ Тир ' + res.tier + '</div>';
        html += '<div class="res-info">🔨 ' + res.profession + '</div>';
        html += '<div class="res-info">⏱️ ' + res.time + ' сек</div>';
        html += '<div class="res-info">✨ +' + res.exp + ' XP</div>';
        if (res.locations && res.locations.length > 0) {
            html += '<div class="res-locations">📍 ' + res.locations.join(', ') + '</div>';
        }
        if (res.bossChance) {
            html += '<div class="res-boss-chance">🎲 Шанс: ' + res.bossChance + '</div>';
        }
        html += bossDropBadge;
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === РЕЦЕПТЫ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-crafts">';
    html += '<div class="encyclopedia-filters">';
    html += '<select id="craft-tier-filter" onchange="filterCrafts()">';
    html += '<option value="all">Все тиры</option>';
    for (let i = 1; i <= 6; i++) {
        html += '<option value="' + i + '">' + i + ' тир</option>';
    }
    html += '</select>';
    html += '<select id="craft-prof-filter" onchange="filterCrafts()">';
    html += '<option value="all">Все профессии</option>';
    const craftProfs = [...new Set(ENCYCLOPEDIA_DATA.crafts.map(c => c.profession))];
    craftProfs.forEach(prof => {
        html += '<option value="' + prof + '">' + prof + '</option>';
    });
    html += '</select>';
    html += '</div>';
    
    html += '<div class="encyclopedia-grid" id="craft-grid">';
    ENCYCLOPEDIA_DATA.crafts.forEach(craft => {
        html += '<div class="encyclopedia-card craft-card" data-tier="' + craft.tier + '" data-prof="' + craft.profession + '">';
        html += '<div class="card-header">';
        html += '<span class="card-icon">' + craft.icon + '</span>';
        html += '<div class="card-title">' + craft.name + '</div>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="craft-info">⭐ Тир ' + craft.tier + '</div>';
        html += '<div class="craft-info">🔨 ' + craft.profession + '</div>';
        html += '<div class="craft-info">📦 ' + craft.category + '</div>';
        html += '<div class="craft-info">✨ ' + craft.rarity + '</div>';
        if (craft.class !== 'Все') {
            html += '<div class="craft-info">⚔️ ' + craft.class + '</div>';
        }
        html += '<div class="craft-info">⏱️ ' + craft.time + ' сек</div>';
        html += '<div class="craft-info">✨ +' + craft.exp + ' XP</div>';
        
        if (craft.resources && Object.keys(craft.resources).length > 0) {
            html += '<div class="craft-resources">';
            html += '<div class="section-title">📦 Ресурсы:</div>';
            Object.entries(craft.resources).forEach(([resName, count]) => {
                html += '<div class="resource-row">' + resName + ' ×' + count + '</div>';
            });
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    // === ПОДЗЕМЕЛЬЯ ===
    html += '<div class="encyclopedia-section" id="encyclopedia-dungeons">';
    html += '<div class="encyclopedia-grid">';
    ENCYCLOPEDIA_DATA.dungeons.forEach(dungeon => {
        html += '<div class="encyclopedia-card dungeon-card">';
        html += '<div class="card-header">';
        html += '<span class="card-icon">' + dungeon.icon + '</span>';
        html += '<div class="card-title">' + dungeon.name + '</div>';
        html += '</div>';
        html += '<div class="card-body">';
        html += '<div class="dungeon-info">🎮 ' + dungeon.mode + '</div>';
        html += '<div class="dungeon-info">📊 Уровни: ' + dungeon.minLevel + '-' + dungeon.maxLevel + '</div>';
        html += '<div class="dungeon-info">⭐ Рекомендуется: ' + dungeon.recommendedLevel + '</div>';
        html += '<div class="dungeon-info">🏗️ Этажей: ' + dungeon.floors + '</div>';
        html += '<div class="dungeon-info">💰 Золото: ×' + dungeon.goldMult + '</div>';
        html += '<div class="dungeon-info">✨ Опыт: ×' + dungeon.expMult + '</div>';
        
        if (dungeon.monsterPool && dungeon.monsterPool.length > 0) {
            html += '<div class="dungeon-monsters">';
            html += '<div class="section-title">👹 Монстры:</div>';
            dungeon.monsterPool.slice(0, 5).forEach(monster => {
                html += '<div class="monster-name-small">' + monster + '</div>';
            });
            if (dungeon.monsterPool.length > 5) {
                html += '<div class="monster-more">+ ещё ' + (dungeon.monsterPool.length - 5) + '</div>';
            }
            html += '</div>';
        }
        
        if (dungeon.finalBoss) {
            html += '<div class="dungeon-boss">';
            html += '<div class="section-title">💀 Финальный босс:</div>';
            html += '<div class="boss-name">' + dungeon.finalBoss + '</div>';
            html += '</div>';
        }
        html += '</div></div>';
    });
    html += '</div></div>';
    
    html += '</div></div>';
    
    // Стили
    html += '<style>';
    html += '.encyclopedia-container { padding: 20px; max-width: 1400px; margin: 0 auto; }';
    html += '.encyclopedia-nav { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }';
    html += '.encyclopedia-tab { padding: 10px 20px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: var(--text); cursor: pointer; transition: all 0.3s; }';
    html += '.encyclopedia-tab:hover { background: rgba(255,255,255,0.2); }';
    html += '.encyclopedia-tab.active { background: var(--primary); color: white; }';
    html += '.encyclopedia-section { display: none; }';
    html += '.encyclopedia-section.active { display: block; }';
    html += '.encyclopedia-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; }';
    html += '.encyclopedia-card { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); }';
    html += '.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }';
    html += '.card-icon { font-size: 32px; }';
    html += '.card-title { font-size: 16px; font-weight: bold; color: var(--primary); }';
    html += '.card-body { font-size: 13px; }';
    html += '.loc-info, .res-info, .craft-info, .dungeon-info { margin: 5px 0; }';
    html += '.loc-desc { color: var(--text-secondary); font-style: italic; margin: 8px 0; }';
    html += '.loc-monsters { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }';
    html += '.loc-monsters-title { font-weight: bold; margin-bottom: 8px; }';
    html += '.monster-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; }';
    html += '.monster-icon { font-size: 18px; }';
    html += '.monster-name { flex: 1; }';
    html += '.monster-stats { font-size: 11px; color: var(--text-secondary); }';
    html += '.monster-divider { border: none; border-top: 1px solid rgba(255,255,255,0.05); margin: 8px 0; }';
    html += '.boss-badge { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px; }';
    html += '.boss-loc { color: var(--primary); margin-bottom: 8px; }';
    html += '.boss-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 10px 0; }';
    html += '.boss-abilities, .boss-drops, .craft-resources, .dungeon-monsters, .dungeon-boss { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }';
    html += '.section-title { font-weight: bold; margin-bottom: 8px; color: var(--primary); }';
    html += '.ability-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }';
    html += '.ability-type { color: var(--text-secondary); }';
    html += '.ability-chance { color: var(--gold); }';
    html += '.drop-row { font-size: 12px; color: var(--gold); margin: 3px 0; }';
    html += '.boss-drop-badge { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; display: inline-block; margin-top: 5px; }';
    html += '.res-locations, .res-boss-chance { color: var(--text-secondary); font-size: 12px; margin-top: 5px; }';
    html += '.resource-row { font-size: 12px; margin: 3px 0; }';
    html += '.monster-name-small { font-size: 11px; color: var(--text-secondary); margin: 2px 0; }';
    html += '.monster-more { font-size: 11px; color: var(--primary); margin-top: 5px; }';
    html += '.boss-name { color: #e74c3c; font-weight: bold; }';
    html += '.encyclopedia-filters { display: flex; gap: 10px; margin-bottom: 15px; }';
    html += '.encyclopedia-filters select { padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: var(--text); }';
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

function filterResources() {
    const tierFilter = document.getElementById('resource-tier-filter').value;
    const profFilter = document.getElementById('resource-prof-filter').value;
    
    document.querySelectorAll('.resource-card').forEach(card => {
        const tier = card.dataset.tier;
        const prof = card.dataset.prof;
        
        const tierMatch = tierFilter === 'all' || tier === tierFilter;
        const profMatch = profFilter === 'all' || prof === profFilter;
        
        card.style.display = (tierMatch && profMatch) ? 'block' : 'none';
    });
}

function filterCrafts() {
    const tierFilter = document.getElementById('craft-tier-filter').value;
    const profFilter = document.getElementById('craft-prof-filter').value;
    
    document.querySelectorAll('.craft-card').forEach(card => {
        const tier = card.dataset.tier;
        const prof = card.dataset.prof;
        
        const tierMatch = tierFilter === 'all' || tier === tierFilter;
        const profMatch = profFilter === 'all' || prof === profFilter;
        
        card.style.display = (tierMatch && profMatch) ? 'block' : 'none';
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
