// wheelOfFortune.js — Колесо Фортуны (логика + UI)
// ==================================================
// Время: локальное MSK (Date.now + 3ч). Серверная синхронизация не требуется —
// искажать localStorage время бессмысленно, т.к. кулдаун 1 час.

var _wheelSyncInterval = null;

function wheelGetCurrentMskTime() {
    return Date.now() + 3 * 60 * 60 * 1000; // UTC+3
}

// ─── Состояние колеса ───

function wheelInitState() {
    if (!player.wheelOfFortune) {
        player.wheelOfFortune = {
            lastSpinTime: null,
            serverTimeSync: null,
            spinsToday: 0
        };
    }
    // Проверка: если lastSpinTime устарел (старше 24ч), сброс spinsToday
    if (player.wheelOfFortune.lastSpinTime) {
        var now = wheelGetCurrentMskTime();
        var last = player.wheelOfFortune.lastSpinTime;
        var day = 24 * 60 * 60 * 1000;
        if (now - last > day) {
            player.wheelOfFortune.spinsToday = 0;
        }
    }
}

function wheelCanSpin() {
    wheelInitState();
    var state = player.wheelOfFortune;
    if (!state.lastSpinTime) return true;
    var now = wheelGetCurrentMskTime();
    var cooldown = (FORTUNE_WHEEL_PRIZES.cooldownHours || 1) * 60 * 60 * 1000;
    return (now - state.lastSpinTime) >= cooldown;
}

function wheelGetTimeLeft() {
    var state = player.wheelOfFortune;
    if (!state || !state.lastSpinTime) return 0;
    var now = wheelGetCurrentMskTime();
    var cooldown = (FORTUNE_WHEEL_PRIZES.cooldownHours || 1) * 60 * 60 * 1000;
    var elapsed = now - state.lastSpinTime;
    return Math.max(0, Math.floor((cooldown - elapsed) / 1000));
}

function wheelRecordSpin() {
    var now = wheelGetCurrentMskTime();
    player.wheelOfFortune.lastSpinTime = now;
    player.wheelOfFortune.serverTimeSync = now;
    player.wheelOfFortune.spinsToday = (player.wheelOfFortune.spinsToday || 0) + 1;
    saveGame();
}

// ─── Определение призов ───

function wheelGetLevelRange() {
    var lvl = player.level;
    if (lvl <= 10) return '1-10';
    if (lvl <= 20) return '11-20';
    if (lvl <= 30) return '21-30';
    if (lvl <= 40) return '31-40';
    return '41-50+';
}

function wheelPickGoldPrize() {
    var range = wheelGetLevelRange();
    var golds = FORTUNE_WHEEL_PRIZES.goldByLevel[range];
    if (!golds || golds.length === 0) return 10;
    return golds[Math.floor(Math.random() * golds.length)];
}

// ─── Форматирование описания предмета ───

function wheelSlotToRusName(slot) {
    var names = {
        'weapon': '⚔️ Оружие',
        'helmet': '⛑️ Шлем',
        'chest': '🛡️ Броня',
        'pants': '👖 Поножи',
        'boots': '👢 Сапоги',
        'consumable': '🧪 Расходник',
        'ring': '💍 Кольцо',
        'necklace': '📿 Ожерелье'
    };
    return names[slot] || '📦 Предмет';
}

function wheelFormatItemStats(item) {
    if (!item) return '';
    var lines = [];
    if (item.dmg) lines.push('⚔️ +' + item.dmg + ' к атаке');
    if (item.def) lines.push('🛡️ +' + item.def + ' к защите');
    if (item.hp) lines.push('❤️ +' + item.hp + ' к здоровью');
    if (item.mana) lines.push('💎 +' + item.mana + ' к мане');
    if (item.crit) lines.push('💥 +' + item.crit + '% крит. шанса');
    if (item.critDmg) lines.push('⭐ +' + item.critDmg + '% крит. урона');
    if (item.dodge) lines.push('💨 +' + item.dodge + '% уклонения');
    if (item.heal) lines.push('💚 Восстанавливает ' + item.heal + ' HP');
    if (lines.length === 0) return '<p style="color:var(--text-muted);font-size:11px;margin-top:8px;">Нет бонусов</p>';
    return '<div style="margin-top:10px;font-size:12px;color:var(--text-secondary);">' + lines.join('<br>') + '</div>';
}

