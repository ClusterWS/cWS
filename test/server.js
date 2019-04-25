// global.EventEmitter = require('events').EventEmitter;

global.cws = {
  EventEmitter: require('events').EventEmitter
}
// console.log(global.EventEmitter);
const cws = require('../dist/index');

let server = new cws.WebSocketServer({
  port: 3000, verifyClient: (info, next) => {
    console.log(info.headers)
    next(true);
  }
}, () => {
  console.log('Server is running on port: ', 3000)
});

server.on('connection', (socket) => {
  console.log('new conneteion');
  socket.on('message', (message) => {
    socket.send('Hi back');
    console.log(message);
    // socket.send('Hi back');
    // socket.send(message);
  });

  socket.on('pong', () => {
    console.log("Got pong");
  })
  // socket.on('pong', () => {
  //     console.log('got pong');
  // });

  socket.on('close', () => {
    console.log('Socket is closed');
  })
});

server.startAutoPing(5000, false);

// setTimeout(() => server.close(), 10000);