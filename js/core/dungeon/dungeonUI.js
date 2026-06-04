// dungeonUI.js — хаб подземелий, карточки данжей, карта этажа

function escapeDungeonText(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
}

function dungeonUiPrepareScreen(parentFn, parentArgs) {
    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return false;
    if (typeof cancelBattleZoneStaging === 'function') cancelBattleZoneStaging();
    if (typeof uiNavOnScreenOpen === 'function') uiNavOnScreenOpen(parentFn, parentArgs || []);
    if (typeof stopGathering === 'function') stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();
    return true;
}

function isDungeonUnlocked(dungeon) {
    if (!dungeon || !player) return false;
    return player.level >= (dungeon.minLevel || 1);
}

function isDungeonDuoReady() {
    return typeof createDuoDungeonLobby === 'function' && typeof joinDuoDungeonLobby === 'function';
}
window.isDungeonUnlocked = isDungeonUnlocked;
window.isDungeonDuoReady = isDungeonDuoReady;

/**
 * @param {object} dungeon
 * @param {'card'|'detail'} variant
 * @returns {{ style: string, className: string }}
 */
function buildDungeonThemeStyle(dungeon, variant) {
    if (!dungeon) return { style: '', className: '' };
    variant = variant || 'detail';
    const theme = dungeon.theme ? Object.assign({}, dungeon.theme) : {};
    if (!theme.backgroundImage && dungeon.backgroundId && typeof getDungeonBackground === 'function') {
        const bg = getDungeonBackground(dungeon);
        if (bg && bg.image) theme.backgroundImage = bg.image;
    }
    if (!theme.bgColor && typeof getDungeonBackground === 'function') {
        const bg = getDungeonBackground(dungeon);
        if (bg && bg.bgColor) theme.bgColor = bg.bgColor;
    }
    if (!theme.bgColor && !theme.backgroundImage) return { style: '', className: '' };

    const parts = [];
    let className = '';
    if (theme.bgColor) parts.push('background:' + theme.bgColor);
    if (theme.backgroundImage) {
        const url = escapeDungeonText(theme.backgroundImage);
        const overlay = variant === 'card'
            ? 'linear-gradient(180deg, rgba(8,6,12,0.55) 0%, rgba(8,6,12,0.88) 100%)'
            : 'linear-gradient(165deg, rgba(8,6,12,0.5) 0%, rgba(8,6,12,0.88) 100%)';
        parts.push('background-image:' + overlay + ', url(' + url + ')');
        parts.push('background-size:cover');
        parts.push('background-position:center');
        className = variant === 'card' ? 'dungeon-card--themed' : 'dungeon-detail--themed';
    }
    if (!parts.length) return { style: '', className: '' };
    return {
        style: ' style="' + parts.join(';') + ';"',
        className: className
    };
}

function buildDungeonDescription(dungeon) {
    if (!dungeon) return '';
    const floors = dungeon.floors || {};
    const rooms = dungeon.roomsPerFloor || {};
    const poolLen = Array.isArray(dungeon.monsterPool) ? dungeon.monsterPool.length : 0;
    const modeLabel = dungeon.mode === 'duo' ? 'кооператив на двоих' : 'одиночное прохождение';
    return 'Процедурные комнаты (' + modeLabel + '). ' +
        (floors.min != null && floors.max != null ? floors.min + '–' + floors.max + ' этаж(ей), ' : '') +
        (rooms.min != null && rooms.max != null ? rooms.min + '–' + rooms.max + ' комнат на этаж. ' : '') +
        (poolLen ? poolLen + ' типов врагов в пуле. ' : '') +
        'Рекомендуемый уровень: ' + (dungeon.recommendedLevel || dungeon.minLevel || 1) + '.';
}

function renderDungeonModeBadge(mode) {
    const m = mode === 'duo' ? 'duo' : 'solo';
    const label = m === 'duo' ? 'Дуо' : 'Соло';
    const icon = m === 'duo' ? '👥' : '🧍';
    return '<span class="dungeon-mode-badge dungeon-mode-badge--' + m + '">' + icon + ' ' + label + '</span>';
}

function renderDungeonLevelLine(dungeon, unlocked) {
    const min = dungeon.minLevel || 1;
    const max = dungeon.maxLevel || min;
    const cls = unlocked ? '' : ' dungeon-card__level--locked';
    return '<div class="dungeon-card__level' + cls + '">⭐ Ур. ' + min + (max > min ? '–' + max : '') + '</div>';
}

