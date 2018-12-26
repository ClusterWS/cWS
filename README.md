<h1 align="center">ClusterWS/cWS Implementation</h1>
<h6 align="center">Modified version of <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets</a></h6>

<p align="center">
 <img src="https://cdn.rawgit.com/goriunov/159120ca6a883d8d4e75543ec395d361/raw/d22028ecc726d7d3cc30a2a85cc7cc454b0afada/clusterws.svg" width="450">
</p>

<i>This module is modified version of the uWebSockets with some minor tweaks in C++ code and complete rewrite of JS code to TS. Original software is available in <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets</a> repository.</i>

<a href="https://badge.fury.io/js/%40clusterws%2Fcws"><img src="https://badge.fury.io/js/%40clusterws%2Fcws.svg" alt="npm version" height="22"></a>

This repository is based on the <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets</a> therefore has two licence [ClusterWS MIT](https://github.com/ClusterWS/uWS/blob/master/LICENSE) and [Alex Hultman ZLIB](https://github.com/ClusterWS/uWS/blob/master/src/LICENSE).

Big thanks to [SirAnthony](https://github.com/SirAnthony) for ssl workaround (has been taken from [SirAnthony's uWebSockets fork](https://github.com/hola/uWebSockets-bindings)).

**Please consider to support ClusterWS development:**
- [Become a Backer on Patreon](https://www.patreon.com/clusterws) 
- [One time Donation via PayPal](https://www.paypal.me/goriunov)

### Installation

```js
npm i @clusterws/cws
```

### Server example

```js
// use WebSocketServer to create server
const { WebSocketServer } = require('@clusterws/cws');

// Create websocket server 
const server = new WebSocketServer({ port: 3000 }, () => {
    console.log('Server is running on port: ', 3000)
});

// Accept ws connections
server.on('connection', (socket, upgReq) => {
    // gives you remoteAddress info
    let address = socket._socket 
    // emitted when receive new message
    socket.on('message', (message) => { });

    // emitted when connection closes 
    socket.on('close', (code, reason) => { });

    // emitted on error
    socket.on('error', (err) => { });

    // emitted when pong comes back from the client connection
    socket.on('pong', () => { 
      // make sure to add below line (important to do not drop connections)
      socket.isAlive = true;
    });

    // emitted when get ping from the server (if you send)
    socket.on('ping', () => {})

    // this function accepts string or binary (node buffer)
    socket.send(message)

    // destroy connection
    socket.terminate()

    // close connection
    socket.close(code, reason)

    // to manually send ping to the client
    socket.ping()
});

server.on('error', (err, socket) => {
  // in some cases there is not socket param
  // handle http errors, TLS errors, ... 
})

// Start auto ping (second parameter is type of ping `false` is low level)
// use `false` most of the time except if you want to track ping pong on the client side 
// which does not have onping & onpong methods (like browser websocket)
// check Handle AutoLevelPing In Browser Example part below
// event if you use app level ping server onPong will be called
server.startAutoPing(20000, false)

// broadcast to all connected clients
// message: string | binary (node buffer)
// options?: { binary: true | false }
server.broadcast(message, options)

// destroy or close server
server.close(callback)

```


### Client example

```js
// Client part is pretty much the same as in server
// use WebSocket to create client
const { WebSocket } = require('@clusterws/cws');

const socket = new WebSocket('ws://url:port');

// emitted when websocket is connected
socket.on('open', () => {})

// emitted when receive new message
socket.on('message', (message) => { });

// emitted when error happens
socket.on('error', (err) => {})

// emitted on close websocket
socket.on('close', (code, reason) => {})

// emitted when get ping from the server (if you send)
socket.on('ping', () => {})

// emitted when get pong from the server (if you send)
socket.on('pong', () => {})

socket.ping() // manually send ping to the server

socket.send(msg) // send message to the server binary | string

socket.terminate() // destroy connection

socket.close(code, reason) // close connection

```

### Replace EventEmitter 
To replace custom event emitter you have to overwrite global `cws` parameter before importing `@clusterws/cws` ex:
```js
// this code uses default node js event emitter
global.cws = {
  EventEmitter: require('events').EventEmitter
}

// import cws
const { WebSocket } = require('@clusterws/cws');
```

### Handle AppLevelPing In Browser Example
This is just an example of handling app level ping pong from the client side which does not have `onping` and `onpong` methods available 

**Note** if your clients have `onping` and `onpong` methods (or similar) do not send `appLevel` ping from the server as it requires more work.
```js
socket.binaryType = 'arraybuffer' // Do not forget to set to `arraybuffer`
socket.onmessage = function (message) {
    if (typeof message.data !== 'string') {
        let buffer = new Uint8Array(message.data);
        if (buffer[0] === 57) {
            // output should be an array with one bit and [0] is === 65
            return socket.send(new Uint8Array(['A'.charCodeAt()]));
        }

        // process with your binary data
    }
    // process with your string data
}
```
