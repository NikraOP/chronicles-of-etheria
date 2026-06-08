let gatheringRafId = null;
let isGatheringLocked = false;
let pendingGatherData = null;
let activeGatherSession = null;
let autoGatherUiTimerId = null;

function ensureGatherScrollInventory() {
    if (!player.inventory) player.inventory = {};
    if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
}

function getAutoGatherSession() {
    return player && player.autoGather ? player.autoGather : null;
}

function isAutoGatherSessionValid(session) {
    if (!session) return false;
    if (Date.now() >= (session.expiresAt || 0)) return false;
    if ((session.gathersLeft || 0) <= 0) return false;
    return true;
}

function isAutoGatherActiveForProf(profId) {
    const session = getAutoGatherSession();
    return !!(session && session.profId === profId && isAutoGatherSessionValid(session));
}

function formatGatherScrollTimeLeft(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

/** Чип бонуса с подсказкой */
function buildBonusChipWithTooltip(icon, value, type, title, description) {
    return '<div class="gather-bonus-chip gather-bonus-chip--tooltip" data-bonus-type="' + type + '" ' +
        'data-bonus-title="' + escapeHtmlText(title) + '" ' +
        'data-bonus-desc="' + escapeHtmlText(description) + '" ' +
        'data-bonus-value="' + escapeHtmlText(value) + '">' +
        '<span class="gather-bonus-chip__icon">' + icon + '</span>' +
        '<span class="gather-bonus-chip__value">' + value + '</span>' +
        '<div class="gather-bonus-tooltip">' +
        '<div class="gather-bonus-tooltip__title">' + escapeHtmlText(title) + '</div>' +
        '<div class="gather-bonus-tooltip__desc">' + escapeHtmlText(description) + '</div>' +
        '</div>' +
        '</div>';
}

/** Панель улучшения бонусов */
function buildBonusUpgradePanel(profId, availablePoints, bonuses) {
    const pts = player.professions[profId]?.bonusPoints || { speed: 0, double: 0, rare: 0 };
    const maxPerStat = 5;
    
    let html = '<div class="gather-bonus-upgrade-panel">';
    html += '<div class="gather-bonus-upgrade-header">';
    html += '<span class="gather-bonus-upgrade-title">📊 Улучшение бонусов</span>';
    html += '<span class="gather-bonus-points-available">Доступно очков: <strong>' + availablePoints + '</strong></span>';
    html += '</div>';
    
    html += '<div class="gather-bonus-upgrade-list">';
    
    // Скорость
    html += buildBonusUpgradeRow(profId, 'speed', '⚡ Скорость', pts.speed || 0, maxPerStat, 
        'Снижает время сбора', availablePoints);
    // Двойная добыча
    html += buildBonusUpgradeRow(profId, 'double', '🍀 Удача', pts.double || 0, maxPerStat,
        'Шанс x2 добычи', availablePoints);
    // Редкость
    html += buildBonusUpgradeRow(profId, 'rare', '✨ Редкость', pts.rare || 0, maxPerStat,
        'Шанс редкого ресурса', availablePoints);
    
    html += '</div>';

    if ((bonuses.bonusPointsSpent || 0) > 0) {
        html += '<button type="button" class="action-btn gather-bonus-reset-btn" onclick="resetBonusPoints(\'' + profId + '\')">';
        html += '🔄 Сбросить все очки</button>';
    }
    
    html += '</div>';
    return html;
}

/** Строка улучшения одного бонуса */
function buildBonusUpgradeRow(profId, type, label, current, max, description, availablePoints) {
    const canUpgrade = availablePoints > 0 && current < max;
    const progressPercent = (current / max) * 100;
    
    let html = '<div class="gather-bonus-upgrade-row">';
    html += '<div class="gather-bonus-upgrade-info">';
    html += '<span class="gather-bonus-upgrade-label">' + label + '</span>';
    html += '<span class="gather-bonus-upgrade-desc">' + description + '</span>';
    html += '</div>';
    html += '<div class="gather-bonus-upgrade-controls">';
    html += '<div class="gather-bonus-progress-bar">';
    html += '<div class="gather-bonus-progress-fill" style="width: ' + progressPercent + '%;"></div>';
    html += '</div>';
    html += '<span class="gather-bonus-upgrade-value">' + current + '/' + max + '</span>';
    if (canUpgrade) {
        html += '<button type="button" class="gather-bonus-upgrade-btn" onclick="upgradeBonus(\'' + profId + '\', \'' + type + '\')">+</button>';
    } else if (current >= max) {
        html += '<span class="gather-bonus-max">✓</span>';
    } else {
        html += '<span class="gather-bonus-no-points">−</span>';
    }
    html += '</div>';
    html += '</div>';
    return html;
}

/** Улучшить бонус */
function upgradeBonus(profId, type) {
    const prof = player.professions[profId];
    if (!prof) return;
    
    const available = getAvailableBonusPoints(prof);
    if (available <= 0) {
        addMessage('❌ Нет доступных очков!', 'error');
        return;
    }
    
    if (!prof.bonusPoints) {
        prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
    }
    
    const current = prof.bonusPoints[type] || 0;
    if (current >= 5) {
        addMessage('❌ Максимальный уровень бонуса!', 'error');
        return;
    }
    
    prof.bonusPoints[type] = current + 1;
    saveGame();
    addMessage('✅ Улучшено: ' + type + ' → ' + (current + 1), 'success');
    showGatheringResources(profId);
}

/** Сбросить все очки бонусов */
function resetBonusPoints(profId) {
    const prof = player.professions[profId];
    if (!prof || !confirm('Сбросить все очки бонусов? Это действие необратимо.')) return;
    
    prof.bonusPoints = { speed: 0, double: 0, rare: 0 };
    saveGame();
    addMessage('🔄 Очки бонусов сброшены', 'info');
    showGatheringResources(profId);
}

function stopAutoGatherSession(reason) {
    if (autoGatherUiTimerId != null) {
        clearInterval(autoGatherUiTimerId);
        autoGatherUiTimerId = null;
    }
    if (!player || !player.autoGather) return;
    const name = player.autoGather.scrollName || 'Свиток добычи';
    player.autoGather = null;
    saveGame();
    if (reason) addMessage(reason, 'info');
    else addMessage('📜 Авто-добыча остановлена.', 'info');
}

function stopGatheringAnimation() {
    if (gatheringRafId != null) {
        cancelAnimationFrame(gatheringRafId);
        gatheringRafId = null;
    }
    settlePendingCriticalGather();
    isGatheringLocked = false;
    activeGatherSession = null;
    const grid = document.getElementById('gatherResourceGrid');
    if (grid) grid.classList.remove('gather-grid-locked');
}

function activateGatherScroll(scrollIndex, profId) {
    ensureGatherScrollInventory();
    const scroll = player.inventory.gatherScrolls[scrollIndex];
    if (!scroll) {
        addMessage('❌ Свиток не найден!', 'error');
        return;
    }
    if (!player.professions[profId]) {
        addMessage('❌ Профессия не изучена!', 'error');
        return;
    }
    if (getAutoGatherSession()) {
        addMessage('❌ Уже активен свиток добычи! Сначала завершите или выйдите из меню.', 'error');
        return;
    }
    player.inventory.gatherScrolls.splice(scrollIndex, 1);
    player.autoGather = {
        scrollName: scroll.name,
        scrollTier: scroll.scrollTier || scroll.tier || 1,
        profId: profId,
        resourceName: null,
        expiresAt: Date.now() + (scroll.durationMs || 240000),
        gathersLeft: scroll.maxGathers || 15,
        expMultiplier: scroll.expMultiplier != null ? scroll.expMultiplier : 0.65
    };
    saveGame();
    addMessage(`📜 Активирован ${scroll.name}! Выберите ресурс тира ≤ ${player.autoGather.scrollTier}.`, 'success');
    showGatheringResources(profId);
}

function deactivateGatherScrollManual(profId) {
    stopAutoGatherSession('📜 Вы отключили авто-добычу.');
    showGatheringResources(profId);
}

function canAutoGatherResource(resource, scrollTier) {
    if (!resource || resource.battle) return false;
    return (resource.tier || 1) <= scrollTier;
}

function tickAutoGatherUi(profId) {
    const el = document.getElementById('gatherAutoStatus');
    const session = getAutoGatherSession();
    if (!el || !session || session.profId !== profId) return;
    if (!isAutoGatherSessionValid(session)) {
        stopAutoGatherSession('📜 Свиток добычи истёк или лимит сборов исчерпан.');
        showGatheringResources(profId);
        return;
    }
    const left = session.expiresAt - Date.now();
    el.innerHTML =
        '<div class="gather-auto-active">' +
        '<div class="gather-auto-title">⚡ Авто-добыча: <strong>' + (session.scrollName || 'Свиток') + '</strong></div>' +
        '<div class="gather-auto-meta">Тир ресурсов ≤ ' + session.scrollTier +
        ' · осталось сборов: <strong>' + session.gathersLeft + '</strong>' +
        ' · время: <strong>' + formatGatherScrollTimeLeft(left) + '</strong></div>' +
        (session.resourceName
            ? '<div class="gather-auto-target">🎯 ' + session.resourceName + '</div>'
            : '<div class="gather-auto-target gather-auto-pick">Выберите ресурс ниже</div>') +
        '<button type="button" class="action-btn gather-auto-stop" onclick="deactivateGatherScrollManual(\'' + profId + '\')">⏹ Остановить авто-добычу</button>' +
        '</div>';
}

function scheduleAutoGatherContinue(profId, delayMs) {
    const delay = delayMs == null ? 350 : delayMs;
    setTimeout(() => {
        const session = getAutoGatherSession();
        if (!session || session.profId !== profId) {
            showGatheringResources(profId);
            return;
        }
        if (!document.getElementById('gatherResourceGrid')) return;
        if (!isAutoGatherSessionValid(session)) {
            stopAutoGatherSession('📜 Свиток добычи завершён.');
            showGatheringResources(profId);
            return;
        }
        if (!session.resourceName) {
            showGatheringResources(profId);
            return;
        }
        const resources = RESOURCES_DB[profId] || [];
        const resource = resources.find(r => r.name === session.resourceName);
        if (!resource || !canAutoGatherResource(resource, session.scrollTier)) {
            stopAutoGatherSession('❌ Ресурс недоступен для этого свитка.');
            showGatheringResources(profId);
            return;
        }
        if (resource.locations.indexOf(player.location) === -1) {
            stopAutoGatherSession('❌ Ресурс недоступен в этой локации.');
            showGatheringResources(profId);
            return;
        }
        const playerProf = player.professions[profId];
        const currentTier = playerProf ? (playerProf.tier || 1) : 1;
        if (currentTier < resource.tier) {
            stopAutoGatherSession('❌ Недостаточный тир профессии для ресурса.');
            showGatheringResources(profId);
            return;
        }
        startGathering(profId, resource.name, resource.time, resource.exp, resource.tier, { auto: true });
    }, delay);
}

function settlePendingCriticalGather() {
    if (!pendingGatherData || !activeGatherSession || !activeGatherSession.outcome) return;
    const { profId, resourceName, outcome } = activeGatherSession;
    if (!outcome.hasCritical || outcome.criticalCount <= 0) return;
    addResourceToPlayer(resourceName, outcome.criticalCount);
    if (outcome.bonusExp > 0) applyProfessionExp(profId, outcome.bonusExp);
    addMessage(`🌟 Критический бонус зачислен (+${outcome.criticalCount}x ${resourceName})`, 'success');
    pendingGatherData = null;
}

function stopGathering() {
    var wasActive = gatheringRafId !== null || isGatheringLocked;
    stopGatheringAnimation();
    stopAutoGatherSession();
    if (wasActive && typeof addMessage === 'function') {
        addMessage('⚠️ Сбор ресурсов прерван!', 'warning');
    }
}

/** Базовые бонусы от тира (без учёта очков прокачки) */
function getBaseProfessionBonuses(tier) {
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

/**
 * Полные бонусы профессии с учётом очков прокачки.
 * Очки бонусов хранятся в player.professions[profId].bonusPoints = { speed, double, rare }
 * Каждый тир даёт 2 очка. Максимум в один стат — 5 очков (дает +5% к базовому значению).
 * Если profId не передан, возвращает базовые бонусы без учёта очков.
 */
function getProfessionBonuses(profId, tier) {
    // Обратная совместимость: если передан один аргумент (tier), используем базовые бонусы
    if (tier === undefined) {
        tier = profId;
        profId = null;
    }
    const base = getBaseProfessionBonuses(tier);
    if (!profId || !player.professions[profId]) {
        return base;
    }
    const prof = player.professions[profId];
    if (!prof || !prof.bonusPoints) {
        return base;
    }
    const pts = prof.bonusPoints;
    // Каждое очко даёт +1% к соответствующему бонусу (макс +5% = 5 очков)
    const speedBonus = Math.min(0.05, (pts.speed || 0) * 0.01);
    const doubleBonus = Math.min(0.05, (pts.double || 0) * 0.01);
    const rareBonus = Math.min(0.05, (pts.rare || 0) * 0.01);
    
    return {
        gatherSpeedBonus: Math.min(0.5, base.gatherSpeedBonus + speedBonus),
        doubleGatherChance: Math.min(0.5, base.doubleGatherChance + doubleBonus),
        expBonus: base.expBonus, // опыт не улучшается очками
        rareResourceChance: Math.min(0.3, base.rareResourceChance + rareBonus),
        craftQualityBonus: base.craftQualityBonus,
        materialSaveChance: base.materialSaveChance,
        // Для UI
        bonusPointsAvailable: getAvailableBonusPoints(prof),
        bonusPointsSpent: (pts.speed || 0) + (pts.double || 0) + (pts.rare || 0)
    };
}

/** Сколько очков доступно для распределения */
function getAvailableBonusPoints(prof) {
    if (!prof) return 0;
    const tier = parseInt(prof.tier, 10) || 1;
    const totalPoints = (tier - 1) * 2; // 2 очка за тир, начиная со 2-го
    const spent = (prof.bonusPoints?.speed || 0) + (prof.bonusPoints?.double || 0) + (prof.bonusPoints?.rare || 0);
    return Math.max(0, totalPoints - spent);
}

function getExpForNextTier(currentTier) {
    switch (currentTier) {
        case 1: return 500;
        case 2: return 1000;
        case 3: return 2000;
        case 4: return 3500;
        case 5: return 5000;
        default: return 0;
    }
}

function playGatherCriticalFeedback() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(740, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1240, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.36);
            setTimeout(() => ctx.close(), 400);
        }
    } catch (e) { /* без звукового файла — Web Audio */ }

    const panel = document.getElementById('gatheringProgress');
    if (panel) {
        panel.classList.remove('gather-critical-burst');
        void panel.offsetWidth;
        panel.classList.add('gather-critical-burst');
        setTimeout(() => panel.classList.remove('gather-critical-burst'), 700);
    }
    document.body.classList.remove('gather-screen-flash');
    void document.body.offsetWidth;
    document.body.classList.add('gather-screen-flash');
    setTimeout(() => document.body.classList.remove('gather-screen-flash'), 450);
}

