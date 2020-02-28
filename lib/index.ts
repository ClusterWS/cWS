import * as HTTP from 'http';
import * as HTTPS from 'https';

export type VerifyClientNext = (verified: boolean, code?: number, message?: string) => void;

export type SocketAddress = {
  remotePort?: number,
  remoteAddress?: string,
  remoteFamily?: string
};

export type ConnectionInfo = {
  req: HTTP.IncomingMessage,
  secure: boolean
  origin?: string,
};

export type ServerConfigs = {
  path?: string,
  port?: number,
  host?: string,
  server?: HTTP.Server | HTTPS.Server,
  noDelay?: boolean,
  noServer?: boolean,
  maxPayload?: number,
  perMessageDeflate?: boolean | { serverNoContextTakeover: boolean },
  verifyClient?: (info: ConnectionInfo, next: VerifyClientNext) => void
};

export { WebSocket } from './client';
export { WebSocketServer } from './server';

export const secureProtocol: string = 'TLSv1_2_method';