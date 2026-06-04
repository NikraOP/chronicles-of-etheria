/**
 * PvP WebSocket signaling relay (Trystero ws-relay).
 * Deploy: Render / Fly / VPS. Local: npm run start:relay
 */
import { createServer } from 'node:http';
import { createWsRelayServer } from '@trystero-p2p/ws-relay/server';

const port = Number(process.env.PORT || 8787);

const httpServer = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'etheria-pvp-relay' }));
        return;
    }
    res.writeHead(404);
    res.end();
});

const relay = await createWsRelayServer({
    server: httpServer,
    onError: err => console.error('[pvp-relay]', err.message || err)
});

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[pvp-relay] WebSocket signaling on port ${port}`);
});

process.on('SIGTERM', () => {
    httpServer.close();
    relay.close?.();
});
