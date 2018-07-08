const uws = require('uws');

let socket = new uws('ws://localhost:3001');
let numbersOfMessages = 0;
socket.on('open', () => {
  console.log('Socket 1 is connected');
  socket.send('id2');
});

socket.on('message', (message) => numbersOfMessages++);

let t0;
let numbersOfMessagesSend = 0;
t0 = new Date().getTime();

for (let i = 0; i < 10; i++) {
  let socket2 = new uws('ws://localhost:3001');

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
}

setInterval(() => {
  console.log(
    `Number of messages recieved: ${numbersOfMessages} / ${numbersOfMessagesSend} for ${(new Date().getTime() - t0) /
      1000} ms`
  );
}, 10000);
