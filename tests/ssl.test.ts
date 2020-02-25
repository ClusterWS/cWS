import { expect } from 'chai';
import { readFileSync } from 'fs';
import { createServer } from 'https';
import { WebSocket, WebSocketServer, secureProtocol } from '../dist';

describe('SSL Server & Client', (): void => {
  it('Should accept connection correctly and send/receive message', (done: any): void => {
    const sendMessage: string = 'Hello world';
    const options: any = {
      key: readFileSync('./tests/serts/key.pem'),
      cert: readFileSync('./tests/serts/certificate.pem'),
      secureProtocol
    };

    const server: any = createServer(options);

    this.wsServer = new WebSocket.Server({ server });
    this.wsServer.on('connection', (ws: any): void => {
      let received: boolean = false;
      ws.on('message', (msg: string): void => {
        received = true;
        expect(msg).to.be.eql(sendMessage);
        ws.send(msg);
      });

      ws.on('close', (): void => {
        this.wsServer.close();

        if (!received) {
          done('Should have received message but did not');
        } else {
          done();
        }
      });
    });

    server.listen(3000, (): void => {
      const socket: any = new WebSocket('wss://localhost:3000');
      socket.on('open', (): void => {
        socket.send(sendMessage);
      });

      socket.on('message', (msg: string): void => {
        expect(msg).to.be.eql(sendMessage);
        socket.close();
      });

      socket.on('error', (err: Error): void => {
        console.log('Received error', err);
      });
    });
  });
});