function addResourceToPlayer(resourceName, amount) {
    if (!amount || amount <= 0) return;
    if (!player.resources[resourceName]) player.resources[resourceName] = 0;
    player.resources[resourceName] += amount;
}

function applyProfessionExp(profId, expAmount) {
    const prof = player.professions[profId];
    if (!prof || !expAmount) return false;

    if (typeof normalizeProfessionProf === 'function') normalizeProfessionProf(prof);
    prof.exp += Number(expAmount) || 0;
    let leveledUp = false;
    if (typeof applyProfessionTierUps === 'function') {
        leveledUp = applyProfessionTierUps(prof);
    } else {
        let expNeeded = getExpForNextTier(prof.tier);
        while (prof.exp >= expNeeded && prof.tier < 6 && expNeeded > 0) {
            prof.exp -= expNeeded;
            prof.tier = Math.min(6, (parseInt(prof.tier, 10) || 1) + 1);
            expNeeded = getExpForNextTier(prof.tier);
            leveledUp = true;
        }
        if (prof.tier >= 6) prof.exp = Math.min(prof.exp, getExpForNextTier(5) || prof.exp);
    }
    if (leveledUp) {
        const profMeta = PROFESSIONS_DB.gathering.find(p => p.id === profId)
            || PROFESSIONS_DB.crafting.find(p => p.id === profId);
        addMessage(`🎉 ПОВЫШЕНИЕ ТИРА! ${profMeta?.name || profId} → ${prof.tier} тир!`, 'success');
        const newBonuses = getProfessionBonuses(prof.tier);
        addMessage(`📈 Новые бонусы: скорость -${Math.floor(newBonuses.gatherSpeedBonus * 100)}%, двойная добыча +${Math.floor(newBonuses.doubleGatherChance * 100)}%`, 'info');
    }
    return leveledUp;
}

