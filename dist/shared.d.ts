/// <reference types="node" />
import { WebSocketServer } from './server';
export declare const noop: () => void;
export declare const OPCODE_TEXT: number;
export declare const OPCODE_PING: number;
export declare const OPCODE_BINARY: number;
export declare const APP_PING_CODE: Buffer;
export declare const PERMESSAGE_DEFLATE: number;
export declare const SLIDING_DEFLATE_WINDOW: number;
export declare const DEFAULT_PAYLOAD_LIMIT: number;
export declare const native: any;
export declare function setupNative(group: any, type: string, wsServer?: WebSocketServer): void;
