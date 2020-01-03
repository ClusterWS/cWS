#include <string>
#include "cWS.h"
#include "Addon.h"

void Initialize(Local<Object> exports) {
  Isolate *isolate = exports->GetIsolate();

  #if NODE_MAJOR_VERSION >= 13
    exports->Set(isolate->GetCurrentContext(), String::NewFromUtf8(isolate, "server").ToLocalChecked(),
                Namespace<cWS::SERVER>(isolate).object);
    exports->Set(isolate->GetCurrentContext(), String::NewFromUtf8(isolate, "client").ToLocalChecked(),
                Namespace<cWS::CLIENT>(isolate).object);
  #else
    exports->Set(String::NewFromUtf8(isolate, "server"),
                Namespace<cWS::SERVER>(isolate).object);
    exports->Set(String::NewFromUtf8(isolate, "client"),
                Namespace<cWS::CLIENT>(isolate).object);
  #endif

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