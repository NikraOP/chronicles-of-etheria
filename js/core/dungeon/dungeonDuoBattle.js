// Кооп-бой в дуо-данже: host-authoritative sync HP врагов и партии.

const DUNGEON_DUO_RETURN_TO = '__dungeon_duo__';

let dungeonDuoActiveSlot = 'host';
let dungeonDuoAlly = null;
let dungeonDuoRoundActs = { host: false, guest: false };

function isDungeonDuoBattleActive() {
    return !!window.dungeonDuoBattleActive;
}

function dungeonDuoIsLocalTurn() {
    if (!isDungeonDuoBattleActive()) return true;
    const role = typeof getDuoDungeonState === 'function' ? getDuoDungeonState().role : '';
    return role === dungeonDuoActiveSlot;
}

function getDungeonDuoAlly() {
    return dungeonDuoAlly;
}

function setDungeonDuoAlly(snapshot) {
    dungeonDuoAlly = snapshot ? { ...snapshot } : null;
}

function buildDungeonDuoPartySnapshot() {
    if (!player) return null;
    return {
        name: player.name,
        class: player.class,
        health: player.health,
        maxHealth: player.maxHealth,
        level: player.level
    };
}

function buildDungeonRoomSnapshot() {
    const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
    const enemies = typeof getBattleEnemies === 'function' ? getBattleEnemies() : [];
    return {
        floorIndex: session ? session.floorIndex : 0,
        roomIndex: session ? session.roomIndex : 0,
        enemies: enemies.map(function (e, i) {
            return {
                index: i,
                name: e.name,
                health: e.health,
                maxHealth: e.maxHealth
            };
        }),
        party: {
            host: null,
            guest: null
        },
        activeSlot: dungeonDuoActiveSlot,
        isPlayerPhase: !!isPlayerTurn
    };
}

function fillPartyInSnapshot(snap) {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    const local = buildDungeonDuoPartySnapshot();
    if (!snap.party) snap.party = { host: null, guest: null };
    if (duo && duo.role === 'host') {
        snap.party.host = local;
        if (dungeonDuoAlly) snap.party.guest = { ...dungeonDuoAlly };
    } else if (duo && duo.role === 'guest') {
        snap.party.guest = local;
        if (dungeonDuoAlly) snap.party.host = { ...dungeonDuoAlly };
    }
}

function broadcastDungeonDuoRoomState() {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || duo.role !== 'host' || typeof sendDuoDungeonRoomState !== 'function') return;
    const snap = buildDungeonRoomSnapshot();
    fillPartyInSnapshot(snap);
    sendDuoDungeonRoomState(snap);
}

function applyDungeonDuoRoomSnapshot(payload) {
    if (!payload || !isDungeonDuoBattleActive()) return;
    if (payload.activeSlot) dungeonDuoActiveSlot = payload.activeSlot;

    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (payload.party) {
        if (duo && duo.role === 'host' && payload.party.guest) {
            setDungeonDuoAlly(payload.party.guest);
        } else if (duo && duo.role === 'guest' && payload.party.host) {
            setDungeonDuoAlly(payload.party.host);
        }
    }

    if (Array.isArray(payload.enemies) && typeof getBattleEnemies === 'function') {
        const list = getBattleEnemies();
        payload.enemies.forEach(function (row) {
            if (!list[row.index]) return;
            list[row.index].health = Math.max(0, Math.min(list[row.index].maxHealth, row.health));
        });
        if (typeof syncCurrentMonsterFromFocus === 'function') syncCurrentMonsterFromFocus();
    }

    if (duo && duo.role === 'guest') {
        const canAct = payload.activeSlot === 'guest' && payload.isPlayerPhase !== false;
        isPlayerTurn = canAct;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        if (typeof renderBattle === 'function') renderBattle({ force: true });
    }
}

function startDungeonDuoBattleMode() {
    window.dungeonDuoBattleActive = true;
    resetDungeonDuoRoundActs();
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    dungeonDuoActiveSlot = 'host';
    isPlayerTurn = duo && duo.role === 'host';
    if (duo && duo.role === 'host') {
        setDungeonDuoAlly(null);
    }
}

function stopDungeonDuoBattleMode() {
    window.dungeonDuoBattleActive = false;
    dungeonDuoActiveSlot = 'host';
    setDungeonDuoAlly(null);
}

function resetDungeonDuoRoundActs() {
    dungeonDuoRoundActs = { host: false, guest: false };
}

function startDungeonDuoMonsterPhase() {
    if (typeof beginMonsterQueuePhase === 'function') beginMonsterQueuePhase();
    setTimeout(function () {
        if (typeof monsterTurn === 'function') monsterTurn();
    }, 80);
}

