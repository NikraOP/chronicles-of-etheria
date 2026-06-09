// craftingSystem.js - Полная исправленная версия

function getExpForNextTier(currentTier) {
    const tier = parseInt(currentTier, 10) || 1;
    switch(tier) {
        case 1: return 500;
        case 2: return 1000;
        case 3: return 2000;
        case 4: return 3500;
        case 5: return 5000;
        default: return 0;
    }
}

function normalizeProfessionProf(prof) {
    if (!prof) return;
    let tier = parseInt(prof.tier, 10);
    if (!Number.isFinite(tier) || tier < 1) tier = 1;
    if (tier > 6) tier = 6;
    prof.tier = tier;
    prof.exp = Math.max(0, parseInt(prof.exp, 10) || 0);
}

function applyProfessionTierUps(prof) {
    if (!prof) return false;
    normalizeProfessionProf(prof);
    let leveledUp = false;
    let expNeeded = getExpForNextTier(prof.tier);
    while (prof.exp >= expNeeded && prof.tier < 6 && expNeeded > 0) {
        prof.exp -= expNeeded;
        prof.tier = Math.min(6, prof.tier + 1);
        expNeeded = getExpForNextTier(prof.tier);
        leveledUp = true;
    }
    if (prof.tier >= 6) {
        const cap = getExpForNextTier(5);
        prof.exp = Math.min(prof.exp, cap > 0 ? cap : prof.exp);
    }
    return leveledUp;
}

const CRAFT_RESOURCE_ALIASES = {
    'Звездный шелк': 'Звёздный шёлк',
    'Звездный шёлк': 'Звёздный шёлк',
    'Звездная пыльца': 'Звездная пыльца',
    'Мифриловая нить': 'Мифриловая нить'
};

function getCraftRarityColor(rarity) {
    const colors = {
        'Обычный': '#aaa',
        'Необычный': '#2ecc71',
        'Редкий': '#3498db',
        'Эпический': '#9b59b6',
        'Легендарный': '#f0c040',
        'Мифический': '#e74c3c',
        'Древний': '#e67e22',
        'Божественный': '#1abc9c'
    };
    return colors[rarity] || '#ccc';
}

function resolveCraftResourceKey(name) {
    return CRAFT_RESOURCE_ALIASES[name] || name;
}

function getPlayerResourceAmount(resourceName) {
    if (!player || !player.resources) return 0;
    const canonical = resolveCraftResourceKey(resourceName);
    let total = player.resources[canonical] || 0;
    if (player.resources[resourceName] && resourceName !== canonical) {
        total += player.resources[resourceName];
    }
    for (const alt in CRAFT_RESOURCE_ALIASES) {
        if (CRAFT_RESOURCE_ALIASES[alt] === canonical && alt !== resourceName) {
            total += player.resources[alt] || 0;
        }
    }
    return total;
}

function hasRecipeMaterials(recipe, craftCount) {
    const materials = recipe && (recipe.resources || recipe.materials);
    if (!materials) return true;
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    for (const mat in materials) {
        if (getPlayerResourceAmount(mat) < materials[mat] * count) return false;
    }
    return true;
}

function scaleRecipeMaterials(materials, craftCount) {
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    const scaled = {};
    for (const mat in materials) {
        scaled[mat] = materials[mat] * count;
    }
    return scaled;
}

const CRAFT_BATCH_MAX = 99;

function getCraftNonMaterialBlockReason(recipe, profId) {
    if (!recipe) return 'Рецепт не найден';
    const prof = player.professions[profId];
    if (!prof) return 'Профессия не изучена';
    normalizeProfessionProf(prof);
    const r = normalizeRecipeForCraft(recipe);
    const requiredTier = r.tier;
    const profTier = parseInt(prof.tier, 10) || 1;
    if (profTier < requiredTier) {
        const left = getExpForNextTier(profTier) - prof.exp;
        if (left > 0) return `Нужен ${requiredTier} тир (ещё ~${Math.ceil(left)} XP)`;
        return `Нужен ${requiredTier} тир профессии`;
    }
    const playerClass = (player.class || '').trim();
    const recipeClass = (r.class || '').trim();
    if (recipeClass && playerClass && recipeClass !== playerClass) {
        return `Только для класса ${recipeClass}`;
    }
    return '';
}

function getMaxCraftCount(recipe, profId) {
    const block = getCraftNonMaterialBlockReason(recipe, profId);
    if (block) return 0;
    const r = normalizeRecipeForCraft(recipe);
    const materials = r.resources || r.materials;
    if (!materials) return CRAFT_BATCH_MAX;
    let max = CRAFT_BATCH_MAX;
    for (const mat in materials) {
        const perCraft = materials[mat];
        if (perCraft <= 0) continue;
        max = Math.min(max, Math.floor(getPlayerResourceAmount(mat) / perCraft));
    }
    return Math.max(0, max);
}

function consumePlayerResources(materials) {
    if (!materials) return;
    for (const mat in materials) {
        let needed = materials[mat];
        const canonical = resolveCraftResourceKey(mat);
        const keys = [canonical, mat];
        for (const alt in CRAFT_RESOURCE_ALIASES) {
            if (CRAFT_RESOURCE_ALIASES[alt] === canonical) keys.push(alt);
        }
        const uniqueKeys = [...new Set(keys)];
        for (let i = 0; i < uniqueKeys.length && needed > 0; i++) {
            const k = uniqueKeys[i];
            const have = player.resources[k] || 0;
            if (have <= 0) continue;
            const take = Math.min(have, needed);
            player.resources[k] = have - take;
            needed -= take;
            if (player.resources[k] <= 0) delete player.resources[k];
        }
    }
}

function normalizeRecipeForCraft(recipe) {
    if (!recipe) return recipe;
    const r = { ...recipe };
    const tier = parseInt(r.tier, 10) || 1;
    if (r.rarity === 'Древний' || r.rarity === 'Божественный') {
        r.tier = 6;
    } else {
        r.tier = tier;
    }
    return r;
}

function findProfessionMeta(profId) {
    if (!PROFESSIONS_DB) return null;
    return PROFESSIONS_DB.gathering.find(p => p.id === profId)
        || PROFESSIONS_DB.crafting.find(p => p.id === profId)
        || null;
}

function getProfessionLearnBlockReason(profId) {
    if (player.professions[profId]) return 'Профессия уже изучена';
    return '';
}

