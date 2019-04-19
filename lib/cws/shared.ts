// tslint:disable-next-line
export const native: any = (() => {
    try {
        return require(`./cws_${process.platform}_${process.versions.modules}`);
    } catch (err) {
        throw err;
    }
})();

export const OPCODE_TEXT: number = 1;
export const OPCODE_PING: number = 9;
export const OPCODE_BINARY: number = 2;

export const APP_PING_CODE: Buffer = Buffer.from('9');
export const PERMESSAGE_DEFLATE: number = 1;
export const SLIDING_DEFLATE_WINDOW: number = 16;
export const DEFAULT_PAYLOAD_LIMIT: number = 16777216;

// tslint:disable-next-line
export const noop: any = (): void => { };