// dungeonSession.js — соло/дуо забег, комнаты, бой, прогресс

let dungeonRunSession = null;

const DUNGEON_SOLO_RETURN_TO = '__dungeon_solo__';

function getDungeonRunSession() {
    return dungeonRunSession;
}

function getSoloDungeonSession() {
    return dungeonRunSession && dungeonRunSession.mode === 'solo' ? dungeonRunSession : null;
}

function recordDungeonProgress(dungeonId, completed) {
    if (!player) return;
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = { clears: {}, lastRun: null };
    }
    if (!player.dungeonProgress.clears) player.dungeonProgress.clears = {};
    if (completed) {
        player.dungeonProgress.clears[dungeonId] = (player.dungeonProgress.clears[dungeonId] || 0) + 1;
    }
    player.dungeonProgress.lastRun = {
        dungeonId: dungeonId,
        seed: dungeonRunSession && dungeonRunSession.run ? dungeonRunSession.run.seed : 0,
        completed: !!completed,
        at: Date.now()
    };
    if (typeof saveGame === 'function') saveGame();
}

function installDungeonVictoryModalHook() {
    if (window._dungeonModalPatched || typeof showModal !== 'function') return;
    const baseShowModal = showModal;
    window.showModal = function (title, icon, message, buttonText, callback) {
        let wrapped = callback;
        if (dungeonRunSession && dungeonRunSession._awaitingVictory && title && String(title).indexOf('Победа') !== -1) {
            wrapped = function () {
                dungeonRunSession._awaitingVictory = false;
                if (typeof callback === 'function') callback();
                onRoomCleared();
            };
        } else if (dungeonRunSession && title && String(title).indexOf('Поражение') !== -1) {
            wrapped = function () {
                if (typeof callback === 'function') callback();
                const wasDuo = dungeonRunSession && dungeonRunSession.mode === 'duo';
                dungeonRunSession = null;
                if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
                if (wasDuo && typeof leaveDuoDungeonLobby === 'function') leaveDuoDungeonLobby();
                if (typeof addMessage === 'function') {
                    addMessage('💀 Забег в подземелье прерван поражением.', 'warning');
                }
            };
        }
        return baseShowModal(title, icon, message, buttonText, wrapped);
    };
    window._dungeonModalPatched = true;
}

function buildBattleMonsterPayload(enemy, dungeon, room, returnTo) {
    return {
        name: enemy.name,
        icon: enemy.icon,
        img: enemy.img,
        hp: enemy.hp,
        atk: enemy.atk,
        def: enemy.def,
        exp: enemy.exp,
        abilities: enemy.abilities || [],
        returnTo: returnTo,
        source: dungeon && dungeon.mode === 'duo' ? 'dungeon_duo' : 'dungeon_solo',
        goldMult: dungeon && dungeon.goldMult != null ? dungeon.goldMult : 10,
        isBoss: !!(room && room.isBoss)
    };
}

function startDungeonRun(dungeonId, mode, externalRun) {
    if (!player) {
        if (typeof addMessage === 'function') addMessage('❌ Нет активного персонажа.', 'error');
        return null;
    }
    const dungeon = typeof getDungeonById === 'function' ? getDungeonById(dungeonId) : null;
    if (!dungeon) {
        if (typeof addMessage === 'function') addMessage('❌ Подземелье не найдено: ' + dungeonId, 'error');
        return null;
    }
    if (player.level < dungeon.minLevel) {
        if (typeof addMessage === 'function') {
            addMessage('❌ Нужен уровень ' + dungeon.minLevel + '+ для «' + dungeon.name + '».', 'error');
        }
        return null;
    }

    const run = externalRun || (typeof generateDungeonRun === 'function'
        ? generateDungeonRun(dungeonId)
        : { dungeonId: dungeonId, seed: 0, floors: [] });

    if (!run.floors.length) {
        if (typeof addMessage === 'function') addMessage('❌ Не удалось сгенерировать забег.', 'error');
        return null;
    }

    installDungeonVictoryModalHook();
    dungeonRunSession = {
        state: 'in_room',
        mode: mode || dungeon.mode || 'solo',
        dungeonId: dungeonId,
        run: run,
        floorIndex: 0,
        roomIndex: 0,
        _awaitingVictory: false
    };

    recordDungeonProgress(dungeonId, false);

    if (typeof addMessage === 'function') {
        addMessage(
            dungeon.icon + ' Забег: «' + dungeon.name + '» · ' + (mode === 'duo' ? 'дуо' : 'соло') +
            ' · этажей ' + run.floors.length + ' · seed ' + run.seed,
            'success'
        );
    }
    return dungeonRunSession;
}

