// tslint:disable-next-line
export const native: any = require(`./uws_${process.platform}_${process.versions.modules}`);

export const OPCODE_TEXT: number = 1;
export const OPCODE_PING: number = 9;
export const OPCODE_BINARY: number = 2;

export const APP_PING_CODE: Buffer = Buffer.from('9');
export const PERMESSAGE_DEFLATE: number = 1;
export const SLIDING_DEFLATE_WINDOW: number = 16;
export const DEFAULT_PAYLOAD_LIMIT: number = 16777216;

// tslint:disable-next-line
export const noop: any = (): void => { };

// this is how pong code looks like (just for reference as all logic is handled in c++)
// export const APP_PONG_CODE: number = Buffer.from('A')[0];
// export const OPCODE_PONG: number = 10;