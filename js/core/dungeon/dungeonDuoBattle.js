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

function applyDungeonDuoLocalPartySnapshot(snapshot, opts) {
    opts = opts || {};
    if (!snapshot || !player) return;
    if (typeof snapshot.maxHealth === 'number' && snapshot.maxHealth > 0) {
        player.maxHealth = Math.max(1, Math.floor(snapshot.maxHealth));
        player.health = Math.min(player.health, player.maxHealth);
    }
    if (typeof snapshot.health === 'number') {
        player.health = Math.max(0, Math.min(player.maxHealth || snapshot.maxHealth || 1, Math.floor(snapshot.health)));
    }
    if (player.class === 'Маг') {
        if (typeof snapshot.maxMana === 'number') {
            player.maxMana = Math.max(0, Math.floor(snapshot.maxMana));
            player.mana = Math.min(player.maxMana, player.mana || 0);
        }
        // Мана своего героя — только локально (реген не затирается снапшотом напарника).
        if (opts.syncMana && typeof snapshot.mana === 'number') {
            player.mana = Math.max(0, Math.min(player.maxMana || snapshot.mana, Math.floor(snapshot.mana)));
        }
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

function getDungeonDuoSlotHealth(slot) {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !slot) return 0;
    if (slot === duo.role) return player ? Math.max(0, player.health || 0) : 0;
    const ally = getDungeonDuoAlly();
    return ally ? Math.max(0, ally.health || 0) : 0;
}

function isDungeonDuoSlotAlive(slot) {
    return getDungeonDuoSlotHealth(slot) > 0;
}

function markDungeonDuoDeadSlotsActed() {
    if (!isDungeonDuoSlotAlive('host')) dungeonDuoRoundActs.host = true;
    if (!isDungeonDuoSlotAlive('guest')) dungeonDuoRoundActs.guest = true;
}

function dungeonDuoPickActiveSlot() {
    if (!dungeonDuoRoundActs.host && isDungeonDuoSlotAlive('host')) return 'host';
    if (!dungeonDuoRoundActs.guest && isDungeonDuoSlotAlive('guest')) return 'guest';
    return null;
}

function dungeonDuoFirstAliveSlot() {
    if (isDungeonDuoSlotAlive('host')) return 'host';
    if (isDungeonDuoSlotAlive('guest')) return 'guest';
    return 'host';
}

function dungeonDuoLocalCanAct() {
    if (!isDungeonDuoBattleActive()) return !!isPlayerTurn;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return !!isPlayerTurn;
    return dungeonDuoCoopPlayerPhase &&
        duo.role === dungeonDuoActiveSlot &&
        isDungeonDuoSlotAlive(duo.role);
}

function onDungeonDuoPartnerDowned() {
    if (!isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return;
    const deadSlot = duo.role === 'host' ? 'guest' : 'host';
    markDungeonDuoDeadSlotsActed();
    dungeonDuoRoundActs[deadSlot] = true;
    const next = dungeonDuoPickActiveSlot();
    if (next) {
        dungeonDuoActiveSlot = next;
        isPlayerTurn = dungeonDuoLocalCanAct();
        if (typeof addBattleLog === 'function') {
            addBattleLog('💀 Союзник выбыл — ваш ход.', 'warning');
        }
    } else {
        markDungeonDuoDeadSlotsActed();
        isPlayerTurn = false;
        if (dungeonDuoRoundActs.host && dungeonDuoRoundActs.guest && duo.role === 'host') {
            resetDungeonDuoRoundActs();
            markDungeonDuoDeadSlotsActed();
            if (typeof broadcastDungeonDuoRoomState === 'function') broadcastDungeonDuoRoomState();
            startDungeonDuoMonsterPhase();
        }
    }
    if (duo.role === 'host' && typeof broadcastDungeonDuoRoomState === 'function' && next) {
        broadcastDungeonDuoRoomState();
    }
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
}

function onDungeonDuoLocalPlayerDowned() {
    if (!isDungeonDuoBattleActive()) return;
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    if (!duo || !duo.role) return;
    isPlayerTurn = false;
    dungeonDuoRoundActs[duo.role] = true;
    if (typeof addBattleLog === 'function') addBattleLog('💀 Вы выбыли. Бой продолжает напарник.', 'warning');
    if (typeof addMessage === 'function') addMessage('💀 Вы выбыли из боя. Напарник сражается дальше.', 'warning');
    if (typeof sendDuoDungeonBattleAction === 'function') {
        const snap = typeof buildDungeonRoomSnapshot === 'function' ? buildDungeonRoomSnapshot() : null;
        if (snap && typeof fillPartyInSnapshot === 'function') fillPartyInSnapshot(snap);
        sendDuoDungeonBattleAction({ type: 'player_downed', snapshot: snap, slot: duo.role });
    }
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
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

function clonePartySlotSnapshot(snapshot) {
    if (!snapshot) return null;
    return {
        ...snapshot,
        temporaryEffects: cloneDungeonDuoEffects(snapshot.temporaryEffects)
    };
}

function fillPartyInSnapshot(snap) {
    const duo = typeof getDuoDungeonState === 'function' ? getDuoDungeonState() : null;
    const local = buildDungeonDuoPartySnapshot();
    if (!snap.party) snap.party = { host: null, guest: null };
    if (duo && duo.role === 'host') {
        snap.party.host = local;
        if (dungeonDuoAlly) snap.party.guest = clonePartySlotSnapshot(dungeonDuoAlly);
    } else if (duo && duo.role === 'guest') {
        snap.party.guest = local;
        if (dungeonDuoAlly) snap.party.host = clonePartySlotSnapshot(dungeonDuoAlly);
    }
}

/** После баффа/лечения/щита — синхронизация партии и UI у обоих игроков. */
function syncDungeonDuoPartyAfterSupport(targetKind) {
    if (!isDungeonDuoBattleActive()) return;
    if (targetKind === 'ally' && dungeonDuoAlly) {
        setDungeonDuoAlly(dungeonDuoAlly);
    }
    requestDungeonDuoStateSync();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
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

    markDungeonDuoDeadSlotsActed();
    const canAct = dungeonDuoLocalCanAct();
    if (!isDungeonDuoSlotAlive(duo && duo.role) && duo) {
        isPlayerTurn = false;
    } else {
        isPlayerTurn = canAct;
    }
    if (canAct && !wasLocalTurn && typeof addBattleLog === 'function') addBattleLog('✅ Ваш ход.', 'success');
    if (!canAct && wasLocalTurn && dungeonDuoCoopPlayerPhase && typeof addBattleLog === 'function') {
        addBattleLog('⏳ Ход союзника…', 'info');
    }
    if (payload.visual && typeof playRemoteDungeonDuoVisual === 'function') {
        playRemoteDungeonDuoVisual(payload.visual);
    }
    if (typeof updateBattleButtons === 'function') updateBattleButtons();
    if (typeof updateBattleStatusPanels === 'function') updateBattleStatusPanels();
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
    markDungeonDuoDeadSlotsActed();

    if (!dungeonDuoRoundActs.host || !dungeonDuoRoundActs.guest) {
        const next = dungeonDuoPickActiveSlot();
        dungeonDuoActiveSlot = next || dungeonDuoFirstAliveSlot();
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
    markDungeonDuoDeadSlotsActed();
    dungeonDuoActiveSlot = dungeonDuoFirstAliveSlot();

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
    markDungeonDuoDeadSlotsActed();
    dungeonDuoCoopPlayerPhase = true;
    dungeonDuoActiveSlot = dungeonDuoFirstAliveSlot();
    isPlayerTurn = dungeonDuoLocalCanAct();
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
    if (payload.type === 'player_downed') {
        if (payload.snapshot) applyDungeonDuoRoomSnapshot(payload.snapshot);
        if (payload.slot) dungeonDuoRoundActs[payload.slot] = true;
        markDungeonDuoDeadSlotsActed();
        const next = dungeonDuoPickActiveSlot();
        if (next) {
            dungeonDuoActiveSlot = next;
            isPlayerTurn = dungeonDuoLocalCanAct();
            if (typeof addBattleLog === 'function') addBattleLog('💀 Союзник выбыл — ваш ход.', 'warning');
            broadcastDungeonDuoRoomState();
        }
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return;
    }
    if (payload.type === 'end_turn') {
        if (payload.snapshot) applyDungeonDuoRoomSnapshot(payload.snapshot);
        if (payload.acted === 'guest') dungeonDuoRoundActs.guest = true;
        if (payload.acted === 'host') dungeonDuoRoundActs.host = true;
        markDungeonDuoDeadSlotsActed();
        const next = dungeonDuoPickActiveSlot();
        if (next) {
            dungeonDuoActiveSlot = next;
            isPlayerTurn = next === 'host';
            broadcastDungeonDuoRoomState();
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return;
        }
        if (dungeonDuoRoundActs.host && dungeonDuoRoundActs.guest) {
            isPlayerTurn = false;
            broadcastDungeonDuoRoomState();
            startDungeonDuoMonsterPhase();
        }
        return;
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
window.resetDungeonDuoRoundActs = resetDungeonDuoRoundActs;
window.getDungeonDuoActiveSlot = function () { return dungeonDuoActiveSlot; };
window.getDungeonDuoRoundActs = function () { return Object.assign({}, dungeonDuoRoundActs); };
window.onDungeonDuoPlayerActionEnded = onDungeonDuoPlayerActionEnded;
window.applyRemoteDuoDungeonBattleActionImpl = applyRemoteDuoDungeonBattleActionImpl;
window.requestDungeonDuoStateSync = requestDungeonDuoStateSync;
window.syncDungeonDuoPartyAfterSupport = syncDungeonDuoPartyAfterSupport;
window.clonePartySlotSnapshot = clonePartySlotSnapshot;
window.onDungeonDuoMonsterPhaseComplete = onDungeonDuoMonsterPhaseComplete;
window.buildDungeonDuoPartySnapshot = buildDungeonDuoPartySnapshot;
window.fillPartyInSnapshot = fillPartyInSnapshot;
window.applyDungeonDuoLocalPartySnapshot = applyDungeonDuoLocalPartySnapshot;
window.dungeonDuoLocalCanAct = dungeonDuoLocalCanAct;
window.pushDungeonDuoBattleVisual = pushDungeonDuoBattleVisual;
window.playRemoteDungeonDuoVisual = playRemoteDungeonDuoVisual;
window.isDungeonDuoSlotAlive = isDungeonDuoSlotAlive;
window.getDungeonDuoSlotHealth = getDungeonDuoSlotHealth;
window.onDungeonDuoPartnerDowned = onDungeonDuoPartnerDowned;
window.onDungeonDuoLocalPlayerDowned = onDungeonDuoLocalPlayerDowned;
