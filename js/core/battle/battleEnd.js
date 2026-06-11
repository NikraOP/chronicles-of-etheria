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

/** Обрабатывает dropTable у боссов подземелий */
function claimDungeonBossDrop(monster) {
    if (!monster || !monster.dropTable || !monster.isBoss) return [];
    const dropLines = [];
    
    monster.dropTable.forEach(function(drop) {
        const chance = drop.chance || 0;
        if (Math.random() * 100 <= chance) {
            const itemName = drop.name;
            
            if (typeof addResourceToPlayer === 'function') {
                addResourceToPlayer(itemName, 1);
            } else {
                if (!player.resources[itemName]) player.resources[itemName] = 0;
                player.resources[itemName] += 1;
            }
            
            const icon = drop.icon || '📦';
            dropLines.push(`${icon} ${itemName}: +1`);
        }
    });
    
    return dropLines;
}

function victory() {
    if (typeof clearMonsterQueueState === 'function') clearMonsterQueueState();
    window._monsterTurnBusy = false;
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

    // Триггер достижения победы
    if (typeof onAchievementVictory === 'function') onAchievementVictory();

    const enemies = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
    let totalExp = currentMonster.exp;
    if (enemies.length > 1) {
        totalExp = enemies.reduce(function (sum, e) { return sum + (e && e.exp ? e.exp : 0); }, 0);
    }
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    const floorIdx = session && typeof session.floorIndex === 'number' ? session.floorIndex : 0;
    const floorGoldMult = (typeof DUNGEON_BALANCE !== 'undefined')
        ? 1 + floorIdx * (DUNGEON_BALANCE.floorGoldStep || 0.1)
        : 1;
    const isDuoRun = session && session.mode === 'duo';
    const duoGoldMult = isDuoRun && typeof DUNGEON_BALANCE !== 'undefined'
        ? (DUNGEON_BALANCE.reward.duo.gold || 1.3)
        : 1;
    const bossGoldMult = currentMonster.isBoss ? 1.12 : 1;
    let gold = Math.floor((totalExp / 4 + player.level * 1.5) * (currentMonster.goldMult || 10) / 15);
    gold = Math.floor(gold * floorGoldMult * duoGoldMult * bossGoldMult);
    const rewardLines = claimSpecialBattleRewards(currentMonster);
    const dropLines = claimDungeonBossDrop(currentMonster);
    const allRewards = rewardLines.concat(dropLines);
    const returnTo = currentMonster.returnTo;

    window.lastVictoryData = { exp: totalExp, gold: gold };
    player.gold += gold;
    
    // Триггер достижения для золота
    if (typeof onAchievementGoldThreshold === 'function') onAchievementGoldThreshold(player.gold);
    
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
        
        // Триггер достижения на уровень
        if (typeof onAchievementLevelUp === 'function') onAchievementLevelUp(player.level);
    }

    // Триггер достижения победы
    if (typeof onAchievementVictory === 'function') onAchievementVictory();

    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    const isDuoHost = duo && duo.role === 'host' && session && session.mode === 'duo';

    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('run');

    if (isDuoHost && typeof sendDuoDungeonRoomState === 'function') {
        sendDuoDungeonRoomState({
            kind: 'victory_ack',
            exp: totalExp,
            gold: gold,
            rewardLines: allRewards
        });
    }

    currentMonster = null;
    isPlayerTurn = true;
    window._strikeAnimActive = false;
    if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
    saveGame();
    document.body.classList.remove('low-hp');
    renderGame();
    const rewardText = allRewards.length ? '\n\n' + allRewards.join('\n') : '';
    window._battleEndModalOpen = true;
    window._isDungeonVictory = true;
    showModal('🎉 Победа!', '🏆', 'Вы победили!\n⭐ Опыт: +' + window.lastVictoryData.exp + '\n💰 Золото: +' + window.lastVictoryData.gold + rewardText + '\n📊 Уровень: ' + player.level, 'Продолжить', function () {
        window._isDungeonVictory = false;
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

/** @returns {'alive'|'revived'|'defeated'} */
function resolvePlayerDefeatInBattle() {
    if (!player || player.health > 0) return 'alive';
    player.health = 0;
    if (typeof deathSaveActive !== 'undefined' && deathSaveActive) {
        player.health = Math.max(1, Math.floor(player.maxHealth * 0.1));
        deathSaveActive = false;
        if (typeof addBattleLog === 'function') {
            addBattleLog('🛡️ Инстинкт выживания! Вы выжили с 10% HP!', 'success');
        }
        return 'revived';
    }
    const reviveAb = player.abilities && player.abilities.find(function (a) {
        return (a.reviveOnDeath || a.reviveOnce) && !reviveUsed;
    });
    if (reviveAb && !reviveUsed) {
        reviveUsed = true;
        const hpPct = reviveAb.reviveHp || reviveAb.revive || 50;
        player.health = Math.max(1, Math.floor(player.maxHealth * hpPct / 100));
        if (typeof addBattleLog === 'function') {
            addBattleLog('✨ ' + reviveAb.name + '! Вы воскресли с ' + hpPct + '% HP!', 'success');
        }
        return 'revived';
    }
    if (window.dungeonDuoBattleActive && typeof getDuoDungeonState === 'function' &&
        typeof isDungeonDuoSlotAlive === 'function') {
        const duo = getDuoDungeonState();
        const partnerSlot = duo.role === 'host' ? 'guest' : 'host';
        if (isDungeonDuoSlotAlive(partnerSlot) && typeof onDungeonDuoLocalPlayerDowned === 'function') {
            onDungeonDuoLocalPlayerDowned();
            return 'defeated';
        }
    }
    if (typeof gameOver === 'function') gameOver();
    return 'defeated';
}

window.resolvePlayerDefeatInBattle = resolvePlayerDefeatInBattle;

function gameOver() {
    if (typeof clearMonsterQueueState === 'function') clearMonsterQueueState();
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
    window._monsterTurnBusy = false;
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