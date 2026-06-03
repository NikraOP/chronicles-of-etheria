/**
 * Тема: фон, акценты, цифры статов, надписи. localStorage etheria_theme_v2
 */
const THEME_STORAGE_KEY = 'etheria_theme_v2';
const THEME_DEFAULTS = {
    background: '#080810',
    primary: '#5b21b6',
    accent: '#a855f7',
    statValue: '#ddd6fe',
    label: '#8b8aa8'
};

const ThemeEngine = {
    ...THEME_DEFAULTS,

    initFromStorage() {
        try {
            const raw = localStorage.getItem(THEME_STORAGE_KEY);
            if (raw) {
                const t = JSON.parse(raw);
                Object.assign(this, THEME_DEFAULTS, t);
            } else {
                const legacy = localStorage.getItem('etheria_theme_v1');
                if (legacy) {
                    const t = JSON.parse(legacy);
                    if (t.primary) this.primary = t.primary;
                    if (t.accent) this.accent = t.accent;
                }
            }
        } catch (e) { /* ignore */ }
        this.applyAll(false);
    },

    snapshot() {
        return {
            background: this.background,
            primary: this.primary,
            accent: this.accent,
            statValue: this.statValue,
            label: this.label
        };
    },

    save() {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.snapshot()));
    },

    applyAll(persist) {
        const bg = normalizeHex(this.background) || THEME_DEFAULTS.background;
        const primary = normalizeHex(this.primary) || THEME_DEFAULTS.primary;
        const accent = normalizeHex(this.accent) || THEME_DEFAULTS.accent;
        const statValue = normalizeHex(this.statValue) || THEME_DEFAULTS.statValue;
        const label = normalizeHex(this.label) || THEME_DEFAULTS.label;

        this.background = bg;
        this.primary = primary;
        this.accent = accent;
        this.statValue = statValue;
        this.label = label;

        const br = hexToRgb(bg);
        const pr = hexToRgb(primary);
        const ar = hexToRgb(accent);
        const sr = hexToRgb(statValue);
        const lr = hexToRgb(label);
        const root = document.documentElement;

        root.style.setProperty('--theme-background', bg);
        root.style.setProperty('--bg', bg);
        root.style.setProperty('--bg-primary', darkenHex(bg, 0.12));
        root.style.setProperty('--bg-secondary', lightenHex(bg, 0.06));
        root.style.setProperty('--bg-card', lightenHex(bg, 0.1));
        root.style.setProperty('--bg-rgb', `${br.r}, ${br.g}, ${br.b}`);
        root.style.setProperty('--sidebar-surface', `rgba(${br.r}, ${br.g}, ${br.b}, 0.94)`);
        root.style.setProperty('--main-surface', `rgba(${Math.min(255, br.r + 8)}, ${Math.min(255, br.g + 8)}, ${Math.min(255, br.b + 12)}, 0.9)`);

        root.style.setProperty('--theme-primary', primary);
        root.style.setProperty('--theme-accent', accent);
        root.style.setProperty('--theme-stat-value', statValue);
        root.style.setProperty('--theme-label', label);
        root.style.setProperty('--primary-rgb', `${pr.r}, ${pr.g}, ${pr.b}`);
        root.style.setProperty('--accent-rgb', `${ar.r}, ${ar.g}, ${ar.b}`);

        root.style.setProperty('--gold', primary);
        root.style.setProperty('--gold-light', lightenHex(primary, 0.38));
        root.style.setProperty('--gold-dark', darkenHex(primary, 0.22));
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--purple', accent);
        root.style.setProperty('--text-secondary', label);
        root.style.setProperty('--text-muted', darkenHex(label, 0.15));

        root.style.setProperty('--accent-glow', `rgba(${ar.r}, ${ar.g}, ${ar.b}, 0.42)`);
        root.style.setProperty('--border-gold', `rgba(${pr.r}, ${pr.g}, ${pr.b}, 0.28)`);
        root.style.setProperty('--border-accent', `rgba(${ar.r}, ${ar.g}, ${ar.b}, 0.35)`);
        root.style.setProperty('--glow', `0 0 20px rgba(${ar.r}, ${ar.g}, ${ar.b}, 0.32)`);
        root.style.setProperty('--glow-strong', `0 0 36px rgba(${ar.r}, ${ar.g}, ${ar.b}, 0.45), 0 0 64px rgba(${pr.r}, ${pr.g}, ${pr.b}, 0.12)`);
        root.style.setProperty('--shadow-gold', `0 4px 20px rgba(${pr.r}, ${pr.g}, ${pr.b}, 0.15)`);

        if (persist !== false) this.save();
        if (typeof refreshThemeParticles === 'function') refreshThemeParticles();
    },

    reset() {
        Object.assign(this, THEME_DEFAULTS);
        this.applyAll();
    }
};

