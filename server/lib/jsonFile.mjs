/**
 * JSON на диск: кэш в RAM, атомарная запись, отложенный flush.
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const cache = new Map();
const dirty = new Set();
const flushTimers = new Map();
const FLUSH_MS = Number(process.env.ETHERIA_STORE_FLUSH_MS || 80);

export async function ensureDir(dir) {
    await mkdir(dir, { recursive: true });
}

export async function readJsonFile(path, fallback) {
    const hit = cache.get(path);
    if (hit !== undefined) return structuredClone(hit);
    try {
        const raw = await readFile(path, 'utf8');
        const data = JSON.parse(raw);
        cache.set(path, data);
        return structuredClone(data);
    } catch {
        if (fallback !== undefined) {
            cache.set(path, fallback);
            return structuredClone(fallback);
        }
        return fallback === undefined ? null : structuredClone(fallback);
    }
}

function scheduleFlush(path) {
    dirty.add(path);
    if (flushTimers.has(path)) return;
    const t = setTimeout(() => {
        flushTimers.delete(path);
        flushOne(path).catch(err => console.error('[store] flush', path, err.message));
    }, FLUSH_MS);
    flushTimers.set(path, t);
}

export function setJsonMemory(path, data) {
    cache.set(path, data);
    dirty.add(path);
    scheduleFlush(path);
}

export async function flushOne(path) {
    if (!dirty.has(path)) return;
    const data = cache.get(path);
    if (data === undefined) return;
    dirty.delete(path);
    await mkdir(dirname(path), { recursive: true });
    const tmp = path + '.tmp';
    await writeFile(tmp, JSON.stringify(data), 'utf8');
    await rename(tmp, path);
}

export async function flushAll() {
    const paths = [...dirty];
    await Promise.all(paths.map(flushOne));
}

export function dropJsonCache(path) {
    cache.delete(path);
    dirty.delete(path);
    const t = flushTimers.get(path);
    if (t) {
        clearTimeout(t);
        flushTimers.delete(path);
    }
}
