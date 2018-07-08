#include <string>
#include "uWS.h"

// Moved from uWS.h as aligning switch places
#include "Addon.h"

void runGlobalBroker(const FunctionCallbackInfo<Value> &args) {
  // Get params from passed arguments
  static int SERVER_PORT = args[0]->NumberValue();
  // std::string SECURITY_KEY = args[1]->ToString(); Need to add this part
  static Local<Function> CALLBACK_FN = Local<Function>::Cast(args[2]);

  uWS::Hub h;
  std::vector<uWS::WebSocket<uWS::SERVER> *> sockets;
  int numberOfConnectedSockets = 0;

  h.onMessage([&numberOfConnectedSockets, &sockets](
                  uWS::WebSocket<uWS::SERVER> *ws, char *message, size_t length,
                  uWS::OpCode opCode) {
    if (opCode == uWS::OpCode::BINARY) {
      // Check if connected ws is more
      if (numberOfConnectedSockets > 5) {
        uWS::WebSocket<uWS::SERVER>::PreparedMessage *preparedMessage =
            ws->prepareMessage(message, length, opCode, false);

        for (auto socket : sockets) {
          if (socket->serverId.compare(ws->serverId)) {
            socket->sendPrepared(preparedMessage);
          }
        }

        ws->finalizeMessage(preparedMessage);
      } else {
        for (auto socket : sockets) {
          if (socket->serverId.compare(ws->serverId)) {
            socket->send(message, length, opCode);
          }
        }
      }
    } else {
      // Add new socket to the array
      std::string serverId(message, length);
      ws->setServerId(serverId);
      sockets.push_back(ws);
      numberOfConnectedSockets++;
    }
  });

  h.onDisconnection([&numberOfConnectedSockets, &sockets](
                        uWS::WebSocket<uWS::SERVER> *ws, int code,
                        char *message, size_t length) {
    for (std::vector<int>::size_type i = 0; i != sockets.size(); i++) {
      if (sockets[i] == ws) {
        sockets.erase(sockets.begin() + i);
        numberOfConnectedSockets--;
        break;
      }
    }
  });

  // Start ping with the server
  h.getDefaultGroup<uWS::SERVER>().startAutoPing(20000);

  if (h.listen(SERVER_PORT)) {
    // Send back message that server is running with port
    Isolate *isolate = args.GetIsolate();
    Local<Value> argv[1] = {Number::New(isolate, SERVER_PORT)};
    CALLBACK_FN->Call(Null(isolate), 1, argv);

    // Run hub
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