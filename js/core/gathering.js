let gatheringInterval = null;
let isGatheringLocked = false;
let pendingGatherData = null; // Хранит данные о завершённой добыче

function stopGathering() { 
    if (gatheringInterval) { 
        clearInterval(gatheringInterval); 
        gatheringInterval = null; 
        isGatheringLocked = false; 
    } 
}

// Получить бонусы за тир профессии (1-6)
function getProfessionBonuses(tier) {
    const effectiveLevel = (tier - 1) * 10 + 5;
    return {
        gatherSpeedBonus: Math.min(0.5, effectiveLevel * 0.01),
        doubleGatherChance: Math.min(0.5, effectiveLevel * 0.01),
        expBonus: Math.min(1.0, effectiveLevel * 0.02),
        rareResourceChance: Math.min(0.3, effectiveLevel * 0.006),
        craftQualityBonus: Math.min(0.5, effectiveLevel * 0.01),
        materialSaveChance: Math.min(0.3, effectiveLevel * 0.006)
    };
}

function getExpForNextTier(currentTier) {
    switch(currentTier) {
        case 1: return 500;
        case 2: return 1000;
        case 3: return 2000;
        case 4: return 3500;
        case 5: return 5000;
        default: return 0;
    }
}

// Функция для завершения сбора и добавления ресурсов
function completeGathering(profId, resourceName, adjustedExp, bonuses, resourceTime) {
    if (!pendingGatherData) return;
    
    const prof = player.professions[profId];
    if (!prof) return;
    
    let gatheredCount = pendingGatherData.gatheredCount;
    let bonusExp = pendingGatherData.bonusExp;
    let totalExp = adjustedExp + bonusExp;
    let oldTier = prof.tier || 1;
    
    // Добавляем ресурсы
    if (!player.resources[resourceName]) player.resources[resourceName] = 0;
    player.resources[resourceName] += gatheredCount;
    
    // Добавляем опыт
    prof.exp += totalExp;
    
    // Проверка повышения тира
    let expNeeded = getExpForNextTier(prof.tier);
    let leveledUp = false;
    
    while (prof.exp >= expNeeded && prof.tier < 6) {
        prof.exp -= expNeeded;
        prof.tier = (prof.tier || 1) + 1;
        expNeeded = getExpForNextTier(prof.tier);
        leveledUp = true;
        addMessage(`🎉 ПОВЫШЕНИЕ ТИРА! ${PROFESSIONS_DB.gathering.find(p => p.id === profId)?.name || profId} → ${prof.tier} тир!`, 'success');
        
        const newBonuses = getProfessionBonuses(prof.tier);
        addMessage(`📈 Новые бонусы: скорость -${Math.floor(newBonuses.gatherSpeedBonus * 100)}%, двойная добыча +${Math.floor(newBonuses.doubleGatherChance * 100)}%`, 'info');
    }
    
    if (prof.tier >= 6) prof.exp = Math.min(prof.exp, expNeeded);
    saveGame();
    
    addMessage(`✅ Собрано: ${gatheredCount}x ${resourceName}! (+${Math.floor(totalExp)} XP)`, 'success');
    
    if (leveledUp) {
        addMessage(`🏆 Теперь у вас ${prof.tier} тир профессии!`, 'success');
    }
    
    // Очищаем данные и обновляем интерфейс
    pendingGatherData = null;
    isGatheringLocked = false;
    
    // Обновляем отображение
    setTimeout(() => {
        showGatheringResources(profId);
    }, 500);
}

