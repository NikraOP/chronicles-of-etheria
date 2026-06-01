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
        version: '2.1',
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        player: JSON.parse(JSON.stringify(player)), // Глубокая копия
        gameStats: {
            totalPlayTime: getPlayTime(),
            totalVictories: player.victories || 0,
            level: player.level,
            gold: player.gold
        }
    };
    
    // Преобразуем в JSON строку
    const jsonStr = JSON.stringify(saveData, null, 2);
    
    // Создаём blob и ссылку для скачивания
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
            
            // Проверка валидности файла
            if (!saveData.player || !saveData.player.class) {
                addMessage('❌ Неверный формат файла сохранения!', 'error');
                return;
            }
            
            // Проверка версии
            if (saveData.version && saveData.version !== '2.1') {
                addMessage(`⚠️ Версия сохранения (${saveData.version}) отличается от текущей (2.1). Возможны проблемы.`, 'info');
            }
            
            // Загружаем данные
            player = saveData.player;
            
            // Инициализируем отсутствующие поля
            if (!player.professions) player.professions = {};
            if (!player.resources) player.resources = {};
            if (!player.inventory) player.inventory = { armor: [], weapons: [], stones: [], potions: [], foods: [], elixirs: [], scrolls: [] };
            if (!player.temporaryEffects) player.temporaryEffects = [];
            if (!player.abilities) player.abilities = [];
            
            // Пересчитываем статы и способности
            resetBaseStats();
            updateAllAbilities();
            player.health = player.maxHealth;
            if (player.class === 'Маг') player.mana = player.maxMana;
            
            // Сохраняем в localStorage
            saveGame();
            
            // Обновляем интерфейс
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

// Создание кнопок сохранения/загрузки в интерфейсе
function showSaveLoadPanel() {
    stopGathering();
    let html = '<h2>💾 Управление сохранениями</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 20px;">';
    
    // Информация о текущем сохранении
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
        html += '<p style="color: #e74c3c;">Нет активного персонажа! Сначала создайте персонажа.</p>';
    }
    
    // Кнопки действий
    html += '<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px;">';
    html += '<button class="action-btn" onclick="exportSaveFile()" style="background: linear-gradient(135deg, #27ae60, #2ecc71); border: none;">💾 Скачать сохранение (JSON)</button>';
    html += '<label class="action-btn" style="background: linear-gradient(135deg, #2980b9, #3498db); border: none; cursor: pointer; display: inline-block;">📂 Загрузить сохранение<input type="file" id="importSaveInput" accept=".json" style="display: none;" onchange="handleImportSave(event)"></label>';
    html += '</div>';
    
    html += '<div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">';
    html += '<h4 style="color: var(--gold); margin-bottom: 10px;">ℹ️ Информация</h4>';
    html += '<ul style="margin-left: 20px; font-size: 12px; color: var(--text-secondary);">';
    html += '<li>Сохранение экспортируется в JSON файл</li>';
    html += '<li>Файл содержит имя персонажа, уровень и дату создания</li>';
    html += '<li>Для загрузки выберите ранее сохранённый JSON файл</li>';
    html += '<li>Совместимо с версией игры 2.1 и выше</li>';
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
    // Очищаем input, чтобы можно было загрузить тот же файл повторно
    event.target.value = '';
}

// Добавляем кнопку в навигационное меню (вызывать после renderGame)
function addSaveLoadButton() {
    const navGrid = document.querySelector('.nav-grid');
    if (navGrid && !document.querySelector('.nav-card[onclick="showSaveLoadPanel()"]')) {
        const saveLoadCard = document.createElement('div');
        saveLoadCard.className = 'nav-card';
        saveLoadCard.setAttribute('onclick', 'showSaveLoadPanel()');
        saveLoadCard.innerHTML = '<div class="nav-card-icon">💾</div><div class="nav-card-title">Сохранения</div>';
        navGrid.appendChild(saveLoadCard);
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

// Запуск игры
init();