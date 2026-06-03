// PvP combat engine: authoritative fighter state (effects, CC, buffs) + turn/CC rules from boss battle.
(function () {
    const STUN_CC_TYPES = ['Заморозка', 'Оглушение'];

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value || null));
    }

    function ensureFighter(fighter) {
        if (!fighter) return null;
        if (!Array.isArray(fighter.abilities)) fighter.abilities = [];
        if (!Array.isArray(fighter.temporaryEffects)) fighter.temporaryEffects = [];
        if (!Array.isArray(fighter.effects)) fighter.effects = [];
        if (!fighter.activeBuffs || typeof fighter.activeBuffs !== 'object') fighter.activeBuffs = {};
        if (!fighter.combat || typeof fighter.combat !== 'object') {
            fighter.combat = {
                rageStack: 0,
                comboAbilityId: null,
                abilityComboStep: 0,
                nextAttackBonus: 0,
                nextCritGuaranteed: false,
                markedTarget: false
            };
        }
        fighter.armorShred = fighter.armorShred || 0;
        fighter.marked = !!fighter.marked;
        fighter.damageAmp = fighter.damageAmp || 1;
        fighter.dotOverTime = fighter.dotOverTime || null;
        fighter.skipNextTurn = !!fighter.skipNextTurn;
        return fighter;
    }

    function findStunCc(effects) {
        if (!effects || !effects.length) return null;
        return effects.find(e => STUN_CC_TYPES.includes(e.type) && (e.dur || 0) > 0) || null;
    }

    /** Mirror monster CC on local player (for beginPlayerAction / UI debuff chips). */
    function applyCcFromFighterToPlayer(fighter) {
        const f = ensureFighter(fighter);
        if (!f || typeof player === 'undefined') return;

        const stun = findStunCc(f.effects);
        if (stun) {
            playerFrozenTurns = Math.max(playerFrozenTurns || 0, stun.dur || 1);
            if (stun.type === 'Заморозка') {
                let freezeFx = player.temporaryEffects.find(e => e.type === 'debuff_freeze');
                if (!freezeFx) {
                    player.temporaryEffects.push({ type: 'debuff_freeze', dur: stun.dur, value: 0 });
                } else {
                    freezeFx.dur = stun.dur;
                }
            }
        } else if (!(playerFrozenTurns > 0)) {
            player.temporaryEffects = player.temporaryEffects.filter(e => e.type !== 'debuff_freeze');
        }

        if (f.skipNextTurn) playerSkipNextTurn = true;
    }

    /** Persist local CC globals back into match fighter (after skip or debuff). */
    function syncFighterCcFromPlayer(fighter) {
        const f = ensureFighter(fighter);
        if (!f) return f;

        let effects = cloneJson(f.effects || []);
        const stunIdx = effects.findIndex(e => STUN_CC_TYPES.includes(e.type));

        if (playerFrozenTurns > 0) {
            const type = (stunIdx >= 0 && effects[stunIdx].type) || 'Заморозка';
            const entry = { type, dur: playerFrozenTurns, val: stunIdx >= 0 ? effects[stunIdx].val : 0 };
            if (stunIdx >= 0) effects[stunIdx] = { ...effects[stunIdx], ...entry };
            else effects.push(entry);
        } else if (stunIdx >= 0) {
            effects = effects.filter((_, i) => i !== stunIdx);
        }

        f.effects = effects;
        f.skipNextTurn = !!playerSkipNextTurn;
        return f;
    }

    function tickFighterBuffs(fighter) {
        const f = ensureFighter(fighter);
        if (!f.activeBuffs) return;
        for (const type of Object.keys(f.activeBuffs)) {
            const buff = f.activeBuffs[type];
            if (!buff || typeof buff.remainingTurns !== 'number') continue;
            buff.remainingTurns--;
            if (buff.remainingTurns <= 0) delete f.activeBuffs[type];
        }
    }

    function isDotEffectType(type) {
        return typeof isMonsterDotEffectType === 'function' && isMonsterDotEffectType(type);
    }

    /** End-of-global-turn effect tick (DoT etc.), same rules as monsterTurn tail in battleMonster.js */
    function tickFighterEffectsGlobal(fighter, logPrefix) {
        const f = ensureFighter(fighter);
        if (!f.effects || !f.effects.length) return [];

        const logs = [];
        f.effects = f.effects.filter(e => {
            if (STUN_CC_TYPES.includes(e.type)) return (e.dur || 0) > 0;

            if (e.val && isDotEffectType(e.type)) {
                let dotDamage = Math.floor((f.maxHealth || 1) * e.val / 100);
                if (e.type === 'Горение' && f.fireVuln) {
                    dotDamage = Math.floor(dotDamage * (1 + f.fireVuln / 100));
                }
                f.health = Math.max(0, (f.health || 0) - dotDamage);
                logs.push(`${logPrefix}${e.type}: -${dotDamage} HP`);
            }
            e.dur--;
            return e.dur > 0;
        });

        return logs;
    }

    function tickBothFightersEndOfTurn(match, actingRole) {
        if (!match || !match.players) return;
        const remoteRole = actingRole === 'host' ? 'guest' : 'host';
        tickFighterBuffs(match.players[actingRole]);
        tickFighterBuffs(match.players[remoteRole]);

        const localRole = typeof getLocalPvPRole === 'function' ? getLocalPvPRole() : 'host';
        const remoteName = (match.players[remoteRole] && match.players[remoteRole].name) || 'Соперник';

        [actingRole, remoteRole].forEach(role => {
            const prefix = role === remoteRole ? `🔥 ${remoteName}: ` : '';
            const dotLogs = tickFighterEffectsGlobal(match.players[role], prefix);
            dotLogs.forEach(msg => {
                if (typeof addBattleLog === 'function') addBattleLog(msg, 'dmg');
            });
        });
    }

    function effectsSig(effects) {
        if (!effects || !effects.length) return '';
        return effects.map(e => `${e.type}:${e.dur}:${e.val || 0}`).join(',');
    }

    window.pvpCombatEngine = {
        STUN_CC_TYPES,
        ensureFighter,
        findStunCc,
        applyCcFromFighterToPlayer,
        syncFighterCcFromPlayer,
        tickFighterBuffs,
        tickFighterEffectsGlobal,
        tickBothFightersEndOfTurn,
        effectsSig,

        getExtendedMatchSig(match) {
            if (!match || !match.players) return '';
            const h = ensureFighter(match.players.host);
            const g = ensureFighter(match.players.guest);
            return [
                match.turn,
                match.active,
                match.finished ? 1 : 0,
                h.health,
                g.health,
                h.mana,
                g.mana,
                effectsSig(h.effects),
                effectsSig(g.effects)
            ].join('|');
        }
    };
})();
