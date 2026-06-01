// player.js - С отладкой для проверки загрузки изображений

let player = null;

function selectClass(className) {
    console.log('=== selectClass ===');
    console.log('Выбран класс:', className);
    
    window.selectedClass = className;
    document.getElementById('branchSelection').style.display = 'block';
    const branchesDiv = document.getElementById('branches');
    let branches = [];
    if (className === 'Воин') branches = ['Школа Ярости', 'Школа Защиты', 'Школа Оружия'];
    else if (className === 'Маг') branches = ['Школа Огня', 'Школа Льда', 'Школа Утилити'];
    else if (className === 'Лучник') branches = ['Школа Снайпера', 'Школа Охотника', 'Школа Выживания'];
    
    console.log('Доступные ветки:', branches);
    
    branchesDiv.innerHTML = branches.map(b => `
        <div class="class-option" onclick="selectBranch('${b}', event)">
            <div style="font-size: 45px;">${getBranchIcon(b)}</div>
            <h3>${b}</h3>
            <small style="font-size: 10px;">${getBranchDescription(b)}</small>
        </div>
    `).join('');
    
    document.getElementById('startBtn').style.display = 'block';
}

function getBranchIcon(branch) {
    const icons = {
        'Школа Ярости': '😤',
        'Школа Защиты': '🛡️',
        'Школа Оружия': '⚔️',
        'Школа Огня': '🔥',
        'Школа Льда': '❄️',
        'Школа Утилити': '✨',
        'Школа Снайпера': '🎯',
        'Школа Охотника': '🏹',
        'Школа Выживания': '🌿'
    };
    return icons[branch] || '✨';
}

function getBranchDescription(branch) {
    const descriptions = {
        'Школа Ярости': 'Максимальный урон, комбо-атаки',
        'Школа Защиты': 'Выживаемость, щиты, отражение',
        'Школа Оружия': 'Критические удары, точность',
        'Школа Огня': 'Массовый урон, горение',
        'Школа Льда': 'Контроль, заморозка, щиты',
        'Школа Утилити': 'Поддержка, мана, баффы',
        'Школа Снайпера': 'Точные выстрелы, криты',
        'Школа Охотника': 'Ловушки, яды, контроль',
        'Школа Выживания': 'Уклонение, контратаки'
    };
    return descriptions[branch] || '';
}

function selectBranch(branch, event) {
    console.log('=== selectBranch ===');
    console.log('Выбрана ветка:', branch);
    
    window.selectedBranch = branch;
    document.querySelectorAll('.class-option').forEach(opt => opt.style.border = 'none');
    if (event && event.currentTarget) {
        event.currentTarget.style.border = '2px solid var(--gold)';
    }
}

