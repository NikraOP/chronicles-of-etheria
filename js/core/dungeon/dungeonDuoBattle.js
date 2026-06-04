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

function applyDungeonDuoLocalPartySnapshot(snapshot) {
    if (!snapshot || !player) return;
    if (typeof snapshot.maxHealth === 'number' && snapshot.maxHealth > 0) {
        player.maxHealth = Math.max(1, Math.floor(snapshot.maxHealth));
        player.health = Math.min(player.health, player.maxHealth);
    }
    if (typeof snapshot.health === 'number') {
        player.health = Math.max(0, Math.min(player.maxHealth || snapshot.maxHealth || 1, Math.floor(snapshot.health)));
    }
    if (player.class === 'Маг') {
        if (typeof snapshot.maxMana === 'number') player.maxMana = Math.max(0, Math.floor(snapshot.maxMana));
        if (typeof snapshot.mana === 'number') player.mana = Math.max(0, Math.min(player.maxMana || snapshot.mana, Math.floor(snapshot.mana)));
    }
}

function buildDungeonDuoPartySnapshot() {
    if (!player) return null;
    const lobbySnap = typeof buildDuoLobbyPlayerSnapshot === 'function'
        ? buildDuoLobbyPlayerSnapshot()
        : {
            name: player.name,
            class: player.class,
            branch: player.branch,
            gender: player.gender || 'male',
            schoolImg: player.schoolImg || '',
            currentSkin: player.currentSkin || ''
        };
    return {
        ...lobbySnap,
        name: player.name,
        class: player.class,
        branch: player.branch || '',
        gender: player.gender || 'male',
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.class === 'Маг' ? (player.mana || 0) : 0,
        maxMana: player.class === 'Маг' ? (player.maxMana || 0) : 0,
        attack: player.attack || 0,
        defense: player.defense || 0,
        criticalChance: player.criticalChance || 0,
        criticalDamage: player.criticalDamage || 0,
        dodgeChance: player.dodgeChance || 0,
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
        if (duo && duo.role === 'host') {
            if (payload.party.host) applyDungeonDuoLocalPartySnapshot(payload.party.host);
            if (payload.party.guest) setDungeonDuoAlly(payload.party.guest);
        } else if (duo && duo.role === 'guest') {
            if (payload.party.guest) applyDungeonDuoLocalPartySnapshot(payload.party.guest);
            if (payload.party.host) setDungeonDuoAlly(payload.party.host);
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

    const wasLocalTurn = !!isPlayerTurn;
    if (duo && duo.role === 'guest') {
        const canAct = payload.activeSlot === 'guest' && payload.isPlayerPhase !== false;
        isPlayerTurn = canAct;
        if (canAct && !wasLocalTurn && typeof addBattleLog === 'function') addBattleLog('✅ Ваш ход.', 'success');
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        if (typeof renderBattle === 'function') renderBattle({ force: true });
    } else if (duo && duo.role === 'host') {
        isPlayerTurn = payload.activeSlot === 'host' && payload.isPlayerPhase !== false;
        if (isPlayerTurn && !wasLocalTurn && typeof addBattleLog === 'function') addBattleLog('✅ Ваш ход.', 'success');
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
    if (typeof startMonsterPhaseAfterPlayer === 'function') {
        startMonsterPhaseAfterPlayer();
        return;
    }
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
        broadcastDungeonDuoRoomState();
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
window.applyDungeonDuoLocalPartySnapshot = applyDungeonDuoLocalPartySnapshot;
