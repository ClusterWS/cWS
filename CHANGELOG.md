## Released 2.0.0

**Changes**
* Drop support for Node 8,9,11
* Fix issues with latest Node 12
* Add "Supported Node Versions" section in README

## Released 1.6.0

**Changes**
* If no close code provided from client return `1005` (similar to ws.js module)

**Bugs**
* Fix [invalid UTF-8 sequence bug](https://github.com/ClusterWS/cWS/issues/39)

## Released 1.5.0

**Changes**
* Fix SSL support on Node 13.9+ [#37](https://github.com/ClusterWS/cWS/pull/37)
* Abort connection on invalid Sec-WebSocket-Key header [#35](https://github.com/ClusterWS/cWS/pull/35)

## Released 1.4.0

**Changes**
* Return `secureProtocol` to docs (stick with tls 1.2)
* Downgrade multiple listeners error to warning (allow listeners overwrite)

## Released 1.3.1

**Improvement**
* Remove `secureProtocol` from required options on ssl

## Released 1.3.0

**Improvement**
* Add SSL support to node 10,11,12,13 (outstanding issue with node 13.9.0 use 13.8.0 instead)

## Released 1.2.0

**Improvement**
* Do not register httpServer on `error` event if server has been passed from the user

## Released 1.1.2

**Fixes**
* Fix typings for on `connection` event

## Released 1.1.0

**Improvement**
* Added support for on `close` event on the `WebSocketServer`

**Fixes**
* Validation prints warning if listener is not supported

## Released 1.0.0

This is quite a big release with some important changes, improvement and fixes including but not limited to:

**Improvement**
* Added `noServer` config
* Added `clients` getter to `WebSocketServer`
* Added `handleUpgrade` similar to `ws` module
* Changed values of `OPEN` and `CLOSED` on `WebSocket` to `1` and `3` respectively
* Reexported `WebSocketServer` under `WebSocket.Server`

**Fixes**
* Fixed `perMessageDeflate` configuration
* Fixed close code on fuzzing

**Removed**
* Removed `global.cws` config
* Removed `websocket.remoteAddress` as can get data from `websocket._socket.remoteAddress` or `req.connection.remoteAddress`
* No more `listening` event emitted from `WebSocketServer` (can be implemented using callback)

Many other fixes and improvements...

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