function finalizeCharacter() {
    console.log('=== finalizeCharacter ===');
    console.log('1. Начало создания персонажа');
    
    const name = document.getElementById('nameInput').value.trim();
    console.log('2. Имя:', name);
    
    if (name.length < 2 || name.length > 20) {
        alert('Имя должно быть от 2 до 20 символов');
        return;
    }
    if (!window.selectedClass || !window.selectedBranch) {
        alert('Выберите класс и школу');
        return;
    }
    
    const className = window.selectedClass;
    const branch = window.selectedBranch;
    console.log('3. Класс:', className);
    console.log('4. Ветка:', branch);
    
    // Получаем изображение школы из ABILITIES_DB
    let schoolImg = '';
    console.log('5. Проверка ABILITIES_DB...');
    console.log('ABILITIES_DB существует?', typeof ABILITIES_DB !== 'undefined');

    console.log('ABILITIES_DB[className] =', ABILITIES_DB[className]);
    console.log('ABILITIES_DB[className][branch] =', ABILITIES_DB[className][branch]);
    console.log('schoolImg =', schoolImg);
    
    if (ABILITIES_DB && ABILITIES_DB[className]) {
        console.log('6. Класс', className, 'найден в ABILITIES_DB');
        console.log('7. Доступные школы:', Object.keys(ABILITIES_DB[className]));
        
        if (ABILITIES_DB[className][branch]) {
            schoolImg = ABILITIES_DB[className][branch].img || '';
            console.log('8. Найдено изображение для школы', branch, ':', schoolImg);
        } else {
            console.error('9. ОШИБКА: Школа', branch, 'не найдена в ABILITIES_DB[' + className + ']');
        }
    } else {
        console.error('10. ОШИБКА: Класс', className, 'не найден в ABILITIES_DB');
    }
    
    // Проверяем, существует ли файл изображения
    if (schoolImg) {
        console.log('11. Путь к изображению:', schoolImg);
        
        // Создаём временный объект Image для проверки существования файла
        const testImg = new Image();
        testImg.onload = function() {
            console.log('✅ Изображение ЗАГРУЗИЛОСЬ! Путь правильный:', schoolImg);
        };
        testImg.onerror = function() {
            console.error('❌ Изображение НЕ ЗАГРУЗИЛОСЬ! Проверьте путь:', schoolImg);
            console.log('   Полный URL должен быть примерно:', window.location.origin + '/' + schoolImg);
        };
        testImg.src = schoolImg;
    } else {
        console.log('11. Изображение не указано, будет использован эмодзи');
    }
    
    // Базовые статы
    let baseStats = {};
    if (className === 'Воин') {
        baseStats = { health: 120, maxHealth: 120, attack: 15, defense: 8, mana: 0, maxMana: 0, criticalChance: 5, criticalDamage: 150, dodgeChance: 5 };
    } else if (className === 'Маг') {
        baseStats = { health: 90, maxHealth: 90, attack: 18, defense: 4, mana: 100, maxMana: 100, criticalChance: 8, criticalDamage: 160, dodgeChance: 3 };
    } else {
        baseStats = { health: 100, maxHealth: 100, attack: 16, defense: 5, mana: 0, maxMana: 0, criticalChance: 10, criticalDamage: 170, dodgeChance: 8 };
    }
    
    player = {
        name: name,
        class: className,
        branch: branch,
        schoolImg: schoolImg,
        level: 1,
        experience: 0,
        maxExperience: 320,
        gold: 150,
        victories: 0,
        location: 'Сумеречный лес',
        professions: {},
        resources: {},
        inventory: {
            weapons: [],
            helmets: [],
            chests: [],
            pants: [],
            boots: [],
            potions: [],
            foods: [],
            elixirs: [],
            scrolls: [],
            stones: []
        },
        equipment: {
            weapon: null,
            helmet: null,
            chest: null,
            pants: null,
            boots: null
        },
        abilities: [],
        ...baseStats
    };
    
    console.log('12. Объект player создан:', player);
    
    addStartingEquipment();
    updateAllAbilities();
    resetBaseStats();
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    saveGame();
    
    console.log('13. Персонаж создан успешно!');
    console.log('14. schoolImg в player:', player.schoolImg);
    
    renderGame();
}

function addStartingEquipment() {
    console.log('=== addStartingEquipment ===');
    if (player.class === 'Воин') {
        player.inventory.weapons.push({name:'Стальной меч',rarity:'Обычный',dmg:10,def:2,baseDmg:10,upgradeLevel:0});
        player.equipment.weapon = player.inventory.weapons[0];
        console.log('Добавлено оружие воина: Стальной меч');
    } else if (player.class === 'Маг') {
        player.inventory.weapons.push({name:'Дубовый посох',rarity:'Обычный',dmg:8,hp:15,baseDmg:8,upgradeLevel:0});
        player.equipment.weapon = player.inventory.weapons[0];
        console.log('Добавлено оружие мага: Дубовый посох');
    } else {
        player.inventory.weapons.push({name:'Охотничий лук',rarity:'Обычный',dmg:11,dodge:3,baseDmg:11,upgradeLevel:0});
        player.equipment.weapon = player.inventory.weapons[0];
        console.log('Добавлено оружие лучника: Охотничий лук');
    }
}

function updateAllAbilities() {
    console.log('=== updateAllAbilities ===');
    const school = ABILITIES_DB[player.class] && ABILITIES_DB[player.class][player.branch];
    if (!school || !school.abilities) {
        console.error('Школа не найдена:', player.class, player.branch);
        return;
    }
    player.abilities = school.abilities.filter(a => player.level >= a.lvl).map(a => ({
        ...a, currentCooldown: 0
    }));
    console.log(`Загружено способностей: ${player.abilities.length}`);
}

