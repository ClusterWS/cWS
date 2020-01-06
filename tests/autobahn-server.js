const { WebSocket } = require('../dist');

const wss = new WebSocket.Server({ port: 9001, perMessageDeflate: false }, () => {
  console.log('Server is running on port 9001');
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => ws.send(data));
  ws.on('error', (e) => console.error(e));
});