function showDungeonsHub() {
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    if (session && !session.committed && typeof abandonDungeonRun === 'function') {
        abandonDungeonRun(false);
    }
    if (!dungeonUiPrepareScreen('renderGame', [])) return;
    const el = document.getElementById('dynamicContent');
    if (!el) return;

    const list = typeof DUNGEONS_DB !== 'undefined' && Array.isArray(DUNGEONS_DB) ? DUNGEONS_DB : [];
    let cards = '';

    list.forEach(function (dungeon) {
        const unlocked = isDungeonUnlocked(dungeon);
        const id = escapeDungeonText(dungeon.id);
        const click = unlocked ? 'openDungeonDetail(\'' + String(dungeon.id).replace(/'/g, "\\'") + '\')' : '';
        const themeUi = buildDungeonThemeStyle(dungeon, 'card');
        cards += '<div class="dungeon-card' + (unlocked ? '' : ' locked') +
            (themeUi.className ? ' ' + themeUi.className : '') + '"' +
            themeUi.style +
            (click ? ' onclick="' + click + '"' : '') +
            ' role="button" tabindex="' + (unlocked ? '0' : '-1') + '"' +
            (unlocked ? '' : ' aria-disabled="true"') + '>' +
            '<div class="dungeon-card__badges">' + renderDungeonModeBadge(dungeon.mode) + '</div>' +
            '<div class="dungeon-card__icon">' + escapeDungeonText(dungeon.icon || '🏰') + '</div>' +
            renderDungeonLevelLine(dungeon, unlocked) +
            '<div class="dungeon-card__name">' + escapeDungeonText(dungeon.name) + '</div>' +
            '<div class="dungeon-card__hint">' + (unlocked ? 'Подробнее →' : '🔒 Нужен ур. ' + (dungeon.minLevel || 1)) + '</div>' +
            '</div>';
    });

    if (!cards) {
        cards = '<p class="dungeon-hub__empty">Каталог подземелий пока пуст.</p>';
    }

    el.innerHTML =
        '<section class="dungeon-hub">' +
        '<div class="dungeon-hub__header">' +
        '<h2>🏰 Подземелья</h2>' +
        '<p class="dungeon-hub__intro">Процедурные данжи: соло или вдвоём онлайн. Выберите подземелье по уровню.</p>' +
        '</div>' +
        '<div class="dungeon-grid">' + cards + '</div>' +
        '</section>';
}

function openDungeonDetail(dungeonId) {
    if (!dungeonUiPrepareScreen('showDungeonsHub', [])) return;
    const el = document.getElementById('dynamicContent');
    if (!el) return;

    const hasSession = typeof getDungeonRunSession === 'function' && getDungeonRunSession();
    if (!hasSession && typeof tryResumeActiveDungeonRun === 'function') {
        tryResumeActiveDungeonRun(dungeonId);
    }

    const dungeon = typeof getDungeonById === 'function'
        ? getDungeonById(dungeonId)
        : (typeof DUNGEONS_DB !== 'undefined' ? DUNGEONS_DB.find(function (d) { return d.id === dungeonId; }) : null);

    if (!dungeon) {
        if (typeof addMessage === 'function') addMessage('Подземелье не найдено.', 'error');
        showDungeonsHub();
        return;
    }

    const unlocked = isDungeonUnlocked(dungeon);
    const idSafe = String(dungeon.id).replace(/'/g, "\\'");
    const desc = buildDungeonDescription(dungeon);
    const duoReady = isDungeonDuoReady();
    const isDuo = dungeon.mode === 'duo';
    const themeUi = buildDungeonThemeStyle(dungeon, 'detail');

    let actions = '<button type="button" class="action-btn dungeon-detail__back" onclick="showDungeonsHub()">← К списку</button>';

    const runSession = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    const soloSession = typeof getSoloDungeonSession === 'function' ? getSoloDungeonSession() : null;
    const soloActive = soloSession && soloSession.dungeonId === dungeon.id && soloSession.state === 'in_room';
    const duoRunActive = runSession && runSession.mode === 'duo' && runSession.dungeonId === dungeon.id &&
        (runSession.state === 'in_room' || runSession.state === 'loot');
    const duoState = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    const duoInLobby = isDuo && duoState && duoState.status !== 'idle' && !duoRunActive;

    if (unlocked) {
        if (soloActive || duoRunActive) {
            const battleLabel = duoRunActive && duoState && duoState.role === 'guest'
                ? '⚔️ Запросить бой'
                : '⚔️ В бой';
            actions += '<button type="button" class="action-btn dungeon-detail__enter" onclick="dungeonUiStartRoomBattle()">' +
                battleLabel + '</button>';
            if (runSession && runSession.committed) {
                actions += '<button type="button" class="action-btn modal-btn--ghost" onclick="dungeonUiAbandonRun()">Покинуть забег</button>';
            }
            if (duoRunActive && duoState && duoState.role === 'guest') {
                actions += '<p class="dungeon-detail__hint">Ход картой и награды синхронизирует хост.</p>';
            }
        }
        if (isDuo && !duoRunActive) {
            const duoClickCreate = duoReady
                ? 'dungeonUiCreateDuoRoom(\'' + idSafe + '\')'
                : 'dungeonUiDuoSoon()';
            const duoClickJoin = duoReady
                ? 'dungeonUiJoinDuoRoom(\'' + idSafe + '\')'
                : 'dungeonUiDuoSoon()';
            actions +=
                '<button type="button" class="action-btn" onclick="' + duoClickCreate + '">Создать комнату</button>' +
                '<button type="button" class="action-btn" onclick="' + duoClickJoin + '">Присоединиться</button>';
        } else if (!soloActive) {
            actions += '<button type="button" class="action-btn dungeon-detail__enter" onclick="dungeonUiEnterSolo(\'' + idSafe + '\')">Войти</button>';
        }
    } else {
        actions += '<p class="dungeon-detail__locked-msg">🔒 Требуется уровень ' + (dungeon.minLevel || 1) + '+</p>';
    }

    const floorMap = typeof renderDungeonFloorMap === 'function' ? renderDungeonFloorMap() : '';

    el.innerHTML =
        '<section class="dungeon-hub dungeon-hub--detail">' +
        '<div class="dungeon-detail' + (themeUi.className ? ' ' + themeUi.className : '') + '"' + themeUi.style + '>' +
        '<div class="dungeon-detail__hero">' +
        '<span class="dungeon-detail__icon">' + escapeDungeonText(dungeon.icon || '🏰') + '</span>' +
        '<div class="dungeon-detail__titles">' +
        '<h2>' + escapeDungeonText(dungeon.name) + '</h2>' +
        renderDungeonModeBadge(dungeon.mode) +
        '</div>' +
        '</div>' +
        renderDungeonLevelLine(dungeon, unlocked) +
        '<p class="dungeon-detail__desc">' + escapeDungeonText(desc) + '</p>' +
        (floorMap ? '<div class="dungeon-detail__map-wrap">' + floorMap + '</div>' : '') +
        '<div class="dungeon-detail__actions">' + actions + '</div>' +
        '</div>' +
        '</section>';
}

function dungeonUiEnterSolo(dungeonId) {
    if (!isDungeonUnlocked(typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null)) {
        if (typeof addMessage === 'function') addMessage('Уровень слишком низкий для этого подземелья.', 'error');
        return;
    }
    if (typeof startSoloDungeon === 'function') {
        const session = startSoloDungeon(dungeonId);
        if (!session) return;
        if (typeof commitDungeonRun === 'function') commitDungeonRun();
        openDungeonDetail(dungeonId);
        return;
    }
    if (typeof addMessage === 'function') {
        addMessage('Соло-подземелье скоро будет доступно.', 'info');
    }
}

function dungeonUiStartRoomBattle() {
    if (typeof enterCurrentRoomBattle !== 'function') return;
    if (!enterCurrentRoomBattle()) return;
    if (typeof isBattleZoneStaging === 'function' && isBattleZoneStaging() &&
        typeof commitBattleStart === 'function') {
        commitBattleStart();
    }
}

function dungeonUiAbandonRun() {
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    if (session && session.mode === 'duo' && typeof forfeitDuoDungeon === 'function') {
        forfeitDuoDungeon();
        return;
    }
    if (typeof abandonDungeonRun === 'function') abandonDungeonRun(true);
    if (typeof showDungeonsHub === 'function') showDungeonsHub();
}

function dungeonUiDuoSoon() {
    if (typeof addMessage === 'function') {
        addMessage('Дуо-модуль не загружен. Обновите страницу (Ctrl+F5).', 'error');
    }
}

function dungeonUiCreateDuoRoom(dungeonId) {
    if (!isDungeonDuoReady()) {
        dungeonUiDuoSoon();
        return;
    }
    createDuoDungeonLobby(dungeonId).then(function (ok) {
        if (ok && typeof showDuoDungeonLobbyScreen === 'function') {
            showDuoDungeonLobbyScreen();
            return;
        }
        if (!ok && typeof addMessage === 'function') {
            addMessage('Не удалось создать дуо-комнату. Проверьте сеть или обновите API на сервере.', 'error');
        }
    });
}

function dungeonUiJoinDuoRoom(_dungeonId) {
    if (!isDungeonDuoReady()) {
        dungeonUiDuoSoon();
        return;
    }
    dungeonUiJoinDuoRoomPrompt();
}

function buildDuoLobbyPortraitHtml(snapshot) {
    if (!snapshot) return '<div class="dungeon-duo-lobby__avatar dungeon-duo-lobby__avatar--empty">👤</div>';
    if (snapshot.schoolImg && typeof resolveGameAssetUrl === 'function') {
        const src = resolveGameAssetUrl(snapshot.schoolImg);
        const fb = escapeDungeonText(snapshot.class || '⚔️');
        return '<div class="dungeon-duo-lobby__avatar"><img src="' + src + '" alt="" onerror="this.remove();this.parentElement.classList.add(\'dungeon-duo-lobby__avatar--emoji\');this.parentElement.textContent=\'' + fb + '\'"></div>';
    }
    return '<div class="dungeon-duo-lobby__avatar dungeon-duo-lobby__avatar--emoji">' + escapeDungeonText(snapshot.class ? snapshot.class.charAt(0) : '👤') + '</div>';
}

function renderDuoLobbyPlayerCard(label, snapshot, ready, opts) {
    opts = opts || {};
    const readyCls = ready ? ' dungeon-duo-lobby__slot--ready' : '';
    const waitingCls = opts.waiting ? ' dungeon-duo-lobby__slot--waiting' : '';
    const readyText = ready ? '✓ Готов' : 'Не готов';
    const readyBadgeCls = ready ? ' dungeon-duo-lobby__ready-badge--on' : '';
    let body = '';
    if (opts.waiting) {
        body = '<p class="dungeon-duo-lobby__slot-hint">Друг ещё не вошёл по коду комнаты</p>';
    } else if (snapshot) {
        body = '<div class="dungeon-duo-lobby__slot-name">' + escapeDungeonText(snapshot.name) + '</div>' +
            '<div class="dungeon-duo-lobby__slot-meta">' + escapeDungeonText(snapshot.class) +
            (snapshot.branch ? ' · ' + escapeDungeonText(snapshot.branch) : '') +
            ' · ур. ' + (snapshot.level || 1) + '</div>';
    }
    return '<article class="dungeon-duo-lobby__slot' + readyCls + waitingCls + '">' +
        '<div class="dungeon-duo-lobby__slot-head">' +
        '<span class="dungeon-duo-lobby__slot-role">' + escapeDungeonText(label) + '</span>' +
        '<span class="dungeon-duo-lobby__ready-badge' + readyBadgeCls + '">' + readyText + '</span>' +
        '</div>' +
        buildDuoLobbyPortraitHtml(snapshot) +
        body +
        '</article>';
}

function renderDuoLobbyConnectionBanner(duo) {
    if (duo.status === 'sync') {
        return '<div class="dungeon-duo-lobby__banner dungeon-duo-lobby__banner--sync">' +
            '<span class="dungeon-duo-lobby__banner-icon">✨</span>' +
            '<div><strong>Забег синхронизирован</strong><p>Оба готовы — можно начинать прохождение</p></div></div>';
    }
    if (!duo.partnerConnected) {
        const hint = duo.role === 'host'
            ? 'Отправьте другу код комнаты — он появится здесь после входа'
            : 'Подключение к комнате… если долго нет хоста — проверьте код';
        return '<div class="dungeon-duo-lobby__banner dungeon-duo-lobby__banner--wait">' +
            '<span class="dungeon-duo-lobby__banner-icon">⏳</span>' +
            '<div><strong>Ждём друга</strong><p>' + hint + '</p></div></div>';
    }
    if (duo.localReady && duo.remoteReady) {
        return '<div class="dungeon-duo-lobby__banner dungeon-duo-lobby__banner--ok">' +
            '<span class="dungeon-duo-lobby__banner-icon">✅</span>' +
            '<div><strong>Друг в комнате</strong><p>Оба отметили готовность — генерируем забег…</p></div></div>';
    }
    return '<div class="dungeon-duo-lobby__banner dungeon-duo-lobby__banner--ok">' +
        '<span class="dungeon-duo-lobby__banner-icon">👥</span>' +
        '<div><strong>Друг в комнате</strong><p>' +
        (duo.remoteReady ? 'Партнёр готов — нажмите «Готов», если ещё не отметились' : 'Партнёр подключился, ждёт вашей готовности') +
        '</p></div></div>';
}

function renderDuoLobbyLogHtml(log) {
    if (!log || !log.length) return '';
    let rows = '';
    for (let i = 0; i < Math.min(log.length, 6); i++) {
        const row = log[i];
        rows += '<li class="dungeon-duo-lobby__log-item dungeon-duo-lobby__log-item--' +
            escapeDungeonText(row.type || 'info') + '">' +
            '<span class="dungeon-duo-lobby__log-time">' + escapeDungeonText(row.time) + '</span> ' +
            escapeDungeonText(row.message) + '</li>';
    }
    return '<ul class="dungeon-duo-lobby__log">' + rows + '</ul>';
}

function dungeonUiToggleReady() {
    if (typeof toggleDuoDungeonLobbyReady !== 'function') return;
    const before = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    toggleDuoDungeonLobbyReady();
    const after = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (typeof addMessage === 'function' && after && after.status === 'lobby') {
        if (after.localReady && !after.partnerConnected) {
            addMessage('✅ Вы готовы. Ждём друга по коду ' + after.roomCode, 'success');
        } else if (!after.localReady) {
            addMessage('Готовность снята', 'info');
        } else if (after.localReady && after.partnerConnected && !after.remoteReady) {
            addMessage('✅ Вы готовы. Ждём готовности друга', 'info');
        }
    }
    if (!before || !after) return;
}

function dungeonUiCopyDuoCode(code) {
    const text = String(code || '').trim();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            if (typeof addMessage === 'function') addMessage('📋 Код скопирован: ' + text, 'success');
        }).catch(function () {
            if (typeof addMessage === 'function') addMessage('Код: ' + text, 'info');
        });
    } else if (typeof addMessage === 'function') {
        addMessage('Код комнаты: ' + text, 'info');
    }
}

