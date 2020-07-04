<h1 align="center">ClusterWS/cWS</h1>
<h6 align="center">Fast WebSocket implementation for Node.js</h6>

<p align="center">
  <a href="https://badge.fury.io/js/%40clusterws%2Fcws"><img src="https://badge.fury.io/js/%40clusterws%2Fcws.svg" alt="npm version" height="22"></a>
   <a href="https://travis-ci.org/ClusterWS/cWS"><img src="https://travis-ci.org/ClusterWS/cWS.svg?branch=master" alt="travis build" height="22"></a>
</p>


## Important Notes

* This repository is a fork of [uWebSockets v0.14](https://github.com/uNetworking/uWebSockets/tree/v0.14) therefore has two licence [MIT](https://github.com/ClusterWS/uWS/blob/master/LICENSE) and [ZLIB](https://github.com/ClusterWS/uWS/blob/master/src/LICENSE)
* Consider using latest [uWebSockets](https://github.com/uNetworking/uWebSockets.js) version instead
* You can support me through [Patreon](https://www.patreon.com/clusterws) and [PayPal](https://www.paypal.me/goriunov)

## Supported Node Versions

|  CWS Version | Node 10  | Node 11 | Node 12          |  Node 13  | Node 14 |
|--------------|----------|---------|------------------|-----------|---------|
| 3.0.0        | >=10.0   |    X    | >=12.16          | >=13.9    | >=14.5  |
| 2.0.0        | >=10.0   |    X    | >=12.16          | >=13.9    |   X     |
| 1.6.0        | >=10.0   | >=11.0  | >=12.0 & <12.16  | >=13.9    |   X     |

## Documentation

#### Useful links

* [Examples](./examples)
* [Changelog](./CHANGELOG.md)

#### Table of Contents

* [Installation](#user-content-installation)
* [Websocket Client](#user-content-websocket-client)
* [Websocket Server](#user-content-websocket-server)
* [Secure WebSocket](#user-content-secure-websocket)
* [Handle App Level Ping In Browser (example)](#user-content-handle-app-level-ping-in-browser-example)

### Installation

```js
npm i @clusterws/cws
```

### Websocket Client

Typings: [dist/client.d.ts](https://github.com/ClusterWS/cWS/blob/master/dist/client.d.ts)

Import cws WebSocket:
```js
const { WebSocket } = require('@clusterws/cws');
```

Connect to WebSocket server:
```js
const socket = new WebSocket(/* ws server endpoint **/);
```

Event on `open` is triggered when server accepts connection and this connection is ready to perform other actions:
```js
socket.on('open', () => { });
// or like browser interface
socket.onopen = () => { };
```

Event on `error` is triggered if there is an error with the connection:
```js
socket.on('error', (err) => { });
// or like browser interface
socket.onerror = (err) => { };
```

Event on `close` is triggered when connection has been closed:
```js
// code: number and reason: string are optional
socket.on('close', (code, reason) => { });
// or like browser interface
socket.onclose = (code, reason) => { };
```

Event on `message` is triggered when client receives message(s):
```js
// receives string or binary

socket.on('message', (message) => { });
// or like browser interface
socket.onmessage = (message) => { };
```

Event `ping` is triggered when other side sends ping to check if connection still active:
```js
socket.on('ping', () => { });
```

Event `pong` is triggered after `ping` has been sent and it received back conformation:
```js
socket.on('pong', () => { })
```

To send message use `send` function:
```js
// send accepts string or binary
// will automatically identify type
socket.send(msg);

// will overwrite/specify message type to string (does not transform data to specified type)
socket.send(msg, { binary: false });

// will overwrite/specify message type to binary (does not transform data to specified type)
socket.send(msg, { binary: true });

// will call callback after message sent or errored
socket.send(msg, null, (err) => { });
```

To close connection you can use `close` or `terminate` methods:
```js
// clean close code and reason are optional
socket.close(code, reason);
// destroy socket 
socket.terminate()
```

Use `ping` function to manually send ping:
```js
socket.ping();
// now just wait for `pong` event
```

To get current socket ready state can use `readyState` getter:
```js
socket.readyState; // -> OPEN (1) or CLOSED (3)

// check if socket open can be done by
if(socket.readyState === socket.OPEN) {}

// check if socket closed can be done by
if(socket.readyState === socket.CLOSED) {}
```

To get addresses use `_socket` getter:
```js
socket._socket;

// Returns some thing like (all fields could be undefined):
// {
//  remotePort,
//  remoteAddress,
//  remoteFamily
// }
```

**For more information check typings (`*.d.ts`) files in [dist](https://github.com/ClusterWS/cWS/blob/master/dist) folder**

### Websocket Server

Typings: [dist/server.d.ts](https://github.com/ClusterWS/cWS/blob/master/dist/server.d.ts)

Import cws WebSocket:
```js
const { WebSocket } = require('@clusterws/cws');
```

Create WebSocket server:
```js
const wsServer = new WebSocket.Server({ 
  /**
   * port?: number (creates server and listens on provided port)
   * host?: string (provide host if necessary with port)
   * path?: string (url at which accept ws connections)
   * server?: server (provide already existing server)
   * noDelay?: boolean (set socket no delay)
   * noServer?: boolean (use this when upgrade done outside of cws)
   * maxPayload?: number 
   * perMessageDeflate?: boolean | { serverNoContextTakeover: boolean;}
   * verifyClient?: (info: ConnectionInfo, next: VerifyClientNext) => void (use to allow or decline connections)
   **/ 
 }, () => {
  // callback called when server is ready
  // is not called when `noServer: true` or `server` is provided
  // from outside
});
```

Event on `connection` is triggered when new client is connected to the server:
```js
// `ws` is websocket client all available options 
// can be found in `Websocket Client` section above
// `req` is http upgrade request
wsServer.on('connection', (ws, req) => {})
```

Event on `error` is triggered when server has some issues and `noServer` is `false:`
```js
// on error event will NOT include httpServer errors IF
// server was passed under server parameter { server: httpServer },
// you can register on 'error' listener directly on passed server
wsServer.on('error', (err) => { })
```

Event on `close` is triggered after you call `wsServer.close()` function, if `cb` is provided both `cb` and on `close` listener will be triggered:
```js
wsServer.on('close', () => { })
```

To get all connected clients use `clients` getter:
```js
wsServer.clients;

// loop thought all clients:
wsServer.clients.forEach((ws) => { });

// get number of clients:
wsServer.clients.length;
```

To send message to all connected clients use `broadcast` method:
```js
// broadcast string
wsServer.broadcast(message);

// broadcast binary
wsServer.broadcast(message, { binary: true });
```

cWS supports auto ping with `startAutoPing` function:
```js
wsServer.startAutoPing(interval, appLevel);

// send ping to each client every 10s and destroy client if no pong received 
wsServer.startAutoPing(10000);

// pass true as second parameter to run app level ping
// this is mainly used for browser to track pings at client level
// as they do not expose on ping listener 
// look for browser client side implementation at the bottom
// `Handle App Level Ping In Browser (example)`
wsServer.startAutoPing(10000, true);
```

To stop server use `close` function:
```js
wsServer.close(() => {
  // triggered after server has been stopped
})
```

`handleUpgrade` is function which is commonly used together with `noServer` (same as `ws` module)
```js
const wss = new WebSocket.Server({ noServer: true });
const server = http.createServer();

wss.on('connection', (ws, req) => { })

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
  });
});
```

**For more information check typings (`*.d.ts`) files in [dist](https://github.com/ClusterWS/cWS/blob/master/dist) folder**

### Secure WebSocket
You can use `wss://` with `cws` by providing `https` server to `cws` and setting `secureProtocol` on https options:

```js
const { readFileSync } = require('fs');
const { createServer }  = require('https');
const { WebSocket, secureProtocol  } = require('@clusterws/cws');

const options = {
  key: readFileSync(/** path to key */),
  cert: readFileSync(/** path to certificate */),
  secureProtocol
  // ...other Node HTTPS options
};

const server = createServer(options);
const wsServer = new WebSocket.Server({ server });
// your secure ws is ready (do your usual things)

server.listen(port, () => {
  console.log('Server is running');
})
```

**For more detail example check [examples](https://github.com/ClusterWS/cWS/blob/master/examples) folder**

### Handle App Level Ping In Browser (example)
Handling custom App level `ping`, `pong` from the client side which does not have `onping` and `onpong` listeners available such as browsers.

**Note** if all your clients have `onping` and `onpong` listeners do not send `appLevelPing` ping from the server. If you enable appLevelPing you will need to implement similar handler for every client library which connects to the server.

```js
const PING = 57;
const PONG = new Uint8Array(['A'.charCodeAt()]);

socket.binaryType = 'arraybuffer';

socket.onmessage = function (message) {
    // note actually sent message in
    // browser default WebSocket is under `message.data`

    // check if message is not string 
    if (typeof message.data !== 'string') {
        // transform it to Uint8Array
        let buffer = new Uint8Array(message.data);

        // Check if it is actually ping from the server
        if (buffer.length === 1 && buffer[0] === PING) {
            // this is definitely `ping` event you can call custom on ping handler 
            // also must send back immediately pong to the server 
            // otherwise server will disconnect this client
            return socket.send(PONG);
        }
    }

    // process with your logic
}
```
