/// <reference types="node" />
import * as HTTP from 'http';
import { Socket } from 'net';
import { WebSocket } from './client';
import { ServerConfigs } from './index';
export declare class WebSocketServer {
    private options;
    upgradeCb: (ws: WebSocket) => void;
    upgradeReq: HTTP.IncomingMessage;
    registeredEvents: any;
    private httpServer;
    private serverGroup;
    private onUpgradeRequest;
    constructor(options: ServerConfigs, cb?: () => void);
    get clients(): {
        length: number;
        forEach: (cb: (ws: WebSocket) => void) => void;
    };
    on(event: 'error', listener: (err: Error) => void): void;
    on(event: 'connection', listener: (socket: WebSocket, req: HTTP.IncomingMessage) => void): void;
    on(event: 'connection', listener: (socket: WebSocket) => void): void;
    emit(event: string, ...args: any[]): void;
    broadcast(message: string | Buffer, options?: {
        binary: boolean;
    }): void;
    startAutoPing(interval: number, appLevel?: boolean): void;
    handleUpgrade(req: HTTP.IncomingMessage, socket: Socket, upgradeHead: any, cb: (ws: WebSocket) => void): void;
    close(cb?: () => void): void;
    private abortConnection;
    private upgradeConnection;
}
