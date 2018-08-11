// import { Socket } from '../socket/socket';
// import { logError, isFunction } from '../../utils/functions';
// import { Listener, CustomObject, Message } from '../../utils/types';

export class EventEmitter {
    private events: any = {};

    public on(event: string, listener: any): void {
        // if (!isFunction(listener)) return logError('Listener must be a function');
        this.events[event] = listener;
    }

    public emit(event: string, ...args: any[]): void {
        const listener: any = this.events[event];
        listener && listener(...args);
    }

    public removeEvents(): void {
        this.events = {};
    }
}