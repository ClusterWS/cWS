const uws = require('uws');

let socket = new uws('ws://localhost:3001');
let numbersOfMessages = 0;
socket.on('open', () => {
  console.log('Socket is connected ID: 1');
  // Register socket
  socket.send('id1');
});

// socket.on('message', (message) => {});
setTimeout(() => {
  setInterval(() => {
    numbersOfMessages++;
    socket.send(Buffer.from('Message from id1'));
  }, 1);
}, 1000)


setInterval(() => {
  console.log('Number of messages send: ' + numbersOfMessages);
}, 10000);
