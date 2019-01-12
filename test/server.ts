import { WebSocketServer, WebSocket } from '../dist/index';

const server: WebSocketServer = new WebSocketServer({ port: 3000 });

server.on('connection', (socket: WebSocket) => {
  socket.on('close', () => {
    // any
  });
  socket.on('error', () => {
    //
  });
});