import { WebSocket } from './client';
import { WebSocketServer } from './server';

export const noop: () => void = (): void => { /** ignore */ };

export const OPCODE_TEXT: number = 1;
export const OPCODE_PING: number = 9;
export const OPCODE_BINARY: number = 2;

export const APP_PING_CODE: Buffer = Buffer.from('9');
export const PERMESSAGE_DEFLATE: number = 1;
export const SLIDING_DEFLATE_WINDOW: number = 16;
export const DEFAULT_PAYLOAD_LIMIT: number = 16777216;

export const native: any = ((): NodeRequire => {
  try {
    const [major, minor]: string[] = process.version.replace('v', '').split('.');

    if (Number(major) === 13 && Number(minor) < 9) {
      // temporary fix for node 13.8 and lower
      return require(`../dist/bindings/cws_${process.platform}_${process.versions.modules}_8`);
    }

    return require(`../dist/bindings/cws_${process.platform}_${process.versions.modules}`);
  } catch (err) {
    err.message = err.message + ` check './node_modules/@clusterws/cws/build_log.txt' for post install build logs`;
    throw err;
  }
})();

export function setupNative(group: any, type: string, wsServer?: WebSocketServer): void {
  native.setNoop(noop);

  native[type].group.onConnection(group, (external: any): void => {
    if (type === 'server' && wsServer) {
      const socket: WebSocket = new WebSocket(null, { external });
      native.setUserData(external, socket);

      if (wsServer.upgradeCb) {
        wsServer.upgradeCb(socket);
      } else {
        wsServer.registeredEvents['connection'](socket, wsServer.upgradeReq);
      }

      wsServer.upgradeCb = null;
      wsServer.upgradeReq = null;
      return;
    }

    const webSocket: WebSocket = native.getUserData(external);
    (webSocket as any).external = external;
    webSocket.registeredEvents['open']();
  });

  native[type].group.onPing(group, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.registeredEvents['ping'](message);
  });

  native[type].group.onPong(group, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.registeredEvents['pong'](message);
  });

  native[type].group.onMessage(group, (message: string | Buffer, webSocket: WebSocket): void => {
    webSocket.registeredEvents['message'](message);
  });

  native[type].group.onDisconnection(group, (newExternal: any, code: number, message: any, webSocket: WebSocket): void => {
    (webSocket as any).external = null;

    process.nextTick((): void => {
      if (!code) {
        // if no code provided it is 100% error in parsing or in code
        webSocket.registeredEvents['error']({
          message: 'cWs invalid status code or invalid UTF-8 sequence',
          stack: 'cWs invalid status code or invalid UTF-8 sequence'
        });
      }

      webSocket.registeredEvents['close'](code || 1006, message || '');
    });

    native.clearUserData(newExternal);
  });

  if (type === 'client') {
    native[type].group.onError(group, (webSocket: WebSocket): void => {
      process.nextTick((): void => {
        webSocket.registeredEvents['error']({
          message: 'cWs client connection error',
          stack: 'cWs client connection error'
        });
      });
    });
  }
}