function startSoloDungeon(dungeonId) {
    return startDungeonRun(dungeonId, 'solo');
}

function startDuoDungeonFromLobby() {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.run || duo.status !== 'sync') {
        if (typeof addMessage === 'function') addMessage('❌ Дуо-забег ещё не синхронизирован.', 'error');
        return null;
    }
    return startDungeonRun(duo.dungeonId, 'duo', duo.run);
}

function getCurrentRoom() {
    if (!dungeonRunSession || !dungeonRunSession.run) return null;
    const floor = dungeonRunSession.run.floors[dungeonRunSession.floorIndex];
    if (!floor || !floor.rooms) return null;
    return floor.rooms[dungeonRunSession.roomIndex] || null;
}

function enterShrineRoom() {
    if (!dungeonRunSession) return false;
    const heal = Math.floor((player.maxHealth || 100) * 0.3);
    player.health = Math.min(player.maxHealth, (player.health || 0) + heal);
    if (typeof addMessage === 'function') {
        addMessage('✨ Святыня восстанавливает ' + heal + ' HP.', 'success');
    }
    if (typeof saveGame === 'function') saveGame();
    onRoomCleared();
    return true;
}

function onRoomCleared() {
    if (!dungeonRunSession) return;

    const session = dungeonRunSession;
    if (session.state !== 'battle' && session.state !== 'loot' && session.state !== 'in_room') return;

    session.state = 'loot';
    const floor = session.run.floors[session.floorIndex];
    if (!floor) {
        session.state = 'complete';
        recordDungeonProgress(session.dungeonId, true);
        return;
    }

    session.roomIndex += 1;
    if (session.roomIndex >= floor.rooms.length) {
        session.floorIndex += 1;
        session.roomIndex = 0;
    }

    if (session.floorIndex >= session.run.floors.length) {
        session.state = 'complete';
        recordDungeonProgress(session.dungeonId, true);
        if (typeof addMessage === 'function') {
            addMessage('🏆 Подземелье пройдено! Забег завершён.', 'success');
        }
        if (session.mode === 'duo' && typeof sendDuoDungeonRoomState === 'function' &&
            typeof getDuoDungeonState === 'function' && getDuoDungeonState().role === 'host') {
            sendDuoDungeonRoomState({ completed: true, floorIndex: session.floorIndex, roomIndex: session.roomIndex });
        }
        return;
    }

    session.state = 'in_room';
    const room = getCurrentRoom();
    if (typeof addMessage === 'function' && room) {
        const arch = ROOM_ARCHETYPES[room.archetype];
        const label = room.isShrine ? '✨ Святыня' : (arch ? arch.icon + ' ' + arch.name : room.archetype);
        addMessage(
            '➡️ Этаж ' + (session.floorIndex + 1) + ', комната ' + (session.roomIndex + 1) + ': ' + label,
            'info'
        );
    }
    if (session.mode === 'duo' && typeof broadcastDungeonRunMeta === 'function') {
        broadcastDungeonRunMeta();
    }
}

function broadcastDungeonRunMeta() {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || duo.role !== 'host' || !dungeonRunSession || typeof sendDuoDungeonRoomState !== 'function') return;
    sendDuoDungeonRoomState({
        floorIndex: dungeonRunSession.floorIndex,
        roomIndex: dungeonRunSession.roomIndex,
        state: dungeonRunSession.state,
        completed: dungeonRunSession.state === 'complete'
    });
}

