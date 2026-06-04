// dungeonSession.js — соло/дуо забег, комнаты, бой, прогресс

let dungeonRunSession = null;
let pendingDuoEnterBattlePayload = null;
let lastHostDuoEnterBattlePayload = null;

const DUNGEON_SOLO_RETURN_TO = '__dungeon_solo__';

function getDungeonRunSession() {
    return dungeonRunSession;
}

function getSoloDungeonSession() {
    return dungeonRunSession && dungeonRunSession.mode === 'solo' ? dungeonRunSession : null;
}

function saveActiveDungeonRun() {
    if (!player || !dungeonRunSession || !dungeonRunSession.committed) return;
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = { clears: {}, lastRun: null, activeRun: null };
    }
    player.dungeonProgress.activeRun = {
        dungeonId: dungeonRunSession.dungeonId,
        mode: dungeonRunSession.mode,
        seed: dungeonRunSession.run.seed,
        totalFloors: dungeonRunSession.run.totalFloors || (typeof getRunFloorCount === 'function'
            ? getRunFloorCount(dungeonRunSession.run) : 0),
        floorIndex: dungeonRunSession.floorIndex,
        roomIndex: dungeonRunSession.roomIndex,
        state: dungeonRunSession.state,
        committed: true,
        at: Date.now()
    };
    if (typeof saveGame === 'function') saveGame();
}

function clearActiveDungeonRun() {
    if (!player) return;
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = { clears: {}, lastRun: null, activeRun: null };
    }
    player.dungeonProgress.activeRun = null;
    if (typeof saveGame === 'function') saveGame();
}

function commitDungeonRun() {
    if (!dungeonRunSession) return;
    dungeonRunSession.committed = true;
    saveActiveDungeonRun();
}

function tryResumeActiveDungeonRun(dungeonId) {
    if (!player || !player.dungeonProgress || !player.dungeonProgress.activeRun) return null;
    const ar = player.dungeonProgress.activeRun;
    if (!ar.committed || ar.dungeonId !== dungeonId) return null;

    let run = null;
    if (typeof createLazyDungeonRun === 'function') {
        run = createLazyDungeonRun(ar.dungeonId, ar.seed);
        if (ar.totalFloors) run.totalFloors = ar.totalFloors;
        const maxFloor = Math.min(ar.floorIndex, run.totalFloors - 1);
        for (let f = 0; f <= maxFloor; f++) {
            if (typeof ensureFloorGenerated === 'function') ensureFloorGenerated(run, f);
        }
    }

    if (!run) return null;

    installDungeonVictoryModalHook();
    dungeonRunSession = {
        state: ar.state === 'battle' ? 'in_room' : (ar.state || 'in_room'),
        mode: ar.mode || 'solo',
        dungeonId: ar.dungeonId,
        run: run,
        floorIndex: ar.floorIndex || 0,
        roomIndex: ar.roomIndex || 0,
        committed: true,
        _awaitingVictory: false
    };

    if (typeof addMessage === 'function') {
        addMessage('🔄 Продолжение забега: этаж ' + (dungeonRunSession.floorIndex + 1) +
            ', комната ' + (dungeonRunSession.roomIndex + 1), 'info');
    }
    return dungeonRunSession;
}

