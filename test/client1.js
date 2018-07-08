const uws = require('uws');

let socket = new uws('ws://localhost:3001');
let numbersOfMessages = 0;
socket.on('open', () => {
  console.log('socket is connected id: 2');
  socket.send('id2');
});

socket.on('message', (message) => {
  numbersOfMessages++;
});

setInterval(() => {
  console.log('Number of messages recieved: ' + numbersOfMessages);
}, 10000);
// setInterval(() => {
//   socket.send(Buffer.from('Message from id2'));
// }, 5000);
