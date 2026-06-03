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
    await testObjectActionAdapter();
    await testArrayActionAdapter();
    console.log('PvP transport adapter tests OK');
})();
