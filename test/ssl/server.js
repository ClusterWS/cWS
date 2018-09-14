const uws = require('../../dist/index');
const https = require('https');
const express = require('express');
const fs = require('fs');

const app = express();

app.use(express.static('public'));

const https_server = https.createServer({
  key: fs.readFileSync('./ssl/server-key.pem'),
  cert: fs.readFileSync('./ssl/server-cert.pem'),
}, app);

let server = new uws.WebSocketServer({
  server: https_server
});

server.on("connection", (socket) => {
  console.log("Connected")
  socket.on('message', (message) => {
    socket.send("Back: " + message);
  })
  socket.on('close', () => {
    console.log("Disconnected");
  })
})


https_server.listen(3000, () => {
  console.log("Server is runnign");
});