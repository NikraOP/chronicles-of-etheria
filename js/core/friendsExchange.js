/**
 * Обмены и подарки друзьям через сервер Etheria.
 */
(function () {
    let friendsActiveTab = 'list';
    let _exchangeTargetId = '';
    let _exchangeTargetName = '';
    let _exchangeKind = 'gift';
    let _exchangeWantGold = 0;
    let _exchangeWantSelected = {};
    let _cachedExchanges = [];
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

    function resetExchangeWantDraft() {
        _exchangeWantGold = 0;
        _exchangeWantSelected = {};
    }

    function isWantSelected(invKey, index) {
        const set = _exchangeWantSelected[invKey];
        return !!(set && set[index]);
    }

    function toggleExchangeWantItem(invKey, index) {
        if (typeof isGiftItemEquipped === 'function' && isGiftItemEquipped(invKey, index)) {
            if (typeof addMessage === 'function') {
                addMessage('Снимите предмет с экипировки перед выбором.', 'error');
            }
            return;
        }
        if (!_exchangeWantSelected[invKey]) _exchangeWantSelected[invKey] = {};
        if (_exchangeWantSelected[invKey][index]) {
            delete _exchangeWantSelected[invKey][index];
            if (!Object.keys(_exchangeWantSelected[invKey]).length) delete _exchangeWantSelected[invKey];
        } else {
            _exchangeWantSelected[invKey][index] = true;
        }
        refreshExchangeModalBody();
    }

    function setExchangeWantGold(value) {
        const n = Math.max(0, Math.floor(Number(value) || 0));
        _exchangeWantGold = Math.min(n, player ? player.gold || 0 : 0);
        refreshExchangeModalBody();
    }

    function peekWantPayloadFromDraft() {
        const items = [];
        Object.keys(_exchangeWantSelected).forEach(invKey => {
            Object.keys(_exchangeWantSelected[invKey]).forEach(idx => {
                const index = parseInt(idx, 10);
                const list = player.inventory[invKey];
                if (!list || index < 0 || index >= list.length) return;
                if (typeof isGiftItemEquipped === 'function' && isGiftItemEquipped(invKey, index)) return;
                items.push({
                    invType: invKey,
                    item: JSON.parse(JSON.stringify(list[index]))
                });
            });
        });
        return { gold: _exchangeWantGold, items: items };
    }

    function deductWantPayloadFromPlayer(payload) {
        const byKey = {};
        (payload.items || []).forEach(row => {
            const k = row.invType;
            if (!byKey[k]) byKey[k] = [];
            byKey[k].push(row.item);
        });
        Object.keys(byKey).forEach(invKey => {
            const list = player.inventory[invKey] || [];
            byKey[invKey].forEach(wantItem => {
                const wi = JSON.stringify(wantItem);
                for (let i = list.length - 1; i >= 0; i--) {
                    if (JSON.stringify(list[i]) === wi) {
                        list.splice(i, 1);
                        break;
                    }
                }
            });
        });
        const gold = Math.floor(Number(payload.gold) || 0);
        if (gold > 0) player.gold = Math.max(0, (player.gold || 0) - gold);
    }

    function summarizePayload(payload) {
        const gold = Math.floor(Number(payload && payload.gold) || 0);
        const n = payload && payload.items ? payload.items.length : 0;
        const parts = [];
        if (gold > 0) parts.push('💰 ' + gold);
        if (n > 0) parts.push('📦 ' + n + ' предм.');
        return parts.length ? parts.join(' · ') : 'пусто';
    }

    function buildExchangeGivePickerHtml() {
        return buildExchangePickerBlock('give', true);
    }

    function buildExchangeWantPickerHtml() {
        return buildExchangePickerBlock('want', false);
    }

    function buildExchangePickerBlock(mode, isGive) {
        if (!player) return '';
        const entries = typeof collectGiftableInventoryEntries === 'function'
            ? collectGiftableInventoryEntries()
            : [];
        const goldVal = isGive
            ? (typeof getGiftDraftGold === 'function' ? getGiftDraftGold() : 0)
            : _exchangeWantGold;
        let html = '<div class="exchange-picker" data-ex-picker="' + (isGive ? 'give' : 'want') + '">';
        html += '<label class="account-label">Золото</label>';
        html += '<input type="number" min="0" class="hero-input exchange-gold-input" data-ex-gold="' +
            (isGive ? 'give' : 'want') + '" value="' + goldVal + '">';
        html += '<p class="exchange-picker__hint">Выберите предметы (не в экипировке):</p>';
        html += '<div class="exchange-picker__grid">';
        if (!entries.length) {
            html += '<p class="exchange-picker__empty">Нет доступных предметов</p>';
        }
        entries.forEach(function (ent) {
            const sel = isGive
                ? (typeof isGiftDraftSelected === 'function' && isGiftDraftSelected(ent.invKey, ent.index))
                : isWantSelected(ent.invKey, ent.index);
            html += '<button type="button" class="exchange-picker__item' + (sel ? ' exchange-picker__item--on' : '') +
                '" data-ex-side="' + (isGive ? 'give' : 'want') + '" data-ex-inv="' + escapeExHtml(ent.invKey) +
                '" data-ex-idx="' + ent.index + '">' + escapeExHtml(ent.typeMeta.icon) + ' ' +
                escapeExHtml(ent.item.name) + '</button>';
        });
        html += '</div></div>';
        return html;
    }

    function bindExchangeModalPanel() {
        const root = document.getElementById('exchangeModalBody');
        if (!root) return;
        root.querySelectorAll('.exchange-gold-input[data-ex-gold]').forEach(function (input) {
            const side = input.getAttribute('data-ex-gold');
            const handler = function () {
                if (side === 'give') {
                    if (typeof setGiftDraftGold === 'function') setGiftDraftGold(input.value);
                } else {
                    setExchangeWantGold(input.value);
                }
            };
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        });
        root.querySelectorAll('.exchange-picker__item[data-ex-inv]').forEach(function (btn) {
            btn.addEventListener('click', function (ev) {
                ev.preventDefault();
                const side = btn.getAttribute('data-ex-side');
                const inv = btn.getAttribute('data-ex-inv');
                const idx = parseInt(btn.getAttribute('data-ex-idx'), 10);
                if (side === 'want') {
                    toggleExchangeWantItem(inv, idx);
                } else if (typeof toggleGiftDraftItem === 'function') {
                    toggleGiftDraftItem(inv, idx);
                }
            });
        });
    }

    function refreshExchangeModalBody() {
        const body = document.getElementById('exchangeModalBody');
        if (!body) return;
        body.innerHTML = buildExchangeModalInner();
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
                ? 'Отправьте золото и предметы без условий — друг примет в разделе «Обмены».'
                : 'Укажите, что отдаёте и что хотите получить взамен.') +
            '</p>';
        html += '<div class="exchange-modal__section"><h4>Вы отдаёте</h4>';
        html += buildExchangeGivePickerHtml();
        html += '</div>';
        if (_exchangeKind === 'trade') {
            html += '<div class="exchange-modal__section"><h4>Хотите получить</h4>';
            html += buildExchangeWantPickerHtml();
            html += '</div>';
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
        refreshExchangeModalBody();
    }

    function openExchangeModal(targetPlayerId, targetName) {
        if (typeof getFriendsBackendKind === 'function' && getFriendsBackendKind() !== 'http') {
            if (typeof addMessage === 'function') {
                addMessage('Обмены работают через сервер Etheria (не Supabase).', 'error');
            }
            return;
        }
        _exchangeTargetId = String(targetPlayerId || '');
        _exchangeTargetName = String(targetName || 'друг');
        _exchangeKind = 'gift';
        resetExchangeWantDraft();
        if (typeof resetGiftDraft === 'function') resetGiftDraft();
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
        const fromOffer = typeof peekGiftPayloadFromDraft === 'function'
            ? peekGiftPayloadFromDraft()
            : { gold: 0, items: [] };
        if (fromOffer.gold <= 0 && !fromOffer.items.length) {
            if (typeof addMessage === 'function') addMessage('Добавьте золото или предметы.', 'error');
            return;
        }
        let toOffer = { gold: 0, items: [] };
        if (_exchangeKind === 'trade') {
            toOffer = peekWantPayloadFromDraft();
            if (toOffer.gold <= 0 && !toOffer.items.length) {
                if (typeof addMessage === 'function') addMessage('Укажите, что хотите получить в обмен.', 'error');
                return;
            }
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
                    toPlayerId: _exchangeTargetId,
                    kind: _exchangeKind,
                    fromOffer: fromOffer,
                    toOffer: toOffer
                }
            });
            if (typeof deductGiftDraftFromPlayer === 'function') deductGiftDraftFromPlayer();
            if (typeof resetBaseStats === 'function') resetBaseStats();
            if (typeof saveGame === 'function') saveGame();
            if (typeof renderGame === 'function') renderGame();
            if (typeof addMessage === 'function') {
                addMessage('🎁 Предложение отправлено: ' + _exchangeTargetName, 'success');
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
                html += '<article class="exchange-card exchange-card--' + (isIn ? 'incoming' : 'outgoing') + '">';
                html += '<div class="exchange-card__head"><span class="exchange-card__badge">' + kindLabel + '</span>';
                html += '<strong>' + label + '</strong></div>';
                html += '<p class="exchange-card__line">Отдают: ' + summarizePayload(o.fromOffer) + '</p>';
                if (o.kind === 'trade') {
                    html += '<p class="exchange-card__line">Просят: ' + summarizePayload(o.toOffer) + '</p>';
                }
                if (isIn) {
                    html += '<div class="exchange-card__actions">';
                    html += '<button type="button" class="action-btn" onclick="respondFriendExchange(' +
                        jsOnclickStr(o.offerId) + ',true)">Принять</button>';
                    html += '<button type="button" class="action-btn danger" onclick="respondFriendExchange(' +
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
            if (typeof grantGiftPayload === 'function') grantGiftPayload(offer.fromOffer);
            if (offer.kind === 'trade' && offer.toOffer) {
                deductWantPayloadFromPlayer(offer.toOffer);
            }
        } else {
            if (offer.kind === 'trade' && offer.toOffer && typeof grantGiftPayload === 'function') {
                grantGiftPayload(offer.toOffer);
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
        if (window._exchangeModalOpen || window._exchangeInviteModalOpen) {
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
            const btn = e.target && e.target.closest ? e.target.closest('.friend-exchange-btn') : null;
            if (!btn) return;
            e.preventDefault();
            const id = btn.getAttribute('data-exchange-target-id');
            const name = btn.getAttribute('data-exchange-target-name') || 'друг';
            if (id) openExchangeModal(id, name);
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
    window.setExchangeWantGold = setExchangeWantGold;
    window.toggleExchangeWantItem = toggleExchangeWantItem;
    window.submitFriendExchange = submitFriendExchange;
    window.respondFriendExchange = respondFriendExchange;
    window.refreshExchangesList = refreshExchangesList;
    window.startFriendsExchangePolling = startFriendsExchangePolling;
    window.stopFriendsExchangePolling = stopFriendsExchangePolling;
    window.acceptExchangeInviteModal = acceptExchangeInviteModal;
    window.declineExchangeInviteModal = declineExchangeInviteModal;
    window.refreshExchangeModalBody = refreshExchangeModalBody;
})();
