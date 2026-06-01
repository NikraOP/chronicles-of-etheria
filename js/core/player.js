// player.js - Исправленная версия с поддержкой пола

let player = null;

function selectClass(className) {
    console.log('=== selectClass ===');
    console.log('Выбран класс:', className);
    
    window.selectedClass = className;
    document.getElementById('genderSelection').style.display = 'block';
    document.getElementById('branchSelection').style.display = 'none';
    document.getElementById('startBtn').style.display = 'none';
    
    const genderDiv = document.getElementById('genders');
    genderDiv.innerHTML = `
        <div class="class-option" onclick="selectGender('male')">
            <div style="font-size: 45px;">👨</div>
            <h3>Мужской</h3>
        </div>
        <div class="class-option" onclick="selectGender('female')">
            <div style="font-size: 45px;">👩</div>
            <h3>Женский</h3>
        </div>
    `;
}

function selectGender(gender) {
    console.log('=== selectGender ===');
    console.log('Выбран пол:', gender);
    
    window.selectedGender = gender;
    document.getElementById('genderSelection').style.display = 'none';
    document.getElementById('branchSelection').style.display = 'block';
    
    const branchesDiv = document.getElementById('branches');
    let branches = [];
    if (window.selectedClass === 'Воин') branches = ['Школа Ярости', 'Школа Защиты', 'Школа Оружия'];
    else if (window.selectedClass === 'Маг') branches = ['Школа Огня', 'Школа Льда', 'Школа Утилити'];
    else if (window.selectedClass === 'Лучник') branches = ['Школа Снайпера', 'Школа Охотника', 'Школа Выживания'];
    
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
    if (!window.selectedClass || !window.selectedBranch || !window.selectedGender) {
        alert('Выберите класс, пол и школу');
        return;
    }
    
    const className = window.selectedClass;
    const branch = window.selectedBranch;
    const gender = window.selectedGender;
    
    console.log('3. Класс:', className);
    console.log('4. Ветка:', branch);
    console.log('5. Пол:', gender);
    
    // Получаем изображение школы из SKINS_DB с учётом пола
    let schoolImg = '';
    if (typeof SKINS_DB !== 'undefined' && SKINS_DB[className] && SKINS_DB[className][gender] && SKINS_DB[className][gender][branch]) {
        const defaultSkin = SKINS_DB[className][gender][branch].find(s => s.price === 0);
        if (defaultSkin) {
            schoolImg = defaultSkin.img;
            console.log('6. Найдено изображение для', className, gender, branch, ':', schoolImg);
        } else {
            console.error('7. Не найден дефолтный скин для', className, gender, branch);
        }
    } else {
        console.error('8. ОШИБКА: Скины не найдены для', className, gender, branch);
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
        gender: gender,
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
        unlockedSkins: [],
        currentSkin: null,
        ...baseStats
    };
    
    console.log('9. Объект player создан:', player);
    
    addStartingEquipment();
    updateAllAbilities();
    resetBaseStats();
    player.health = player.maxHealth;
    if (player.class === 'Маг') player.mana = player.maxMana;
    
    // Инициализируем скины
    if (typeof initSkins !== 'undefined') {
        initSkins();
    }
    
    saveGame();
    
    console.log('10. Персонаж создан успешно!');
    console.log('11. schoolImg в player:', player.schoolImg);
    
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
    
    let bonusHp = 0;
    let bonusMana = 0;
    
    for (let slot in player.equipment) {
        const item = player.equipment[slot];
        if (item) {
            if (item.dmg) player.attack += item.dmg;
            if (item.def) player.defense += item.def;
            if (item.hp) bonusHp += item.hp;
            if (item.crit) player.criticalChance += item.crit;
            if (item.critDmg) player.criticalDamage += item.critDmg;
            if (item.dodge) player.dodgeChance += item.dodge;
            if (item.mana && player.class === 'Маг') bonusMana += item.mana;
        }
    }
    
    const baseHealth = 80;
    player.maxHealth = Math.floor(baseHealth + player.level * 10) + bonusHp;
    
    if (player.class === 'Маг') {
        const baseMana = 100;
        player.maxMana = Math.floor(baseMana + player.level * 10) + bonusMana;
        if (player.mana > player.maxMana) player.mana = player.maxMana;
    }
    
    player.criticalChance = Math.min(50, player.criticalChance);
    player.criticalDamage = Math.min(250, player.criticalDamage);
    player.dodgeChance = Math.min(70, player.dodgeChance);
    
    if (player.health > player.maxHealth) player.health = player.maxHealth;
}

function getAvatar() {
    console.log('=== getAvatar ===');
    console.log('player.schoolImg:', player.schoolImg);
    
    if (player.schoolImg && player.schoolImg !== '') {
        const imgPath = player.schoolImg;
        console.log('Пытаемся загрузить изображение:', imgPath);
        
        return `<img class="player-avatar" src="${imgPath}" 
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PLAYER.JS ЗАГРУЖЕН ===');
    console.log('ABILITIES_DB доступна?', typeof ABILITIES_DB !== 'undefined');
    console.log('SKINS_DB доступна?', typeof SKINS_DB !== 'undefined');
    if (typeof ABILITIES_DB !== 'undefined') {
        console.log('Доступные классы:', Object.keys(ABILITIES_DB));
    }
});

window.selectClass = selectClass;
window.selectGender = selectGender;
window.selectBranch = selectBranch;
window.finalizeCharacter = finalizeCharacter;
window.closeModal = closeModal;
window.getAvatar = getAvatar;
window.addMessage = addMessage;
window.showModal = showModal;
window.saveGame = saveGame;