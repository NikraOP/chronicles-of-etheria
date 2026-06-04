/**
 * Настройки друзей для GitHub Pages и локальной игры.
 * Supabase (опционально): если заполнены URL и anon key — используется Supabase вместо HTTP API.
 */
(function (global) {
    var host = typeof location !== 'undefined' ? location.hostname : '';
    var onGitHubPages = host === 'nikraop.github.io' || /\.github\.io$/i.test(host);

    global.ETHERIA_FRIENDS_SUPABASE_URL = '';
    global.ETHERIA_FRIENDS_SUPABASE_ANON_KEY = '';

    // После Blueprint на Render (docs/FRIENDS_GITHUB_PAGES.md)
    global.ETHERIA_FRIENDS_HTTP_API = onGitHubPages
        ? 'https://etheria-friends-api.onrender.com'
        : 'http://localhost:8790';

    if (onGitHubPages) {
        global.ETHERIA_FRIENDS_BACKEND = 'auto';
    }
})(typeof window !== 'undefined' ? window : globalThis);
