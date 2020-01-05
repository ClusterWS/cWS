## Unreleased 1.0.0

* Reexport `WebSocketServer` under `WebSocket.Server`
* Remove `websocket.remoteAddress` as we can get it from `websocket._socket.remoteAddress` or `req.connection.remoteAddress`
* Add `clients` handler on `WebSocketServer`
* Change values of `OPEN` and `CLOSED` on `WebSocket` to 1 and 3 (make more standard compliant)
* Do not emit `listening` event as callback should be enough (user can implement this event using callback)

## Release 0.17.0

* Remove support for SSL from Node.js 10+ (use proxy instead like nginx)
* Added support for Node.js 13

## Release 0.16.0

* Improved typings for `on('connection')` handler [#25](https://github.com/ClusterWS/cWS/pull/25)
* Improved typings for `verifyClient` [#24](https://github.com/ClusterWS/cWS/pull/24)
* On `verifyClient` fail by default return code `401` [#24](https://github.com/ClusterWS/cWS/pull/24)

## Release 0.15.0
#### Improvements
* `socket.send(buffer, { binary: false })` will force text `opCode`

## Release 0.14.0
#### Improvements
* Adjust `verifyClient` to return the same `info` object as `ws` module instead of `headers` return origin as headers can be accessed from `req`

## Release 0.13.0
#### Improvements
* Add support for node 12

## Release 0.12.2
#### Improvements
* Re throw error from cWS bindings.