function wheelFormatItemStatsText(item) {
    if (!item) return '';
    var parts = [];
    if (item.dmg) parts.push('атака +' + item.dmg);
    if (item.def) parts.push('защита +' + item.def);
    if (item.hp) parts.push('здоровье +' + item.hp);
    if (item.mana) parts.push('мана +' + item.mana);
    if (item.crit) parts.push('крит +' + item.crit + '%');
    if (item.critDmg) parts.push('крит.урон +' + item.critDmg + '%');
    if (item.dodge) parts.push('уклонение +' + item.dodge + '%');
    if (item.heal) parts.push('лечение ' + item.heal + ' HP');
    if (parts.length === 0) return 'без бонусов';
    return parts.join(', ');
}

// ─── Выбор из пула с процентами ───

function wheelPickFromPool(pool) {
    // Выбирает предмет из пула с учётом процентов (chance)
    // pool = [{ name, slot, chance }, ...]
    if (!pool || pool.length === 0) return null;
    var roll = Math.random() * 100;
    var cumulative = 0;
    for (var i = 0; i < pool.length; i++) {
        cumulative += pool[i].chance;
        if (roll < cumulative) {
            return {
                name: pool[i].name,
                slot: pool[i].slot
            };
        }
    }
    // На случай погрешности округления — возвращаем последний
    return { name: pool[pool.length - 1].name, slot: pool[pool.length - 1].slot };
}

function wheelPickItemPrize() {
    var range = wheelGetLevelRange();
    var pools = ITEM_POOLS[range];
    if (!pools) return null;

    // Выбираем случайный пул (1 из 3)
    var poolNames = ['pool1', 'pool2', 'pool3'];
    var poolName = poolNames[Math.floor(Math.random() * poolNames.length)];
    var pool = pools[poolName];
    if (!pool || pool.length === 0) return null;

    // Выбираем предмет из пула с учётом процентов
    var picked = wheelPickFromPool(pool);
    if (!picked) return null;

    return wheelFindItemInDb(picked.name, picked.slot);
}

function wheelFindItemInDb(itemName, slot) {
    // Поиск предмета в EQUIPMENT_DB по имени и слоту
    if (!window.EQUIPMENT_DB) return null;

    if (slot === 'weapon') {
        // Ищем по ВСЕМ классам, т.к. пулы содержат оружие для Воина/Мага/Лучника
        var classKeys = Object.keys(EQUIPMENT_DB.weapons);
        for (var ck = 0; ck < classKeys.length; ck++) {
            var weapons = EQUIPMENT_DB.weapons[classKeys[ck]];
            for (var i = 0; i < weapons.length; i++) {
                if (weapons[i].name === itemName) return JSON.parse(JSON.stringify(weapons[i]));
            }
        }
    } else if (slot === 'helmet' || slot === 'chest' || slot === 'pants' || slot === 'boots') {
        var armor = EQUIPMENT_DB.armor[slot];
        if (armor) {
            for (var i = 0; i < armor.length; i++) {
                if (armor[i].name === itemName) return JSON.parse(JSON.stringify(armor[i]));
            }
        }
    }
    // Для consumable — создаём простой предмет
    if (slot === 'consumable') {
        var consumables = {
            'Зелье здоровья': { name: 'Зелье здоровья', slot: 'consumable', heal: 50, rarity: 'Обычный' },
            'Малое зелье здоровья': { name: 'Малое зелье здоровья', slot: 'consumable', heal: 25, rarity: 'Обычный' },
            'Большое зелье здоровья': { name: 'Большое зелье здоровья', slot: 'consumable', heal: 100, rarity: 'Необычный' },
            'Малое зелье маны': { name: 'Малое зелье маны', slot: 'consumable', mana: 25, rarity: 'Обычный' },
            'Зелье маны': { name: 'Зелье маны', slot: 'consumable', mana: 50, rarity: 'Обычный' },
            'Большое зелье маны': { name: 'Большое зелье маны', slot: 'consumable', mana: 100, rarity: 'Необычный' },
            'Эликсир силы': { name: 'Эликсир силы', slot: 'consumable', dmg: 10, rarity: 'Редкий' },
            'Эликсир защиты': { name: 'Эликсир защиты', slot: 'consumable', def: 10, rarity: 'Редкий' },
            'Эликсир неуязвимости': { name: 'Эликсир неуязвимости', slot: 'consumable', def: 25, rarity: 'Эпический' },
            'Эликсир берсерка': { name: 'Эликсир берсерка', slot: 'consumable', dmg: 20, rarity: 'Эпический' },
            'Божественный эликсир': { name: 'Божественный эликсир', slot: 'consumable', dmg: 30, def: 30, rarity: 'Мифический' }
        };
        if (consumables[itemName]) return JSON.parse(JSON.stringify(consumables[itemName]));
    }
    return null;
}

