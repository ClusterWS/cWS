import { expect } from 'chai';
import { connect } from 'net';
import { readFileSync } from 'fs';
import { createServer, Server } from 'http';
import { createServer as createServerHttps, Server as HttpsServer } from 'https';

import { WebSocket, WebSocketServer, secureProtocol } from '../dist';

const serverPort: number = 3000;
const secureServerPort: number = 3001;

async function createWSServer(ssl: boolean, server?: Server | HttpsServer): Promise<WebSocketServer> {
  return new Promise((res: any): void => {
    if (server) {
      return res(new WebSocket.Server({ server }));
    }

    if (ssl) {
      const httpsServer: HttpsServer = createServerHttps({
        key: readFileSync('./tests/certs/key.pem'),
        cert: readFileSync('./tests/certs/certificate.pem'),
        secureProtocol
      });

      const wsServer: WebSocketServer = new WebSocket.Server({ server: httpsServer });

      // NOTE: small workaround to stop external server (for smoother testing)
      // as server provided from outside it should be closed from outside too
      // but to make our testing simple we just overwrite close function on cws
      // to also close this secure server
      (wsServer as any)._close_ = wsServer.close.bind(wsServer);
      wsServer.close = (cb: any): void => {
        httpsServer.close();
        (wsServer as any)._close_(cb);
      };

      httpsServer.listen(secureServerPort, (): void => {
        res(wsServer);
      });
    } else {
      const wsServer: WebSocketServer = new WebSocket.Server({ port: serverPort }, (): void => res(wsServer));
    }
  });
}

['SSL', 'Non-SSL'].forEach((type: string): void => {
  const isSSL: boolean = type === 'SSL';
  const connectionUrl: string = isSSL ? `wss://localhost:${secureServerPort}` : `ws://localhost:${serverPort}`;

  describe(`CWS Server & Client Tests ` + type, (): void => {
    it('Should accept connection', (done: () => void): void => {
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          wsServer.on('connection', (): void => {
            wsServer.close((): void => {
              done();
            });
          });

          new WebSocket(connectionUrl);
        });
    });

    it('Should receive and send message', (done: () => void): void => {
      const testMessage: string = `Hello world from cWS ` + Math.random();

      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          wsServer.on('connection', (socket: WebSocket): void => {
            socket.on('message', (msg: string): void => {
              expect(msg).to.be.eql(testMessage);
              socket.send(msg);
            });
          });

          const connection: WebSocket = new WebSocket(connectionUrl);

          connection.on('open', (): void => {
            connection.send(testMessage);
          });

          connection.on('message', (msg: string): void => {
            expect(msg).to.be.eql(testMessage);

            wsServer.close((): void => {
              done();
            });
          });
        });
    });

    it('Should receive and send ping/pong', (done: () => void): void => {
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          let clientReceivedPing: boolean = false;

          wsServer.on('connection', (socket: WebSocket): void => {
            socket.on('pong', (): void => {
              expect(clientReceivedPing).to.be.true;

              wsServer.close((): void => {
                done();
              });
            });

            socket.ping();
          });

          const connection: WebSocket = new WebSocket(connectionUrl);
          connection.on('ping', (): void => {
            clientReceivedPing = true;
          });
        });
    });

    // add more tests
  });
});




