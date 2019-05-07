import * as HTTP from 'http';
import * as HTTPS from 'https';

import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { WebSocket } from './client';
import { eventEmitter } from '../emitter';
import { Listener, ServerConfigs, BroadcastOptions, ConnectionInfo } from '../types';
import { native, noop, APP_PING_CODE, PERMESSAGE_DEFLATE, SLIDING_DEFLATE_WINDOW, DEFAULT_PAYLOAD_LIMIT } from './shared';

native.setNoop(noop);

// get event emitter instance
export const EventEmitterServer: any = eventEmitter();

export class WebSocketServer extends EventEmitterServer {
  private noDelay: boolean;
  private httpServer: HTTP.Server | HTTPS.Server;
  private upgradeReq: HTTP.IncomingMessage;
  private serverGroup: any;
  private upgradeListener: Listener;
  private serverIsProvided: boolean = false;
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

  // overload on function from super class
  public on(event: string, listener: Listener): void;
  public on(event: 'error', listener: (err: Error, socket?: Socket) => void): void;
  public on(event: 'connection', listener: (socket: WebSocket) => void): void;
  public on(event: string, listener: Listener): void {
    super.on(event, listener);
  }

  public broadcast(message: string | Buffer, options?: BroadcastOptions): void {
    if (this.serverGroup) {
      native.server.group.broadcast(this.serverGroup, message, options && options.binary || false);
    }
  }

  public startAutoPing(interval: number, appLevel?: boolean): void {
    if (this.serverGroup) {
      native.server.group.startAutoPing(this.serverGroup, interval, appLevel ? APP_PING_CODE : null);
    }
  }

  public close(callback?: Listener): void {
    if (this.upgradeListener && this.httpServer) {
      this.httpServer.removeListener('upgrade', this.upgradeListener);
      if (!this.serverIsProvided) {
        this.httpServer.close();
      }
    }

    if (this.serverGroup) {
      native.server.group.close(this.serverGroup);
      this.serverGroup = null;
    }

    callback && callback();
  }

  private start(configs: ServerConfigs, callback: Listener): void {
    if (!configs.port) return;
    this.httpServer.listen(configs.port, configs.host || null, (): void => {
      this.emit('listening');
      callback && callback();
    });
  }

  private configureServer(configs: ServerConfigs): void {
    this.serverIsProvided = !!configs.server;
    this.httpServer = configs.server || HTTP.createServer((_: any, response: HTTP.ServerResponse) => response.end());
    this.upgradeListener = (req: HTTP.IncomingMessage, socket: Socket): void => {
      socket.on('error', (err: Error) => this.emit('error', err, socket));
      // emit tlsError to the standard error event
      socket.on('_tlsError', (err: Error) => this.emit('error', err, socket));

      if (configs.path && configs.path !== req.url.split('?')[0].split('#')[0]) {
        return this.lastUpgradeListener ? this.dropConnection(socket, 400, 'URL not supported') : null;
      }

      if (configs.verifyClient) {
        const info: ConnectionInfo = {
          req,
          origin: (req.headers[`${+req.headers['sec-websocket-version'] === 8 ? 'sec-websocket-origin' : 'origin'}`] as string),
          secure: !!(req.connection instanceof TLSSocket && (req.connection.authorized || req.connection.encrypted))
        };

        return configs.verifyClient(info, (result: any, code: number, name: string) =>
          result ? this.handleUpgrade(req, socket) : this.dropConnection(socket, code, name));
      }

      return this.handleUpgrade(req, socket);
    };

    this.httpServer.on('error', (err: Error) => this.emit('error', err));
    this.httpServer.on('upgrade', this.upgradeListener);
    this.httpServer.on('newListener', (eventName: string, _: any) => eventName === 'upgrade' ? this.lastUpgradeListener = false : null);
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
      webSocket.emit('message', message);
    });

    native.server.group.onDisconnection(this.serverGroup, (external: any, code: number, message: string, webSocket: WebSocket): any => {
      webSocket.external = null;
      process.nextTick((): void => {
        if (!code) {
          // if no code provided it is 100% error in parsing or in code
          webSocket.emit('error', {
            message: 'cWs invalid status code or invalid UTF-8 sequence',
            stack: 'cWs invalid status code or invalid UTF-8 sequence'
          });
          webSocket.emit('close', 1006, '');
          return webSocket = null;
        }
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

  private dropConnection(socket: Socket, code: number, name: string): void {
    return socket.end(`HTTP/1.1 ${code} ${name}\r\n\r\n`);
  }

  private handleUpgrade(req: HTTP.IncomingMessage, socket: Socket): void {
    const secKey: any = req.headers['sec-websocket-key'];
    // Cast socket as <any> so can get access to private properties to calculate a cws ticket.
    const socketAsAny: any = socket as any;
    const sslState: any = socketAsAny.ssl ? native.getSSLContext(socketAsAny.ssl) : null;
    const socketHandle: any = socketAsAny.ssl ? socketAsAny._parent._handle : socketAsAny._handle;

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