function wheelGetRarePrize() {
    var name = FORTUNE_WHEEL_PRIZES.rareItem[player.class];
    if (!name) return null;
    return wheelFindItemInDb(name, 'weapon');
}

// ─── Проверка процентов в пулах (для отладки) ───

function wheelValidatePools() {
    if (typeof ITEM_POOLS === 'undefined') {
        console.warn('⚠️ ITEM_POOLS не загружен');
        return;
    }
    var allOk = true;
    for (var range in ITEM_POOLS) {
        var pools = ITEM_POOLS[range];
        for (var pName in pools) {
            var pool = pools[pName];
            var sum = 0;
            for (var i = 0; i < pool.length; i++) {
                sum += pool[i].chance;
            }
            if (Math.abs(sum - 100) > 0.01) {
                console.error('❌ ' + range + ' ' + pName + ': сумма = ' + sum + ' (должна быть 100)');
                allOk = false;
            }
        }
    }
    if (allOk) console.log('✅ Все пулы ITEM_POOLS валидны (сумма chance = 100)');
    return allOk;
}

// ─── Выдача приза ───

function wheelAwardPrize(segmentIndex) {
    // segmentIndex 0-7:
    // 0 = джекпот (редкий предмет)
    // 1-4 = золото (4 сектора)
    // 5-7 = предмет (3 сектора)

    if (segmentIndex === 0) {
        // Джекпот: редкий предмет с шансом 2%, иначе золото x1.5
        if (Math.random() < FORTUNE_WHEEL_PRIZES.rareItemChance) {
            var rareItem = wheelGetRarePrize();
            if (rareItem) {
                wheelGiveItemToPlayer(rareItem);
                addMessage('💎 ДЖЕКПОТ! ' + rareItem.name + ' (' + FORTUNE_WHEEL_PRIZES.itemRarity + ') — ' + wheelFormatItemStatsText(rareItem), 'success');
                return { type: 'item', item: rareItem, jackpot: true };
            }
        }
        // Утешительный приз: золото x1.5
        var consolationGold = Math.floor(wheelPickGoldPrize() * FORTUNE_WHEEL_PRIZES.consolationMultiplier);
        player.gold += consolationGold;
        addMessage('🎡 Колесо Фортуны: +' + consolationGold + ' золота (утешительный приз)!', 'info');
        saveGame();
        return { type: 'gold', amount: consolationGold, jackpot: false };
    }

    if (segmentIndex >= 1 && segmentIndex <= 4) {
        // Золото
        var gold = wheelPickGoldPrize();
        player.gold += gold;
        addMessage('🎡 Колесо Фортуны: +' + gold + ' золота!', 'success');
        saveGame();
        return { type: 'gold', amount: gold, jackpot: false };
    }

    if (segmentIndex >= 5 && segmentIndex <= 7) {
        // Предмет
        var item = wheelPickItemPrize();
        if (item) {
            wheelGiveItemToPlayer(item);
            addMessage('🎡 Колесо Фортуны: ' + item.name + ' (' + (item.rarity || 'Обычный') + ') — ' + wheelFormatItemStatsText(item), 'success');
            return { type: 'item', item: item, jackpot: false };
        }
        // Если предмет не найден — золото
        var fallbackGold = Math.floor(wheelPickGoldPrize() * FORTUNE_WHEEL_PRIZES.fallbackMultiplier);
        player.gold += fallbackGold;
        addMessage('🎡 Колесо Фортуны: +' + fallbackGold + ' золота!', 'info');
        saveGame();
        return { type: 'gold', amount: fallbackGold, jackpot: false };
    }

    // fallback
    var fGold = Math.floor(wheelPickGoldPrize() * FORTUNE_WHEEL_PRIZES.fallbackMultiplier);
    player.gold += fGold;
    saveGame();
    return { type: 'gold', amount: fGold, jackpot: false };
}

