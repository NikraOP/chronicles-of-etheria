// Кооп-бой в дуо-данже: host-authoritative sync HP врагов и партии.

const DUNGEON_DUO_RETURN_TO = '__dungeon_duo__';

let dungeonDuoActiveSlot = 'host';
let dungeonDuoAlly = null;
let dungeonDuoRoundActs = { host: false, guest: false };
/** true = поочерёдные ходы игроков; false = фаза монстров */
let dungeonDuoCoopPlayerPhase = true;
let _dungeonDuoMonsterPhaseLock = false;

function cloneDungeonDuoEffects(effects) {
    if (!Array.isArray(effects)) return [];
    try {
        return JSON.parse(JSON.stringify(effects)).slice(0, 32);
    } catch (_) {
        return [];
    }
}

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
    if (Array.isArray(snapshot.temporaryEffects)) {
        player.temporaryEffects = cloneDungeonDuoEffects(snapshot.temporaryEffects);
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
        level: player.level,
        temporaryEffects: cloneDungeonDuoEffects(player.temporaryEffects)
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
                maxHealth: e.maxHealth,
                effects: cloneDungeonDuoEffects(e.effects)
            };
        }),
        party: {
            host: null,
            guest: null
        },
        activeSlot: dungeonDuoActiveSlot,
        isPlayerPhase: dungeonDuoCoopPlayerPhase
    };
}

function dungeonDuoLocalCanAct() {
    if (!isDungeonDuoBattleActive()) return !!isPlayerTurn;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return !!isPlayerTurn;
    return dungeonDuoCoopPlayerPhase && duo.role === dungeonDuoActiveSlot;
}

function pushDungeonDuoBattleVisual(visual) {
    if (!visual || !isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return;
    visual = Object.assign({ actorSlot: duo.role }, visual);
    if (duo.role === 'host' && typeof sendDuoDungeonRoomState === 'function') {
        const snap = buildDungeonRoomSnapshot();
        if (typeof fillPartyInSnapshot === 'function') fillPartyInSnapshot(snap);
        snap.visual = visual;
        sendDuoDungeonRoomState(snap);
        return;
    }
    if (typeof sendDuoDungeonBattleAction === 'function') {
        sendDuoDungeonBattleAction({ type: 'player_visual', visual: visual });
    }
}

function playRemoteDungeonDuoVisual(visual) {
    if (!visual || !isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role || visual.actorSlot === duo.role) return;
    const attackerSide = visual.actorSlot === duo.role ? 'player' : 'ally';
    const targetIndex = typeof visual.targetIndex === 'number' ? visual.targetIndex : 0;
    if (typeof setFocusedEnemyIndex === 'function') setFocusedEnemyIndex(targetIndex);
    const damage = Math.max(0, Math.floor(visual.damage || 0));
    const crit = !!visual.crit;
    const onImpact = function () {
        if (damage <= 0) return;
        if (visual.aoe && Array.isArray(visual.hits) && visual.hits.length &&
            typeof floatDamageOnEnemyIndex === 'function') {
            visual.hits.forEach(function (hit) {
                if (hit.damage > 0) floatDamageOnEnemyIndex(hit.index, hit.damage, !!hit.crit);
            });
            return;
        }
        if (typeof floatDamage === 'function') floatDamage('enemy', damage, crit);
    };
    const afterAnim = function () {
        if (typeof updateBattlePackVitality === 'function') updateBattlePackVitality();
        if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
    };
    if (typeof playStrikeAnimation === 'function') {
        playStrikeAnimation(attackerSide, afterAnim, {
            onImpact: onImpact,
            isCrit: crit,
            heavy: !!visual.heavy,
            fastResolve: false
        });
        return;
    }
    onImpact();
    afterAnim();
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
    const wasLocalTurn = dungeonDuoLocalCanAct();
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
            if (Array.isArray(row.effects)) {
                list[row.index].effects = cloneDungeonDuoEffects(row.effects);
            }
        });
        if (typeof syncCurrentMonsterFromFocus === 'function') syncCurrentMonsterFromFocus();
    }

    if (payload.isPlayerPhase === false) dungeonDuoCoopPlayerPhase = false;
    else if (payload.isPlayerPhase === true) {
        dungeonDuoCoopPlayerPhase = true;
        if (duo && duo.role === 'guest' && payload.activeSlot === 'host') {
            resetDungeonDuoRoundActs();
        }
    }

    const canAct = dungeonDuoLocalCanAct();
    isPlayerTurn = canAct;
    if (canAct && !wasLocalTurn && typeof addBattleLog === 'function') addBattleLog('✅ Ваш ход.', 'success');
    if (!canAct && wasLocalTurn && dungeonDuoCoopPlayerPhase && typeof addBattleLog === 'function') {
        addBattleLog('⏳ Ход союзника…', 'info');
    }
    if (payload.visual && typeof playRemoteDungeonDuoVisual === 'function') {
        playRemoteDungeonDuoVisual(payload.visual);
    }
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
    if (typeof renderBattle === 'function') renderBattle({ force: true });
}

function startDungeonDuoBattleMode() {
    window.dungeonDuoBattleActive = true;
    dungeonDuoCoopPlayerPhase = true;
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
    dungeonDuoCoopPlayerPhase = true;
    setDungeonDuoAlly(null);
}

function resetDungeonDuoRoundActs() {
    dungeonDuoRoundActs = { host: false, guest: false };
}

function startDungeonDuoMonsterPhase() {
    dungeonDuoCoopPlayerPhase = false;
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
        isPlayerTurn = dungeonDuoLocalCanAct();
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
    dungeonDuoCoopPlayerPhase = true;
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
        const session = typeof getDungeonRunSession === 'function' ? getDungeonRunSession() : null;
        if (session && session.state === 'battle' &&
            typeof resendHostDuoEnterBattle === 'function' && resendHostDuoEnterBattle()) {
            return;
        }
        if (session && session.state === 'in_room' && typeof enterCurrentRoomBattle === 'function') {
            enterCurrentRoomBattle();
        }
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

    if (payload.type === 'player_visual' && payload.visual) {
        if (typeof playRemoteDungeonDuoVisual === 'function') playRemoteDungeonDuoVisual(payload.visual);
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
window.dungeonDuoLocalCanAct = dungeonDuoLocalCanAct;
window.pushDungeonDuoBattleVisual = pushDungeonDuoBattleVisual;
window.playRemoteDungeonDuoVisual = playRemoteDungeonDuoVisual;
