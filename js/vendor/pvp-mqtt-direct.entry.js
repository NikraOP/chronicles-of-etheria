/**
 * PvP over MQTT only (no WebRTC / TURN). Compatible with Trystero room API used in pvpArena.js.
 */
import mqtt from 'mqtt';

function makePeerId() {
    const r = Math.random().toString(36).slice(2, 10);
    return `${r}${Date.now().toString(36).slice(-4)}`;
}

function parseEnvelope(buf) {
    try {
        return JSON.parse(buf.toString());
    } catch (e) {
        return null;
    }
}

export function joinRoom(config, roomId, options) {
    const opts = options || {};
    const urls = (config.relayConfig && config.relayConfig.urls) || [];
    const appId = config.appId || '';
    const topic = String(roomId);
    const peerId = makePeerId();
    let joinHandler = null;
    let leaveHandler = null;
    let pvpReceive = null;
    let joinErrorFired = false;
    let connected = false;
    const seenPeers = new Set();
    let client = null;
    let urlIndex = 0;

    const fireJoinError = err => {
        if (joinErrorFired || typeof opts.onJoinError !== 'function') return;
        joinErrorFired = true;
        const msg = err && err.message ? err.message : String(err);
        opts.onJoinError({ error: msg });
    };

    const publish = envelope => {
        if (!connected || !client) return;
        client.publish(topic, JSON.stringify(envelope), { qos: 0 });
    };

    const announce = () => {
        publish({ kind: 'presence', peerId, appId });
    };

    const attachClient = url => {
        if (client) {
            try { client.end(true); } catch (e) {}
        }
        const isWss = /^wss:/i.test(url);
        client = mqtt.connect(url, {
            protocol: isWss ? 'wss' : 'ws',
            clientId: `etheria_pvp_${peerId}_${Math.floor(Math.random() * 1e6)}`,
            clean: true,
            reconnectPeriod: 2500,
            connectTimeout: 12000,
            keepalive: 25
        });

        const connectTimer = setTimeout(() => {
            if (!connected) {
                if (urlIndex + 1 < urls.length) {
                    urlIndex += 1;
                    attachClient(urls[urlIndex]);
                } else {
                    fireJoinError(new Error('MQTT connect timeout'));
                }
            }
        }, opts.handshakeTimeoutMs || 14000);

        client.on('connect', () => {
            connected = true;
            clearTimeout(connectTimer);
            client.subscribe(topic, { qos: 0 }, err => {
                if (err) {
                    fireJoinError(err);
                    return;
                }
                announce();
            });
        });

        client.on('error', err => {
            if (!connected && urlIndex + 1 < urls.length) {
                urlIndex += 1;
                attachClient(urls[urlIndex]);
                return;
            }
            fireJoinError(err);
        });

        client.on('close', () => {
            connected = false;
        });

        client.on('message', (t, buf) => {
            if (t !== topic) return;
            const msg = parseEnvelope(buf);
            if (!msg || !msg.peerId || msg.peerId === peerId) return;
            if (appId && msg.appId && msg.appId !== appId) return;

            if (msg.kind === 'presence') {
                if (!seenPeers.has(msg.peerId) && joinHandler) {
                    seenPeers.add(msg.peerId);
                    joinHandler(msg.peerId);
                }
                announce();
            }
            if (msg.kind === 'pvp') {
                if (!seenPeers.has(msg.peerId) && joinHandler) {
                    seenPeers.add(msg.peerId);
                    joinHandler(msg.peerId);
                }
            }

            if (msg.kind === 'pvp' && pvpReceive) {
                if (msg.to && msg.to !== peerId) return;
                pvpReceive(msg.data, msg.peerId);
            }

            if (msg.kind === 'leave' && leaveHandler) {
                seenPeers.delete(msg.peerId);
                leaveHandler(msg.peerId);
            }
        });
    };

    if (!urls.length) {
        fireJoinError(new Error('MQTT broker URL required'));
    } else {
        attachClient(urls[urlIndex]);
    }

    return {
        get onPeerJoin() { return joinHandler; },
        set onPeerJoin(handler) { joinHandler = handler; },
        get onPeerLeave() { return leaveHandler; },
        set onPeerLeave(handler) { leaveHandler = handler; },
        makeAction() {
            return [
                (data, targetPeerId) => {
                    publish({
                        kind: 'pvp',
                        peerId,
                        appId,
                        to: targetPeerId || undefined,
                        data
                    });
                },
                handler => {
                    pvpReceive = (data, fromPeerId) => handler(data, fromPeerId);
                }
            ];
        },
        leave() {
            publish({ kind: 'leave', peerId, appId });
            return new Promise(resolve => {
                if (!client) {
                    resolve();
                    return;
                }
                client.end(false, {}, () => resolve());
            });
        }
    };
}