function wheelGiveItemToPlayer(item) {
    if (!item) return;

    // Добавляем sellPrice если нет
    if (!item.sellPrice && typeof getItemSellPrice === 'function') {
        item.sellPrice = getItemSellPrice(item);
    }

    // Расходники — в potions
    if (item.slot === 'consumable' || item.type === 'consumable') {
        if (!player.inventory.potions) player.inventory.potions = [];
        player.inventory.potions.push(item);
        saveGame();
        return;
    }

    // Определяем тип предмета
    var slot = wheelDetectItemSlot(item);

    // Если слот не определён — фолбэк с сообщением
    if (!slot) {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(item);
        saveGame();
        return;
    }

    if (slot === 'weapon') {
        if (!player.inventory.weapons) player.inventory.weapons = [];
        player.inventory.weapons.push(item);
    } else if (slot === 'helmet') {
        if (!player.inventory.helmets) player.inventory.helmets = [];
        player.inventory.helmets.push(item);
    } else if (slot === 'chest') {
        if (!player.inventory.chests) player.inventory.chests = [];
        player.inventory.chests.push(item);
    } else if (slot === 'pants') {
        if (!player.inventory.pants) player.inventory.pants = [];
        player.inventory.pants.push(item);
    } else if (slot === 'boots') {
        if (!player.inventory.boots) player.inventory.boots = [];
        player.inventory.boots.push(item);
    }
    saveGame();
}

function wheelDetectItemSlot(item) {
    if (!item) return null;
    // Проверка по полю, если есть
    if (item.slot) return item.slot;
    // Проверка по названию
    var name = (item.name || '').toLowerCase();
    if (name.includes('меч') || name.includes('топор') || name.includes('клинок') ||
        name.includes('молот') || name.includes('посох') || name.includes('скипетр') ||
        name.includes('жезл') || name.includes('лук') || name.includes('арбалет')) {
        return 'weapon';
    }
    if (name.includes('шлем') || name.includes('корона')) return 'helmet';
    if (name.includes('нагрудник') || name.includes('броня') || name.includes('доспех') ||
        name.includes('кираса') || name.includes('панцирь')) return 'chest';
    if (name.includes('понож') || name.includes('набедрен')) return 'pants';
    if (name.includes('сапог') || name.includes('сандал') || name.includes('башмак')) return 'boots';
    return null;
}

// ─── Анимация вращения ───
// TARGET_ANGLES: для каждого сегмента (0-7) — угол, на который надо повернуть,
// чтобы указатель (сверху) указывал на этот сегмент.
var WHEEL_TARGET_ANGLES = [337.5, 292.5, 247.5, 202.5, 157.5, 112.5, 67.5, 22.5];
var _wheelRotation = 0;
var _isSpinning = false;

