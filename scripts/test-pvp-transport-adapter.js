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

function testNostrRelayDenylist() {
    assert(context.isPvPNostrRelayDenied('wss://purplepag.es/'), 'purplepag must be denied');
    assert(context.isPvPNostrRelayDenied('wss://purplerelay.com'), 'purplerelay must be denied');
    const filtered = context.getPvPNostrRelayUrlsFiltered();
    assert(!filtered.some(u => u.includes('purplepag.es')), 'filtered list must exclude purplepag');
    assert(filtered.includes('wss://nos.lol'), 'nos.lol must remain');
    assert(filtered.includes('wss://relay.mostr.pub'), 'relay.mostr.pub must remain');
}

function testSignalingErrorDetection() {
    assert(context.isPvPSignalingError({ error: 'blocked: kind 22717 is not allowed' }), 'kind block must be signaling error');
    assert(context.isPvPSignalingError({ error: 'Trystero: relay failure from wss://x' }), 'relay failure must match');
}

function testTransportConfigRelays() {
    context.setPvPSignalingBackend('mqtt');
    const mqttCfg = context.getPvPTransportConfig();
    const mqttJson = JSON.stringify(mqttCfg);
    assert(mqttCfg.appId === 'chronicles-of-etheria-pvp-v4', 'transport appId mismatch');
    assert(mqttCfg.relayConfig.urls.includes('wss://broker.hivemq.com:8884/mqtt'), 'HiveMQ broker');
    assert(mqttCfg.relayConfig.urls.includes('wss://broker.emqx.io:8084/mqtt'), 'EMQX broker');
    assert(!mqttJson.includes('eclipseprojects'), 'eclipse MQTT must not be configured');
    assert(mqttCfg.relayConfig.redundancy === 2, 'MQTT redundancy must be 2');
    assert(mqttCfg.trickleIce === true, 'trickleIce must be enabled');

    context.setPvPSignalingBackend('nostr');
    const configA = context.getPvPTransportConfig();
    const configB = context.getPvPTransportConfig();
    const urls = configA.relayConfig.urls;
    assert(urls[0] === 'wss://nos.lol', 'nos.lol must be first Nostr relay');
    assert(!urls.includes('wss://purplepag.es'), 'purplepag must not be in relay urls');
    assert(urls.includes('wss://relay.mostr.pub'), 'relay.mostr.pub missing');
    assert(configA.relayConfig.redundancy === 4, 'Nostr redundancy must be 4');
    context.setPvPSignalingBackend('mqtt');
    const configA2 = context.getPvPTransportConfig();

    const ice = configA2.rtcConfig && configA2.rtcConfig.iceServers;
    assert(Array.isArray(ice) && ice.length >= 4, 'rtcConfig.iceServers must include STUN and TURN');
    assert(configA2.rtcConfig.iceCandidatePoolSize === 10, 'iceCandidatePoolSize must be 10');
    assert(Array.isArray(configA2.turnConfig) && configA2.turnConfig.length > 0, 'turnConfig must list TURN servers');
    const iceJson = JSON.stringify(ice);
    assert(iceJson.includes('stun:stun.l.google.com'), 'Google STUN missing');
    assert(iceJson.includes('stun:stun.cloudflare.com'), 'Cloudflare STUN missing');
    assert(iceJson.includes('turn:freeturn.net') || iceJson.includes('turn:freestun.net'), 'free TURN missing');
    const turnEntry = ice.find(s => {
        const u = Array.isArray(s.urls) ? s.urls.join(' ') : String(s.urls);
        return u.includes('turn:') && s.username && s.credential;
    });
    assert(turnEntry && turnEntry.username && turnEntry.credential, 'TURN must have username and credential');
    assert(configA2.rtcConfig !== configB.rtcConfig, 'rtcConfig object must be copied');
    assert(configA2.rtcConfig.iceServers !== configB.rtcConfig.iceServers, 'iceServers array must be copied');
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

function testFirewallTurnUrls() {
    const out = context.filterPvPFirewallTurnUrls([
        'turn:host:80',
        'turn:host:443?transport=tcp',
        'turns:host:443?transport=tcp'
    ]);
    assert(out.length === 2 && out[0].includes('443'), 'firewall filter must prefer 443/TLS TURN');
}

function testCompressPvPIceServers() {
    const merged = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: ['turn:freeturn.net:3478'], username: 'a', credential: 'b' },
        { urls: ['turns:global.relay.metered.ca:443'], username: 'u', credential: 'c' },
        { urls: ['turn:staticauth.openrelay.metered.ca:80'], username: 'u2', credential: 'c2' }
    ];
    const out = context.compressPvPIceServers(merged);
    const json = JSON.stringify(out);
    assert(json.includes('global.relay.metered.ca'), 'metered TURN must stay after compress');
    assert(out.length <= 10, 'compressed ICE list must be bounded');
}

(async () => {
    testSetterRoomHandlers();
    testLegacyFunctionRoomHandlers();
    testNostrRelayDenylist();
    testSignalingErrorDetection();
    testTransportConfigRelays();
    testFirewallTurnUrls();
    testCompressPvPIceServers();
    await testTurnRestCredentials();
    await testEffectiveMeteredApiKey();
    testNormalizePasswordCredential();
    await testLoadPvPIceServersMerged();
    await testObjectActionAdapter();
    await testArrayActionAdapter();
    console.log('PvP transport adapter tests OK');
})();
