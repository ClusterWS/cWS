import * as HTTP from 'http';
import { WebSocket } from './client';
import { EventEmitter } from '../emitter';
import { Listener, ServerConfigs, BroadcastOptions } from '../types';
import { native, noop, APP_PING_CODE, PERMESSAGE_DEFLATE, SLIDING_DEFLATE_WINDOW, DEFAULT_PAYLOAD_LIMIT, APP_PONG_CODE } from './shared';

native.setNoop(noop);

export class WebSocketServer extends EventEmitter {
    private noDelay: boolean;
    private httpServer: any;
    private upgradeReq: any;
    private serverGroup: any;
    private isAppLevelPing: boolean = false;
    private lastUpgradeListener: boolean = true;

    constructor(configs: ServerConfigs, callback?: Listener) {
        super();
        this.noDelay = !!configs.noDelay;

        if (configs.path && configs.path[0] !== '/') {
            configs.path = `/${configs.path}`;
        }

        this.configureNative(configs);
        this.configureServer(configs);
        this.start(configs, callback);
    }

    public broadcast(message: string | Buffer, options: BroadcastOptions): void {
        if (this.serverGroup) {
            native.server.group.broadcast(this.serverGroup, message, options && options.binary || false);
        }
    }

    public startAutoPing(interval: number, appLevel?: boolean): void {
        setTimeout(() => {
            this.isAppLevelPing = appLevel;
            native.server.group.forEach(this.serverGroup, (ws: WebSocket) => {
                if (!ws.isAlive) return ws.terminate();
                ws.isAlive = false;
                // check logic if applevel is inside of this functioin
                return appLevel ? ws.send(APP_PING_CODE) : ws.ping();
            });
            this.startAutoPing(interval, appLevel);
        }, interval);
    }

    private start(configs: ServerConfigs, callback: Listener): void {
        if (!configs.port) return;
        this.httpServer.listen(configs.port, configs.host || null, (): void => {
            this.emit('listening');
            callback && callback();
        });
    }

    private configureServer(configs: ServerConfigs): void {
        this.httpServer = configs.server || HTTP.createServer((_: any, response: any) => response.end());
        this.httpServer.on('error', (err: Error) => this.emit('error', err));
        this.httpServer.on('newListener', (eventName: string, _: any) => eventName === 'upgrade' ? this.lastUpgradeListener = false : null);
        this.httpServer.on('upgrade', (req: any, socket: any): void => {
            if (configs.path && configs.path !== req.url.split('?')[0].split('#')[0]) {
                return this.lastUpgradeListener ? this.dropConnection(socket, 400, 'URL not supported') : null;
            }

            if (configs.verifyClient) {
                const info: any = {
                    req,
                    headers: req.headers,
                    secure: !!(req.connection.authorized || req.connection.encrypted)
                };

                return configs.verifyClient(info, (result: any, code: number, name: string) =>
                    result ? this.handleUpgrade(req, socket) : this.dropConnection(socket, code, name));
            }

            return this.handleUpgrade(req, socket);
        });
    }

    private configureNative(configs: ServerConfigs): void {
        let nativeOptions: number = 0;
        if (configs.perMessageDeflate) {
            // tslint:disable-next-line
            nativeOptions |= configs.perMessageDeflate.serverNoContextTakeover ? PERMESSAGE_DEFLATE : SLIDING_DEFLATE_WINDOW;
        }

        this.serverGroup = native.server.group.create(nativeOptions, configs.maxPayload || DEFAULT_PAYLOAD_LIMIT);

        native.server.group.onConnection(this.serverGroup, (external: any) => {
            const webSocket: WebSocket = new WebSocket(null, external, true);
            native.setUserData(external, webSocket);
            this.emit('connection', webSocket, this.upgradeReq);
            this.upgradeReq = null;
        });

        native.server.group.onMessage(this.serverGroup, (message: string | Buffer, webSocket: WebSocket): any => {
            if (this.isAppLevelPing && typeof message !== 'string') {
                message = Buffer.from(message);
                if (message[0] === APP_PONG_CODE && message.length === 1) {
                    return webSocket.emit('pong');
                }
            }

            webSocket.emit('message', message);
        });

        native.server.group.onDisconnection(this.serverGroup, (external: any, code: number, message: string, webSocket: WebSocket): any => {
            webSocket.external = null;
            process.nextTick((): void => {
                webSocket.emit('close', code, message);
                webSocket = null;
            });
            native.clearUserData(external);
        });

        native.server.group.onPing(
            this.serverGroup,
            (message: any, webSocket: WebSocket): void => webSocket.emit('ping', message)
        );

        native.server.group.onPong(
            this.serverGroup,
            (message: any, webSocket: WebSocket): void => webSocket.emit('pong', message)
        );
    }

    private dropConnection(socket: any, code: number, name: string): void {
        return socket.end(`HTTP/1.1 ${code} ${name}\r\n\r\n`);
    }

    private handleUpgrade(req: any, socket: any): void {
        const secKey: any = req.headers['sec-websocket-key'];
        const sslState: any = socket.ssl ? socket.ssl._external : null;
        const socketHandle: any = socket.ssl ? socket._parent._handle : socket._handle;

        if (socketHandle && secKey && secKey.length === 24) {
            socket.setNoDelay(this.noDelay);
            const ticket: any = native.transfer(socketHandle.fd === -1 ? socketHandle : socketHandle.fd, sslState);
            socket.on('close', (code: any, reason: any) => {
                if (!this.serverGroup) return;

                this.upgradeReq = req;

                native.upgrade(
                    this.serverGroup,
                    ticket,
                    secKey,
                    req.headers['sec-websocket-extensions'],
                    req.headers['sec-websocket-protocol']
                );
            });
        }
        socket.destroy();
    }
}