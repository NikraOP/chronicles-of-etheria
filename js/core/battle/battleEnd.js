// js/core/battle/battleEnd.js

function claimSpecialBattleRewards(monster) {
    if (!monster || !monster.rewards || specialBattleRewardClaimed) return [];
    specialBattleRewardClaimed = true;
    const rewardLines = [];
    const rewards = monster.rewards;
    
    if (rewards.resources) {
        for (let resourceName in rewards.resources) {
            const amount = rewards.resources[resourceName];
            if (typeof addResourceToPlayer === 'function') {
                addResourceToPlayer(resourceName, amount);
            } else {
                if (!player.resources[resourceName]) player.resources[resourceName] = 0;
                player.resources[resourceName] += amount;
            }
            rewardLines.push(`🎁 ${resourceName}: +${amount}`);
        }
    }
    
    if (rewards.chanceResources) {
        rewards.chanceResources.forEach(drop => {
            if (Math.random() * 100 <= (drop.chance || 0)) {
                const amount = drop.amount || 1;
                if (typeof addResourceToPlayer === 'function') {
                    addResourceToPlayer(drop.name, amount);
                } else {
                    if (!player.resources[drop.name]) player.resources[drop.name] = 0;
                    player.resources[drop.name] += amount;
                }
                rewardLines.push(`🎁 ${drop.name}: +${amount}`);
            }
        });
    }
    
    if (rewards.professionExp) {
        for (let profId in rewards.professionExp) {
            const exp = rewards.professionExp[profId];
            if (typeof applyProfessionExp === 'function') applyProfessionExp(profId, exp);
            rewardLines.push(`🎣 ${profId}: +${exp} XP`);
        }
    }
    
    return rewardLines;
}

function victory() {
    if (window.pvpBattleActive && typeof window.pvpBroadcastMatchEnd === 'function') {
        window.pvpBroadcastMatchEnd(true);
        return;
    }
    if (!currentMonster) return;
    let gold = Math.floor((currentMonster.exp / 4 + player.level * 1.5) * currentMonster.goldMult / 15);
    gold = Math.floor(gold * 1.0);
    const rewardLines = claimSpecialBattleRewards(currentMonster);
    const returnTo = currentMonster.returnTo;
    
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
    isPlayerTurn = true;
    window._strikeAnimActive = false;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    const rewardText = rewardLines.length ? '\n\n' + rewardLines.join('\n') : '';
    showModal('🎉 Победа!', '🏆', 'Вы победили!\n⭐ Опыт: +' + window.lastVictoryData.exp + '\n💰 Золото: +' + window.lastVictoryData.gold + rewardText + '\n📊 Уровень: ' + player.level, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        if (returnTo && typeof showGatheringResources === 'function') showGatheringResources(returnTo);
        else renderGame();
    });
}

function gameOver() {
    if (window.pvpBattleActive && typeof window.pvpBroadcastMatchEnd === 'function') {
        window.pvpBroadcastMatchEnd(false);
        return;
    }
    const xpLoss = Math.floor(player.experience * 0.1);
    const goldLoss = Math.floor(player.gold * 0.15);
    player.experience = Math.max(0, player.experience - xpLoss);
    player.gold = Math.max(0, player.gold - goldLoss);
    player.health = Math.floor(player.maxHealth / 2);
    if (player.class === 'Маг') player.mana = Math.floor(player.maxMana / 2);
    specialBattleRewardClaimed = false;
    currentMonster = null;
    isPlayerTurn = true;
    window._strikeAnimActive = false;
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    showModal('💀 Поражение', '💀', 'Вы погибли!\n💔 Опыт: -' + xpLoss + '\n💰 Золото: -' + goldLoss, 'Продолжить', () => {
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
}