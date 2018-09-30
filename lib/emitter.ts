import { Listener } from './types';
import { WebSocket } from './uws/client';

export class EventEmitter {
  private events: { [key: string]: Listener } = {};

  // need to clarify this types
  public on(event: 'open', listener: () => void): void;
  public on(event: 'error', listener: (err: Error) => void): void;
  public on(event: 'message', listener: (message: string | any[]) => void): void;
  public on(event: 'connection', listener: (socket: WebSocket) => void): void;
  public on(event: 'disconnect', listener: (code?: number, reason?: string) => void): void;
  public on(event: string, listener: Listener): void {
    if ({}.toString.call(listener) !== '[object Function]')
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