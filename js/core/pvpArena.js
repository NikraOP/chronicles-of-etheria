// PvP Arena: Trystero/MQTT WebRTC 1v1 for static hosting.
const PVP_ROOM_PREFIX = 'etheria-pvp-';
const PVP_VERSION = 2;
const PVP_TRYSTERO_URL = '../vendor/trystero-mqtt.bundle.mjs?v=7';
const PVP_TRYSTERO_APP_ID = 'chronicles-of-etheria-pvp-v2-mqtt';
const PVP_TRYSTERO_RELAY_URLS = Object.freeze([
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker-cn.emqx.io:8084/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
    'wss://broker.hivemq.com:8884/mqtt'
]);
// ICE: STUN + TURN for cross-network WebRTC. Public openrelayproject creds are dead — use API key or freeTURN.
// Free Metered key: https://www.metered.ca/tools/openrelay/ → paste into PVP_METERED_TURN_API_KEY (optional).
const PVP_METERED_APP_SLUG = '';
const PVP_METERED_TURN_API_KEY = '';
const PVP_ICE_FETCH_TIMEOUT_MS = 12000;

let pvpRoom = null;
let pvpSendPacket = null;
let pvpRemotePeerId = '';
let pvpSessionId = 0;
let pvpTrysteroModulePromise = null;
let pvpIceServersPromise = null;
let pvpState = createEmptyPvPState();

function createEmptyPvPState() {
    return {
        status: 'idle',
        role: '',
        roomCode: '',
        error: '',
        localReady: false,
        remoteReady: false,
        local: null,
        remote: null,
        match: null,
        log: []
    };
}

function pvpLog(message, type) {
    pvpState.log.unshift({
        message,
        type: type || 'info',
        time: new Date().toLocaleTimeString()
    });
    pvpState.log = pvpState.log.slice(0, 20);
}

function pvpRoomId(code) {
    return PVP_ROOM_PREFIX + String(code || '').trim().toUpperCase();
}

function generatePvPCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return code;
}

function escapePvPText(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapePvPAttr(value) {
    return escapePvPText(value).replace(/`/g, '&#96;');
}

function safePvPClass(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function safePvPAvatarSrc(src) {
    let value = String(src || '').trim().replace(/\\/g, '/');
    if (value.startsWith('/')) value = value.slice(1);
    if (value.startsWith('./')) value = value.slice(2);
    if (!value || /[<>"'`]/.test(value)) return '';
    if (/^(javascript|data|vbscript):/i.test(value)) return '';
    if (!/\.(png|jpg|jpeg|gif|webp)$/i.test(value)) return '';
    if (value.startsWith('png/') || value.startsWith('assets/')
        || value.startsWith('monsters/') || value.startsWith('classes/') || value.startsWith('skins/')) {
        return value;
    }
    return '';
}

function pvpClassIcon(className) {
    if (className === 'Воин') return '🗡️';
    if (className === 'Маг') return '🧙';
    return '🏹';
}

function pvpAvatarDisplayUrl(relativePath) {
    const safe = safePvPAvatarSrc(relativePath);
    if (!safe) return '';
    return typeof resolveGameAssetUrl === 'function' ? resolveGameAssetUrl(safe) : safe;
}

function pvpAvatarImgError(img) {
    if (!img || !img.parentElement) return;
    img.style.display = 'none';
    let fb = img.parentElement.querySelector('.sprite-fallback');
    if (!fb) {
        fb = document.createElement('span');
        fb.className = 'sprite-fallback';
        img.parentElement.appendChild(fb);
    }
    fb.style.display = 'flex';
}

function resolveEquippedSkinImgPath() {
    if (!player) return '';
    if (player.currentSkin && typeof getSkinsForCurrentSchool === 'function') {
        const skins = getSkinsForCurrentSchool();
        const equipped = skins.find(s => s && s.id === player.currentSkin);
        if (equipped && equipped.img) {
            const safe = safePvPAvatarSrc(equipped.img);
            if (safe) {
                if (player.schoolImg !== equipped.img) player.schoolImg = equipped.img;
                return safe;
            }
        }
    }
    return safePvPAvatarSrc(player.schoolImg || '');
}

function getPvPRemoteAvatarSrc() {
    const remoteRole = typeof getRemotePvPRole === 'function' ? getRemotePvPRole() : 'guest';
    const fromRemote = pvpState.remote && pvpState.remote.avatar;
    const fromMatch = pvpState.match && pvpState.match.players[remoteRole]
        ? pvpState.match.players[remoteRole].avatar
        : '';
    return safePvPAvatarSrc(fromRemote || fromMatch || '');
}

function sanitizePvPAbility(ability) {
    if (!ability || typeof ability !== 'object') return null;
    const safe = JSON.parse(JSON.stringify(ability));
    safe.name = String(safe.name || '').slice(0, 40);
    if (!safe.name) return null;
    safe.desc = String(safe.desc || '').slice(0, 200);
    safe.icon = String(safe.icon || '✨').slice(0, 8);
    safe.lvl = clampPvPNumber(safe.lvl, 1, 999, safe.lvl || 1);
    safe.cd = clampPvPNumber(safe.cd, 0, 99, safe.cd || 0);
    safe.mana = clampPvPNumber(safe.mana, 0, 9999, safe.mana || 0);
    safe.dmg = clampPvPNumber(safe.dmg, 0, 9999, safe.dmg || 0);
    safe.heal = clampPvPNumber(safe.heal, 0, 100, safe.heal || 0);
    safe.lifesteal = clampPvPNumber(safe.lifesteal, 0, 100, safe.lifesteal || 0);
    safe.currentCooldown = clampPvPNumber(safe.currentCooldown, 0, 99, safe.currentCooldown || 0);
    safe.ignoreDef = clampPvPNumber(safe.ignoreDef, 0, 100, safe.ignoreDef || 0);
    safe.passive = !!safe.passive;
    safe.guaranteedCrit = !!safe.guaranteedCrit;
    return safe;
}

function serializePvPAbilitiesFromPlayer() {
    if (!player || !Array.isArray(player.abilities)) return [];
    return player.abilities.map(a => sanitizePvPAbility(JSON.parse(JSON.stringify(a)))).filter(Boolean);
}

function clampPvPNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
}

function sanitizePvPSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    return {
        name: String(snapshot.name || 'Игрок').slice(0, 24),
        class: String(snapshot.class || 'Герой').slice(0, 20),
        branch: String(snapshot.branch || '').slice(0, 32),
        level: clampPvPNumber(snapshot.level, 1, 999, 1),
        avatar: safePvPAvatarSrc(snapshot.avatar),
        maxHealth: clampPvPNumber(snapshot.maxHealth, 1, 999999, 1),
        health: clampPvPNumber(snapshot.health || snapshot.maxHealth, 1, 999999, 1),
        attack: clampPvPNumber(snapshot.attack, 1, 99999, 1),
        defense: clampPvPNumber(snapshot.defense, 0, 99999, 0),
        criticalChance: clampPvPNumber(snapshot.criticalChance, 0, 100, 0),
        criticalDamage: clampPvPNumber(snapshot.criticalDamage, 100, 1000, 150),
        dodgeChance: clampPvPNumber(snapshot.dodgeChance, 0, 100, 0),
        mana: clampPvPNumber(snapshot.mana, 0, 99999, 0),
        maxMana: clampPvPNumber(snapshot.maxMana, 0, 99999, 0),
        abilities: Array.isArray(snapshot.abilities)
            ? snapshot.abilities.map(sanitizePvPAbility).filter(Boolean)
            : [],
        temporaryEffects: Array.isArray(snapshot.temporaryEffects)
            ? snapshot.temporaryEffects.slice(0, 24)
            : [],
        effects: Array.isArray(snapshot.effects) ? snapshot.effects.slice(0, 24) : [],
        activeBuffs: snapshot.activeBuffs && typeof snapshot.activeBuffs === 'object'
            ? JSON.parse(JSON.stringify(snapshot.activeBuffs))
            : {},
        armorShred: clampPvPNumber(snapshot.armorShred, 0, 100, 0),
        marked: !!snapshot.marked,
        damageAmp: Number(snapshot.damageAmp) || 1
    };
}