// describe('Server & Client', () => {
//   it('Should trigger disconnect with correct close code and reason', (done: any) => {
//     const code: number = 3455;
//     const reason: string = 'Some strange reason';

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       connection.on('close', (rCode: number, rReason: string) => {
//         expect(code).to.be.eql(rCode);
//         expect(reason).to.be.eql(rReason);
//         this.wsServer.close();
//         done();
//       });
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//     socket.on('open', () => {
//       socket.close(code, reason);
//     });
//   });

//   it('Should trigger disconnect with default code', (done: any) => {
//     this.wsServer.on('connection', (connection: WebSocket) => {
//       connection.on('close', (rCode: number, rReason: string) => {
//         expect(rCode).to.be.eql(1000);
//         expect(rReason).to.be.eql('');
//         this.wsServer.close();
//         done();
//       });
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//     socket.on('open', () => {
//       socket.close();
//     });
//   });

//   it('Should close connection from server side with default code', (done: any) => {
//     this.wsServer.on('connection', (connection: WebSocket) => {
//       connection.close();
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//     socket.on('close', (rCode: number, rReason: string) => {
//       expect(rCode).to.be.eql(1000);
//       expect(rReason).to.be.eql('');
//       this.wsServer.close();
//       done();
//     });
//   });

//   it('Should close connection from server side with provided code and reason', (done: any) => {
//     const code: number = 3455;
//     const reason: string = 'Some strange reason';

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       connection.close(code, reason);
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//     socket.on('close', (rCode: number, rReason: string) => {
//       expect(code).to.be.eql(rCode);
//       expect(reason).to.be.eql(rReason);
//       this.wsServer.close();
//       done();
//     });
//   });


//   it('_socket should exist', (done: any) => {
//     this.wsServer.on('connection', (connection: WebSocket) => {
//       expect(connection._socket).to.exist;
//       this.wsServer.close();
//       done();
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//   });

//   it('Broadcast to all connected users', (done: any) => {
//     let connected: number = 0;
//     let firstReceived: boolean = false;
//     const messageToSend: string = 'Super cool message';

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       connected++;
//       if (connected > 1) {
//         expect(this.wsServer.clients.length).to.be.eql(2);
//         this.wsServer.broadcast(messageToSend);
//       }
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//     const socket2: WebSocket = new WebSocket('ws://localhost:3000');

//     socket.on('message', (message: any) => {
//       if (!firstReceived) {
//         firstReceived = true;
//       } else {
//         expect(message).to.be.eql(messageToSend);
//         done();
//         this.wsServer.close();
//       }
//     });

//     socket2.on('message', (message: any) => {
//       if (!firstReceived) {
//         firstReceived = true;
//       } else {
//         expect(message).to.be.eql(messageToSend);
//         done();
//         this.wsServer.close();
//       }
//     });
//   });

//   it('Should properly handle noServer with handleUpgrade', (done: any) => {
//     this.wsServer.close();

//     const internalWsServer: WebSocketServer = new WebSocket.Server({ noServer: true });

//     const server: any = createServer((req: any) => { /** ignore */ });
//     server.on('upgrade', (request: any, socket: any, head: any) => {
//       internalWsServer.handleUpgrade(request, socket, head, (ws: any) => {
//         internalWsServer.emit('connection', ws, request);
//       });
//     });

//     internalWsServer.on('connection', (connection: WebSocket) => {
//       internalWsServer.close();
//       server.close();
//       done();
//     });

//     server.listen(3000, () => {
//       const socket1: WebSocket = new WebSocket('ws://localhost:3000');
//     });
//   });

//   it('Correctly validate listener', (done: any) => {
//     expect(() => {
//       this.wsServer.on('connection', '');
//     }).to.throw(`Listener for 'connection' event must be a function`);

//     expect(() => {
//       this.wsServer.close();
//       this.wsServer = new WebSocket.Server({ port: 3000 });
//       this.wsServer.on('connection', (connection: WebSocket) => { /** */ });
//       this.wsServer.close();
//       this.wsServer = new WebSocket.Server({ port: 3000 });
//       this.wsServer.on('connection', async (connection: WebSocket) => { /** */ });
//     }).to.not.throw();

//     expect(() => {
//       const socket: any = new WebSocket('ws://localhost:3000');
//       socket.on('open', '');
//     }).to.throw(`Listener for 'open' event must be a function`);


//     expect(() => {
//       let socket: any = new WebSocket('ws://localhost:3000');
//       socket.on('open', () => { /** */ });
//       socket = new WebSocket('ws://localhost:3000');
//       socket.on('open', async () => { /** */ });
//     }).to.not.throw();

//     this.wsServer.close();
//     done();
//   });

//   it('Connect socket to provided `path`', (done: any) => {
//     this.wsServer.close();
//     this.wsServer = new WebSocket.Server({ port: 3000, path: '/socket/specific/path' });

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       expect(connection._socket).to.exist;
//       this.wsServer.close();
//       done();
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000/socket/specific/path');
//   });

//   it('`verifyClient` allow to pass', (done: any) => {
//     this.wsServer.close();
//     this.wsServer = new WebSocket.Server({
//       port: 3000, verifyClient: (info: any, next: any): void => {
//         expect(info.req).to.exist;
//         expect(info.secure).to.exist;

//         next(true);
//       }
//     });

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       expect(connection._socket).to.exist;
//       this.wsServer.close();
//       done();
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//   });

//   it('`verifyClient` deny pass', (done: any) => {
//     this.wsServer.close();
//     this.wsServer = new WebSocket.Server({
//       port: 3000, verifyClient: (info: any, next: any): void => {
//         expect(info.req).to.exist;
//         expect(info.secure).to.exist;

//         next(false);

//         setTimeout(() => {
//           this.wsServer.close();
//           done();
//         }, 50);
//       }
//     });

//     this.wsServer.on('connection', (connection: WebSocket) => {
//       done('Should never be called');
//     });

//     const socket: WebSocket = new WebSocket('ws://localhost:3000');
//   });

//   it('Should trigger on `close` event at the server', (done: any) => {
//     this.wsServer.on('connection', (connection: WebSocket) => { });
//     this.wsServer.on('close', () => {
//       done();
//     });
//     this.wsServer.close();
//   });

//   it('Should abort request on invalid Sec-WebSocket-Key header', (done: any): void => {
//     let response: string = '';
//     const client: any = connect(3000, 'localhost', (): void => {
//       client.write(`GET / HTTP/1.0
// Upgrade: websocket
// Connection: Upgrade
// Sec-Websocket-Key: invalid
// Sec-Websocket-Version: 13\r\n\r\n`);
//     });

//     client.on('data', (data: Buffer): void => {
//       response += data.toString();
//     });

//     client.on('close', (): void => {
//       expect(response).to.be.eql('HTTP/1.1 400 Bad Request\r\n\r\n');
//       this.wsServer.on('close', (): void => {
//         done();
//       });
//       this.wsServer.close();
//     });
//   });
// });