function rollGatherOutcome(bonuses, baseExp) {
    let totalCount = 1;
    let bonusExp = 0;
    const doubleTriggered = Math.random() < bonuses.doubleGatherChance;
    const rareTriggered = Math.random() < bonuses.rareResourceChance;

    if (doubleTriggered) totalCount += 1;
    if (rareTriggered) {
        totalCount += Math.max(1, Math.floor(totalCount * 0.5));
        bonusExp += Math.floor(baseExp * 0.5);
    }

    const autoCount = 1;
    const criticalCount = Math.max(0, totalCount - autoCount);
    const hasCritical = criticalCount > 0;

    return {
        totalCount,
        autoCount,
        criticalCount,
        doubleTriggered,
        rareTriggered,
        hasCritical,
        bonusExp
    };
}

function releaseGatherLockAndRefresh(profId, delayMs) {
    pendingGatherData = null;
    activeGatherSession = null;
    isGatheringLocked = false;
    const grid = document.getElementById('gatherResourceGrid');
    if (grid) grid.classList.remove('gather-grid-locked');
    saveGame();
    if (isAutoGatherActiveForProf(profId) && getAutoGatherSession().resourceName) {
        scheduleAutoGatherContinue(profId, delayMs);
    } else {
        setTimeout(() => showGatheringResources(profId), delayMs == null ? 300 : delayMs);
    }
}

