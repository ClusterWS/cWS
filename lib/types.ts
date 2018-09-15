import * as HTTP from 'http';

export type Listener = (...args: any[]) => void;

export type SocketAddress = {
  remotePort: number | string | null,
  remoteAddress: string | null,
  remoteFamily: string | null
};

export type ConnectionInfo = {
  req: HTTP.IncomingMessage,
  headers: HTTP.IncomingHttpHeaders,
  secure: boolean
};

export type BroadcastOptions = {
  binary?: boolean
};

export type ServerConfigs = {
  path?: string,
  port?: number,
  host?: string,
  server?: HTTP.Server,
  noDelay?: boolean,
  maxPayload?: number,
  perMessageDeflate?: { serverNoContextTakeover: boolean }
  verifyClient?: (info: ConnectionInfo, next: Listener) => void
};

export type SendOptions = {
  binary?: boolean,
  compress?: boolean
};