function spinWheelAnimation(targetIndex, callback) {
    var wheel = document.getElementById('wheel');
    if (!wheel) return;

    // 5-8 полных оборотов для зрелищности
    var extraSpins = 5 + Math.floor(Math.random() * 4);
    var targetRotation = extraSpins * 360 + WHEEL_TARGET_ANGLES[targetIndex];

    while (targetRotation <= _wheelRotation) {
        targetRotation += 360;
    }
    _wheelRotation = targetRotation;

    wheel.classList.add('wheel--spinning');
    wheel.style.transition = 'none';
    void wheel.offsetWidth; // force reflow
    // Длительное вращение с замедлением: 5 секунд
    wheel.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = 'rotate(' + targetRotation + 'deg)';

    var settled = false;
    function finish() {
        if (settled) return;
        settled = true;
        wheel.classList.remove('wheel--spinning');
        wheel.removeEventListener('transitionend', finish);
        if (typeof callback === 'function') callback();
    }

    // Основной триггер — окончание CSS transition (колесо реально остановилось)
    wheel.addEventListener('transitionend', finish);
    // Страховка на случай, если transitionend не сработал
    setTimeout(finish, 6000);
}

// ─── Партиклы ───

function createWheelParticles() {
    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
    document.body.appendChild(container);

    var colors = ['#e8b84a', '#f59e42', '#a78bfa', '#fff'];
    for (var i = 0; i < 30; i++) {
        var p = document.createElement('div');
        var size = 4 + Math.random() * 8;
        var color = colors[Math.floor(Math.random() * colors.length)];
        var angle = Math.random() * Math.PI * 2;
        var velocity = 100 + Math.random() * 300;
        var tx = Math.cos(angle) * velocity;
        var ty = Math.sin(angle) * velocity;

        p.style.cssText = 'position:absolute;left:50%;top:50%;'
            + 'width:' + size + 'px;height:' + size + 'px;'
            + 'background:' + color + ';border-radius:50%;'
            + 'box-shadow:0 0 8px ' + color + ';'
            + 'animation:wheelParticleFade 1.2s ease-out forwards;'
            + '--tx:' + tx + 'px;--ty:' + ty + 'px;';
        container.appendChild(p);
    }

    setTimeout(function () { container.remove(); }, 1500);
}

// ─── UI: отображение колеса ───

var WHEEL_SEGMENTS = [
    { icon: '💎', name: 'Джекпот',  color: '#e8b84a' },
    { icon: '🪙', name: 'Золото',   color: '#f59e42' },
    { icon: '💰', name: 'Золото',   color: '#f0c040' },
    { icon: '🪙', name: 'Золото',   color: '#d4a030' },
    { icon: '💰', name: 'Золото',   color: '#e8a030' },
    { icon: '⚔️', name: 'Предмет',  color: '#4da6ff' },
    { icon: '🛡️', name: 'Предмет',  color: '#5db0ff' },
    { icon: '👑', name: 'Предмет',  color: '#6dbaff' }
];

function showWheelOfFortune() {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen('renderGame', []);
    if (typeof stopGathering === 'function') stopGathering();

    // Рендерим колесо сразу, не ждём сервер
    wheelRenderWheel();
    wheelInitState();
    wheelUpdateUiState();

    // Валидация пулов (лог в консоль)
    wheelValidatePools();

    // Таймер обновления UI каждую секунду
    if (_wheelSyncInterval) clearInterval(_wheelSyncInterval);
    _wheelSyncInterval = setInterval(function() {
        wheelUpdateUiState();
    }, 1000);
}

