"use strict";

var HTTP = require("http");

function isFunction(e) {
    return "[object Function]" === {}.toString.call(e);
}

class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(e, t) {
        if (!isFunction(t)) return console.log("Listener should be a function");
        this.events[e] = t;
    }
    emit(e, ...t) {
        const n = this.events[e];
        n && n(...t);
    }
    removeEvents() {
        this.events = {};
    }
}

const native = require(`./uws_${process.platform}_${process.versions.modules}`), OPCODE_TEXT = 1, OPCODE_PING = 9, OPCODE_BINARY = 2, DEFAULT_PAYLOAD_LIMIT = 16777216, noop = () => {};

native.setNoop(noop);

const clientGroup = native.client.group.create(0, 16777216);

native.client.group.onConnection(clientGroup, e => {
    const t = native.getUserData(e);
    t.external = e, t.emit("open");
}), native.client.group.onMessage(clientGroup, (e, t) => {
    t.emit("message", e);
}), native.client.group.onPing(clientGroup, (e, t) => {
    t.emit("ping", e);
}), native.client.group.onPong(clientGroup, (e, t) => {
    t.emit("pong", e);
}), native.client.group.onError(clientGroup, e => {
    process.nextTick(() => {
        e.emit("error", {
            message: "uWs client connection error",
            stack: "uWs client connection error"
        });
    });
}), native.client.group.onDisconnection(clientGroup, (e, t, n, r) => {
    r.external = null, process.nextTick(() => {
        r.emit("close", t, n), r = null;
    }), native.clearUserData(e);
});

class WebSocket extends EventEmitter {
    constructor(e, t, n) {
        super(), this.OPEN = 1, this.CLOSED = 0, this.isAlive = !0, this.external = noop, 
        this.on("pong", () => this.isAlive = !0), this.external = t, this.executeOn = n ? "server" : "client", 
        n || native.connect(clientGroup, e, this);
    }
    get _socket() {
        const e = this.external ? native.getAddress(this.external) : new Array(3);
        return {
            remotePort: e[0],
            remoteAddress: e[1],
            remoteFamily: e[2]
        };
    }
    get readyState() {
        return this.external ? this.OPEN : this.CLOSED;
    }
    ping(e) {
        this.external && native[this.executeOn].send(this.external, e, OPCODE_PING);
    }
    send(e, t, n, r) {
        if (!this.external) return n && n(new Error("Not opened"));
        const i = t && t.binary || "string" != typeof e;
        native[this.executeOn].send(this.external, e, i ? OPCODE_BINARY : OPCODE_TEXT, n ? () => process.nextTick(n) : null, r);
    }
    terminate() {
        this.external && (native[this.executeOn].terminate(this.external), this.external = null);
    }
    close(e, t) {
        this.external && (native[this.executeOn].close(this.external, e, t), this.external = null);
    }
}

const native$1 = require(`./uws_${process.platform}_${process.versions.modules}`), APP_PONG_CODE = 65, APP_PING_CODE = Buffer.from("9"), PERMESSAGE_DEFLATE = 1, DEFAULT_PAYLOAD_LIMIT$1 = 16777216, noop$1 = () => {};

native$1.setNoop(noop$1);

class WebSocketServer extends EventEmitter {
    constructor(e, t) {
        super(), this.isAppLevelPing = !1, this.noDelay = !!e.noDelay, this.configureNative(e), 
        this.configureServer(e), this.start(e, t);
    }
    start(e, t) {
        e.port && this.httpServer.listen(e.port, e.host || null, () => {
            this.emit("listening"), t && t();
        });
    }
    emitConnection(e) {
        this.emit("connection", e, this.upgradeReq);
    }
    configureServer(e) {
        this.httpServer = e.server || HTTP.createServer((e, t) => t.end()), this.httpServer.on("error", e => this.emit("error", e)), 
        this.httpServer.on("upgrade", (t, n) => {
            if (e.verifyClient) {
                const r = {
                    origin: t.headers.origin,
                    secure: !(!t.connection.authorized && !t.connection.encrypted),
                    req: t
                };
                return e.verifyClient(r, (e, r, i) => e ? this.handleUpgrade(t, n) : this.dropConnection(n, r, i));
            }
            return this.handleUpgrade(t, n);
        });
    }
    configureNative(e) {
        this.serverGroup = native$1.server.group.create(e.perMessageDeflate ? PERMESSAGE_DEFLATE : 0, e.maxPayload || DEFAULT_PAYLOAD_LIMIT$1), 
        native$1.server.group.onConnection(this.serverGroup, e => {
            const t = new WebSocket(null, e, !0);
            native$1.setUserData(e, t), this.emitConnection(t), this.upgradeReq = null;
        }), native$1.server.group.onMessage(this.serverGroup, (e, t) => {
            if (this.isAppLevelPing && "string" != typeof e && (e = Buffer.from(e)) === APP_PONG_CODE && 1 === e.length) return t.emit("pong");
            t.emit("message", e);
        }), native$1.server.group.onDisconnection(this.serverGroup, (e, t, n, r) => {
            r.external = null, process.nextTick(() => {
                r.emit("close", t, n), r = null;
            }), native$1.clearUserData(e);
        }), native$1.server.group.onPing(this.serverGroup, (e, t) => t.emit("ping", e)), 
        native$1.server.group.onPong(this.serverGroup, (e, t) => t.emit("pong", e));
    }
    dropConnection(e, t, n) {
        return e.end(`HTTP/1.1 ${t} ${n}\r\n\r\n`);
    }
    handleUpgrade(e, t) {
        const n = e.headers["sec-websocket-key"], r = t.ssl ? t.ssl._external : null, i = t.ssl ? t._parent._handle : t._handle;
        if (i && n && 24 === n.length) {
            t.setNoDelay(this.noDelay);
            const s = native$1.transfer(-1 === i.fd ? i : i.fd, r);
            t.on("close", (t, r) => {
                this.serverGroup && (this.upgradeReq = e, native$1.upgrade(this.serverGroup, s, n, e.headers["sec-websocket-extensions"], e.headers["sec-websocket-protocol"]));
            });
        }
        t.destroy();
    }
    startAutoPing(e, t) {
        setTimeout(() => {
            this.isAppLevelPing = t, native$1.server.group.forEach(this.serverGroup, e => e.isAlive ? (e.isAlive = !1, 
            t ? e.send(APP_PING_CODE) : e.ping()) : e.terminate()), this.startAutoPing(e, t);
        }, e);
    }
}

var index = {
    WebSocket: WebSocket,
    WebSocketServer: WebSocketServer
};

module.exports = index, module.exports.default = index;
