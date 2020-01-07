import { expect } from 'chai';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from '../dist';

describe('Server & Client', () => {
  beforeEach((done: any) => {
    this.wsServer = new WebSocket.Server({ port: 3000 }, (): void => {
      done();
    });
  });

  it('Should accept connection correctly', (done: any) => {
    this.wsServer.on('connection', () => {
      done();
      this.wsServer.close();
    });

    new WebSocket('ws://localhost:3000');
  });

  it('Should receive messages', (done: any) => {
    const message: string = 'hello world message test';
    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.on('message', (receivedMessage: any) => {
        expect(message).to.be.eql(receivedMessage);
        this.wsServer.close();
        done();
      });
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('open', () => {
      socket.send(message);
    });
  });

  it('Should send message', (done: any) => {
    const message: string = 'hello world message test';
    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.send(message);
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');

    socket.on('message', (receivedMessage: any) => {
      expect(message).to.be.eql(receivedMessage);
      this.wsServer.close();
      done();
    });
  });

  it('Should trigger disconnect with correct close code and reason', (done: any) => {
    const code: number = 3455;
    const reason: string = 'Some strange reason';

    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.on('close', (rCode: number, rReason: string) => {
        expect(code).to.be.eql(rCode);
        expect(reason).to.be.eql(rReason);
        this.wsServer.close();
        done();
      });
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('open', () => {
      socket.close(code, reason);
    });
  });

  it('Should trigger disconnect with default code', (done: any) => {
    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.on('close', (rCode: number, rReason: string) => {
        expect(rCode).to.be.eql(1000);
        expect(rReason).to.be.eql('');
        this.wsServer.close();
        done();
      });
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('open', () => {
      socket.close();
    });
  });

  it('Should close connection from server side with default code', (done: any) => {
    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.close();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('close', (rCode: number, rReason: string) => {
      expect(rCode).to.be.eql(1000);
      expect(rReason).to.be.eql('');
      this.wsServer.close();
      done();
    });
  });

  it('Should close connection from server side with provided code and reason', (done: any) => {
    const code: number = 3455;
    const reason: string = 'Some strange reason';

    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.close(code, reason);
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('close', (rCode: number, rReason: string) => {
      expect(code).to.be.eql(rCode);
      expect(reason).to.be.eql(rReason);
      this.wsServer.close();
      done();
    });
  });

  it('Should send ping to client and receive pong', (done: any) => {
    let clientGotPing: boolean = false;

    this.wsServer.on('connection', (connection: WebSocket) => {
      connection.on('pong', () => {
        if (clientGotPing) {
          this.wsServer.close();
          done();
        }
      });

      connection.ping();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    socket.on('ping', () => {
      clientGotPing = true;
    });
  });

  it('_socket should exist', (done: any) => {
    this.wsServer.on('connection', (connection: WebSocket) => {
      expect(connection._socket).to.exist;
      this.wsServer.close();
      done();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
  });

  it('Broadcast to all connected users', (done: any) => {
    let connected: number = 0;
    let firstReceived: boolean = false;
    const messageToSend: string = 'Super cool message';

    this.wsServer.on('connection', (connection: WebSocket) => {
      connected++;
      if (connected > 1) {
        expect(this.wsServer.clients.length).to.be.eql(2);
        this.wsServer.broadcast(messageToSend);
      }
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
    const socket2: WebSocket = new WebSocket('ws://localhost:3000');

    socket.on('message', (message: any) => {
      if (!firstReceived) {
        firstReceived = true;
      } else {
        expect(message).to.be.eql(messageToSend);
        done();
        this.wsServer.close();
      }
    });

    socket2.on('message', (message: any) => {
      if (!firstReceived) {
        firstReceived = true;
      } else {
        expect(message).to.be.eql(messageToSend);
        done();
        this.wsServer.close();
      }
    });
  });

  it('Should properly handle noServer with handleUpgrade', (done: any) => {
    this.wsServer.close();

    const internalWsServer: WebSocketServer = new WebSocket.Server({ noServer: true });

    const server: any = createServer((req: any) => { /** ignore */ });
    server.on('upgrade', (request: any, socket: any, head: any) => {
      internalWsServer.handleUpgrade(request, socket, head, (ws: any) => {
        internalWsServer.emit('connection', ws, request);
      });
    });

    internalWsServer.on('connection', (connection: WebSocket) => {
      internalWsServer.close();
      server.close();
      done();
    });

    server.listen(3000, () => {
      const socket1: WebSocket = new WebSocket('ws://localhost:3000');
    });
  });

  it('Correctly validate listener', (done: any) => {
    expect(() => {
      this.wsServer.on('connection', (connection: WebSocket) => { /** */ });
      this.wsServer.on('connection', (connection: WebSocket) => { /** */ });
    }).to.throw(`Can not set 'connection' event listener twice`);

    expect(() => {
      this.wsServer.on('connection', '');
    }).to.throw(`Could not set listener for 'connection' event, listener must be a function`);

    expect(() => {
      this.wsServer.close();
      this.wsServer = new WebSocket.Server({ port: 3000 });
      this.wsServer.on('connection', (connection: WebSocket) => { /** */ });
      this.wsServer.close();
      this.wsServer = new WebSocket.Server({ port: 3000 });
      this.wsServer.on('connection', async (connection: WebSocket) => { /** */ });
    }).to.not.throw();

    expect(() => {
      const socket: any = new WebSocket('ws://localhost:3000');
      socket.on('open', '');
    }).to.throw(`Could not set listener for 'open' event, listener must be a function`);

    expect(() => {
      const socket: any = new WebSocket('ws://localhost:3000');
      socket.on('open', () => { /** */ });
      socket.on('open', () => { /** */ });
    }).to.throw(`Can not set 'open' event listener twice`);

    expect(() => {
      let socket: any = new WebSocket('ws://localhost:3000');
      socket.on('open', () => { /** */ });
      socket = new WebSocket('ws://localhost:3000');
      socket.on('open', async () => { /** */ });
    }).to.not.throw();

    this.wsServer.close();
    done();
  });

  it('Connect socket to provided `path`', (done: any) => {
    this.wsServer.close();
    this.wsServer = new WebSocket.Server({ port: 3000, path: '/socket/specific/path' });

    this.wsServer.on('connection', (connection: WebSocket) => {
      expect(connection._socket).to.exist;
      this.wsServer.close();
      done();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000/socket/specific/path');
  });

  it('`verifyClient` allow to pass', (done: any) => {
    this.wsServer.close();
    this.wsServer = new WebSocket.Server({
      port: 3000, verifyClient: (info: any, next: any): void => {
        expect(info.req).to.exist;
        expect(info.secure).to.exist;

        next(true);
      }
    });

    this.wsServer.on('connection', (connection: WebSocket) => {
      expect(connection._socket).to.exist;
      this.wsServer.close();
      done();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
  });

  it('`verifyClient` deny pass', (done: any) => {
    this.wsServer.close();
    this.wsServer = new WebSocket.Server({
      port: 3000, verifyClient: (info: any, next: any): void => {
        expect(info.req).to.exist;
        expect(info.secure).to.exist;

        next(false);

        setTimeout(() => {
          this.wsServer.close();
          done();
        }, 50);
      }
    });

    this.wsServer.on('connection', (connection: WebSocket) => {
      done('Should never be called');
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
  });

  it('Should trigger on `close` event at the server', (done: any) => {
    this.wsServer.on('connection', (connection: WebSocket) => { });
    this.wsServer.on('close', () => {
      done();
    });
    this.wsServer.close();
  });
});
