const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const source = fs.readFileSync('js/core/pvpArena.js', 'utf8');
const lsStore = {};
const context = {
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
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    localStorage: {
        getItem: (k) => (k in lsStore ? lsStore[k] : null),
        setItem: (k, v) => { lsStore[k] = String(v); },
        removeItem: (k) => { delete lsStore[k]; }
    },
    fetch: async () => ({ ok: false, status: 503, json: async () => [] }),
    AbortController: class {
        constructor() { this.signal = { aborted: false }; }
        abort() { this.signal.aborted = true; }
    },
    document: { createElement: () => ({ innerHTML: '', querySelector: () => null }) },
    player: {}
};
context.window = context;

vm.runInNewContext(source, context, { filename: 'js/core/pvpArena.js' });

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function testSetterRoomHandlers() {
    const room = {
        joinHandler: null,
        get onPeerJoin() { return this.joinHandler; },
        set onPeerJoin(handler) { this.joinHandler = handler; },
        leaveHandler: null,
        get onPeerLeave() { return this.leaveHandler; },
        set onPeerLeave(handler) { this.leaveHandler = handler; }
    };

    let joined = '';
    let left = '';
    context.setPvPRoomHandler(room, 'onPeerJoin', peerId => { joined = peerId; });
    context.setPvPRoomHandler(room, 'onPeerLeave', peerId => { left = peerId; });
    room.joinHandler('peer-a');
    room.leaveHandler('peer-b');

    assert(joined === 'peer-a', 'setter onPeerJoin handler did not run');
    assert(left === 'peer-b', 'setter onPeerLeave handler did not run');
}

function testLegacyFunctionRoomHandlers() {
    const room = {
        onPeerJoin(handler) { this.joinHandler = handler; }
    };

    let joined = '';
    context.setPvPRoomHandler(room, 'onPeerJoin', peerId => { joined = peerId; });
    room.joinHandler('peer-c');

    assert(joined === 'peer-c', 'function onPeerJoin handler did not run');
}

function testTransportConfigRelays() {
    const configA = context.getPvPTransportConfig();
    const configB = context.getPvPTransportConfig();
    const urls = configA.relayConfig.urls;
    const configJson = JSON.stringify(configA);

    assert(configA.appId === 'chronicles-of-etheria-pvp-v2-mqtt', 'transport appId mismatch');
    assert(Array.isArray(urls), 'MQTT broker urls must be an array');
    assert(urls.length >= 4 && urls.length <= 5, 'MQTT transport needs 4-5 brokers');
    assert(urls[0] === 'wss://broker.emqx.io:443/mqtt', 'EMQX 443 broker must be first');
    assert(urls.includes('wss://broker.emqx.io:8084/mqtt'), 'EMQX 8084 broker missing');
    assert(!urls.includes('wss://test.mosquitto.org:8081/mqtt'), 'unreliable Mosquitto broker must be excluded');
    assert(urls.includes('wss://broker.hivemq.com:8884/mqtt'), 'HiveMQ broker missing');
    assert(configA.relayConfig.redundancy === 2, 'MQTT redundancy must be 2 to limit parallel WebSockets');
    assert(!urls.includes('wss://relay.damus.io'), 'damus relay must be excluded');
    assert(!configJson.includes('nos.lol'), 'nostr-only host nos.lol must not be configured');
    assert(configA.relayConfig.urls !== configB.relayConfig.urls, 'relay urls array must be copied');

    const ice = configA.rtcConfig && configA.rtcConfig.iceServers;
    assert(Array.isArray(ice) && ice.length >= 4, 'rtcConfig.iceServers must include STUN and TURN');
    assert(configA.rtcConfig.iceCandidatePoolSize === 10, 'iceCandidatePoolSize must be 10');
    assert(configA.trickleIce === false, 'trickleIce should be false for MQTT reliability');
    assert(Array.isArray(configA.turnConfig) && configA.turnConfig.length > 0, 'turnConfig must list TURN servers');
    const iceJson = JSON.stringify(ice);
    assert(iceJson.includes('stun:stun.l.google.com'), 'Google STUN missing');
    assert(iceJson.includes('stun:stun.cloudflare.com'), 'Cloudflare STUN missing');
    assert(iceJson.includes('turn:freeturn.net') || iceJson.includes('turn:freestun.net'), 'free TURN missing');
    const turnEntry = ice.find(s => {
        const u = Array.isArray(s.urls) ? s.urls.join(' ') : String(s.urls);
        return u.includes('turn:') && s.username && s.credential;
    });
    assert(turnEntry && turnEntry.username && turnEntry.credential, 'TURN must have username and credential');
    assert(configA.rtcConfig !== configB.rtcConfig, 'rtcConfig object must be copied');
    assert(configA.rtcConfig.iceServers !== configB.rtcConfig.iceServers, 'iceServers array must be copied');
}

