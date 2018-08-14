<h1 align="center">ClusterWS-uWS</h1>
<h6 align="center">Modified version of <a href="https://github.com/uNetworking/uWebSockets">uWebSockets</a></h6>

<p align="center">
 <img src="https://cdn.rawgit.com/goriunov/159120ca6a883d8d4e75543ec395d361/raw/d22028ecc726d7d3cc30a2a85cc7cc454b0afada/clusterws.svg" width="450">
</p>

<p align="center">
  <i>This module is modified version of the uWebsockets with some minor twiks in C++ code and complete rewrite of JS code.</i>
</p>

### Installation

```js
npm i clusterws-uws
```

### Server example

uWebSockets node was designed to mimic node js [ws](https://github.com/websockets/ws) module

```js
const { WebSocketServer } = require('clusterws-uws');

// Create websocket server 
const server = new WebSocketServer({ port: 3000 }, () => {
    console.log('Server is running on port: ', 3000)
});

// Accept ws connections
server.on('connection', (socket) => {
    // standard ws methods
    socket.on('message', (message) => { });

    // emitted when conection closes 
    socket.on('close', (code, reason) => { });

    // emmited on error
    socket.on('error', (err) => { });

    // emmited when pong comes back from the client connection
    socket.on('pong', () => { 
      // make sure to add this line to this function 
      // important for ping pong system 
      socket.isAlive = true;
    });

    // this function accepts string or binary (node buffer)
    socket.send(message)

    // to manualy send ping
    socket.ping()
});

// start autoping accepts interval in ms and type of ping
// true means application level ping emitted throught messages (good for browser ping)
// false is low level ping pong
server.startAutoPing(20000, false)

// broadcast to all connected clients
// message: string | binary (node buffer)
// options?: { binary: true | false }
server.broadcast(message, options)

```