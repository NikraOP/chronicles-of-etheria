import { join } from 'node:path';
import { randomBytes, randomInt } from 'node:crypto';
import { readJsonFile, setJsonMemory } from './jsonFile.mjs';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_FRIENDS = 80;

export function createAccountsApi(dataDir) {
    function profilePath(playerId) {
        return join(dataDir, 'profile_' + sanitizeId(playerId) + '.json');
    }
    function friendsPath(playerId) {
        return join(dataDir, 'friends_' + sanitizeId(playerId) + '.json');
    }
    function codePath(code) {
        return join(dataDir, 'code_' + String(code).toUpperCase() + '.json');
    }

    function sanitizeId(id) {
        return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    function newPlayerId() {
        return 'p_' + randomBytes(8).toString('hex');
    }
    function newSyncToken() {
        return randomBytes(16).toString('hex');
    }
    function newFriendCode() {
        let code = '';
        for (let i = 0; i < 6; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
        return code;
    }

    async function allocateFriendCode(playerId) {
        for (let attempt = 0; attempt < 40; attempt++) {
            const code = newFriendCode();
            const path = codePath(code);
            const existing = await readJsonFile(path, null);
            if (!existing || existing.playerId === playerId) {
                setJsonMemory(path, { playerId, createdAt: Date.now() });
                return code;
            }
        }
        throw new Error('code_alloc_failed');
    }

    function pickAuth(req) {
        return {
            playerId: sanitizeId(req.headers['x-player-id']),
            syncToken: String(req.headers['x-sync-token'] || '').slice(0, 128)
        };
    }

    async function loadAccount(playerId) {
        if (!playerId) return null;
        return readJsonFile(profilePath(playerId), null);
    }

    function sanitizeProfile(profile) {
        if (!profile || typeof profile !== 'object') return null;
        const out = {
            name: String(profile.name || 'Герой').slice(0, 40),
            class: String(profile.class || '').slice(0, 24),
            branch: String(profile.branch || '').slice(0, 40),
            level: Math.max(1, Math.min(999, Number(profile.level) || 1)),
            gold: Math.max(0, Math.floor(Number(profile.gold) || 0)),
            victories: Math.max(0, Math.floor(Number(profile.victories) || 0)),
            location: String(profile.location || '').slice(0, 80),
            gender: String(profile.gender || 'male').slice(0, 12),
            schoolImg: String(profile.schoolImg || profile.portraitImg || '').slice(0, 200),
            portraitImg: String(profile.portraitImg || profile.schoolImg || '').slice(0, 200),
            currentSkin: profile.currentSkin != null ? String(profile.currentSkin).slice(0, 80) : null,
            skinName: String(profile.skinName || '').slice(0, 48),
            skinIcon: String(profile.skinIcon || '').slice(0, 8),
            stats: {},
            equipment: {}
        };
        const st = profile.stats && typeof profile.stats === 'object' ? profile.stats : {};
        out.stats = {
            health: Number(st.health) || 0,
            maxHealth: Number(st.maxHealth) || 0,
            attack: Number(st.attack) || 0,
            defense: Number(st.defense) || 0,
            mana: Number(st.mana) || 0,
            maxMana: Number(st.maxMana) || 0,
            criticalChance: Number(st.criticalChance) || 0,
            criticalDamage: Number(st.criticalDamage) || 0,
            dodgeChance: Number(st.dodgeChance) || 0,
            experience: Number(st.experience) || 0,
            maxExperience: Number(st.maxExperience) || 0
        };
        const eq = profile.equipment && typeof profile.equipment === 'object' ? profile.equipment : {};
        for (const slot of ['weapon', 'helmet', 'chest', 'pants', 'boots', 'ring', 'necklace']) {
            const item = eq[slot];
            if (!item || typeof item !== 'object') {
                out.equipment[slot] = null;
                continue;
            }
            out.equipment[slot] = {
                name: String(item.name || '').slice(0, 80),
                rarity: String(item.rarity || '').slice(0, 24),
                icon: String(item.icon || '📦').slice(0, 8),
                img: String(item.img || '').slice(0, 200),
                dmg: Number(item.dmg) || 0,
                def: Number(item.def) || 0,
                hp: Number(item.hp) || 0,
                crit: Number(item.crit) || 0,
                critDmg: Number(item.critDmg) || 0,
                dodge: Number(item.dodge) || 0,
                mana: Number(item.mana) || 0
            };
        }
        return out;
    }

    async function getFriendIds(playerId) {
        const list = await readJsonFile(friendsPath(playerId), []);
        return Array.isArray(list) ? list.filter(id => sanitizeId(id)) : [];
    }

    async function addFriendLink(playerId, friendPlayerId) {
        if (playerId === friendPlayerId) return false;
        const path = friendsPath(playerId);
        const ids = await getFriendIds(playerId);
        if (ids.includes(friendPlayerId)) return true;
        if (ids.length >= MAX_FRIENDS) throw new Error('friends_limit');
        ids.push(friendPlayerId);
        setJsonMemory(path, ids);
        return true;
    }

    async function removeFriendLink(playerId, friendPlayerId) {
        if (playerId === friendPlayerId) return false;
        const path = friendsPath(playerId);
        const ids = await getFriendIds(playerId);
        const filtered = ids.filter(id => id !== friendPlayerId);
        if (filtered.length === ids.length) return false;
        setJsonMemory(path, filtered);
        return true;
    }

    async function loadPublicSnapshot(playerId) {
        const account = await loadAccount(playerId);
        if (!account || !account.profile) return null;
        return {
            playerId: account.playerId,
            friendCode: account.friendCode,
            updatedAt: account.updatedAt || 0,
            profile: account.profile
        };
    }

    return {
        sanitizeId,
        pickAuth,
        loadAccount,
        allocateFriendCode,
        newPlayerId,
        newSyncToken,
        sanitizeProfile,
        getFriendIds,
        addFriendLink,
        removeFriendLink,
        loadPublicSnapshot,
        codePath,
        readCode: code => readJsonFile(codePath(code), null),
        saveAccount(account) {
            setJsonMemory(profilePath(account.playerId), account);
        }
    };
}
