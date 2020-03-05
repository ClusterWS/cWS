import { expect } from 'chai';
import { connect } from 'net';
import { readFileSync } from 'fs';
import { connect as tlsConnect } from 'tls';
import { createServer, Server } from 'http';
import { createServer as createServerHttps, Server as HttpsServer } from 'https';

import { WebSocket, WebSocketServer, secureProtocol } from '../lib';

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


    it('Should close connection with correct code & reason (Server)', (done: () => void): void => {
      // wite close logic
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          const conditions: any = {
            withCode: {
              code: 3001,
              reason: ''
            },
            withCodeAndReason: {
              code: 3001,
              reason: 'Custom Reason'
            },
            default: {
              code: 1000,
              reason: ''
            }
          };

          wsServer.on('connection', (socket: WebSocket): void => {
            socket.on('message', (msg: string): void => {
              if (msg === 'default') {
                return socket.close();
              }
              socket.close(conditions[msg].code, conditions[msg].reason);
            });
          });

          const allPassed: Promise<any>[] = [];
          for (const key in conditions) {
            allPassed.push(new Promise((res: any): void => {
              const condition: any = conditions[key];
              const connection: WebSocket = new WebSocket(connectionUrl);

              connection.on('close', (code?: number, reason?: string): void => {
                expect(code).to.eql(condition.code);
                expect(reason).to.eql(condition.reason);
                res();
              });

              connection.on('open', (): void => {
                connection.send(key);
              });
            }));
          }

          Promise.all(allPassed).then((): void => {
            wsServer.close((): void => {
              done();
            });
          });
        });
    });


    it('Should close connection with correct code & reason (Client)', (done: () => void): void => {
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          const conditions: any = {
            withCode: {
              code: 3455,
              reason: ''
            },
            withCodeAndReason: {
              code: 3455,
              reason: 'Custom Reason'
            },
            default: {
              code: 1000,
              reason: ''
            }
          };

          wsServer.on('connection', (socket: WebSocket): void => {
            let expectedCode: number = conditions.default.code;
            let expectedReason: string = conditions.default.reason;

            socket.on('message', (msg: string): void => {
              if (msg) {
                expectedCode = JSON.parse(msg).code;
                expectedReason = JSON.parse(msg).reason;
              }
            });

            socket.on('close', (code?: number, reason?: string): void => {
              expect(code).to.eql(expectedCode);
              expect(reason).to.eql(expectedReason);
            });
          });

          const allPassed: Promise<any>[] = [];
          for (const key in conditions) {
            allPassed.push(new Promise((res: any): void => {
              const condition: any = conditions[key];
              const connection: WebSocket = new WebSocket(connectionUrl);

              connection.on('close', (code?: number, reason?: string): void => {
                setTimeout((): void => res(), 10);
              });

              connection.on('open', (): void => {
                if (key === 'default') {
                  return connection.close();
                }

                connection.send(JSON.stringify(condition));
                setTimeout((): void => connection.close(condition.code, condition.reason), 10);
              });
            }));
          }

          Promise.all(allPassed).then((): void => {
            wsServer.close((): void => {
              done();
            });
          });
        });
    });

    it('Should "broadcast" to all connected users', (done: () => void): void => {
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          let clientsReceivedMessage: number = 0;
          const messageToBroadcast: string = 'Super message';

          setTimeout((): void => {
            wsServer.broadcast(messageToBroadcast);
            setTimeout((): void => {
              expect(clientsReceivedMessage).to.be.eql(2);
              wsServer.close((): void => {
                done();
              });
            }, 10);
          }, 50);

          const connection1: WebSocket = new WebSocket(connectionUrl);
          const connection2: WebSocket = new WebSocket(connectionUrl);

          connection1.on('message', (msg: string): void => {
            expect(msg).to.be.eql(messageToBroadcast);
            clientsReceivedMessage++;
          });

          connection2.on('message', (msg: string): void => {
            expect(msg).to.be.eql(messageToBroadcast);
            clientsReceivedMessage++;
          });
        });
    });

    it('Should abort request on invalid Sec-WebSocket-Key header', (done: () => void): void => {
      createWSServer(isSSL)
        .then((wsServer: WebSocketServer): void => {
          const host: string = connectionUrl.replace('//', '').split(':')[1];
          const port: number = parseInt(connectionUrl.replace('//', '').split(':')[2], 10);
          const connectMethod: any = isSSL ? tlsConnect : connect;

          let response: string = '';
          const connection: any = connectMethod(port, host, { rejectUnauthorized: false }, (): void => {
            connection.write(`GET / HTTP/1.0\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-Websocket-Key: invalid\r\nSec-Websocket-Version: 13\r\n\r\n`);
          });

          connection.on('data', (data: Buffer): void => {
            response += data.toString();
          });

          connection.on('close', (): void => {
            expect(response).to.be.eql('HTTP/1.1 400 Bad Request\r\n\r\n');
            wsServer.close((): void => {
              done();
            });
          });
        });
    });

    // add more tests
  });
});
