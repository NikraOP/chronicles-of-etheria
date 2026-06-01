// main.js - С поддержкой создания нового персонажа

// НЕ ОБЪЯВЛЯЙ ЗДЕСЬ ПЕРЕМЕННЫЕ ЗАНОВО! Они уже есть в других файлах
// Просто вызываем init() когда все файлы загружены

function init() {
    createParticles();
    const saved = localStorage.getItem('rpg_save_v21');
    if (saved) {
        try {
            const d = JSON.parse(saved);
            if (d && d.class) {
                player = d;
                if (!player.professions) player.professions = {};
                if (!player.resources) player.resources = {};
                updateAllAbilities();
                resetBaseStats();
                player.health = player.maxHealth;
                if (player.class === 'Маг') player.mana = player.maxMana;
                renderGame();
                return;
            }
        } catch(e) {
            console.error("Ошибка загрузки сохранения:", e);
        }
    }
    renderCharacterCreation();
}

// ===== СИСТЕМА СОХРАНЕНИЯ И ЗАГРУЗКИ ЧЕРЕЗ JSON ФАЙЛЫ =====

// Экспорт сохранения в JSON файл
function exportSaveFile() {
    if (!player) {
        addMessage('❌ Нет активного сохранения!', 'error');
        return;
    }
    
    // Создаём объект с данными для сохранения
    const saveData = {
        version: '3.0',
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        player: JSON.parse(JSON.stringify(player)),
        gameStats: {
            totalPlayTime: getPlayTime(),
            totalVictories: player.victories || 0,
            level: player.level,
            gold: player.gold
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
    
    addMessage(`💾 Сохранение "${player.name}" экспортировано!`, 'success');
}

// Импорт сохранения из JSON файла
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
            
            if (saveData.version && saveData.version !== '3.0') {
                addMessage(`⚠️ Версия сохранения (${saveData.version}) отличается от текущей (3.0). Возможны проблемы.`, 'info');
            }
            
            player = saveData.player;
            
            if (!player.professions) player.professions = {};
            if (!player.resources) player.resources = {};
            if (!player.inventory) player.inventory = { armor: [], weapons: [], stones: [], potions: [], foods: [], elixirs: [], scrolls: [] };
            if (!player.temporaryEffects) player.temporaryEffects = [];
            if (!player.abilities) player.abilities = [];
            
            resetBaseStats();
            updateAllAbilities();
            player.health = player.maxHealth;
            if (player.class === 'Маг') player.mana = player.maxMana;
            
            saveGame();
            renderGame();
            
            const saveDate = saveData.date || new Date(saveData.timestamp).toLocaleString();
            addMessage(`✅ Загружено сохранение от ${saveDate}! Уровень ${player.level}, ${player.gold} золота`, 'success');
            
        } catch (err) {
            addMessage('❌ Ошибка при чтении файла сохранения!', 'error');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// Функция для создания нового персонажа (сброс игры)
function resetGame() {
    if (confirm('⚠️ ВНИМАНИЕ! Все текущие данные будут потеряны!\n\nВы уверены, что хотите создать нового персонажа?')) {
        // Очищаем сохранение
        localStorage.removeItem('rpg_save_v21');
        localStorage.removeItem('totalPlayTime');
        
        // Сбрасываем переменные
        player = null;
        currentMonster = null;
        isPlayerTurn = true;
        battleLogEntries = [];
        
        // Перезагружаем игру
        location.reload();
    }
}

// Функция для создания нового персонажа с подтверждением
function createNewCharacter() {
    if (player) {
        showModal('⚠️ Создание нового персонажа', 
            '⚠️', 
            'Вы уверены, что хотите создать нового персонажа?\n\nВсе текущие данные будут потеряны!\n\nСохраните текущий прогресс через "Сохранить игру", если хотите сохранить данные.', 
            'Создать нового', 
            () => {
                resetGame();
            });
    } else {
        // Если нет персонажа, просто показываем создание
        renderCharacterCreation();
    }
}

// Таймер для отслеживания времени игры
let playTimeStart = Date.now();
let totalPlayTime = localStorage.getItem('totalPlayTime') ? parseInt(localStorage.getItem('totalPlayTime')) : 0;

function startPlayTimer() {
    playTimeStart = Date.now();
}

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

// Обновлённая страница управления сохранениями с кнопкой нового персонажа
function showSaveLoadPanel() {
    stopGathering();
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
    html += '<li>📂 Файл содержит имя персонажа, уровень и дату создания</li>';
    html += '<li>📁 Для загрузки выберите ранее сохранённый JSON файл</li>';
    html += '<li>👤 Создание нового персонажа удалит текущее сохранение</li>';
    html += '<li>💡 Совет: экспортируйте текущее сохранение перед созданием нового!</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%;">↩️ Назад</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}

// Обработчик выбора файла для загрузки
function handleImportSave(event) {
    const file = event.target.files[0];
    if (file) {
        importSaveFile(file);
    }
    event.target.value = '';
}

// Добавляем кнопку в навигационное меню
function addSaveLoadButton() {
    const navGrid = document.querySelector('.nav-grid');
    if (navGrid && !document.querySelector('.nav-card[onclick="showSaveLoadPanel()"]')) {
        const saveLoadCard = document.createElement('div');
        saveLoadCard.className = 'nav-card';
        saveLoadCard.setAttribute('onclick', 'showSaveLoadPanel()');
        saveLoadCard.innerHTML = '<div class="nav-card-icon">💾</div><div class="nav-card-title">Сохранения</div>';
        navGrid.appendChild(saveLoadCard);
        
        // Добавляем разделитель или просто размещаем кнопку
        const cards = navGrid.querySelectorAll('.nav-card');
        if (cards.length > 0) {
            // Делаем красивую сетку
            navGrid.style.display = 'grid';
            navGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))';
        }
    }
}

// Переопределяем renderGame, чтобы добавить кнопку сохранений
const originalRenderGame = renderGame;
renderGame = function() {
    originalRenderGame();
    setTimeout(addSaveLoadButton, 100);
};

// Сохраняем время игры перед закрытием страницы
window.addEventListener('beforeunload', function() {
    if (player) {
        savePlayTime();
        saveGame();
    }
});

// Запускаем таймер при загрузке
startPlayTimer();

// Экспортируем функции в глобальную область
window.exportSaveFile = exportSaveFile;
window.importSaveFile = importSaveFile;
window.showSaveLoadPanel = showSaveLoadPanel;
window.handleImportSave = handleImportSave;
window.resetGame = resetGame;
window.createNewCharacter = createNewCharacter;

// Запуск игры
init();