function claimCriticalGather() {
    if (!pendingGatherData || !activeGatherSession) return;

    const { profId, resourceName, adjustedExp, outcome } = activeGatherSession;
    if (outcome.criticalCount > 0) {
        addResourceToPlayer(resourceName, outcome.criticalCount);
    }
    if (outcome.bonusExp > 0) applyProfessionExp(profId, outcome.bonusExp);

    let labels = [];
    if (outcome.doubleTriggered) labels.push('двойная добыча');
    if (outcome.rareTriggered) labels.push('редкий ресурс');
    addMessage(`🌟 Критический сбор: +${outcome.criticalCount}x ${resourceName}! (${labels.join(', ')})`, 'success');

    const btn = document.getElementById('claimCriticalBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '✓ Забрано';
    }

    releaseGatherLockAndRefresh(profId, 400);
}

function onGatheringComplete(profId, resourceName, adjustedExp, outcome, gatherOptions) {
    gatherOptions = gatherOptions || {};
    if (gatherOptions.auto) {
        const session = getAutoGatherSession();
        if (session && session.profId === profId) {
            session.gathersLeft = Math.max(0, (session.gathersLeft || 0) - 1);
            saveGame();
        }
    }
    addResourceToPlayer(resourceName, outcome.autoCount);

    if (!outcome.hasCritical) {
        const totalExp = adjustedExp + outcome.bonusExp;
        applyProfessionExp(profId, totalExp);
        addMessage(`✅ Собрано: ${outcome.autoCount}x ${resourceName} (+${Math.floor(totalExp)} XP)`, 'success');
        const resultDiv = document.getElementById('gatherResult');
        if (resultDiv) {
            resultDiv.innerHTML = `<div class="gather-auto-toast">✅ +${outcome.autoCount} ${resourceName} · +${Math.floor(totalExp)} XP</div>`;
        }
        releaseGatherLockAndRefresh(profId, 280);
        return;
    }

    applyProfessionExp(profId, adjustedExp);

    pendingGatherData = outcome;
    playGatherCriticalFeedback();

    const resultDiv = document.getElementById('gatherResult');
    if (!resultDiv) {
        claimCriticalGather();
        return;
    }

    let critLines = '';
    if (outcome.doubleTriggered) critLines += '<div class="gather-crit-tag gather-crit-double">✨ Двойная добыча</div>';
    if (outcome.rareTriggered) critLines += '<div class="gather-crit-tag gather-crit-rare">🌈 Редкий ресурс</div>';

    resultDiv.innerHTML = `
        <div class="gather-critical-panel">
            <div class="gather-critical-title">🌟 Критический сбор!</div>
            <div class="gather-critical-auto">✅ Обычная добыча: <strong>+${outcome.autoCount}</strong> ${resourceName} (уже в инвентаре)</div>
            <div class="gather-critical-bonus">🎁 Бонус: <strong>+${outcome.criticalCount}</strong> ${resourceName}</div>
            <div class="gather-crit-tags">${critLines}</div>
            ${outcome.bonusExp > 0 ? `<div class="gather-critical-exp">⭐ Бонусный опыт при заборе: +${Math.floor(outcome.bonusExp)} XP</div>` : ''}
            <button type="button" id="claimCriticalBtn" class="action-btn gather-claim-btn">🎒 Забрать бонус</button>
        </div>
    `;

    const btn = document.getElementById('claimCriticalBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            claimCriticalGather();
        }, { once: true });
        if (gatherOptions.auto) setTimeout(() => claimCriticalGather(), 900);
    } else if (gatherOptions.auto) {
        setTimeout(() => claimCriticalGather(), 900);
    }

    addMessage(`⛏️ Базовая добыча +${outcome.autoCount} ${resourceName}. Заберите критический бонус!`, 'info');
    isGatheringLocked = true;
    scrollGatherClaimIntoView();
}

