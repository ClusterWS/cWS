/// <reference types="node" />
import * as HTTP from 'http';
import { WebSocket } from './client';
import { ServerConfigs } from './index';
export declare class WebSocketServer {
    private options;
    upgradeReq: HTTP.IncomingMessage;
    onConnectionListener: (ws: WebSocket, req: HTTP.IncomingMessage) => void;
    private httpServer;
    private serverGroup;
    constructor(options: ServerConfigs, cb?: () => void);
    get clients(): {
        length: number;
        forEach: (cb: (ws: WebSocket) => void) => void;
    };
    on(event: 'connection', listener: (socket: WebSocket, upgradeRequest: HTTP.IncomingMessage) => void): void;
    on(event: 'connection', listener: (socket: WebSocket) => void): void;
    broadcast(message: string | Buffer, options?: {
        binary: boolean;
    }): void;
    startAutoPing(interval: number, appLevel?: boolean): void;
    close(cb?: () => void): void;
    private abortConnection;
    private upgradeConnection;
}
