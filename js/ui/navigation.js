// navigation.js - Полная версия

function showLocations() {
    stopGathering();
    let html = '<h2>🗺️ Локации</h2><div class="location-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
    LOCATIONS.forEach(loc => {
        const unlocked = player.level >= loc.minLvl;
        html += '<div class="location-card' + (unlocked ? '' : ' locked') + '" onclick="' + (unlocked ? "selectLocation('" + loc.name + "')" : '') + '" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.3s;">' +
            '<div style="font-size:30px; text-align: center;">' + loc.icon + '</div>' +
            '<div class="location-level" style="font-size: 11px; color: var(--gold); text-align: center;">📍 ' + loc.minLvl + '-' + loc.maxLvl + '</div>' +
            '<div class="location-name" style="font-weight: 700; font-size: 14px; text-align: center; margin: 5px 0;">' + loc.name + '</div>' +
            '<div class="location-desc" style="font-size: 11px; color: var(--text-secondary); text-align: center;">' + loc.desc + '</div>' +
            '<div class="level-req" style="font-size: 10px; color: var(--gold); text-align: center; margin-top: 5px;">⭐ Требуемый уровень: ' + loc.minLvl + '</div>' +
            '</div>';
    });
    html += '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function selectLocation(name) {
    player.location = name;
    saveGame();
    renderGame();
    addMessage('📍 ' + name, 'success');
}

