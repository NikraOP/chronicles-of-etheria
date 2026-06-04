/**
 * Full PvP test suite: transport, combat, match-end, reducer stress.
 * Run: node scripts/run-pvp-stress-suite.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function runNodeScript(relPath, label) {
    const scriptPath = path.join(root, relPath);
    console.log(`\n--- ${label} ---`);
    const r = spawnSync(process.execPath, [scriptPath], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
    });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0) {
        throw new Error(`${label} failed (exit ${r.status})`);
    }
}

function runReducerStress(iterations) {
    console.log(`\n--- PvP reducer stress (${iterations} turns) ---`);
    const source = fs.readFileSync(path.join(root, 'js/core/pvpArena.js'), 'utf8');
    const ctx = {
        console,
        Date,
        Error,
        Math,
        JSON,
        Promise,
        setTimeout,
        clearTimeout,
        crypto: globalThis.crypto,
        TextEncoder,
        btoa: s => Buffer.from(s, 'binary').toString('base64'),
        localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        },
        fetch: async () => ({ ok: false, status: 503, json: async () => [] }),
        AbortController: class {
            constructor() { this.signal = { aborted: false }; }
            abort() { this.signal.aborted = true; }
        },
        document: { createElement: () => ({ innerHTML: '', querySelector: () => null }) },
        player: {}
    };
    ctx.window = ctx;
    vm.runInNewContext(source, ctx, { filename: 'js/core/pvpArena.js' });
    const out = ctx.runPvPStressTest(iterations);
    if (!out || !out.ok) throw new Error('runPvPStressTest returned failure');
    console.log('OK: stress', JSON.stringify(out));
}

function main() {
    runNodeScript('scripts/test-pvp-transport-adapter.js', 'PvP transport adapter');
    runNodeScript('scripts/test-pvp-combat.js', 'PvP combat engine');
    runNodeScript('scripts/test-pvp-match-end.js', 'PvP match-end');
    runReducerStress(500);
    console.log('\nAll PvP stress suite checks passed.');
}

try {
    main();
} catch (e) {
    console.error(e.message || e);
    process.exit(1);
}
