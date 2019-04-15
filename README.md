<h1 align="center">ClusterWS/cWS Implementation</h1>
<h6 align="center">Modified version of <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets v0.14</a></h6>

<p align="center">
 <img src="https://cdn.rawgit.com/goriunov/159120ca6a883d8d4e75543ec395d361/raw/d22028ecc726d7d3cc30a2a85cc7cc454b0afada/clusterws.svg" width="450">
</p>

<i>This module is modified version of the uWebSockets v0.14 with some minor tweaks in C++ code and complete rewrite of JS code to TypeScript. Original software is available in <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets v0.14</a> repository.</i>

<a href="https://badge.fury.io/js/%40clusterws%2Fcws"><img src="https://badge.fury.io/js/%40clusterws%2Fcws.svg" alt="npm version" height="22"></a>

This repository is based on the <a href="https://github.com/uNetworking/uWebSockets/tree/v0.14">uWebSockets v0.14</a> therefore has two licence [ClusterWS MIT](https://github.com/ClusterWS/uWS/blob/master/LICENSE) and [Alex Hultman ZLIB](https://github.com/ClusterWS/uWS/blob/master/src/LICENSE).

Big thanks to [SirAnthony](https://github.com/SirAnthony) for ssl workaround (has been taken from [SirAnthony's uWebSockets fork](https://github.com/hola/uWebSockets-bindings)).

**Consider to support development:**
- [Buy a coffee (via PayPal)](https://www.paypal.me/goriunov)
- [Become a Backer on Patreon](https://www.patreon.com/clusterws) 

### Installation

```js
npm i @clusterws/cws
```


### WebSocket Server
To find about what types and parameters are accepted please check `dist/index.d.ts` file.

```js 
const { WebSocketServer } = require('@clusterws/cws');

const server = new WebSocketServer({
  /**
   *  Server options
   * 
   *  path?: string,
   *  port?: number,
   *  host?: string;
   *  server?: HTTP.Server | HTTPS.Server,
   *  noDelay?: boolean,
   *  maxPayload?: number,
   *  perMessageDeflate?: {
   *     serverNoContextTakeover: boolean
   *  };
   *  verifyClient?: (info: ConnectionInfo, next: Listener) => void
   * 
   * For more type information check dist/index.d.ts file
  */
});


/**
 * To accept WebSocket connections use on connection method
 * 
 * socket: WebSocket client
 * upgReq: upgrade request
*/
server.on('connection', (socket, upgReq) => {
    /** allow you to get remoteAddress info */ 
    let address = socket._socket;

    /**
      * on 'message' will be called when new message arrives from this client
      * 
      * msg: string | binary
    */
    socket.on('message', (msg) => { });

    /**
      * on 'close' will be called when connections is closed
      * 
      * code?: number, 
      * reason?: string
    */
    socket.on('close', (code, reason) => { });

    /**
      * on 'error' will be called websocket connection has some issue
      * 
      * err: Error 
    */
    socket.on('error', (err) => { });

    /**
      * on 'pong' will be called when client response with pong to the server's ping message
    */
    socket.on('pong', () => { });

    /**
      * on 'ping' will only when ping is received (on clint side)
    */
    socket.on('ping', () => { });

    /**
      * 'send' method is used to send messages to the client / server
      * 
      * message can be string or binary
    */
    socket.send(message);


    /**
      * 'ping' method is used to manually send ping to the client
    */
    socket.ping();

    /**
      * 'terminate' method is used to kill connection (usually to remove dead sockets)
    */
    socket.terminate();

    /**
      * 'close' method is used close connection clean way
      * 
      * code: number (close code)
      * reason: string (the reason to close this socket)
    */
    socket.close(code, reason);
});



/**
  * 'startAutoPing' method is method which will start auto ping all connected clients 
  * without any need for custom ping implementation
  *  
  * `startAutoPing` accepts 2 parameters
  * interval: number
  * appLevelPing: boolean (default false)
  * 
  * `interval` specifies how often ping should be send to each client 
  * usually iyt would be around 20000 (in ms)
  * 
  * `appLevelPing` is a value which allows you to ping any client including 
  * browser which do not expose `onping` and `onping` methods, for that to work you 
  * have to implement custom handle in you client side 
  * 
  * Check `Handle AppLevelPing In Browser Example` at the end of readme for more information
*/
server.startAutoPing(interval, appLevelPing);


/**
 *  `broadcast` method will send your message to all connected clients
 * accepts 2 parameters 
 * message: string | binary,
 * options?: { binary: true | false }
*/
server.broadcast(message, options);

/** will close websocket server and call callback function after everything is done */
server.close(callback);


/** 
 * this on error will be called when there are some issues with create server or
 * upgrading socket connection properly
 */
server.on('error', (err, socket) => { })
```


### WebSocket Client
Websocket client pretty much has the same things as `socket` parameter passed in the server (above section) on new connection,
below docs will cover mostly things which were not covered in above section.

```js
const { WebSocket } = require('@clusterws/cws');

/** this will connect to specify url */ 
const socket = new WebSocket('ws://url:port');

/** for more information about this listeners and functions check above section */ 
socket.on('open', () => { })
socket.on('message', (msg) => { });
socket.on('error', (err) => { });
socket.on('close', (code, reason) => { });
socket.on('ping', () => { });
socket.on('pong', () => { });
socket.ping();
socket.send(msg);
socket.terminate();
socket.close(code, reason);

/** 
 * also websocket client support browser websocket signature 
 * 
 * Note that there is no onping and onpong as browsers dont expose this
 * functions to the users.
 */ 
socket.onopen = () => {};
socket.onmessage = (msg) => {};
socket.onerror = (error) => {};
socket.onclose = (code, reason) => {};
```


## Additional Configuration/Examples

### Replace EventEmitter 

CWS uses custom lightweight version of EventEmitter which may not be suitable for some people, to replace 
event emitter you can use global cws configuration object ex:
```js
// this code uses default node js event emitter
global.cws = {
  EventEmitter: require('events').EventEmitter
}

// import cws
const { WebSocket } = require('@clusterws/cws');
```

### Handle AppLevelPing In Browser Example
This is just an example of handling app level `ping` `pong` from the client side which does not have `onping` and `onpong` methods available 

**Note** if your clients have `onping` and `onpong` methods (or similar) do not send `appLevel` ping from the server.

```js
const ping = 57;
const pongResponse = new Uint8Array(['A'.charCodeAt()]);

socket.binaryType = 'arraybuffer' // Do not forget to set to `arraybuffer`

socket.onmessage = function (message) {
    // check if our message if not string 
    if (typeof message.data !== 'string') {
        // transform it to Unit Array
        let buffer = new Uint8Array(message.data);

        // Check if it is actually ping from the server
        if (buffer[0] === ping && buffer.length === 1) {
            // you can also emit that ping has been received to you client :)
            // if it is then send back to the server pong response
            return socket.send(pongResponse);
        }

      // process with your logic
    }

    // process with your logic
}
```