function showProfessions() {
    stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();
    let html = '<h2>🔧 Профессии</h2><p style="margin-bottom:15px;">Изучайте профессии, собирайте ресурсы и создавайте предметы. Каждый тир даёт бонусы!</p>';
    
    html += '<h3 style="color:var(--green); margin-top: 15px;">🌿 Добывающие профессии</h3><div class="profession-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">';
    PROFESSIONS_DB.gathering.forEach(prof => {
        const learned = player.professions[prof.id];
        const tier = learned ? (learned.tier || 1) : 0;
        const exp = learned ? learned.exp : 0;
        const expNeeded = getExpForNextTier(tier);
        const percent = (expNeeded > 0 && tier < 6) ? (exp / expNeeded * 100) : 100;
        const bonuses = getProfessionBonuses(tier);
        const locHint = typeof formatLocationResourcesHint === 'function'
            ? formatLocationResourcesHint(prof.id) : '';
        
        html += '<div class="profession-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 15px;">' +
            '<div class="profession-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">' +
                '<div class="profession-icon" style="font-size: 40px;">' + prof.icon + '</div>' +
                '<div class="profession-info" style="flex: 1;">' +
                    '<div class="profession-name" style="font-weight: 600; font-size: 16px;">' + prof.name + '</div>' +
                    '<span class="profession-type type-gathering" style="font-size: 10px; padding: 2px 10px; border-radius: 10px; background: rgba(46,204,113,0.2); color: var(--green);">Добыча</span>' +
                '</div>' +
            '</div>' +
            '<div style="font-size: 10px; color: var(--text-secondary); margin: 6px 0; line-height: 1.35;">' + locHint + '</div>' +
            (learned ? 
                '<div>Тир: <strong>' + tier + '</strong>/6</div>' +
                (tier < 6 ? 
                    '<div class="progress-bar" style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 8px 0; overflow: hidden;"><div class="progress-fill prof-fill" style="width:' + percent + '%; height: 100%; background: linear-gradient(90deg, #f39c12, #f0c040);"></div></div>' +
                    '<div style="font-size: 9px; margin-bottom: 8px;">' + Math.floor(exp) + '/' + expNeeded + ' XP до ' + (tier + 1) + ' тира</div>' : 
                    '<div style="color: gold; font-size: 11px; margin: 8px 0;">🏆 МАКСИМАЛЬНЫЙ ТИР!</div>'
                ) +
                '<div style="font-size: 10px; color: var(--gold); margin-bottom: 8px;">⚡ Бонусы: -' + Math.floor(bonuses.gatherSpeedBonus * 100) + '% время, +' + Math.floor(bonuses.doubleGatherChance * 100) + '% двойная добыча</div>' +
                '<button class="action-btn" onclick="showGatheringResources(\'' + prof.id + '\')" style="margin-top:8px;width:100%; padding: 10px;">⛏️ Собирать</button>' :
                '<button class="action-btn" onclick="learnProfession(\'' + prof.id + '\')" style="margin-top:8px;width:100%; padding: 10px;">📚 Изучить</button>') +
            '</div>';
    });
    html += '</div>';
    
    html += '<h3 style="color:var(--blue); margin-top: 25px;">⚒️ Создающие профессии</h3><div class="profession-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">';
    PROFESSIONS_DB.crafting.forEach(prof => {
        const learned = player.professions[prof.id];
        const tier = learned ? (learned.tier || 1) : 0;
        const exp = learned ? learned.exp : 0;
        const expNeeded = getExpForNextTier(tier);
        const percent = (expNeeded > 0 && tier < 6) ? (exp / expNeeded * 100) : 100;
        const bonuses = getProfessionBonuses(tier);
        const locHint = typeof formatLocationResourcesHint === 'function'
            ? formatLocationResourcesHint(prof.id) : '';
        
        html += '<div class="profession-card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 15px;">' +
            '<div class="profession-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">' +
                '<div class="profession-icon" style="font-size: 40px;">' + prof.icon + '</div>' +
                '<div class="profession-info" style="flex: 1;">' +
                    '<div class="profession-name" style="font-weight: 600; font-size: 16px;">' + prof.name + '</div>' +
                    '<span class="profession-type type-crafting" style="font-size: 10px; padding: 2px 10px; border-radius: 10px; background: rgba(52,152,219,0.2); color: var(--blue);">Крафт</span>' +
                '</div>' +
            '</div>' +
            '<div style="font-size: 10px; color: var(--text-secondary); margin: 6px 0; line-height: 1.35;">' + locHint + '</div>' +
            (learned ? 
                '<div>Тир: <strong>' + tier + '</strong>/6</div>' +
                (tier < 6 ? 
                    '<div class="progress-bar" style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 8px 0; overflow: hidden;"><div class="progress-fill prof-fill" style="width:' + percent + '%; height: 100%; background: linear-gradient(90deg, #9b59b6, #8e44ad);"></div></div>' +
                    '<div style="font-size: 9px; margin-bottom: 8px;">' + Math.floor(exp) + '/' + expNeeded + ' XP до ' + (tier + 1) + ' тира</div>' : 
                    '<div style="color: gold; font-size: 11px; margin: 8px 0;">🏆 МАКСИМАЛЬНЫЙ ТИР!</div>'
                ) +
                '<div style="font-size: 10px; color: var(--gold); margin-bottom: 8px;">✨ Качество +' + Math.floor(bonuses.craftQualityBonus * 100) + '%, экономия ' + Math.floor(bonuses.materialSaveChance * 100) + '%</div>' +
                '<button class="action-btn" onclick="showCraftingRecipes(\'' + prof.id + '\')" style="margin-top:8px;width:100%; padding: 10px;">🔨 Создавать</button>' :
                '<button class="action-btn" onclick="learnProfession(\'' + prof.id + '\')" style="margin-top:8px;width:100%; padding: 10px;">📚 Изучить</button>') +
            '</div>';
    });
    html += '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function learnProfession(profId) {
    if (player.professions[profId]) { addMessage('Профессия уже изучена!', 'error'); return; }
    player.professions[profId] = { tier: 1, exp: 0 };
    saveGame();
    const allProfs = PROFESSIONS_DB.gathering.concat(PROFESSIONS_DB.crafting);
    const prof = allProfs.find(p => p.id === profId);
    const bonuses = getProfessionBonuses(1);
    showModal('📚 Профессия изучена!', prof.icon, 'Вы изучили профессию «' + prof.name + '»!\n\n' + prof.desc + '\n\n⭐ 1 тир (всего 6)\n\n📈 Бонусы текущего тира:\n• -5% времени сбора\n• +5% шанс двойной добычи\n• +5% качество крафта', 'Продолжить', () => showProfessions());
}

