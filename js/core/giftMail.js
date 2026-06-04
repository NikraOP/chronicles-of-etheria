// Подарки через JSON: упаковка из инвентаря + одноразовая распаковка
const GIFT_MAIL_VERSION = 1;
const GIFT_MAIL_KIND = 'etheria_gift';
const CONSUMED_GIFTS_LS_KEY = 'etheria_consumed_gifts_v1';

const GIFT_INVENTORY_TYPES = [
    { key: 'weapons', label: 'Оружие', icon: '⚔️' },
    { key: 'helmets', label: 'Шлем', icon: '⛑️' },
    { key: 'chests', label: 'Нагрудник', icon: '🛡️' },
    { key: 'pants', label: 'Поножи', icon: '👖' },
    { key: 'boots', label: 'Сапоги', icon: '👢' },
    { key: 'rings', label: 'Кольцо', icon: '💍' },
    { key: 'necklaces', label: 'Амулет', icon: '📿' },
    { key: 'stones', label: 'Камень', icon: '💎' },
    { key: 'potions', label: 'Зелье здоровья', icon: '🧪' },
    { key: 'manaPotions', label: 'Зелье маны', icon: '💧' },
    { key: 'foods', label: 'Еда', icon: '🍖' },
    { key: 'elixirs', label: 'Эликсир', icon: '💪' },
    { key: 'scrolls', label: 'Свиток', icon: '📜' },
    { key: 'gatherScrolls', label: 'Свиток добычи', icon: '📜' }
];

var _giftMailMode = 'pack';
var _giftDraftGold = 0;
var _giftDraftSelected = {};

function escapeGiftMailText(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function giftRefKey(invKey, index) {
    return invKey + ':' + index;
}

function parseGiftRef(ref) {
    const p = String(ref).split(':');
    return { invKey: p[0], index: parseInt(p[1], 10) };
}

function resetGiftDraft() {
    _giftDraftGold = 0;
    _giftDraftSelected = {};
}

function ensureGiftInventoryLists() {
    if (!player || !player.inventory) return;
    GIFT_INVENTORY_TYPES.forEach(t => {
        if (!Array.isArray(player.inventory[t.key])) player.inventory[t.key] = [];
    });
    if (player.inventory.armor && player.inventory.armor.length > 0) {
        for (const item of player.inventory.armor) {
            const name = (item.name || '').toLowerCase();
            if (name.includes('шлем')) player.inventory.helmets.push(item);
            else if (name.includes('нагрудник') || name.includes('броня')) player.inventory.chests.push(item);
            else if (name.includes('понож')) player.inventory.pants.push(item);
            else if (name.includes('сапог')) player.inventory.boots.push(item);
            else player.inventory.chests.push(item);
        }
        player.inventory.armor = [];
    }
}

function isGiftItemEquipped(invKey, index) {
    if (!player || !player.inventory || !player.equipment) return false;
    const list = player.inventory[invKey];
    if (!list || index < 0 || index >= list.length) return true;
    const item = list[index];
    for (const slot in player.equipment) {
        if (player.equipment[slot] === item) return true;
    }
    return false;
}

function collectGiftableInventoryEntries() {
    ensureGiftInventoryLists();
    const entries = [];
    GIFT_INVENTORY_TYPES.forEach(t => {
        const list = player.inventory[t.key] || [];
        list.forEach((item, index) => {
            if (!item || isGiftItemEquipped(t.key, index)) return;
            entries.push({
                invKey: t.key,
                index: index,
                item: item,
                typeMeta: t,
                ref: giftRefKey(t.key, index)
            });
        });
    });
    return entries;
}

function isGiftDraftSelected(invKey, index) {
    const set = _giftDraftSelected[invKey];
    return !!(set && set[index]);
}

function toggleGiftDraftItem(invKey, index) {
    if (isGiftItemEquipped(invKey, index)) {
        if (typeof addMessage === 'function') addMessage('Снимите предмет с экипировки перед отправкой.', 'error');
        return;
    }
    if (!_giftDraftSelected[invKey]) _giftDraftSelected[invKey] = {};
    if (_giftDraftSelected[invKey][index]) {
        delete _giftDraftSelected[invKey][index];
        if (!Object.keys(_giftDraftSelected[invKey]).length) delete _giftDraftSelected[invKey];
    } else {
        _giftDraftSelected[invKey][index] = true;
    }
    notifyGiftDraftUiChanged();
}

function setGiftDraftGold(value) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    _giftDraftGold = Math.min(n, player ? player.gold || 0 : 0);
    notifyGiftDraftUiChanged();
}

function getGiftDraftGold() {
    return _giftDraftGold;
}