function normalizeHex(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.trim();
    if (!h.startsWith('#')) h = '#' + h;
    if (h.length === 4) {
        h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : null;
}

function hexToRgb(hex) {
    const h = normalizeHex(hex) || '#000000';
    return {
        r: parseInt(h.slice(1, 3), 16),
        g: parseInt(h.slice(3, 5), 16),
        b: parseInt(h.slice(5, 7), 16)
    };
}

function rgbToHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : d / max;
    if (d !== 0) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            default: h = ((r - g) / d + 4) / 6;
        }
    }
    return { h: h * 360, s, v };
}

function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function lightenHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darkenHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function mountColorWheel(container, initialHex, onPick) {
    const WHEEL_PX = 200;
    const wrap = document.createElement('div');
    wrap.className = 'color-wheel-wrap';

    const wheelBox = document.createElement('div');
    wheelBox.className = 'color-wheel-box';

    const canvas = document.createElement('canvas');
    canvas.className = 'color-wheel-canvas';
    canvas.width = WHEEL_PX;
    canvas.height = WHEEL_PX;

    const cursor = document.createElement('div');
    cursor.className = 'color-wheel-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    wheelBox.appendChild(canvas);
    wheelBox.appendChild(cursor);

    const bright = document.createElement('input');
    bright.type = 'range';
    bright.className = 'color-wheel-brightness';
    bright.min = '0';
    bright.max = '100';
    bright.value = '100';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'color-wheel-hex';
    hexInput.maxLength = 7;

    const swatch = document.createElement('div');
    swatch.className = 'color-wheel-swatch';

    wrap.appendChild(wheelBox);
    wrap.appendChild(bright);
    wrap.appendChild(hexInput);
    wrap.appendChild(swatch);
    container.appendChild(wrap);

    let state = { h: 270, s: 1, v: 1 };
    let dragging = false;
    let wheelImage = null;

    function displayRadius() {
        const rect = canvas.getBoundingClientRect();
        return Math.min(rect.width, rect.height) / 2 - 3;
    }

    function drawWheel() {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = w / 2 - 3;
        const image = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const i = (y * w + x) * 4;
                if (dist <= radius) {
                    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
                    const sat = Math.min(1, dist / radius);
                    const rgb = hsvToRgb(angle, sat, 1);
                    image.data[i] = rgb.r;
                    image.data[i + 1] = rgb.g;
                    image.data[i + 2] = rgb.b;
                    image.data[i + 3] = 255;
                } else {
                    image.data[i + 3] = 0;
                }
            }
        }
        wheelImage = image;
        ctx.putImageData(image, 0, 0);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function placeCursor() {
        const rect = canvas.getBoundingClientRect();
        const boxRect = wheelBox.getBoundingClientRect();
        const cx = rect.left - boxRect.left + rect.width / 2;
        const cy = rect.top - boxRect.top + rect.height / 2;
        const r = displayRadius();
        const rad = (state.h * Math.PI) / 180;
        const d = state.s * r;
        cursor.style.left = (cx + Math.cos(rad) * d) + 'px';
        cursor.style.top = (cy + Math.sin(rad) * d) + 'px';
    }

    function setFromHex(hex) {
        const norm = normalizeHex(hex);
        if (!norm) return;
        const { r, g, b } = hexToRgb(norm);
        state = rgbToHsv(r, g, b);
        bright.value = String(Math.round(state.v * 100));
        hexInput.value = norm;
        swatch.style.background = norm;
        if (!wheelImage) drawWheel();
        placeCursor();
    }

    function currentHex() {
        const rgb = hsvToRgb(state.h, state.s, state.v);
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function emit() {
        const hex = currentHex();
        hexInput.value = hex;
        swatch.style.background = hex;
        onPick(hex);
    }

    function pickAt(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = displayRadius();
        const angle = Math.atan2(dy, dx);
        state.h = (angle * 180 / Math.PI + 360) % 360;
        state.s = Math.min(1, dist / r);
        placeCursor();
        emit();
    }

    bright.addEventListener('input', () => {
        state.v = parseInt(bright.value, 10) / 100;
        emit();
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
        pickAt(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        pickAt(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointerup', (e) => {
        dragging = false;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; });

    hexInput.addEventListener('change', () => { setFromHex(hexInput.value); emit(); });
    hexInput.addEventListener('blur', () => { setFromHex(hexInput.value); emit(); });

    drawWheel();
    setFromHex(initialHex);

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => placeCursor());
        ro.observe(wheelBox);
    }

    return { setFromHex, getHex: currentHex };
}

