import { join } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readJsonFile, setJsonMemory, dropJsonCache } from './jsonFile.mjs';

const LOGIN_RE = /^[a-zA-Z0-9_\u0400-\u04FF]{3,20}$/;
const MAX_CHARACTERS = 8;
const MAX_SAVE_BYTES = 1_800_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function scryptHash(password, salt) {
    return scryptSync(String(password), salt, 64);
}

function safeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export function createGameAccountsApi(dataDir) {
    function loginIndexPath(login) {
        return join(dataDir, 'auth_login_' + normalizeLogin(login) + '.json');
    }
    function accountPath(accountId) {
        return join(dataDir, 'gaccount_' + sanitizeId(accountId) + '.json');
    }
    function sessionPath(token) {
        return join(dataDir, 'gsession_' + String(token).slice(0, 128) + '.json');
    }
    function charPath(accountId, charId) {
        return join(dataDir, 'gchar_' + sanitizeId(accountId) + '_' + sanitizeId(charId) + '.json');
    }

    function sanitizeId(id) {
        return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    function normalizeLogin(login) {
        return String(login || '').trim().toLowerCase().slice(0, 20);
    }

    function newAccountId() {
        return 'acc_' + randomBytes(10).toString('hex');
    }

    function newCharId() {
        return 'ch_' + randomBytes(8).toString('hex');
    }

    function newSessionToken() {
        return randomBytes(24).toString('hex');
    }

    function validateLogin(login) {
        const n = normalizeLogin(login);
        if (!LOGIN_RE.test(n)) {
            return { error: 'invalid_login', message: 'Логин: 3–20 символов (буквы, цифры, _)' };
        }
        return { ok: true, login: n };
    }

    function validatePassword(password, passwordConfirm) {
        const p = String(password || '');
        const c = String(passwordConfirm || '');
        if (p.length < 6 || p.length > 64) {
            return { error: 'invalid_password', message: 'Пароль: от 6 до 64 символов' };
        }
        if (c && p !== c) {
            return { error: 'password_mismatch', message: 'Пароли не совпадают' };
        }
        return { ok: true };
    }

    function pickAccountToken(req) {
        const h = req.headers['x-account-token'];
        return String(h || '').trim().slice(0, 128);
    }

    async function loadSession(token) {
        if (!token) return null;
        const sess = await readJsonFile(sessionPath(token), null);
        if (!sess || !sess.accountId) return null;
        if (sess.expiresAt && Date.now() > sess.expiresAt) return null;
        const account = await readJsonFile(accountPath(sess.accountId), null);
        if (!account) return null;
        return { token, session: sess, account };
    }

    async function requireAccount(req) {
        const token = pickAccountToken(req);
        const ctx = await loadSession(token);
        if (!ctx) return null;
        return ctx;
    }

    function charSummary(entry, full) {
        const base = {
            id: entry.id,
            name: entry.name || 'Герой',
            class: entry.class || '',
            branch: entry.branch || '',
            level: entry.level || 1,
            updatedAt: entry.updatedAt || 0
        };
        if (full && full.player) base.hasSave = true;
        return base;
    }

    function summarizeFromPlayer(player) {
        if (!player) return { name: 'Герой', class: '', branch: '', level: 1 };
        return {
            name: String(player.name || 'Герой').slice(0, 40),
            class: String(player.class || '').slice(0, 24),
            branch: String(player.branch || '').slice(0, 40),
            level: Math.max(1, Math.min(999, Number(player.level) || 1))
        };
    }

    function validatePlayerBlob(player) {
        if (!player || typeof player !== 'object' || !player.class) {
            return { error: 'invalid_save', message: 'Некорректное сохранение персонажа' };
        }
        let raw;
        try {
            raw = JSON.stringify(player);
        } catch {
            return { error: 'invalid_save' };
        }
        if (raw.length > MAX_SAVE_BYTES) {
            return { error: 'save_too_large', message: 'Сохранение слишком большое' };
        }
        return { ok: true, player: JSON.parse(raw) };
    }

    return {
        pickAccountToken,
        requireAccount,
        validateLogin,
        validatePassword,

        async register(body) {
            const lv = validateLogin(body.login);
            if (lv.error) return lv;
            const pv = validatePassword(body.password, body.passwordConfirm);
            if (pv.error) return pv;

            const login = lv.login;
            const existing = await readJsonFile(loginIndexPath(login), null);
            if (existing && existing.accountId) {
                return { error: 'login_taken', status: 409, message: 'Этот логин уже занят' };
            }

            const accountId = newAccountId();
            const salt = randomBytes(16);
            const passwordHash = scryptHash(body.password, salt).toString('hex');
            const token = newSessionToken();
            const now = Date.now();

            setJsonMemory(loginIndexPath(login), { accountId, login, createdAt: now });
            setJsonMemory(accountPath(accountId), {
                accountId,
                login,
                createdAt: now,
                updatedAt: now,
                passwordHash,
                salt: salt.toString('hex'),
                characters: []
            });
            setJsonMemory(sessionPath(token), {
                accountId,
                login,
                createdAt: now,
                expiresAt: now + SESSION_TTL_MS
            });

            return {
                ok: true,
                accountId,
                login,
                token,
                expiresAt: now + SESSION_TTL_MS
            };
        },

        async login(body) {
            const lv = validateLogin(body.login);
            if (lv.error) return lv;
            const pv = validatePassword(body.password);
            if (pv.error) return pv;

            const login = lv.login;
            const idx = await readJsonFile(loginIndexPath(login), null);
            if (!idx || !idx.accountId) {
                return { error: 'invalid_credentials', status: 401, message: 'Неверный логин или пароль' };
            }
            const account = await readJsonFile(accountPath(idx.accountId), null);
            if (!account || !account.passwordHash || !account.salt) {
                return { error: 'invalid_credentials', status: 401 };
            }
            const salt = Buffer.from(account.salt, 'hex');
            const hash = scryptHash(body.password, salt);
            const stored = Buffer.from(account.passwordHash, 'hex');
            if (!safeEqual(hash, stored)) {
                return { error: 'invalid_credentials', status: 401, message: 'Неверный логин или пароль' };
            }

            const token = newSessionToken();
            const now = Date.now();
            setJsonMemory(sessionPath(token), {
                accountId: account.accountId,
                login: account.login,
                createdAt: now,
                expiresAt: now + SESSION_TTL_MS
            });
            account.updatedAt = now;
            setJsonMemory(accountPath(account.accountId), account);

            return {
                ok: true,
                accountId: account.accountId,
                login: account.login,
                token,
                expiresAt: now + SESSION_TTL_MS
            };
        },

        async logout(token) {
            if (token) setJsonMemory(sessionPath(token), null);
            return { ok: true };
        },

        async me(ctx) {
            const chars = (ctx.account.characters || []).map(c => charSummary(c));
            return {
                ok: true,
                accountId: ctx.account.accountId,
                login: ctx.account.login,
                createdAt: ctx.account.createdAt,
                characters: chars
            };
        },

        async listCharacters(ctx) {
            const list = (ctx.account.characters || []).map(c => charSummary(c));
            return { ok: true, characters: list };
        },

        async createCharacter(ctx, body) {
            const chars = ctx.account.characters || [];
            if (chars.length >= MAX_CHARACTERS) {
                return { error: 'character_limit', status: 400, message: 'Максимум ' + MAX_CHARACTERS + ' персонажей' };
            }
            let player = null;
            if (body && body.player) {
                const v = validatePlayerBlob(body.player);
                if (v.error) return v;
                player = v.player;
            }
            const meta = summarizeFromPlayer(player);
            const charId = newCharId();
            const now = Date.now();
            const entry = {
                id: charId,
                name: meta.name,
                class: meta.class,
                branch: meta.branch,
                level: meta.level,
                createdAt: now,
                updatedAt: now
            };
            chars.push(entry);
            ctx.account.characters = chars;
            ctx.account.updatedAt = now;
            setJsonMemory(accountPath(ctx.account.accountId), ctx.account);
            if (player) {
                setJsonMemory(charPath(ctx.account.accountId, charId), {
                    charId,
                    accountId: ctx.account.accountId,
                    updatedAt: now,
                    saveVersion: '3.1',
                    player
                });
            }
            return { ok: true, character: charSummary(entry, player ? { player } : null) };
        },

        async getCharacter(ctx, charId) {
            const id = sanitizeId(charId);
            const entry = (ctx.account.characters || []).find(c => c.id === id);
            if (!entry) return { error: 'not_found', status: 404 };
            const blob = await readJsonFile(charPath(ctx.account.accountId, id), null);
            if (!blob || !blob.player) {
                return { ok: true, character: charSummary(entry), player: null };
            }
            return {
                ok: true,
                character: charSummary(entry, blob),
                player: blob.player,
                updatedAt: blob.updatedAt,
                saveVersion: blob.saveVersion || '3.1'
            };
        },

        async saveCharacter(ctx, charId, body) {
            const id = sanitizeId(charId);
            const entry = (ctx.account.characters || []).find(c => c.id === id);
            if (!entry) return { error: 'not_found', status: 404 };
            const v = validatePlayerBlob(body.player);
            if (v.error) return v;
            const player = v.player;
            const meta = summarizeFromPlayer(player);
            const now = Date.now();
            entry.name = meta.name;
            entry.class = meta.class;
            entry.branch = meta.branch;
            entry.level = meta.level;
            entry.updatedAt = now;
            ctx.account.updatedAt = now;
            setJsonMemory(accountPath(ctx.account.accountId), ctx.account);
            setJsonMemory(charPath(ctx.account.accountId, id), {
                charId: id,
                accountId: ctx.account.accountId,
                updatedAt: now,
                saveVersion: body.saveVersion || '3.1',
                player
            });
            return { ok: true, character: charSummary(entry, { player }), updatedAt: now };
        },

        async deleteCharacter(ctx, charId) {
            const id = sanitizeId(charId);
            const chars = ctx.account.characters || [];
            const idx = chars.findIndex(c => c.id === id);
            if (idx < 0) return { error: 'not_found', status: 404 };
            chars.splice(idx, 1);
            ctx.account.characters = chars;
            ctx.account.updatedAt = Date.now();
            setJsonMemory(accountPath(ctx.account.accountId), ctx.account);
            dropJsonCache(charPath(ctx.account.accountId, id));
            return { ok: true };
        }
    };
}
