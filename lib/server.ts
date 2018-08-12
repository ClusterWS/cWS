/* tslint:disable */

import * as HTTP from 'http';
import { WebSocket } from './client';
import { EventEmitter } from './emitter';

const native: any = require(`./uws_${process.platform}_${process.versions.modules}`);

const APP_PONG_CODE: number = 65;
const APP_PING_CODE: any = Buffer.from('9');
const PERMESSAGE_DEFLATE: number = 1;
const DEFAULT_PAYLOAD_LIMIT: number = 16777216;

const noop: any = (): void => { };

native.setNoop(noop);

export class WebSocketServer extends EventEmitter {
    private noDelay: boolean;
    private httpServer: any;
    private upgradeReq: any;
    private serverGroup: any;
    private isAppLevelPing: boolean = false;

    constructor(configs: any, callback: any) {
        super();
        this.noDelay = !!configs.noDelay;
        this.configureNative(configs);
        this.configureServer(configs);
        this.start(configs, callback);
    }

    private start(configs: any, callback: any) {
        if (!configs.port) return;
        this.httpServer.listen(configs.port, configs.host || null, (): void => {
            this.emit('listening');
            callback && callback();
        });
    }

    private emitConnection(ws: any) {
        this.emit('connection', ws, this.upgradeReq);
    }

    private configureServer(configs: any) {
        // need to add path spcifications;
        this.httpServer = configs.server || HTTP.createServer((_: any, response: any) => response.end());
        this.httpServer.on('error', (err: Error) => this.emit('error', err));
        this.httpServer.on('upgrade', (req: any, socket: any) => {
            if (configs.verifyClient) {
                const info: any = {
                    origin: req.headers.origin,
                    secure: !!(req.connection.authorized || req.connection.encrypted),
                    req: req
                };

                return configs.verifyClient(info, (result: any, code: number, name: string) =>
                    result ? this.handleUpgrade(req, socket) : this.dropConnection(socket, code, name))
            }

            return this.handleUpgrade(req, socket);
        })
    }

    private configureNative(configs: any) {
        this.serverGroup = native.server.group.create(
            configs.perMessageDeflate ? PERMESSAGE_DEFLATE : 0,
            configs.maxPayload || DEFAULT_PAYLOAD_LIMIT
        );

        native.server.group.onConnection(this.serverGroup, (external: any) => {
            const webSocket: WebSocket = new WebSocket(null, external, true);
            native.setUserData(external, webSocket);
            this.emitConnection(webSocket);
            this.upgradeReq = null;
        });

        native.server.group.onMessage(this.serverGroup, (message: any, webSocket: WebSocket): any => {
            if (this.isAppLevelPing && typeof message !== 'string') {
                message = Buffer.from(message);
                if (message === APP_PONG_CODE && message.length === 1) {
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
        })

        native.server.group.onPing(
            this.serverGroup,
            (message: any, webSocket: WebSocket): void => webSocket.emit('ping', message)
        );

        native.server.group.onPong(
            this.serverGroup,
            (message: any, webSocket: WebSocket): void => webSocket.emit('pong', message)
        );
    }

    private dropConnection(socket: any, code: number, name: string) {
        return socket.end(`HTTP/1.1 ${code} ${name}\r\n\r\n`);
    }

    private handleUpgrade(req: any, socket: any) {
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
            })
        }
        socket.destroy();
    }

    public startAutoPing(interval: string, appLevel?: boolean) {
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
}