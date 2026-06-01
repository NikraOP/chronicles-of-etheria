let player = null, selectedClass = null, selectedBranch = null;
let echoActive = false, lastVictoryData = null;

function saveGame() { if (player) localStorage.setItem('rpg_save_v21', JSON.stringify(player)); }

function getCappedDodge(rawDodge) { return Math.min(rawDodge, 60); } // Снижен кап до 60%

function calculateDamage(attack, defense) {
    const reduction = defense / 4;
    return Math.max(1, Math.floor(attack * (100 - Math.min(reduction, 70)) / 100));
}

function resetBaseStats() {
    if (!player) return;
    switch (player.class) {
        case 'Воин':
            player.maxHealth = 120 + (player.level - 1) * 14;
            player.attack = 14 + (player.level - 1) * 4;
            player.defense = 8 + (player.level - 1) * 4;
            player.dodgeChance = getCappedDodge(2 + Math.floor((player.level - 1) * 0.5));
            player.criticalChance = 2 + Math.floor((player.level - 1) * 0.5);
            player.criticalDamage = Math.min(140 + (player.level - 1) * 3, 220);
            player.mana = 0; player.maxMana = 0;
            break;
        case 'Маг':
            player.maxHealth = 70 + (player.level - 1) * 7;
            player.attack = 20 + (player.level - 1) * 5;
            player.defense = 2 + Math.floor((player.level - 1) * 0.4);
            player.dodgeChance = getCappedDodge(5 + Math.floor((player.level - 1) * 1));
            player.criticalChance = 4 + Math.floor((player.level - 1) * 0.6);
            player.criticalDamage = Math.min(140 + (player.level - 1) * 2, 220);
            player.mana = 40 + (player.level - 1) * 10;
            player.maxMana = 40 + (player.level - 1) * 10;
            break;
        case 'Лучник':
            player.maxHealth = 65 + (player.level - 1) * 10;
            player.attack = 22 + (player.level - 1) * 4;
            player.defense = 3 + Math.floor((player.level - 1) * 0.4);
            player.dodgeChance = getCappedDodge(8 + Math.floor((player.level - 1) * 1.2));
            player.criticalChance = 4 + Math.floor((player.level - 1) * 0.6);
            player.criticalDamage = Math.min(130 + (player.level - 1) * 1.2, 180);
            player.mana = 0; player.maxMana = 0;
            break;
    }
    applyPassives();
    applyEquipmentBonuses();
}

function applyPassives() {
    if (!player) return;
    player.abilities.forEach(a => {
        if (a.passive) {
            if (a.permAtk) player.attack += Math.floor(player.attack * a.permAtk / 100);
            if (a.permCrit) player.criticalChance += a.permCrit;
        }
    });
    player.criticalChance = Math.min(player.criticalChance, 45);
}

function applyEquipmentBonuses() {
    if (!player) return;
    Object.values(player.equipment).forEach(item => {
        if (!item) return;
        if (item.hp) player.maxHealth += item.hp;
        if (item.dmg) player.attack += item.dmg;
        if (item.def) player.defense += item.def;
        if (item.dodge) player.dodgeChance = getCappedDodge(player.dodgeChance + item.dodge);
        if (item.crit) player.criticalChance = Math.min(player.criticalChance + item.crit, 45);
        if (item.critDmg) {
            let newCrit = player.criticalDamage + item.critDmg;
            if (player.class === 'Лучник') newCrit = Math.min(newCrit, 180);
            else newCrit = Math.min(newCrit, 220);
            player.criticalDamage = newCrit;
        }
    });
    if (player.health > player.maxHealth) player.health = player.maxHealth;
}

function updateAllAbilities() {
    if (!player || !player.class || !player.branch) return;
    const all = ABILITIES_DB[player.class]?.[player.branch] || [];
    player.abilities = all.filter(a => player.level >= a.lvl).map(a => {
        const c = {};
        for (let k in a) c[k] = a[k];
        c.currentCooldown = 0;
        return c;
    });
}

function getAvatar() { return player.class === 'Воин' ? '🗡️' : player.class === 'Маг' ? '🧙' : '🏹'; }

function finalizeCharacter() {
    if (!selectedClass || !selectedBranch) { alert('Выберите класс и школу!'); return; }
    const nameEl = document.getElementById('nameInput');
    let name = nameEl ? nameEl.value : 'Герой';
    if (!name || name.length < 2 || name.length > 20) { alert('Имя должно быть от 2 до 20 символов!'); return; }
    player = {
        name: name, class: selectedClass, branch: selectedBranch, level: 1, health: 0, maxHealth: 0, attack: 0, defense: 0,
        dodgeChance: 0, criticalChance: 0, criticalDamage: 0, experience: 0, maxExperience: 250,
        gold: 200,
        location: 'Сумеречный лес', victories: 0, mana: 0, maxMana: 0,
        equipment: { helmet: null, chest: null, pants: null, boots: null, weapon: null },
        inventory: { armor: [], weapons: [], stones: [] }, abilities: [], temporaryEffects: [], professions: {}, resources: {}, playerImg: '', potions: [],   // ← ДОБАВИТЬ
            foods: [],     // ← ДОБАВИТЬ
            elixirs: [],   // ← ДОБАВИТЬ
            scrolls: []    // ← ДОБАВИТЬ
    };
    resetBaseStats();
    player.health = player.maxHealth;
    updateAllAbilities();
    saveGame();
    renderGame();
}

function addMessage(text, type) {
    type = type || 'info';
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    const messages = container.querySelectorAll('.message');
    if (messages.length > 4) messages[0].remove();
    const msg = document.createElement('div');
    msg.className = 'message ' + type;
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}

function showModal(title, icon, text, btnText, callback) {
    stopGathering();
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = '<span style="font-size:70px;">' + icon + '</span><h2 style="color:var(--gold);">' + title + '</h2><p style="white-space:pre-line;">' + text + '</p><button class="modal-btn" id="modalCloseBtn">' + btnText + '</button>';
    overlay.classList.add('active');
    document.getElementById('modalCloseBtn').onclick = function () {
        overlay.classList.remove('active');
        if (callback) callback();
    };
}

function selectClass(cls) {
    selectedClass = cls;
    selectedBranch = null;
    document.querySelectorAll('.class-option').forEach(el => el.classList.remove('selected'));
    const cel = document.querySelector('[data-class="' + cls + '"]');
    if (cel) cel.classList.add('selected');
    document.getElementById('branchSelection').style.display = 'block';
    document.getElementById('startBtn').style.display = 'block';
    const branches = Object.keys(ABILITIES_DB[cls]);
    let html = '';
    for (let i = 0; i < branches.length; i++) html += '<div class="class-option" data-branch="' + branches[i] + '" onclick="selectBranch(\'' + branches[i] + '\')" style="width:140px;"><h4>' + branches[i] + '</h4></div>';
    document.getElementById('branches').innerHTML = html;
}

function selectBranch(branch) {
    selectedBranch = branch;
    document.querySelectorAll('[data-branch]').forEach(el => el.classList.remove('selected'));
    const bel = document.querySelector('[data-branch="' + branch + '"]');
    if (bel) bel.classList.add('selected');
}