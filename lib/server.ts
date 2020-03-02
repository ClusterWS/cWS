import * as HTTP from 'http';
import * as HTTPS from 'https';

import { Socket } from 'net';
import { WebSocket } from './client';
import { ServerConfigs } from './index';
import { native, noop, setupNative, APP_PING_CODE, PERMESSAGE_DEFLATE, SLIDING_DEFLATE_WINDOW, DEFAULT_PAYLOAD_LIMIT } from './shared';

export class WebSocketServer {
  public upgradeCb: (ws: WebSocket) => void;
  public upgradeReq: HTTP.IncomingMessage;
  public registeredEvents: any = {
    close: noop,
    error: noop,
    connection: noop,
  };

  private httpServer: HTTP.Server | HTTPS.Server;
  private serverGroup: any;
  private onUpgradeRequest: (req: HTTP.IncomingMessage, socket: Socket) => void;

  constructor(private options: ServerConfigs, cb: () => void = noop) {
    let nativeOptions: number = 0;
    if (this.options.perMessageDeflate) {
      // tslint:disable-next-line
      nativeOptions |= PERMESSAGE_DEFLATE;
      if ((this.options.perMessageDeflate as { serverNoContextTakeover: boolean }).serverNoContextTakeover === false) {
        // tslint:disable-next-line
        nativeOptions |= SLIDING_DEFLATE_WINDOW;
      }
    }

    this.serverGroup = native.server.group.create(nativeOptions, this.options.maxPayload || DEFAULT_PAYLOAD_LIMIT);
    setupNative(this.serverGroup, 'server', this);

    if (this.options.noServer) {
      return;
    }

    if (this.options.path && this.options.path[0] !== '/') {
      this.options.path = `/${this.options.path}`;
    }

    this.httpServer = this.options.server || HTTP.createServer((_: any, res: HTTP.ServerResponse): void => {
      const body: string = HTTP.STATUS_CODES[426];
      res.writeHead(426, {
        'Content-Length': body.length,
        'Content-Type': 'text/plain'
      });
      return res.end(body);
    });

    this.httpServer.on('upgrade', this.onUpgradeRequest = ((req: HTTP.IncomingMessage, socket: Socket): void => {
      socket.on('error', (): void => {
        // this is how `ws` handles socket error
        socket.destroy();
      });

      if (this.options.path && this.options.path !== req.url.split('?')[0].split('#')[0]) {
        return this.abortConnection(socket, 400, 'URL not supported');
      }

      if (this.options.verifyClient) {
        const info: any = {
          origin: req.headers.origin,
          secure: !!((req.connection as any).authorized || (req.connection as any).encrypted),
          req
        };

        this.options.verifyClient(info, (verified?: boolean, code?: number, message?: string): void => {
          if (!verified) {
            return this.abortConnection(socket, code || 401, message || 'Client verification failed');
          }

          this.upgradeConnection(req, socket);
        });
      } else {
        this.upgradeConnection(req, socket);
      }
    }));

    if (this.options.port && !this.options.server) {
      this.httpServer.on('error', (err: Error): void => {
        // listen on http server error only if server has been
        // created by cws, in case if server passed from the
        // user than user is responsible for listening for 'error' event
        // on passed http server
        this.registeredEvents['error'](err);
      });

      this.httpServer.listen(this.options.port, this.options.host, cb);
    }
  }

  get clients(): { length: number, forEach: (cb: (ws: WebSocket) => void) => void } {
    return {
      length: this.serverGroup ? native.server.group.getSize(this.serverGroup) : 0,
      forEach: (cb: (ws: WebSocket) => void): void => {
        if (this.serverGroup) {
          native.server.group.forEach(this.serverGroup, cb);
        }
      }
    };
  }

  public on(event: 'error', listener: (err: Error) => void): void;
  public on(event: 'connection', listener: (socket: WebSocket, req: HTTP.IncomingMessage) => void): void;
  public on(event: 'connection', listener: (socket: WebSocket) => void): void;
  public on(event: string, listener: (...args: any[]) => void): void {
    if (this.registeredEvents[event] === undefined) {
      console.warn(`cWS does not support '${event}' event`);
      return;
    }

    if (typeof listener !== 'function') {
      throw new Error(`Listener for '${event}' event must be a function`);
    }

    if (this.registeredEvents[event] !== noop) {
      console.warn(`cWS does not support multiple listeners for the same event. Old listener for '${event}' event will be overwritten`);
    }

    this.registeredEvents[event] = listener;
  }

  public emit(event: string, ...args: any[]): void {
    if (this.registeredEvents[event]) {
      this.registeredEvents[event](...args);
    }
  }

  public broadcast(message: string | Buffer, options?: { binary: boolean }): void {
    if (this.serverGroup) {
      native.server.group.broadcast(this.serverGroup, message, options && options.binary || false);
    }
  }

  public startAutoPing(interval: number, appLevel?: boolean): void {
    if (this.serverGroup) {
      native.server.group.startAutoPing(this.serverGroup, interval, appLevel ? APP_PING_CODE : null);
    }
  }

  public handleUpgrade(req: HTTP.IncomingMessage, socket: Socket, upgradeHead: any, cb: (ws: WebSocket) => void): void {
    // `ws` compatibility
    if (this.options.noServer) {
      this.upgradeConnection(req, socket, cb);
    }
  }

  public close(cb: () => void = noop): void {
    if (this.httpServer) {
      this.httpServer.removeListener('upgrade', this.onUpgradeRequest);

      if (!this.options.server) {
        this.httpServer.close();
      }
    }

    if (this.serverGroup) {
      native.server.group.close(this.serverGroup);
      this.serverGroup = null;
    }

    setTimeout((): void => {
      this.registeredEvents['close']();
      cb();
    }, 0);
  }

  private abortConnection(socket: Socket, code: number, message: string): void {
    return socket.end(`HTTP/1.1 ${code} ${message}\r\n\r\n`);
  }

  private upgradeConnection(req: HTTP.IncomingMessage, socket: Socket, cb?: (ws: WebSocket) => void): void {
    const secKey: any = req.headers['sec-websocket-key'];

    if ((socket as any)._isNative) {
      if (this.serverGroup) {
        this.upgradeCb = cb;
        this.upgradeReq = req;
        native.upgrade(this.serverGroup, (socket as any).external, secKey, req.headers['sec-websocket-extensions'], req.headers['sec-websocket-protocol']);
      }
    } else {
      const socketAsAny: any = socket as any;
      const socketHandle: any = socketAsAny.ssl ? socketAsAny._parent._handle : socketAsAny._handle;

      if (socketHandle && secKey && secKey.length === 24) {
        const sslState: any = socketAsAny.ssl ? native.getSSLContext(socketAsAny.ssl) : null;

        socket.setNoDelay(this.options.noDelay === false ? false : true);
        const ticket: any = native.transfer(socketHandle.fd === -1 ? socketHandle : socketHandle.fd, sslState);
        socket.on('close', (): void => {
          if (this.serverGroup) {
            this.upgradeCb = cb;
            this.upgradeReq = req;
            native.upgrade(this.serverGroup, ticket, secKey, req.headers['sec-websocket-extensions'], req.headers['sec-websocket-protocol']);
          }
        });

        socket.destroy();
      } else {
        return this.abortConnection(socket, 400, 'Bad Request');
      }
    }
  }
}