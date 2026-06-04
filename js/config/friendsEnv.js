/**
 * Настройки друзей для GitHub Pages и локальной игры.
 * Supabase (опционально): если заполнены URL и anon key — используется Supabase вместо HTTP API.
 */
(function (global) {
    var host = typeof location !== 'undefined' ? location.hostname : '';
    var onGitHubPages = host === 'nikraop.github.io' || /\.github\.io$/i.test(host);

    global.ETHERIA_FRIENDS_SUPABASE_URL = '';
    global.ETHERIA_FRIENDS_SUPABASE_ANON_KEY = '';

    // Timeweb Cloud API (docs/TIMEWEB_CLOUD.md). sslip.io → IP 5.42.103.145
    global.ETHERIA_FRIENDS_HTTP_API = onGitHubPages
        ? 'https://5-42-103-145.sslip.io'
        : 'http://localhost:8790';

    if (onGitHubPages) {
        global.ETHERIA_FRIENDS_BACKEND = 'auto';
        global.ETHERIA_PVP_USE_CLOUD = true;
        if (typeof document !== 'undefined' && typeof global.wakeCloudApi === 'function') {
            var apiBase = global.ETHERIA_FRIENDS_HTTP_API;
            function warmEtheriaCloudApi() {
                global.wakeCloudApi(apiBase);
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', warmEtheriaCloudApi);
            } else {
                warmEtheriaCloudApi();
            }
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
