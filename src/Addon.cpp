#include <string>
#include "cWS.h"
#include "Addon.h"

void Initialize(Local<Object> exports) {
  Isolate *isolate = exports->GetIsolate();

  exports->Set(String::NewFromUtf8(isolate, "server"),
               Namespace<cWS::SERVER>(isolate).object);
  exports->Set(String::NewFromUtf8(isolate, "client"),
               Namespace<cWS::CLIENT>(isolate).object);

  NODE_SET_METHOD(exports, "getSSLContext", getSSLContext);
  NODE_SET_METHOD(exports, "setUserData", setUserData<cWS::SERVER>);
  NODE_SET_METHOD(exports, "getUserData", getUserData<cWS::SERVER>);
  NODE_SET_METHOD(exports, "clearUserData", clearUserData<cWS::SERVER>);
  NODE_SET_METHOD(exports, "getAddress", getAddress<cWS::SERVER>);
  

  NODE_SET_METHOD(exports, "transfer", transfer);
  NODE_SET_METHOD(exports, "upgrade", upgrade);
  NODE_SET_METHOD(exports, "connect", connect);
  NODE_SET_METHOD(exports, "setNoop", setNoop);
  registerCheck(isolate);
}

NODE_MODULE(addon, Initialize)