const MAX_BODY = 2 * 1024 * 1024;

export function createHttpHelpers(corsOrigins) {
    function corsHeaders(origin) {
        const allow = corsOrigins.includes('*')
            ? '*'
            : (corsOrigins.includes(origin) ? origin : corsOrigins[0] || '*');
        return {
            'Access-Control-Allow-Origin': allow,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Player-Id, X-Sync-Token, X-Account-Token',
            'Access-Control-Max-Age': '86400',
            'Connection': 'keep-alive'
        };
    }

    function json(res, status, body, origin) {
        const payload = JSON.stringify(body);
        res.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...corsHeaders(origin)
        });
        res.end(payload);
    }

    async function readJsonBody(req) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_BODY) throw new Error('body_too_large');
            chunks.push(chunk);
        }
        if (!chunks.length) return {};
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }

    return { corsHeaders, json, readJsonBody, MAX_BODY };
}
