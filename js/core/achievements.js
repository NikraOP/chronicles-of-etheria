// js/core/achievements.js - Система достижений

let playerAchievements = {
    unlocked: [],           // ID разблокированных достижений
    progress: {},           // Прогресс по достижениям: { achievementId: currentValue }
    claimedRewards: []      // ID достижений с полученными наградами
};

/** Инициализация системы достижений при загрузке сохранения */
function initAchievementsSystem() {
    if (!player) return;
    
    // Инициализация полей
    if (!player.achievements) {
        player.achievements = {
            unlocked: [],
            progress: {},
            claimedRewards: []
        };
    }
    
    // Копируем в глобальную переменную
    playerAchievements = player.achievements;
    
    // Проверяем все достижения на предмет разблокировки
    checkAllAchievements();
}

/** Проверка всех достижений после любого действия */
function checkAllAchievements() {
    if (!player) return;
    
    for (const achId in ACHIEVEMENTS_DB) {
        const achievement = ACHIEVEMENTS_DB[achId];
        
        // Пропускаем уже разблокированные
        if (playerAchievements.unlocked.includes(achId)) continue;
        
        // Проверяем условие
        if (checkAchievementCondition(achievement)) {
            unlockAchievement(achId);
        }
    }
}

/** Проверка условия достижения */
function checkAchievementCondition(achievement) {
    if (!achievement || !achievement.condition) return false;
    
    const cond = achievement.condition;
    
    switch (cond.type) {
        // Победы
        case 'victories':
            return (player.victories || 0) >= cond.threshold;
        
        // Уровень
        case 'level':
            return (player.level || 0) >= cond.threshold;
        
        // Золото
        case 'gold':
            return (player.gold || 0) >= cond.threshold;
        
        // Критические удары
        case 'criticalHits':
            return (playerAchievements.progress.criticalHits || 0) >= cond.threshold;
        
        // Увороты
        case 'dodges':
            return (playerAchievements.progress.dodges || 0) >= cond.threshold;
        
        // Убийство с одного удара
        case 'oneHitKill':
            return (playerAchievements.progress.oneHitKill || 0) >= cond.threshold;
        
        // Выживание с 1 HP
        case 'survivedWith1Hp':
            return (playerAchievements.progress.survivedWith1Hp || 0) >= cond.threshold;
        
        // Размер инвентаря
        case 'inventorySize':
            const inventorySize = countInventorySize();
            return inventorySize >= cond.threshold;
        
        // Редкость предмета
        case 'getItemRarity':
            const maxRarity = getMaxItemRarity();
            return maxRarity >= cond.threshold;
        
        // Собранные ресурсы
        case 'resourcesGathered':
            return (playerAchievements.progress.resourcesGathered || 0) >= cond.threshold;
        
        // Скрафченные предметы
        case 'itemsCrafted':
            return (playerAchievements.progress.itemsCrafted || 0) >= cond.threshold;
        
        // Посещённые локации
        case 'locationsVisited':
            const locationsVisited = countLocationsVisited();
            return locationsVisited >= cond.threshold;
        
        // PvP победы
        case 'pvpWins':
            return (playerAchievements.progress.pvpWins || 0) >= cond.threshold;
        
        // Покупки
        case 'itemsBought':
            return (playerAchievements.progress.itemsBought || 0) >= cond.threshold;
        
        // Колесо фортуны
        case 'wheelWin':
            return (playerAchievements.progress.wheelWin || 0) >= cond.threshold;
        
        default:
            return false;
    }
}

/** Разблокировка достижения */
function unlockAchievement(achievementId) {
    const achievement = ACHIEVEMENTS_DB[achievementId];
    if (!achievement) return;
    
    // Проверяем, не разблокировано ли уже
    if (playerAchievements.unlocked.includes(achievementId)) {
        console.log(`Достижение уже разблокировано: ${achievementId}`);
        return;
    }
    
    // Добавляем в разблокированные
    playerAchievements.unlocked.push(achievementId);
    
    // Выдаём награды
    giveAchievementRewards(achievement);
    
    // Показываем уведомление
    showAchievementNotification(achievement);
    
    // Сохраняем
    saveGame();
    
    console.log(`🏆 Достижение разблокировано: ${achievement.name}`);
}