function getPvPAvatar() {
    const fromSkin = resolveEquippedSkinImgPath();
    if (fromSkin) return fromSkin;
    if (typeof getAvatar === 'function') {
        const div = document.createElement('div');
        div.innerHTML = getAvatar();
        const img = div.querySelector('img');
        if (img) {
            const safe = safePvPAvatarSrc(img.getAttribute('src') || '');
            if (safe) return safe;
        }
    }
    return safePvPAvatarSrc(player.schoolImg || '');
}

function getPvPPlayerSnapshot() {
    return sanitizePvPSnapshot({
        name: player.name,
        class: player.class,
        branch: player.branch,
        level: player.level,
        avatar: getPvPAvatar(),
        maxHealth: Math.max(1, player.maxHealth || 1),
        health: Math.max(1, player.maxHealth || player.health || 1),
        attack: Math.max(1, player.attack || 1),
        defense: Math.max(0, player.defense || 0),
        criticalChance: Math.max(0, player.criticalChance || 0),
        criticalDamage: Math.max(100, player.criticalDamage || 150),
        dodgeChance: Math.max(0, player.dodgeChance || 0),
        mana: player.class === 'Маг' ? Math.max(0, player.mana || 0) : 0,
        maxMana: player.class === 'Маг' ? Math.max(0, player.maxMana || 0) : 0,
        abilities: serializePvPAbilitiesFromPlayer()
    });
}

function clonePvPStats(snapshot) {
    const s = sanitizePvPSnapshot(snapshot);
    if (!s) throw new Error('Invalid PvP snapshot');
    s.health = Math.max(1, s.health || s.maxHealth || 1);
    s.maxHealth = Math.max(1, s.maxHealth || s.health || 1);
    s.guard = false;
    s.dodgeActive = false;
    s.abilities = (s.abilities || []).map(a => ({ ...a, currentCooldown: a.currentCooldown || 0 }));
    s.temporaryEffects = JSON.parse(JSON.stringify(s.temporaryEffects || []));
    s.effects = JSON.parse(JSON.stringify(s.effects || []));
    s.activeBuffs = JSON.parse(JSON.stringify(s.activeBuffs || {}));
    s.combat = s.combat && typeof s.combat === 'object' ? JSON.parse(JSON.stringify(s.combat)) : {};
    if (s.class === 'Маг' && s.maxMana > 0) s.mana = Math.min(s.mana || s.maxMana, s.maxMana);
    return s;
}

function findPvPAbility(actor, index) {
    if (!actor || !Array.isArray(actor.abilities)) return null;
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0 || i >= actor.abilities.length) return null;
    return actor.abilities[i] || null;
}

function tickPvPAbilityCooldowns(actor) {
    if (!actor || !Array.isArray(actor.abilities)) return;
    actor.abilities.forEach(a => {
        if (a.currentCooldown > 0) a.currentCooldown -= 1;
    });
}

function applyPvPDefense(dmg, defense, ignoreDef) {
    let raw = Math.max(0, Math.floor(dmg));
    if (raw <= 0) return 0;
    let def = Math.max(0, defense || 0);
    if (ignoreDef > 0) def = Math.floor(def * (1 - ignoreDef / 100));
    if (typeof calculateDamage === 'function') return calculateDamage(raw, def);
    const defenseReduction = Math.min(70, def / 4);
    return Math.max(1, Math.floor(raw * (100 - defenseReduction) / 100));
}

function rollPvPCrit(attacker, guaranteed) {
    if (guaranteed) return true;
    return Math.random() * 100 < (attacker.criticalChance || 0);
}

function computePvPAbilityDamage(attacker, defender, ability) {
    if (!ability || ability.passive || ability.noDamage) return { damage: 0, crit: false, healAmount: 0 };
    let raw = 0;
    if (ability.multiHit) {
        const { hits, baseDmg, increment } = ability.multiHit;
        for (let h = 0; h < hits; h++) {
            const pct = baseDmg + increment * h;
            raw += Math.floor((attacker.attack || 1) * pct / 100);
        }
    } else if (ability.combo && ability.combo.length) {
        const step = ability.comboStep || 0;
        const pct = ability.combo[Math.min(step, ability.combo.length - 1)] || ability.dmg || 100;
        raw = Math.floor((attacker.attack || 1) * pct / 100);
    } else if (ability.dmg) {
        raw = Math.floor((attacker.attack || 1) * ability.dmg / 100);
    }
    const crit = rollPvPCrit(attacker, ability.guaranteedCrit);
    if (crit && raw > 0) raw = Math.floor(raw * ((attacker.criticalDamage || 150) / 100));
    let damage = applyPvPDefense(raw, defender.defense, ability.ignoreDef || 0);
    if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
    let healAmount = 0;
    if (ability.heal) {
        healAmount = Math.floor((attacker.maxHealth || 1) * ability.heal / 100);
        attacker.health = Math.min(attacker.maxHealth, attacker.health + healAmount);
    }
    if (ability.lifesteal && damage > 0) {
        const ls = Math.floor(damage * ability.lifesteal / 100);
        attacker.health = Math.min(attacker.maxHealth, attacker.health + ls);
        healAmount += ls;
    }
    return { damage, crit, healAmount };
}

function computePvPBasicAttack(attacker, defender) {
    const dodgeChance = Math.min(55, Math.max(0, defender.dodgeChance || 0));
    if (Math.random() * 100 < dodgeChance) return { damage: 0, crit: false, dodged: true };
    let raw = Math.floor(attacker.attack || 1);
    const crit = rollPvPCrit(attacker, false);
    if (crit) raw = Math.floor(raw * ((attacker.criticalDamage || 150) / 100));
    let damage = applyPvPDefense(raw, defender.defense, 0);
    if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
    return { damage, crit, dodged: false };
}

