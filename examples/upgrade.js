const { parse } = require('url');
const { WebSocket } = require('../dist');
const { createServer } = require('http');

const server = createServer((req) => { /** ignore */ });

const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

wss1.on('connection', (ws, req) => { });
wss2.on('connection', (ws, req) => { });

server.on('upgrade', (req, socket, head) => {
  const pathname = parse(req.url).pathname;

  if (pathname === '/wss1') {
    wss1.handleUpgrade(req, socket, head, (ws) => {
      wss1.emit('connection', ws, req);
    });
  }

  if (pathname === '/wss2') {
    wss2.handleUpgrade(req, socket, head, (ws) => {
      wss2.emit('connection', ws, req);
    })
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000')
})