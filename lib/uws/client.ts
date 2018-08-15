import { EventEmitter } from '../emitter';
import { SendOptions, Listener, SocketAddress } from '../types';
import { native, noop, DEFAULT_PAYLOAD_LIMIT, OPCODE_PING, OPCODE_BINARY, OPCODE_TEXT } from './shared';

native.setNoop(noop);

const clientGroup: any = native.client.group.create(0, DEFAULT_PAYLOAD_LIMIT);

native.client.group.onConnection(clientGroup, (newExternal: any): void => {
    const webSocket: any = native.getUserData(newExternal);
    webSocket.external = newExternal;
    webSocket.emit('open');
});

native.client.group.onMessage(clientGroup, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.emit('message', message);
});

native.client.group.onPing(clientGroup, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.emit('ping', message);
});

native.client.group.onPong(clientGroup, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.emit('pong', message);
});

native.client.group.onError(clientGroup, (webSocket: WebSocket): void => {
    process.nextTick((): void => {
        webSocket.emit('error', {
            message: 'uWs client connection error',
            stack: 'uWs client connection error'
        });
    });
});

native.client.group.onDisconnection(clientGroup, (newExternal: any, code: number, message: any, webSocket: WebSocket): void => {
    webSocket.external = null;
    process.nextTick((): void => {
        webSocket.emit('close', code, message);
        webSocket = null;
    });
    native.clearUserData(newExternal);
});

export class WebSocket extends EventEmitter {
    public OPEN: number = 1;
    public CLOSED: number = 0;

    public isAlive: boolean = true;
    public external: any = noop;
    public executeOn: string;

    constructor(url: string, external: any, isServer?: boolean) {
        super();
        this.on('pong', (): boolean => this.isAlive = true);
        this.external = external;
        this.executeOn = isServer ? 'server' : 'client';

        if (!isServer) {
            native.connect(clientGroup, url, this);
        }
    }

    public get _socket(): SocketAddress {
        const address: any[] = this.external ? native.getAddress(this.external) : new Array(3);
        return {
            remotePort: address[0],
            remoteAddress: address[1],
            remoteFamily: address[2]
        };
    }

    public get readyState(): number {
        return this.external ? this.OPEN : this.CLOSED;
    }

    public ping(message?: string | Buffer): void {
        if (!this.external) return;
        native[this.executeOn].send(this.external, message, OPCODE_PING);
    }

    public send(message: string | Buffer, options?: SendOptions, cb?: Listener): void {
        if (!this.external) return cb && cb(new Error('Not opened'));
        const opCode: number = (options && options.binary) || typeof message !== 'string' ? OPCODE_BINARY : OPCODE_TEXT;
        native[this.executeOn].send(this.external, message, opCode, cb ? (): void => process.nextTick(cb) : null, options && options.compress);
    }

    public terminate(): void {
        if (!this.external) return;
        native[this.executeOn].terminate(this.external);
        this.external = null;
    }

    public close(code: number, reason: string): void {
        if (!this.external) return;
        native[this.executeOn].close(this.external, code, reason);
        this.external = null;
    }
}