function hashPvPMatch(match) {
    if (!match) return '0';
    const host = match.players.host;
    const guest = match.players.guest;
    const raw = [
        match.turn,
        match.active,
        match.finished ? 1 : 0,
        host.name,
        host.class,
        host.branch,
        host.level,
        host.maxHealth,
        host.health,
        host.attack,
        host.defense,
        host.criticalChance,
        host.criticalDamage,
        host.dodgeChance,
        host.guard ? 1 : 0,
        guest.name,
        guest.class,
        guest.branch,
        guest.level,
        guest.maxHealth,
        guest.health,
        guest.attack,
        guest.defense,
        guest.criticalChance,
        guest.criticalDamage,
        guest.dodgeChance,
        guest.guard ? 1 : 0,
        host.mana,
        host.maxMana,
        guest.mana,
        guest.maxMana,
        host.dodgeActive ? 1 : 0,
        guest.dodgeActive ? 1 : 0,
        (host.abilities || []).map(a => `${a.name}:${a.currentCooldown}`).join(','),
        (guest.abilities || []).map(a => `${a.name}:${a.currentCooldown}`).join(','),
        match.winner || ''
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    return String(Math.abs(hash));
}

function reducePvPMatch(match, actorRole, action, options) {
    if (!match || match.finished) return { match, result: { ignored: true } };
    if (match.active !== actorRole) return { match, result: { ignored: true, reason: 'wrong_turn' } };

    const next = JSON.parse(JSON.stringify(match));
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    const actor = next.players[actorRole];
    const opponent = next.players[opponentRole];
    const opts = options || {};
    actor.guard = false;

    let result = { action, actorRole, opponentRole, damage: 0, crit: false, dodged: false, abilityIndex: -1, abilityName: '' };

    if (action === 'dodge') {
        const dodgeRoll = Math.random() * 100 <= (actor.dodgeChance || 0);
        actor.dodgeActive = dodgeRoll;
        result.dodgeSuccess = dodgeRoll;
    } else if (action === 'ability') {
        const abilityIndex = Number(opts.abilityIndex);
        const ability = findPvPAbility(actor, abilityIndex);
        if (!ability || ability.passive) return { match, result: { ignored: true, reason: 'bad_ability' } };
        if (ability.currentCooldown > 0) return { match, result: { ignored: true, reason: 'on_cooldown' } };
        const manaCost = actor.class === 'Маг' ? (ability.mana || 0) : 0;
        if (manaCost > 0 && (actor.mana || 0) < manaCost) return { match, result: { ignored: true, reason: 'no_mana' } };
        if (manaCost > 0) actor.mana -= manaCost;
        if (ability.cd > 0) ability.currentCooldown = ability.cd;
        if (ability.combo && ability.combo.length) {
            if (ability.comboId !== ability.name) {
                ability.comboId = ability.name;
                ability.comboStep = 0;
            } else {
                ability.comboStep = (ability.comboStep + 1) % ability.combo.length;
            }
        }
        result.abilityIndex = abilityIndex;
        result.abilityName = ability.name;
        if (opponent.dodgeActive) {
            opponent.dodgeActive = false;
            result.dodged = true;
            result.dodgeBlocked = true;
        } else {
            const hit = computePvPAbilityDamage(actor, opponent, ability);
            result = { ...result, ...hit };
            opponent.health = Math.max(0, opponent.health - result.damage);
        }
    } else if (action === 'attack') {
        if (opponent.dodgeActive) {
            opponent.dodgeActive = false;
            result.dodged = true;
            result.dodgeBlocked = true;
        } else {
            const hit = computePvPBasicAttack(actor, opponent);
            result = { ...result, ...hit };
            opponent.health = Math.max(0, opponent.health - result.damage);
        }
    } else {
        return { match, result: { ignored: true, reason: 'bad_action' } };
    }

    tickPvPAbilityCooldowns(actor);

    if (opponent.health <= 0) {
        next.finished = true;
        next.winner = actorRole;
    } else {
        next.active = opponentRole;
        next.turn += 1;
    }
    next.hash = hashPvPMatch(next);
    return { match: next, result };
}

function getPvPMaxPlausibleDamage(attacker, defender, action, options) {
    const opts = options || {};
    if (action === 'dodge') return 0;
    if (action === 'ability') {
        const ability = findPvPAbility(attacker, opts.abilityIndex);
        if (!ability) return 0;
        let maxRaw = 0;
        if (ability.multiHit) {
            for (let h = 0; h < ability.multiHit.hits; h++) {
                maxRaw += Math.floor((attacker.attack || 1) * (ability.multiHit.baseDmg + ability.multiHit.increment * h) / 100);
            }
        } else if (ability.combo && ability.combo.length) {
            const maxPct = Math.max(...ability.combo, ability.dmg || 0);
            maxRaw = Math.floor((attacker.attack || 1) * maxPct / 100);
        } else {
            maxRaw = Math.floor((attacker.attack || 1) * (ability.dmg || 100) / 100);
        }
        maxRaw = Math.floor(maxRaw * ((attacker.criticalDamage || 150) / 100));
        let damage = applyPvPDefense(maxRaw, defender.defense, ability.ignoreDef || 0);
        if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
        return damage + Math.floor((attacker.maxHealth || 1) * (ability.heal || 0) / 100) + 5;
    }
    let damage = Math.floor(attacker.attack || 1);
    damage = Math.floor(damage * ((attacker.criticalDamage || 150) / 100));
    damage = applyPvPDefense(damage, defender.defense, 0);
    if (defender.guard) damage = Math.max(1, Math.floor(damage * 0.55));
    return damage + 2;
}

function isValidPvPAction(action) {
    return ['attack', 'dodge', 'ability'].includes(action);
}

function validatePvPResult(match, actorRole, action, result, options) {
    if (!match || !result || !isValidPvPAction(action)) return false;
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    const attacker = match.players && match.players[actorRole];
    const defender = match.players && match.players[opponentRole];
    if (!attacker || !defender) return false;
    const damage = Number(result.damage || 0);
    if (!Number.isFinite(damage) || damage < 0) return false;
    if (action === 'dodge') return damage === 0;
    if (result.dodged || result.dodgeBlocked) return damage === 0;
    return damage <= getPvPMaxPlausibleDamage(attacker, defender, action, options);
}

function applyPvPResultToMatch(match, actorRole, action, result) {
    const next = JSON.parse(JSON.stringify(match));
    const opponentRole = actorRole === 'host' ? 'guest' : 'host';
    const actor = next.players[actorRole];
    const opponent = next.players[opponentRole];
    actor.guard = false;
    if (action === 'dodge') {
        actor.dodgeActive = !!result.dodgeSuccess;
    } else if (!result.dodged && !result.dodgeBlocked) {
        opponent.health = Math.max(0, opponent.health - Math.floor(result.damage || 0));
        if (result.abilityIndex >= 0 && actor.abilities && actor.abilities[result.abilityIndex]) {
            const ability = actor.abilities[result.abilityIndex];
            if (ability.cd > 0) ability.currentCooldown = ability.cd;
            if (result.healAmount) {
                actor.health = Math.min(actor.maxHealth, actor.health + Math.floor(result.healAmount || 0));
            }
        }
    } else if (result.dodgeBlocked) {
        opponent.dodgeActive = false;
    }
    if (next.players[opponentRole].health <= 0) {
        next.finished = true;
        next.winner = actorRole;
    } else {
        next.active = opponentRole;
        next.turn += 1;
    }
    next.hash = hashPvPMatch(next);
    return next;
}

function validatePvPMatchShape(match) {
    if (!match || typeof match !== 'object') return false;
    if (!match.players || !match.players.host || !match.players.guest) return false;
    if (!['host', 'guest'].includes(match.active)) return false;
    if (!Number.isFinite(Number(match.turn)) || Number(match.turn) < 1) return false;
    if (match.v >= 2 || match.sig) return true;
    if (match.hash !== hashPvPMatch(match)) return false;
    return true;
}

function sanitizePvPMatch(match) {
    if (!validatePvPMatchShape(match)) return null;
    const host = sanitizePvPSnapshot(match.players.host);
    const guest = sanitizePvPSnapshot(match.players.guest);
    if (!host || !guest) return null;
    host.health = clampPvPNumber(match.players.host.health, 0, host.maxHealth, host.maxHealth);
    guest.health = clampPvPNumber(match.players.guest.health, 0, guest.maxHealth, guest.maxHealth);
    host.guard = !!match.players.host.guard;
    guest.guard = !!match.players.guest.guard;
    host.dodgeActive = !!match.players.host.dodgeActive;
    guest.dodgeActive = !!match.players.guest.dodgeActive;
    host.mana = clampPvPNumber(match.players.host.mana, 0, host.maxMana || 99999, host.mana || 0);
    guest.mana = clampPvPNumber(match.players.guest.mana, 0, guest.maxMana || 99999, guest.mana || 0);
    host.abilities = (match.players.host.abilities || []).map(sanitizePvPAbility).filter(Boolean);
    guest.abilities = (match.players.guest.abilities || []).map(sanitizePvPAbility).filter(Boolean);
    host.temporaryEffects = Array.isArray(match.players.host.temporaryEffects)
        ? JSON.parse(JSON.stringify(match.players.host.temporaryEffects.slice(0, 32))) : [];
    guest.temporaryEffects = Array.isArray(match.players.guest.temporaryEffects)
        ? JSON.parse(JSON.stringify(match.players.guest.temporaryEffects.slice(0, 32))) : [];
    host.effects = Array.isArray(match.players.host.effects)
        ? JSON.parse(JSON.stringify(match.players.host.effects.slice(0, 32))) : [];
    guest.effects = Array.isArray(match.players.guest.effects)
        ? JSON.parse(JSON.stringify(match.players.guest.effects.slice(0, 32))) : [];
    host.activeBuffs = match.players.host.activeBuffs && typeof match.players.host.activeBuffs === 'object'
        ? JSON.parse(JSON.stringify(match.players.host.activeBuffs)) : {};
    guest.activeBuffs = match.players.guest.activeBuffs && typeof match.players.guest.activeBuffs === 'object'
        ? JSON.parse(JSON.stringify(match.players.guest.activeBuffs)) : {};
    host.armorShred = clampPvPNumber(match.players.host.armorShred, 0, 100, 0);
    guest.armorShred = clampPvPNumber(match.players.guest.armorShred, 0, 100, 0);
    host.combat = match.players.host.combat && typeof match.players.host.combat === 'object'
        ? JSON.parse(JSON.stringify(match.players.host.combat)) : {};
    guest.combat = match.players.guest.combat && typeof match.players.guest.combat === 'object'
        ? JSON.parse(JSON.stringify(match.players.guest.combat)) : {};
    const safe = {
        v: match.v >= 2 ? 2 : 1,
        turn: clampPvPNumber(match.turn, 1, 999999, 1),
        active: match.active === 'guest' ? 'guest' : 'host',
        finished: !!match.finished,
        winner: ['host', 'guest'].includes(match.winner) ? match.winner : '',
        players: { host, guest },
        hash: '',
        sig: ''
    };
    if (safe.v >= 2 && typeof getPvPMatchSig === 'function') {
        safe.sig = getPvPMatchSig(safe);
        return safe;
    }
    safe.hash = hashPvPMatch(safe);
    return safe.hash === match.hash ? safe : null;
}

function samePvPParticipant(a, b) {
    if (!a || !b) return false;
    return a.name === b.name
        && a.class === b.class
        && a.branch === b.branch
        && a.level === b.level
        && a.maxHealth === b.maxHealth
        && a.attack === b.attack
        && a.defense === b.defense
        && a.criticalChance === b.criticalChance
        && a.criticalDamage === b.criticalDamage
        && a.dodgeChance === b.dodgeChance;
}

function matchUsesNegotiatedSnapshots(match) {
    if (!match || !pvpState.local || !pvpState.remote) return false;
    const localRole = getLocalPvPRole();
    const remoteRole = getRemotePvPRole();
    return samePvPParticipant(match.players[localRole], pvpState.local)
        && samePvPParticipant(match.players[remoteRole], pvpState.remote);
}

function buildInitialPvPMatch(hostSnapshot, guestSnapshot) {
    if (typeof buildPvPCombatMatch === 'function') {
        return buildPvPCombatMatch(hostSnapshot, guestSnapshot);
    }
    const match = {
        turn: 1,
        active: 'host',
        finished: false,
        winner: '',
        players: {
            host: clonePvPStats(hostSnapshot),
            guest: clonePvPStats(guestSnapshot)
        },
        sig: ''
    };
    return match;
}

function sendPvPMessage(type, payload) {
    if (!pvpSendPacket || !pvpRemotePeerId) return false;
    pvpSendPacket({
        v: PVP_VERSION,
        type,
        payload: payload || {},
        sentAt: Date.now()
    }, pvpRemotePeerId).catch(err => handlePvPError(err));
    return true;
}

function resetPvPConnection() {
    pvpSessionId++;
    pvpIceServersPromise = null;
    try { if (pvpRoom) pvpRoom.leave(); } catch (e) {}
    pvpRoom = null;
    pvpSendPacket = null;
    pvpRemotePeerId = '';
}

function clonePvPIceServers(servers) {
    return (servers || []).map(server => {
        const urls = Array.isArray(server.urls) ? [...server.urls] : [String(server.urls)];
        const entry = { urls };
        if (server.username) entry.username = String(server.username);
        if (server.credential) entry.credential = String(server.credential);
        return entry;
    });
}

function buildPvPIceServersFallback() {
    return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:freeturn.net:3478' },
        {
            urls: [
                'turn:freeturn.net:3478',
                'turn:freeturn.net:3478?transport=tcp'
            ],
            username: 'free',
            credential: 'free'
        },
        {
            urls: [
                'turns:freeturn.tel:5349',
                'turns:freeturn.tel:5349?transport=tcp'
            ],
            username: 'free',
            credential: 'free'
        },
        {
            urls: [
                'turn:freestun.net:3478',
                'turn:freestun.net:3478?transport=tcp'
            ],
            username: 'free',
            credential: 'free'
        }
    ];
}