function scrollGatherClaimIntoView() {
    requestAnimationFrame(() => {
        const btn = document.getElementById('claimCriticalBtn');
        const panel = document.querySelector('.gather-critical-panel');
        const target = btn || panel || document.getElementById('gatherResult');
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'end' });
        const main = document.querySelector('.main-content');
        if (main) {
            const rect = target.getBoundingClientRect();
            const mainRect = main.getBoundingClientRect();
            const top = rect.bottom - mainRect.top + main.scrollTop - main.clientHeight + 80;
            main.scrollTop = Math.max(0, top);
        }
    });
}

function startGathering(profId, resourceName, time, exp, requiredTier, gatherOptions) {
    gatherOptions = gatherOptions || {};
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
    if (currentTier < requiredTier) {
        addMessage(`❌ Нужен ${requiredTier} тир профессии для добычи этого ресурса! (сейчас ${currentTier})`, 'error');
        return;
    }

    const progressDiv = document.getElementById('gatheringProgress');
    if (!progressDiv) return;

    if (gatherOptions.auto) {
        const session = getAutoGatherSession();
        if (!session || session.profId !== profId || !isAutoGatherSessionValid(session)) {
            addMessage('❌ Свиток добычи не активен!', 'error');
            return;
        }
        const resources = RESOURCES_DB[profId] || [];
        const resMeta = resources.find(r => r.name === resourceName);
        if (!resMeta || !canAutoGatherResource(resMeta, session.scrollTier)) {
            addMessage('❌ Этот ресурс недоступен для тира свитка!', 'error');
            return;
        }
        session.resourceName = resourceName;
        saveGame();
    }

    stopGatheringAnimation();
    isGatheringLocked = true;
    pendingGatherData = null;
    const grid = document.getElementById('gatherResourceGrid');
    if (grid) grid.classList.add('gather-grid-locked');

    const bonuses = getProfessionBonuses(currentTier);
    const adjustedTime = Math.max(2, Math.floor(time * (1 - bonuses.gatherSpeedBonus)));
    let adjustedExp = Math.floor(exp * (1 + bonuses.expBonus));
    if (gatherOptions.auto) {
        const session = getAutoGatherSession();
        const mult = session && session.expMultiplier != null ? session.expMultiplier : 0.65;
        adjustedExp = Math.floor(adjustedExp * mult);
    }
    const totalTime = adjustedTime * 1000;
    const startTime = performance.now();

    activeGatherSession = { profId, resourceName, adjustedExp, bonuses, gatherOptions };

    progressDiv.innerHTML = `
        <div class="gathering-progress gather-active" id="gatherProgressPanel">
            <div class="gather-progress-header">
                <strong>⛏️ Добыча: ${resourceName}</strong>
                <span id="gatherPercent">0%</span>
            </div>
            <div class="gathering-bar">
                <div class="gathering-fill" id="gatherFill"></div>
            </div>
            <div class="gather-progress-hint">
                ⚡ -${Math.floor(bonuses.gatherSpeedBonus * 100)}% времени · 📈 +${Math.floor(bonuses.expBonus * 100)}% опыта
            </div>
            <div id="gatherResult"></div>
        </div>
    `;

    const tick = (now) => {
        if (!isGatheringLocked || !activeGatherSession) return;

        const elapsed = now - startTime;
        const percent = Math.min(100, Math.floor(elapsed / totalTime * 100));
        const fill = document.getElementById('gatherFill');
        const percentEl = document.getElementById('gatherPercent');

        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';

        if (percent < 100) {
            gatheringRafId = requestAnimationFrame(tick);
            return;
        }

        gatheringRafId = null;
        const outcome = rollGatherOutcome(bonuses, adjustedExp);
        activeGatherSession.outcome = outcome;

        const panel = document.getElementById('gatherProgressPanel');
        if (panel) panel.classList.add('gather-complete');

        onGatheringComplete(profId, resourceName, adjustedExp, outcome, activeGatherSession.gatherOptions);
    };

    gatheringRafId = requestAnimationFrame(tick);
}

