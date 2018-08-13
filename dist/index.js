"use strict";

Object.defineProperty(exports, "__esModule", {
    value: !0
});

var HTTP = require("http");

class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(e, t) {
        if ("[object Function]" !== {}.toString.call(t)) return console.log("Listener should be a function");
        this.events[e] = t;
    }
    emit(e, ...t) {
        const r = this.events[e];
        r && r(...t);
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
}), native.client.group.onDisconnection(clientGroup, (e, t, r, n) => {
    n.external = null, process.nextTick(() => {
        n.emit("close", t, r), n = null;
    }), native.clearUserData(e);
});

class WebSocket extends EventEmitter {
    constructor(e, t, r) {
        super(), this.OPEN = 1, this.CLOSED = 0, this.isAlive = !0, this.external = noop, 
        this.on("pong", () => this.isAlive = !0), this.external = t, this.executeOn = r ? "server" : "client", 
        r || native.connect(clientGroup, e, this);
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
    send(e, t, r, n) {
        if (!this.external) return r && r(new Error("Not opened"));
        const s = t && t.binary || "string" != typeof e;
        native[this.executeOn].send(this.external, e, s ? OPCODE_BINARY : OPCODE_TEXT, r ? () => process.nextTick(r) : null, n);
    }
    terminate() {
        this.external && (native[this.executeOn].terminate(this.external), this.external = null);
    }
    close(e, t) {
        this.external && (native[this.executeOn].close(this.external, e, t), this.external = null);
    }
}

const native$1 = require(`./uws_${process.platform}_${process.versions.modules}`), APP_PONG_CODE = 65, APP_PING_CODE = Buffer.from("9"), PERMESSAGE_DEFLATE = 1, SLIDING_DEFLATE_WINDOW = 16, DEFAULT_PAYLOAD_LIMIT$1 = 16777216, noop$1 = () => {};

native$1.setNoop(noop$1);

class WebSocketServer extends EventEmitter {
    constructor(e, t) {
        super(), this.isAppLevelPing = !1, this.lastUpgradeListener = !0, this.noDelay = !!e.noDelay, 
        e.path && "/" !== e.path[0] && (e.path = `/${e.path}`), this.configureNative(e), 
        this.configureServer(e), this.start(e, t);
    }
    startAutoPing(e, t) {
        setTimeout(() => {
            this.isAppLevelPing = t, native$1.server.group.forEach(this.serverGroup, e => e.isAlive ? (e.isAlive = !1, 
            t ? e.send(APP_PING_CODE) : e.ping()) : e.terminate()), this.startAutoPing(e, t);
        }, e);
    }
    start(e, t) {
        e.port && this.httpServer.listen(e.port, e.host || null, () => {
            this.emit("listening"), t && t();
        });
    }
    configureServer(e) {
        this.httpServer = e.server || HTTP.createServer((e, t) => t.end()), this.httpServer.on("error", e => this.emit("error", e)), 
        this.httpServer.on("newListener", (e, t) => "upgrade" === e ? this.lastUpgradeListener = !1 : null), 
        this.httpServer.on("upgrade", (t, r) => {
            if (e.path && e.path !== t.url.split("?")[0].split("#")[0]) return this.lastUpgradeListener ? this.dropConnection(r, 400, "URL not supported") : null;
            if (e.verifyClient) {
                const n = {
                    req: t,
                    origin: t.headers.origin,
                    secure: !(!t.connection.authorized && !t.connection.encrypted)
                };
                return e.verifyClient(n, (e, n, s) => e ? this.handleUpgrade(t, r) : this.dropConnection(r, n, s));
            }
            return this.handleUpgrade(t, r);
        });
    }
    configureNative(e) {
        let t = 0;
        e.perMessageDeflate && (t |= e.perMessageDeflate.serverNoContextTakeover ? PERMESSAGE_DEFLATE : SLIDING_DEFLATE_WINDOW), 
        this.serverGroup = native$1.server.group.create(t, e.maxPayload || DEFAULT_PAYLOAD_LIMIT$1), 
        native$1.server.group.onConnection(this.serverGroup, e => {
            const t = new WebSocket(null, e, !0);
            native$1.setUserData(e, t), t.emit("connection", t, this.upgradeReq), this.upgradeReq = null;
        }), native$1.server.group.onMessage(this.serverGroup, (e, t) => {
            if (this.isAppLevelPing && "string" != typeof e && (e = Buffer.from(e)) === APP_PONG_CODE && 1 === e.length) return t.emit("pong");
            t.emit("message", e);
        }), native$1.server.group.onDisconnection(this.serverGroup, (e, t, r, n) => {
            n.external = null, process.nextTick(() => {
                n.emit("close", t, r), n = null;
            }), native$1.clearUserData(e);
        }), native$1.server.group.onPing(this.serverGroup, (e, t) => t.emit("ping", e)), 
        native$1.server.group.onPong(this.serverGroup, (e, t) => t.emit("pong", e));
    }
    dropConnection(e, t, r) {
        return e.end(`HTTP/1.1 ${t} ${r}\r\n\r\n`);
    }
    handleUpgrade(e, t) {
        const r = e.headers["sec-websocket-key"], n = t.ssl ? t.ssl._external : null, s = t.ssl ? t._parent._handle : t._handle;
        if (s && r && 24 === r.length) {
            t.setNoDelay(this.noDelay);
            const i = native$1.transfer(-1 === s.fd ? s : s.fd, n);
            t.on("close", (t, n) => {
                this.serverGroup && (this.upgradeReq = e, native$1.upgrade(this.serverGroup, i, r, e.headers["sec-websocket-extensions"], e.headers["sec-websocket-protocol"]));
            });
        }
        t.destroy();
    }
}

exports.WebSocket = WebSocket, exports.WebSocketServer = WebSocketServer;