function showAbilities() {
    stopGathering();
    let html = '<h2>✨ Способности</h2><p>Школа: <strong>' + player.branch + '</strong></p><div class="ability-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; margin-top: 15px;">';
    const abilities = ABILITIES_DB[player.class]?.[player.branch]?.abilities || [];
    abilities.forEach(a => {
        const unlocked = player.level >= a.lvl;
        html += '<div class="ability-card' + (unlocked ? ' unlocked' : ' on-cooldown') + '" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.3s;">' +
            '<div style="display: flex; align-items: center; gap: 10px;">' +
                '<span style="font-size: 28px;">' + (a.icon || '✨') + '</span>' +
                '<div class="ability-name" style="font-weight: 700; font-size: 15px; color: var(--gold);">' + a.name + '</div>' +
            '</div>' +
            '<div class="ability-desc" style="font-size: 11px; color: var(--text-secondary); margin: 8px 0;">' + a.desc + '</div>' +
            '<div class="level-req" style="font-size: 10px; color: var(--gold);">🔓 Открывается на ' + a.lvl + ' уровне</div>' +
            (a.mana ? '<div style="font-size: 10px; color: var(--blue); margin-top: 4px;">💎 Стоимость: ' + a.mana + ' маны</div>' : '') +
            (a.cd ? '<div style="font-size: 10px; color: var(--orange);">⏱️ Перезарядка: ' + a.cd + ' хода</div>' : '') +
            (!unlocked ? '<div style="font-size: 10px; color: #e74c3c; margin-top: 4px;">🔒 Закрыто</div>' : '<div style="font-size: 10px; color: #2ecc71; margin-top: 4px;">✅ Доступно</div>') +
        '</div>';
    });
    html += '</div>';
    document.getElementById('dynamicContent').innerHTML = html;
}

// Функция создания нового персонажа
window.createNewCharacter = function() {
    console.log('createNewCharacter вызвана');
    showModal('⚠️ СОЗДАНИЕ НОВОГО ПЕРСОНАЖА', '🔄', 
        'ВНИМАНИЕ! Весь текущий прогресс будет потерян без возможности восстановления!\n\nВы уверены, что хотите начать новую игру?', 
        '✅ Да, создать нового', 
        function() {
            console.log('Создание нового персонажа подтверждено');
            localStorage.removeItem('rpg_save_v21');
            player = null;
            currentMonster = null;
            battleLogEntries = [];
            location.reload();
        }
    );
};

// Панель сохранений
window.showSaveLoadPanel = function() {
    console.log('showSaveLoadPanel вызвана');
    stopGathering();
    if (typeof closeSettings === 'function') closeSettings();
    
    let html = '<h2>💾 Управление сохранениями</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 20px;">';
    
    if (player) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: var(--gold);">📊 Текущее сохранение</h3>';
        html += `<p>👤 Имя: <strong>${player.name}</strong></p>`;
        html += `<p>⭐ Класс: <strong>${player.class} · ${player.branch}</strong></p>`;
        html += `<p>📈 Уровень: <strong>${player.level}</strong></p>`;
        html += `<p>💰 Золото: <strong>${player.gold}</strong></p>`;
        html += `<p>⚔️ Побед: <strong>${player.victories || 0}</strong></p>`;
        html += '</div>';
    } else {
        html += '<p style="color: #e74c3c;">❌ Нет активного персонажа! Создайте нового.</p>';
    }
    
    html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; justify-content: center;">';
    html += '<button class="action-btn" onclick="exportSaveFile()" style="background: linear-gradient(135deg, #27ae60, #2ecc71); border: none; padding: 10px 20px;">💾 Скачать сохранение</button>';
    html += '<label class="action-btn" style="background: linear-gradient(135deg, #2980b9, #3498db); border: none; cursor: pointer; display: inline-block; padding: 10px 20px;">📂 Загрузить сохранение<input type="file" id="importSaveInput" accept=".json" style="display: none;" onchange="handleImportSave(event)"></label>';
    html += '<button class="action-btn" onclick="window.createNewCharacter()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); border: none; padding: 10px 20px;">🔄 НОВЫЙ ПЕРСОНАЖ</button>';
    html += '</div>';
    
    html += '<div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">';
    html += '<h4 style="color: var(--gold); margin-bottom: 10px;">ℹ️ Информация</h4>';
    html += '<ul style="margin-left: 20px; font-size: 12px; color: var(--text-secondary);">';
    html += '<li>💾 Экспорт сохраняет персонажа в JSON файл</li>';
    html += '<li>📂 Загрузка восстанавливает персонажа из файла</li>';
    html += '<li>🔄 НОВЫЙ ПЕРСОНАЖ - полностью очищает прогресс</li>';
    html += '<li>⚠️ Создание нового персонажа НЕОБРАТИМО!</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%;">↩️ Назад в игру</button>';
    document.getElementById('dynamicContent').innerHTML = html;
};

console.log('navigation.js загружен, showSaveLoadPanel определена:', typeof window.showSaveLoadPanel);