/** Секция «Оформление» внутри настроек */
function mountAppearanceEditor(container) {
    const draft = { ...ThemeEngine.snapshot() };

    container.innerHTML =
        '<p class="theme-editor-desc">Настройте цвета интерфейса. Изменения видны сразу; «Сохранить» запишет их в браузер.</p>' +
        '<div class="theme-editor-grid theme-editor-grid-5">' +
        '<div class="theme-editor-col"><h3>Фон</h3><p class="theme-col-hint">Тёмная основа сайта</p><div id="wheelBg"></div></div>' +
        '<div class="theme-editor-col"><h3>Акцент UI</h3><p class="theme-col-hint">Кнопки, рамки</p><div id="wheelPrimary"></div></div>' +
        '<div class="theme-editor-col"><h3>Свечение</h3><p class="theme-col-hint">Подсветка, частицы</p><div id="wheelAccent"></div></div>' +
        '<div class="theme-editor-col"><h3>Цифры</h3><p class="theme-col-hint">Значения статов</p><div id="wheelStat"></div></div>' +
        '<div class="theme-editor-col"><h3>Надписи</h3><p class="theme-col-hint">Подписи статов</p><div id="wheelLabel"></div></div>' +
        '</div>' +
        '<div class="theme-preview-strip" id="themePreviewStrip"></div>' +
        '<div class="theme-preview-stats">' +
        '<div class="stat-item theme-preview-stat"><span class="stat-icon">❤️</span><div class="stat-info">' +
        '<div class="stat-label">Здоровье</div><div class="stat-value">120 / 150</div></div></div>' +
        '<div class="stat-item theme-preview-stat"><span class="stat-icon">💰</span><div class="stat-info">' +
        '<div class="stat-label">Золото</div><div class="stat-value">1 240</div></div></div>' +
        '</div>' +
        '<div class="theme-editor-actions">' +
        '<button type="button" class="action-btn" id="themeApplyBtn">Сохранить тему</button>' +
        '<button type="button" class="action-btn theme-btn-ghost" id="themeResetBtn">Сбросить</button>' +
        '</div>';

    function syncDraft() {
        Object.assign(ThemeEngine, draft);
        ThemeEngine.applyAll(false);
        const strip = document.getElementById('themePreviewStrip');
        if (strip) {
            strip.style.background =
                'linear-gradient(90deg, ' + draft.background + ' 0%, ' + draft.primary + ' 40%, ' + draft.accent + ' 100%)';
        }
    }

    mountColorWheel(document.getElementById('wheelBg'), draft.background, (hex) => { draft.background = hex; syncDraft(); });
    mountColorWheel(document.getElementById('wheelPrimary'), draft.primary, (hex) => { draft.primary = hex; syncDraft(); });
    mountColorWheel(document.getElementById('wheelAccent'), draft.accent, (hex) => { draft.accent = hex; syncDraft(); });
    mountColorWheel(document.getElementById('wheelStat'), draft.statValue, (hex) => { draft.statValue = hex; syncDraft(); });
    mountColorWheel(document.getElementById('wheelLabel'), draft.label, (hex) => { draft.label = hex; syncDraft(); });

    syncDraft();

    document.getElementById('themeApplyBtn').onclick = () => {
        Object.assign(ThemeEngine, draft);
        ThemeEngine.applyAll();
        if (typeof addMessage === 'function') addMessage('Оформление сохранено', 'success');
    };

    document.getElementById('themeResetBtn').onclick = () => {
        ThemeEngine.reset();
        mountAppearanceEditor(container);
        if (typeof addMessage === 'function') addMessage('Тема по умолчанию', 'info');
    };
}

window.ThemeEngine = ThemeEngine;
window.mountAppearanceEditor = mountAppearanceEditor;

ThemeEngine.initFromStorage();