function enterCurrentRoomBattle() {
    if (!dungeonRunSession || dungeonRunSession.state !== 'in_room') {
        if (typeof addMessage === 'function') addMessage('❌ Нет активной комнаты данжа.', 'error');
        return false;
    }

    const room = getCurrentRoom();
    if (!room) {
        if (typeof addMessage === 'function') addMessage('❌ Комната не найдена.', 'error');
        return false;
    }

    if (room.isShrine || room.archetype === 'shrine' || !room.enemies || !room.enemies.length) {
        return enterShrineRoom();
    }

    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return false;
    if (typeof stopGathering === 'function') stopGathering();

    const dungeon = typeof getDungeonById === 'function'
        ? getDungeonById(dungeonRunSession.dungeonId)
        : null;
    const isDuo = dungeonRunSession.mode === 'duo';
    const returnTo = isDuo && typeof DUNGEON_DUO_RETURN_TO !== 'undefined'
        ? DUNGEON_DUO_RETURN_TO
        : DUNGEON_SOLO_RETURN_TO;

    const payloads = room.enemies.map(function (e) {
        return buildBattleMonsterPayload(e, dungeon, room, returnTo);
    });
    const battleOpts = {
        goldMult: dungeon && dungeon.goldMult != null ? dungeon.goldMult : 10,
        scale: 1,
        returnTo: returnTo,
        source: isDuo ? 'dungeon_duo' : 'dungeon_solo',
        enemies: payloads
    };

    dungeonRunSession.state = 'battle';
    dungeonRunSession._awaitingVictory = true;

    if (isDuo && typeof startDungeonDuoBattleMode === 'function') {
        startDungeonDuoBattleMode();
        const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
        if (duo && duo.role === 'host' && typeof setDungeonDuoAlly === 'function') {
            setDungeonDuoAlly({ name: 'Союзник', health: player.maxHealth, maxHealth: player.maxHealth, class: '?' });
        }
    }

    if (typeof enterBattleZoneWithMonster === 'function') {
        enterBattleZoneWithMonster(payloads[0], battleOpts);
    } else {
        dungeonRunSession.state = 'in_room';
        dungeonRunSession._awaitingVictory = false;
        if (typeof addMessage === 'function') addMessage('❌ Боевой модуль не загружен.', 'error');
        return false;
    }

    if (isDuo && typeof broadcastDungeonDuoRoomState === 'function') {
        setTimeout(function () { broadcastDungeonDuoRoomState(); }, 400);
    }

    const arch = ROOM_ARCHETYPES[room.archetype];
    if (typeof addMessage === 'function') {
        addMessage(
            (room.isBoss ? '💀 Босс-комната: ' : '⚔️ Бой: ') +
            (arch ? arch.name : room.archetype) +
            ' · врагов ' + room.enemies.length,
            'warning'
        );
    }
    return true;
}

function debugStartSoloDungeon(dungeonId) {
    const id = dungeonId || 'twilight_den';
    const session = startSoloDungeon(id);
    if (!session) return session;
    const entered = enterCurrentRoomBattle();
    if (entered && typeof isBattleZoneStaging === 'function' && isBattleZoneStaging()) {
        if (typeof commitBattleStart === 'function') commitBattleStart();
    }
    return session;
}

window.getDungeonRunSession = getDungeonRunSession;
window.getSoloDungeonSession = getSoloDungeonSession;
window.getDungeonSession = getDungeonRunSession;
window.startDungeonRun = startDungeonRun;
window.startSoloDungeon = startSoloDungeon;
window.startDungeonSolo = startSoloDungeon;
window.startDuoDungeonFromLobby = startDuoDungeonFromLobby;
window.getCurrentRoom = getCurrentRoom;
window.onRoomCleared = onRoomCleared;
window.enterCurrentRoomBattle = enterCurrentRoomBattle;
window.enterShrineRoom = enterShrineRoom;
window.debugStartSoloDungeon = debugStartSoloDungeon;
window.recordDungeonProgress = recordDungeonProgress;
window.broadcastDungeonRunMeta = broadcastDungeonRunMeta;

function abandonDungeonRun() {
    dungeonRunSession = null;
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
}

window.abandonDungeonRun = abandonDungeonRun;