function recordDungeonProgress(dungeonId, completed) {
    if (!player) return;
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = { clears: {}, lastRun: null, activeRun: null };
    }
    if (!player.dungeonProgress.clears) player.dungeonProgress.clears = {};
    if (completed) {
        player.dungeonProgress.clears[dungeonId] = (player.dungeonProgress.clears[dungeonId] || 0) + 1;
        clearActiveDungeonRun();
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
                const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
                if (dungeonRunSession && dungeonRunSession.mode === 'duo' && duo && duo.role === 'guest') {
                    return;
                }
                onRoomCleared();
            };
        } else if (dungeonRunSession && title && String(title).indexOf('Поражение') !== -1) {
            wrapped = function () {
                if (typeof callback === 'function') callback();
                const wasDuo = dungeonRunSession && dungeonRunSession.mode === 'duo';
                const hadCommit = dungeonRunSession && dungeonRunSession.committed;
                dungeonRunSession = null;
                if (hadCommit) clearActiveDungeonRun();
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

function createDungeonRunForStart(dungeonId, mode, externalRun) {
    if (externalRun) {
        if (externalRun.lazy && typeof ensureFloorGenerated === 'function') {
            ensureFloorGenerated(externalRun, 0);
        }
        return externalRun;
    }
    if (typeof createLazyDungeonRun === 'function') {
        const run = createLazyDungeonRun(dungeonId);
        if (typeof ensureFloorGenerated === 'function') ensureFloorGenerated(run, 0);
        return run;
    }
    if (typeof generateDungeonRun === 'function') {
        return generateDungeonRun(dungeonId);
    }
    return { dungeonId: dungeonId, seed: 0, floors: [], totalFloors: 0 };
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

    const run = createDungeonRunForStart(dungeonId, mode, externalRun);
    if (run && !run.mode) run.mode = mode || dungeon.mode || 'solo';
    const floor0 = typeof getFloorFromRun === 'function' ? getFloorFromRun(run, 0) : (run.floors && run.floors[0]);
    if (!floor0 || !floor0.rooms || !floor0.rooms.length) {
        if (typeof addMessage === 'function') addMessage('❌ Не удалось сгенерировать забег.', 'error');
        return null;
    }

    installDungeonVictoryModalHook();
    const totalFloors = typeof getRunFloorCount === 'function' ? getRunFloorCount(run) : (run.floors ? run.floors.length : 0);

    dungeonRunSession = {
        state: 'in_room',
        mode: mode || dungeon.mode || 'solo',
        dungeonId: dungeonId,
        run: run,
        floorIndex: 0,
        roomIndex: 0,
        committed: false,
        _awaitingVictory: false
    };

    if (typeof addMessage === 'function') {
        addMessage(
            dungeon.icon + ' Забег: «' + dungeon.name + '» · ' + (mode === 'duo' ? 'дуо' : 'соло') +
            ' · этажей ' + totalFloors + ' · seed ' + run.seed,
            'success'
        );
    }
    return dungeonRunSession;
}

function startSoloDungeon(dungeonId) {
    const resumed = tryResumeActiveDungeonRun(dungeonId);
    if (resumed) return resumed;
    return startDungeonRun(dungeonId, 'solo');
}

function startDuoDungeonFromLobby() {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.run || duo.status !== 'sync') {
        if (typeof addMessage === 'function') addMessage('❌ Дуо-забег ещё не синхронизирован.', 'error');
        return null;
    }
    const session = startDungeonRun(duo.dungeonId, 'duo', duo.run);
    if (session) {
        session.committed = true;
        saveActiveDungeonRun();
    }
    return session;
}

function getCurrentRoom() {
    if (!dungeonRunSession || !dungeonRunSession.run) return null;
    const run = dungeonRunSession.run;
    const fi = dungeonRunSession.floorIndex;
    if (typeof ensureFloorGenerated === 'function') ensureFloorGenerated(run, fi);
    const floor = typeof getFloorFromRun === 'function' ? getFloorFromRun(run, fi) : run.floors[fi];
    if (!floor || !floor.rooms) return null;
    return floor.rooms[dungeonRunSession.roomIndex] || null;
}

function isDungeonDuoHost() {
    if (!dungeonRunSession || dungeonRunSession.mode !== 'duo') return false;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    return !!(duo && duo.role === 'host');
}

function hostBroadcastRoomAdvance(extra) {
    if (!isDungeonDuoHost() || typeof sendDuoDungeonRoomState !== 'function') return;
    const session = dungeonRunSession;
    sendDuoDungeonRoomState(Object.assign({
        kind: 'room_advance',
        floorIndex: session.floorIndex,
        roomIndex: session.roomIndex,
        state: session.state,
        completed: session.state === 'complete',
        dungeonId: session.dungeonId
    }, extra || {}));
}

function applyDungeonRoomAdvanceFromHost(payload) {
    if (!payload) return;
    if (payload.completed) {
        dungeonRunSession = null;
        if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
        if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('sync');
        if (typeof addMessage === 'function') addMessage('🏆 Подземелье пройдено вместе с напарником!', 'success');
        if (typeof showDungeonsHub === 'function') showDungeonsHub();
        return;
    }
    if (!dungeonRunSession) return;
    if (typeof payload.floorIndex === 'number') dungeonRunSession.floorIndex = payload.floorIndex;
    if (typeof payload.roomIndex === 'number') dungeonRunSession.roomIndex = payload.roomIndex;
    dungeonRunSession.state = payload.state || 'in_room';
    dungeonRunSession._awaitingVictory = false;
    if (typeof ensureFloorGenerated === 'function') {
        ensureFloorGenerated(dungeonRunSession.run, dungeonRunSession.floorIndex);
    }
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('run');
    if (dungeonRunSession.committed && typeof saveActiveDungeonRun === 'function') saveActiveDungeonRun();
    if (typeof saveGame === 'function') saveGame();
    if (typeof openDungeonDetail === 'function') openDungeonDetail(dungeonRunSession.dungeonId);
    flushPendingDuoEnterBattle();
}

function applyDungeonDuoVictoryAck(payload) {
    if (!payload || !player) return;
    if (dungeonRunSession) dungeonRunSession._awaitingVictory = false;
    const exp = payload.exp || 0;
    const gold = payload.gold || 0;
    window.lastVictoryData = { exp: exp, gold: gold };
    player.gold += gold;
    player.experience += exp;
    player.victories = (player.victories || 0) + 1;
    while (player.experience >= player.maxExperience) {
        player.experience -= player.maxExperience;
        player.level++;
        player.maxExperience = Math.floor(player.level * 70 + 250);
        if (typeof resetBaseStats === 'function') resetBaseStats();
        player.health = player.maxHealth;
        if (player.class === 'Маг') player.mana = player.maxMana;
        if (typeof updateAllAbilities === 'function') updateAllAbilities();
        if (typeof addMessage === 'function') {
            addMessage('🎉 ПОВЫШЕНИЕ УРОВНЯ! Теперь вы ' + player.level + ' уровень!', 'success');
        }
    }
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    currentMonster = null;
    window._strikeAnimActive = false;
    if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
    if (typeof saveGame === 'function') saveGame();
    if (typeof renderGame === 'function') renderGame();
    let rewardText = '';
    if (Array.isArray(payload.rewardLines) && payload.rewardLines.length) {
        rewardText = '\n\n' + payload.rewardLines.join('\n');
    }
    window._battleEndModalOpen = true;
    if (typeof showModal === 'function') {
        showModal('🎉 Победа!', '🏆',
            'Партия подтверждена хостом!\n⭐ Опыт: +' + exp + '\n💰 Золото: +' + gold + rewardText +
            '\n📊 Уровень: ' + player.level,
            'Продолжить',
            function () {
                window._battleEndModalOpen = false;
                var dc = document.getElementById('dynamicContent');
                if (dc) dc.innerHTML = '';
            });
    }
}

function duoEnterBattleMatchesSession(payload) {
    if (!payload || !dungeonRunSession) return false;
    if (typeof payload.floorIndex === 'number' && payload.floorIndex !== dungeonRunSession.floorIndex) return false;
    if (typeof payload.roomIndex === 'number' && payload.roomIndex !== dungeonRunSession.roomIndex) return false;
    return true;
}

function teardownDuoBattleZone() {
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
    window._strikeAnimActive = false;
    currentMonster = null;
    if (typeof clearBattleZoneState === 'function') clearBattleZoneState();
    if (dungeonRunSession) dungeonRunSession._awaitingVictory = false;
}

function flushPendingDuoEnterBattle() {
    if (!pendingDuoEnterBattlePayload) return;
    const pending = pendingDuoEnterBattlePayload;
    pendingDuoEnterBattlePayload = null;
    applyRemoteDuoDungeonEnterBattle(pending);
}

function buildHostDuoEnterBattleMessage(payloads, battleOpts) {
    let battleSnapshot = null;
    if (typeof buildDungeonRoomSnapshot === 'function') {
        battleSnapshot = buildDungeonRoomSnapshot();
        if (typeof fillPartyInSnapshot === 'function') fillPartyInSnapshot(battleSnapshot);
    }
    return {
        kind: 'enter_battle',
        floorIndex: dungeonRunSession.floorIndex,
        roomIndex: dungeonRunSession.roomIndex,
        enemyPayloads: payloads,
        battleOpts: battleOpts,
        battleSnapshot: battleSnapshot
    };
}

function sendHostDuoEnterBattle(payloads, battleOpts) {
    if (!isDungeonDuoHost() || typeof sendDuoDungeonRoomState !== 'function') return;
    const msg = buildHostDuoEnterBattleMessage(payloads, battleOpts);
    lastHostDuoEnterBattlePayload = msg;
    sendDuoDungeonRoomState(msg);
}

function resendHostDuoEnterBattle() {
    if (!lastHostDuoEnterBattlePayload || typeof sendDuoDungeonRoomState !== 'function') return false;
    sendDuoDungeonRoomState(lastHostDuoEnterBattlePayload);
    return true;
}

function applyRemoteDuoDungeonEnterBattle(payload) {
    if (!payload) return false;
    if (!dungeonRunSession) {
        pendingDuoEnterBattlePayload = payload;
        if (typeof duoDungeonLog === 'function') duoDungeonLog('Ожидание забега — бой в очереди…', 'info');
        return false;
    }
    if (!duoEnterBattleMatchesSession(payload)) {
        pendingDuoEnterBattlePayload = payload;
        return false;
    }
    pendingDuoEnterBattlePayload = null;

    teardownDuoBattleZone();

    if (typeof payload.floorIndex === 'number') dungeonRunSession.floorIndex = payload.floorIndex;
    if (typeof payload.roomIndex === 'number') dungeonRunSession.roomIndex = payload.roomIndex;

    if (typeof stopGathering === 'function') stopGathering();

    const leader = payload.enemyPayloads && payload.enemyPayloads[0];
    const battleOpts = payload.battleOpts || {};
    if (!leader) return false;

    dungeonRunSession.state = 'battle';
    dungeonRunSession._awaitingVictory = true;

    if (typeof startDungeonDuoBattleMode === 'function') startDungeonDuoBattleMode();
    if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('battle');

    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (duo && duo.role === 'guest' && typeof setDungeonDuoAlly === 'function') {
        setDungeonDuoAlly(duo.remoteSnapshot || {
            name: 'Союзник',
            health: player.maxHealth,
            maxHealth: player.maxHealth,
            class: '?'
        });
    }

    if (typeof enterBattleZoneWithMonster === 'function') {
        enterBattleZoneWithMonster(leader, battleOpts);
    }

    if (typeof isBattleZoneStaging === 'function' && isBattleZoneStaging() &&
        typeof commitBattleStart === 'function') {
        commitBattleStart();
    }

    if (typeof applyDungeonDuoRoomSnapshot === 'function' && payload.battleSnapshot) {
        applyDungeonDuoRoomSnapshot(payload.battleSnapshot);
    }
    if (typeof updateBattlePackVitality === 'function') updateBattlePackVitality();
    else if (typeof updateBattleVitality === 'function') updateBattleVitality();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
    if (typeof addMessage === 'function') addMessage('⚔️ Партнёр начал бой — вы в бою.', 'success');
    return true;
}

function enterShrineRoom(opts) {
    opts = opts || {};
    if (!dungeonRunSession) return false;

    if (dungeonRunSession.mode === 'duo' && !opts.forceHost) {
        const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
        if (duo && duo.role === 'guest') {
            if (typeof sendDuoDungeonBattleAction === 'function') {
                sendDuoDungeonBattleAction({ type: 'shrine_heal' });
            }
            if (typeof addMessage === 'function') addMessage('✨ Запрос святыни отправлен хосту…', 'info');
            return true;
        }
    }

    const heal = Math.floor((player.maxHealth || 100) * 0.3);
    player.health = Math.min(player.maxHealth, (player.health || 0) + heal);
    if (typeof addMessage === 'function') {
        addMessage('✨ Святыня восстанавливает ' + heal + ' HP.', 'success');
    }
    if (typeof saveGame === 'function') saveGame();
    onRoomCleared({ forceHost: !!opts.forceHost });
    return true;
}

function onRoomCleared(opts) {
    opts = opts || {};
    if (!dungeonRunSession) return;

    const session = dungeonRunSession;
    if (session.mode === 'duo') {
        const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
        if (duo && duo.role === 'guest' && !opts.fromRemote) {
            if (typeof sendDuoDungeonBattleAction === 'function') {
                sendDuoDungeonBattleAction({ type: 'request_room_advance' });
            }
            if (typeof addMessage === 'function') addMessage('⏳ Ожидание перехода от хоста…', 'info');
            return;
        }
        if (duo && duo.role !== 'host' && !opts.fromRemote && !opts.forceHost) return;
    }

    if (session.state !== 'battle' && session.state !== 'loot' && session.state !== 'in_room') return;

    const prevFloor = session.floorIndex;
    session.state = 'loot';

    const floor = typeof getFloorFromRun === 'function'
        ? getFloorFromRun(session.run, session.floorIndex)
        : session.run.floors[session.floorIndex];
    if (!floor) {
        session.state = 'complete';
        recordDungeonProgress(session.dungeonId, true);
        dungeonRunSession = null;
        return;
    }

    session.roomIndex += 1;
    if (session.roomIndex >= floor.rooms.length) {
        session.floorIndex += 1;
        session.roomIndex = 0;
        if (typeof ensureFloorGenerated === 'function') {
            ensureFloorGenerated(session.run, session.floorIndex);
        }
    }

    const totalFloors = typeof getRunFloorCount === 'function'
        ? getRunFloorCount(session.run)
        : (session.run.floors ? session.run.floors.length : 0);

    if (session.floorIndex >= totalFloors) {
        const doneId = session.dungeonId;
        const doneMode = session.mode;
        session.state = 'complete';
        recordDungeonProgress(doneId, true);
        dungeonRunSession = null;
        if (typeof addMessage === 'function') {
            addMessage('🏆 Подземелье пройдено! Забег завершён.', 'success');
        }
        if (doneMode === 'duo') {
            hostBroadcastRoomAdvance({ completed: true });
        }
        if (typeof showDungeonsHub === 'function') {
            showDungeonsHub();
        } else if (typeof openDungeonDetail === 'function') {
            openDungeonDetail(doneId);
        }
        return;
    }

    session.state = 'in_room';
    if (session.committed) saveActiveDungeonRun();

    const room = getCurrentRoom();
    const advancedFloor = session.floorIndex > prevFloor;

    if (typeof addMessage === 'function' && room) {
        const arch = ROOM_ARCHETYPES[room.archetype];
        const label = room.isShrine ? '✨ Святыня' : (arch ? arch.icon + ' ' + arch.name : room.archetype);
        const prefix = advancedFloor ? '🏔️ Новый этаж ' + (session.floorIndex + 1) + '! ' : '➡️ ';
        addMessage(
            prefix + 'Комната ' + (session.roomIndex + 1) + ': ' + label,
            advancedFloor ? 'success' : 'info'
        );
    }

    if (session.mode === 'duo') {
        hostBroadcastRoomAdvance();
    }

    if (typeof openDungeonDetail === 'function') {
        openDungeonDetail(session.dungeonId);
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

    if (dungeonRunSession.mode === 'duo') {
        const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
        if (duo && duo.role === 'guest') {
            if (typeof sendDuoDungeonBattleAction === 'function') {
                sendDuoDungeonBattleAction({ type: 'request_enter_battle' });
            }
            if (typeof addMessage === 'function') {
                addMessage('⚔️ Запрос боя отправлен хосту. Дождитесь начала боя…', 'info');
            }
            return true;
        }
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
            setDungeonDuoAlly(duo.remoteSnapshot || {
                name: 'Союзник',
                health: player.maxHealth,
                maxHealth: player.maxHealth,
                class: '?'
            });
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

    if (isDuo) {
        if (typeof setDuoDungeonRunStatus === 'function') setDuoDungeonRunStatus('battle');
        if (isDungeonDuoHost()) {
            sendHostDuoEnterBattle(payloads, battleOpts);
        }
    }

    const arch = ROOM_ARCHETYPES[room.archetype];
    if (typeof addMessage === 'function') {
        addMessage(
            (room.isFinalBoss ? '👑 Финальный босс: ' : room.isBoss ? '💀 Босс-комната: ' : '⚔️ Бой: ') +
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
    commitDungeonRun();
    const entered = enterCurrentRoomBattle();
    if (entered && typeof isBattleZoneStaging === 'function' && isBattleZoneStaging()) {
        if (typeof commitBattleStart === 'function') commitBattleStart();
    }
    return session;
}

function abandonDungeonRun(clearSaved) {
    const shouldClear = clearSaved === true || (dungeonRunSession && dungeonRunSession.committed);
    dungeonRunSession = null;
    if (shouldClear) clearActiveDungeonRun();
    if (typeof stopDungeonDuoBattleMode === 'function') stopDungeonDuoBattleMode();
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
window.commitDungeonRun = commitDungeonRun;
window.saveActiveDungeonRun = saveActiveDungeonRun;
window.clearActiveDungeonRun = clearActiveDungeonRun;
window.tryResumeActiveDungeonRun = tryResumeActiveDungeonRun;
window.abandonDungeonRun = abandonDungeonRun;
window.isDungeonDuoHost = isDungeonDuoHost;
window.hostBroadcastRoomAdvance = hostBroadcastRoomAdvance;
window.applyDungeonRoomAdvanceFromHost = applyDungeonRoomAdvanceFromHost;
window.applyDungeonDuoVictoryAck = applyDungeonDuoVictoryAck;
window.applyRemoteDuoDungeonEnterBattle = applyRemoteDuoDungeonEnterBattle;
window.flushPendingDuoEnterBattle = flushPendingDuoEnterBattle;
window.resendHostDuoEnterBattle = resendHostDuoEnterBattle;
