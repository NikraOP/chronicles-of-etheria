const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/core/pvpArena.js', 'utf8');
const context = {
    console,
    Date,
    Error,
    Math,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
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
    assert(urls.includes('wss://broker.emqx.io:8084/mqtt'), 'EMQX broker missing');
    assert(urls.includes('wss://test.mosquitto.org:8081/mqtt'), 'Mosquitto broker missing');
    assert(urls.includes('wss://broker.hivemq.com:8884/mqtt'), 'HiveMQ broker missing');
    assert(!urls.includes('wss://relay.damus.io'), 'damus relay must be excluded');
    assert(!urls.includes('wss://eden.nostr.land'), 'eden.nostr.land must be excluded');
    assert(!configJson.includes('nos.lol'), 'nostr-only host nos.lol must not be configured');
    assert(!configJson.includes('relay.primal.net'), 'nostr-only host relay.primal.net must not be configured');
    assert(!configJson.includes('relay.ditto.pub'), 'nostr-only host relay.ditto.pub must not be configured');
    assert(!configJson.includes('tracker.webtorrent.dev'), 'webtorrent relay must not be configured');
    assert(!configJson.includes('tracker.btorrent.xyz'), 'btorrent relay must not be configured');
    assert(!configJson.includes('tracker.openwebtorrent.com'), 'openwebtorrent relay must not be configured');
    assert(configA.relayConfig.urls !== configB.relayConfig.urls, 'relay urls array must be copied');

    configA.relayConfig.urls.push('wss://mutated.example');
    assert(!configB.relayConfig.urls.includes('wss://mutated.example'), 'relay config mutation leaked');
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
    await testObjectActionAdapter();
    await testArrayActionAdapter();
    console.log('PvP transport adapter tests OK');
})();