function showDuoDungeonLobbyScreen() {
    if (!dungeonUiPrepareScreen('showDungeonsHub', [])) return;
    const el = document.getElementById('dynamicContent');
    if (!el) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || duo.status === 'idle') {
        showDungeonsHub();
        return;
    }
    const dungeon = duo.dungeonId && typeof getDungeonById === 'function' ? getDungeonById(duo.dungeonId) : null;
    const dungeonName = dungeon ? dungeon.name : (duo.dungeonId || 'определяется хостом');
    const localSnap = typeof buildDuoLobbyPlayerSnapshot === 'function'
        ? buildDuoLobbyPlayerSnapshot()
        : (typeof player !== 'undefined' && player
            ? { name: player.name, class: player.class, branch: player.branch, level: player.level, schoolImg: player.schoolImg }
            : null);
    const partnerSnap = duo.partnerConnected ? duo.remoteSnapshot : null;

    let actions = '';
    if (duo.status === 'lobby') {
        const readyCls = duo.localReady ? ' dungeon-duo-lobby__btn-ready--active' : '';
        actions += '<button type="button" class="action-btn dungeon-duo-lobby__btn-ready' + readyCls +
            '" onclick="dungeonUiToggleReady()">' +
            (duo.localReady ? '✓ Вы готовы (нажмите, чтобы снять)' : 'Готов — ждать друга') + '</button>';
    }
    if (duo.status === 'sync') {
        actions += '<button type="button" class="action-btn dungeon-detail__enter" onclick="dungeonUiStartDuoRun()">▶ Начать забег</button>';
    }
    actions += '<button type="button" class="action-btn modal-btn--ghost" onclick="leaveDuoDungeonLobby();showDungeonsHub()">Выйти из комнаты</button>';

    const roleLabel = duo.role === 'host' ? 'Хост' : 'Гость';

    el.innerHTML =
        '<section class="dungeon-hub dungeon-duo-lobby">' +
        '<header class="dungeon-duo-lobby__header">' +
        '<h2 class="dungeon-duo-lobby__title">👥 Дуо-комната</h2>' +
        '<p class="dungeon-duo-lobby__subtitle">' + escapeDungeonText(dungeonName) +
        ' · ' + escapeDungeonText(roleLabel) +
        ' · <span class="dungeon-duo-lobby__transport">' + escapeDungeonText(duo.transportLabel || 'Сеть') + '</span></p>' +
        '</header>' +
        renderDuoLobbyConnectionBanner(duo) +
        '<div class="dungeon-duo-lobby__code-block">' +
        '<span class="dungeon-duo-lobby__code-label">Код для друга</span>' +
        '<div class="dungeon-duo-lobby__code-row">' +
        '<strong class="dungeon-duo-lobby__code-value">' + escapeDungeonText(duo.roomCode) + '</strong>' +
        '<button type="button" class="action-btn dungeon-duo-lobby__copy" onclick="dungeonUiCopyDuoCode(\'' +
        escapeDungeonText(duo.roomCode).replace(/'/g, "\\'") + '\')">Копировать</button>' +
        '</div></div>' +
        '<div class="dungeon-duo-lobby__roster">' +
        renderDuoLobbyPlayerCard('Вы', localSnap, duo.localReady, {}) +
        renderDuoLobbyPlayerCard('Друг', partnerSnap, duo.remoteReady, { waiting: !duo.partnerConnected }) +
        '</div>' +
        renderDuoLobbyLogHtml(duo.log) +
        '<div class="dungeon-detail__actions dungeon-duo-lobby__actions">' + actions + '</div>' +
        '</section>';
}

