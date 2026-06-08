// main.js - С поддержкой сохранения скинов (полностью рабочая)

// НЕ ОБЪЯВЛЯЙ ЗДЕСЬ ПЕРЕМЕННЫЕ ЗАНОВО! Они уже есть в других файлах
// Просто вызываем init() когда все файлы загружены

function initLegacyLocalGame() {
    createParticles();
    const saved = localStorage.getItem('rpg_save_v21');
    if (saved) {
        try {
            const d = JSON.parse(saved);
            if (d && d.class) {
                player = migrateOldSave(d);
                if (typeof syncInventoryItemVisuals === 'function') syncInventoryItemVisuals(player);
                
                if (!player.professions) player.professions = {};
                if (!player.resources) player.resources = {};
                if (player.inventory && !player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
                if (player.autoGather) {
                    const ag = player.autoGather;
                    if (Date.now() >= (ag.expiresAt || 0) || (ag.gathersLeft || 0) <= 0) player.autoGather = null;
                }
                
                initSkinsSystem();
                
                updateAllItemPrices();
                updateAllAbilities();
                resetBaseStats();
                clampPlayerVitalsAfterLoad();
                // Восстановление таймера колеса фортуны после загрузки
                if (typeof wheelRestoreAfterLoad === 'function') wheelRestoreAfterLoad();
                renderGame();
                console.log('Сохранение загружено, скинов:', player.unlockedSkins?.length || 0);
                return;
            }
        } catch(e) {
            console.error("Ошибка загрузки сохранения:", e);
        }
    }
    renderCharacterCreation();
}

function init() {
    if (typeof bootstrapGameAccount === 'function') {
        bootstrapGameAccount();
        return;
    }
    initLegacyLocalGame();
}

// ===== СИСТЕМА СКИНОВ =====

function initSkinsSystem() {
    if (!player) return;
    
    // Инициализация полей
    if (player.unlockedSkins === undefined) player.unlockedSkins = [];
    if (player.currentSkin === undefined) player.currentSkin = null;
    if (player.gender === undefined) player.gender = 'male';
    
    // Добавляем базовые скины
    addDefaultSkinsToUnlocked();
    
    // Устанавливаем базовый скин если нет текущего
    if (!player.currentSkin) {
        setDefaultSkin();
    } else if (typeof syncSchoolImgFromCurrentSkin === 'function') {
        syncSchoolImgFromCurrentSkin();
    }
    
    saveGame();
}

function addDefaultSkinsToUnlocked() {
    if (!player || !player.class || !player.branch) return;
    if (typeof SKINS_DB === 'undefined') return;
    
    const classSkins = SKINS_DB[player.class];
    if (!classSkins) return;
    
    const genderSkins = classSkins[player.gender || 'male'];
    if (!genderSkins) return;
    
    const schoolSkins = genderSkins[player.branch];
    if (!schoolSkins) return;
    
    if (!player.unlockedSkins) player.unlockedSkins = [];
    
    let added = 0;
    for (let skin of schoolSkins) {
        if (skin.price === 0 && !player.unlockedSkins.includes(skin.id)) {
            player.unlockedSkins.push(skin.id);
            added++;
        }
    }
    if (added > 0) console.log(`Добавлено ${added} базовых скинов`);
}

function setDefaultSkin() {
    if (!player || !player.class || !player.branch) return;
    if (typeof SKINS_DB === 'undefined') return;
    
    const classSkins = SKINS_DB[player.class];
    if (!classSkins) return;
    
    const genderSkins = classSkins[player.gender || 'male'];
    if (!genderSkins) return;
    
    const schoolSkins = genderSkins[player.branch];
    if (!schoolSkins) return;
    
    const defaultSkin = schoolSkins.find(s => s.price === 0);
    if (defaultSkin) {
        player.currentSkin = defaultSkin.id;
        player.schoolImg = defaultSkin.img;
        console.log(`Установлен базовый скин: ${defaultSkin.name}`);
    }
}

function getSkinsForCurrentSchool() {
    if (!player) return [];
    if (typeof SKINS_DB === 'undefined') return [];
    
    const classSkins = SKINS_DB[player.class];
    if (!classSkins) return [];
    
    const genderSkins = classSkins[player.gender || 'male'];
    if (!genderSkins) return [];
    
    const schoolSkins = genderSkins[player.branch];
    if (!schoolSkins) return [];
    
    if (!player.unlockedSkins) player.unlockedSkins = [];
    
    return schoolSkins.map(skin => ({
        ...skin,
        unlocked: player.unlockedSkins.includes(skin.id) || skin.price === 0
    }));
}

function buySkin(skinId) {
    const skins = getSkinsForCurrentSchool();
    const skin = skins.find(s => s.id === skinId);
    
    if (!skin) {
        addMessage('❌ Скин не найден!', 'error');
        return false;
    }
    
    if (player.unlockedSkins && player.unlockedSkins.includes(skinId)) {
        addMessage(`❌ Скин "${skin.name}" уже куплен!`, 'error');
        return false;
    }
    
    if (player.gold < skin.price) {
        addMessage(`❌ Не хватает золота! Нужно ${skin.price}`, 'error');
        return false;
    }
    
    player.gold -= skin.price;
    
    if (!player.unlockedSkins) player.unlockedSkins = [];
    player.unlockedSkins.push(skinId);
    
    player.currentSkin = skinId;
    player.schoolImg = skin.img;
    
    saveGame();
    addMessage(`✅ Куплен скин: ${skin.name}!`, 'success');
    
    renderGame();
    return true;
}

function equipSkin(skinId) {
    const skins = getSkinsForCurrentSchool();
    const skin = skins.find(s => s.id === skinId);
    
    if (!skin) {
        addMessage('❌ Скин не найден!', 'error');
        return false;
    }
    
    if (!skin.unlocked && skin.price > 0) {
        addMessage(`❌ Скин "${skin.name}" не куплен!`, 'error');
        return false;
    }
    
    player.currentSkin = skinId;
    player.schoolImg = skin.img;
    saveGame();
    addMessage(`✨ Экипирован скин: ${skin.name}!`, 'success');
    
    renderGame();
    return true;
}

function showSkinsGallery() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    stopGathering();
    
    const skins = getSkinsForCurrentSchool();
    const currentSkinId = player.currentSkin;
    
    let html = '<h2>🎨 Галерея скинов</h2>';
    html += `<p style="margin-bottom: 15px;">Класс: <strong>${player.class}</strong> | Школа: <strong>${player.branch}</strong> | Пол: <strong>${player.gender === 'male' ? 'Мужской' : 'Женский'}</strong></p>`;
    html += '<div class="skins-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';
    
    const rarityColors = {
        'Обычный': '#ccc',
        'Необычный': '#2ecc71',
        'Редкий': '#3498db',
        'Эпический': '#9b59b6',
        'Легендарный': '#f0c040',
        'Древний': '#e67e22',
        'Мифический': '#e74c3c',
        'Божественный': '#1abc9c'
    };
    
    for (let skin of skins) {
        const isEquipped = currentSkinId === skin.id;
        const isUnlocked = skin.unlocked;
        const rarityColor = rarityColors[skin.rarity] || '#ccc';
        
        const imageHtml = skin.img && skin.img !== '' 
            ? `<img src="${skin.img}" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 10px;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\'font-size:64px;\'>${skin.icon}</div>'">`
            : `<div style="font-size: 64px; margin-bottom: 10px;">${skin.icon}</div>`;
        
        html += `<div class="skin-card" style="background: rgba(0,0,0,0.3); border: 2px solid ${isEquipped ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; padding: 12px; text-align: center; transition: all 0.3s;">
            ${imageHtml}
            <div style="font-weight: 700; color: ${rarityColor};">${skin.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin: 5px 0;">${skin.rarity}</div>
            <div style="font-size: 10px; margin: 5px 0;">${skin.description}</div>`;
        
        if (isUnlocked) {
            if (isEquipped) {
                html += `<div style="margin-top: 10px;"><span style="background: #2ecc71; padding: 4px 12px; border-radius: 15px; font-size: 11px;">✅ Экипирован</span></div>`;
            } else {
                html += `<button class="action-btn" onclick="equipSkin('${skin.id}')" style="margin-top: 10px; padding: 6px 12px; font-size: 12px;">🎭 Экипировать</button>`;
            }
        } else {
            html += `<div style="margin-top: 10px;">
                <span style="color: var(--gold); font-weight: 700;">💰 ${skin.price}</span>
                <button class="action-btn" onclick="buySkin('${skin.id}')" style="margin-top: 5px; padding: 6px 12px; font-size: 12px; background: linear-gradient(135deg, #f39c12, #e67e22);">🛒 Купить</button>
            </div>`;
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    
    document.getElementById('dynamicContent').innerHTML = html;
}

function addSkinsButton() {
    const navGrid = document.querySelector('.nav-grid');
    if (navGrid && !document.querySelector('.nav-card[onclick="showSkinsGallery()"]')) {
        const skinsCard = document.createElement('div');
        skinsCard.className = 'nav-card';
        skinsCard.setAttribute('onclick', 'showSkinsGallery()');
        skinsCard.innerHTML = '<div class="nav-card-icon">🎨</div><div class="nav-card-title">Скины</div>';
        navGrid.appendChild(skinsCard);
    }
}

function addEncyclopediaButton() {
    const navGrid = document.querySelector('.nav-grid');
    if (navGrid && !document.querySelector('.nav-card[onclick="showEncyclopedia()"]')) {
        const encCard = document.createElement('div');
        encCard.className = 'nav-card';
        encCard.setAttribute('onclick', 'showEncyclopedia()');
        encCard.innerHTML = '<div class="nav-card-icon">📖</div><div class="nav-card-title">Справочник</div>';
        navGrid.appendChild(encCard);
    }
}

// ===== МИГРАЦИЯ СТАРЫХ ПРЕДМЕТОВ =====

function migrateItemPrices() {
    if (!player || !player.inventory) return;
    
    let migrated = 0;
    
    function calculateSellPrice(item) {
        const specialPrices = {
            'Зелье здоровья': 5,
            'Малое зелье здоровья': 3,
            'Большое зелье здоровья': 10,
            'Малое зелье маны': 3,
            'Зелье маны': 5,
            'Большое зелье маны': 10,
            'Эликсир силы': 8,
            'Эликсир защиты': 8,
        };
        
        if (specialPrices[item.name]) return specialPrices[item.name];
        
        const basePrices = {
            'Обычный': 15, 'Необычный': 35, 'Редкий': 75,
            'Эпический': 150, 'Легендарный': 350, 'Мифический': 800,
            'Древний': 1500, 'Божественный': 3000
        };
        
        let basePrice = basePrices[item.rarity] || 25;
        let statBonus = 0;
        if (item.dmg) statBonus += item.dmg * 4;
        if (item.def) statBonus += item.def * 3;
        if (item.hp) statBonus += Math.floor(item.hp * 1.5);
        if (item.crit) statBonus += item.crit * 8;
        if (item.critDmg) statBonus += item.critDmg * 2;
        if (item.dodge) statBonus += item.dodge * 5;
        if (item.mana) statBonus += item.mana * 2;
        if (item.value) statBonus += Math.floor(item.value / 2);
        
        return Math.max(10, Math.min(basePrice + statBonus, 50000));
    }
    
    const itemTypes = ['weapons', 'helmets', 'chests', 'pants', 'boots', 'potions', 'manaPotions', 'foods', 'elixirs', 'scrolls', 'stones', 'rings', 'necklaces'];
    
    for (let type of itemTypes) {
        if (player.inventory[type] && player.inventory[type].length > 0) {
            for (let item of player.inventory[type]) {
                if (!item.sellPrice) {
                    item.sellPrice = calculateSellPrice(item);
                    migrated++;
                }
            }
        }
    }
    
    if (migrated > 0) {
        console.log(`✅ Добавлены цены для ${migrated} предметов`);
        saveGame();
    }
}

function updateAllItemPrices() {
    if (!player || !player.inventory) return;
    
    let updated = 0;
    const itemTypes = ['weapons', 'helmets', 'chests', 'pants', 'boots', 'potions', 'manaPotions', 'foods', 'elixirs', 'scrolls', 'stones', 'rings', 'necklaces'];
    
    for (let type of itemTypes) {
        if (player.inventory[type] && player.inventory[type].length > 0) {
            for (let item of player.inventory[type]) {
                const newPrice = getItemSellPrice(item);
                if (item.sellPrice !== newPrice) {
                    item.sellPrice = newPrice;
                    updated++;
                }
            }
        }
    }
    
    for (let slot in player.equipment) {
        const item = player.equipment[slot];
        if (item) {
            const newPrice = getItemSellPrice(item);
            if (item.sellPrice !== newPrice) {
                item.sellPrice = newPrice;
                updated++;
            }
        }
    }
    
    if (updated > 0) {
        console.log(`✅ Обновлены цены для ${updated} предметов`);
        saveGame();
    }
    return updated;
}

// ===== СИСТЕМА СОХРАНЕНИЯ =====

function exportSaveFile() {
    if (!player) {
        addMessage('❌ Нет активного сохранения!', 'error');
        return;
    }
    
    // Убеждаемся, что данные о скинах сохранены в player
    if (!player.unlockedSkins) player.unlockedSkins = [];
    if (!player.currentSkin) player.currentSkin = null;
    if (!player.gender) player.gender = 'male';
    
    const saveData = {
        version: '3.1',
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        player: JSON.parse(JSON.stringify(player)),
        gameStats: {
            totalPlayTime: getPlayTime(),
            totalVictories: player.victories || 0,
            level: player.level,
            gold: player.gold,
            unlockedSkinsCount: player.unlockedSkins?.length || 0,
            currentSkin: player.currentSkin
        }
    };
    
    const jsonStr = JSON.stringify(saveData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronicles_${player.name}_level_${player.level}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addMessage(`💾 Сохранение экспортировано! Скинов: ${player.unlockedSkins?.length || 0}`, 'success');
}

function importSaveFile(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const saveData = JSON.parse(e.target.result);
            
            if (!saveData.player || !saveData.player.class) {
                addMessage('❌ Неверный формат файла сохранения!', 'error');
                return;
            }
            
            // СОХРАНЯЕМ ДАННЫЕ О СКИНАХ ИЗ ФАЙЛА
            const importedPlayer = saveData.player;
            
            // Проверяем и восстанавливаем поля скинов
            if (importedPlayer.unlockedSkins === undefined) importedPlayer.unlockedSkins = [];
            if (importedPlayer.currentSkin === undefined) importedPlayer.currentSkin = null;
            if (importedPlayer.gender === undefined) importedPlayer.gender = 'male';
            
            player = migrateOldSave(importedPlayer);
            
            if (!player.professions) player.professions = {};
            if (!player.resources) player.resources = {};
            if (!player.temporaryEffects) player.temporaryEffects = [];
            if (!player.abilities) player.abilities = [];
            
            initSkinsSystem();
            
            resetBaseStats();
            updateAllAbilities();
            clampPlayerVitalsAfterLoad();
            
            saveGame();
            renderGame();
            
            const saveDate = saveData.date || new Date(saveData.timestamp).toLocaleString();
            addMessage(`✅ Загружено сохранение от ${saveDate}! Уровень ${player.level}, скинов: ${player.unlockedSkins?.length || 0}`, 'success');
            
        } catch (err) {
            addMessage('❌ Ошибка при чтении файла сохранения!', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function resetGame() {
    if (confirm('⚠️ ВНИМАНИЕ! Все текущие данные будут потеряны!\n\nВы уверены, что хотите создать нового персонажа?')) {
        localStorage.removeItem('rpg_save_v21');
        localStorage.removeItem('totalPlayTime');
        player = null;
        currentMonster = null;
        isPlayerTurn = true;
        battleLogEntries = [];
        location.reload();
    }
}

function createNewCharacter() {
    if (player) {
        showModal('⚠️ Создание нового персонажа', '⚠️', 'Вы уверены, что хотите создать нового персонажа?\n\nВсе текущие данные будут потеряны!', 'Создать нового', () => {
            resetGame();
            migrateItemPrices();
        });
    } else {
        renderCharacterCreation();
    }
}

// ===== ТАЙМЕР =====

let playTimeStart = Date.now();
let totalPlayTime = localStorage.getItem('totalPlayTime') ? parseInt(localStorage.getItem('totalPlayTime')) : 0;

function startPlayTimer() { playTimeStart = Date.now(); }
function getPlayTime() {
    const currentSession = Math.floor((Date.now() - playTimeStart) / 1000);
    const total = totalPlayTime + currentSession;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${hours}ч ${minutes}м ${seconds}с`;
}
function savePlayTime() {
    const currentSession = Math.floor((Date.now() - playTimeStart) / 1000);
    totalPlayTime += currentSession;
    localStorage.setItem('totalPlayTime', totalPlayTime);
}

window.addEventListener('beforeunload', function () {
    if (typeof pushCloudCharacterSave === 'function') {
        pushCloudCharacterSave();
    } else if (player && typeof saveGame === 'function') {
        saveGame();
    }
});

// ===== ПАНЕЛЬ СОХРАНЕНИЙ =====

function showSaveLoadPanel() {
    stopGathering();
    let html = '<h2>💾 Управление сохранениями</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 20px;">';
    
    if (player) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h3 style="color: var(--gold);">📊 Текущее сохранение</h3>';
        html += `<p>👤 Имя: <strong>${player.name}</strong></p>`;
        html += `<p>⭐ Класс: <strong>${player.class} · ${player.branch}</strong></p>`;
        html += `<p>🧑 Пол: <strong>${player.gender === 'male' ? 'Мужской' : 'Женский'}</strong></p>`;
        html += `<p>📈 Уровень: <strong>${player.level}</strong></p>`;
        html += `<p>💰 Золото: <strong>${player.gold}</strong></p>`;
        html += `<p>⚔️ Побед: <strong>${player.victories || 0}</strong></p>`;
        html += `<p>🎨 Скинов куплено: <strong>${player.unlockedSkins?.length || 0}</strong></p>`;
        html += `<p>🎭 Текущий скин: <strong>${player.currentSkin || 'базовый'}</strong></p>`;
        html += `<p>⏱️ Время в игре: <strong>${getPlayTime()}</strong></p>`;
        html += '</div>';
    } else {
        html += '<p style="color: #e74c3c;">❌ Нет активного персонажа! Создайте нового.</p>';
    }
    
    html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px;">';
    if (player) {
        html += '<button class="action-btn" onclick="exportSaveFile()" style="background: linear-gradient(135deg, #27ae60, #2ecc71); border: none;">💾 Скачать сохранение</button>';
    }
    html += '<label class="action-btn" style="background: linear-gradient(135deg, #2980b9, #3498db); border: none; cursor: pointer; display: inline-block;">📂 Загрузить сохранение<input type="file" id="importSaveInput" accept=".json" style="display: none;" onchange="handleImportSave(event)"></label>';
    html += '<button class="action-btn" onclick="createNewCharacter()" style="background: linear-gradient(135deg, #e74c3c, #c0392b); border: none;">👤 Создать нового персонажа</button>';
    html += '</div>';
    
    html += '<div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">';
    html += '<h4 style="color: var(--gold); margin-bottom: 10px;">ℹ️ Информация</h4>';
    html += '<ul style="margin-left: 20px; font-size: 12px; color: var(--text-secondary);">';
    html += '<li>💾 Сохранение экспортируется в JSON файл</li>';
    html += '<li>📂 Файл содержит имя, уровень, скины и дату создания</li>';
    html += '<li>📁 Для загрузки выберите ранее сохранённый JSON файл</li>';
    html += '<li>👤 Создание нового персонажа удалит текущее сохранение</li>';
    html += '<li>💡 Совет: экспортируйте текущее сохранение перед созданием нового!</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

function handleImportSave(event) {
    const file = event.target.files[0];
    if (file) {
        importSaveFile(file);
    }
    event.target.value = '';
}

// ===== НАВИГАЦИЯ =====
// Сохранения — только в Настройках → вкладка «Игра»

const originalRenderGame = renderGame;
window._originalRenderGame = originalRenderGame;
renderGame = function() {
    originalRenderGame();
    setTimeout(function() { addSkinsButton(); addEncyclopediaButton(); }, 150);
};

window.addEventListener('beforeunload', function() {
    if (player) {
        savePlayTime();
        saveGame();
    }
});

// ===== МИГРАЦИЯ СТАРЫХ СОХРАНЕНИЙ =====

function clampPlayerVitalsAfterLoad() {
    if (!player) return;
    if (typeof player.health !== 'number' || player.health < 1) {
        player.health = player.maxHealth;
    } else {
        player.health = Math.min(player.health, player.maxHealth);
    }
    if (player.class === 'Маг') {
        if (typeof player.mana !== 'number' || player.mana < 0) {
            player.mana = player.maxMana;
        } else {
            player.mana = Math.min(player.mana, player.maxMana);
        }
    }
}

function migrateOldSave(playerData) {
    if (!playerData.schoolImg && playerData.class && playerData.branch) {
        if (typeof ABILITIES_DB !== 'undefined' && ABILITIES_DB[playerData.class] && ABILITIES_DB[playerData.class][playerData.branch]) {
            playerData.schoolImg = ABILITIES_DB[playerData.class][playerData.branch].img || '';
        }
    }
    
    if (!playerData.inventory) {
        playerData.inventory = {
            weapons: [], helmets: [], chests: [], pants: [], boots: [],
            potions: [], manaPotions: [], foods: [], elixirs: [], scrolls: [], stones: [],
            rings: [], necklaces: []
        };
    }
    if (!Array.isArray(playerData.inventory.rings)) playerData.inventory.rings = [];
    if (!Array.isArray(playerData.inventory.necklaces)) playerData.inventory.necklaces = [];
    if (!Array.isArray(playerData.inventory.manaPotions)) playerData.inventory.manaPotions = [];
    
    if (!playerData.equipment) {
        playerData.equipment = {
            weapon: null, helmet: null, chest: null, pants: null, boots: null,
            ring: null, necklace: null
        };
    }
    if (playerData.equipment.ring === undefined) playerData.equipment.ring = null;
    if (playerData.equipment.necklace === undefined) playerData.equipment.necklace = null;
    
    if (playerData.professions === undefined) playerData.professions = {};
    if (playerData.resources === undefined) playerData.resources = {};
    if (typeof normalizeProfessionProf === 'function') {
        for (const profId in playerData.professions) {
            normalizeProfessionProf(playerData.professions[profId]);
            if (typeof applyProfessionTierUps === 'function') {
                applyProfessionTierUps(playerData.professions[profId]);
            }
        }
    }
    if (playerData.temporaryEffects === undefined) playerData.temporaryEffects = [];
    if (typeof ensureAbilityQuickSlots === 'function') {
        ensureAbilityQuickSlots(playerData);
    } else if (!Array.isArray(playerData.abilityQuickSlots)) {
        playerData.abilityQuickSlots = [null, null, null, null, null];
    }
    if (typeof ensureAbilityQuickKeys === 'function') {
        ensureAbilityQuickKeys(playerData);
    } else if (!Array.isArray(playerData.abilityQuickKeys)) {
        playerData.abilityQuickKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
    }
    if (typeof ensureBattleKeys === 'function') {
        ensureBattleKeys(playerData);
    } else if (!playerData.battleKeys || typeof playerData.battleKeys !== 'object') {
        playerData.battleKeys = { attack: 'KeyA', dodge: 'KeyD', abilities: 'KeyE', continue: 'Enter' };
    }
    if (typeof ensureUiKeys === 'function') {
        ensureUiKeys(playerData);
    } else if (!playerData.uiKeys || typeof playerData.uiKeys !== 'object') {
        playerData.uiKeys = { back: 'Backspace' };
    }
    
    // ВАЖНО: сохраняем скины из старого сохранения, если они есть
    if (playerData.unlockedSkins === undefined) playerData.unlockedSkins = [];
    if (playerData.currentSkin === undefined) playerData.currentSkin = null;
    if (playerData.gender === undefined) playerData.gender = 'male';
    if (!Array.isArray(playerData.redeemedGiftIds)) playerData.redeemedGiftIds = [];

    if (!playerData.friends || typeof playerData.friends !== 'object') {
        playerData.friends = {
            playerId: '',
            syncToken: '',
            friendCode: '',
            lastSyncAt: 0,
            cached: []
        };
    }
    if (!Array.isArray(playerData.friends.cached)) playerData.friends.cached = [];

    if (!playerData.dungeonProgress || typeof playerData.dungeonProgress !== 'object') {
        playerData.dungeonProgress = { clears: {}, lastRun: null, activeRun: null };
    }
    if (!playerData.dungeonProgress.clears || typeof playerData.dungeonProgress.clears !== 'object') {
        playerData.dungeonProgress.clears = {};
    }
    if (playerData.dungeonProgress.activeRun === undefined) {
        playerData.dungeonProgress.activeRun = null;
    }

    if (!playerData.wheelOfFortune || typeof playerData.wheelOfFortune !== 'object') {
        playerData.wheelOfFortune = {
            lastSpinTime: null,
            nextSpinTime: null,
            spinsToday: 0,
            lastSpinDate: '',
            spinHistory: []
        };
    } else {
        // Дополняем недостающие поля у старых сейвов
        var w = playerData.wheelOfFortune;
        if (w.nextSpinTime === undefined) w.nextSpinTime = null;
        if (w.lastSpinDate === undefined) w.lastSpinDate = '';
        if (!Array.isArray(w.spinHistory)) w.spinHistory = [];
        // Удаляем устаревшее поле
        if ('serverTimeSync' in w) delete w.serverTimeSync;
    }

    if (typeof ensurePlayerProgression === 'function') ensurePlayerProgression(playerData);
    
    if (!playerData.potionQuickSlots || !Array.isArray(playerData.potionQuickSlots)) {
        playerData.potionQuickSlots = [{ type: 'potion', itemIndex: 0 }, { type: 'mana_potion', itemIndex: 0 }, { type: 'food', itemIndex: 0 }, { type: 'elixir', itemIndex: 0 }];
    } else {
        // Миграция старых строковых слотов в объектные
        for (var _psi = 0; _psi < playerData.potionQuickSlots.length; _psi++) {
            var _slot = playerData.potionQuickSlots[_psi];
            if (typeof _slot === 'string') {
                playerData.potionQuickSlots[_psi] = { type: _slot, itemIndex: 0 };
            } else if (_slot && typeof _slot.type !== 'string') {
                playerData.potionQuickSlots[_psi] = null;
            }
        }
        // Добавляем 4-й слот для эликсиров если его нет
        if (playerData.potionQuickSlots.length < 4) {
            playerData.potionQuickSlots.push({ type: 'elixir', itemIndex: 0 });
        }
    }

    // МИГРАЦИЯ ОЧКОВ БОНУСОВ ПРОФЕССИЙ (для старых игроков)
    migrateProfessionBonusPoints(playerData);

    return playerData;
}

/**
 * Миграция очков бонусов профессий добычи для старых игроков.
 * 
 * МЕХАНИКА:
 * 1. Если bonusPoints НЕ существует → старый сейв, мигрируем полностью
 * 2. Если bonusPoints есть, но bonusPointsPool не соответствует формуле → исправляем
 * 3. Если bonusPoints есть и bonusPointsPool верный → пропускаем
 * 
 * Формула: totalPoints = (tier - 1) * 2
 * 
 * Примеры:
 * | Сценарий                    | Тир | bonusPoints | bonusPointsPool | Результат          |
 * |-----------------------------|-----|-------------|-----------------|--------------------|
 * | Старый сейв (первый вход)   | 6   | ❌ нет      | undefined       | +10 (миграция)     |
 * | Частичная миграция (баг)    | 6   | ✅ есть     | 0               | +10 (исправление)  |
 * | Старая формула (баг)        | 6   | ✅ есть     | 12              | -2 (коррекция)     |
 * | Новый игрок (апнул тир)     | 2   | ✅ есть     | 2               | 0 (всё верно)      |
 */
function migrateProfessionBonusPoints(playerData) {
    if (!playerData || !playerData.professions) return;
    
    // ПРАВИЛЬНЫЕ ID профессий добычи из PROFESSIONS_DB.gathering
    const gatheringProfs = ['mining', 'herbalism', 'lumberjack', 'skinning', 'fishing', 'clothier'];
    let migratedCount = 0;
    let fixedCount = 0;
    
    gatheringProfs.forEach(function(profId) {
        var prof = playerData.professions[profId];
        if (!prof) return;
        
        var tier = parseInt(prof.tier, 10) || 1;
        var expectedPoints = (tier - 1) * 2;
        
        // Сценарий 1: bonusPoints не существует — полная миграция
        if (!prof.bonusPoints) {
            prof.bonusPointsPool = expectedPoints;
            prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
            migratedCount++;
            console.log('✅ Миграция ' + profId + ' (тир ' + tier + '): + ' + expectedPoints + ' очков бонусов');
            return;
        }
        
        // Сценарий 2: bonusPoints есть, но bonusPointsPool не установлен или не соответствует
        var currentPool = prof.bonusPointsPool || 0;
        var spentPoints = (prof.bonusPoints.speed || 0) + (prof.bonusPoints.double || 0) + (prof.bonusPoints.rare || 0);
        var totalAllocated = currentPool + spentPoints;
        
        // Если сумма пула + вкачанных не равна ожидаемому — исправляем
        if (totalAllocated !== expectedPoints) {
            var difference = expectedPoints - totalAllocated;
            
            // Пересчитываем пул: ожидаемое - уже вкачанные
            prof.bonusPointsPool = expectedPoints - spentPoints;
            
            if (prof.bonusPointsPool < 0) {
                // Если вкачал больше чем положено — обнуляем пул, но оставляем вкачанное
                prof.bonusPointsPool = 0;
                console.warn('⚠️ Коррекция ' + profId + ' (тир ' + tier + '): вкачано больше нормы (' + spentPoints + ' > ' + expectedPoints + ')');
            } else if (difference > 0) {
                console.log('✅ Коррекция ' + profId + ' (тир ' + tier + '): + ' + difference + ' очков (было: ' + totalAllocated + ', стало: ' + expectedPoints + ')');
            } else if (difference < 0) {
                console.log('✅ Коррекция ' + profId + ' (тир ' + tier + '): - ' + Math.abs(difference) + ' очков (было: ' + totalAllocated + ', стало: ' + expectedPoints + ')');
            }
            
            fixedCount++;
        }
    });
    
    if (migratedCount > 0) {
        console.log('✅ Мигрировано профессий: ' + migratedCount);
    }
    if (fixedCount > 0) {
        console.log('✅ Исправлено профессий: ' + fixedCount);
    }
    if (migratedCount === 0 && fixedCount === 0) {
        console.log('ℹ️ Миграция не требуется — все профессии в порядке');
    }
}

startPlayTimer();

// Экспорт функций
window.exportSaveFile = exportSaveFile;
window.importSaveFile = importSaveFile;
window.showSaveLoadPanel = showSaveLoadPanel;
window.handleImportSave = handleImportSave;
window.resetGame = resetGame;
window.createNewCharacter = createNewCharacter;
window.showSkinsGallery = showSkinsGallery;
window.getSkinsForCurrentSchool = getSkinsForCurrentSchool;
window.buySkin = buySkin;
window.equipSkin = equipSkin;
window.addDefaultSkinsToUnlocked = addDefaultSkinsToUnlocked;
window.setDefaultSkin = setDefaultSkin;
window.addSkinsButton = addSkinsButton;
window.addEncyclopediaButton = addEncyclopediaButton;
window.initSkinsSystem = initSkinsSystem;
window.migrateProfessionBonusPoints = migrateProfessionBonusPoints;

init();