function wheelRenderWheel() {
    var segDeg = 45;
    var stops = [];
    for (var i = 0; i < WHEEL_SEGMENTS.length; i++) {
        stops.push(WHEEL_SEGMENTS[i].color + ' ' + (i * segDeg) + 'deg ' + ((i + 1) * segDeg) + 'deg');
    }
    var gradient = 'conic-gradient(from 0deg, ' + stops.join(', ') + ')';

    var labelsHtml = '';
    for (var i = 0; i < WHEEL_SEGMENTS.length; i++) {
        var angleRad = ((i * 45 + 22.5) * Math.PI) / 180;
        var r = 36;
        var x = 50 + r * Math.sin(angleRad);
        var y = 50 - r * Math.cos(angleRad);
        labelsHtml += '<div class="wheel__label" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%">'
            + '<div class="wheel__label-icon">' + WHEEL_SEGMENTS[i].icon + '</div>'
            + '<div class="wheel__label-name">' + WHEEL_SEGMENTS[i].name + '</div>'
            + '</div>';
    }

    var dividersHtml = '';
    for (var i = 0; i < WHEEL_SEGMENTS.length; i++) {
        dividersHtml += '<div class="wheel__divider" style="transform:rotate(' + (i * 45) + 'deg)"></div>';
    }

    var html = ''
        + '<h2 style="text-align:center;margin-bottom:4px;">🎡 Колесо Фортуны</h2>'
        + '<p style="text-align:center;color:var(--text-secondary);font-size:12px;margin-bottom:16px;line-height:1.4;">Испытай удачу!<br>Крути колесо и получай награды.<br><span style="font-size:10px;color:var(--gold);">Доступна 1 крутка в час</span></p>'
        + '<div class="wheel-of-fortune">'
        +   '<div class="wheel-container">'
        +     '<div class="wheel" id="wheel">'
        +       '<div class="wheel__pointer">◆</div>'
        +       '<div class="wheel__bg" style="background:' + gradient + '"></div>'
        +       dividersHtml
        +       '<div class="wheel__labels-area">' + labelsHtml + '</div>'
        +       '<button class="wheel__center-btn" id="wheelSpinBtn" onclick="wheelSpin()">🎡<br>Крутить!</button>'
        +     '</div>'
        +     '<div class="wheel__timer" id="wheelTimer">⏱️ Синхронизация...</div>'
        +   '</div>'
        + '</div>'
        + wheelRenderPrizesInfo()
        + '<div style="text-align:center;margin-top:12px;">'
        +   '<button class="action-btn" onclick="wheelCleanup();renderGame()" style="padding:8px 24px;">↩️ Назад</button>'
        + '</div>';

    document.getElementById('dynamicContent').innerHTML = html;
    _wheelRotation = 0;
    _isSpinning = false;
    window._wheelSegments = WHEEL_SEGMENTS;
}

function wheelRenderPrizesInfo() {
    var range = wheelGetLevelRange();
    var html = '<div class="wheel-prizes-info" style="margin:16px auto;max-width:580px;">';

    // Заголовок
    html += '<h3 style="text-align:center;margin-bottom:12px;color:var(--gold);">🎁 Возможные призы (уровни ' + range + ')</h3>';

    // Золото
    var golds = FORTUNE_WHEEL_PRIZES.goldByLevel[range] || ['—'];
    html += '<div class="wheel-prizes-section" style="margin-bottom:12px;padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:10px;">'
        + '<h4 style="margin:0 0 8px;font-size:14px;color:var(--gold);">💰 Золото (4 из 8 секторов)</h4>'
        + '<p style="margin:0;font-size:12px;color:var(--text-secondary);">Суммы: ';
    for (var g = 0; g < golds.length; g++) {
        html += '<span style="color:var(--gold-light);font-weight:600;">+' + golds[g] + '</span>';
        if (g < golds.length - 1) html += ', ';
    }
    html += '</p></div>';

    // Пулы предметов
    var pools = ITEM_POOLS[range];
    if (pools) {
        html += '<h4 style="margin:0 0 8px;font-size:14px;color:#4da6ff;text-align:center;">🎲 Предметы (3 из 8 секторов)</h4>'
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">';

        var poolNames = ['pool1', 'pool2', 'pool3'];
        var poolLabels = ['Пул 1', 'Пул 2', 'Пул 3'];
        for (var pi = 0; pi < poolNames.length; pi++) {
            var pool = pools[poolNames[pi]];
            html += '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:10px;font-size:11px;">'
                + '<div style="font-weight:600;margin-bottom:6px;color:var(--text-primary);">' + poolLabels[pi] + '</div>';
            if (pool) {
                for (var pi2 = 0; pi2 < pool.length; pi2++) {
                    var entry = pool[pi2];
                    var eColor = typeof RARITY_COLORS !== 'undefined' ? wheelRarityColor(entry.name, entry.slot) : '#ccc';
                    html += '<div style="display:flex;justify-content:space-between;padding:2px 0;">'
                        + '<span style="color:' + eColor + ';">' + entry.name + '</span>'
                        + '<span style="color:var(--text-muted);">' + entry.chance + '%</span>'
                        + '</div>';
                }
            }
            html += '</div>';
        }
        html += '</div>';
    }

    // Джекпот
    var rareName = FORTUNE_WHEEL_PRIZES.rareItem[player.class];
    var rareColor = typeof RARITY_COLORS !== 'undefined' ? (RARITY_COLORS[FORTUNE_WHEEL_PRIZES.itemRarity] || '#e8b84a') : '#e8b84a';
    html += '<div class="wheel-prizes-section" style="padding:10px 14px;background:rgba(0,0,0,0.2);border-radius:10px;text-align:center;">'
        + '<h4 style="margin:0 0 4px;font-size:14px;color:var(--gold);">💎 Джекпот (1 из 8 секторов)</h4>'
        + '<p style="margin:0;font-size:12px;"><span style="color:' + rareColor + ';font-weight:600;">' + (rareName || '—') + '</span>'
        + ' <span style="color:var(--text-muted);">— шанс 2%</span></p>'
        + '<p style="margin:4px 0 0;font-size:10px;color:var(--text-muted);">Если джекпот не выпал — золото ×1.5</p>'
        + '</div>';

    html += '</div>';
    return html;
}