/** Выдача наград за достижение */
function giveAchievementRewards(achievement) {
    if (!player || !achievement) return;
    
    // Золото
    if (achievement.rewardGold && achievement.rewardGold > 0) {
        player.gold += achievement.rewardGold;
        addMessage(`💰 +${achievement.rewardGold} золота за достижение!`, 'success');
    }
    
    // Опыт
    if (achievement.rewardExp && achievement.rewardExp > 0) {
        player.experience += achievement.rewardExp;
        addMessage(`⭐ +${achievement.rewardExp} опыта за достижение!`, 'success');
        
        // Проверяем повышение уровня
        while (player.experience >= player.maxExperience) {
            player.experience -= player.maxExperience;
            player.level++;
            player.maxExperience = Math.floor(player.level * 70 + 250);
            if (typeof resetBaseStats === 'function') resetBaseStats();
            player.health = player.maxHealth;
            if (player.class === 'Маг') player.mana = player.maxMana;
            if (typeof updateAllAbilities === 'function') updateAllAbilities();
            addMessage(`🎉 ПОВЫШЕНИЕ УРОВНЯ! Теперь вы ${player.level} уровень!`, 'success');
            if (typeof onAchievementLevelUp === 'function') onAchievementLevelUp(player.level);
        }
    }
    
    // Отмечаем как полученное
    if (!playerAchievements.claimedRewards.includes(achievement.id)) {
        playerAchievements.claimedRewards.push(achievement.id);
    }
}