function dungeonUiStartDuoRun() {
    if (typeof startDuoDungeonFromLobby !== 'function') return;
    const session = startDuoDungeonFromLobby();
    if (!session) return;
    if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('run');
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (duo && duo.dungeonId) openDungeonDetail(duo.dungeonId);
}

function dungeonUiJoinDuoRoomPrompt() {
    const code = typeof prompt === 'function'
        ? prompt('Введите код комнаты дуо-данжа (6 символов):', '')
        : '';
    if (!code) return;
    joinDuoDungeonLobby(code).then(function (ok) {
        if (ok && typeof showDuoDungeonLobbyScreen === 'function') showDuoDungeonLobbyScreen();
        else if (!ok && typeof addMessage === 'function') {
            addMessage('Не удалось войти в комнату. Проверьте код и сеть.', 'error');
        }
    });
}

function getActiveDungeonSession() {
    const raw = typeof getDungeonRunSession === 'function' ? getDungeonRunSession()
        : (typeof getDungeonSession === 'function' ? getDungeonSession() : null);
    if (!raw || !raw.run) return null;
    const fi = raw.floorIndex || 0;
    if (typeof ensureFloorGenerated === 'function') ensureFloorGenerated(raw.run, fi);
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(raw.dungeonId) : null;
    const totalFloors = typeof getRunFloorCount === 'function' ? getRunFloorCount(raw.run) : 0;
    const rp = dungeon && dungeon.roomsPerFloor;
    const estimatedRooms = rp
        ? Math.round(((rp.min || 5) + (rp.max || 7)) / 2)
        : 6;
    const floorsArr = [];
    for (let i = 0; i < totalFloors; i++) {
        const f = typeof getFloorFromRun === 'function' ? getFloorFromRun(raw.run, i) : raw.run.floors[i];
        if (f) {
            floorsArr.push(f);
        } else {
            floorsArr.push({
                index: i,
                placeholder: true,
                estimatedRooms: estimatedRooms,
                rooms: null
            });
        }
    }
    return {
        dungeonId: raw.dungeonId,
        dungeonName: dungeon ? dungeon.name : '',
        floorIndex: fi,
        roomIndex: raw.roomIndex,
        totalFloors: totalFloors,
        floors: floorsArr
    };
}

