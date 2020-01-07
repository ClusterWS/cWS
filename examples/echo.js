const { WebSocket } = require('../dist');

const wss = new WebSocket.Server({ port: 3000 }, () => {
  console.log('Server is running on port 3000');
});

wss.on('connection', (ws, req) => {
  ws.on('message', (msg) => {
    ws.send(msg);
  });
});