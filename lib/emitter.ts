import { isFunction } from './utils';

export class EventEmitter {
    private events: any = {};

    public on(event: string, listener: any): void {
        if (!isFunction(listener)) return console.log('Listener should be a function');
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