function bindGatheringResourceGrid(profId, availableResources) {
    const grid = document.getElementById('gatherResourceGrid');
    if (!grid) return;

    grid.onclick = (e) => {
        const card = e.target.closest('.gather-resource-card');
        if (!card || card.classList.contains('locked')) return;
        if (isGatheringLocked) {
            addMessage('⏳ Дождитесь окончания текущей добычи.', 'error');
            return;
        }

        const idx = parseInt(card.getAttribute('data-resource-idx'), 10);
        const r = availableResources[idx];
        if (!r) return;

        e.preventDefault();
        e.stopPropagation();
        if (profId === 'fishing' && r.battle && r.bossId) {
            startFishingBossBattle(r);
            return;
        }
        const session = getAutoGatherSession();
        if (session && session.profId === profId) {
            if (!canAutoGatherResource(r, session.scrollTier)) {
                addMessage('❌ Свиток добычи не может собирать ресурсы выше своего тира!', 'error');
                return;
            }
            startGathering(profId, r.name, r.time, r.exp, r.tier, { auto: true });
            return;
        }
        startGathering(profId, r.name, r.time, r.exp, r.tier);
    };
}

function startFishingBossBattle(resource) {
    if (!resource || !resource.bossId) return;
    const boss = typeof FISHING_BOSSES !== 'undefined' ? FISHING_BOSSES[resource.bossId] : null;
    if (!boss) {
        addMessage(`❌ Босс для "${resource.name}" не найден!`, 'error');
        return;
    }
    if (isGatheringLocked) {
        addMessage('⏳ Дождитесь окончания текущей добычи.', 'error');
        return;
    }
    if (typeof startBattleWithMonster !== 'function') {
        addMessage('❌ Боевой модуль для морских боссов не загружен.', 'error');
        return;
    }
    
    stopGatheringAnimation();
    stopAutoGatherSession();
    addMessage(`🌊 Вы вытянули из глубин: ${boss.name}!`, 'warning');
    startBattleWithMonster(boss, { goldMult: boss.goldMult || 18 });
}

