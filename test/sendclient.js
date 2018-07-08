const uws = require('uws');

let socket2 = new uws('ws://localhost:3001');
let numbersOfMessagesSend = 0;
socket2.on('open', () => {
  console.log('Socket 2 is connected');
  // Register socket
  socket2.send('id1');

  setInterval(() => {
    numbersOfMessagesSend++;
    socket2.send(Buffer.from('Message from id1'));
  }, 5);
});

socket2.on('message', () => {
  console.log('Some thing wrong');
});
