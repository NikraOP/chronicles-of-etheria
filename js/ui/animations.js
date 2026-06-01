function createParticles() {
    const c = document.getElementById('particles');
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.width = Math.random() * 4 + 2 + 'px';
        p.style.height = p.style.width;
        p.style.animationDuration = Math.random() * 6 + 4 + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        c.appendChild(p);
    }
}