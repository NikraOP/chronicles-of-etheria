/**
 * Устойчивый fetch для Render (cold start → ERR_CONNECTION_RESET / Failed to fetch).
 */
(function (global) {
    const RETRY_MS = [400, 1200, 2800, 5500];

    function isRetryableNetworkError(err) {
        if (!err) return false;
        if (err.name === 'TypeError') return true;
        const msg = String(err.message || err).toLowerCase();
        return msg.includes('failed to fetch')
            || msg.includes('network')
            || msg.includes('load failed')
            || msg.includes('connection');
    }

    global.cloudApiFetch = async function cloudApiFetch(url, options) {
        options = options || {};
        let lastErr;
        for (let attempt = 0; attempt <= RETRY_MS.length; attempt++) {
            try {
                return await fetch(url, options);
            } catch (err) {
                lastErr = err;
                if (!isRetryableNetworkError(err) || attempt >= RETRY_MS.length) throw err;
                await new Promise(function (r) { setTimeout(r, RETRY_MS[attempt]); });
            }
        }
        throw lastErr;
    };

    global.wakeCloudApi = async function wakeCloudApi(base) {
        const root = String(base || '').replace(/\/+$/, '');
        if (!root) return false;
        try {
            const res = await cloudApiFetch(root + '/health', { method: 'GET', cache: 'no-store' });
            if (!res.ok) return false;
            const data = await res.json();
            return !!(data && data.ok);
        } catch (_) {
            return false;
        }
    };

    global.cloudApiNetworkHint = function cloudApiNetworkHint(err) {
        if (!err) return '';
        const msg = String(err.message || err).toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('connection') || err.name === 'TypeError') {
            return ' Сервер облака просыпается (Render free) — подождите 30–60 с и повторите.';
        }
        return '';
    };
})(typeof window !== 'undefined' ? window : globalThis);
