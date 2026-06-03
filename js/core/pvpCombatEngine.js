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

    function syncPlayerDebuffFromEffect(effectType, debuffType, fighterEffects) {
        if (typeof player === 'undefined' || !player.temporaryEffects) return;
        const fx = (fighterEffects || []).find(e => e.type === effectType && (e.dur || 0) > 0);
        if (fx) {
            const val = fx.val ?? fx.value ?? (effectType === 'Ослепление' ? 40 : 0);
            let chip = player.temporaryEffects.find(e => e.type === debuffType);
            if (!chip) {
                player.temporaryEffects.push({ type: debuffType, dur: fx.dur, value: val });
            } else {
                chip.dur = fx.dur;
                chip.value = val;
            }
        } else {
            player.temporaryEffects = player.temporaryEffects.filter(e => e.type !== debuffType);
        }
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
        } else {
            playerFrozenTurns = 0;
            player.temporaryEffects = player.temporaryEffects.filter(e => e.type !== 'debuff_freeze');
        }

        syncPlayerDebuffFromEffect('Ослепление', 'debuff_blind', f.effects);
        syncPlayerDebuffFromEffect('slow', 'debuff_slow', f.effects);

        if (f.skipNextTurn) playerSkipNextTurn = true;
        else if (typeof playerSkipNextTurn !== 'undefined') playerSkipNextTurn = false;
    }

    const FIGHTER_DOT_CHIP_KEYS = {
        'Горение': 'burn', burn: 'burn',
        'Яд': 'poison', poison: 'poison',
        'Кровотечение': 'bleed', bleed: 'bleed',
        'Шок': 'shock', shock: 'shock'
    };

    const FIGHTER_DOT_ICONS = { burn: '🔥', poison: '☠️', bleed: '🩸', shock: '⚡' };

    /** Mirror match fighter.effects onto player chips (DoT + CC) for UI and battle math. */
    function syncFighterEffectsToPlayerDisplay(fighter) {
        const f = ensureFighter(fighter);
        if (!f || typeof player === 'undefined' || !player.temporaryEffects) return;

        player.temporaryEffects = player.temporaryEffects.filter(e => !e._pvpFighterSync);

        for (const effect of f.effects || []) {
            if ((effect.dur || 0) <= 0) continue;
            if (isDotEffectType(effect.type) && effect.val) {
                const dotKey = FIGHTER_DOT_CHIP_KEYS[effect.type] || effect.type;
                const dotIcons = FIGHTER_DOT_ICONS;
                player.temporaryEffects.push({
                    type: 'dot_' + dotKey,
                    value: effect.val,
                    dur: effect.dur,
                    isDot: true,
                    dotIcon: dotIcons[dotKey] || '☠️',
                    _pvpFighterSync: true
                });
            }
        }

        applyCcFromFighterToPlayer(f);
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
            const kept = effects[stunIdx];
            if ((kept.dur || 0) <= 0) {
                effects = effects.filter((_, i) => i !== stunIdx);
            }
        }

        f.effects = effects;

        const blindChip = player.temporaryEffects && player.temporaryEffects.find(e => e.type === 'debuff_blind');
        if (blindChip && (blindChip.dur || 0) > 0) {
            const blindIdx = effects.findIndex(e => e.type === 'Ослепление');
            const entry = { type: 'Ослепление', dur: blindChip.dur, val: blindChip.value || 40 };
            if (blindIdx >= 0) effects[blindIdx] = { ...effects[blindIdx], ...entry };
            else effects.push(entry);
        } else {
            effects = effects.filter(e => e.type !== 'Ослепление');
        }

        const slowChip = player.temporaryEffects && player.temporaryEffects.find(e => e.type === 'debuff_slow');
        if (slowChip && (slowChip.dur || 0) > 0) {
            const slowIdx = effects.findIndex(e => e.type === 'slow');
            const entry = { type: 'slow', dur: slowChip.dur, val: slowChip.value || 0 };
            if (slowIdx >= 0) effects[slowIdx] = { ...effects[slowIdx], ...entry };
            else effects.push(entry);
        } else {
            effects = effects.filter(e => e.type !== 'slow');
        }

        f.effects = effects;
        f.skipNextTurn = !!playerSkipNextTurn;
        return f;
    }

    /** Огненный шторм dotOverTime — monsterTurn не вызывается в PvP. */
    function tickFighterDotOverTime(fighter, sourceAttack, logPrefix) {
        const f = ensureFighter(fighter);
        const dot = f.dotOverTime;
        if (!dot || (dot.remaining || 0) <= 0) return [];

        const atk = sourceAttack || 1;
        const dmg = Math.max(1, Math.floor(atk * (dot.dmgPercent || 0) / 100));
        f.health = Math.max(0, (f.health || 0) - dmg);
        dot.remaining--;
        if (dot.remaining <= 0) f.dotOverTime = null;

        return [`${logPrefix || ''}🌪️ Продолжительный урон: -${dmg} HP`];
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
        const actor = match.players[actingRole];
        const remoteFighter = match.players[remoteRole];
        const dotPrefix = remoteRole === (localRole === 'host' ? 'guest' : 'host') ? '' : `🔥 ${remoteName}: `;
        const stormLogs = tickFighterDotOverTime(remoteFighter, actor && actor.attack, dotPrefix);
        stormLogs.forEach(msg => {
            if (typeof addBattleLog === 'function') addBattleLog(msg, 'dmg');
        });

        [actingRole, remoteRole].forEach(role => {
            const f = ensureFighter(match.players[role]);
            if ((f.armorShredTurns || 0) > 0) {
                f.armorShredTurns--;
                if (f.armorShredTurns <= 0) f.armorShred = 0;
            }
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
        syncFighterEffectsToPlayerDisplay,
        syncFighterCcFromPlayer,
        tickFighterBuffs,
        tickFighterEffectsGlobal,
        tickFighterDotOverTime,
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
