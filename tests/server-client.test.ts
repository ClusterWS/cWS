import { expect } from 'chai';
import { WebSocketServer, WebSocket } from '../dist';

describe('Start server and receive messages', () => {
  beforeEach((done: any) => {
    this.wsServer = new WebSocketServer({ port: 3000 }, (): void => {
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
    let clientGotPing = false;

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

  it('remoteAddress should exists', (done: any) => {
    this.wsServer.on('connection', (connection: WebSocket) => {
      expect(connection.remoteAddress).to.exist;

      this.wsServer.close();
      done();
    });

    const socket: WebSocket = new WebSocket('ws://localhost:3000');
  });
});
