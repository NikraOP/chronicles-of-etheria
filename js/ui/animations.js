function createParticles() {
    const c = document.getElementById('particles');
    if (!c) return;
    c.innerHTML = '';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#a855f7';
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.width = Math.random() * 3 + 1 + 'px';
        p.style.height = p.style.width;
        p.style.background = `radial-gradient(circle, ${accent} 0%, transparent 100%)`;
        p.style.boxShadow = `0 0 6px ${accent}`;
        p.style.animationDuration = Math.random() * 6 + 4 + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        c.appendChild(p);
    }
}

function refreshThemeParticles() {
    const c = document.getElementById('particles');
    if (!c || !c.children.length) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim() || '#a855f7';
    c.querySelectorAll('.particle').forEach((p) => {
        p.style.background = `radial-gradient(circle, ${accent} 0%, transparent 100%)`;
        p.style.boxShadow = `0 0 6px ${accent}`;
    });
}