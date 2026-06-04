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
    if (!dungeonUiPrepareScreen('renderGame', [])) return;
    const el = document.getElementById('dynamicContent');
    if (!el) return;

    const list = typeof DUNGEONS_DB !== 'undefined' && Array.isArray(DUNGEONS_DB) ? DUNGEONS_DB : [];
    let cards = '';

    list.forEach(function (dungeon) {
        const unlocked = isDungeonUnlocked(dungeon);
        const id = escapeDungeonText(dungeon.id);
        const click = unlocked ? 'openDungeonDetail(\'' + String(dungeon.id).replace(/'/g, "\\'") + '\')' : '';
        cards += '<div class="dungeon-card' + (unlocked ? '' : ' locked') + '"' +
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
    const themeStyle = dungeon.theme && dungeon.theme.bgColor
        ? ' style="background:' + escapeDungeonText(dungeon.theme.bgColor) + ';"'
        : '';

    let actions = '<button type="button" class="action-btn dungeon-detail__back" onclick="showDungeonsHub()">← К списку</button>';

    const soloSession = typeof getSoloDungeonSession === 'function' ? getSoloDungeonSession() : null;
    const soloActive = soloSession && soloSession.dungeonId === dungeon.id && soloSession.state === 'in_room';

    if (unlocked) {
        if (soloActive) {
            actions += '<button type="button" class="action-btn dungeon-detail__enter" onclick="dungeonUiStartRoomBattle()">⚔️ В бой</button>';
        }
        if (isDuo) {
            const duoClickCreate = duoReady
                ? 'dungeonUiCreateDuoRoom(\'' + idSafe + '\')'
                : 'dungeonUiDuoSoon()';
            const duoClickJoin = duoReady
                ? 'dungeonUiJoinDuoRoom(\'' + idSafe + '\')'
                : 'dungeonUiDuoSoon()';
            actions +=
                '<button type="button" class="action-btn" onclick="' + duoClickCreate + '">Создать комнату</button>' +
                '<button type="button" class="action-btn" onclick="' + duoClickJoin + '">Присоединиться</button>';
        } else {
            actions += '<button type="button" class="action-btn dungeon-detail__enter" onclick="dungeonUiEnterSolo(\'' + idSafe + '\')">Войти</button>';
        }
    } else {
        actions += '<p class="dungeon-detail__locked-msg">🔒 Требуется уровень ' + (dungeon.minLevel || 1) + '+</p>';
    }

    const floorMap = typeof renderDungeonFloorMap === 'function' ? renderDungeonFloorMap() : '';

    el.innerHTML =
        '<section class="dungeon-hub dungeon-hub--detail">' +
        '<div class="dungeon-detail"' + themeStyle + '>' +
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

function dungeonUiDuoSoon() {
    if (typeof addMessage === 'function') {
        addMessage('Дуо-подземелья — скоро.', 'info');
    } else {
        alert('скоро');
    }
}

function dungeonUiCreateDuoRoom(dungeonId) {
    if (!isDungeonDuoReady()) {
        dungeonUiDuoSoon();
        return;
    }
    createDuoDungeonLobby(dungeonId);
}

function dungeonUiJoinDuoRoom(dungeonId) {
    if (!isDungeonDuoReady()) {
        dungeonUiDuoSoon();
        return;
    }
    joinDuoDungeonLobby(dungeonId);
}

function getActiveDungeonSession() {
    const raw = typeof getDungeonSession === 'function' ? getDungeonSession() : null;
    if (!raw || !raw.run) return null;
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(raw.dungeonId) : null;
    return {
        dungeonId: raw.dungeonId,
        dungeonName: dungeon ? dungeon.name : '',
        floorIndex: raw.floorIndex,
        roomIndex: raw.roomIndex,
        floors: raw.run.floors
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
function renderDungeonFloorMap() {
    const session = getActiveDungeonSession();
    if (!session || !Array.isArray(session.floors)) return '';

    const floorIndex = typeof session.floorIndex === 'number' ? session.floorIndex : 0;
    const roomIndex = typeof session.roomIndex === 'number' ? session.roomIndex : 0;
    const floor = session.floors[floorIndex];
    if (!floor || !Array.isArray(floor.rooms) || floor.rooms.length === 0) return '';

    const floorNum = floorIndex + 1;
    const totalFloors = session.floors.length;
    let nodes = '';

    floor.rooms.forEach(function (room, i) {
        let state = 'upcoming';
        if (i < roomIndex || room.cleared) state = 'cleared';
        else if (i === roomIndex) state = 'current';

        const icon = resolveRoomArchetypeIcon(room);
        const label = room.name || (typeof ROOM_ARCHETYPES !== 'undefined' && room.archetype && ROOM_ARCHETYPES[room.archetype]
            ? ROOM_ARCHETYPES[room.archetype].name
            : 'Комната ' + (i + 1));

        nodes += '<div class="dungeon-floor-room dungeon-floor-room--' + state + '" title="' + escapeDungeonText(label) + '">' +
            '<span class="dungeon-floor-room__icon" aria-hidden="true">' + escapeDungeonText(icon) + '</span>' +
            '<span class="dungeon-floor-room__idx">' + (i + 1) + '</span>' +
            '</div>';
        if (i < floor.rooms.length - 1) {
            nodes += '<div class="dungeon-floor-map__connector' + (i < roomIndex ? ' dungeon-floor-map__connector--done' : '') + '" aria-hidden="true"></div>';
        }
    });

    const dungeonName = session.dungeonName || (session.dungeonId && typeof getDungeonById === 'function'
        ? (getDungeonById(session.dungeonId) || {}).name
        : '') || 'Подземелье';

    return '<div class="dungeon-floor-map" role="navigation" aria-label="Карта этажа">' +
        '<div class="dungeon-floor-map__head">' +
        '<span class="dungeon-floor-map__title">' + escapeDungeonText(dungeonName) + '</span>' +
        '<span class="dungeon-floor-map__floor">Этаж ' + floorNum + ' / ' + totalFloors + '</span>' +
        '</div>' +
        '<div class="dungeon-floor-map__track">' + nodes + '</div>' +
        '</div>';
}

window.showDungeonsHub = showDungeonsHub;
window.openDungeonDetail = openDungeonDetail;
window.renderDungeonFloorMap = renderDungeonFloorMap;
window.dungeonUiEnterSolo = dungeonUiEnterSolo;
window.dungeonUiDuoSoon = dungeonUiDuoSoon;
window.dungeonUiCreateDuoRoom = dungeonUiCreateDuoRoom;
window.dungeonUiJoinDuoRoom = dungeonUiJoinDuoRoom;
window.dungeonUiStartRoomBattle = dungeonUiStartRoomBattle;