function resolveRoomArchetypeIcon(room) {
    if (!room) return '🚪';
    if (room.icon) return room.icon;
    const archetypeId = room.archetype || room.archetypeId;
    if (archetypeId && typeof ROOM_ARCHETYPES !== 'undefined' && ROOM_ARCHETYPES[archetypeId]) {
        return ROOM_ARCHETYPES[archetypeId].icon || '🚪';
    }
    if (room.cleared) return '✅';
    return '🚪';
}

/**
 * Полоса комнат текущего этажа активного dungeonSession.
 * @returns {string} HTML или пустая строка
 */
function renderDungeonFloorTower(session) {
    const totalFloors = session.totalFloors || session.floors.length;
    if (!totalFloors) return '';
    const floorIndex = typeof session.floorIndex === 'number' ? session.floorIndex : 0;
    const roomIndex = typeof session.roomIndex === 'number' ? session.roomIndex : 0;
    let chips = '';
    for (let fi = 0; fi < totalFloors; fi++) {
        const floor = session.floors[fi];
        let state = 'locked';
        if (fi < floorIndex) state = 'cleared';
        else if (fi === floorIndex) state = 'current';
        const roomTotal = floor && floor.rooms && floor.rooms.length
            ? floor.rooms.length
            : (floor && floor.estimatedRooms ? floor.estimatedRooms : '?');
        const progress = fi < floorIndex
            ? 'пройден'
            : (fi === floorIndex
                ? 'комн. ' + (roomIndex + 1) + ' / ' + roomTotal
                : '~' + roomTotal + ' комн.');
        chips += '<div class="dungeon-tower__floor dungeon-tower__floor--' + state + '">' +
            '<span class="dungeon-tower__num">' + (fi + 1) + '</span>' +
            '<span class="dungeon-tower__label">Этаж ' + (fi + 1) + '</span>' +
            '<span class="dungeon-tower__meta">' + escapeDungeonText(String(progress)) + '</span>' +
            '</div>';
        if (fi < totalFloors - 1) {
            chips += '<div class="dungeon-tower__link' + (fi < floorIndex ? ' dungeon-tower__link--done' : '') + '" aria-hidden="true"></div>';
        }
    }
    return '<div class="dungeon-tower" role="list" aria-label="Этажи подземелья">' + chips + '</div>';
}

