import { Listener } from './types';

export class EventEmitter {
  private events: { [key: string]: Listener } = {};

  public on(event: string, listener: Listener): void {
    const s: string = {}.toString.call(listener);
    if (s !== '[object Function]' && s !== '[object AsyncFunction]')
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