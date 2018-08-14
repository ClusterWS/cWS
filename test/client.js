const uws = require('../dist/index');

let socket = new uws.WebSocket('ws://localhost:3000');

socket.on('open', () => {
    console.log("socket is open");
    socket.send("Hello server , i am from client");
});

socket.on('message', (message) => {
    if (typeof message !== 'string') {
        socket.send(Buffer.from('A'));
    }
    console.log(message);
})

socket.on('ping', () => {
    console.log('got ping');
})