/** Уведомление о разблокировке */
function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: -400px;
        background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,60,0.95));
        border: 2px solid ${getRarityColor(achievement.rarity)};
        border-radius: 10px;
        padding: 15px 20px;
        min-width: 300px;
        max-width: 400px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        transition: right 0.5s ease;
    `;
    
    const rarityColor = getRarityColor(achievement.rarity);
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 48px;">${achievement.icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 12px; color: ${rarityColor}; font-weight: bold; margin-bottom: 5px;">
                    🏆 Достижение разблокировано!
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 5px;">
                    ${achievement.name}
                </div>
                <div style="font-size: 12px; color: #aaa;">
                    ${achievement.description}
                </div>
                ${achievement.rewardGold > 0 ? `<div style="font-size: 11px; color: #f39c12; margin-top: 5px;">💰 +${achievement.rewardGold} золота</div>` : ''}
                ${achievement.rewardExp > 0 ? `<div style="font-size: 11px; color: #3498db; margin-top: 5px;">⭐ +${achievement.rewardExp} опыта</div>` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.right = '20px';
    }, 100);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        notification.style.right = '-400px';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
}

function getRarityColor(rarity) {
    const colors = {
        common: '#cccccc',
        uncommon: '#2ecc71',
        rare: '#3498db',
        epic: '#9b59b6',
        legendary: '#f0c040',
        mythic: '#e74c3c'
    };
    return colors[rarity] || '#cccccc';
}

/** Счётчик размера инвентаря */
function countInventorySize() {
    if (!player || !player.inventory) return 0;
    
    let total = 0;
    for (const slot in player.inventory) {
        if (Array.isArray(player.inventory[slot])) {
            total += player.inventory[slot].length;
        }
    }
    return total;
}

/** Максимальная редкость предмета у игрока */
function getMaxItemRarity() {
    const rarityValues = {
        'Обычный': 0,
        'Необычный': 1,
        'Редкий': 2,
        'Эпический': 3,
        'Легендарный': 4,
        'Мифический': 5,
        'Древний': 6,
        'Божественный': 7
    };
    
    let maxRarity = 0;
    
    // Проверяем инвентарь
    if (player && player.inventory) {
        for (const slot in player.inventory) {
            if (Array.isArray(player.inventory[slot])) {
                for (const item of player.inventory[slot]) {
                    if (item && item.rarity) {
                        const value = rarityValues[item.rarity] || 0;
                        maxRarity = Math.max(maxRarity, value);
                    }
                }
            }
        }
    }
    
    // Проверяем экипировку
    if (player && player.equipment) {
        for (const slot in player.equipment) {
            const item = player.equipment[slot];
            if (item && item.rarity) {
                const value = rarityValues[item.rarity] || 0;
                maxRarity = Math.max(maxRarity, value);
            }
        }
    }
    
    return maxRarity;
}

/** Счётчик посещённых локаций */
function countLocationsVisited() {
    if (!player || !player.visitedLocations) return 0;
    return player.visitedLocations.length;
}

/** Инкремент прогресса достижения */
function incrementAchievementProgress(progressType, amount = 1) {
    if (!playerAchievements.progress[progressType]) {
        playerAchievements.progress[progressType] = 0;
    }
    playerAchievements.progress[progressType] += amount;
    
    // Проверяем достижения после инкремента
    checkAllAchievements();
}

// ===== ТРИГГЕРЫ ДЛЯ ИГРОВЫХ СОБЫТИЙ =====

/** Вызывать после победы в бою */
function onAchievementVictory() {
    incrementAchievementProgress('victories', 1);
}

/** Вызывать при критическом ударе */
function onAchievementCriticalHit() {
    incrementAchievementProgress('criticalHits', 1);
}

/** Вызывать при увороте */
function onAchievementDodge() {
    incrementAchievementProgress('dodges', 1);
}

/** Вызывать при убийстве с одного удара */
function onAchievementOneHitKill() {
    incrementAchievementProgress('oneHitKill', 1);
}

/** Вызывать при выживании с 1 HP */
function onAchievementSurvivedWith1Hp() {
    incrementAchievementProgress('survivedWith1Hp', 1);
}

/** Вызывать при сборе ресурса */
function onAchievementResourceGathered(amount = 1) {
    incrementAchievementProgress('resourcesGathered', amount);
}

/** Вызывать при крафте предмета */
function onAchievementItemCrafted() {
    incrementAchievementProgress('itemsCrafted', 1);
}

/** Вызывать при посещении новой локации */
function onAchievementLocationVisited(locationName) {
    if (!player.visitedLocations) {
        player.visitedLocations = [];
    }
    if (!player.visitedLocations.includes(locationName)) {
        player.visitedLocations.push(locationName);
        incrementAchievementProgress('locationsVisited', 1);
    }
}

/** Вызывать при PvP победе */
function onAchievementPvpWin() {
    incrementAchievementProgress('pvpWins', 1);
}

/** Вызывать при покупке предмета */
function onAchievementItemBought() {
    incrementAchievementProgress('itemsBought', 1);
}

/** Вызывать при выигрыше в колесе фортуны */
function onAchievementWheelWin() {
    incrementAchievementProgress('wheelWin', 1);
}

/** Вызывать при повышении уровня */
function onAchievementLevelUp(level) {
    incrementAchievementProgress('level', 1);
}

/** Вызывать при получении золота (проверяет пороги) */
function onAchievementGoldThreshold(totalGold) {
    // Прогресс для достижения "богатство"
    if (!playerAchievements.progress.gold) {
        playerAchievements.progress.gold = totalGold;
    } else {
        playerAchievements.progress.gold = Math.max(playerAchievements.progress.gold, totalGold);
    }
    
    // Проверяем достижения по золоту
    checkAllAchievements();
}

// ===== UI ФУНКЦИИ =====

/** Показ панели достижений */
function showAchievementsPanel() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    stopGathering();
    
    // Сортируем достижения по категориям
    const byCategory = {};
    for (const catId in ACHIEVEMENT_CATEGORIES) {
        byCategory[catId] = [];
    }
    
    for (const achId in ACHIEVEMENTS_DB) {
        const achievement = ACHIEVEMENTS_DB[achId];
        const category = achievement.category || 'special';
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push(achievement);
    }
    
    let html = '<h2>🏆 Достижения</h2>';
    html += '<div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">';
    html += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
    html += `<div style="font-size: 14px;">Разблокировано: <strong style="color: var(--gold);">${playerAchievements.unlocked.length}/${Object.keys(ACHIEVEMENTS_DB).length}</strong></div>`;
    const progressPercent = Math.round((playerAchievements.unlocked.length / Object.keys(ACHIEVEMENTS_DB).length) * 100);
    html += `<div style="flex: 1; margin: 0 20px; background: rgba(0,0,0,0.5); border-radius: 10px; height: 20px; overflow: hidden;">`;
    html += `<div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #f39c12, #e67e22); transition: width 0.3s;"></div>`;
    html += '</div>';
    html += `<div style="font-size: 14px;">${progressPercent}%</div>`;
    html += '</div></div>';
    
    for (const catId in ACHIEVEMENT_CATEGORIES) {
        const category = ACHIEVEMENT_CATEGORIES[catId];
        const achievements = byCategory[catId] || [];
        
        if (achievements.length === 0) continue;
        
        html += `<div style="margin-bottom: 25px;">`;
        html += `<h3 style="color: var(--gold); margin-bottom: 15px;">${category.icon} ${category.name}</h3>`;
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">';
        
        for (const achievement of achievements) {
            const unlocked = playerAchievements.unlocked.includes(achievement.id);
            const rarityColor = getRarityColor(achievement.rarity);
            
            // Прогресс (если есть)
            let progressHtml = '';
            if (!unlocked && achievement.condition) {
                const current = getAchievementCurrentProgress(achievement);
                const threshold = achievement.condition.threshold;
                const percent = Math.min(100, Math.round((current / threshold) * 100));
                progressHtml = `
                    <div style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 5px;">
                            <span>Прогресс</span>
                            <span>${current}/${threshold}</span>
                        </div>
                        <div style="background: rgba(0,0,0,0.5); border-radius: 5px; height: 8px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: ${rarityColor}; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }
            
            html += `<div style="background: rgba(0,0,0,0.4); border: 2px solid ${unlocked ? rarityColor : 'rgba(255,255,255,0.1)'}; border-radius: 10px; padding: 15px; opacity: ${unlocked ? 1 : 0.6}; transition: all 0.3s;">`;
            html += `<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">`;
            html += `<div style="font-size: 36px; opacity: ${unlocked ? 1 : 0.3};">${achievement.icon}</div>`;
            html += `<div style="flex: 1;">`;
            html += `<div style="font-weight: bold; color: ${unlocked ? rarityColor : '#888'}; margin-bottom: 5px;">${achievement.name}</div>`;
            html += `<div style="font-size: 11px; color: #aaa;">${achievement.description}</div>`;
            html += '</div>';
            html += '</div>';
            
            if (unlocked) {
                html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">`;
                html += `<div style="font-size: 11px; color: #2ecc71;">✅ Разблокировано</div>`;
                if (achievement.rewardGold > 0) {
                    html += `<div style="font-size: 11px; color: #f39c12;">💰 +${achievement.rewardGold} золота</div>`;
                }
                if (achievement.rewardExp > 0) {
                    html += `<div style="font-size: 11px; color: #3498db;">⭐ +${achievement.rewardExp} опыта</div>`;
                }
                html += '</div>';
            } else {
                html += progressHtml;
            }
            
            html += '</div>';
        }
        
        html += '</div></div>';
    }
    
    html += '<button class="action-btn" onclick="renderGame()" style="margin-top: 20px; width: 100%; padding: 12px;">↩️ Назад</button>';
    
    document.getElementById('dynamicContent').innerHTML = html;
}