function wheelRarityColor(itemName, slot) {
    // Ищем предмет в EQUIPMENT_DB и возвращаем цвет его редкости
    if (!window.EQUIPMENT_DB || !window.RARITY_COLORS) return '#ccc';
    var item = null;
    if (slot === 'weapon') {
        var weps = EQUIPMENT_DB.weapons[player.class];
        if (weps) for (var i = 0; i < weps.length; i++) { if (weps[i].name === itemName) { item = weps[i]; break; } }
    } else if (slot === 'helmet' || slot === 'chest' || slot === 'pants' || slot === 'boots') {
        var armors = EQUIPMENT_DB.armor[slot];
        if (armors) for (var i = 0; i < armors.length; i++) { if (armors[i].name === itemName) { item = armors[i]; break; } }
    }
    if (item && item.rarity && RARITY_COLORS[item.rarity]) return RARITY_COLORS[item.rarity];
    return '#ccc';
}

function wheelUpdateUiState() {
    var wheel = document.getElementById('wheel');
    var btn = document.getElementById('wheelSpinBtn');
    var timer = document.getElementById('wheelTimer');
    if (!timer) return;

    wheelInitState();
    var canSpin = wheelCanSpin();
    var timeLeft = wheelGetTimeLeft();

    if (canSpin && !_isSpinning) {
        timer.textContent = '🎡 Готово! Крути колесо!';
        timer.className = 'wheel__timer wheel__timer--ready';
        if (wheel) wheel.classList.remove('wheel--dimmed');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🎡<br>Крутить!';
        }
    } else if (!_isSpinning) {
        var mins = Math.floor(timeLeft / 60);
        var secs = Math.floor(timeLeft % 60);
        if (mins > 0) {
            timer.textContent = '⏱️ Осталось: ' + mins + ' мин ' + secs + ' сек';
        } else {
            timer.textContent = '⏱️ Осталось: ' + secs + ' сек';
        }
        timer.className = 'wheel__timer';
        if (wheel) wheel.classList.add('wheel--dimmed');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳<br>Ждите';
        }
    }
}