function resetBaseStats() {
    let baseStats = {};
    if (player.class === 'Воин') {
        baseStats = { attack: 15, defense: 8, criticalChance: 5, criticalDamage: 150, dodgeChance: 5 };
    } else if (player.class === 'Маг') {
        baseStats = { attack: 18, defense: 4, criticalChance: 8, criticalDamage: 160, dodgeChance: 3 };
    } else {
        baseStats = { attack: 16, defense: 5, criticalChance: 10, criticalDamage: 170, dodgeChance: 8 };
    }
    
    const levelBonus = 1 + (player.level - 1) * 0.05;
    
    player.attack = Math.floor(baseStats.attack * levelBonus);
    player.defense = Math.floor(baseStats.defense * levelBonus);
    player.criticalChance = Math.min(50, Math.floor(baseStats.criticalChance * levelBonus));
    player.criticalDamage = Math.min(250, Math.floor(baseStats.criticalDamage * levelBonus));
    player.dodgeChance = Math.min(70, Math.floor(baseStats.dodgeChance * levelBonus));
    
    for (let slot in player.equipment) {
        const item = player.equipment[slot];
        if (item) {
            if (item.dmg) player.attack += item.dmg;
            if (item.def) player.defense += item.def;
            if (item.hp) player.maxHealth += item.hp;
            if (item.crit) player.criticalChance += item.crit;
            if (item.critDmg) player.criticalDamage += item.critDmg;
            if (item.dodge) player.dodgeChance += item.dodge;
            if (item.mana && player.class === 'Маг') player.maxMana += item.mana;
        }
    }
    
    player.maxHealth = Math.floor(80 + player.level * 10);
    if (player.class === 'Маг') player.maxMana = Math.floor(100 + player.level * 10);
    player.criticalChance = Math.min(50, player.criticalChance);
    player.criticalDamage = Math.min(250, player.criticalDamage);
    player.dodgeChance = Math.min(70, player.dodgeChance);
}

function getAvatar() {
    console.log('=== getAvatar ===');
    console.log('player.schoolImg:', player.schoolImg);
    
    if (player.schoolImg && player.schoolImg !== '') {
        const imgPath = player.schoolImg;
        console.log('Пытаемся загрузить изображение:', imgPath);
        
        // Формируем полный URL для проверки
        const fullUrl = window.location.origin + '/' + imgPath;
        console.log('Полный URL:', fullUrl);
        
        // УВЕЛИЧЕННЫЙ РАЗМЕР (120x120 вместо 80x80)
        return `<img src="${imgPath}" 
                      style="width: 220px; height: 220px; " 
                      onerror="console.error('❌ ОШИБКА ЗАГРУЗКИ: изображение не найдено по пути', '${imgPath}'); this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='${getFallbackAvatar()}'">`;
    }
    console.log('Изображение не указано, используем эмодзи');
    return getFallbackAvatar();
}

function getFallbackAvatar() {
    if (player.class === 'Воин') return '🗡️';
    if (player.class === 'Маг') return '🧙';
    return '🏹';
}

function addMessage(msg, type) {
    const container = document.getElementById('messagesContainer');
    if (!container) {
        console.log('Message:', msg, type);
        return;
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.textContent = msg;
    container.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
}

function showModal(title, icon, message, buttonText, callback) {
    const modal = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px;">${icon}</div>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="action-btn" onclick="closeModal()">${buttonText}</button>
        </div>
    `;
    modal.style.display = 'flex';
    window.modalCallback = callback;
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    if (window.modalCallback) {
        window.modalCallback();
        window.modalCallback = null;
    }
}

function saveGame() {
    localStorage.setItem('rpg_save_v21', JSON.stringify(player));
}

// Проверка при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PLAYER.JS ЗАГРУЖЕН ===');
    console.log('ABILITIES_DB доступна?', typeof ABILITIES_DB !== 'undefined');
    if (typeof ABILITIES_DB !== 'undefined') {
        console.log('Доступные классы:', Object.keys(ABILITIES_DB));
        console.log('Воин:', ABILITIES_DB['Воин'] ? Object.keys(ABILITIES_DB['Воин']) : 'нет');
        console.log('Маг:', ABILITIES_DB['Маг'] ? Object.keys(ABILITIES_DB['Маг']) : 'нет');
        console.log('Лучник:', ABILITIES_DB['Лучник'] ? Object.keys(ABILITIES_DB['Лучник']) : 'нет');
    }
});

window.selectClass = selectClass;
window.selectBranch = selectBranch;
window.finalizeCharacter = finalizeCharacter;
window.closeModal = closeModal;
window.getAvatar = getAvatar;
window.addMessage = addMessage;
window.showModal = showModal;
window.saveGame = saveGame;