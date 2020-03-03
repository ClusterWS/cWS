const { WebSocket } = require('../dist');

const port = 9001;

const wss = new WebSocket.Server({ port, perMessageDeflate: false }, () => {
  console.log(`Server is running on port: ${port}`);
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => ws.send(data));
  ws.on('error', (e) => console.error(e));
});