function wheelSpin() {
    if (_isSpinning) return;
    var btn = document.getElementById('wheelSpinBtn');
    if (!btn || btn.disabled) return;

    if (!wheelCanSpin()) {
        addMessage('⏳ Колесо ещё не готово! Подождите.', 'warning');
        return;
    }

    _isSpinning = true;
    btn.innerHTML = '🌀<br>Вращается...';
    btn.disabled = true;

    // Выбираем случайный сегмент (0-7)
    var targetIndex = Math.floor(Math.random() * 8);

    spinWheelAnimation(targetIndex, function() {
        _isSpinning = false;

        // Записываем крутку
        wheelRecordSpin();

        // Выдаём приз
        var result = wheelAwardPrize(targetIndex);

        // Показываем результат
        var seg = WHEEL_SEGMENTS[targetIndex];
        var segName = seg ? seg.name : 'Приз';

        var wheelEl = document.getElementById('wheel');
        if (wheelEl) wheelEl.classList.add('wheel--result');
        createWheelParticles();

        var modalTitle = '🎡 Колесо Фортуны';
        var modalIcon = result.jackpot ? '💎' : (result.type === 'gold' ? '💰' : '📦');
        var modalBody;

        if (result.jackpot) {
            var rareColor = typeof RARITY_COLORS !== 'undefined' ? (RARITY_COLORS[FORTUNE_WHEEL_PRIZES.itemRarity] || '#e8b84a') : '#e8b84a';
            modalBody = '<div style="text-align:center;">'
                + '<span style="font-size:48px;">💎</span>'
                + '<h3 style="color:var(--gold-light);margin:10px 0;">ДЖЕКПОТ!</h3>'
                + '<p style="font-size:20px;font-weight:700;color:' + rareColor + ';">' + result.item.name + '</p>'
                + '<p style="color:' + rareColor + ';font-size:13px;font-weight:600;">' + FORTUNE_WHEEL_PRIZES.itemRarity + '</p>'
                + wheelFormatItemStats(result.item)
                + '</div>';
        } else if (result.type === 'gold') {
            modalBody = '<div style="text-align:center;">'
                + '<span style="font-size:52px;">💰</span>'
                + '<h2 style="margin:12px 0;font-size:32px;color:var(--gold-light);">+' + result.amount + '</h2>'
                + '<p style="color:var(--text-primary);font-size:16px;">золота</p>'
                + (result.jackpot === false && targetIndex === 0
                    ? '<p style="color:var(--text-secondary);font-size:13px;margin-top:10px;">🎡 Джекпот не выпал, но золото утешает!</p>'
                    : '')
                + '</div>';
        } else {
            var itemColor = typeof RARITY_COLORS !== 'undefined' ? (RARITY_COLORS[result.item.rarity] || '#ccc') : '#ccc';
            var itemIcon = result.item.icon || '📦';
            var typeName = wheelSlotToRusName(result.item.slot || wheelDetectItemSlot(result.item));
            modalBody = '<div style="text-align:center;">'
                + '<span style="font-size:48px;">' + itemIcon + '</span>'
                + '<p style="font-size:20px;font-weight:700;color:' + itemColor + ';margin:10px 0;">' + result.item.name + '</p>'
                + '<p style="color:var(--text-secondary);font-size:12px;">' + typeName + '</p>'
                + '<p style="color:' + itemColor + ';font-size:12px;font-weight:600;">' + (result.item.rarity || 'Обычный') + '</p>'
                + wheelFormatItemStats(result.item)
                + '</div>';
        }

        showModal(modalTitle, modalIcon, modalBody, 'Забрать!', function() {
            if (wheelEl) wheelEl.classList.remove('wheel--result');
            wheelUpdateUiState();
        });

        setTimeout(function() {
            if (wheelEl) wheelEl.classList.remove('wheel--result');
        }, 4000);

        // Обновляем UI после награды
        wheelUpdateUiState();
    });
}

function wheelCleanup() {
    if (_wheelSyncInterval) {
        clearInterval(_wheelSyncInterval);
        _wheelSyncInterval = null;
    }
    _isSpinning = false;
}

// Экспорт функций
window.showWheelOfFortune = showWheelOfFortune;
window.wheelSpin = wheelSpin;
window.wheelCleanup = wheelCleanup;
window.wheelCanSpin = wheelCanSpin;
window.wheelGetCurrentMskTime = wheelGetCurrentMskTime;
window.wheelPickFromPool = wheelPickFromPool;
window.wheelValidatePools = wheelValidatePools;
