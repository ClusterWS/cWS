"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HTTP = require("http");
const shared_1 = require("./shared");
class WebSocketServer {
    constructor(options, cb = shared_1.noop) {
        this.options = options;
        this.registeredEvents = {
            close: shared_1.noop,
            error: shared_1.noop,
            connection: shared_1.noop,
        };
        let nativeOptions = 0;
        if (this.options.perMessageDeflate) {
            nativeOptions |= shared_1.PERMESSAGE_DEFLATE;
            if (this.options.perMessageDeflate.serverNoContextTakeover === false) {
                nativeOptions |= shared_1.SLIDING_DEFLATE_WINDOW;
            }
        }
        this.serverGroup = shared_1.native.server.group.create(nativeOptions, this.options.maxPayload || shared_1.DEFAULT_PAYLOAD_LIMIT);
        shared_1.setupNative(this.serverGroup, 'server', this);
        if (this.options.noServer) {
            return;
        }
        if (this.options.path && this.options.path[0] !== '/') {
            this.options.path = `/${this.options.path}`;
        }
        this.httpServer = this.options.server || HTTP.createServer((_, res) => {
            const body = HTTP.STATUS_CODES[426];
            res.writeHead(426, {
                'Content-Length': body.length,
                'Content-Type': 'text/plain'
            });
            return res.end(body);
        });
        this.httpServer.on('upgrade', this.onUpgradeRequest = ((req, socket) => {
            socket.on('error', () => {
                socket.destroy();
            });
            if (this.options.path && this.options.path !== req.url.split('?')[0].split('#')[0]) {
                return this.abortConnection(socket, 400, 'URL not supported');
            }
            if (this.options.verifyClient) {
                const info = {
                    origin: req.headers.origin,
                    secure: !!(req.connection.authorized || req.connection.encrypted),
                    req
                };
                this.options.verifyClient(info, (verified, code, message) => {
                    if (!verified) {
                        return this.abortConnection(socket, code || 401, message || 'Client verification failed');
                    }
                    this.upgradeConnection(req, socket);
                });
            }
            else {
                this.upgradeConnection(req, socket);
            }
        }));
        this.httpServer.on('error', (err) => {
            this.registeredEvents['error'](err);
        });
        if (this.options.port && !this.options.server) {
            this.httpServer.listen(this.options.port, this.options.host, cb);
        }
    }
    get clients() {
        return {
            length: this.serverGroup ? shared_1.native.server.group.getSize(this.serverGroup) : 0,
            forEach: (cb) => {
                if (this.serverGroup) {
                    shared_1.native.server.group.forEach(this.serverGroup, cb);
                }
            }
        };
    }
    on(event, listener) {
        if (typeof listener !== 'function') {
            throw new Error(`Could not set listener for '${event}' event, listener must be a function`);
        }
        else if (this.registeredEvents[event] === undefined) {
            console.warn(`WebSocket Server does not support '${event}' listener`);
        }
        else if (this.registeredEvents[event] !== shared_1.noop) {
            throw new Error(`Can not set '${event}' event listener twice`);
        }
        this.registeredEvents[event] = listener;
    }
    emit(event, ...args) {
        if (this.registeredEvents[event]) {
            this.registeredEvents[event](...args);
        }
    }
    broadcast(message, options) {
        if (this.serverGroup) {
            shared_1.native.server.group.broadcast(this.serverGroup, message, options && options.binary || false);
        }
    }
    startAutoPing(interval, appLevel) {
        if (this.serverGroup) {
            shared_1.native.server.group.startAutoPing(this.serverGroup, interval, appLevel ? shared_1.APP_PING_CODE : null);
        }
    }
    handleUpgrade(req, socket, upgradeHead, cb) {
        if (this.options.noServer) {
            this.upgradeConnection(req, socket, cb);
        }
    }
    close(cb = shared_1.noop) {
        if (this.httpServer) {
            this.httpServer.removeListener('upgrade', this.onUpgradeRequest);
            if (!this.options.server) {
                this.httpServer.close();
            }
        }
        if (this.serverGroup) {
            shared_1.native.server.group.close(this.serverGroup);
            this.serverGroup = null;
        }
        setTimeout(() => {
            this.registeredEvents['close']();
            cb();
        }, 0);
    }
    abortConnection(socket, code, message) {
        return socket.end(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
    }
    upgradeConnection(req, socket, cb) {
        const secKey = req.headers['sec-websocket-key'];
        if (socket._isNative) {
            if (this.serverGroup) {
                this.upgradeCb = cb;
                this.upgradeReq = req;
                shared_1.native.upgrade(this.serverGroup, socket.external, secKey, req.headers['sec-websocket-extensions'], req.headers['sec-websocket-protocol']);
            }
        }
        else {
            const socketAsAny = socket;
            const sslState = socketAsAny.ssl ? shared_1.native.getSSLContext(socketAsAny.ssl) : null;
            const socketHandle = socketAsAny.ssl ? socketAsAny._parent._handle : socketAsAny._handle;
            if (socketHandle && secKey && secKey.length === 24) {
                socket.setNoDelay(this.options.noDelay === false ? false : true);
                const ticket = shared_1.native.transfer(socketHandle.fd === -1 ? socketHandle : socketHandle.fd, sslState);
                socket.on('close', () => {
                    if (this.serverGroup) {
                        this.upgradeCb = cb;
                        this.upgradeReq = req;
                        shared_1.native.upgrade(this.serverGroup, ticket, secKey, req.headers['sec-websocket-extensions'], req.headers['sec-websocket-protocol']);
                    }
                });
            }
            socket.destroy();
        }
    }
}
exports.WebSocketServer = WebSocketServer;