/** Получение текущего прогресса для достижения */
function getAchievementCurrentProgress(achievement) {
    if (!achievement || !achievement.condition) return 0;
    
    const cond = achievement.condition;
    
    switch (cond.type) {
        case 'victories': return player.victories || 0;
        case 'level': return player.level || 0;
        case 'gold': return player.gold || 0;
        case 'criticalHits': return playerAchievements.progress.criticalHits || 0;
        case 'dodges': return playerAchievements.progress.dodges || 0;
        case 'oneHitKill': return playerAchievements.progress.oneHitKill || 0;
        case 'survivedWith1Hp': return playerAchievements.progress.survivedWith1Hp || 0;
        case 'inventorySize': return countInventorySize();
        case 'getItemRarity': return getMaxItemRarity();
        case 'resourcesGathered': return playerAchievements.progress.resourcesGathered || 0;
        case 'itemsCrafted': return playerAchievements.progress.itemsCrafted || 0;
        case 'locationsVisited': return countLocationsVisited();
        case 'pvpWins': return playerAchievements.progress.pvpWins || 0;
        case 'itemsBought': return playerAchievements.progress.itemsBought || 0;
        case 'wheelWin': return playerAchievements.progress.wheelWin || 0;
        default: return 0;
    }
}

// Экспорт функций
window.initAchievements = initAchievements;
window.initAchievementsSystem = initAchievementsSystem;
window.checkAllAchievements = checkAllAchievements;
window.unlockAchievement = unlockAchievement;
window.showAchievementsPanel = showAchievementsPanel;
window.onAchievementVictory = onAchievementVictory;
window.onAchievementLevelUp = onAchievementLevelUp;
window.onAchievementGoldThreshold = onAchievementGoldThreshold;
window.onAchievementCriticalHit = onAchievementCriticalHit;
window.onAchievementDodge = onAchievementDodge;
window.onAchievementOneHitKill = onAchievementOneHitKill;
window.onAchievementSurvivedWith1Hp = onAchievementSurvivedWith1Hp;
window.onAchievementResourceGathered = onAchievementResourceGathered;
window.onAchievementItemCrafted = onAchievementItemCrafted;
window.onAchievementLocationVisited = onAchievementLocationVisited;
window.onAchievementPvpWin = onAchievementPvpWin;
window.onAchievementItemBought = onAchievementItemBought;
window.onAchievementWheelWin = onAchievementWheelWin;
