"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
exports.noop = () => { };
exports.OPCODE_TEXT = 1;
exports.OPCODE_PING = 9;
exports.OPCODE_BINARY = 2;
exports.APP_PING_CODE = Buffer.from('9');
exports.PERMESSAGE_DEFLATE = 1;
exports.SLIDING_DEFLATE_WINDOW = 16;
exports.DEFAULT_PAYLOAD_LIMIT = 16777216;
exports.native = (() => {
    try {
        const [major, minor] = process.version.replace('v', '').split('.');
        if (Number(major) === 13 && Number(minor) < 9) {
            return require(`../dist/bindings/cws_${process.platform}_${process.versions.modules}_8`);
        }
        return require(`../dist/bindings/cws_${process.platform}_${process.versions.modules}`);
    }
    catch (err) {
        err.message = err.message + ` check './node_modules/@clusterws/cws/build_log.txt' for post install build logs`;
        throw err;
    }
})();
function setupNative(group, type, wsServer) {
    exports.native.setNoop(exports.noop);
    exports.native[type].group.onConnection(group, (external) => {
        if (type === 'server' && wsServer) {
            const socket = new client_1.WebSocket(null, { external });
            exports.native.setUserData(external, socket);
            if (wsServer.upgradeCb) {
                wsServer.upgradeCb(socket);
            }
            else {
                wsServer.registeredEvents['connection'](socket, wsServer.upgradeReq);
            }
            wsServer.upgradeCb = null;
            wsServer.upgradeReq = null;
            return;
        }
        const webSocket = exports.native.getUserData(external);
        webSocket.external = external;
        webSocket.registeredEvents['open']();
    });
    exports.native[type].group.onPing(group, (message, webSocket) => {
        webSocket.registeredEvents['ping'](message);
    });
    exports.native[type].group.onPong(group, (message, webSocket) => {
        webSocket.registeredEvents['pong'](message);
    });
    exports.native[type].group.onMessage(group, (message, webSocket) => {
        webSocket.registeredEvents['message'](message);
    });
    exports.native[type].group.onDisconnection(group, (newExternal, code, message, webSocket) => {
        webSocket.external = null;
        process.nextTick(() => {
            if (!code) {
                webSocket.registeredEvents['error']({
                    message: 'cWs invalid status code or invalid UTF-8 sequence',
                    stack: 'cWs invalid status code or invalid UTF-8 sequence'
                });
            }
            webSocket.registeredEvents['close'](code || 1006, message || '');
        });
        exports.native.clearUserData(newExternal);
    });
    if (type === 'client') {
        exports.native[type].group.onError(group, (webSocket) => {
            process.nextTick(() => {
                webSocket.registeredEvents['error']({
                    message: 'cWs client connection error',
                    stack: 'cWs client connection error'
                });
            });
        });
    }
}
exports.setupNative = setupNative;
