/// Simple example of using ssl with cws (you main need to adjust imports and key, cert files based on your env)
const { readFileSync } = require('fs');
const { createServer } = require('https');
const { WebSocket, secureProtocol } = require('../dist');

const htmlFile = `
<html>
  <body>
  <script>
    const websocket = new WebSocket('wss://localhost:3000');
    websocket.onopen = () => {console.log('websocket open')};
    websocket.onclose = () => {console.log('websocket close')};
    websocket.onmessage = (msg) => {
      console.log('Received message from server', "'" + msg.data + "'");
      websocket.send("Back message from client");
    };
  </script>
  </body>
</html>
`;

const options = {
  key: readFileSync('./tests/certs/key.pem'),
  cert: readFileSync('./tests/certs/certificate.pem'),
  secureProtocol
};

const server = createServer(options, (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write(htmlFile);
  res.end();
});

const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (ws) => {
  console.log('Client connected');
  ws.send('Hello from server');

  ws.on('message', (msg) => {
    console.log('Received message', "'" + msg + "'");
  });

  ws.on('error', (err) => {
    console.log('Received error: ', err);
  });

  ws.on('close', (code, reason) => {
    console.log('Connection closed: ', code, reason);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});