async function testLoadPvPIceServersMerged() {
    context.resetPvPIceServersCache();
    const servers = await context.loadPvPIceServers();
    assert(Array.isArray(servers) && servers.length >= 6, 'loadPvPIceServers must return merged ice servers');
    const iceStr = JSON.stringify(servers);
    assert(
        iceStr.includes('staticauth.openrelay.metered.ca') || iceStr.includes('global.relay.metered.ca'),
        'async ICE load must include Metered relay hosts'
    );
    assert(iceStr.includes('turn:freeturn.net') || iceStr.includes('turn:freestun.net'), 'async ICE load must include free TURN');
    const openRelayTurn = servers.find(s => {
        const u = Array.isArray(s.urls) ? s.urls.join(' ') : String(s.urls);
        return u.includes('staticauth.openrelay.metered.ca') && s.username && s.credential;
    });
    assert(openRelayTurn, 'Open Relay static TURN must have time-limited credentials');
    assert(String(openRelayTurn.username).includes(':'), 'TURN REST username must be timestamp:user');
}

async function testTurnRestCredentials() {
    const cred = await context.generateTurnRestCredentials('openrelayprojectsecret', 3600, 'test-user');
    const expected = crypto.createHmac('sha1', 'openrelayprojectsecret')
        .update(cred.username)
        .digest('base64');
    assert(cred.credential === expected, 'HMAC TURN credential must match coturn REST format');
}

async function testEffectiveMeteredApiKey() {
    assert(context.getEffectiveMeteredApiKey() === '', 'empty when no key');
    lsStore.etheria_pvp_metered_api_key = '56c193debb416385ade8d9a77e277ea33c0f';
    assert(context.getEffectiveMeteredApiKey() === '56c193debb416385ade8d9a77e277ea33c0f', 'localStorage key must be read');
    assert(context.classifyMeteredApiKey('sk_id_abc') === 'secret', 'sk_id must be secret');
    assert(context.classifyMeteredApiKey('56c193debb416385ade8d9a77e277ea33c0f') === 'credential', 'hex api key is credential');
    delete lsStore.etheria_pvp_metered_api_key;
}

function testNormalizePasswordCredential() {
    const out = context.normalizePvPIceServersPayload([
        { urls: 'turn:relay.metered.ca:80', username: 'u', password: 'p' }
    ]);
    assert(out && out[0].credential === 'p', 'password field must map to credential');
}

async function testObjectActionAdapter() {
    const action = {
        sent: null,
        async send(message, options) { this.sent = { message, options }; },
        get onMessage() { return this.handler; },
        set onMessage(handler) { this.handler = handler; }
    };

    const adapter = context.createPvPActionAdapter(action);
    let received = null;
    adapter.receive((message, peerId) => { received = { message, peerId }; });
    await adapter.send({ type: 'hello' }, 'peer-d');
    action.handler({ type: 'ready' }, { peerId: 'peer-e' });

    assert(action.sent.message.type === 'hello', 'object action send payload mismatch');
    assert(action.sent.options.target === 'peer-d', 'object action target mismatch');
    assert(received.message.type === 'ready', 'object action receive payload mismatch');
    assert(received.peerId === 'peer-e', 'object action peerId mismatch');
}

async function testArrayActionAdapter() {
    let sent = null;
    let receiver = null;
    const adapter = context.createPvPActionAdapter([
        async (message, peerId) => { sent = { message, peerId }; },
        handler => { receiver = handler; }
    ]);

    let received = null;
    adapter.receive((message, peerId) => { received = { message, peerId }; });
    await adapter.send({ type: 'start' }, 'peer-f');
    receiver({ type: 'turn' }, 'peer-g');

    assert(sent.message.type === 'start', 'array action send payload mismatch');
    assert(sent.peerId === 'peer-f', 'array action peerId mismatch');
    assert(received.message.type === 'turn', 'array action receive payload mismatch');
    assert(received.peerId === 'peer-g', 'array action receive peerId mismatch');
}

(async () => {
    testSetterRoomHandlers();
    testLegacyFunctionRoomHandlers();
    testTransportConfigRelays();
    await testTurnRestCredentials();
    await testEffectiveMeteredApiKey();
    testNormalizePasswordCredential();
    await testLoadPvPIceServersMerged();
    await testObjectActionAdapter();
    await testArrayActionAdapter();
    console.log('PvP transport adapter tests OK');
})();
