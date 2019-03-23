const cws = require('../dist/index');
const wss = new cws.WebSocketServer({ port: 3000 });

setTimeout(() => {
  const client = new cws.WebSocket("ws://localhost:3000");
  client.on('close', (a, b) => {
    console.log('In client', a, b);
  });

  client.on('error', (err) => {
    console.log(err);
  });
}, 1000);

wss.on('connection', (ws) => {
  // ws.close()
  ws.terminate();

  ws.on('close', function incoming(code, reason) {
    console.log('In server', code, reason);
    // ws.send(data);
  });

  ws.on('error', (err) => {
    console.log("In server", err);
  })
})