function renderGatherScrollPanel(profId) {
    ensureGatherScrollInventory();
    const session = getAutoGatherSession();
    let html = '<div id="gatherAutoStatus"></div>';

    if (session && session.profId === profId && isAutoGatherSessionValid(session)) {
        html += '';
    } else if (player.inventory.gatherScrolls.length > 0) {
        html += '<div class="gather-scroll-panel"><div class="gather-scroll-title">📜 Свитки добычи</div>';
        html += '<p class="gather-scroll-hint">Активируйте свиток — пока вы в этом меню, выбранный ресурс собирается автоматически. Тир свитка = макс. тир ресурса.</p>';
        html += '<div class="gather-scroll-list">';
        player.inventory.gatherScrolls.forEach((scroll, idx) => {
            const tier = scroll.scrollTier || scroll.tier || 1;
            const mins = Math.round((scroll.durationMs || 240000) / 60000);
            html += '<button type="button" class="gather-scroll-btn" onclick="activateGatherScroll(' + idx + ',\'' + profId + '\')">' +
                (scroll.icon || '📜') + ' ' + scroll.name +
                ' <span class="gather-scroll-tag">T' + tier + ' · ' + (scroll.maxGathers || '?') + ' сборов · ' + mins + ' мин</span></button>';
        });
        html += '</div></div>';
    }
    return html;
}

