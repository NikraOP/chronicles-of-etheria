// js/core/battle/battleEnd.js

function victory() {
    let gold = Math.floor((currentMonster.exp / 4 + player.level * 1.5) * currentMonster.goldMult / 15);
    gold = Math.floor(gold * 1.0);
    
    window.lastVictoryData = { exp: currentMonster.exp, gold: gold };
    player.gold += gold;
    player.experience += currentMonster.exp;
    player.victories = (player.victories || 0) + 1;
    
    while (player.experience >= player.maxExperience) {
        player.experience -= player.maxExperience;
        player.level++;
        player.maxExperience = Math.floor(player.level * 70 + 250);
        resetBaseStats();
        player.health = player.maxHealth;
        if (player.class === 'Маг') player.mana = player.maxMana;
        updateAllAbilities();
        addMessage(`🎉 ПОВЫШЕНИЕ УРОВНЯ! Теперь вы ${player.level} уровень!`, 'success');
    }
    currentMonster = null;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    showModal('🎉 Победа!', '🏆', 'Вы победили!\n⭐ Опыт: +' + window.lastVictoryData.exp + '\n💰 Золото: +' + window.lastVictoryData.gold + '\n📊 Уровень: ' + player.level, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
}

function gameOver() {
    const xpLoss = Math.floor(player.experience * 0.1);
    const goldLoss = Math.floor(player.gold * 0.15);
    player.experience = Math.max(0, player.experience - xpLoss);
    player.gold = Math.max(0, player.gold - goldLoss);
    player.health = Math.floor(player.maxHealth / 2);
    if (player.class === 'Маг') player.mana = Math.floor(player.maxMana / 2);
    currentMonster = null;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    showModal('💀 Поражение', '💀', 'Вы погибли!\n💔 Опыт: -' + xpLoss + '\n💰 Золото: -' + goldLoss, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
}