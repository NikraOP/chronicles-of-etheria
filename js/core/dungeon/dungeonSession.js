// dungeonSession.js — соло-данж: состояние забега и вход в бой комнаты

let soloDungeonSession = null;

const DUNGEON_SOLO_RETURN_TO = '__dungeon_solo__';

function getSoloDungeonSession() {
    return soloDungeonSession;
}

function installDungeonVictoryModalHook() {
    if (window._dungeonModalPatched || typeof showModal !== 'function') return;
    const baseShowModal = showModal;
    window.showModal = function (title, icon, message, buttonText, callback) {
        let wrapped = callback;
        if (soloDungeonSession && soloDungeonSession._awaitingVictory && title && String(title).indexOf('Победа') !== -1) {
            wrapped = function () {
                soloDungeonSession._awaitingVictory = false;
                if (typeof callback === 'function') callback();
                onRoomCleared();
            };
        } else if (soloDungeonSession && title && String(title).indexOf('Поражение') !== -1) {
            wrapped = function () {
                if (typeof callback === 'function') callback();
                soloDungeonSession = null;
                if (typeof addMessage === 'function') {
                    addMessage('💀 Забег в подземелье прерван поражением.', 'warning');
                }
            };
        }
        return baseShowModal(title, icon, message, buttonText, wrapped);
    };
    window._dungeonModalPatched = true;
}

function buildBattleMonsterPayload(enemy, dungeon, room) {
    return {
        name: enemy.name,
        icon: enemy.icon,
        img: enemy.img,
        hp: enemy.hp,
        atk: enemy.atk,
        def: enemy.def,
        exp: enemy.exp,
        abilities: enemy.abilities || [],
        returnTo: DUNGEON_SOLO_RETURN_TO,
        source: 'dungeon_solo',
        goldMult: dungeon && dungeon.goldMult != null ? dungeon.goldMult : 10,
        isBoss: !!(room && room.isBoss)
    };
}

/**
 * @param {string} dungeonId
 * @returns {object|null}
 */
function startSoloDungeon(dungeonId) {
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

    const run = typeof generateDungeonRun === 'function'
        ? generateDungeonRun(dungeonId)
        : { dungeonId: dungeonId, seed: 0, floors: [] };

    if (!run.floors.length) {
        if (typeof addMessage === 'function') addMessage('❌ Не удалось сгенерировать забег.', 'error');
        return null;
    }

    installDungeonVictoryModalHook();
    soloDungeonSession = {
        state: 'in_room',
        mode: 'solo',
        dungeonId: dungeonId,
        run: run,
        floorIndex: 0,
        roomIndex: 0,
        _awaitingVictory: false
    };

    if (typeof addMessage === 'function') {
        addMessage(
            dungeon.icon + ' Забег: «' + dungeon.name + '» · этажей ' + run.floors.length + ' · seed ' + run.seed,
            'success'
        );
    }
    return soloDungeonSession;
}

function getCurrentRoom() {
    if (!soloDungeonSession || !soloDungeonSession.run) return null;
    const floor = soloDungeonSession.run.floors[soloDungeonSession.floorIndex];
    if (!floor || !floor.rooms) return null;
    return floor.rooms[soloDungeonSession.roomIndex] || null;
}

function onRoomCleared() {
    if (!soloDungeonSession) return;

    const session = soloDungeonSession;
    if (session.state !== 'battle' && session.state !== 'loot') return;

    session.state = 'loot';
    const floor = session.run.floors[session.floorIndex];
    if (!floor) {
        session.state = 'complete';
        return;
    }

    session.roomIndex += 1;
    if (session.roomIndex >= floor.rooms.length) {
        session.floorIndex += 1;
        session.roomIndex = 0;
    }

    if (session.floorIndex >= session.run.floors.length) {
        session.state = 'complete';
        if (typeof addMessage === 'function') {
            addMessage('🏆 Подземелье пройдено! Забег завершён.', 'success');
        }
        return;
    }

    session.state = 'in_room';
    const room = getCurrentRoom();
    if (typeof addMessage === 'function' && room) {
        const arch = ROOM_ARCHETYPES[room.archetype];
        const label = arch ? arch.icon + ' ' + arch.name : room.archetype;
        addMessage(
            '➡️ Этаж ' + (session.floorIndex + 1) + ', комната ' + (session.roomIndex + 1) + ': ' + label,
            'info'
        );
    }
}

function enterCurrentRoomBattle() {
    if (!soloDungeonSession || soloDungeonSession.state !== 'in_room') {
        if (typeof addMessage === 'function') addMessage('❌ Нет активной комнаты данжа.', 'error');
        return false;
    }

    const room = getCurrentRoom();
    if (!room || !room.enemies || !room.enemies.length) {
        if (typeof addMessage === 'function') addMessage('❌ В комнате нет врагов.', 'error');
        return false;
    }

    if (typeof guardBattleNavigation === 'function' && !guardBattleNavigation()) return false;
    if (typeof stopGathering === 'function') stopGathering();

    const dungeon = typeof getDungeonById === 'function'
        ? getDungeonById(soloDungeonSession.dungeonId)
        : null;
    const payloads = room.enemies.map(function (e) {
        return buildBattleMonsterPayload(e, dungeon, room);
    });
    const battleOpts = {
        goldMult: dungeon && dungeon.goldMult != null ? dungeon.goldMult : 10,
        scale: 1,
        returnTo: DUNGEON_SOLO_RETURN_TO,
        source: 'dungeon_solo',
        enemies: payloads
    };

    soloDungeonSession.state = 'battle';
    soloDungeonSession._awaitingVictory = true;

    if (typeof enterBattleZoneWithMonster === 'function') {
        enterBattleZoneWithMonster(payloads[0], battleOpts);
    } else if (typeof startBattleWithMonster === 'function') {
        const lead = room.enemies[0];
        startBattleWithMonster(buildBattleMonsterPayload(lead, dungeon, room), battleOpts);
        if (room.enemies.length > 1 && typeof addMessage === 'function') {
            addMessage(
                '⚔️ В комнате ' + room.enemies.length + ' врагов; бой с «' + lead.name + '» (мульти-враг — после battleEnemies).',
                'info'
            );
        }
    } else {
        soloDungeonSession.state = 'in_room';
        soloDungeonSession._awaitingVictory = false;
        if (typeof addMessage === 'function') addMessage('❌ Боевой модуль не загружен.', 'error');
        return false;
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

window.getSoloDungeonSession = getSoloDungeonSession;
window.startSoloDungeon = startSoloDungeon;
window.getCurrentRoom = getCurrentRoom;
window.onRoomCleared = onRoomCleared;
window.enterCurrentRoomBattle = enterCurrentRoomBattle;
window.debugStartSoloDungeon = debugStartSoloDungeon;
window.startDungeonSolo = startSoloDungeon;
window.getDungeonSession = getSoloDungeonSession;
