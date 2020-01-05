/// <reference types="node" />
import { WebSocketServer } from './server';
import { SocketAddress, ServerConfigs } from './index';
export declare class WebSocket {
    url: string;
    private options;
    static OPEN: number;
    static CLOSED: number;
    static Server: new (options: ServerConfigs, cb?: () => void) => WebSocketServer;
    OPEN: number;
    CLOSED: number;
    registeredEvents: any;
    private external;
    private socketType;
    constructor(url: string, options?: any);
    get _socket(): SocketAddress;
    get readyState(): number;
    set onopen(listener: () => void);
    set onclose(listener: (code?: number, reason?: string) => void);
    set onerror(listener: (err: Error) => void);
    set onmessage(listener: (message: string | any) => void);
    on(event: 'open', listener: () => void): void;
    on(event: 'ping', listener: () => void): void;
    on(event: 'pong', listener: () => void): void;
    on(event: 'error', listener: (err: Error) => void): void;
    on(event: 'message', listener: (message: string | any) => void): void;
    on(event: 'close', listener: (code?: number, reason?: string) => void): void;
    send(message: string | Buffer, options?: {
        binary?: boolean;
        compress?: boolean;
    }, cb?: (err?: Error) => void): void;
    ping(message?: string | Buffer): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
}