function notifyGiftDraftUiChanged() {
    refreshGiftMailPackUi();
    if (window._exchangeModalOpen && typeof window.refreshExchangeModalBody === 'function') {
        window.refreshExchangeModalBody();
    }
}

function countGiftDraftItems() {
    let n = 0;
    Object.keys(_giftDraftSelected).forEach(k => {
        n += Object.keys(_giftDraftSelected[k]).length;
    });
    return n;
}

function getConsumedGiftIds() {
    try {
        const raw = localStorage.getItem(CONSUMED_GIFTS_LS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function markGiftConsumed(giftId) {
    if (!giftId) return;
    const ids = getConsumedGiftIds();
    if (ids.indexOf(giftId) >= 0) return;
    ids.push(giftId);
    localStorage.setItem(CONSUMED_GIFTS_LS_KEY, JSON.stringify(ids.slice(-5000)));
    if (player) {
        if (!Array.isArray(player.redeemedGiftIds)) player.redeemedGiftIds = [];
        if (player.redeemedGiftIds.indexOf(giftId) < 0) {
            player.redeemedGiftIds.push(giftId);
            if (typeof saveGame === 'function') saveGame();
        }
    }
}

function isGiftIdConsumed(giftId) {
    if (!giftId) return true;
    if (getConsumedGiftIds().indexOf(giftId) >= 0) return true;
    if (player && Array.isArray(player.redeemedGiftIds) && player.redeemedGiftIds.indexOf(giftId) >= 0) return true;
    return false;
}

function computeGiftChecksum(payload) {
    const str = JSON.stringify(payload);
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return 'g' + (h >>> 0).toString(16);
}

function collectGiftDraftRefs() {
    const refs = [];
    Object.keys(_giftDraftSelected).forEach(invKey => {
        Object.keys(_giftDraftSelected[invKey]).forEach(idx => {
            refs.push({ invKey: invKey, index: parseInt(idx, 10) });
        });
    });
    refs.sort((a, b) => {
        if (a.invKey !== b.invKey) return a.invKey.localeCompare(b.invKey);
        return b.index - a.index;
    });
    return refs;
}

function peekGiftPayloadFromDraft() {
    const items = [];
    collectGiftDraftRefs().forEach(ref => {
        const list = player.inventory[ref.invKey];
        if (!list || ref.index < 0 || ref.index >= list.length) return;
        if (isGiftItemEquipped(ref.invKey, ref.index)) return;
        items.push({
            invType: ref.invKey,
            item: JSON.parse(JSON.stringify(list[ref.index]))
        });
    });
    const gold = Math.min(_giftDraftGold, player.gold || 0);
    return { gold: gold, items: items };
}

function deductGiftDraftFromPlayer() {
    const refs = collectGiftDraftRefs();
    refs.forEach(ref => {
        const list = player.inventory[ref.invKey];
        if (!list || ref.index < 0 || ref.index >= list.length) return;
        list.splice(ref.index, 1);
    });
    const gold = Math.min(_giftDraftGold, player.gold || 0);
    if (gold > 0) player.gold -= gold;
    resetGiftDraft();
}

function buildGiftPayloadFromDraft() {
    const peek = peekGiftPayloadFromDraft();
    deductGiftDraftFromPlayer();
    const body = {
        gold: peek.gold,
        items: peek.items
    };
    const gift = {
        kind: GIFT_MAIL_KIND,
        version: GIFT_MAIL_VERSION,
        id: 'gift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10),
        createdAt: Date.now(),
        from: player.name || 'Игрок',
        consumed: false,
        payload: body
    };
    gift.checksum = computeGiftChecksum({
        id: gift.id,
        createdAt: gift.createdAt,
        from: gift.from,
        payload: body
    });
    return gift;
}

function validateGiftObject(gift) {
    if (!gift || gift.kind !== GIFT_MAIL_KIND) return 'Неверный формат подарка.';
    if (gift.version !== GIFT_MAIL_VERSION) return 'Версия подарка не поддерживается.';
    if (!gift.id || typeof gift.id !== 'string') return 'У подарка нет ID.';
    if (gift.consumed === true) return 'Подарок уже был распакован.';
    if (isGiftIdConsumed(gift.id)) return 'Этот подарок уже получен на этом устройстве.';
    if (!gift.payload || typeof gift.payload !== 'object') return 'Пустой подарок.';
    const body = gift.payload;
    const expected = computeGiftChecksum({
        id: gift.id,
        createdAt: gift.createdAt,
        from: gift.from,
        payload: { gold: body.gold || 0, items: body.items || [] }
    });
    if (gift.checksum && gift.checksum !== expected) return 'Подарок повреждён или изменён.';
    const gold = Math.floor(Number(body.gold) || 0);
    if (gold < 0 || gold > 999999999) return 'Некорректное золото в подарке.';
    if (!Array.isArray(body.items)) return 'Некорректный список предметов.';
    if (gold === 0 && body.items.length === 0) return 'Подарок пуст.';
    for (const row of body.items) {
        if (!row || !row.item || typeof row.item !== 'object') return 'Битый предмет в подарке.';
        if (!row.item.name) return 'У предмета нет названия.';
    }
    return null;
}

function pushGiftItemToInventory(item, invType) {
    ensureGiftInventoryLists();
    const clone = JSON.parse(JSON.stringify(item));
    const key = invType || 'potions';
    if (!player.inventory[key]) player.inventory[key] = [];
    player.inventory[key].push(clone);
}

function grantGiftPayload(payload) {
    const gold = Math.floor(Number(payload.gold) || 0);
    if (gold > 0) player.gold = (player.gold || 0) + gold;
    (payload.items || []).forEach(row => {
        pushGiftItemToInventory(row.item, row.invType);
    });
}

function buildConsumedGiftJson(gift) {
    return {
        kind: GIFT_MAIL_KIND,
        version: GIFT_MAIL_VERSION,
        id: gift.id,
        createdAt: gift.createdAt,
        from: gift.from,
        consumed: true,
        consumedAt: Date.now(),
        payload: { gold: 0, items: [] },
        note: 'Подарок уже получен. Содержимое удалено.'
    };
}

function downloadGiftJsonFile(obj, filename) {
    const jsonStr = JSON.stringify(obj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function packGiftFromDraft() {
    if (!player) return;
    const itemCount = countGiftDraftItems();
    if (itemCount === 0 && _giftDraftGold <= 0) {
        if (typeof addMessage === 'function') addMessage('Добавьте предметы или золото в подарок.', 'error');
        return;
    }
    const gift = buildGiftPayloadFromDraft();
    if (!gift.payload.items.length && gift.payload.gold <= 0) {
        if (typeof addMessage === 'function') addMessage('Не удалось упаковать подарок.', 'error');
        return;
    }
    resetGiftDraft();
    if (typeof resetBaseStats === 'function') resetBaseStats();
    if (typeof saveGame === 'function') saveGame();
    if (typeof renderGame === 'function') renderGame();
    downloadGiftJsonFile(gift, 'etheria_gift_' + gift.id + '.json');
    if (typeof addMessage === 'function') {
        addMessage('🎁 Подарок запакован! Отправьте файл другу. Золото: ' + gift.payload.gold + ', предметов: ' + gift.payload.items.length, 'success');
    }
    showGiftMailSettings('pack');
}

function parseGiftJsonText(text) {
    if (!text || !String(text).trim()) return { error: 'Вставьте JSON подарка.' };
    try {
        const gift = JSON.parse(text);
        const err = validateGiftObject(gift);
        if (err) return { error: err };
        return { gift: gift };
    } catch (e) {
        return { error: 'Некорректный JSON.' };
    }
}

function unpackGiftObject(gift) {
    const err = validateGiftObject(gift);
    if (err) return { ok: false, error: err };
    grantGiftPayload(gift.payload);
    markGiftConsumed(gift.id);
    if (typeof resetBaseStats === 'function') resetBaseStats();
    if (typeof saveGame === 'function') saveGame();
    if (typeof renderGame === 'function') renderGame();
    const consumedJson = buildConsumedGiftJson(gift);
    downloadGiftJsonFile(consumedJson, 'etheria_gift_USED_' + gift.id + '.json');
    return {
        ok: true,
        gold: gift.payload.gold || 0,
        items: gift.payload.items.length,
        from: gift.from || 'Игрок',
        consumedJson: consumedJson
    };
}

function unpackGiftFromTextarea() {
    const ta = document.getElementById('giftMailJsonInput');
    const resultEl = document.getElementById('giftMailUnpackResult');
    if (!ta) return;
    const parsed = parseGiftJsonText(ta.value);
    if (parsed.error) {
        if (resultEl) resultEl.innerHTML = '<p class="gift-mail-result gift-mail-result--error">' + escapeGiftMailText(parsed.error) + '</p>';
        if (typeof addMessage === 'function') addMessage(parsed.error, 'error');
        return;
    }
    const res = unpackGiftObject(parsed.gift);
    if (!res.ok) {
        if (resultEl) resultEl.innerHTML = '<p class="gift-mail-result gift-mail-result--error">' + escapeGiftMailText(res.error) + '</p>';
        if (typeof addMessage === 'function') addMessage(res.error, 'error');
        return;
    }
    ta.value = JSON.stringify(res.consumedJson, null, 2);
    if (resultEl) {
        resultEl.innerHTML = '<p class="gift-mail-result gift-mail-result--ok">✅ Подарок от «' + escapeGiftMailText(res.from) + '»: +' +
            res.gold + ' 💰, предметов: ' + res.items + '. JSON очищен — сохраните файл, он больше не активен.</p>';
    }
    if (typeof addMessage === 'function') {
        addMessage('🎁 Подарок распакован! +' + res.gold + ' золота, ' + res.items + ' предмет(ов).', 'success');
    }
}

function handleGiftMailFileSelect(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const ta = document.getElementById('giftMailJsonInput');
        if (ta) ta.value = e.target.result || '';
        unpackGiftFromTextarea();
    };
    reader.readAsText(file);
    input.value = '';
}

function buildGiftMailPackHtml() {
    const entries = collectGiftableInventoryEntries();
    const itemCount = countGiftDraftItems();
    let itemsHtml = '';
    if (entries.length === 0) {
        itemsHtml = '<p class="gift-mail-empty">В инвентаре нет предметов для отправки (экипированные сначала снимите).</p>';
    } else {
        itemsHtml = '<div class="gift-mail-item-grid">';
        entries.forEach(ent => {
            const sel = isGiftDraftSelected(ent.invKey, ent.index);
            const bonus = typeof formatItemBonusLine === 'function' ? formatItemBonusLine(ent.item) : '';
            const icon = typeof renderItemIconHTML === 'function'
                ? renderItemIconHTML(ent.item, { size: 32, fallback: ent.typeMeta.icon })
                : '<span>' + ent.typeMeta.icon + '</span>';
            itemsHtml += '<button type="button" class="gift-mail-item' + (sel ? ' gift-mail-item--selected' : '') +
                '" data-gift-inv="' + ent.invKey + '" data-gift-idx="' + ent.index + '">' +
                icon +
                '<span class="gift-mail-item__name">' + escapeGiftMailText(ent.item.name) + '</span>' +
                '<span class="gift-mail-item__meta">' + escapeGiftMailText(ent.typeMeta.label) + (bonus ? ' · ' + escapeGiftMailText(bonus.trim()) : '') + '</span>' +
                '</button>';
        });
        itemsHtml += '</div>';
    }
    return '<div class="gift-mail-panel gift-mail-panel--pack" id="giftMailPackPanel">' +
        '<p class="theme-editor-desc">Выберите предметы из инвентаря и золото. После упаковки они спишутся у вас и попадут в JSON-файл для друга.</p>' +
        '<div class="gift-mail-gold-row">' +
        '<label class="gift-mail-gold-label" for="giftMailGoldInput">💰 Золото в подарке</label>' +
        '<input type="number" id="giftMailGoldInput" class="gift-mail-gold-input" min="0" max="' + (player.gold || 0) + '" value="' + _giftDraftGold + '">' +
        '<span class="gift-mail-gold-max">/ ' + (player.gold || 0) + '</span>' +
        '</div>' +
        '<div class="gift-mail-summary">В подарке: <strong>' + itemCount + '</strong> предм. · <strong>' + _giftDraftGold + '</strong> 💰</div>' +
        itemsHtml +
        '<button type="button" class="action-btn gift-mail-pack-btn" id="giftMailPackBtn">📦 Запаковать подарок</button>' +
        '</div>';
}

function buildGiftMailUnpackHtml() {
    return '<div class="gift-mail-panel gift-mail-panel--unpack" id="giftMailUnpackPanel">' +
        '<p class="theme-editor-desc">Вставьте JSON подарка от друга или загрузите файл. Награда выдаётся один раз; после распаковки содержимое в JSON удаляется.</p>' +
        '<textarea id="giftMailJsonInput" class="gift-mail-json-input" rows="8" placeholder="{ \"kind\": \"etheria_gift\", ... }"></textarea>' +
        '<div class="gift-mail-unpack-actions">' +
        '<button type="button" class="action-btn" id="giftMailUnpackBtn">🎁 Распаковать подарок</button>' +
        '<label class="action-btn theme-btn-ghost gift-mail-file-label">📁 Загрузить JSON<input type="file" id="giftMailFileInput" accept=".json,application/json" hidden></label>' +
        '</div>' +
        '<div id="giftMailUnpackResult" class="gift-mail-unpack-result"></div>' +
        '</div>';
}

function buildGiftMailSettingsHtml() {
    return '<section class="settings-section settings-section-mail" id="settingsGiftMail">' +
        '<h3 class="settings-section-title">📬 Почта подарков</h3>' +
        '<nav class="gift-mail-subtabs" role="tablist">' +
        '<button type="button" class="gift-mail-subtab' + (_giftMailMode === 'pack' ? ' active' : '') + '" data-gift-mode="pack">📦 Запаковать</button>' +
        '<button type="button" class="gift-mail-subtab' + (_giftMailMode === 'unpack' ? ' active' : '') + '" data-gift-mode="unpack">🎁 Распаковать</button>' +
        '</nav>' +
        '<div id="giftMailModeBody">' + (_giftMailMode === 'pack' ? buildGiftMailPackHtml() : buildGiftMailUnpackHtml()) + '</div>' +
        '</section>';
}

function refreshGiftMailPackUi() {
    const body = document.getElementById('giftMailModeBody');
    if (!body || _giftMailMode !== 'pack') return;
    body.innerHTML = buildGiftMailPackHtml();
    bindGiftMailPackPanel();
}

function bindGiftMailPackPanel() {
    const goldInput = document.getElementById('giftMailGoldInput');
    if (goldInput) {
        goldInput.addEventListener('input', function () { setGiftDraftGold(goldInput.value); });
        goldInput.addEventListener('change', function () { setGiftDraftGold(goldInput.value); });
    }
    document.querySelectorAll('.gift-mail-item[data-gift-inv]').forEach(btn => {
        btn.addEventListener('click', function () {
            toggleGiftDraftItem(btn.dataset.giftInv, parseInt(btn.dataset.giftIdx, 10));
        });
    });
    const packBtn = document.getElementById('giftMailPackBtn');
    if (packBtn) packBtn.addEventListener('click', packGiftFromDraft);
}

function bindGiftMailUnpackPanel() {
    const unpackBtn = document.getElementById('giftMailUnpackBtn');
    if (unpackBtn) unpackBtn.addEventListener('click', unpackGiftFromTextarea);
    const fileInput = document.getElementById('giftMailFileInput');
    if (fileInput) fileInput.addEventListener('change', function () { handleGiftMailFileSelect(fileInput); });
}

function initGiftMailSettings(root) {
    if (!root) root = document.getElementById('settingsGiftMail');
    if (!root) return;
    root.querySelectorAll('[data-gift-mode]').forEach(btn => {
        btn.addEventListener('click', function () {
            _giftMailMode = btn.dataset.giftMode;
            showGiftMailSettings(_giftMailMode);
        });
    });
    if (_giftMailMode === 'pack') bindGiftMailPackPanel();
    else bindGiftMailUnpackPanel();
}

function showGiftMailSettings(mode) {
    if (mode) _giftMailMode = mode;
    const host = document.getElementById('settingsTabBody');
    if (!host) return;
    const existing = document.getElementById('settingsGiftMail');
    if (existing) {
        existing.outerHTML = buildGiftMailSettingsHtml();
    }
    initGiftMailSettings(document.getElementById('settingsGiftMail'));
}

function mountGiftMailTab(bodyEl) {
    if (!bodyEl) return;
    resetGiftDraft();
    bodyEl.innerHTML = buildGiftMailSettingsHtml();
    initGiftMailSettings(document.getElementById('settingsGiftMail'));
}

window.showGiftMailSettings = showGiftMailSettings;
window.mountGiftMailTab = mountGiftMailTab;
window.packGiftFromDraft = packGiftFromDraft;
window.unpackGiftFromTextarea = unpackGiftFromTextarea;
window.validateGiftObject = validateGiftObject;
window.markGiftConsumed = markGiftConsumed;
window.isGiftIdConsumed = isGiftIdConsumed;
window.buildGiftPayloadFromDraft = buildGiftPayloadFromDraft;
window.peekGiftPayloadFromDraft = peekGiftPayloadFromDraft;
window.deductGiftDraftFromPlayer = deductGiftDraftFromPlayer;
window.grantGiftPayload = grantGiftPayload;
window.collectGiftableInventoryEntries = collectGiftableInventoryEntries;
window.resetGiftDraft = resetGiftDraft;
window.toggleGiftDraftItem = toggleGiftDraftItem;
window.setGiftDraftGold = setGiftDraftGold;
window.isGiftItemEquipped = isGiftItemEquipped;
window.isGiftDraftSelected = isGiftDraftSelected;
window.getGiftDraftGold = getGiftDraftGold;
window.GIFT_INVENTORY_TYPES = GIFT_INVENTORY_TYPES;
window.buildConsumedGiftJson = buildConsumedGiftJson;
window.unpackGiftObject = unpackGiftObject;