function startGathering(profId, resourceName, time, exp, requiredTier) {
    if (isGatheringLocked) {
        addMessage('⏳ Добыча уже идёт! Дождитесь завершения.', 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) {
        addMessage('❌ Профессия не изучена!', 'error');
        return;
    }
    
    const currentTier = prof.tier || 1;
    const bonuses = getProfessionBonuses(currentTier);
    
    if (currentTier < requiredTier) {
        addMessage(`❌ Нужен ${requiredTier} тир профессии для добычи этого ресурса! (сейчас ${currentTier})`, 'error');
        return;
    }
    
    stopGathering();
    isGatheringLocked = true;
    const progressDiv = document.getElementById('gatheringProgress');
    if (!progressDiv) { isGatheringLocked = false; return; }
    
    let adjustedTime = Math.max(2, Math.floor(time * (1 - bonuses.gatherSpeedBonus)));
    let adjustedExp = Math.floor(exp * (1 + bonuses.expBonus));
    
    const totalTime = adjustedTime * 1000;
    const startTime = Date.now();
    
    // Показываем прогресс-бар
    progressDiv.innerHTML = `
        <div class="gathering-progress" style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>⛏️ Добыча: ${resourceName}</strong>
                <span id="gatherPercent">0%</span>
            </div>
            <div class="gathering-bar" style="width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
                <div class="gathering-fill" id="gatherFill" style="width:0%; height: 100%; background: linear-gradient(90deg, var(--gold), var(--orange)); transition: width 0.1s linear;"></div>
            </div>
            <div style="margin-top: 10px; font-size: 11px; color: #aaa;">
                ⚡ Бонус скорости: -${Math.floor(bonuses.gatherSpeedBonus * 100)}% | 📈 +${Math.floor(bonuses.expBonus * 100)}% опыта
            </div>
            <div id="gatherResult" style="margin-top: 12px;"></div>
        </div>
    `;
    
    let animationInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let percent = Math.min(100, Math.floor(elapsed / totalTime * 100));
        const fill = document.getElementById('gatherFill');
        const percentEl = document.getElementById('gatherPercent');
        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';
        
        if (percent >= 100) {
            clearInterval(animationInterval);
            clearInterval(gatheringInterval);
            gatheringInterval = null;
            
            // Расчёт результатов
            let gatheredCount = 1;
            let bonusExp = 0;
            let rareTriggered = false;
            let doubleTriggered = false;
            
            if (Math.random() < bonuses.doubleGatherChance) {
                gatheredCount++;
                doubleTriggered = true;
            }
            
            if (Math.random() < bonuses.rareResourceChance) {
                gatheredCount = Math.floor(gatheredCount * 1.5);
                bonusExp += adjustedExp * 0.5;
                rareTriggered = true;
            }
            
            // Сохраняем результаты для последующего сбора
            pendingGatherData = {
                gatheredCount: gatheredCount,
                bonusExp: bonusExp,
                doubleTriggered: doubleTriggered,
                rareTriggered: rareTriggered
            };
            
            // Показываем кнопку "Собрать" с результатами
            const resultDiv = document.getElementById('gatherResult');
            if (resultDiv) {
                let resultHtml = '<div style="background: rgba(0,0,0,0.5); border-radius: 8px; padding: 12px; margin-top: 10px;">';
                resultHtml += '<div style="margin-bottom: 10px;">🎁 <strong>Добыча завершена!</strong></div>';
                resultHtml += '<div style="font-size: 13px; margin-bottom: 8px;">📦 Получено: <span style="color: var(--gold); font-weight: bold;">' + gatheredCount + 'x ' + resourceName + '</span></div>';
                if (doubleTriggered) resultHtml += '<div style="font-size: 11px; color: #2ecc71;">✨ Сработал шанс двойной добычи! +1 предмет</div>';
                if (rareTriggered) resultHtml += '<div style="font-size: 11px; color: #f0c040;">🌈 Найден редкий ресурс! +50% к добыче</div>';
                resultHtml += '<div style="font-size: 11px; margin-top: 5px;">⭐ Опыт: +' + (adjustedExp + bonusExp) + ' XP</div>';
                resultHtml += '<button id="collectGatherBtn" class="action-btn" style="margin-top: 12px; width: 100%; padding: 10px; background: linear-gradient(135deg, #27ae60, #2ecc71);">🎒 Собрать ресурсы</button>';
                resultHtml += '</div>';
                resultDiv.innerHTML = resultHtml;
                
                document.getElementById('collectGatherBtn').onclick = () => {
                    completeGathering(profId, resourceName, adjustedExp, bonuses, adjustedTime);
                };
            }
            
            isGatheringLocked = false;
        }
    }, 100);
    
    gatheringInterval = animationInterval;
}