function renderDungeonFloorMap() {
    const session = getActiveDungeonSession();
    if (!session || !session.floors || !session.floors.length) return '';

    const floorIndex = typeof session.floorIndex === 'number' ? session.floorIndex : 0;
    const roomIndex = typeof session.roomIndex === 'number' ? session.roomIndex : 0;
    const floor = session.floors[floorIndex];
    if (!floor) return '';
    const rawSession = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    if (floor.placeholder && !floor.rooms && rawSession && rawSession.run && typeof ensureFloorGenerated === 'function') {
        ensureFloorGenerated(rawSession.run, floorIndex);
        const regen = typeof getFloorFromRun === 'function'
            ? getFloorFromRun(rawSession.run, floorIndex)
            : null;
        if (regen) session.floors[floorIndex] = regen;
    }
    const resolvedFloor = session.floors[floorIndex];
    if (!resolvedFloor || !Array.isArray(resolvedFloor.rooms) || resolvedFloor.rooms.length === 0) {
        const towerOnly = renderDungeonFloorTower(session);
        return '<div class="dungeon-run-map">' + towerOnly +
            '<p class="dungeon-floor-map__legend">Этаж загружается при входе в комнату.</p></div>';
    }
    const floorRooms = resolvedFloor;

    const floorNum = floorIndex + 1;
    const totalFloors = session.totalFloors || session.floors.length;
    const roomTotal = floorRooms.rooms.length;
    const towerHtml = renderDungeonFloorTower(session);
    let nodes = '';

    let listHtml = '';
    const currentRoom = floorRooms.rooms[roomIndex];

    floorRooms.rooms.forEach(function (room, i) {
        let state = 'upcoming';
        if (i < roomIndex || room.cleared) state = 'cleared';
        else if (i === roomIndex) state = 'current';

        const icon = resolveRoomArchetypeIcon(room);
        const title = room.title || room.name || ('Комната ' + (i + 1));
        const desc = room.desc || '';
        const statusLabel = state === 'current' ? 'Сейчас' : (state === 'cleared' ? 'Пройдено' : 'Впереди');

        nodes += '<div class="dungeon-floor-room dungeon-floor-room--' + state + '" title="' + escapeDungeonText(title) + '">' +
            '<span class="dungeon-floor-room__icon" aria-hidden="true">' + escapeDungeonText(icon) + '</span>' +
            '<span class="dungeon-floor-room__idx">' + (i + 1) + '</span>' +
            '</div>';
        if (i < floorRooms.rooms.length - 1) {
            nodes += '<div class="dungeon-floor-map__connector' + (i < roomIndex ? ' dungeon-floor-map__connector--done' : '') + '" aria-hidden="true"></div>';
        }

        listHtml += '<li class="dungeon-floor-list__item dungeon-floor-list__item--' + state + '">' +
            '<div class="dungeon-floor-list__head">' +
            '<span class="dungeon-floor-list__icon">' + escapeDungeonText(icon) + '</span>' +
            '<span class="dungeon-floor-list__title">' + escapeDungeonText(title) + '</span>' +
            '<span class="dungeon-floor-list__badge">' + escapeDungeonText(statusLabel) + '</span>' +
            '</div>' +
            (desc ? '<p class="dungeon-floor-list__desc">' + escapeDungeonText(desc) + '</p>' : '') +
            '</li>';
    });

    const dungeonName = session.dungeonName || (session.dungeonId && typeof getDungeonById === 'function'
        ? (getDungeonById(session.dungeonId) || {}).name
        : '') || 'Подземелье';

    const currentTitle = currentRoom && (currentRoom.title || currentRoom.name) ? currentRoom.title : ('Комната ' + (roomIndex + 1));
    const currentDesc = currentRoom && currentRoom.desc
        ? currentRoom.desc
        : 'Нажмите «В бой», чтобы начать схватку. В бою выберите цель — над ней появится 🎯.';

    return '<div class="dungeon-run-map">' +
        towerHtml +
        '<div class="dungeon-floor-map" role="navigation" aria-label="Карта этажа">' +
        '<div class="dungeon-floor-map__head">' +
        '<span class="dungeon-floor-map__title">' + escapeDungeonText(dungeonName) + '</span>' +
        '<span class="dungeon-floor-map__meta">' +
        '<span class="dungeon-floor-map__floor">Этаж ' + floorNum + ' / ' + totalFloors + '</span>' +
        '<span class="dungeon-floor-map__room">Комната ' + (roomIndex + 1) + ' / ' + roomTotal + '</span>' +
        '</span>' +
        '</div>' +
        '<p class="dungeon-floor-map__legend">🟡 — вы здесь · ✅ — пройдено · ⚪ — впереди. В бою 2–3 врага (в соло слабее, чем в дуо).</p>' +
        '<div class="dungeon-floor-map__track">' + nodes + '</div>' +
        '<div class="dungeon-floor-map__current">' +
        '<h3 class="dungeon-floor-map__current-title">▶ ' + escapeDungeonText(currentTitle) + '</h3>' +
        '<p class="dungeon-floor-map__current-desc">' + escapeDungeonText(currentDesc) + '</p>' +
        '</div>' +
        '<ul class="dungeon-floor-list">' + listHtml + '</ul>' +
        '</div></div>';
}

window.showDungeonsHub = showDungeonsHub;
window.openDungeonDetail = openDungeonDetail;
window.renderDungeonFloorMap = renderDungeonFloorMap;
window.dungeonUiEnterSolo = dungeonUiEnterSolo;
window.dungeonUiDuoSoon = dungeonUiDuoSoon;
window.dungeonUiCreateDuoRoom = dungeonUiCreateDuoRoom;
window.dungeonUiJoinDuoRoom = dungeonUiJoinDuoRoom;
window.dungeonUiStartRoomBattle = dungeonUiStartRoomBattle;
window.dungeonUiAbandonRun = dungeonUiAbandonRun;
window.showDuoDungeonLobbyScreen = showDuoDungeonLobbyScreen;
window.dungeonUiToggleReady = dungeonUiToggleReady;
window.dungeonUiCopyDuoCode = dungeonUiCopyDuoCode;
window.dungeonUiStartDuoRun = dungeonUiStartDuoRun;
window.dungeonUiJoinDuoRoomPrompt = dungeonUiJoinDuoRoomPrompt;
