// performance test for simple standart broker
const uws = require('uws');

let wss = new uws.Server({ port: 3001 }, () => {
  console.log('uWS server is running on 3001');
});
let sockets = [];
wss.on('connection', (socket) => {
  socket.on('message', (message) => {
    if (typeof message === 'string') {
      socket.id = message;
      sockets.push(socket);
    } else {
      for (let i = 0; i < sockets.length; i++) {
        if (sockets[i].id !== socket.id) {
          sockets[i].send(message);
        }
      }
    }
  });
});
