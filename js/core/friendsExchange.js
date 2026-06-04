/**
 * Обмены и подарки друзьям через сервер Etheria.
 */
(function () {
    let friendsActiveTab = 'list';
    let _exchangeTargetId = '';
    let _exchangeTargetName = '';
    let _exchangeKind = 'gift';
    let _exchangeGiveDraft = { gold: 0, items: [], resources: [] };
    let _exchangeWantDraft = { gold: 0, items: [], resources: [] };
    let _exchangePickerSide = 'give';
    let _exchangePickerStep = null;
    let _exchangePickerPending = null;
    let _exchangePickerQty = 1;
    let _cachedExchanges = [];
    let _exchangeOffersById = {};

    const EX_INV_SLOTS = [
        { key: 'weapons', label: 'Оружие', icon: '⚔️' },
        { key: 'helmets', label: 'Шлем', icon: '⛑️' },
        { key: 'chests', label: 'Нагрудник', icon: '🛡️' },
        { key: 'pants', label: 'Поножи', icon: '👖' },
        { key: 'boots', label: 'Сапоги', icon: '👢' },
        { key: 'rings', label: 'Кольцо', icon: '💍' },
        { key: 'necklaces', label: 'Амулет', icon: '📿' },
        { key: 'stones', label: 'Камень', icon: '💎' },
        { key: 'potions', label: 'Зелье', icon: '🧪' },
        { key: 'manaPotions', label: 'Мана', icon: '💧' },
        { key: 'foods', label: 'Еда', icon: '🍖' },
        { key: 'elixirs', label: 'Эликсир', icon: '💪' },
        { key: 'scrolls', label: 'Свиток', icon: '📜' },
        { key: 'gatherScrolls', label: 'Свиток добычи', icon: '📜' }
    ];
    let _exchangePollSince = 0;
    let _exchangePollActive = false;
    let _exchangePollTimer = null;
    let _exchangePollInFlight = false;
    let _lastHandledIncomingId = '';
    let _lastHandledExchangeEventSeq = 0;
    let _exchangeListRefreshPromise = null;

    function escapeExHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function jsOnclickStr(s) {
        return "'" + String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    }

    function getFriendsActiveTab() {
        return friendsActiveTab === 'exchanges' ? 'exchanges' : 'list';
    }

    function setFriendsActiveTab(tab) {
        friendsActiveTab = tab === 'exchanges' ? 'exchanges' : 'list';
        if (friendsActiveTab === 'exchanges') {
            refreshExchangesList().then(function () {
                if (typeof renderFriendsScreenInner === 'function') renderFriendsScreenInner();
            });
            return;
        }
        if (typeof renderFriendsScreenInner === 'function') renderFriendsScreenInner();
    }

    function emptyExchangeDraft() {
        return { gold: 0, items: [], resources: [] };
    }

    function getExchangeDraft(side) {
        return side === 'want' ? _exchangeWantDraft : _exchangeGiveDraft;
    }

    function resetExchangeDrafts() {
        _exchangeGiveDraft = emptyExchangeDraft();
        _exchangeWantDraft = emptyExchangeDraft();
        _exchangePickerStep = null;
        _exchangePickerPending = null;
    }

    function resetExchangeWantDraft() {
        _exchangeWantDraft = emptyExchangeDraft();
    }

    function draftToPayload(draft) {
        return {
            gold: Math.floor(Number(draft.gold) || 0),
            items: (draft.items || []).map(function (row) {
                return { invType: row.invKey, item: row.item };
            }),
            resources: (draft.resources || []).map(function (r) {
                return { name: r.name, qty: Math.floor(Number(r.qty) || 0) };
            }).filter(function (r) { return r.qty > 0; })
        };
    }

    function draftIsEmpty(draft) {
        const p = draftToPayload(draft);
        return p.gold <= 0 && !p.items.length && !p.resources.length;
    }

    function getResourceAvailable(name, side) {
        if (side === 'want') return 99999;
        if (!player || !player.resources) return 0;
        const total = Math.floor(Number(player.resources[name]) || 0);
        const draft = getExchangeDraft(side);
        const used = (draft.resources || []).filter(function (r) { return r.name === name; })
            .reduce(function (s, r) { return s + (r.qty || 0); }, 0);
        return Math.max(0, total - used);
    }

    function getExchangeResourceNamesForPicker(side) {
        const names = new Set();
        if (side === 'want' && typeof RESOURCES_DB === 'object') {
            Object.keys(RESOURCES_DB).forEach(function (cat) {
                (RESOURCES_DB[cat] || []).forEach(function (r) {
                    if (r && r.name) names.add(r.name);
                });
            });
        }
        if (player && player.resources) {
            Object.keys(player.resources).forEach(function (k) {
                if (side === 'give') {
                    if (getResourceAvailable(k, 'give') > 0) names.add(k);
                } else {
                    names.add(k);
                }
            });
        }
        return Array.from(names).sort(function (a, b) { return a.localeCompare(b, 'ru'); });
    }

    function isItemIndexInDraft(side, invKey, index) {
        return getExchangeDraft(side).items.some(function (row) {
            return row.invKey === invKey && row.index === index;
        });
    }

    function summarizePayload(payload) {
        const gold = Math.floor(Number(payload && payload.gold) || 0);
        const n = payload && payload.items ? payload.items.length : 0;
        const rn = payload && payload.resources ? payload.resources.length : 0;
        const parts = [];
        if (gold > 0) parts.push('💰 ' + gold);
        if (n > 0) parts.push('📦 ' + n + ' предм.');
        if (rn > 0) parts.push('💎 ' + rn + ' рес.');
        return parts.length ? parts.join(' · ') : 'пусто';
    }

    function renderExchangeDraftItemIcon(item, fallback, size) {
        const sz = size || 36;
        if (item && typeof renderItemIconHTML === 'function') {
            return renderItemIconHTML(item, { size: sz, fallback: fallback || '📦' });
        }
        return '<span class="exchange-draft-item__emoji">' + (fallback || '📦') + '</span>';
    }

    function payloadIsEmpty(payload) {
        if (!payload) return true;
        const gold = Math.floor(Number(payload.gold) || 0);
        const items = payload.items || [];
        const resources = payload.resources || [];
        return gold <= 0 && !items.length && !resources.length;
    }

    function buildExchangePayloadDetailHtml(payload, sectionTitle) {
        let html = '<div class="exchange-detail-block">';
        html += '<h4 class="exchange-detail-block__title">' + escapeExHtml(sectionTitle) + '</h4>';
        if (payloadIsEmpty(payload)) {
            html += '<p class="exchange-detail-block__empty">— ничего —</p></div>';
            return html;
        }
        html += '<div class="exchange-detail-block__list">';
        const gold = Math.floor(Number(payload.gold) || 0);
        if (gold > 0) {
            html += '<div class="exchange-draft-item exchange-draft-item--gold">' +
                '<div class="exchange-draft-item__icon">' + renderExchangeDraftItemIcon(null, '💰', 44) + '</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">Золото</div>' +
                '<div class="exchange-draft-item__meta">' + gold + ' монет</div></div></div>';
        }
        (payload.resources || []).forEach(function (r) {
            const resDef = typeof findResourceDefByName === 'function' ? findResourceDefByName(r.name) : null;
            const iconItem = resDef || { name: r.name, icon: '💎' };
            html += '<div class="exchange-draft-item">' +
                '<div class="exchange-draft-item__icon">' + renderExchangeDraftItemIcon(iconItem, '💎', 44) + '</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">' + escapeExHtml(r.name) +
                '</div><div class="exchange-draft-item__meta">Количество: ×' + (r.qty || 0) + '</div></div></div>';
        });
        (payload.items || []).forEach(function (row) {
            const item = row.item || {};
            const slot = EX_INV_SLOTS.find(function (s) { return s.key === row.invType; });
            const fb = slot ? slot.icon : '📦';
            let meta = slot ? slot.label : 'Предмет';
            if (item.rarity) meta += ' · ' + item.rarity;
            if (typeof formatItemBonusLine === 'function' && item) {
                const bonus = formatItemBonusLine(item);
                if (bonus) meta += ' · ' + bonus;
            }
            html += '<div class="exchange-draft-item">' +
                '<div class="exchange-draft-item__icon">' + renderExchangeDraftItemIcon(item, fb, 44) + '</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">' + escapeExHtml(item.name || 'Предмет') +
                '</div><div class="exchange-draft-item__meta">' + escapeExHtml(meta) + '</div></div></div>';
        });
        html += '</div></div>';
        return html;
    }

    function findCachedExchange(offerId) {
        if (!offerId) return null;
        return _exchangeOffersById[offerId] || _cachedExchanges.find(function (o) {
            return o.offerId === offerId;
        }) || null;
    }

    function closeExchangeDetailModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal && window._exchangeDetailModalOpen) {
            modal.style.display = 'none';
        }
        window._exchangeDetailModalOpen = false;
    }

    function buildExchangeDetailModalHtml(o) {
        const isIn = o.role === 'incoming';
        const kindLabel = o.kind === 'trade' ? 'Обмен' : 'Подарок';
        const fromName = escapeExHtml(o.fromName || 'Игрок');
        const toName = escapeExHtml(o.toName || 'Игрок');
        let html = '<div class="modal-exchange modal-exchange--detail">';
        html += '<div class="exchange-detail-head">';
        html += '<span class="exchange-card__badge exchange-detail-head__badge">' + kindLabel + '</span>';
        html += '<h3 class="modal-exchange__title">' + (isIn ? 'Входящее предложение' : 'Исходящее предложение') + '</h3>';
        html += '<p class="exchange-detail-flow"><strong>' + fromName + '</strong>';
        html += ' <span class="exchange-detail-flow__arrow">→</span> ';
        html += '<strong>' + toName + '</strong></p>';
        if (isIn) {
            html += '<p class="exchange-detail-flow__hint">Вам предлагают принять этот обмен</p>';
        } else {
            html += '<p class="exchange-detail-flow__hint">Ожидается ответ друга</p>';
        }
        html += '</div>';
        if (isIn) {
            html += buildExchangePayloadDetailHtml(o.fromOffer, 'Вам от «' + (o.fromName || 'друга') + '» — вы получите');
            if (o.kind === 'trade') {
                html += buildExchangePayloadDetailHtml(o.toOffer, 'Вы отдадите при принятии');
            }
        } else {
            html += buildExchangePayloadDetailHtml(o.fromOffer, 'Вы отдаёте «' + (o.toName || 'другу') + '»');
            if (o.kind === 'trade') {
                html += buildExchangePayloadDetailHtml(o.toOffer, 'Хотите получить от «' + (o.toName || 'друга') + '»');
            }
        }
        html += '<div class="modal-exchange__actions">';
        if (isIn) {
            html += '<button type="button" class="modal-btn modal-btn--primary" onclick="respondFriendExchange(' +
                jsOnclickStr(o.offerId) + ',true);closeExchangeDetailModal()">Принять</button>';
            html += '<button type="button" class="modal-btn modal-btn--ghost" onclick="respondFriendExchange(' +
                jsOnclickStr(o.offerId) + ',false);closeExchangeDetailModal()">Отклонить</button>';
        }
        html += '<button type="button" class="modal-btn modal-btn--ghost" onclick="closeExchangeDetailModal()">Закрыть</button>';
        html += '</div></div>';
        return html;
    }

    function showExchangeDetailModal(offerId) {
        const o = findCachedExchange(offerId);
        if (!o) {
            if (typeof addMessage === 'function') addMessage('Обмен не найден. Обновите вкладку.', 'info');
            return;
        }
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        if (!modal || !content) return;
        window._exchangeDetailModalOpen = true;
        window._exchangeInviteModalOpen = false;
        window._exchangeModalOpen = false;
        content.innerHTML = buildExchangeDetailModalHtml(o);
        modal.style.display = 'flex';
    }

    function buildExchangeDraftListHtml(side, title) {
        const draft = getExchangeDraft(side);
        let html = '<div class="exchange-draft" data-ex-draft="' + side + '">';
        html += '<h4 class="exchange-draft__title">' + escapeExHtml(title) + '</h4>';
        html += '<div class="exchange-draft__list">';
        if (draft.gold > 0) {
            html += '<div class="exchange-draft-item exchange-draft-item--gold">' +
                '<div class="exchange-draft-item__icon">💰</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">Золото</div>' +
                '<div class="exchange-draft-item__meta">' + draft.gold + ' монет</div></div>' +
                '<button type="button" class="exchange-draft-chip__x" data-ex-rm="gold" data-ex-side="' + side +
                '">×</button></div>';
        }
        (draft.resources || []).forEach(function (r, i) {
            const resDef = typeof findResourceDefByName === 'function' ? findResourceDefByName(r.name) : null;
            const iconItem = resDef || { name: r.name, icon: '💎' };
            html += '<div class="exchange-draft-item">' +
                '<div class="exchange-draft-item__icon">' + renderExchangeDraftItemIcon(iconItem, '💎') + '</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">' + escapeExHtml(r.name) +
                '</div><div class="exchange-draft-item__meta">×' + r.qty + '</div></div>' +
                '<button type="button" class="exchange-draft-chip__x" data-ex-rm="res" data-ex-side="' + side +
                '" data-ex-idx="' + i + '">×</button></div>';
        });
        (draft.items || []).forEach(function (row, i) {
            const item = row.item || {};
            const slot = EX_INV_SLOTS.find(function (s) { return s.key === row.invKey; });
            const fb = slot ? slot.icon : '📦';
            html += '<div class="exchange-draft-item">' +
                '<div class="exchange-draft-item__icon">' + renderExchangeDraftItemIcon(item, fb) + '</div>' +
                '<div class="exchange-draft-item__body"><div class="exchange-draft-item__name">' + escapeExHtml(item.name || 'Предмет') +
                '</div><div class="exchange-draft-item__meta">' + escapeExHtml(slot ? slot.label : 'Предмет') +
                (item.rarity ? ' · ' + escapeExHtml(item.rarity) : '') + '</div></div>' +
                '<button type="button" class="exchange-draft-chip__x" data-ex-rm="item" data-ex-side="' + side +
                '" data-ex-idx="' + i + '">×</button></div>';
        });
        if (draftIsEmpty(draft)) {
            html += '<p class="exchange-draft__empty">Пока ничего не добавлено — нажмите «Добавить к обмену»</p>';
        }
        html += '</div>';
        html += '<div class="exchange-draft__actions">';
        html += '<button type="button" class="action-btn" data-ex-open-inv="' + side + '">➕ Добавить к обмену</button>';
        html += '<button type="button" class="action-btn exchange-draft__gold-btn" data-ex-open-gold="' + side +
            '">💰 Золото</button>';
        html += '</div></div>';
        return html;
    }

    function buildExchangeInventoryPickerHtml() {
        if (!player) return '<p>Нет персонажа</p>';
        if (typeof ensureGiftInventoryLists === 'function') ensureGiftInventoryLists();
        if (!player.resources) player.resources = {};

        let html = '<div class="exchange-inv-picker">';
        html += '<h3 class="exchange-inv-picker__title">🎒 Инвентарь</h3>';
        html += '<p class="exchange-inv-picker__hint">Нажмите на ресурс или предмет. Для ресурсов укажите количество.</p>';

        const resKeys = getExchangeResourceNamesForPicker(_exchangePickerSide);
        if (resKeys.length) {
            html += '<h4 class="exchange-inv-picker__section">💎 Ресурсы</h4><div class="exchange-inv-grid">';
            resKeys.forEach(function (name) {
                const qty = _exchangePickerSide === 'give'
                    ? getResourceAvailable(name, 'give')
                    : 99999;
                if (_exchangePickerSide === 'give' && qty <= 0) return;
                const resDef = typeof findResourceDefByName === 'function' ? findResourceDefByName(name) : null;
                const iconItem = resDef || { name: name, icon: '📦' };
                const iconHtml = typeof renderItemIconHTML === 'function'
                    ? renderItemIconHTML(iconItem, { size: 40, fallback: '📦' })
                    : '<span>📦</span>';
                html += '<button type="button" class="exchange-inv-card" data-pick-type="resource" data-pick-name="' +
                    escapeExHtml(name) + '"><div class="exchange-inv-card__icon">' + iconHtml + '</div>' +
                    '<div class="exchange-inv-card__body"><div class="exchange-inv-card__name">' + escapeExHtml(name) +
                    '</div><div class="exchange-inv-card__qty">×' + qty + '</div></div></button>';
            });
            html += '</div>';
        }

        EX_INV_SLOTS.forEach(function (slot) {
            const list = player.inventory[slot.key] || [];
            const rows = [];
            list.forEach(function (item, index) {
                if (!item) return;
                if (_exchangePickerSide === 'give' && typeof isGiftItemEquipped === 'function' &&
                    isGiftItemEquipped(slot.key, index)) return;
                if (_exchangePickerSide === 'give' && isItemIndexInDraft('give', slot.key, index)) return;
                rows.push({ item: item, index: index });
            });
            if (!rows.length) return;
            html += '<h4 class="exchange-inv-picker__section">' + slot.icon + ' ' + slot.label + '</h4>';
            html += '<div class="exchange-inv-grid">';
            rows.forEach(function (row) {
                const iconHtml = typeof renderItemIconHTML === 'function'
                    ? renderItemIconHTML(row.item, { size: 40, fallback: slot.icon })
                    : '<span>' + slot.icon + '</span>';
                html += '<button type="button" class="exchange-inv-card" data-pick-type="item" data-pick-inv="' +
                    escapeExHtml(slot.key) + '" data-pick-idx="' + row.index + '">' +
                    '<div class="exchange-inv-card__icon">' + iconHtml + '</div>' +
                    '<div class="exchange-inv-card__body"><div class="exchange-inv-card__name">' +
                    escapeExHtml(row.item.name) + '</div></div></button>';
            });
            html += '</div>';
        });

        html += '<div class="exchange-inv-picker__footer">';
        html += '<button type="button" class="modal-btn modal-btn--primary" data-ex-picker-done>Готово</button>';
        html += '<button type="button" class="modal-btn modal-btn--ghost" data-ex-picker-back>Назад</button>';
        html += '</div></div>';
        return html;
    }

    function buildExchangeQuantityHtml() {
        const p = _exchangePickerPending;
        if (!p) return '';
        let title = '';
        let maxQ = 1;
        if (p.type === 'gold') {
            title = '💰 Золото';
            maxQ = p.maxQty;
        } else if (p.type === 'resource') {
            title = '💎 ' + (p.name || '');
            maxQ = p.maxQty;
        } else {
            title = '📦 ' + ((p.item && p.item.name) || 'Предмет');
            maxQ = 1;
        }
        _exchangePickerQty = Math.min(Math.max(1, _exchangePickerQty), maxQ);
        let html = '<div class="exchange-qty-step">';
        html += '<h3 class="exchange-qty-step__title">' + escapeExHtml(title) + '</h3>';
        html += '<p class="exchange-qty-step__hint">Доступно: ' + maxQ + '</p>';
        html += '<div class="exchange-qty-step__controls">';
        html += '<button type="button" class="action-btn" data-ex-qty-delta="-1">−</button>';
        html += '<input type="number" id="exchangeQtyInput" class="hero-input exchange-qty-input" min="1" max="' +
            maxQ + '" value="' + _exchangePickerQty + '">';
        html += '<button type="button" class="action-btn" data-ex-qty-delta="1">+</button>';
        html += '</div>';
        html += '<div class="exchange-inv-picker__footer">';
        html += '<button type="button" class="modal-btn modal-btn--primary" data-ex-qty-confirm>Готово</button>';
        html += '<button type="button" class="modal-btn modal-btn--ghost" data-ex-picker-back>Назад</button>';
        html += '</div></div>';
        return html;
    }

    function openExchangeInventoryPicker(side) {
        _exchangePickerSide = side === 'want' ? 'want' : 'give';
        _exchangePickerStep = 'inventory';
        _exchangePickerPending = null;
        refreshExchangeModalBody();
    }

    function openExchangeGoldPicker(side) {
        _exchangePickerSide = side === 'want' ? 'want' : 'give';
        const draft = getExchangeDraft(_exchangePickerSide);
        let maxQ = 999999999;
        if (_exchangePickerSide === 'give' && player) {
            maxQ = Math.max(0, (player.gold || 0) - (draft.gold || 0));
        }
        if (maxQ <= 0 && _exchangePickerSide === 'give') {
            if (typeof addMessage === 'function') addMessage('Нет золота для добавления.', 'error');
            return;
        }
        _exchangePickerPending = { type: 'gold', maxQty: maxQ };
        _exchangePickerStep = 'quantity';
        _exchangePickerQty = Math.min(1, maxQ);
        refreshExchangeModalBody();
    }

    function exchangePickerBack() {
        if (_exchangePickerStep === 'quantity') {
            _exchangePickerStep = 'inventory';
            _exchangePickerPending = null;
        } else {
            _exchangePickerStep = null;
            _exchangePickerPending = null;
        }
        refreshExchangeModalBody();
    }

    function exchangePickerDone() {
        _exchangePickerStep = null;
        _exchangePickerPending = null;
        refreshExchangeModalBody();
    }

    function readExchangePickerQty() {
        const input = document.getElementById('exchangeQtyInput');
        const maxQ = (_exchangePickerPending && _exchangePickerPending.maxQty) || 1;
        let n = input ? parseInt(input.value, 10) : _exchangePickerQty;
        if (!Number.isFinite(n) || n < 1) n = 1;
        return Math.min(n, maxQ);
    }

    function confirmExchangePickerQty() {
        const p = _exchangePickerPending;
        if (!p || !player) return;
        const qty = readExchangePickerQty();
        const draft = getExchangeDraft(_exchangePickerSide);

        if (p.type === 'gold') {
            draft.gold = (draft.gold || 0) + qty;
        } else if (p.type === 'resource') {
            const existing = (draft.resources || []).find(function (r) { return r.name === p.name; });
            if (existing) existing.qty += qty;
            else draft.resources.push({ name: p.name, qty: qty });
        } else if (p.type === 'item') {
            draft.items.push({
                invKey: p.invKey,
                index: p.index,
                item: JSON.parse(JSON.stringify(p.item))
            });
        }
        exchangePickerDone();
    }

    function onPickInventoryCard(btn) {
        const type = btn.getAttribute('data-pick-type');
        if (type === 'resource') {
            const name = btn.getAttribute('data-pick-name');
            const maxQty = getResourceAvailable(name, _exchangePickerSide);
            if (maxQty <= 0) return;
            _exchangePickerPending = { type: 'resource', name: name, maxQty: maxQty };
            _exchangePickerStep = 'quantity';
            _exchangePickerQty = 1;
            refreshExchangeModalBody();
            return;
        }
        if (type === 'item') {
            const invKey = btn.getAttribute('data-pick-inv');
            const index = parseInt(btn.getAttribute('data-pick-idx'), 10);
            const list = player.inventory[invKey];
            if (!list || !list[index]) return;
            if (_exchangePickerSide === 'give' && typeof isGiftItemEquipped === 'function' &&
                isGiftItemEquipped(invKey, index)) {
                if (typeof addMessage === 'function') addMessage('Снимите предмет с экипировки.', 'error');
                return;
            }
            const draft = getExchangeDraft(_exchangePickerSide);
            draft.items.push({
                invKey: invKey,
                index: index,
                item: JSON.parse(JSON.stringify(list[index]))
            });
            _exchangePickerStep = 'inventory';
            refreshExchangeModalBody();
        }
    }

    function removeExchangeDraftEntry(side, kind, idx) {
        const draft = getExchangeDraft(side);
        if (kind === 'gold') draft.gold = 0;
        else if (kind === 'res' && draft.resources) draft.resources.splice(idx, 1);
        else if (kind === 'item' && draft.items) draft.items.splice(idx, 1);
        refreshExchangeModalBody();
    }

    function bindExchangeModalPanel() {
        const root = document.getElementById('exchangeModalBody');
        if (!root || root.__exchangeClickBound) return;
        root.__exchangeClickBound = true;
        root.addEventListener('click', function (ev) {
            const t = ev.target;
            const openInv = t.closest && t.closest('[data-ex-open-inv]');
            if (openInv) {
                ev.preventDefault();
                openExchangeInventoryPicker(openInv.getAttribute('data-ex-open-inv'));
                return;
            }
            const openGold = t.closest && t.closest('[data-ex-open-gold]');
            if (openGold) {
                ev.preventDefault();
                openExchangeGoldPicker(openGold.getAttribute('data-ex-open-gold'));
                return;
            }
            const rm = t.closest && t.closest('[data-ex-rm]');
            if (rm) {
                ev.preventDefault();
                removeExchangeDraftEntry(
                    rm.getAttribute('data-ex-side'),
                    rm.getAttribute('data-ex-rm'),
                    parseInt(rm.getAttribute('data-ex-idx'), 10)
                );
                return;
            }
            const card = t.closest && t.closest('.exchange-inv-card[data-pick-type]');
            if (card) {
                ev.preventDefault();
                onPickInventoryCard(card);
                return;
            }
            if (t.closest && t.closest('[data-ex-picker-done]')) {
                ev.preventDefault();
                exchangePickerDone();
                return;
            }
            if (t.closest && t.closest('[data-ex-picker-back]')) {
                ev.preventDefault();
                exchangePickerBack();
                return;
            }
            if (t.closest && t.closest('[data-ex-qty-confirm]')) {
                ev.preventDefault();
                confirmExchangePickerQty();
                return;
            }
            const deltaBtn = t.closest && t.closest('[data-ex-qty-delta]');
            if (deltaBtn) {
                ev.preventDefault();
                const d = parseInt(deltaBtn.getAttribute('data-ex-qty-delta'), 10);
                const maxQ = (_exchangePickerPending && _exchangePickerPending.maxQty) || 1;
                _exchangePickerQty = Math.min(maxQ, Math.max(1, readExchangePickerQty() + d));
                const input = document.getElementById('exchangeQtyInput');
                if (input) input.value = String(_exchangePickerQty);
            }
        });
    }

    function refreshExchangeModalBody() {
        const body = document.getElementById('exchangeModalBody');
        if (!body) return;
        if (_exchangePickerStep === 'inventory') {
            body.innerHTML = buildExchangeInventoryPickerHtml();
        } else if (_exchangePickerStep === 'quantity') {
            body.innerHTML = buildExchangeQuantityHtml();
        } else {
            body.innerHTML = buildExchangeModalInner();
        }
        bindExchangeModalPanel();
    }

    function buildExchangeModalInner() {
        const name = escapeExHtml(_exchangeTargetName || 'друг');
        let html = '<div class="modal-exchange">';
        html += '<h3 class="modal-exchange__title">🎁 Обмен с ' + name + '</h3>';
        html += '<div class="exchange-kind-tabs">';
        html += '<button type="button" class="exchange-kind-tab' + (_exchangeKind === 'gift' ? ' exchange-kind-tab--on' : '') +
            '" onclick="setExchangeKind(\'gift\')">Подарок</button>';
        html += '<button type="button" class="exchange-kind-tab' + (_exchangeKind === 'trade' ? ' exchange-kind-tab--on' : '') +
            '" onclick="setExchangeKind(\'trade\')">Обмен</button>';
        html += '</div>';
        html += '<p class="modal-exchange__hint">' +
            (_exchangeKind === 'gift'
                ? 'Нажмите «Добавить к обмену» — откроется инвентарь. Выберите предмет или ресурс и количество.'
                : 'Укажите, что отдаёте и что хотите получить взамен (через инвентарь).') +
            '</p>';
        html += buildExchangeDraftListHtml('give', 'Вы отдаёте');
        if (_exchangeKind === 'trade') {
            html += buildExchangeDraftListHtml('want', 'Хотите получить');
        }
        html += '<div class="modal-exchange__actions">';
        html += '<button type="button" class="modal-btn modal-btn--primary" onclick="submitFriendExchange()">Отправить</button>';
        html += '<button type="button" class="modal-btn modal-btn--ghost" onclick="closeExchangeModal()">Отмена</button>';
        html += '</div></div>';
        return html;
    }

    function setExchangeKind(kind) {
        _exchangeKind = kind === 'trade' ? 'trade' : 'gift';
        if (_exchangeKind === 'gift') resetExchangeWantDraft();
        _exchangePickerStep = null;
        refreshExchangeModalBody();
    }

    function deductExchangeDraft(draft) {
        if (!player || !draft) return;
        if (draft.gold > 0) player.gold = Math.max(0, (player.gold || 0) - draft.gold);
        (draft.resources || []).forEach(function (r) {
            if (!player.resources) player.resources = {};
            player.resources[r.name] = Math.max(0, (Number(player.resources[r.name]) || 0) - r.qty);
        });
        const byKey = {};
        (draft.items || []).forEach(function (row) {
            if (!byKey[row.invKey]) byKey[row.invKey] = [];
            byKey[row.invKey].push(row.index);
        });
        Object.keys(byKey).forEach(function (invKey) {
            const list = player.inventory[invKey] || [];
            byKey[invKey].sort(function (a, b) { return b - a; }).forEach(function (idx) {
                if (idx >= 0 && idx < list.length) list.splice(idx, 1);
            });
        });
    }

    function grantExchangePayload(payload) {
        if (!player || !payload) return;
        if (typeof grantGiftPayload === 'function') {
            grantGiftPayload({ gold: payload.gold || 0, items: payload.items || [] });
        } else {
            const gold = Math.floor(Number(payload.gold) || 0);
            if (gold > 0) player.gold = (player.gold || 0) + gold;
        }
        if (!player.resources) player.resources = {};
        (payload.resources || []).forEach(function (r) {
            const name = r.name;
            const qty = Math.floor(Number(r.qty) || 0);
            if (name && qty > 0) {
                player.resources[name] = (Number(player.resources[name]) || 0) + qty;
            }
        });
    }

    function deductPayloadFromPlayer(payload) {
        const draft = {
            gold: payload.gold || 0,
            items: [],
            resources: (payload.resources || []).slice()
        };
        (payload.items || []).forEach(function (row) {
            const list = player.inventory[row.invType] || [];
            for (let i = 0; i < list.length; i++) {
                if (JSON.stringify(list[i]) === JSON.stringify(row.item)) {
                    draft.items.push({ invKey: row.invType, index: i });
                    break;
                }
            }
        });
        deductExchangeDraft(draft);
    }

    function openExchangeModal(targetPlayerId, targetName) {
        if (typeof getFriendsBackendKind === 'function' && getFriendsBackendKind() !== 'http') {
            if (typeof addMessage === 'function') {
                addMessage('Обмены работают через сервер Etheria (не Supabase).', 'error');
            }
            return;
        }
        _exchangeTargetId = typeof resolveFriendPlayerId === 'function'
            ? resolveFriendPlayerId(targetPlayerId)
            : String(targetPlayerId || '').trim();
        _exchangeTargetName = String(targetName || 'друг');
        if (!_exchangeTargetId) {
            if (typeof addMessage === 'function') addMessage('❌ Не удалось определить друга. Обновите список.', 'error');
            return;
        }
        _exchangeKind = 'gift';
        resetExchangeDrafts();
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        if (!modal || !content) return;
        content.innerHTML = '<div id="exchangeModalBody"></div>';
        refreshExchangeModalBody();
        modal.style.display = 'flex';
        window._exchangeModalOpen = true;
    }

    function closeExchangeModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal) modal.style.display = 'none';
        window._exchangeModalOpen = false;
        _exchangeTargetId = '';
    }

    async function submitFriendExchange() {
        if (!player || !_exchangeTargetId) return;
        const fromOffer = draftToPayload(_exchangeGiveDraft);
        if (fromOffer.gold <= 0 && !fromOffer.items.length && !fromOffer.resources.length) {
            if (typeof addMessage === 'function') addMessage('Добавьте к обмену золото, предметы или ресурсы.', 'error');
            return;
        }
        let toOffer = { gold: 0, items: [], resources: [] };
        if (_exchangeKind === 'trade') {
            toOffer = draftToPayload(_exchangeWantDraft);
            if (toOffer.gold <= 0 && !toOffer.items.length && !toOffer.resources.length) {
                if (typeof addMessage === 'function') addMessage('Укажите, что хотите получить в обмен.', 'error');
                return;
            }
        }
        const targetId = typeof resolveFriendPlayerId === 'function'
            ? resolveFriendPlayerId(_exchangeTargetId)
            : String(_exchangeTargetId || '').trim();
        const targetName = _exchangeTargetName;
        if (!targetId) {
            if (typeof addMessage === 'function') addMessage('❌ Не удалось определить друга для обмена.', 'error');
            return;
        }
        closeExchangeModal();
        try {
            if (typeof ensureFriendsOnlineSession === 'function') {
                const ok = await ensureFriendsOnlineSession({ silent: false });
                if (!ok) return;
            }
            await friendsHttpFetch('/api/v1/exchanges/send', {
                method: 'POST',
                body: {
                    toPlayerId: targetId,
                    kind: _exchangeKind,
                    fromOffer: fromOffer,
                    toOffer: toOffer
                }
            });
            deductExchangeDraft(_exchangeGiveDraft);
            if (typeof resetBaseStats === 'function') resetBaseStats();
            if (typeof saveGame === 'function') saveGame();
            if (typeof renderGame === 'function') renderGame();
            if (typeof addMessage === 'function') {
                addMessage('🎁 Предложение отправлено: ' + targetName, 'success');
            }
            await refreshExchangesList();
            if (getFriendsActiveTab() === 'exchanges' && typeof renderFriendsScreenInner === 'function') {
                renderFriendsScreenInner();
            }
        } catch (err) {
            if (typeof addMessage === 'function') {
                addMessage('❌ ' + (typeof friendsErrorMessage === 'function' ? friendsErrorMessage(err) : err.message), 'error');
            }
        }
    }

    async function refreshExchangesList() {
        if (typeof getFriendsBackendKind === 'function' && getFriendsBackendKind() !== 'http') return;
        if (_exchangeListRefreshPromise) return _exchangeListRefreshPromise;
        _exchangeListRefreshPromise = (async function () {
            try {
                if (typeof ensureFriendsOnlineSession === 'function') {
                    await ensureFriendsOnlineSession({ silent: true });
                }
            const data = await friendsHttpFetch('/api/v1/exchanges');
            _cachedExchanges = data.offers || [];
            _exchangeOffersById = {};
            _cachedExchanges.forEach(function (o) {
                if (o && o.offerId) _exchangeOffersById[o.offerId] = o;
            });
            if (Number.isFinite(data.seq)) {
                    _exchangePollSince = Math.max(_exchangePollSince, data.seq);
                }
            } catch (_) { /* offline */ }
            finally {
                _exchangeListRefreshPromise = null;
            }
        })();
        return _exchangeListRefreshPromise;
    }

    function buildFriendsTabsHtml() {
        const tab = getFriendsActiveTab();
        return '<nav class="friends-tabs" role="tablist">' +
            '<button type="button" class="friends-tab' + (tab === 'list' ? ' friends-tab--active' : '') +
            '" onclick="setFriendsActiveTab(\'list\')">👥 Друзья</button>' +
            '<button type="button" class="friends-tab' + (tab === 'exchanges' ? ' friends-tab--active' : '') +
            '" onclick="setFriendsActiveTab(\'exchanges\')">🔄 Обмены</button>' +
            '</nav>';
    }

    function renderExchangesTabHtml() {
        const pending = _cachedExchanges.filter(function (o) {
            return o.status === 'pending';
        });
        let html = '<section class="friends-panel friends-panel--exchanges">';
        html += '<h3 class="friends-panel__title">🔄 Активные обмены</h3>';
        if (!pending.length) {
            html += '<div class="friends-empty"><p class="friends-empty__title">Нет активных обменов</p>';
            html += '<p class="friends-empty__hint">Нажмите «Обмен» у друга, чтобы отправить подарок или предложить обмен.</p></div>';
        } else {
            html += '<div class="exchange-list">';
            pending.forEach(function (o) {
                const isIn = o.role === 'incoming';
                const label = isIn
                    ? 'От ' + escapeExHtml(o.fromName || 'друга')
                    : 'Для ' + escapeExHtml(o.toName || 'друга');
                const kindLabel = o.kind === 'trade' ? 'Обмен' : 'Подарок';
                html += '<article class="exchange-card exchange-card--clickable exchange-card--' +
                    (isIn ? 'incoming' : 'outgoing') + '" data-ex-offer-id="' + escapeExHtml(o.offerId) +
                    '" role="button" tabindex="0" title="Нажмите, чтобы открыть подробности">';
                html += '<div class="exchange-card__tap-hint">Нажмите для подробностей ›</div>';
                html += '<div class="exchange-card__summary">';
                html += '<div class="exchange-card__head"><span class="exchange-card__badge">' + kindLabel + '</span>';
                html += '<strong>' + label + '</strong></div>';
                html += '<p class="exchange-card__line">Отдают: ' + summarizePayload(o.fromOffer) + '</p>';
                if (o.kind === 'trade') {
                    html += '<p class="exchange-card__line">Просят: ' + summarizePayload(o.toOffer) + '</p>';
                }
                html += '</div>';
                if (isIn) {
                    html += '<div class="exchange-card__actions" data-ex-stop-prop="1">';
                    html += '<button type="button" class="action-btn" onclick="event.stopPropagation();respondFriendExchange(' +
                        jsOnclickStr(o.offerId) + ',true)">Принять</button>';
                    html += '<button type="button" class="action-btn danger" onclick="event.stopPropagation();respondFriendExchange(' +
                        jsOnclickStr(o.offerId) + ',false)">Отклонить</button>';
                    html += '</div>';
                } else {
                    html += '<p class="exchange-card__wait">Ожидание ответа друга…</p>';
                }
                html += '</article>';
            });
            html += '</div>';
        }
        html += '</section>';
        return html;
    }

    function applyExchangeAccepted(offer, asRecipient) {
        if (!offer || !player) return;
        if (asRecipient) {
            grantExchangePayload(offer.fromOffer);
            if (offer.kind === 'trade' && offer.toOffer) {
                deductPayloadFromPlayer(offer.toOffer);
            }
        } else {
            if (offer.kind === 'trade' && offer.toOffer) {
                grantExchangePayload(offer.toOffer);
            }
        }
        if (typeof resetBaseStats === 'function') resetBaseStats();
        if (typeof saveGame === 'function') saveGame();
        if (typeof renderGame === 'function') renderGame();
    }

    async function respondFriendExchange(offerId, accept) {
        const id = String(offerId || '');
        if (!id) return;
        _lastHandledIncomingId = id;
        try {
            if (typeof ensureFriendsOnlineSession === 'function') {
                await ensureFriendsOnlineSession({ silent: true });
            }
            const data = await friendsHttpFetch('/api/v1/exchanges/' + encodeURIComponent(id) + '/respond', {
                method: 'POST',
                body: { accept: !!accept }
            });
            if (accept && data.offer) {
                applyExchangeAccepted(data.offer, true);
                if (typeof addMessage === 'function') addMessage('✅ Обмен принят!', 'success');
            } else if (typeof addMessage === 'function') {
                addMessage('Обмен отклонён.', 'info');
            }
            await refreshExchangesList();
            if (typeof renderFriendsScreenInner === 'function') renderFriendsScreenInner();
        } catch (err) {
            if (typeof addMessage === 'function') {
                addMessage('❌ ' + (typeof friendsErrorMessage === 'function' ? friendsErrorMessage(err) : err.message), 'error');
            }
        }
    }

    function showExchangeInviteModal(offer) {
        if (!offer || !offer.offerId) return;
        if (window._exchangeInviteModalOpen) return;
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');
        if (!modal || !content) return;
        const name = escapeExHtml(offer.fromName || 'Друг');
        const kind = offer.kind === 'trade' ? 'предлагает обмен' : 'отправляет подарок';
        window._exchangeInviteModalOpen = true;
        window._pendingExchangeOfferId = offer.offerId;
        content.innerHTML =
            '<div class="modal-exchange modal-exchange--invite">' +
            '<div class="modal-exchange__icon" aria-hidden="true">🎁</div>' +
            '<h3 class="modal-exchange__title">Входящий обмен</h3>' +
            '<p class="modal-exchange__msg"><strong>' + name + '</strong> ' + kind + '.</p>' +
            '<p class="modal-exchange__line">Отдают: ' + summarizePayload(offer.fromOffer) + '</p>' +
            (offer.kind === 'trade'
                ? '<p class="modal-exchange__line">Просят: ' + summarizePayload(offer.toOffer) + '</p>'
                : '') +
            '<div class="modal-exchange__actions">' +
            '<button type="button" class="modal-btn modal-btn--primary" onclick="acceptExchangeInviteModal()">Принять</button>' +
            '<button type="button" class="modal-btn modal-btn--ghost" onclick="declineExchangeInviteModal()">Отклонить</button>' +
            '</div></div>';
        modal.style.display = 'flex';
    }

    function closeExchangeInviteModal() {
        const modal = document.getElementById('modalOverlay');
        if (modal) modal.style.display = 'none';
        window._exchangeInviteModalOpen = false;
        window._pendingExchangeOfferId = '';
    }

    async function acceptExchangeInviteModal() {
        const id = window._pendingExchangeOfferId;
        closeExchangeInviteModal();
        if (id) await respondFriendExchange(id, true);
    }

    async function declineExchangeInviteModal() {
        const id = window._pendingExchangeOfferId;
        closeExchangeInviteModal();
        if (id) await respondFriendExchange(id, false);
    }

    function scheduleExchangePoll(delayMs) {
        if (!_exchangePollActive) return;
        if (_exchangePollTimer) clearTimeout(_exchangePollTimer);
        _exchangePollTimer = setTimeout(exchangePollTick, delayMs == null ? 500 : delayMs);
    }

    async function exchangePollTick() {
        if (!player || typeof getFriendsBackendKind !== 'function' || getFriendsBackendKind() !== 'http') {
            scheduleExchangePoll(8000);
            return;
        }
        if (_exchangePollInFlight) return;
        if (window._exchangeModalOpen || window._exchangeInviteModalOpen || window._exchangeDetailModalOpen) {
            scheduleExchangePoll(3000);
            return;
        }
        _exchangePollInFlight = true;
        try {
            if (typeof ensureFriendsOnlineSession === 'function') {
                await ensureFriendsOnlineSession({ silent: true });
            }
            const data = await friendsHttpFetch(
                '/api/v1/exchanges/poll?since=' + encodeURIComponent(String(_exchangePollSince || 0)) +
                '&wait=18'
            );
            if (data && data.event && Number.isFinite(data.event._seq)) {
                _exchangePollSince = Math.max(_exchangePollSince, data.event._seq);
            } else if (data && Number.isFinite(data.seq)) {
                _exchangePollSince = Math.max(_exchangePollSince, data.seq);
            }
            if (data && data.incoming && data.incoming.offerId &&
                data.incoming.offerId !== _lastHandledIncomingId) {
                showExchangeInviteModal(data.incoming);
            }
            if (data && data.event) {
                const evSeq = data.event._seq || 0;
                if (evSeq > _lastHandledExchangeEventSeq) {
                    _lastHandledExchangeEventSeq = evSeq;
                    if (data.event.type === 'exchange_accepted' && data.event.offer) {
                        applyExchangeAccepted(data.event.offer, false);
                        if (typeof addMessage === 'function') {
                            addMessage('✅ Друг принял ваш обмен!', 'success');
                        }
                    } else if (data.event.type === 'exchange_declined') {
                        if (typeof addMessage === 'function') addMessage('Обмен отклонён другом.', 'info');
                    }
                    await refreshExchangesList();
                    if (friendsActiveTab === 'exchanges' && document.querySelector('.friends-screen') &&
                        typeof renderFriendsScreenInner === 'function') {
                        renderFriendsScreenInner();
                    }
                }
            }
        } catch (_) { /* offline */ }
        finally {
            _exchangePollInFlight = false;
            scheduleExchangePoll(600);
        }
    }

    function startFriendsExchangePolling() {
        if (typeof getFriendsBackendKind === 'function' && getFriendsBackendKind() !== 'http') return;
        if (_exchangePollActive) return;
        _exchangePollActive = true;
        refreshExchangesList();
        scheduleExchangePoll(1500);
    }

    function stopFriendsExchangePolling() {
        _exchangePollActive = false;
        if (_exchangePollTimer) {
            clearTimeout(_exchangePollTimer);
            _exchangePollTimer = null;
        }
    }

    function bindFriendsExchangeDelegation() {
        if (window.__friendsExchangeClickBound) return;
        document.addEventListener('click', function (e) {
            const card = e.target && e.target.closest ? e.target.closest('.exchange-card[data-ex-offer-id]') : null;
            if (card && !(e.target.closest && e.target.closest('.exchange-card__actions'))) {
                e.preventDefault();
                showExchangeDetailModal(card.getAttribute('data-ex-offer-id'));
                return;
            }
            const btn = e.target && e.target.closest ? e.target.closest('.friend-exchange-btn') : null;
            if (!btn) return;
            e.preventDefault();
            const rawId = btn.getAttribute('data-exchange-target-id');
            const name = btn.getAttribute('data-exchange-target-name') || 'друг';
            const id = typeof resolveFriendPlayerId === 'function' ? resolveFriendPlayerId(rawId) : rawId;
            if (id) openExchangeModal(id, name);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target && e.target.closest ? e.target.closest('.exchange-card[data-ex-offer-id]') : null;
            if (!card) return;
            e.preventDefault();
            showExchangeDetailModal(card.getAttribute('data-ex-offer-id'));
        });
        window.__friendsExchangeClickBound = true;
    }

    bindFriendsExchangeDelegation();

    window.getFriendsActiveTab = getFriendsActiveTab;
    window.setFriendsActiveTab = setFriendsActiveTab;
    window.buildFriendsTabsHtml = buildFriendsTabsHtml;
    window.renderExchangesTabHtml = renderExchangesTabHtml;
    window.openExchangeModal = openExchangeModal;
    window.closeExchangeModal = closeExchangeModal;
    window.setExchangeKind = setExchangeKind;
    window.submitFriendExchange = submitFriendExchange;
    window.respondFriendExchange = respondFriendExchange;
    window.refreshExchangesList = refreshExchangesList;
    window.startFriendsExchangePolling = startFriendsExchangePolling;
    window.stopFriendsExchangePolling = stopFriendsExchangePolling;
    window.acceptExchangeInviteModal = acceptExchangeInviteModal;
    window.declineExchangeInviteModal = declineExchangeInviteModal;
    window.refreshExchangeModalBody = refreshExchangeModalBody;
    window.showExchangeDetailModal = showExchangeDetailModal;
    window.closeExchangeDetailModal = closeExchangeDetailModal;
})();