function onDungeonDuoPlayerActionEnded() {
    if (!isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return;

    dungeonDuoRoundActs[duo.role] = true;

    if (!dungeonDuoRoundActs.host || !dungeonDuoRoundActs.guest) {
        dungeonDuoActiveSlot = dungeonDuoRoundActs.host ? 'guest' : 'host';
        isPlayerTurn = duo.role === dungeonDuoActiveSlot;
        if (typeof addBattleLog === 'function' && !isPlayerTurn) {
            addBattleLog('⏳ Ход союзника…', 'info');
        }
        if (duo.role === 'host') {
            broadcastDungeonDuoRoomState();
        } else if (typeof sendDuoDungeonBattleAction === 'function') {
            const snap = buildDungeonRoomSnapshot();
            fillPartyInSnapshot(snap);
            sendDuoDungeonBattleAction({ type: 'end_turn', snapshot: snap, acted: duo.role });
        }
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return;
    }

    resetDungeonDuoRoundActs();
    dungeonDuoActiveSlot = 'host';

    if (duo.role === 'guest') {
        if (typeof sendDuoDungeonBattleAction === 'function') {
            sendDuoDungeonBattleAction({ type: 'both_ready' });
        }
        isPlayerTurn = false;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return;
    }

    isPlayerTurn = false;
    broadcastDungeonDuoRoomState();
    startDungeonDuoMonsterPhase();
}

function requestDungeonDuoStateSync() {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return;
    const snap = buildDungeonRoomSnapshot();
    fillPartyInSnapshot(snap);
    if (duo.role === 'host') {
        broadcastDungeonDuoRoomState();
    } else if (typeof sendDuoDungeonBattleAction === 'function') {
        sendDuoDungeonBattleAction({ type: 'sync_snapshot', snapshot: snap });
    }
}

function onDungeonDuoMonsterPhaseComplete() {
    if (!isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || duo.role !== 'host') return;
    resetDungeonDuoRoundActs();
    dungeonDuoActiveSlot = 'host';
    isPlayerTurn = true;
    broadcastDungeonDuoRoomState();
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
}

function applyRemoteDuoDungeonBattleActionImpl(payload) {
    if (!payload || typeof getDuoDungeonState !== 'function') return;
    const duo = getDuoDungeonState();
    if (duo.role !== 'host') return;

    if (payload.type === 'request_enter_battle') {
        if (typeof enterCurrentRoomBattle === 'function') enterCurrentRoomBattle();
        return;
    }
    if (payload.type === 'request_room_advance') {
        if (typeof onRoomCleared === 'function') onRoomCleared({ fromRemote: false, forceHost: true });
        return;
    }
    if (payload.type === 'shrine_heal') {
        if (typeof enterShrineRoom === 'function') enterShrineRoom({ fromRemote: true, forceHost: true });
        return;
    }
    if (payload.type === 'sync_snapshot' && payload.snapshot) {
        applyDungeonDuoRoomSnapshot(payload.snapshot);
        return;
    }
    if (payload.type === 'victory_claim') {
        if (payload.snapshot) applyDungeonDuoRoomSnapshot(payload.snapshot);
        if (typeof dungeonVictoryApplyAndModal === 'function') dungeonVictoryApplyAndModal();
        return;
    }

    if (payload.type === 'end_turn') {
        if (payload.snapshot) applyDungeonDuoRoomSnapshot(payload.snapshot);
        dungeonDuoRoundActs.guest = true;
        if (!dungeonDuoRoundActs.host) {
            dungeonDuoActiveSlot = 'host';
            isPlayerTurn = true;
            broadcastDungeonDuoRoomState();
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return;
        }
    }

    if (payload.type === 'both_ready' || (dungeonDuoRoundActs.host && dungeonDuoRoundActs.guest)) {
        resetDungeonDuoRoundActs();
        isPlayerTurn = false;
        broadcastDungeonDuoRoomState();
        startDungeonDuoMonsterPhase();
    }
}

window.DUNGEON_DUO_RETURN_TO = DUNGEON_DUO_RETURN_TO;
window.isDungeonDuoBattleActive = isDungeonDuoBattleActive;
window.dungeonDuoIsLocalTurn = dungeonDuoIsLocalTurn;
window.getDungeonDuoAlly = getDungeonDuoAlly;
window.setDungeonDuoAlly = setDungeonDuoAlly;
window.buildDungeonRoomSnapshot = buildDungeonRoomSnapshot;
window.broadcastDungeonDuoRoomState = broadcastDungeonDuoRoomState;
window.applyDungeonDuoRoomSnapshot = applyDungeonDuoRoomSnapshot;
window.startDungeonDuoBattleMode = startDungeonDuoBattleMode;
window.stopDungeonDuoBattleMode = stopDungeonDuoBattleMode;
window.onDungeonDuoPlayerActionEnded = onDungeonDuoPlayerActionEnded;
window.applyRemoteDuoDungeonBattleActionImpl = applyRemoteDuoDungeonBattleActionImpl;
window.requestDungeonDuoStateSync = requestDungeonDuoStateSync;
window.onDungeonDuoMonsterPhaseComplete = onDungeonDuoMonsterPhaseComplete;
window.buildDungeonDuoPartySnapshot = buildDungeonDuoPartySnapshot;
window.fillPartyInSnapshot = fillPartyInSnapshot;
