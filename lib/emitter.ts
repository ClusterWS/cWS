import { Listener } from './types';

class EventEmitter {
  private events: { [key: string]: Listener } = {};

  public on(event: string, listener: Listener): void {
    if (typeof listener !== 'function')
      return console.log('Listener should be a function');
    this.events[event] = listener;
  }

  public emit(event: string, ...args: any[]): void {
    const listener: Listener = this.events[event];
    listener && listener(...args);
  }

  public removeEvents(): void {
    this.events = {};
  }
}

export function getEmitter(): any {
  if (!global || !(global as any).cws || !(global as any).cws.EventEmitter) {
    return EventEmitter;
  }

  return (global as any).cws.EventEmitter;
}