function showGatheringResources(profId) {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showProfessions', []);
    stopGatheringAnimation();
    pendingGatherData = null;

    const prof = PROFESSIONS_DB.gathering.find(p => p.id === profId);
    if (!prof) return;

    const resources = RESOURCES_DB[profId] || [];
    const playerProf = player.professions[profId];
    const currentTier = playerProf ? (playerProf.tier || 1) : 1;
    const exp = playerProf?.exp || 0;
    const bonuses = getProfessionBonuses(currentTier);
    const expNeeded = getExpForNextTier(currentTier);
    const percent = (expNeeded > 0 && currentTier < 6) ? (exp / expNeeded * 100) : 100;

    const availableResources = resources.filter(r =>
        r.locations.indexOf(player.location) !== -1 && currentTier >= r.tier
    );

    let html = '<h2>' + prof.icon + ' ' + prof.name + ' — Сбор ресурсов</h2>';
    html += '<div class="gather-prof-panel">';
    html += '<div class="gather-prof-row"><span>📍</span> <strong>' + player.location + '</strong></div>';
    html += '<div class="gather-prof-row"><span>⭐</span> Тир <strong>' + currentTier + '</strong>/6</div>';

    if (currentTier < 6) {
        html += '<div class="progress-bar gather-tier-bar"><div class="gather-tier-fill" style="width:' + percent + '%;"></div></div>';
        html += '<div class="gather-tier-text">До ' + (currentTier + 1) + ' тира: ' + Math.floor(exp) + '/' + expNeeded + ' XP</div>';
    } else {
        html += '<div class="gather-tier-maxed">🏆 Максимальный тир</div>';
    }

    // Панель бонусов с подсказками и прокачкой
    html += '<div class="gather-bonus-chips">';
    const availablePoints = bonuses.bonusPointsAvailable || 0;
    html += buildBonusChipWithTooltip('⚡', Math.floor(bonuses.gatherSpeedBonus * 100) + '%', 'speed', 
        'Скорость добычи', 'Снижает время сбора ресурса на ' + Math.floor(bonuses.gatherSpeedBonus * 100) + '%');
    html += buildBonusChipWithTooltip('🍀', Math.floor(bonuses.doubleGatherChance * 100) + '%', 'double',
        'Двойная добыча', 'Шанс получить x2 ресурса при сборе: ' + Math.floor(bonuses.doubleGatherChance * 100) + '%');
    html += buildBonusChipWithTooltip('✨', Math.floor(bonuses.rareResourceChance * 100) + '%', 'rare',
        'Редкость', 'Шанс найти редкий ресурс: ' + Math.floor(bonuses.rareResourceChance * 100) + '%');
    html += '</div>';
    
    // Панель распределения очков
    if (availablePoints > 0 || (bonuses.bonusPointsSpent || 0) > 0) {
        html += buildBonusUpgradePanel(profId, availablePoints, bonuses);
    }
    html += '</div>';

    html += renderGatherScrollPanel(profId);
    html += '<p class="gather-hint">После 100% обычный ресурс попадает в инвентарь сам. Кнопка «Забрать» — только при критическом сборе (в авто-режиме забирается сама).</p>';

    if (availableResources.length === 0) {
        html += '<p class="gather-empty">Нет ресурсов в этой локации или не хватает тира профессии.</p>';
    } else {
        html += '<div class="resource-grid" id="gatherResourceGrid" data-prof-id="' + profId + '">';
        const autoSession = getAutoGatherSession();
        const scrollTier = autoSession && autoSession.profId === profId ? autoSession.scrollTier : 0;
        availableResources.forEach((r, idx) => {
            const locked = currentTier < r.tier;
            const scrollBlocked = scrollTier > 0 && !canAutoGatherResource(r, scrollTier);
            const isAutoTarget = autoSession && autoSession.resourceName === r.name;
            html += '<div class="resource-card gather-resource-card' + (locked ? ' locked' : '') +
                (scrollBlocked ? ' gather-scroll-blocked' : '') +
                (isAutoTarget ? ' gather-auto-selected' : '') +
                '" data-resource-idx="' + idx + '" role="button" tabindex="0">';
            html += '<div class="resource-icon">' + (typeof renderItemIconHTML === 'function' ? renderItemIconHTML(r, { size: 48, fallback: r.icon || '📦' }) : r.icon) + '</div>';
            // Рассчитываем точное время и опыт с учётом бонусов профессии
            const adjTime = r.battle ? 0 : Math.max(2, Math.floor(r.time * (1 - bonuses.gatherSpeedBonus)));
            const adjExp = Math.floor(r.exp * (1 + bonuses.expBonus));
            const baseExp = parseInt(r.exp, 10) || 0;
            const expBonusHint = adjExp !== baseExp ? ` (баз. ${baseExp})` : '';
            
            html += '<div class="resource-info">';
            html += '<div class="resource-name">' + r.name + '</div>';
            html += '<div class="resource-desc">⭐ Тир ' + r.tier + (r.battle ? ' · ⚔️ Бой' : '') + '</div>';
            html += '<div class="resource-req">' + (r.battle ? '⚔️ Победите, чтобы получить тушку' : '⏱️ ' + adjTime + ' с · +' + adjExp + ' XP' + expBonusHint) + '</div>';
            if (locked) html += '<div class="resource-locked">🔒 Нужен ' + r.tier + ' тир</div>';
            else if (scrollBlocked) html += '<div class="resource-locked">📜 Выше тира свитка (' + scrollTier + ')</div>';
            else if (isAutoTarget) html += '<div class="gather-auto-badge">⚡ Авто</div>';
            html += '</div></div>';
        });
        html += '</div>';
    }

    html += '<div id="gatheringProgress"></div>';
    html += '<button type="button" class="action-btn ui-nav-back" data-ui-nav-back onclick="showProfessions()" style="margin-top:15px;width:100%;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;

    if (availableResources.length > 0) bindGatheringResourceGrid(profId, availableResources);

    if (isAutoGatherActiveForProf(profId)) {
        tickAutoGatherUi(profId);
        if (autoGatherUiTimerId != null) clearInterval(autoGatherUiTimerId);
        autoGatherUiTimerId = setInterval(() => tickAutoGatherUi(profId), 1000);
        const session = getAutoGatherSession();
        if (session && session.resourceName && !isGatheringLocked) {
            scheduleAutoGatherContinue(profId, 500);
        }
    }
}

window.stopGathering = stopGathering;
window.stopGatheringAnimation = stopGatheringAnimation;
window.stopAutoGatherSession = stopAutoGatherSession;
window.activateGatherScroll = activateGatherScroll;
window.deactivateGatherScrollManual = deactivateGatherScrollManual;
window.startGathering = startGathering;
window.showGatheringResources = showGatheringResources;
window.claimCriticalGather = claimCriticalGather;
window.startFishingBossBattle = startFishingBossBattle;
window.upgradeBonus = upgradeBonus;
window.resetBonusPoints = resetBonusPoints;
window.getProfessionBonuses = getProfessionBonuses;
window.getBaseProfessionBonuses = getBaseProfessionBonuses;
