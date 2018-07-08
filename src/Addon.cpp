#include <string>
#include "uWS.h"

// Moved from uWS.h as aligning switch places
#include "Addon.h"

class ConnectedWebSocket {
 public:
  std::string serverID;
  uWS::WebSocket<uWS::SERVER> *wsConnection;
  ConnectedWebSocket(uWS::WebSocket<uWS::SERVER> *ws, std::string id)
      : wsConnection(ws), serverID(id) {}
};

void runGlobalBroker(const FunctionCallbackInfo<Value> &args) {
  // Get params from passed arguments
  int SERVER_PORT;
  for (int i = 0; i < args.Length(); i++) {
    if (args[i]->IsNumber()) {
      SERVER_PORT = args[i]->NumberValue();
    }
  }

  uWS::Hub h;
  std::vector<ConnectedWebSocket> sockets;

  h.onMessage([&sockets](uWS::WebSocket<uWS::SERVER> *ws, char *message,
                         size_t length, uWS::OpCode opCode) {
    if (opCode == uWS::OpCode::TEXT) {
      std::string serverID;
      for (int i = 0; i < length; i++) {
        serverID += message[i];
      }
      sockets.push_back(ConnectedWebSocket(ws, serverID));
    } else {
      std::string currentServerID;

      for (auto socket : sockets) {
        if (socket.wsConnection == ws) {
          currentServerID = socket.serverID;
        }
      }

      for (auto socket : sockets) {
        if (socket.serverID.compare(currentServerID)) {
          socket.wsConnection->send(message, length, opCode);
        }
      }
    }
  });

  h.onDisconnection([&sockets](uWS::WebSocket<uWS::SERVER> *ws, int code,
                               char *message, size_t length) {
    for (std::vector<int>::size_type i = 0; i != sockets.size(); i++) {
      if (sockets[i].wsConnection == ws) {
        sockets.erase(sockets.begin() + i);
        break;
      }
    }
  });

  // Start ping with the server
  h.getDefaultGroup<uWS::SERVER>().startAutoPing(20000);
  if (h.listen(SERVER_PORT)) {
    h.run();
  }
}

// INIT NODE MODULE
void Initialize(Local<Object> exports) {
  Isolate *isolate = exports->GetIsolate();

  exports->Set(String::NewFromUtf8(isolate, "server"),
               Namespace<uWS::SERVER>(isolate).object);
  exports->Set(String::NewFromUtf8(isolate, "client"),
               Namespace<uWS::CLIENT>(isolate).object);

  NODE_SET_METHOD(exports, "runGlobalBroker", runGlobalBroker);
  NODE_SET_METHOD(exports, "setUserData", setUserData<uWS::SERVER>);
  NODE_SET_METHOD(exports, "getUserData", getUserData<uWS::SERVER>);
  NODE_SET_METHOD(exports, "clearUserData", clearUserData<uWS::SERVER>);
  NODE_SET_METHOD(exports, "getAddress", getAddress<uWS::SERVER>);

  NODE_SET_METHOD(exports, "transfer", transfer);
  NODE_SET_METHOD(exports, "upgrade", upgrade);
  NODE_SET_METHOD(exports, "connect", connect);
  NODE_SET_METHOD(exports, "setNoop", setNoop);
  registerCheck(isolate);
}

NODE_MODULE(addon, Initialize)