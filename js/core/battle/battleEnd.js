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

    if (window.dungeonDuoBattleActive && typeof getDuoDungeonState === 'function') {
        const duo = getDuoDungeonState();
        if (duo.role === 'guest') {
            let snap = null;
            if (typeof buildDungeonRoomSnapshot === 'function') {
                snap = buildDungeonRoomSnapshot();
                if (typeof fillPartyInSnapshot === 'function') fillPartyInSnapshot(snap);
            }
            if (typeof sendDuoDungeonBattleAction === 'function') {
                sendDuoDungeonBattleAction({ type: 'victory_claim', snapshot: snap });
            }
            if (typeof addBattleLog === 'function') {
                addBattleLog('⏳ Победа отправлена хосту для подтверждения…', 'info');
            }
            isPlayerTurn = false;
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return;
        }
    }

    dungeonVictoryApplyAndModal();
}

function dungeonVictoryApplyAndModal() {
    if (!currentMonster) return;

    const enemies = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
    let totalExp = currentMonster.exp;
    if (enemies.length > 1) {
        totalExp = enemies.reduce(function (sum, e) { return sum + (e && e.exp ? e.exp : 0); }, 0);
    }
    let gold = Math.floor((totalExp / 4 + player.level * 1.5) * currentMonster.goldMult / 15);
    gold = Math.floor(gold * 1.0);
    const rewardLines = claimSpecialBattleRewards(currentMonster);
    const returnTo = currentMonster.returnTo;

    window.lastVictoryData = { exp: totalExp, gold: gold };
    player.gold += gold;
    player.experience += totalExp;
    player.victories = (player.victories || 0) + 1;

    while (player.experience >= player.maxExperience) {
        player.experience -= player.maxExperience;
        player.level++;
        player.maxExperience = Math.floor(player.level * 70 + 250);
        resetBaseStats();
        player.health = player.maxHealth;
        if (player.class === 'Маг') player.mana = player.maxMana;
        updateAllAbilities();
        addMessage('🎉 ПОВЫШЕНИЕ УРОВНЯ! Теперь вы ' + player.level + ' уровень!', 'success');
    }

    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    const isDuoHost = duo && duo.role === 'host' && session && session.mode === 'duo';

    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('run');

    if (isDuoHost && typeof sendDuoDungeonRoomState === 'function') {
        sendDuoDungeonRoomState({
            kind: 'victory_ack',
            exp: totalExp,
            gold: gold,
            rewardLines: rewardLines
        });
    }

    currentMonster = null;
    isPlayerTurn = true;
    window._strikeAnimActive = false;
    if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    const rewardText = rewardLines.length ? '\n\n' + rewardLines.join('\n') : '';
    window._battleEndModalOpen = true;
    showModal('🎉 Победа!', '🏆', 'Вы победили!\n⭐ Опыт: +' + window.lastVictoryData.exp + '\n💰 Золото: +' + window.lastVictoryData.gold + rewardText + '\n📊 Уровень: ' + player.level, 'Продолжить', function () {
        window._battleEndModalOpen = false;
        document.getElementById('dynamicContent').innerHTML = '';
        if (returnTo && returnTo !== '__dungeon_solo__' && returnTo !== '__dungeon_duo__' &&
            typeof showGatheringResources === 'function') {
            showGatheringResources(returnTo);
        } else if (returnTo !== '__dungeon_solo__' && returnTo !== '__dungeon_duo__') {
            renderGame();
        }
    });
}

window.dungeonVictoryApplyAndModal = dungeonVictoryApplyAndModal;

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
    if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    window._battleEndModalOpen = true;
    showModal('💀 Поражение', '💀', 'Вы погибли!\n💔 Опыт: -' + xpLoss + '\n💰 Золото: -' + goldLoss, 'Продолжить', () => {
        window._battleEndModalOpen = false;
        document.getElementById('dynamicContent').innerHTML = '';
        renderGame();
    });
}