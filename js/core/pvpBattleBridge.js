// PvP battle bridge: reuse boss battle (abilities, buffs, renderBattle) with networked match state.
(function () {
    const PVP_COMBAT_VERSION = 2;

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value || null));
    }

    function createEmptyFighterCombat() {
        return {
            rageStack: 0,
            comboAbilityId: null,
            abilityComboStep: 0,
            nextAttackBonus: 0,
            nextCritGuaranteed: false,
            markedTarget: false,
            deathSaveActive: false,
            reviveUsed: false,
            lingeringCloud: false,
            summonedSpirit: false
        };
    }

    function ensureFighterShape(fighter) {
        if (!fighter) return null;
        if (!Array.isArray(fighter.abilities)) fighter.abilities = [];
        if (!Array.isArray(fighter.temporaryEffects)) fighter.temporaryEffects = [];
        if (!Array.isArray(fighter.effects)) fighter.effects = [];
        if (!fighter.activeBuffs || typeof fighter.activeBuffs !== 'object') fighter.activeBuffs = {};
        if (!fighter.combat || typeof fighter.combat !== 'object') fighter.combat = createEmptyFighterCombat();
        fighter.armorShred = fighter.armorShred || 0;
        fighter.marked = !!fighter.marked;
        fighter.damageAmp = fighter.damageAmp || 1;
        fighter.dotOverTime = fighter.dotOverTime || null;
        fighter.skipNextTurn = !!fighter.skipNextTurn;
        return fighter;
    }

    function rebuildAbilitiesFromDb(fighter) {
        const school = typeof ABILITIES_DB !== 'undefined'
            && ABILITIES_DB[fighter.class]
            && ABILITIES_DB[fighter.class][fighter.branch];
        if (!school || !school.abilities) return fighter.abilities || [];
        const unlocked = school.abilities.filter(a => (fighter.level || 1) >= (a.lvl || 1));
        const prev = fighter.abilities || [];
        return unlocked.map(base => {
            const saved = prev.find(p => p && p.name === base.name) || {};
            return { ...cloneJson(base), currentCooldown: saved.currentCooldown || 0 };
        });
    }

    function fighterToMonster(fighter, avatarSrc) {
        const f = ensureFighterShape(cloneJson(fighter));
        const img = avatarSrc && String(avatarSrc).trim() ? String(avatarSrc).trim() : '';
        return {
            name: f.name || 'Соперник',
            icon: '⚔️',
            img: img,
            health: Math.max(0, f.health || 1),
            maxHealth: Math.max(1, f.maxHealth || 1),
            attack: f.attack || 1,
            defense: f.defense || 0,
            effects: cloneJson(f.effects),
            activeBuffs: cloneJson(f.activeBuffs),
            armorShred: f.armorShred || 0,
            marked: !!f.marked,
            markBonus: f.markBonus || 0,
            armorShredTurns: f.armorShredTurns || 0,
            fireVuln: f.fireVuln || 0,
            dotOverTime: f.dotOverTime ? cloneJson(f.dotOverTime) : null,
            damageAmp: f.damageAmp || 1,
            abilities: [],
            goldMult: 0,
            exp: 0,
            returnTo: ''
        };
    }

    function tryPvPSurvivalMechanics(fighter) {
        if (!player || player.health > 0) return false;
        const c = fighter && fighter.combat;
        if (typeof deathSaveActive !== 'undefined' && deathSaveActive) {
            player.health = Math.max(1, Math.floor(player.maxHealth * 0.1));
            deathSaveActive = false;
            if (c) c.deathSaveActive = false;
            addBattleLog('🛡️ Инстинкт выживания! Осталось 10% HP', 'success');
            return true;
        }
        if (c && c.deathSaveActive) {
            player.health = Math.max(1, Math.floor(player.maxHealth * 0.1));
            c.deathSaveActive = false;
            deathSaveActive = false;
            addBattleLog('🛡️ Инстинкт выживания! Осталось 10% HP', 'success');
            return true;
        }
        const reviveAb = player.abilities && player.abilities.find(ab =>
            (ab.reviveOnDeath || ab.reviveOnce) && !(typeof reviveUsed !== 'undefined' && reviveUsed));
        if (reviveAb && !(c && c.reviveUsed)) {
            if (typeof reviveUsed !== 'undefined') reviveUsed = true;
            if (c) c.reviveUsed = true;
            const hpPct = reviveAb.reviveHp || reviveAb.revive || 50;
            player.health = Math.max(1, Math.floor(player.maxHealth * hpPct / 100));
            addBattleLog(`✨ ${reviveAb.name}! Воскрешение с ${hpPct}% HP`, 'success');
            return true;
        }
        return false;
    }

    function applyPlayerFromFighter(fighter) {
        const f = ensureFighterShape(fighter);
        const prevHp = player.health;
        player.health = Math.max(0, Math.min(f.maxHealth, f.health));
        player.maxHealth = Math.max(1, f.maxHealth);
        player.attack = f.attack;
        player.defense = f.defense;
        player.criticalChance = f.criticalChance;
        player.criticalDamage = f.criticalDamage;
        player.dodgeChance = f.dodgeChance;
        player.temporaryEffects = cloneJson(f.temporaryEffects);
        player.abilities = cloneJson(f.abilities);
        if (player.class === 'Маг') {
            player.maxMana = Math.max(0, f.maxMana || player.maxMana || 0);
            player.mana = Math.max(0, Math.min(player.maxMana, f.mana || 0));
        }
        if (window.pvpCombatEngine) {
            window.pvpCombatEngine.applyCcFromFighterToPlayer(f);
        }
        playerSkipNextTurn = !!f.skipNextTurn;

        if (f.combat) {
            if (f.combat.deathSaveActive) deathSaveActive = true;
            if (f.combat.reviveUsed && typeof reviveUsed !== 'undefined') reviveUsed = true;
            if (f.combat.lingeringCloud) lingeringCloud = true;
            if (f.combat.summonedSpirit) summonedSpirit = true;
        }

        if (player.health < prevHp && currentMonster && player.temporaryEffects) {
            const counter = player.temporaryEffects.find(e => e.counterChance);
            if (counter && Math.random() * 100 <= counter.counterChance) {
                const counterDmg = Math.floor(
                    (typeof getPlayerEffectiveAttack === 'function' ? getPlayerEffectiveAttack() : player.attack)
                    * (counter.counterDmg || 80) / 100
                );
                if (typeof applyDamageToMonster === 'function') {
                    applyDamageToMonster(counterDmg);
                    addBattleLog(`↩️ Контратака! ${counterDmg} урона`, 'dmg');
                }
            }
        }

        if (tryPvPSurvivalMechanics(f)) {
            f.health = player.health;
            if (pvpState && pvpState.match) {
                const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
                pvpState.match.players[localRole] = pullPlayerIntoFighter(f);
            }
        }
    }

    function pullPlayerIntoFighter(fighter) {
        const f = ensureFighterShape(fighter);
        f.health = Math.max(0, player.health);
        f.maxHealth = Math.max(1, player.maxHealth);
        f.attack = player.attack;
        f.defense = player.defense;
        f.criticalChance = player.criticalChance;
        f.criticalDamage = player.criticalDamage;
        f.dodgeChance = player.dodgeChance;
        f.temporaryEffects = cloneJson(player.temporaryEffects);
        f.abilities = cloneJson(player.abilities);
        if (player.class === 'Маг') {
            f.maxMana = player.maxMana;
            f.mana = player.mana;
        }
        if (typeof getPvPAvatar === 'function') {
            f.avatar = getPvPAvatar();
        }
        f.combat = {
            rageStack: typeof rageStack !== 'undefined' ? rageStack : 0,
            comboAbilityId: typeof comboAbilityId !== 'undefined' ? comboAbilityId : null,
            abilityComboStep: typeof abilityComboStep !== 'undefined' ? abilityComboStep : 0,
            nextAttackBonus: typeof nextAttackBonus !== 'undefined' ? nextAttackBonus : 0,
            nextCritGuaranteed: !!nextCritGuaranteed,
            markedTarget: !!markedTarget,
            deathSaveActive: !!deathSaveActive,
            reviveUsed: typeof reviveUsed !== 'undefined' ? !!reviveUsed : false,
            lingeringCloud: !!lingeringCloud,
            summonedSpirit: !!summonedSpirit
        };
        if (window.pvpCombatEngine) {
            window.pvpCombatEngine.syncFighterCcFromPlayer(f);
        } else {
            f.skipNextTurn = !!playerSkipNextTurn;
        }
        return f;
    }

    function refreshMonsterFromRemoteMatch(remoteRole) {
        if (!currentMonster || !pvpState || !pvpState.match || !remoteRole) return;
        const rf = ensureFighterShape(pvpState.match.players[remoteRole]);
        if (!rf) return;
        currentMonster.health = Math.max(0, rf.health);
        currentMonster.maxHealth = Math.max(1, rf.maxHealth);
        currentMonster.effects = cloneJson(rf.effects);
        currentMonster.activeBuffs = cloneJson(rf.activeBuffs);
        currentMonster.armorShred = rf.armorShred || 0;
        currentMonster.marked = !!rf.marked;
        currentMonster.markBonus = rf.markBonus || 0;
        currentMonster.armorShredTurns = rf.armorShredTurns || 0;
        currentMonster.fireVuln = rf.fireVuln || 0;
        currentMonster.dotOverTime = rf.dotOverTime ? cloneJson(rf.dotOverTime) : null;
        currentMonster.damageAmp = rf.damageAmp || 1;
    }

    function pullMonsterIntoFighter(fighter) {
        const f = ensureFighterShape(fighter);
        if (!currentMonster) return f;
        f.health = Math.max(0, currentMonster.health);
        f.maxHealth = Math.max(1, currentMonster.maxHealth);
        f.attack = currentMonster.attack;
        f.defense = currentMonster.defense;
        f.effects = cloneJson(currentMonster.effects || []);
        f.activeBuffs = cloneJson(currentMonster.activeBuffs);
        f.armorShred = currentMonster.armorShred || 0;
        f.marked = !!currentMonster.marked;
        f.markBonus = currentMonster.markBonus || 0;
        f.armorShredTurns = currentMonster.armorShredTurns || 0;
        f.fireVuln = currentMonster.fireVuln || 0;
        f.dotOverTime = currentMonster.dotOverTime ? cloneJson(currentMonster.dotOverTime) : null;
        f.damageAmp = currentMonster.damageAmp || 1;
        return f;
    }

    function applyCombatGlobalsToBattle(combat) {
        const c = combat || createEmptyFighterCombat();
        rageStack = c.rageStack || 0;
        comboAbilityId = c.comboAbilityId || null;
        abilityComboStep = c.abilityComboStep || 0;
        nextAttackBonus = c.nextAttackBonus || 0;
        nextCritGuaranteed = !!c.nextCritGuaranteed;
        markedTarget = !!c.markedTarget;
        deathSaveActive = !!c.deathSaveActive;
        if (typeof reviveUsed !== 'undefined') reviveUsed = !!c.reviveUsed;
        lingeringCloud = !!c.lingeringCloud;
        summonedSpirit = !!c.summonedSpirit;
    }

    function pvpResolveEndOfTurnMonsterEffects() {
        if (!currentMonster) return;
        if (summonedSpirit) {
            const spiritDamage = Math.floor(
                (typeof getPlayerEffectiveAttack === 'function' ? getPlayerEffectiveAttack() : player.attack) * 0.8
            );
            if (typeof applyDamageToMonster === 'function') {
                const applied = applyDamageToMonster(spiritDamage);
                addBattleLog(`🌿 Дух природы наносит ${applied} урона!`, 'dmg');
            }
            summonedSpirit = false;
        }
        if (lingeringCloud && currentMonster.effects && currentMonster.effects.some(e => e.type === 'Яд')) {
            const cloudDamage = Math.floor(currentMonster.maxHealth * 0.05);
            if (typeof applyDamageToMonster === 'function') {
                const applied = applyDamageToMonster(cloudDamage);
                addBattleLog(`☁️ Ядовитое облако: ${applied} урона!`, 'dmg');
            }
        }
    }

    function applyCombatGlobalsFromFighter(fighter) {
        applyCombatGlobalsToBattle(fighter && fighter.combat);
    }

    function getMatchSig(match) {
        if (window.pvpCombatEngine && typeof window.pvpCombatEngine.getExtendedMatchSig === 'function') {
            return window.pvpCombatEngine.getExtendedMatchSig(match);
        }
        if (!match || !match.players) return '';
        const h = match.players.host;
        const g = match.players.guest;
        return [
            match.turn,
            match.active,
            match.finished ? 1 : 0,
            h.health,
            g.health,
            h.mana,
            g.mana
        ].join('|');
    }

    function prepareFightersForMatch(hostSnap, guestSnap) {
        const host = ensureFighterShape(cloneJson(hostSnap));
        const guest = ensureFighterShape(cloneJson(guestSnap));
        host.abilities = rebuildAbilitiesFromDb(host);
        guest.abilities = rebuildAbilitiesFromDb(guest);
        host.health = Math.max(1, host.maxHealth || host.health || 1);
        guest.health = Math.max(1, guest.maxHealth || guest.health || 1);
        if (host.class === 'Маг' && host.maxMana > 0) host.mana = Math.min(host.maxMana, host.mana || host.maxMana);
        if (guest.class === 'Маг' && guest.maxMana > 0) guest.mana = Math.min(guest.maxMana, guest.mana || guest.maxMana);
        if (typeof safePvPAvatarSrc === 'function') {
            host.avatar = safePvPAvatarSrc(hostSnap.avatar);
            guest.avatar = safePvPAvatarSrc(guestSnap.avatar);
        } else {
            host.avatar = hostSnap.avatar ? String(hostSnap.avatar).trim() : '';
            guest.avatar = guestSnap.avatar ? String(guestSnap.avatar).trim() : '';
        }
        return { host, guest };
    }

    window.buildPvPCombatMatch = function (hostSnap, guestSnap) {
        const fighters = prepareFightersForMatch(hostSnap, guestSnap);
        const match = {
            v: PVP_COMBAT_VERSION,
            turn: 1,
            active: 'host',
            finished: false,
            winner: '',
            players: fighters,
            sig: ''
        };
        match.sig = getMatchSig(match);
        return match;
    };

    window.syncPvPBattleFromMatch = function () {
        if (!window.pvpBattleActive || !pvpState || !pvpState.match) return;
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteRole = localRole === 'host' ? 'guest' : 'host';
        const localFighter = ensureFighterShape(pvpState.match.players[localRole]);
        const remoteFighter = ensureFighterShape(pvpState.match.players[remoteRole]);
        let remoteAvatar = '';
        if (typeof safePvPAvatarSrc === 'function') {
            remoteAvatar = safePvPAvatarSrc(remoteFighter.avatar || '');
        }
        if (!remoteAvatar && typeof getPvPRemoteAvatarSrc === 'function') {
            remoteAvatar = getPvPRemoteAvatarSrc();
        }
        if (!remoteAvatar && pvpState.remote && pvpState.remote.avatar) {
            remoteAvatar = String(pvpState.remote.avatar).trim();
        }

        applyPlayerFromFighter(localFighter);
        applyCombatGlobalsFromFighter(localFighter);

        currentMonster = fighterToMonster(remoteFighter, remoteAvatar);
        originalMonsterStats.attack = currentMonster.attack;
        originalMonsterStats.defense = currentMonster.defense;

        globalBattleTurn = pvpState.match.turn || 1;
        isPlayerTurn = !pvpState.match.finished && pvpState.match.active === localRole;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
    };

    window.syncPvPRemoteFromMonster = function () {
        if (!window.pvpBattleActive || !pvpState || !pvpState.match || !currentMonster) return;
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteRole = localRole === 'host' ? 'guest' : 'host';
        const remote = pullMonsterIntoFighter(pvpState.match.players[remoteRole]);
        pvpState.match.players[remoteRole] = remote;
        if (typeof getMatchSig === 'function') {
            pvpState.match.sig = getMatchSig(pvpState.match);
        }
    };

    window.syncPvPBattleToMatch = function () {
        if (!window.pvpBattleActive || !pvpState || !pvpState.match) return;
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteRole = localRole === 'host' ? 'guest' : 'host';
        pvpState.match.players[localRole] = pullPlayerIntoFighter(pvpState.match.players[localRole]);
        pvpState.match.players[remoteRole] = pullMonsterIntoFighter(pvpState.match.players[remoteRole]);
        pvpState.match.sig = getMatchSig(pvpState.match);
    };

    window.enterPvPBossBattle = function () {
        if (!pvpState || !pvpState.match) return;
        window.pvpBattleActive = true;
        window.pvpBattleSig = pvpState.match.sig || getMatchSig(pvpState.match);
        window.pvpDodgeSkipOpponent = false;

        if (typeof resetAllCooldowns === 'function') resetAllCooldowns();
        battleLogEntries = [];
        window.echoActive = false;
        playerSkipNextTurn = false;
        playerFrozenTurns = 0;

        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        pvpState.match.players[localRole].abilities = rebuildAbilitiesFromDb(
            pvpState.match.players[localRole]
        );

        if (player.abilities) {
            const passiveCounter = player.abilities.find(a => a.passive && a.counterChance);
            if (passiveCounter && !player.temporaryEffects.some(e => e.counterChance)) {
                player.temporaryEffects.push({
                    counterChance: passiveCounter.counterChance,
                    counterDmg: passiveCounter.counterDmg || 80,
                    dur: 999
                });
            }
        }

        syncPvPBattleFromMatch();
        addBattleLog('🏟️ PvP матч начался!', 'info');
        if (typeof renderBattle === 'function') renderBattle({ force: true });

        if (pvpState.match.active === localRole) {
            setTimeout(() => {
                if (window.pvpBattleActive && typeof window.pvpOnTurnStart === 'function') {
                    window.pvpOnTurnStart(false);
                }
            }, 80);
        }
    };

    function broadcastPvPBattleTurn(extraLog) {
        syncPvPBattleToMatch();
        const prevSig = window.pvpBattleSig || getMatchSig(pvpState.match);
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteRole = localRole === 'host' ? 'guest' : 'host';

        if (pvpState.match.players[remoteRole].health <= 0) {
            window.pvpBroadcastMatchEnd(true);
            return;
        }
        if (player.health <= 0) {
            const localFighter = pvpState.match.players[localRole];
            if (tryPvPSurvivalMechanics(localFighter)) {
                syncPvPBattleToMatch();
            }
        }
        if (player.health <= 0) {
            window.pvpBroadcastMatchEnd(false);
            return;
        }

        if (window.pvpCombatEngine) {
            window.pvpCombatEngine.tickBothFightersEndOfTurn(pvpState.match, localRole);
            refreshMonsterFromRemoteMatch(remoteRole);
            syncPvPBattleToMatch();
        }

        pvpState.match.active = remoteRole;
        pvpState.match.turn = (pvpState.match.turn || 1) + 1;
        pvpState.match.sig = getMatchSig(pvpState.match);
        window.pvpBattleSig = pvpState.match.sig;

        if (extraLog) addBattleLog(extraLog, 'info');
        if (typeof sendPvPMessage === 'function') {
            sendPvPMessage('turn', {
                match: cloneJson(pvpState.match),
                prevSig,
                log: (battleLogEntries || []).slice(-12)
            });
        }

        isPlayerTurn = false;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        if (typeof renderBattle === 'function') renderBattle();
        if (typeof pvpLog === 'function') pvpLog('Ход передан сопернику.', 'info');
    }

    window.pvpOnEndPlayerActionChain = function () {
        if (!window.pvpBattleActive) return;
        if (window.pvpDodgeSkipOpponent) {
            window.pvpDodgeSkipOpponent = false;
            if (typeof endGlobalTurn === 'function') endGlobalTurn();
            syncPvPBattleToMatch();
            isPlayerTurn = true;
            if (typeof onPlayerTurnStart === 'function') onPlayerTurnStart();
            if (typeof renderBattle === 'function') renderBattle();
            return;
        }
        if (typeof endGlobalTurn === 'function') endGlobalTurn();
        pvpResolveEndOfTurnMonsterEffects();
        syncPvPBattleToMatch();
        broadcastPvPBattleTurn();
    };

    window.pvpOnMonsterPhaseSkipped = function () {
        if (!window.pvpBattleActive) return;
        broadcastPvPBattleTurn();
    };

    let pvpAutoPassInFlight = false;

    function pvpPassTurnFromCc(message) {
        if (pvpAutoPassInFlight || !window.pvpBattleActive) return;
        pvpAutoPassInFlight = true;
        syncPvPBattleToMatch();
        if (typeof renderBattle === 'function') renderBattle();
        broadcastPvPBattleTurn(message || null);
        pvpAutoPassInFlight = false;
    }

    /** PvP: start of local turn / before action — CC skip like monsterTurn stun check. */
    window.pvpOnTurnStart = function (isActionAttempt) {
        if (!window.pvpBattleActive || !pvpState || !pvpState.match) return true;

        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        if (pvpState.match.finished || pvpState.match.active !== localRole) {
            isPlayerTurn = false;
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return false;
        }

        syncPvPBattleFromMatch();
        const fighter = ensureFighterShape(pvpState.match.players[localRole]);
        const eng = window.pvpCombatEngine;

        if (eng) eng.applyCcFromFighterToPlayer(fighter);

        const stun = eng ? eng.findStunCc(fighter.effects) : null;
        if (stun) {
            if (!isActionAttempt) {
                const label = stun.type === 'Оглушение' ? 'оглушены' : 'заморожены';
                addBattleLog(`❄️ Вы ${label} и пропускаете ход!`, 'info');
                stun.dur = Math.max(0, (stun.dur || 1) - 1);
                if (stun.dur <= 0) {
                    fighter.effects = (fighter.effects || []).filter(e => e !== stun);
                    playerFrozenTurns = 0;
                    player.temporaryEffects = player.temporaryEffects.filter(e => e.type !== 'debuff_freeze');
                } else {
                    playerFrozenTurns = stun.dur;
                    const freezeFx = player.temporaryEffects.find(e => e.type === 'debuff_freeze');
                    if (freezeFx) freezeFx.dur = stun.dur;
                }
                pvpState.match.players[localRole] = fighter;
                if (eng) eng.syncFighterCcFromPlayer(fighter);
                syncPvPBattleToMatch();
                isPlayerTurn = false;
                if (typeof updateBattleButtons === 'function') updateBattleButtons();
                pvpPassTurnFromCc();
                return false;
            }
            isPlayerTurn = false;
            if (typeof updateBattleButtons === 'function') updateBattleButtons();
            return false;
        }

        if (playerFrozenTurns > 0) {
            if (!isActionAttempt) {
                playerFrozenTurns--;
                const freezeFx = player.temporaryEffects.find(e => e.type === 'debuff_freeze');
                if (freezeFx) {
                    freezeFx.dur--;
                    if (freezeFx.dur <= 0) {
                        player.temporaryEffects = player.temporaryEffects.filter(e => e !== freezeFx);
                    }
                }
                if (eng) eng.syncFighterCcFromPlayer(fighter);
                addBattleLog('❄️ Заморозка — вы не можете действовать!', 'info');
                syncPvPBattleToMatch();
                isPlayerTurn = false;
                if (typeof updateBattleButtons === 'function') updateBattleButtons();
                if (typeof renderBattle === 'function') renderBattle();
                pvpPassTurnFromCc();
                return false;
            }
            return false;
        }

        if (playerSkipNextTurn) {
            if (!isActionAttempt) {
                playerSkipNextTurn = false;
                fighter.skipNextTurn = false;
                if (eng) eng.syncFighterCcFromPlayer(fighter);
                addBattleLog('💫 Вы пропускаете ход...', 'info');
                syncPvPBattleToMatch();
                isPlayerTurn = false;
                if (typeof updateBattleButtons === 'function') updateBattleButtons();
                if (typeof renderBattle === 'function') renderBattle();
                pvpPassTurnFromCc();
                return false;
            }
            return false;
        }

        isPlayerTurn = true;
        if (typeof updateBattleButtons === 'function') updateBattleButtons();
        return true;
    };

    window.pvpOnDodgeFailed = function () {
        if (!window.pvpBattleActive) return;
        broadcastPvPBattleTurn('❌ Уклонение не удалось — ход соперника.');
    };

    window.pvpBroadcastMatchEnd = function (localWon) {
        if (!pvpState || !pvpState.match) {
            if (typeof window.pvpFinishPvPBattle === 'function') window.pvpFinishPvPBattle(localWon);
            return;
        }
        if (window.pvpBattleActive) syncPvPBattleToMatch();
        const prevSig = window.pvpBattleSig || getMatchSig(pvpState.match);
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteRole = localRole === 'host' ? 'guest' : 'host';
        if (localWon && pvpState.match.players[remoteRole]) {
            pvpState.match.players[remoteRole].health = 0;
        }
        if (!localWon && pvpState.match.players[localRole]) {
            pvpState.match.players[localRole].health = 0;
        }
        pvpState.match.finished = true;
        pvpState.match.winner = localWon ? localRole : remoteRole;
        pvpState.match.active = localWon ? localRole : remoteRole;
        pvpState.match.sig = getMatchSig(pvpState.match);
        window.pvpBattleSig = pvpState.match.sig;
        if (typeof sendPvPMessage === 'function') {
            sendPvPMessage('turn', {
                match: cloneJson(pvpState.match),
                prevSig,
                log: (battleLogEntries || []).slice(-12)
            });
            sendPvPMessage('end', { match: cloneJson(pvpState.match), message: 'Матч завершён.' });
        }
        window.pvpFinishPvPBattle(localWon);
    };

    window.pvpFinishPvPBattle = function (localWon, fromRemoteSync) {
        if (!window.pvpBattleActive && !fromRemoteSync) return;
        window.pvpBattleActive = false;
        window.pvpDodgeSkipOpponent = false;
        const name = localWon ? 'Победа в PvP!' : 'Поражение в PvP';
        const icon = localWon ? '🏆' : '💀';
        const msg = localWon ? 'Вы победили в PvP арене!' : 'Вы проиграли PvP матч.';
        currentMonster = null;
        isPlayerTurn = true;
        window._strikeAnimActive = false;
        pvpState.status = 'ended';
        if (typeof pvpLog === 'function') pvpLog(localWon ? 'Победа!' : 'Поражение.', localWon ? 'success' : 'error');
        if (typeof showModal === 'function') {
            showModal(name, icon, msg, 'В лобби', () => {
                if (typeof showPvPArena === 'function') showPvPArena();
            });
        } else if (typeof showPvPArena === 'function') {
            showPvPArena();
        }
    };

    window.applyPvPRemoteBattleState = function (payload) {
        if (!payload || !payload.match || !pvpState) return;
        const prevSig = window.pvpBattleSig || (pvpState.match && pvpState.match.sig) || '';
        if (payload.prevSig && payload.prevSig !== prevSig) {
            if (typeof pvpLog === 'function') {
                pvpLog('Рассинхронизация хода — принят пакет соперника.', 'error');
            }
        }
        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const safeMatch = typeof sanitizePvPMatch === 'function' ? sanitizePvPMatch(payload.match) : null;
        pvpState.match = safeMatch || payload.match;
        pvpState.match.sig = getMatchSig(pvpState.match);
        window.pvpBattleSig = pvpState.match.sig;

        if (Array.isArray(payload.log) && payload.log.length) {
            payload.log.forEach(entry => {
                if (!entry || !entry.msg) return;
                const exists = battleLogEntries.some(e => e.msg === entry.msg);
                if (!exists) battleLogEntries.push({ msg: entry.msg, cls: entry.cls || 'info' });
            });
        }

        if (!window.pvpBattleActive && pvpState.status === 'battle') {
            enterPvPBossBattle();
        } else if (window.pvpBattleActive) {
            syncPvPBattleFromMatch();
        }

        if (pvpState.match.finished) {
            const localWon = pvpState.match.winner === localRole;
            if (typeof renderBattle === 'function') renderBattle();
            window.pvpFinishPvPBattle(localWon, true);
            return;
        }

        if (typeof renderBattle === 'function') renderBattle();
        if (typeof pvpLog === 'function') {
            const mine = pvpState.match.active === localRole;
            pvpLog(mine ? 'Ваш ход.' : 'Ход соперника.', 'info');
        }

        if (pvpState.match.active === localRole && !pvpState.match.finished) {
            setTimeout(() => {
                if (window.pvpBattleActive && typeof window.pvpOnTurnStart === 'function') {
                    window.pvpOnTurnStart(false);
                }
            }, 60);
        }
    };

    window.leavePvPBossBattle = function () {
        window.pvpBattleActive = false;
        window.pvpDodgeSkipOpponent = false;
        currentMonster = null;
    };

    window.getPvPMatchSig = getMatchSig;
})();