/** Объекты ресурсов на текущей локации (добывающая профессия — свой RESOURCES_DB). */
function getGatherableResourceDefsAtLocation(profId) {
    const loc = String(player.location || '').trim();
    if (!loc) return [];
    const profState = player.professions[profId];
    const tier = profState ? (parseInt(profState.tier, 10) || 1) : 1;
    const list = RESOURCES_DB[profId] || [];
    const seen = new Set();
    const defs = [];
    for (const r of list) {
        if (!r || !r.name || seen.has(r.name)) continue;
        const resTier = parseInt(r.tier, 10) || 1;
        const locs = r.locations || [];
        if (locs.indexOf(loc) === -1 || tier < resTier) continue;
        seen.add(r.name);
        defs.push(r);
    }
    return defs.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

/** Ресурсы на текущей локации для профессии (с учётом тира профессии). */
function getResourcesAtLocationForProfession(profId) {
    const loc = String(player.location || '').trim();
    if (!loc) return [];
    if (RESOURCES_DB[profId]) {
        return getGatherableResourceDefsAtLocation(profId).map(r => r.name);
    }
    const meta = findProfessionMeta(profId);
    const profState = player.professions[profId];
    const tier = profState ? (parseInt(profState.tier, 10) || 1) : 1;
    const sourceIds = meta && meta.relatedGathering ? meta.relatedGathering : [];
    const names = [];
    const seen = new Set();
    for (const srcId of sourceIds) {
        const list = RESOURCES_DB[srcId] || [];
        for (const r of list) {
            if (!r || !r.name || seen.has(r.name)) continue;
            const resTier = parseInt(r.tier, 10) || 1;
            const locs = r.locations || [];
            if (locs.indexOf(loc) === -1 || tier < resTier) continue;
            seen.add(r.name);
            names.push(r.name);
        }
    }
    return names.sort((a, b) => a.localeCompare(b, 'ru'));
}

function escapeHtmlText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getCraftRecipeCombatStatsText(r) {
    if (!r) return '';
    let s = '';
    if (r.dmg) s += '⚔️+' + r.dmg + ' ';
    if (r.def) s += '🛡️+' + r.def + ' ';
    if (r.hp) s += '❤️+' + r.hp + ' ';
    if (r.crit) s += '💥+' + r.crit + '% ';
    if (r.critDmg) s += '⭐+' + r.critDmg + '% ';
    if (r.dodge) s += '💨+' + r.dodge + '% ';
    if (r.mana) s += '💎+' + r.mana + ' ';
    return s.trim();
}

function getCraftRecipeEffectText(r) {
    if (!r) return '';
    const val = r.value;
    const effect = r.effect;
    const type = r.type || '';

    if (effect === 'heal') {
        return '❤️ В бою: восстанавливает ' + (val || 0) + ' HP';
    }
    if (effect === 'restoreMana' || type === 'mana_potion') {
        return '💎 В бою: восстанавливает ' + (val || 0) + ' маны (только маг)';
    }
    if (effect === 'atk') return '⚔️ В бою: +' + (val || 0) + '% атаки на 3 хода';
    if (effect === 'def') return '🛡️ В бою: +' + (val || 0) + '% защиты на 3 хода';
    if (effect === 'dodge') return '💨 В бою: +' + (val || 0) + '% уклонения на 3 хода';
    if (effect === 'crit') return '💥 В бою: +' + (val || 0) + '% крита на 3 хода';
    if (effect === 'berserk') return '😤 В бою: +' + (val || 0) + '% урона на 3 хода';
    if (effect === 'immortal') return '✨ В бою: иммунитет к урону на 1 ход';
    if (effect === 'enchant') {
        return '✨ В бою: улучшает экипированное оружие на +' + (val || 0) + '% урона';
    }
    if (effect === 'fireball') return '🔥 В бою: урон свитком (~' + (val || 0) + ' силы)';
    if (type === 'gather_scroll' || effect === 'auto_gather') {
        const mins = r.durationMs ? Math.max(1, Math.round(r.durationMs / 60000)) : '?';
        const mult = r.expMultiplier != null ? Math.round(r.expMultiplier * 100) : 65;
        return '📜 Свиток добычи: тир ' + (r.scrollTier || '?') + ', ~' + mins + ' мин, до '
            + (r.maxGathers || '?') + ' сборов, опыт добычи ×' + mult + '%';
    }
    if (type === 'stone') return '💎 Камень: вставляется в снаряжение для бонусов';
    if (type === 'weapon') return '⚔️ Оружие — экипируется в слот оружия';
    if (type === 'helmet') return '⛑️ Шлем';
    if (type === 'chest') return '🛡️ Нагрудник';
    if (type === 'pants') return '👖 Поножи';
    if (type === 'boots') return '👢 Сапоги';
    if (type === 'ring') return '💍 Кольцо — слот кольца';
    if (type === 'necklace') return '📿 Амулет — слот амулета';
    return '';
}

function buildCraftRecipeTooltipHtml(r) {
    const name = escapeHtmlText(r.name || 'Предмет');
    const stats = getCraftRecipeCombatStatsText(r);
    const effect = getCraftRecipeEffectText(r);
    let desc = '';
    if (stats && effect) desc = stats + '<br>' + effect;
    else if (stats) desc = stats;
    else if (effect) desc = effect;
    else desc = 'Созданный предмет для экипировки или использования.';

    let meta = '⭐ Тир рецепта ' + (parseInt(r.tier, 10) || 1);
    if (r.rarity) meta += ' · ' + escapeHtmlText(r.rarity);
    if (r.class) meta += '<br>👤 Класс: ' + escapeHtmlText(r.class);
    const craftTime = parseInt(r.time, 10) || parseInt(r.exp, 10) || 0;
    if (craftTime > 0) meta += '<br>⏱️ Время крафта: ~' + craftTime + ' с';

    return '<div class="prof-resource-tooltip craft-recipe-tooltip" role="tooltip">' +
        '<div class="prof-resource-tooltip-name">' + name + '</div>' +
        '<div class="prof-resource-tooltip-desc">' + desc + '</div>' +
        '<div class="prof-resource-tooltip-meta">' + meta + '</div>' +
        '</div>';
}

function getGatherResourceDescription(r) {
    if (r && r.desc) return String(r.desc);
    if (r && r.battle) return 'Особая добыча — победа в бою, затем тушка в инвентарь.';
    return 'Ресурс для крафта, продажи и улучшений.';
}

function getAdjustedGatherExpForResource(r, profId) {
    const prof = player.professions[profId];
    const tier = prof ? (parseInt(prof.tier, 10) || 1) : 1;
    const bonuses = getProfessionBonuses(tier);
    const baseExp = parseInt(r.exp, 10) || 0;
    return Math.floor(baseExp * (1 + bonuses.expBonus));
}

function getAdjustedGatherTimeForResource(r, profId) {
    const prof = player.professions[profId];
    const tier = prof ? (parseInt(prof.tier, 10) || 1) : 1;
    const bonuses = getProfessionBonuses(tier);
    const baseTime = parseInt(r.time, 10) || 0;
    if (r.battle) return 0;
    return Math.max(2, Math.floor(baseTime * (1 - bonuses.gatherSpeedBonus)));
}

function buildGatherResourceTooltipHtml(r, profId) {
    const name = escapeHtmlText(r.name || 'Ресурс');
    const desc = escapeHtmlText(getGatherResourceDescription(r));
    const resTier = parseInt(r.tier, 10) || 1;
    let meta = '⭐ Тир ' + resTier;
    if (r.battle) {
        meta += ' · ⚔️ Бой';
    } else {
        const adjTime = getAdjustedGatherTimeForResource(r, profId);
        const adjExp = getAdjustedGatherExpForResource(r, profId);
        const baseExp = parseInt(r.exp, 10) || 0;
        meta += '<br>⏱️ ' + adjTime + ' с';
        meta += ' · +' + adjExp + ' XP';
        if (adjExp !== baseExp) {
            meta += ' <span class="prof-tooltip-muted">(баз. ' + baseExp + ')</span>';
        }
    }
    return '<div class="prof-resource-tooltip" role="tooltip">' +
        '<div class="prof-resource-tooltip-name">' + name + '</div>' +
        '<div class="prof-resource-tooltip-desc">' + desc + '</div>' +
        '<div class="prof-resource-tooltip-meta">' + meta + '</div>' +
        '</div>';
}

function renderGatherProfessionIconsHtml(profId) {
    const defs = getGatherableResourceDefsAtLocation(profId);
    if (!defs.length) {
        return '<div class="profession-resource-strip profession-resource-icons profession-resource-icons--empty" title="На этой локации нет ресурсов для вашего тира">' +
            '<span class="profession-resource-empty">∅</span></div>';
    }
    const count = defs.length;
    const densityClass = count > 12 ? 'profession-resource-icons--dense'
        : count > 8 ? 'profession-resource-icons--many'
        : count > 4 ? 'profession-resource-icons--medium' : '';
    const iconSize = count > 12 ? 26 : count > 8 ? 28 : 32;
    let html = '<div class="profession-resource-strip profession-resource-icons ' + densityClass + '" data-resource-count="' + count + '">';
    for (let i = 0; i < defs.length; i++) {
        const r = defs[i];
        html += '<div class="profession-resource-icon-chip" tabindex="0" aria-label="' + escapeHtmlText(r.name || '') + '">';
        html += typeof renderItemIconHTML === 'function'
            ? renderItemIconHTML(r, { size: iconSize, fallback: r.icon || '📦' })
            : '<span>' + (r.icon || '📦') + '</span>';
        html += buildGatherResourceTooltipHtml(r, profId);
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function formatLocationResourcesHint(profId) {
    const list = getResourcesAtLocationForProfession(profId);
    const loc = player.location || '—';
    if (!list.length) {
        return `📍 ${loc}: нет ресурсов для этой профессии на вашем тире`;
    }
    const preview = list.slice(0, 6).join(', ');
    const more = list.length > 6 ? ` +${list.length - 6}` : '';
    return `📍 ${loc}: ${preview}${more}`;
}

function getCraftBlockReason(recipe, profId, craftCount) {
    const nonMat = getCraftNonMaterialBlockReason(recipe, profId);
    if (nonMat) return nonMat;
    const r = normalizeRecipeForCraft(recipe);
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    const materials = r.resources || r.materials;
    if (materials) {
        for (const mat in materials) {
            const needed = materials[mat] * count;
            const has = getPlayerResourceAmount(mat);
            if (has < needed) {
                return count > 1
                    ? `Не хватает для ×${count}: ${mat} (${has}/${needed})`
                    : `Не хватает: ${mat} (${has}/${needed})`;
            }
        }
    }
    return '';
}

function decodeCraftBlockReason(raw) {
    if (!raw) return '';
    try {
        return decodeURIComponent(raw);
    } catch (e) {
        return raw;
    }
}

function bindCraftRecipeGrid(profId) {
    const root = document.getElementById('dynamicContent');
    if (!root) return;
    root.querySelectorAll('.craft-recipe-card').forEach(card => {
        if (card.dataset.craftBound === '1') return;
        card.dataset.craftBound = '1';
        card.addEventListener('click', (e) => {
            // Игнорируем клик если нажали на input или кнопку крафта
            if (e.target.closest('.craft-quantity-input') || e.target.closest('.craft-now-btn')) {
                return;
            }
            // Проверяем активную сессию — если есть и ещё не завершена, ждём
            if (activeCraftSession && !sessionFinished) {
                addMessage('⏳ Дождитесь окончания текущего крафта.', 'error');
                return;
            }
            const reason = decodeCraftBlockReason(card.getAttribute('data-block-reason'));
            if (reason) {
                addMessage('❌ ' + reason, 'error');
                return;
            }
            const recipeName = decodeURIComponent(card.getAttribute('data-recipe-name') || '');
            if (!recipeName) return;
            // Клик по карточке крафтит 1 предмет (старое поведение)
            // Shift+клик или Ctrl+клик — авто-крафт
            if (e.shiftKey || e.ctrlKey) {
                const maxCraft = getMaxCraftCount(normalizeRecipeForCraft(
                    getAllRecipesForProfession(profId).find(r => r.name === recipeName)
                ), profId);
                startAutoCraft(profId, recipeName, maxCraft);
            } else {
                startCraftProgress(profId, recipeName, card, 1);
            }
        });
    });
}

function scrollCraftProgressIntoView() {
    const slot = document.getElementById('craftProgressSlot');
    if (!slot || !slot.innerHTML) return;
    requestAnimationFrame(() => {
        slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const main = document.querySelector('.main-content');
        if (main) {
            const top = slot.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 12;
            main.scrollTop = Math.max(0, top);
        }
    });
}

// getProfessionBonuses импортируется из gathering.js

let pendingCraftData = null;
let craftProgressRafId = null;
let activeCraftSession = null;
let isCraftingLocked = false;
let autoCraftSession = null; // Авто-крафт как свитки добычи
let autoCraftIntervalId = null;
let sessionFinished = false; // Флаг для предотвращения дублирования при завершении крафта
window.craftStartTime = 0; // Время начала крафта для восстановления прогресса
window.craftTotalTime = 0; // Общее время крафта в миллисекундах
let craftPushNotification = null; // Push-уведомление прогресса крафта

function showCraftPushNotification(recipeName, batchCount, percent) {
    // Удаляем старое уведомление если есть
    if (craftPushNotification && craftPushNotification.parentNode) {
        craftPushNotification.parentNode.removeChild(craftPushNotification);
    }
    
    // Создаём новое уведомление
    const notification = document.createElement('div');
    notification.className = 'push-notification push-notification--info';
    notification.id = 'craftPushNotification';
    
    const iconHtml = typeof renderItemIconHTML === 'function'
        ? renderItemIconHTML(activeCraftSession?.normRecipe, { size: 24, fallback: '🔨' })
        : '🔨';
    
    const quantityLabel = batchCount > 1 ? ` ×${batchCount}` : '';
    
    notification.innerHTML = `
        <span class="push-notification__icon">${iconHtml}</span>
        <span class="push-notification__text">🔨 Крафт: ${recipeName}${quantityLabel} — ${percent}%</span>
    `;
    
    // Позиционируем уведомление
    const baseTop = 20;
    const gap = 10;
    const notificationHeight = 60;
    const existingNotifications = document.querySelectorAll('.push-notification:not(#craftPushNotification)');
    const topPosition = baseTop + (existingNotifications.length * (notificationHeight + gap));
    
    notification.style.top = topPosition + 'px';
    
    document.body.appendChild(notification);
    craftPushNotification = notification;
}

function updateCraftPushNotification(percent) {
    if (!craftPushNotification) return;
    
    const session = activeCraftSession;
    if (!session) return;
    
    const quantityLabel = session.batchCount > 1 ? ` ×${session.batchCount}` : '';
    craftPushNotification.innerHTML = `
        <span class="push-notification__icon">🔨</span>
        <span class="push-notification__text">Крафт: ${session.normRecipe.name}${quantityLabel} — ${percent}%</span>
    `;
}

function removeCraftPushNotification() {
    if (craftPushNotification && craftPushNotification.parentNode) {
        craftPushNotification.parentNode.removeChild(craftPushNotification);
    }
    craftPushNotification = null;
}
    if (autoCraftIntervalId != null) {
        clearInterval(autoCraftIntervalId);
        autoCraftIntervalId = null;
    }
    if (!autoCraftSession) return;
    const name = autoCraftSession.recipeName || 'Авто-крафт';
    autoCraftSession = null;
    saveGame();
    if (reason) addMessage(reason, 'info');
    else addMessage('🔨 Авто-крафт остановлен.', 'info');
}

function isAutoCraftActiveForProf(profId) {
    return !!(autoCraftSession && autoCraftSession.profId === profId);
}

function tickAutoCraftUi(profId) {
    const el = document.getElementById('craftAutoStatus');
    if (!el || !autoCraftSession || autoCraftSession.profId !== profId) return;
    if (!autoCraftSession) {
        if (el) el.innerHTML = '';
        return;
    }
    const maxPerCraft = autoCraftSession.maxPerCraft || 1;
    const crafted = autoCraftSession.crafted || 0;
    el.innerHTML =
        '<div class="craft-auto-active">' +
        '<div class="craft-auto-title">⚡ Авто-крафт: <strong>' + (autoCraftSession.recipeName || 'Рецепт') + '</strong></div>' +
        '<div class="craft-auto-meta">Скрафчено: <strong>' + crafted + '</strong>/' + maxPerCraft +
        (autoCraftSession.stopOnLowMat ? ' · Остановка при нехватке' : '') + '</div>' +
        '<button type="button" class="action-btn craft-auto-stop" onclick="stopAutoCraftSession()">⏹ Остановить</button>' +
        '</div>';
}
    
function restoreCraftProgressUI() {
    // Восстанавливаем UI крафта если есть активная сессия
    if (!activeCraftSession) return;
    const slot = document.getElementById('craftProgressSlot');
    if (!slot) return;
    
    const session = activeCraftSession;
    const iconHtml = typeof renderItemIconHTML === 'function'
        ? renderItemIconHTML(session.normRecipe, { size: 32, fallback: session.normRecipe.icon || '📦' })
        : (session.normRecipe.icon || '📦');
    
    const quantityLabel = session.batchCount > 1 ? ` ×${session.batchCount}` : '';
    
    // Если сессия завершена (sessionFinished) но pendingCraftData ещё не обработан
    if (sessionFinished) {
        // Показываем завершённый прогресс-бар
        slot.innerHTML = `
            <div class="crafting-progress craft-active craft-complete" id="craftProgressPanel">
                <div class="craft-progress-header">
                    <span class="craft-progress-icon">${iconHtml}</span>
                    <strong>🔨 Создание: ${session.normRecipe.name}${quantityLabel}</strong>
                    <span id="craftPercent">100%</span>
                </div>
                <div class="crafting-bar">
                    <div class="crafting-fill" id="craftFill" style="width: 100%"></div>
                </div>
                <div class="craft-progress-hint-detail">
                    ⚡ −${Math.floor(session.bonuses.gatherSpeedBonus * 100)}% времени · ✨ +${Math.floor(session.bonuses.craftQualityBonus * 100)}% качества · 📦 ×${session.batchCount}
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #2ecc71;">✅ Готово! Предмет создан.</div>
            </div>
        `;
        // Обрабатываем pendingCraftData если есть
        if (pendingCraftData) {
            setTimeout(() => completeCrafting(session.profId, { silent: false }), 500);
        }
        return;
    }
    
    // Рассчитываем текущий прогресс
    const elapsed = performance.now() - window.craftStartTime;
    const percent = Math.min(100, Math.floor(elapsed / window.craftTotalTime * 100));
    
    slot.innerHTML = `
        <div class="crafting-progress craft-active" id="craftProgressPanel">
            <div class="craft-progress-header">
                <span class="craft-progress-icon">${iconHtml}</span>
                <strong>🔨 Создание: ${session.normRecipe.name}${quantityLabel}</strong>
                <span id="craftPercent">${percent}%</span>
            </div>
            <div class="crafting-bar">
                <div class="crafting-fill" id="craftFill" style="width: ${percent}%"></div>
            </div>
            <div class="craft-progress-hint-detail">
                ⚡ −${Math.floor(session.bonuses.gatherSpeedBonus * 100)}% времени · ✨ +${Math.floor(session.bonuses.craftQualityBonus * 100)}% качества · 📦 ×${session.batchCount}
            </div>
        </div>
    `;
    
    // Возобновляем анимацию только если крафт ещё не завершён
    if (percent >= 100) return;
    
    const tick = (now) => {
        if (!activeCraftSession || sessionFinished) return;
        
        const elapsed = now - window.craftStartTime;
        const percent = Math.min(100, Math.floor(elapsed / window.craftTotalTime * 100));
        const fill = document.getElementById('craftFill');
        const percentEl = document.getElementById('craftPercent');
        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';

        if (percent < 100) {
            craftProgressRafId = requestAnimationFrame(tick);
            return;
        }

        sessionFinished = true;
        craftProgressRafId = null;
        const panel = document.getElementById('craftProgressPanel');
        if (panel) panel.classList.add('craft-complete');
        finishCraftProgress(activeCraftSession);
    };

    craftProgressRafId = requestAnimationFrame(tick);
}

function stopCraftProgress() {
    if (craftProgressRafId) {
        cancelAnimationFrame(craftProgressRafId);
        craftProgressRafId = null;
    }
    // НЕ сбрасываем activeCraftSession и isCraftingLocked — крафт продолжается в фоне
    // activeCraftSession = null;
    // isCraftingLocked = false;
    if (typeof document.querySelector === 'function') {
        const grid = document.querySelector('.craft-recipe-grid');
        if (grid) grid.classList.remove('craft-grid-locked');
        document.querySelectorAll('.craft-recipe-crafting').forEach(el => el.classList.remove('craft-recipe-crafting'));
    }
    const slot = document.getElementById('craftProgressSlot');
    if (slot) slot.innerHTML = '';
    sessionFinished = false; // Сбрасываем флаг при остановке
}

function flushPendingCraft() {
    if (!pendingCraftData || !pendingCraftData.profId) return;
    completeCrafting(pendingCraftData.profId, { silent: true });
}

function consumeCraftMaterials(materials, saveChance) {
    if (!materials) return;
    if (saveChance > 0 && Math.random() < saveChance) {
        addMessage(`💎 Экономия материалов (+${Math.floor(saveChance * 100)}%)!`, 'success');
        return;
    }
    consumePlayerResources(materials);
}

function finishCraftProgress(session) {
    if (!session) return;
    const count = session.batchCount || 1;
    const blockReason = getCraftBlockReason(session.normRecipe, session.profId, count);
    if (blockReason) {
        addMessage(`❌ ${blockReason}`, 'error');
        stopCraftProgress();
        return;
    }
    // Материалы НЕ списываем здесь — их проверит и спишет completeCrafting()
    pendingCraftData = {
        profId: session.profId,
        recipe: session.normRecipe,
        adjustedExp: session.adjustedExp,
        bonuses: session.bonuses,
        scaledMaterials: session.scaledMaterials,
        batchCount: count
    };
    const slot = document.getElementById('craftProgressSlot');
    const hasUi = !!slot;
    completeCrafting(session.profId, { silent: !hasUi });
    // stopCraftProgress(); — НЕ вызываем здесь — крафт продолжается в фоне
}

// Функция для сбора всех рецептов профессии из всех категорий
function getAllRecipesForProfession(profId) {
    const recipesData = CRAFTING_RECIPES[profId];
    if (!recipesData) return [];
    
    let allRecipes = [];
    const categories = ['weapons', 'armor', 'potions', 'gather_scrolls', 'scrolls', 'foods', 'gems', 'rings', 'amulets', 'consumables', 'items', 'stones'];
    
    for (const category of categories) {
        if (recipesData[category] && Array.isArray(recipesData[category])) {
            allRecipes = allRecipes.concat(recipesData[category]);
        }
    }
    
    return allRecipes.map(normalizeRecipeForCraft);
}

function buildCraftedItemFromRecipe(recipe, bonuses) {
    const visuals = typeof pickItemVisualFields === 'function' ? pickItemVisualFields(recipe) : { icon: recipe.icon || '📦', img: recipe.img || '' };
    const newItem = {
        name: recipe.name,
        rarity: recipe.rarity || 'Обычный',
        icon: visuals.icon,
        img: visuals.img,
        type: recipe.type,
        class: recipe.class || null,
        effect: recipe.effect || null,
        value: recipe.value || null,
        scrollTier: recipe.scrollTier || null,
        durationMs: recipe.durationMs || null,
        maxGathers: recipe.maxGathers || null,
        expMultiplier: recipe.expMultiplier != null ? recipe.expMultiplier : null,
        dmg: recipe.dmg || 0,
        def: recipe.def || 0,
        hp: recipe.hp || 0,
        crit: recipe.crit || 0,
        critDmg: recipe.critDmg || 0,
        dodge: recipe.dodge || 0,
        mana: recipe.mana || 0,
        baseDmg: recipe.baseDmg || recipe.dmg || 0,
        baseDef: recipe.baseDef || recipe.def || 0,
        upgradeLevel: 0
    };
    if (typeof getItemSellPrice === 'function') {
        newItem.sellPrice = getItemSellPrice(newItem);
    } else if (recipe.sellPrice) {
        newItem.sellPrice = recipe.sellPrice;
    }
    const qualityBonus = bonuses.craftQualityBonus;
    if (qualityBonus > 0 && (newItem.dmg > 0 || newItem.def > 0 || newItem.hp > 0)) {
        const qualityMultiplier = 1 + qualityBonus;
        if (newItem.dmg) newItem.dmg = Math.floor(newItem.dmg * qualityMultiplier);
        if (newItem.def) newItem.def = Math.floor(newItem.def * qualityMultiplier);
        if (newItem.hp) newItem.hp = Math.floor(newItem.hp * qualityMultiplier);
        if (newItem.crit) newItem.crit = Math.floor(newItem.crit * qualityMultiplier);
        if (newItem.critDmg) newItem.critDmg = Math.floor(newItem.critDmg * qualityMultiplier);
        if (newItem.dodge) newItem.dodge = Math.floor(newItem.dodge * qualityMultiplier);
    }
    return newItem;
}

function pushCraftedItemToInventory(recipe, newItem) {
    const itemType = recipe.type;
    if (itemType === 'weapon') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(newItem);
    } else if (itemType === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(newItem);
    } else if (itemType === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(newItem);
    } else if (itemType === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(newItem);
    } else if (itemType === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(newItem);
    } else if (itemType === 'stone') {
        if (!player.inventory.stones) player.inventory.stones = [];
        player.inventory.stones.push(newItem);
    } else if (itemType === 'ring') {
        if (!player.inventory.rings) player.inventory.rings = [];
        player.inventory.rings.push(newItem);
    } else if (itemType === 'necklace') {
        if (!player.inventory.necklaces) player.inventory.necklaces = [];
        player.inventory.necklaces.push(newItem);
    } else if (itemType === 'mana_potion') {
        if (!player.inventory.manaPotions) player.inventory.manaPotions = [];
        player.inventory.manaPotions.push(newItem);
    } else if (itemType === 'potion') {
        if (!player.inventory.potions) player.inventory.potions = [];
        player.inventory.potions.push(newItem);
    } else if (itemType === 'food') {
        if (!player.inventory.foods) player.inventory.foods = [];
        player.inventory.foods.push(newItem);
    } else if (itemType === 'gather_scroll') {
        if (!player.inventory.gatherScrolls) player.inventory.gatherScrolls = [];
        player.inventory.gatherScrolls.push(newItem);
    } else if (itemType === 'scroll' || itemType === 'battle_scroll') {
        if (!player.inventory.scrolls) player.inventory.scrolls = [];
        player.inventory.scrolls.push(newItem);
    } else if (itemType === 'elixir') {
        if (!player.inventory.elixirs) player.inventory.elixirs = [];
        player.inventory.elixirs.push(newItem);
    } else {
        if (!player.inventory.armor) player.inventory.armor = [];
        player.inventory.armor.push(newItem);
    }
}

function getCraftSuccessMessage(recipe, batchCount) {
    const n = Math.max(1, batchCount || 1);
    const label = n > 1 ? `×${n} ` : '';
    const itemType = recipe.type;
    if (itemType === 'weapon') return `⚔️ Создано ${label}оружие: ${recipe.name}!`;
    if (itemType === 'helmet') return `⛑️ Создано ${label}шлемов: ${recipe.name}!`;
    if (itemType === 'chest') return `🛡️ Создано ${label}нагрудников: ${recipe.name}!`;
    if (itemType === 'pants') return `👖 Создано ${label}поножей: ${recipe.name}!`;
    if (itemType === 'boots') return `👢 Создано ${label}сапог: ${recipe.name}!`;
    if (itemType === 'stone') return `💎 Создано ${label}камней: ${recipe.name}!`;
    if (itemType === 'ring') return `💍 Создано ${label}колец: ${recipe.name}!`;
    if (itemType === 'necklace') return `📿 Создано ${label}амулетов: ${recipe.name}!`;
    if (itemType === 'potion') return `🧪 Создано ${label}зелий: ${recipe.name}!`;
    if (itemType === 'mana_potion') return `💎 Создано ${label}зелье маны: ${recipe.name}!`;
    if (itemType === 'food') return `🍖 Создано ${label}еды: ${recipe.name}!`;
    if (itemType === 'gather_scroll') return `📜 Создано ${label}${recipe.name}! Активируйте в меню добычи.`;
    if (itemType === 'scroll' || itemType === 'battle_scroll') return `📜 Создано ${label}свитков: ${recipe.name}!`;
    if (itemType === 'elixir') return `💪 Создано ${label}эликсиров: ${recipe.name}!`;
    return `✅ Создано ${label}: ${recipe.name}!`;
}

function completeCrafting(profId, options) {
    options = options || {};
    if (!pendingCraftData) {
        addMessage('❌ Нет данных о крафте!', 'error');
        return;
    }
    
    const prof = player.professions[profId];
    if (!prof) return;
    normalizeProfessionProf(prof);
    
    const { recipe, adjustedExp, bonuses, scaledMaterials, batchCount } = pendingCraftData;
    const count = Math.max(1, parseInt(batchCount, 10) || 1);

    // БАГ 8 fix: проверяем наличие материалов повторно перед выдачей предмета
    if (!hasRecipeMaterials(recipe, count)) {
        addMessage('❌ Недостаточно материалов для крафта! Ресурсы были потрачены до завершения.', 'error');
        pendingCraftData = null;
        if (!options.silent) showCraftingRecipes(profId);
        return;
    }

    // Списываем материалы только после успешной проверки
    if (scaledMaterials) {
        consumeCraftMaterials(scaledMaterials, bonuses.materialSaveChance);
    }

    let qualityMsgShown = false;

    for (let i = 0; i < count; i++) {
        const newItem = buildCraftedItemFromRecipe(recipe, bonuses);
        if (bonuses.craftQualityBonus > 0 && !qualityMsgShown &&
            (newItem.dmg > 0 || newItem.def > 0 || newItem.hp > 0)) {
            qualityMsgShown = true;
        }
        pushCraftedItemToInventory(recipe, newItem);
    }
    if (qualityMsgShown) {
        addMessage(`✨ Бонус качества +${Math.floor(bonuses.craftQualityBonus * 100)}%!`, 'success');
    }
    addMessage(getCraftSuccessMessage(recipe, count), 'success');
    
    let totalExp = (Number(adjustedExp) || 0) * count;
    prof.exp += totalExp;
    const leveledUp = applyProfessionTierUps(prof);
    if (leveledUp) {
        addMessage(`🎉 ПОВЫШЕНИЕ ТИРА! Профессия → ${prof.tier} тир!`, 'success');
        const newBonuses = getProfessionBonuses(prof.tier);
        addMessage(`📈 Новые бонусы: качество +${Math.floor(newBonuses.craftQualityBonus * 100)}%, экономия +${Math.floor(newBonuses.materialSaveChance * 100)}%`, 'info');
    }
    
    addMessage(`⭐ +${totalExp} XP профессии!`, 'success');
    if (leveledUp) {
        addMessage(`🏆 Теперь у вас ${prof.tier} тир профессии!`, 'success');
    }
    
    // Триггер достижения крафта предмета
    if (typeof onAchievementItemCrafted === 'function') onAchievementItemCrafted();
    
    saveGame();
    pendingCraftData = null;
    
    // Сбрасываем lock и сессию только после успешного завершения
    isCraftingLocked = false;
    activeCraftSession = null;
    sessionFinished = true; // Помечаем как завершённую чтобы избежать повторного вызова
    
    // Удаляем push-уведомление крафта
    removeCraftPushNotification();
    
    // Обновляем счётчик авто-крафта
    if (autoCraftSession && autoCraftSession.profId === profId) {
        autoCraftSession.crafted = (autoCraftSession.crafted || 0) + count;
        tickAutoCraftUi(profId);
        if (autoCraftSession.crafted >= autoCraftSession.maxPerCraft) {
            stopAutoCraftSession('✅ Авто-крафт завершён!');
        } else {
            scheduleAutoCraftContinue(profId, 300);
        }
    }
    
    if (!options.silent) showCraftingRecipes(profId);
}

function showCraftingRecipes(profId) {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('showProfessions', []);
    stopGathering();
    // НЕ останавливаем крафт при переходе в рецепты — продолжаем в фоне
    // stopCraftProgress();
    // if (pendingCraftData) flushPendingCraft();
    
    // Удаляем push-уведомление крафта так как мы в меню крафта
    removeCraftPushNotification();
    
    const allRecipes = getAllRecipesForProfession(profId);
    
    const prof = PROFESSIONS_DB.crafting.find(p => p.id === profId);
    if (!prof) {
        console.error('Профессия не найдена:', profId);
        return;
    }
    
    const profState = player.professions[profId];
    if (profState) {
        normalizeProfessionProf(profState);
        if (applyProfessionTierUps(profState)) {
            saveGame();
            addMessage(`🎉 Профессия повышена до ${profState.tier} тира!`, 'success');
        }
    }
    const currentTier = profState ? profState.tier : 1;
    const exp = profState ? profState.exp : 0;
    const bonuses = getProfessionBonuses(currentTier);
    const expNeeded = getExpForNextTier(currentTier);
    const percent = (expNeeded > 0 && currentTier < 6) ? (exp / expNeeded * 100) : 100;
    
    const classRecipes = allRecipes.filter(r => !r.class || r.class === player.class);
    const availableRecipes = classRecipes.filter(r => {
        const norm = normalizeRecipeForCraft(r);
        return norm.tier <= currentTier;
    });
    const lockedByTierCount = classRecipes.filter(r => normalizeRecipeForCraft(r).tier > currentTier).length;
    
    let html = '<h2>' + prof.icon + ' ' + prof.name + ' — Создание предметов</h2>';
    html += '<div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin-bottom: 15px;">';
    html += '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">';
    html += '<div><span style="color: var(--gold);">⭐</span> Тир профессии: <strong>' + currentTier + '</strong>/6</div>';
    html += '<div><span style="color: var(--gold);">⚔️</span> Ваш класс: <strong>' + player.class + '</strong></div>';
    html += '</div>';
    
    if (currentTier < 6) {
        html += '<div class="progress-bar" style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 10px 0; overflow: hidden;">' +
                '<div style="width:' + percent + '%; height: 100%; background: linear-gradient(90deg, #9b59b6, #8e44ad); transition: width 0.3s;"></div></div>';
        html += '<div style="font-size: 11px;">До ' + (currentTier + 1) + ' тира: ' + Math.floor(exp) + '/' + expNeeded + ' XP</div>';
    } else {
        html += '<div style="color: gold; font-size: 12px; margin: 8px 0;">🏆 МАКСИМАЛЬНЫЙ ТИР! Все бонусы доступны</div>';
    }
    
    html += '<div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">✨ Качество: +' + Math.floor(bonuses.craftQualityBonus * 100) + '%</span>';
    html += '<span style="background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 8px; font-size: 11px;">💎 Экономия: ' + Math.floor(bonuses.materialSaveChance * 100) + '%</span>';
    html += '</div>';
    if (lockedByTierCount > 0) {
        html += '<div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">🔒 Ещё ' + lockedByTierCount
            + ' рецепт(ов) откроются с повышением тира профессии</div>';
    }
    html += '</div>';
    html += '<div id="craftAutoStatus"></div>';
    html += '<div id="craftProgressSlot" class="craft-progress-slot"></div>';
    html += '<p class="craft-progress-hint">Нажмите на рецепт с ✓ — начнётся создание. <strong>Shift+Крафт</strong> или <strong>Ctrl+Крафт</strong> — авто-крафт до указанного количества.</p>';
    
    document.getElementById('dynamicContent').innerHTML = html;
    
    // Восстанавливаем UI прогресса крафта если он активен
    restoreCraftProgressUI();
    
    // Показываем панель авто-крафта если активен
    if (isAutoCraftActiveForProf(profId)) {
        tickAutoCraftUi(profId);
    }
    
    if (availableRecipes.length === 0) {
        html += '<div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; text-align: center;">';
        html += '<p style="color:#e74c3c;">❌ Нет доступных рецептов для вашего класса!</p>';
        html += '<p style="font-size: 12px; color: #aaa;">Эта профессия создаёт предметы для других классов.</p>';
        html += '<p style="font-size: 12px; color: #aaa; margin-top: 10px;">Попробуйте другие профессии:</p>';
        html += '<ul style="text-align: left; font-size: 11px; color: #aaa; margin-top: 5px;">';
        if (player.class === 'Маг') {
            html += '<li>• Портняжное дело 🧥 - создаёт магическое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Свиткотворчество 📜 - создаёт магические свитки</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        } else if (player.class === 'Воин') {
            html += '<li>• Кузнечное дело ⚒️ - создаёт тяжёлое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        } else if (player.class === 'Лучник') {
            html += '<li>• Кожевенное дело 👞 - создаёт лёгкое снаряжение</li>';
            html += '<li>• Ювелирное дело 💍 - создаёт кольца и амулеты</li>';
            html += '<li>• Алхимия ⚗️ - создаёт зелья и эликсиры</li>';
            html += '<li>• Кулинария 🍳 - создаёт еду</li>';
        }
        html += '</ul>';
        html += '</div>';
    } else {
        // Группируем рецепты по типу
        const grouped = {};
        for (const recipe of availableRecipes) {
            const itemType = recipe.type || 'other';
            if (!grouped[itemType]) grouped[itemType] = [];
            grouped[itemType].push(recipe);
        }
        
        const typeNames = {
            'weapon': '⚔️ Оружие',
            'helmet': '⛑️ Шлемы',
            'chest': '🛡️ Нагрудники',
            'pants': '👖 Поножи',
            'boots': '👢 Сапоги',
            'ring': '💍 Кольца',
            'necklace': '📿 Амулеты',
            'stone': '💎 Камни',
            'potion': '🧪 Зелья',
            'mana_potion': '💎 Зелья маны',
            'elixir': '💪 Эликсиры',
            'scroll': '📜 Свитки',
            'battle_scroll': '⚔️ Боевые свитки',
            'food': '🍖 Еда',
            'gather_scroll': '📜 Свитки добычи'
        };
        
        for (const [itemType, recipes] of Object.entries(grouped)) {
            html += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 5px;">${typeNames[itemType] || itemType}</h3>`;
            html += '<div class="resource-grid craft-recipe-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 15px;">';
            
            for (const r of recipes) {
                const norm = normalizeRecipeForCraft(r);
                const blockReason = getCraftBlockReason(norm, profId);
                const canCraft = !blockReason;
                const hasMats = hasRecipeMaterials(norm);
                let cardClass = 'resource-card craft-recipe-card';
                if (canCraft) cardClass += ' craft-recipe-ready';
                else if (hasMats) cardClass += ' craft-recipe-mats';
                else cardClass += ' craft-recipe-locked';

                let previewMatText = '';
                const materials = norm.resources || norm.materials;
                
                if (materials) {
                    for (let mat in materials) {
                        const needed = materials[mat];
                        const has = getPlayerResourceAmount(mat);
                        const ok = has >= needed;
                        previewMatText += `<div style="font-size: 10px; color:${ok ? '#8fd4a0' : '#e74c3c'};">${mat}: ${has}/${needed}</div>`;
                    }
                }
                if (!canCraft && blockReason) {
                    previewMatText += `<div style="font-size: 10px; color: #e74c3c; margin-top: 4px;">🔒 ${blockReason}</div>`;
                }
                
                const rarityColor = getCraftRarityColor(norm.rarity || 'Обычный');
                const rarityLabel = norm.rarity || 'Обычный';
                
                const statsText = getCraftRecipeCombatStatsText(norm);
                const effectText = getCraftRecipeEffectText(norm);
                const tooltipHtml = buildCraftRecipeTooltipHtml(norm);
                
                const safeRecipe = encodeURIComponent(norm.name);
                const blockAttr = blockReason ? encodeURIComponent(blockReason) : '';
                const blockDataAttr = blockReason ? ` data-block-reason="${blockAttr}"` : '';
                const ariaLabel = escapeHtmlText(norm.name + (effectText ? '. ' + effectText.replace(/<[^>]+>/g, '') : ''));
                
                // Рассчитываем максимальное количество для крафта
                const maxCraft = getMaxCraftCount(norm, profId);
                
                html += `<div class="${cardClass}" data-recipe-name="${safeRecipe}"${blockDataAttr} role="button" tabindex="0" aria-label="${ariaLabel}">`;
                html += tooltipHtml;
                html += '<div style="display: flex; gap: 12px;">';
                html += typeof renderItemIconHTML === 'function'
                    ? renderItemIconHTML(norm, { size: 44, fallback: norm.icon || '📦' })
                    : '<div class="item-icon" style="font-size:35px">' + (norm.icon || '📦') + '</div>';
                html += '<div style="flex: 1;">';
                html += `<div style="font-weight: 700; font-size: 14px; color: ${rarityColor};">${norm.name}</div>`;
                html += `<div style="font-size: 10px; color: ${rarityColor}; opacity: 0.9;">${rarityLabel}</div>`;
                if (statsText) html += `<div style="font-size: 11px; color: var(--text-secondary);">${statsText}</div>`;
                else if (effectText) html += `<div class="craft-recipe-effect-preview">${effectText}</div>`;
                html += `<div style="font-size: 10px; margin-top: 5px;">${previewMatText || 'Нет материалов'}</div>`;
                html += `<div style="font-size: 10px; color: var(--gold); margin-top: 4px;">⭐ +${norm.exp || norm.time || 0} XP | 🔓 Тир ${norm.tier}</div>`;
                if (canCraft) {
                    html += '<div class="craft-ready-badge">✓ Можно создать</div>';
                    // Добавляем поле количества только если можно крафтить
                    const maxForRecipe = maxCraft > 0 ? maxCraft : 0;
                    html += `<div class="craft-quantity-row" style="margin-top:8px;display:flex;gap:6px;align-items:center;">`;
                    html += `<label style="font-size:10px;color:var(--text-secondary);">Кол-во:</label>`;
                    html += `<input type="number" class="craft-quantity-input" min="1" max="${maxForRecipe}" value="1" data-recipe-name="${safeRecipe}" data-prof-id="${profId}" style="width:50px;padding:2px 4px;font-size:11px;border-radius:4px;border:1px solid var(--border);background:rgba(0,0,0,0.3);color:var(--text);" onclick="event.stopPropagation()">`;
                    html += `<button type="button" class="action-btn craft-now-btn" data-recipe-name="${safeRecipe}" data-prof-id="${profId}" style="padding:2px 8px;font-size:10px;" onclick="event.stopPropagation();craftWithQuantityFromBtn(this)">🔨 Крафт</button>`;
                    html += `</div>`;
                }
                html += '</div></div></div>';
            }
            html += '</div>';
        }
    }
    
    html += '<button type="button" class="action-btn craft-back-btn ui-nav-back" data-ui-nav-back onclick="showProfessions()" style="margin-top:15px;width:100%; padding: 12px;">↩️ Назад к профессиям</button>';
    document.getElementById('dynamicContent').innerHTML = html;
    bindCraftRecipeGrid(profId);
}

function startAutoCraft(profId, recipeName, maxCount) {
    const allRecipes = getAllRecipesForProfession(profId);
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (!recipe) {
        addMessage(`❌ Рецепт "${recipeName}" не найден!`, 'error');
        return;
    }
    const normRecipe = normalizeRecipeForCraft(recipe);
    const maxPossible = getMaxCraftCount(normRecipe, profId);
    const count = Math.min(maxCount || maxPossible, maxPossible);
    if (count <= 0) {
        addMessage('❌ Недостаточно материалов для крафта!', 'error');
        return;
    }
    autoCraftSession = {
        profId,
        recipeName,
        normRecipe,
        maxPerCraft: count,
        crafted: 0,
        stopOnLowMat: true
    };
    addMessage(`🔨 Авто-крафт: ${recipeName} ×${count}`, 'success');
    showCraftingRecipes(profId);
    scheduleAutoCraftContinue(profId, 400);
}

function scheduleAutoCraftContinue(profId, delayMs) {
    const delay = delayMs == null ? 350 : delayMs;
    setTimeout(() => {
        if (!autoCraftSession || autoCraftSession.profId !== profId) {
            showCraftingRecipes(profId);
            return;
        }
        if (!document.querySelector('.craft-recipe-grid')) return;
        const { normRecipe, maxPerCraft, crafted } = autoCraftSession;
        if (crafted >= maxPerCraft) {
            stopAutoCraftSession('✅ Авто-крафт завершён!');
            showCraftingRecipes(profId);
            return;
        }
        const maxPossible = getMaxCraftCount(normRecipe, profId);
        if (maxPossible <= 0) {
            stopAutoCraftSession('❌ Недостаточно материалов для продолжения.');
            showCraftingRecipes(profId);
            return;
        }
        startCraftProgress(profId, normRecipe.name, null, 1);
    }, delay);
}

function craftWithQuantityFromBtn(btn) {
    const recipeName = decodeURIComponent(btn.getAttribute('data-recipe-name'));
    const profId = btn.getAttribute('data-prof-id');
    const input = document.querySelector(`.craft-quantity-input[data-recipe-name="${btn.getAttribute('data-recipe-name')}"]`);
    let craftCount = input ? parseInt(input.value, 10) : 1;
    if (!Number.isFinite(craftCount) || craftCount < 1) craftCount = 1;
    // Если зажали Shift или Ctrl — запускаем авто-крафт
    if (window.event && (window.event.shiftKey || window.event.ctrlKey)) {
        startAutoCraft(profId, recipeName, craftCount);
    } else {
        startCraftProgress(profId, recipeName, null, craftCount);
    }
}

function startCraftWithQuantity(recipeNameEncoded, profId) {
    const input = document.querySelector(`.craft-quantity-input[data-recipe-name="${recipeNameEncoded}"]`);
    let craftCount = input ? parseInt(input.value, 10) : 1;
    if (!Number.isFinite(craftCount) || craftCount < 1) craftCount = 1;
    
    const recipeName = decodeURIComponent(recipeNameEncoded);
    startCraftProgress(profId, recipeName, null, craftCount);
}

function startCraftProgress(profId, recipeName, cardEl, craftCount) {
    // Разрешаем крафт в фоне даже если UI заблокирован
    // if (isCraftingLocked) {
    //     addMessage('⏳ Дождитесь окончания текущего крафта.', 'error');
    //     return;
    // }
    // Проверяем только activeCraftSession — если есть активная сессия, завершаем её перед новым крафтом
    if (activeCraftSession) {
        // Если крафт уже идёт в фоне, завершаем его перед новым
        finishCraftProgress(activeCraftSession);
    }
    if (pendingCraftData) flushPendingCraft();

    // Сбрасываем флаг завершённости для новой сессии
    sessionFinished = false;

    const allRecipes = getAllRecipesForProfession(profId);
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (!recipe) {
        addMessage(`❌ Рецепт "${recipeName}" не найден!`, 'error');
        return;
    }
    const normRecipe = normalizeRecipeForCraft(recipe);
    const prof = player.professions[profId];
    if (!prof) {
        addMessage('❌ Профессия не изучена!', 'error');
        return;
    }
    normalizeProfessionProf(prof);
    applyProfessionTierUps(prof);
    const bonuses = getProfessionBonuses(prof.tier);

    // Количество по умолчанию = 1
    const count = Math.max(1, parseInt(craftCount, 10) || 1);
    
    // Проверяем блок-причины для указанного количества
    const blockReason = getCraftBlockReason(normRecipe, profId, count);
    if (blockReason) {
        addMessage(`❌ ${blockReason}`, 'error');
        return;
    }

    const materials = normRecipe.resources || normRecipe.materials;
    if (!materials) {
        addMessage(`❌ У рецепта "${normRecipe.name}" нет материалов!`, 'error');
        return;
    }

    const baseSec = normRecipe.time || normRecipe.exp || 5;
    // ПРЕД 8 fix: обычные предметы крафтятся в 3 раза дольше; Древние/Божественные — без изменений (300/600 с)
    const isSpecial = normRecipe.rarity === 'Древний' || normRecipe.rarity === 'Божественный';
    const scaledBase = isSpecial ? baseSec : Math.floor(baseSec * 3);
    const adjustedTime = Math.max(2, Math.floor(scaledBase * (1 - bonuses.gatherSpeedBonus)));
    const perExp = normRecipe.exp || normRecipe.time || 0;
    // Масштабируем материалы на количество
    const scaledMaterials = scaleRecipeMaterials(materials, count);

    const slot = document.getElementById('craftProgressSlot');
    if (!slot) {
        // Нет UI — крафтим сразу в фоне
        finishCraftProgress({
            profId,
            normRecipe,
            adjustedExp: perExp,
            bonuses,
            scaledMaterials,
            batchCount: count
        });
        return;
    }

    // НЕ останавливаем предыдущий прогресс — крафт продолжается в фоне
    // stopCraftProgress();
    isCraftingLocked = true;
    if (typeof document.querySelector === 'function') {
        const grid = document.querySelector('.craft-recipe-grid');
        if (grid) grid.classList.add('craft-grid-locked');
    }
    if (cardEl) cardEl.classList.add('craft-recipe-crafting');

    activeCraftSession = {
        profId,
        normRecipe,
        adjustedExp: perExp,
        bonuses,
        scaledMaterials,
        batchCount: count
    };

    const iconHtml = typeof renderItemIconHTML === 'function'
        ? renderItemIconHTML(normRecipe, { size: 32, fallback: normRecipe.icon || '📦' })
        : (normRecipe.icon || '📦');

    const quantityLabel = count > 1 ? ` ×${count}` : '';
    slot.innerHTML = `
        <div class="crafting-progress craft-active" id="craftProgressPanel">
            <div class="craft-progress-header">
                <span class="craft-progress-icon">${iconHtml}</span>
                <strong>🔨 Создание: ${normRecipe.name}${quantityLabel}</strong>
                <span id="craftPercent">0%</span>
            </div>
            <div class="crafting-bar">
                <div class="crafting-fill" id="craftFill"></div>
            </div>
            <div class="craft-progress-hint-detail">
                ⚡ −${Math.floor(bonuses.gatherSpeedBonus * 100)}% времени · ✨ +${Math.floor(bonuses.craftQualityBonus * 100)}% качества · 📦 ×${count}
            </div>
        </div>
    `;
    scrollCraftProgressIntoView();

    const totalTime = adjustedTime * 1000;
    const startTime = performance.now();

    // Сохраняем время для восстановления UI
    window.craftStartTime = startTime;
    window.craftTotalTime = totalTime;
    
    // Показываем push-уведомление если игрок не в меню крафта
    const slot = document.getElementById('craftProgressSlot');
    if (!slot) {
        showCraftPushNotification(normRecipe.name, count, 0);
    }

    const tick = (now) => {
        // Проверяем только activeCraftSession — isCraftingLocked может быть false если UI закрыт
        if (!activeCraftSession) return;
        // Если сессия уже завершена — прекращаем
        if (sessionFinished) return;

        const elapsed = now - window.craftStartTime;
        const percent = Math.min(100, Math.floor(elapsed / window.craftTotalTime * 100));
        const fill = document.getElementById('craftFill');
        const percentEl = document.getElementById('craftPercent');
        if (fill) fill.style.width = percent + '%';
        if (percentEl) percentEl.textContent = percent + '%';

        // Обновляем push-уведомление если есть
        updateCraftPushNotification(percent);

        if (percent < 100) {
            craftProgressRafId = requestAnimationFrame(tick);
            return;
        }

        // Крафт завершён — помечаем сессию как завершённую чтобы избежать дублирования
        sessionFinished = true;
        craftProgressRafId = null;
        const panel = document.getElementById('craftProgressPanel');
        if (panel) panel.classList.add('craft-complete');
        finishCraftProgress(activeCraftSession);
    };

    craftProgressRafId = requestAnimationFrame(tick);
}

function prepareCraft(profId, recipeName) {
    startCraftProgress(profId, recipeName, null);
}

window.getCraftRarityColor = getCraftRarityColor;
window.normalizeRecipeForCraft = normalizeRecipeForCraft;
window.getCraftBlockReason = getCraftBlockReason;
window.getProfessionLearnBlockReason = getProfessionLearnBlockReason;
window.getResourcesAtLocationForProfession = getResourcesAtLocationForProfession;
window.getGatherableResourceDefsAtLocation = getGatherableResourceDefsAtLocation;
window.renderGatherProfessionIconsHtml = renderGatherProfessionIconsHtml;
window.getAdjustedGatherExpForResource = getAdjustedGatherExpForResource;
window.formatLocationResourcesHint = formatLocationResourcesHint;
window.getMaxCraftCount = getMaxCraftCount;
window.scaleRecipeMaterials = scaleRecipeMaterials;
window.startCraftProgress = startCraftProgress;
window.startCraftWithQuantity = startCraftWithQuantity;
window.startAutoCraft = startAutoCraft;
window.stopAutoCraftSession = stopAutoCraftSession;
window.prepareCraft = prepareCraft;
window.showCraftingRecipes = showCraftingRecipes;
window.restoreCraftProgressUI = restoreCraftProgressUI;
window.showCraftPushNotification = showCraftPushNotification;
window.updateCraftPushNotification = updateCraftPushNotification;
window.removeCraftPushNotification = removeCraftPushNotification;
