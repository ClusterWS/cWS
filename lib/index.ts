import { WebSocket } from './client';
import { WebSocketServer } from './server';

import * as HTTP from 'http';
import * as HTTPS from 'https';

export type SocketAddress = {
  remotePort?: number,
  remoteAddress?: string,
  remoteFamily?: string
};

export type ConnectionInfo = {
  req: HTTP.IncomingMessage,
  origin: string,
  secure: boolean
};

export type VerifyClientNext = (clientVerified: boolean, code?: number, name?: string) => void;

export type ServerConfigs = {
  path?: string,
  port?: number,
  host?: string,
  server?: HTTP.Server | HTTPS.Server,
  noDelay?: boolean,
  maxPayload?: number,
  perMessageDeflate?: { serverNoContextTakeover: boolean }
  verifyClient?: (info: ConnectionInfo, next: VerifyClientNext) => void
};

export { WebSocket, WebSocketServer };
// put all types in here...
