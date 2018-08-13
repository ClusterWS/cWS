export class EventEmitter {
    private events: any = {};

    public on(event: string, listener: any): void {
        if ({}.toString.call(listener) !== '[object Function]')
            return console.log('Listener should be a function');
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