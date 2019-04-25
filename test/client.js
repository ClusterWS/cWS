
global.cws = {
  EventEmitter: require('events').EventEmitter
}

const cws = require('../dist/index');

let socket = new cws.WebSocket('ws://localhost:3000');
socket.binaryType = 'arraybuffer'

socket.onopen = () => {
  console.log("socket is open");
  socket.send("Hello server , i am from client");
}

socket.onmessage = (message) => {
  console.log(message);
  // if (typeof message !== 'string') {
  //     console.log(Buffer.from(message)[0]);
  //     socket.send(Buffer.from('A'));
  // }
  console.log(Buffer.from(message)[0]);
}

socket.onclose = () => {
  console.log("Socket has been closed");
}

// socket.on('open', () => {
//   console.log("socket is open");
//   socket.send("Hello server , i am from client");
// });

// socket.on('message', (message) => {
//   // if (typeof message !== 'string') {
//   //     console.log(Buffer.from(message)[0]);
//   //     socket.send(Buffer.from('A'));
//   // }
//   console.log(Buffer.from(message)[0]);

//   // socket.send("");
// })


socket.on('ping', () => {
  console.log('got ping');
})