function showGatheringResources(profId) {
    stopGathering();
    isGatheringLocked = false;
    pendingGatherData = null;
    
    const prof = PROFESSIONS_DB.gathering.find(p => p.id === profId);
    if (!prof) return;
    
    const resources = RESOURCES_DB[profId] || [];
    const currentTier = player.professions[profId] ? (player.professions[profId].tier || 1) : 1;
    const exp = player.professions[profId]?.exp || 0;
    const bonuses = getProfessionBonuses(currentTier);
    const expNeeded = getExpForNextTier(currentTier);
    const percent = (expNeeded > 0 && currentTier < 6) ? (exp / expNeeded * 100) : 100;
    
    const availableResources = resources.filter(r => {
        return r.locations.indexOf(player.location) !== -1 && currentTier >= r.tier;
    });
    
    let html = '<h2>' + prof.icon + ' ' + prof.name + ' — Сбор ресурсов</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">';
    html += '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">';
    html += '<div><span style="color: var(--gold);">📍</span> Локация: <strong>' + player.location + '</strong></div>';
    html += '<div><span style="color: var(--gold);">⭐</span> Тир профессии: <strong>' + currentTier + '</strong>/6</div>';
    html += '</div>';
    
    if (currentTier < 6) {
        html += '<div class="progress-bar" style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 10px 0; overflow: hidden;">' +
                '<div style="width:' + percent + '%; height: 100%; background: linear-gradient(90deg, #f39c12, #f0c040); transition: width 0.3s;"></div></div>';
        html += '<div style="font-size: 11px;">До ' + (currentTier + 1) + ' тира: ' + Math.floor(exp) + '/' + expNeeded + ' XP</div>';
    } else {
        html += '<div style="color: gold; font-size: 12px; margin: 8px 0;">🏆 МАКСИМАЛЬНЫЙ ТИР! Все бонусы доступны</div>';
    }
    
    html += '<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">⚡ Скорость: -' + Math.floor(bonuses.gatherSpeedBonus * 100) + '%</span>';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">🍀 Двойная добыча: ' + Math.floor(bonuses.doubleGatherChance * 100) + '%</span>';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">✨ Редкий ресурс: ' + Math.floor(bonuses.rareResourceChance * 100) + '%</span>';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">📈 Опыт: +' + Math.floor(bonuses.expBonus * 100) + '%</span>';
    html += '</div></div>';
    
    if (availableResources.length === 0) {
        html += '<p style="color:#e74c3c; text-align: center; padding: 20px;">Нет доступных ресурсов в этой локации! Повысьте тир профессии или смените локацию.</p>';
    } else {
        html += '<div class="resource-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px;">';
        availableResources.forEach(r => {
            const locked = currentTier < r.tier;
            html += '<div class="resource-card' + (locked ? ' locked' : ' gathering') + '" onclick="' + (locked ? '' : 'startGathering(\'' + profId + '\',\'' + r.name + '\',' + r.time + ',' + r.exp + ',' + r.tier + ')') + '" style="' + (locked ? 'opacity:0.5;cursor:not-allowed;' : 'background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.3s;') + '">' +
                '<div style="display: flex; gap: 12px;">' +
                    '<div class="resource-icon" style="font-size: 35px;">' + r.icon + '</div>' +
                    '<div class="resource-info" style="flex: 1;">' +
                        '<div class="resource-name" style="font-weight: 700; font-size: 14px;">' + r.name + '</div>' +
                        '<div class="resource-desc" style="font-size: 10px; color: #aaa;">⭐ Тир ' + r.tier + '</div>' +
                        '<div class="resource-req" style="font-size: 10px; color: var(--gold); margin-top: 4px;">⏱️ ' + r.time + ' сек | ⭐ +' + r.exp + ' XP</div>' +
                        (locked ? '<div style="color:#e74c3c; font-size: 10px; margin-top: 4px;">🔒 Требуется ' + r.tier + ' тир</div>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }
    html += '<div id="gatheringProgress"></div>';
    html += '<button class="action-btn" onclick="showProfessions()" style="margin-top:15px;width:100%; padding: 12px;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;
}