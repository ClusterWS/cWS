<h1 align="center">ClusterWS-uWS</h1>
<h6 align="center">Modified version of <a href="https://github.com/uNetworking/uWebSockets">uWebSockets</a></h6>

<p align="center">
 <img src="https://cdn.rawgit.com/goriunov/159120ca6a883d8d4e75543ec395d361/raw/d22028ecc726d7d3cc30a2a85cc7cc454b0afada/clusterws.svg" width="450">
</p>


<i>This module is modified version of the uWebsockets with some minor tweaks in C++ code and complete rewrite of JS code.</i>

**Please consider to support ClusterWS development:**
- [Become a Backer on Patreon](https://www.patreon.com/clusterws) 
- [One time Donation via PayPal](https://www.paypal.me/goriunov)

### Installation

```js
npm i clusterws-uws
```

### Server example

uWebSockets node was designed to mimic node js [ws](https://github.com/websockets/ws) module there are some things which are not available in uWebSockets.

```js
// use WebSocketServer to create server
const { WebSocketServer } = require('clusterws-uws');

// Create websocket server 
const server = new WebSocketServer({ port: 3000 }, () => {
    console.log('Server is running on port: ', 3000)
});

// Accept ws connections
server.on('connection', (socket, upgReq) => {
    // emitted when recieve new message
    socket.on('message', (message) => { });

    // emitted when conection closes 
    socket.on('close', (code, reason) => { });

    // emitted on error
    socket.on('error', (err) => { });

    // emitted when pong comes back from the client connection
    socket.on('pong', () => { 
      // make sure to add below line (important to do not drop connections)
      socket.isAlive = true;
    });

    // this function accepts string or binary (node buffer)
    socket.send(message)

    // to manualy send ping to the client
    socket.ping()
});

// Start auto ping (second parameter is type of ping `false` is low level)
// use `false` most of the time except if you want to track ping pong on the client side 
// which does not have onping & onpong methods (like browser webscoket)
// check Handle AutoLevelPing In Browser Example part below
server.startAutoPing(20000, false)

// broadcast to all connected clients
// message: string | binary (node buffer)
// options?: { binary: true | false }
server.broadcast(message, options)

```


### Client example

```js
// use WebSocket to create client
const { WebSocket } = require('clusterws-uws');



```


### Handle AutoLevelPing In Browser Example
This is just an example of handling app level ping pong from the client side which does not have `onping` and `onpong` methods available 

**Note** if your client has `onping` and `onpong` methods (or similar) do not send `appLevel` ping from the server as it requires more work.
```js
socket.binaryType = 'arraybuffer' // Do not fored to set to `arraybuffer`
socket.onmessage = function (message) {
    if (typeof message.data !== 'string') {
        let buffer = new Uint8Array(message.data);
        if (buffer[0] === 57) {
            return socket.send(new Uint8Array(['A'.charCodeAt()]));
        }

        // process with your binary date 
    }
    // process with your string data
}
```