function getPvPMeteredCredentialsUrls() {
    const urls = [];
    const key = String(PVP_METERED_TURN_API_KEY || '').trim();
    const slug = String(PVP_METERED_APP_SLUG || '').trim();
    if (key && slug) {
        urls.push(`https://${slug}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
    }
    if (key) {
        urls.push(`https://openrelay.metered.ca/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
    }
    return urls;
}

function normalizePvPIceServersPayload(data) {
    if (!Array.isArray(data) || !data.length) return null;
    const normalized = [];
    for (const entry of data) {
        if (!entry || entry.urls == null) continue;
        const urls = Array.isArray(entry.urls)
            ? entry.urls.map(u => String(u)).filter(Boolean)
            : [String(entry.urls)];
        if (!urls.length) continue;
        const item = { urls };
        if (entry.username) item.username = String(entry.username);
        if (entry.credential) item.credential = String(entry.credential);
        normalized.push(item);
    }
    return normalized.length ? normalized : null;
}

async function fetchPvPIceServersFromUrl(url) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), PVP_ICE_FETCH_TIMEOUT_MS)
        : null;
    try {
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            signal: controller ? controller.signal : undefined
        });
        if (!response.ok) throw new Error(`TURN API HTTP ${response.status}`);
        const data = await response.json();
        const servers = normalizePvPIceServersPayload(data);
        if (!servers) throw new Error('TURN API returned no iceServers');
        return servers;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function fetchPvPIceServersFromApi() {
    const apiUrls = getPvPMeteredCredentialsUrls();
    let lastErr = null;
    for (const url of apiUrls) {
        try {
            return await fetchPvPIceServersFromUrl(url);
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('TURN API not configured');
}

function loadPvPIceServers() {
    if (!pvpIceServersPromise) {
        const hasMeteredKey = !!String(PVP_METERED_TURN_API_KEY || '').trim();
        pvpIceServersPromise = (hasMeteredKey
            ? fetchPvPIceServersFromApi()
            : Promise.reject(new Error('no Metered API key')))
            .catch(err => {
                const msg = err && err.message ? err.message : String(err || 'unknown');
                if (hasMeteredKey) {
                    pvpLog(`Metered TURN API: ${msg}. Используем freeTURN.`, 'info');
                }
                return buildPvPIceServersFallback();
            })
            .then(servers => {
                const hasTurn = servers.some(s => {
                    const u = Array.isArray(s.urls) ? s.urls.join(' ') : String(s.urls);
                    return u.includes('turn:') && s.username && s.credential;
                });
                if (!hasTurn) throw new Error('no TURN in ICE list');
                return clonePvPIceServers(servers);
            });
    }
    return pvpIceServersPromise;
}

function describePvPJoinError(details) {
    const err = details && details.error ? String(details.error) : 'ошибка P2P';
    const lower = err.toLowerCase();
    if (/turn|unreachable|could not connect to peer after exchanging sdp/i.test(lower)) {
        return 'Соединение не установлено: TURN relay недоступен (нужен для игры через разные сети). '
            + 'Обновите страницу (Ctrl+Shift+R), отключите VPN, попробуйте Chrome или мобильный интернет. '
            + 'Если повторяется — владельцу игры нужен API-ключ Metered Open Relay в PvP_METERED_TURN_API_KEY.';
    }
    if (/ice|candidate|connection|timeout|failed/i.test(lower)) {
        return `PvP: ${err}. Проверьте интернет и firewall; для разных Wi‑Fi нужен TURN (включён).`;
    }
    return `PvP: ${err}.`;
}

function resetPvPLobbyForRematch() {
    const returningFromMatch = pvpState.status === 'battle'
        || pvpState.status === 'ended'
        || !!pvpState.match;
    if (!returningFromMatch) return;
    pvpState.match = null;
    pvpState.localReady = false;
    pvpState.remoteReady = false;
    if (pvpRemotePeerId) pvpState.status = 'connected';
    pvpState.local = getPvPPlayerSnapshot();
    if (pvpRemotePeerId) {
        sendPvPMessage('ready', { ready: false, snapshot: pvpState.local });
        pvpLog('Лобби сброшено — нажмите «Готов» для нового матча.', 'info');
    }
}

function showPvPArena() {
    if (!player) return;
    stopGathering();
    if (typeof flushPendingCraft === 'function') flushPendingCraft();
    if (typeof leavePvPBossBattle === 'function') leavePvPBossBattle();
    resetPvPLobbyForRematch();
    pvpState.local = getPvPPlayerSnapshot();
    loadPvPIceServers().catch(() => {});
    renderPvPArena();
}

function renderPvPArena() {
    if (pvpState.status === 'ended' || (pvpState.match && pvpState.match.finished)) {
        resetPvPLobbyForRematch();
    }
    const el = document.getElementById('dynamicContent');
    if (!el) return;
    const canStart = pvpState.role === 'host' && pvpState.status === 'connected' && pvpState.localReady && pvpState.remoteReady && !pvpState.match;
    const room = escapePvPText(pvpState.roomCode || '------');
    const logs = pvpState.log.map(l => `<div class="pvp-log-entry ${safePvPClass(l.type || 'info')}"><span>${escapePvPText(l.time)}</span> ${escapePvPText(l.message)}</div>`).join('');
    el.innerHTML = `
        <section class="pvp-panel">
            <div class="pvp-header">
                <div>
                    <h2>🏟️ PvP Арена 1 на 1</h2>
                    <p>Создай комнату или подключись по коду. Работает через Trystero/WebRTC без backend.</p>
                </div>
                <span class="pvp-status pvp-status-${safePvPClass(pvpState.status)}">${escapePvPText(getPvPStatusLabel())}</span>
            </div>

            <div class="pvp-grid">
                <div class="pvp-card">
                    <h3>Создать комнату</h3>
                    <p>Передай код второму игроку. Первый ходит создатель комнаты.</p>
                    <button class="action-btn" onclick="createPvPRoom()">Создать код</button>
                </div>
                <div class="pvp-card">
                    <h3>Подключиться</h3>
                    <p>Введи код комнаты от другого игрока.</p>
                    <input id="pvpJoinCode" class="hero-input pvp-code-input" maxlength="12" placeholder="Код комнаты">
                    <button class="action-btn" onclick="joinPvPRoom()">Подключиться</button>
                </div>
            </div>

            <div class="pvp-room-card">
                <div>
                    <div class="pvp-room-label">Код комнаты</div>
                    <div class="pvp-room-code">${room}</div>
                </div>
                <button class="action-btn" onclick="copyPvPCode()" ${pvpState.roomCode ? '' : 'disabled'}>Скопировать</button>
                <button class="action-btn danger" onclick="leavePvPArena()">Отключиться</button>
            </div>

            <div class="pvp-grid">
                ${renderPvPPlayerCard('Ты', pvpState.local || getPvPPlayerSnapshot(), pvpState.localReady)}
                ${renderPvPPlayerCard('Соперник', pvpState.remote, pvpState.remoteReady)}
            </div>

            <div class="pvp-actions-row">
                <button class="action-btn" onclick="togglePvPReady()" ${pvpState.status === 'connected' ? '' : 'disabled'}>${pvpState.localReady ? 'Не готов' : 'Готов'}</button>
                <button class="action-btn" onclick="hostStartPvPMatch()" ${canStart ? '' : 'disabled'}>Начать матч</button>
            </div>
            <p class="pvp-hint">PvP: MQTT-сигналинг + TURN relay для игры с телефона или другого Wi‑Fi (не только с одного ПК). Если соперник не находится — новый код у обоих, попробуйте мобильный интернет или Chrome.</p>
            <div class="pvp-log">${logs || '<div class="pvp-log-entry">Журнал пуст.</div>'}</div>
        </section>
    `;
}

function renderPvPPlayerCard(title, snapshot, ready) {
    if (!snapshot) {
        return `<div class="pvp-card pvp-player-card"><h3>${escapePvPText(title)}</h3><p>Ожидание...</p></div>`;
    }
    const safeSnapshot = sanitizePvPSnapshot(snapshot);
    if (!safeSnapshot) return `<div class="pvp-card pvp-player-card"><h3>${escapePvPText(title)}</h3><p>Некорректные данные игрока</p></div>`;
    let avatar = '';
    if (title === 'Ты' && typeof getAvatar === 'function') {
        avatar = `<div class="pvp-avatar-live">${getAvatar()}</div>`;
    } else {
        const remoteRel = title !== 'Ты' && typeof getPvPRemoteAvatarSrc === 'function'
            ? getPvPRemoteAvatarSrc()
            : safeSnapshot.avatar;
        const remoteDisplay = pvpAvatarDisplayUrl(remoteRel);
        const fbIcon = pvpClassIcon(safeSnapshot.class);
        avatar = remoteDisplay
            ? `<img src="${escapePvPAttr(remoteDisplay)}" alt="" onerror="pvpAvatarImgError(this)"><span class="sprite-fallback pvp-avatar-fallback-inline" style="display:none">${fbIcon}</span>`
            : `<div class="pvp-avatar-fallback">${fbIcon}</div>`;
    }
    return `
        <div class="pvp-card pvp-player-card">
            <div class="pvp-player-row">
                <div class="pvp-avatar">${avatar}</div>
                <div>
                    <h3>${escapePvPText(title)}: ${escapePvPText(safeSnapshot.name)}</h3>
                    <p>${escapePvPText(safeSnapshot.class)} · ${escapePvPText(safeSnapshot.branch)} · ур. ${safeSnapshot.level}</p>
                    <p>❤️ ${safeSnapshot.maxHealth} · ⚔️ ${safeSnapshot.attack} · 🛡️ ${safeSnapshot.defense} · 💨 ${safeSnapshot.dodgeChance}%</p>
                    <span class="pvp-ready ${ready ? 'ready' : ''}">${ready ? 'Готов' : 'Не готов'}</span>
                </div>
            </div>
        </div>
    `;
}

function getPvPStatusLabel() {
    const labels = {
        idle: 'не подключено',
        hosting: 'ожидание соперника',
        connecting: 'подключение',
        connected: 'соперник подключен',
        battle: 'бой',
        ended: 'завершено',
        error: 'ошибка'
    };
    return labels[pvpState.status] || pvpState.status;
}

function loadPvPTransport() {
    if (!pvpTrysteroModulePromise) {
        pvpTrysteroModulePromise = import(PVP_TRYSTERO_URL).catch(err => {
            pvpTrysteroModulePromise = null;
            throw err;
        });
    }
    return pvpTrysteroModulePromise;
}

function getPvPTransportConfig(iceServers) {
    const servers = iceServers || buildPvPIceServersFallback();
    return {
        appId: PVP_TRYSTERO_APP_ID,
        relayConfig: {
            urls: [...PVP_TRYSTERO_RELAY_URLS]
        },
        rtcConfig: {
            iceServers: clonePvPIceServers(servers)
        }
    };
}

function setPvPRoomHandler(room, eventName, handler) {
    if (!room) throw new Error('PvP room is not initialized');
    if (typeof room[eventName] === 'function') {
        room[eventName](handler);
        return;
    }
    if (eventName in room) {
        room[eventName] = handler;
        return;
    }
    throw new Error(`PvP room does not support ${eventName}`);
}

function createPvPActionAdapter(action) {
    if (Array.isArray(action) && typeof action[0] === 'function' && typeof action[1] === 'function') {
        return {
            send: (message, peerId) => action[0](message, peerId),
            receive: handler => action[1](handler)
        };
    }
    if (action && typeof action.send === 'function' && 'onMessage' in action) {
        return {
            send: (message, peerId) => action.send(message, { target: peerId }),
            receive: handler => {
                action.onMessage = (message, meta) => {
                    const peerId = typeof meta === 'string' ? meta : meta?.peerId;
                    if (peerId) handler(message, peerId);
                };
            }
        };
    }
    throw new Error('Unsupported PvP transport action API');
}

function joinPvPTransportRoom(code, sessionId) {
    return Promise.all([loadPvPTransport(), loadPvPIceServers()]).then(([mod, iceServers]) => {
        if (sessionId !== pvpSessionId) return;
        const iceJson = JSON.stringify(iceServers);
        if (iceJson.includes('freeturn.net')) {
            pvpLog('ICE: freeTURN relay (игра через разные сети).', 'info');
        } else if (iceJson.includes('metered')) {
            pvpLog('ICE: Metered Open Relay.', 'info');
        }
        const room = mod.joinRoom(getPvPTransportConfig(iceServers), pvpRoomId(code), {
            onJoinError(details) {
                if (sessionId !== pvpSessionId) return;
                pvpLog(describePvPJoinError(details), 'error');
                renderPvPArena();
            }
        });
        const actionAdapter = createPvPActionAdapter(room.makeAction('pvp'));
        pvpRoom = room;
        pvpSendPacket = actionAdapter.send;

        setPvPRoomHandler(room, 'onPeerJoin', peerId => {
            if (sessionId !== pvpSessionId) return;
            if (pvpRemotePeerId && pvpRemotePeerId !== peerId) {
                pvpLog('В комнате уже есть соперник, лишнее подключение игнорируется.', 'error');
                return;
            }
            pvpRemotePeerId = peerId;
            pvpState.status = 'connected';
            pvpLog('Соединение установлено.', 'success');
            pvpState.local = getPvPPlayerSnapshot();
            sendPvPMessage('hello', { snapshot: pvpState.local, ready: pvpState.localReady });
            renderPvPArena();
        });

        setPvPRoomHandler(room, 'onPeerLeave', peerId => {
            if (sessionId !== pvpSessionId || peerId !== pvpRemotePeerId) return;
            pvpRemotePeerId = '';
            if (pvpState.status === 'battle') endPvPMatch('disconnect');
            else if (pvpState.status === 'ended') renderPvPBattle();
            else {
                pvpState.status = pvpState.role === 'host' ? 'hosting' : 'idle';
                pvpLog('Соперник отключился.', 'error');
                renderPvPArena();
            }
        });

        actionAdapter.receive((msg, peerId) => {
            if (sessionId !== pvpSessionId) return;
            if (pvpRemotePeerId && pvpRemotePeerId !== peerId) return;
            pvpRemotePeerId = peerId;
            handlePvPMessage(msg);
        });

        pvpLog('PvP транспорт MQTT инициализирован. Ждём соперника.', 'success');
        renderPvPArena();
    }).catch(err => handlePvPError(err));
}

function createPvPRoom() {
    resetPvPConnection();
    const sessionId = pvpSessionId;
    pvpState = createEmptyPvPState();
    pvpState.role = 'host';
    pvpState.roomCode = generatePvPCode();
    pvpState.local = getPvPPlayerSnapshot();
    pvpState.status = 'hosting';
    pvpLog('Создаём комнату...', 'info');
    renderPvPArena();
    joinPvPTransportRoom(pvpState.roomCode, sessionId);
}

function joinPvPRoom() {
    const input = document.getElementById('pvpJoinCode');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) {
        addMessage('Введите код PvP комнаты.', 'error');
        return;
    }
    resetPvPConnection();
    const sessionId = pvpSessionId;
    pvpState = createEmptyPvPState();
    pvpState.role = 'guest';
    pvpState.roomCode = code;
    pvpState.local = getPvPPlayerSnapshot();
    pvpState.status = 'connecting';
    pvpLog('Подключаемся к комнате...', 'info');
    renderPvPArena();
    joinPvPTransportRoom(code, sessionId);
}

function handlePvPMessage(msg) {
    if (!msg || msg.v !== PVP_VERSION) return;
    const payload = msg.payload || {};
    if (msg.type === 'hello') {
        const remote = sanitizePvPSnapshot(payload.snapshot);
        if (!remote) {
            pvpLog('Некорректные данные соперника отклонены.', 'error');
            return;
        }
        pvpState.remote = remote;
        pvpState.remoteReady = !!payload.ready;
        pvpLog(`Соперник в лобби: ${pvpState.remote?.name || 'игрок'}.`, 'success');
        pvpState.local = getPvPPlayerSnapshot();
        sendPvPMessage('ready', { ready: pvpState.localReady, snapshot: pvpState.local });
        renderPvPArena();
    } else if (msg.type === 'ready') {
        if (payload.snapshot) {
            const remote = sanitizePvPSnapshot(payload.snapshot);
            if (!remote) {
                pvpLog('Некорректные данные готовности отклонены.', 'error');
                return;
            }
            pvpState.remote = remote;
        }
        pvpState.remoteReady = !!payload.ready;
        if (!payload.ready && (pvpState.status === 'ended' || pvpState.status === 'battle')) {
            resetPvPLobbyForRematch();
        }
        pvpLog(`Соперник ${pvpState.remoteReady ? 'готов' : 'не готов'}.`, 'info');
        renderPvPArena();
    } else if (msg.type === 'start') {
        if (pvpState.role === 'guest' && pvpRemotePeerId
            && (pvpState.status === 'ended' || pvpState.status === 'battle')) {
            pvpState.match = null;
            pvpState.status = 'connected';
        }
        if (pvpState.role !== 'guest' || pvpState.status !== 'connected' || !pvpState.localReady || !pvpState.remoteReady) {
            pvpLog('Старт матча отклонён: неверное состояние лобби.', 'error');
            return;
        }
        const safeMatch = sanitizePvPMatch(payload.match);
        if (!safeMatch || !matchUsesNegotiatedSnapshots(safeMatch)) {
            pvpLog('Некорректное состояние матча отклонено.', 'error');
            return;
        }
        pvpState.match = safeMatch;
        pvpState.status = 'battle';
        pvpLog('Матч начался.', 'success');
        if (typeof enterPvPBossBattle === 'function') enterPvPBossBattle();
        else renderPvPBattle();
    } else if (msg.type === 'turn') {
        if (typeof applyPvPRemoteBattleState === 'function') applyPvPRemoteBattleState(payload);
        else applyPvPRemoteAction(payload);
    } else if (msg.type === 'forfeit') {
        endPvPMatch('opponent_forfeit');
    } else if (msg.type === 'end') {
        if (payload.match) {
            if (typeof applyPvPRemoteBattleState === 'function') {
                applyPvPRemoteBattleState({ match: payload.match, log: payload.log || [] });
            } else if (pvpState.match) {
                const safeMatch = sanitizePvPMatch(payload.match) || payload.match;
                if (safeMatch && safeMatch.finished) {
                    pvpState.match = safeMatch;
                    pvpState.status = 'ended';
                    const localRole = getLocalPvPRole();
                    if (typeof window.pvpFinishPvPBattle === 'function') {
                        window.pvpFinishPvPBattle(safeMatch.winner === localRole, true);
                    }
                    pvpLog(payload.message || 'Матч завершён.', 'info');
                    renderPvPBattle();
                }
            }
        }
        return;
    }
}

function handlePvPError(err) {
    pvpState.status = 'error';
    pvpState.error = err && err.message ? err.message : String(err || 'Неизвестная ошибка PvP транспорта');
    pvpLog(pvpState.error, 'error');
    renderPvPArena();
}

function togglePvPReady() {
    if (pvpState.status !== 'connected') return;
    pvpState.localReady = !pvpState.localReady;
    pvpState.local = getPvPPlayerSnapshot();
    sendPvPMessage('ready', { ready: pvpState.localReady, snapshot: pvpState.local });
    renderPvPArena();
}

function hostStartPvPMatch() {
    if (pvpState.role !== 'host' || !pvpState.localReady || !pvpState.remoteReady || !pvpState.remote) return;
    pvpState.local = getPvPPlayerSnapshot();
    if (pvpState.local) pvpState.local.health = pvpState.local.maxHealth;
    if (pvpState.remote) pvpState.remote.health = pvpState.remote.maxHealth;
    pvpState.match = buildInitialPvPMatch(pvpState.local, pvpState.remote);
    if (pvpState.match && pvpState.match.players) {
        pvpState.match.players.host.health = pvpState.match.players.host.maxHealth;
        pvpState.match.players.guest.health = pvpState.match.players.guest.maxHealth;
    }
    pvpState.status = 'battle';
    sendPvPMessage('start', { match: pvpState.match });
    pvpLog('Матч начался.', 'success');
    if (typeof enterPvPBossBattle === 'function') enterPvPBossBattle();
    else renderPvPBattle();
}

function getLocalPvPRole() {
    return pvpState.role === 'host' ? 'host' : 'guest';
}

function getRemotePvPRole() {
    return getLocalPvPRole() === 'host' ? 'guest' : 'host';
}

function renderPvPBattle() {
    if (pvpState.status === 'battle' && pvpState.match && typeof renderBattle === 'function') {
        if (window.pvpBattleActive && typeof syncPvPBattleFromMatch === 'function') {
            syncPvPBattleFromMatch();
        } else if (typeof enterPvPBossBattle === 'function') {
            enterPvPBossBattle();
            return;
        }
        renderBattle({ force: true });
        return;
    }
    const el = document.getElementById('dynamicContent');
    if (!el || !pvpState.match) {
        renderPvPArena();
        return;
    }
    const localRole = getLocalPvPRole();
    const remoteRole = getRemotePvPRole();
    const local = pvpState.match.players[localRole];
    const remote = pvpState.match.players[remoteRole];
    const myTurn = pvpState.status === 'battle' && !pvpState.match.finished && pvpState.match.active === localRole;
    const logs = pvpState.log.map(l => `<div class="pvp-log-entry ${safePvPClass(l.type || 'info')}"><span>${escapePvPText(l.time)}</span> ${escapePvPText(l.message)}</div>`).join('');
    el.innerHTML = `
        <section class="pvp-battle">
            <div class="pvp-battle-top">
                <h2>🏟️ PvP Арена</h2>
                <span class="pvp-status ${myTurn ? 'ready' : ''}">${pvpState.match.finished ? 'Матч завершён' : myTurn ? 'Твой ход' : 'Ход соперника'}</span>
            </div>
            <div class="battle-arena pvp-battle-arena">
                ${renderPvPCombatant(remote, 'enemy', pvpState.remote)}
                <div class="vs-badge">${pvpState.match.turn}</div>
                ${renderPvPCombatant(local, 'player', pvpState.local)}
            </div>
            ${renderPvPResult()}
            <div class="battle-actions pvp-action-bar">
                <button class="action-btn" onclick="sendPvPAction('attack')" id="btnPvPAtk" ${myTurn ? '' : 'disabled'}>⚔️ Атака</button>
                <button class="action-btn" onclick="showPvPAbilities()" id="btnPvPAbi" ${myTurn ? '' : 'disabled'}>✨ Способности</button>
                <button class="action-btn" onclick="sendPvPAction('dodge')" id="btnPvPDodge" ${myTurn ? '' : 'disabled'}>💨 Уклон</button>
                <button class="action-btn danger" onclick="forfeitPvPMatch()" ${pvpState.status === 'battle' ? '' : 'disabled'}>🏃 Сдаться</button>
            </div>
            <p class="pvp-hint">Как в бою с боссом: классовые способности, уклон и скины. Маг тратит ману на заклинания.</p>
            <div class="pvp-log">${logs || '<div class="pvp-log-entry">Журнал пуст.</div>'}</div>
            <button class="action-btn" onclick="showPvPArena()">Вернуться в лобби</button>
        </section>
    `;
}

function renderPvPCombatant(stats, side, snapshot) {
    const hpPct = Math.max(0, Math.min(100, stats.health / Math.max(1, stats.maxHealth) * 100));
    let avatar = '';
    if (side === 'player' && typeof getAvatar === 'function') {
        avatar = `<div class="combatant-sprite"><span class="sprite-fallback">${getAvatar()}</span></div>`;
    } else {
        let safeAvatar = '';
        if (side === 'enemy' && typeof getPvPRemoteAvatarSrc === 'function') {
            safeAvatar = getPvPRemoteAvatarSrc();
        }
        if (!safeAvatar && snapshot) safeAvatar = safePvPAvatarSrc(snapshot.avatar);
        if (!safeAvatar && stats && stats.avatar) safeAvatar = safePvPAvatarSrc(stats.avatar);
        const displayUrl = pvpAvatarDisplayUrl(safeAvatar);
        const fbIcon = pvpClassIcon((snapshot && snapshot.class) || (stats && stats.class));
        avatar = displayUrl
            ? `<div class="combatant-sprite"><img class="combatant-img player-avatar" src="${escapePvPAttr(displayUrl)}" alt="" onerror="pvpAvatarImgError(this)"><span class="sprite-fallback" style="display:none">${fbIcon}</span></div>`
            : `<div class="combatant-sprite"><span class="sprite-fallback">${fbIcon}</span></div>`;
    }
    const manaLine = stats.class === 'Маг' && stats.maxMana > 0
        ? ` · 💎 ${escapePvPText(stats.mana)}/${escapePvPText(stats.maxMana)}`
        : '';
    const dodgeLine = stats.dodgeActive ? ' · 💨 Уклон активен' : '';
    return `
        <div class="combatant-wrapper ${side === 'enemy' ? 'enemy-side' : 'player-side'}">
            <div class="combatant-name">${escapePvPText(stats.name)}</div>
            ${avatar}
            <div class="health-bar"><div class="health-fill ${side === 'enemy' ? 'enemy-health' : 'player-health'}" style="width:${hpPct}%"></div></div>
            <div class="combatant-stats">❤️ ${escapePvPText(stats.health)}/${escapePvPText(stats.maxHealth)} · ⚔️ ${escapePvPText(stats.attack)} · 🛡️ ${escapePvPText(stats.defense)}${manaLine}${dodgeLine}</div>
        </div>
    `;
}

function showPvPAbilities() {
    const role = getLocalPvPRole();
    if (!pvpState.match || pvpState.match.active !== role || pvpState.match.finished) return;
    const fighter = pvpState.match.players[role];
    if (!fighter || !Array.isArray(fighter.abilities) || !fighter.abilities.length) {
        pvpLog('Нет доступных способностей.', 'error');
        return;
    }
    let html = '<h3>✨ Способности PvP</h3><div class="ability-grid">';
    fighter.abilities.forEach((a, i) => {
        const onCd = a.currentCooldown > 0;
        const noMana = fighter.class === 'Маг' && a.mana && (fighter.mana || 0) < a.mana;
        const isPassive = a.passive;
        let stats = '';
        if (a.dmg) stats += '<span>⚔️' + a.dmg + '%</span>';
        if (a.mana && fighter.class === 'Маг') stats += '<span>💎' + a.mana + '</span>';
        if (a.cd) stats += '<span>⏱️КД:' + a.cd + '</span>';
        if (a.heal) stats += '<span>💚' + a.heal + '%</span>';
        if (a.lifesteal) stats += '<span>🩸' + a.lifesteal + '%</span>';
        const disabled = onCd || noMana || isPassive;
        html += '<div class="ability-card' + (disabled ? ' on-cooldown' : '') + '" onclick="' + (disabled ? '' : 'sendPvPAbility(' + i + ')') + '">'
            + '<div class="ability-header"><span class="ability-icon">' + escapePvPText(a.icon || '✨') + '</span>'
            + '<span class="ability-name">' + escapePvPText(a.name) + (onCd ? ' (⌛' + a.currentCooldown + ')' : '') + '</span></div>'
            + '<div class="ability-desc">' + escapePvPText(a.desc) + '</div>'
            + (stats ? '<div class="ability-stats">' + stats + '</div>' : '')
            + (noMana ? '<div style="color:#e74c3c;font-size:9px;">❌ Нет маны</div>' : '')
            + (isPassive ? '<div style="color:#888;font-size:9px;">Пассивная</div>' : '')
            + '</div>';
    });
    html += '</div><button class="action-btn" onclick="renderPvPBattle()" style="margin-top:10px;width:100%;">↩️ Назад к бою</button>';
    const el = document.getElementById('dynamicContent');
    if (el) el.innerHTML = html;
}

function sendPvPAbility(index) {
    sendPvPAction('ability', { abilityIndex: index });
}

function renderPvPResult() {
    const match = pvpState.match;
    if (!match || !match.finished) return '';
    const localWon = match.winner === getLocalPvPRole();
    return `<div class="pvp-result ${localWon ? 'win' : 'lose'}">${localWon ? 'Победа!' : 'Поражение'}</div>`;
}

function sendPvPAction(action, options) {
    const role = getLocalPvPRole();
    if (!pvpState.match || pvpState.match.active !== role || pvpState.match.finished) return;
    const prevHash = pvpState.match.hash;
    const turn = pvpState.match.turn;
    const opts = options || {};
    const reduced = reducePvPMatch(pvpState.match, role, action, opts);
    if (reduced.result.ignored) {
        if (reduced.result.reason === 'on_cooldown') pvpLog('Способность на перезарядке.', 'error');
        else if (reduced.result.reason === 'no_mana') pvpLog('Не хватает маны.', 'error');
        return;
    }
    pvpState.match = reduced.match;
    appendPvPActionLog(reduced.result, true);
    sendPvPMessage('turn', {
        actorRole: role,
        action,
        abilityIndex: opts.abilityIndex,
        result: reduced.result,
        match: pvpState.match,
        prevHash,
        turn,
        hash: pvpState.match.hash
    });
    if (pvpState.match.finished) {
        sendPvPMessage('end', { match: pvpState.match, message: 'Матч завершён.' });
        pvpState.status = 'ended';
    }
    renderPvPBattle();
}

function applyPvPRemoteAction(payload) {
    if (!payload || !pvpState.match || pvpState.status !== 'battle') return;
    const expectedActor = getRemotePvPRole();
    if (payload.actorRole !== expectedActor) {
        pvpLog('Получен ход не от того игрока. Синхронизация отклонена.', 'error');
        return;
    }
    if (payload.prevHash !== pvpState.match.hash || Number(payload.turn) !== pvpState.match.turn || pvpState.match.active !== expectedActor) {
        pvpLog('Ход соперника не совпал с текущим состоянием. Матч рассинхронизирован.', 'error');
        return;
    }
    const remoteOpts = { abilityIndex: payload.abilityIndex };
    if (!validatePvPResult(pvpState.match, expectedActor, payload.action, payload.result, remoteOpts)) {
        pvpLog('Некорректный результат хода соперника отклонён.', 'error');
        return;
    }
    const syncedMatch = sanitizePvPMatch(payload.match);
    if (syncedMatch && syncedMatch.hash === payload.hash) {
        pvpState.match = syncedMatch;
    } else {
        pvpState.match = applyPvPResultToMatch(pvpState.match, expectedActor, payload.action, payload.result);
    }
    if (payload.hash && payload.hash !== pvpState.match.hash) {
        pvpLog('Hash хода отличается. Продолжаем по локально проверенному состоянию.', 'error');
    }
    appendPvPActionLog(payload.result, false);
    if (pvpState.match.finished) pvpState.status = 'ended';
    renderPvPBattle();
}

function appendPvPActionLog(result, localAction) {
    if (!result) return;
    const actorName = localAction ? 'Ты' : (pvpState.remote?.name || 'Соперник');
    if (result.action === 'dodge') {
        pvpLog(result.dodgeSuccess
            ? `${actorName}: уклонение удалось — следующий удар соперника может промахнуться.`
            : `${actorName}: уклонение не удалось.`, result.dodgeSuccess ? 'success' : 'info');
    } else if (result.dodgeBlocked) {
        pvpLog(`${actorName}: удар, но соперник уклонился.`, 'info');
    } else if (result.dodged) {
        pvpLog(`${actorName}: атака, цель уклонилась.`, 'info');
    } else if (result.action === 'ability' && result.abilityName) {
        const crit = result.crit ? ' Крит!' : '';
        const heal = result.healAmount ? ` (+${result.healAmount} лечения)` : '';
        pvpLog(`${actorName}: «${result.abilityName}» — ${result.damage} урона.${crit}${heal}`, result.crit ? 'crit' : 'dmg');
    } else {
        const crit = result.crit ? ' Крит!' : '';
        pvpLog(`${actorName}: ${result.damage} урона.${crit}`, result.crit ? 'crit' : 'dmg');
    }
}

function forfeitPvPMatch() {
    if (!pvpState.match || pvpState.match.finished) return;
    if (typeof leavePvPBossBattle === 'function') leavePvPBossBattle();
    pvpState.match.finished = true;
    pvpState.match.winner = getRemotePvPRole();
    pvpState.status = 'ended';
    pvpLog('Ты сдался.', 'error');
    sendPvPMessage('forfeit', {});
    renderPvPBattle();
}

function endPvPMatch(reason) {
    if (!pvpState.match) {
        pvpState.status = 'ended';
        renderPvPArena();
        return;
    }
    pvpState.match.finished = true;
    if (reason === 'opponent_forfeit' || reason === 'disconnect') {
        pvpState.match.winner = getLocalPvPRole();
        pvpLog(reason === 'disconnect' ? 'Соперник отключился. Победа техническая.' : 'Соперник сдался.', 'success');
    }
    pvpState.status = 'ended';
    renderPvPBattle();
}

function copyPvPCode() {
    if (!pvpState.roomCode) return;
    navigator.clipboard?.writeText(pvpState.roomCode);
    addMessage(`Код PvP скопирован: ${pvpState.roomCode}`, 'success');
}

function leavePvPArena() {
    if (typeof leavePvPBossBattle === 'function') leavePvPBossBattle();
    resetPvPConnection();
    pvpState = createEmptyPvPState();
    pvpLog('PvP соединение закрыто.', 'info');
    renderPvPArena();
}

function runPvPStressTest(iterations) {
    const testAbility = {
        name: 'Тест-удар', dmg: 120, cd: 0, mana: 0, passive: false, currentCooldown: 0, icon: '💥', desc: 'stress'
    };
    const host = {
        name: 'Host', class: 'Воин', branch: 'Тест', level: 50,
        maxHealth: 1800, health: 1800, attack: 260, defense: 90,
        criticalChance: 18, criticalDamage: 170, dodgeChance: 12,
        abilities: [testAbility]
    };
    const guest = {
        name: 'Guest', class: 'Лучник', branch: 'Тест', level: 50,
        maxHealth: 1500, health: 1500, attack: 285, defense: 70,
        criticalChance: 24, criticalDamage: 185, dodgeChance: 22,
        abilities: [testAbility]
    };
    let match = buildInitialPvPMatch(host, guest);
    const actions = ['attack', 'dodge', 'ability'];
    const total = iterations || 300;
    for (let i = 0; i < total && !match.finished; i++) {
        const action = actions[i % actions.length];
        const opts = action === 'ability' ? { abilityIndex: 0 } : {};
        const reduced = reducePvPMatch(match, match.active, action, opts);
        match = reduced.match;
        if (!match || !match.players.host || !match.players.guest || Number.isNaN(match.players.host.health) || Number.isNaN(match.players.guest.health)) {
            throw new Error('PvP stress state corrupted at turn ' + i);
        }
    }
    return { ok: true, turns: match.turn, finished: match.finished, winner: match.winner || 'none', hash: match.hash };
}

window.showPvPArena = showPvPArena;
window.createPvPRoom = createPvPRoom;
window.joinPvPRoom = joinPvPRoom;
window.togglePvPReady = togglePvPReady;
window.hostStartPvPMatch = hostStartPvPMatch;
window.sendPvPAction = sendPvPAction;
window.showPvPAbilities = showPvPAbilities;
window.sendPvPAbility = sendPvPAbility;
window.renderPvPBattle = renderPvPBattle;
window.forfeitPvPMatch = forfeitPvPMatch;
window.copyPvPCode = copyPvPCode;
window.leavePvPArena = leavePvPArena;
window.runPvPStressTest = runPvPStressTest;
window.getPvPPlayerSnapshot = getPvPPlayerSnapshot;
window.safePvPAvatarSrc = safePvPAvatarSrc;
window.pvpAvatarImgError = pvpAvatarImgError;
window.pvpAvatarDisplayUrl = pvpAvatarDisplayUrl;
window.getPvPRemoteAvatarSrc = getPvPRemoteAvatarSrc;
