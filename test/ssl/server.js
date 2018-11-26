const cws = require('../../dist/index');
const https = require('https');
const express = require('express');
const fs = require('fs');

const app = express();

app.use(express.static('public'));

const https_server = https.createServer({
  key: fs.readFileSync('./ssl/server-key.pem'),
  cert: fs.readFileSync('./ssl/server-cert.pem'),
}, app);

let server = new cws.WebSocketServer({
  server: https_server
});

// comment this part to disable old uws
// const uws_old = require('uws');
// let server = new uws_old.Server({
//   server: https_server
// })
/////////////////////////

server.on("connection", (socket) => {
  console.log("Connected")
  socket.on('message', (message) => {
    socket.send("Back: " + message);
  })
  socket.on('close', () => {
    console.log("Disconnected");
  })
})

// server.startAutoPing(10000, true);


https_server.listen(3000, () => {
  console.log("Server is runnign");
});