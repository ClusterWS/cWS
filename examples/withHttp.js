const { WebSocket } = require('../dist');
const { createServer } = require('http');

// you can easily connect other frameworks like 'express'
const server = createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('Client has been connected');
});

server.listen(3000, () => {
  console.log('Server is running');
})