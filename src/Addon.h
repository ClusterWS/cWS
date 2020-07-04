#include <node.h>
#include <node_buffer.h>
#include <openssl/bio.h>
#include <openssl/ssl.h>
#include <uv.h>
#include <cstring>

#if NODE_MAJOR_VERSION>=10
#define NODE_WANT_INTERNALS 1

#if NODE_MAJOR_VERSION==10
  #include "headers/10/tls_wrap.h"
#endif

#if NODE_MAJOR_VERSION==12
  #include "headers/12/tls_wrap.h"
  #include "headers/12/base_object-inl.h"
#endif

#if NODE_MAJOR_VERSION==13
  #include "headers/13/tls_wrap.h"
  #include "headers/13/base_object-inl.h"
#endif

#if NODE_MAJOR_VERSION==14
  #include "headers/14/tls_wrap.h"
  #include "headers/14/base_object-inl.h"
#endif

using BaseObject = node::BaseObject;
using TLSWrap = node::TLSWrap;
class TLSWrapSSLGetter : public node::TLSWrap {
public:
    void setSSL(const v8::FunctionCallbackInfo<v8::Value> &info){
        v8::Isolate* isolate = info.GetIsolate();
        if (!ssl_){
            info.GetReturnValue().Set(v8::Null(isolate));
            return;
        }
        SSL* ptr = ssl_.get();
        v8::Local<v8::External> ext = v8::External::New(isolate, ptr);
        info.GetReturnValue().Set(ext);
    }
};

// Fix windows not resolved symbol issue
#if defined(_MSC_VER)
  #if NODE_MAJOR_VERSION>10
    [[noreturn]] void node::Assert(const node::AssertionInfo& info) {
      char name[1024];
      char title[1024] = "Node.js";
      uv_get_process_title(title, sizeof(title));
      snprintf(name, sizeof(name), "%s[%d]", title, uv_os_getpid());
      fprintf(stderr, "%s: Assertion failed.\n", name);
      fflush(stderr);
      ABORT_NO_BACKTRACE();
    }
  #else
    [[noreturn]] void node::Assert(const char* const (*args)[4]) {
      auto filename = (*args)[0];
      auto linenum = (*args)[1];
      auto message = (*args)[2];
      auto function = (*args)[3];
      char name[1024];
      char title[1024] = "Node.js";
      uv_get_process_title(title, sizeof(title));
      snprintf(name, sizeof(name), "%s[%d]", title, uv_os_getpid());
      fprintf(stderr, "%s: %s:%s:%s%s Assertion `%s' failed.\n",
              name, filename, linenum, function, *function ? ":" : "", message);
      fflush(stderr);
      ABORT_NO_BACKTRACE();
    }
  #endif
#endif

 #undef NODE_WANT_INTERNALS
#endif

using namespace std;
using namespace v8;

cWS::Hub hub(0, true);
uv_check_t check;
Persistent<Function> noop;

void registerCheck(Isolate *isolate) {
  uv_check_init((uv_loop_t *)hub.getLoop(), &check);
  check.data = isolate;
  uv_check_start(&check, [](uv_check_t *check) {
    Isolate *isolate = (Isolate *)check->data;
    HandleScope hs(isolate);
    node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(isolate, noop), 0, nullptr);
  });
  uv_unref((uv_handle_t *)&check);
}

class NativeString {
  char *data;
  size_t length;
  char utf8ValueMemory[sizeof(String::Utf8Value)];
  String::Utf8Value *utf8Value = nullptr;

 public:
  NativeString(Isolate *isolate, const Local<Value> &value) {
    if (value->IsUndefined()) {
      data = nullptr;
      length = 0;
    } else if (value->IsString()) {
      utf8Value = new (utf8ValueMemory) String::Utf8Value(isolate, value);
      data = (**utf8Value);
      length = utf8Value->length();
    } else if (node::Buffer::HasInstance(value)) {
      data = node::Buffer::Data(value);
      length = node::Buffer::Length(value);
    } else if (value->IsTypedArray()) {
      Local<ArrayBufferView> arrayBufferView =
          Local<ArrayBufferView>::Cast(value);
      ArrayBuffer::Contents contents = arrayBufferView->Buffer()->GetContents();
      length = contents.ByteLength();
      data = (char *)contents.Data();
    } else if (value->IsArrayBuffer()) {
      Local<ArrayBuffer> arrayBuffer = Local<ArrayBuffer>::Cast(value);
      ArrayBuffer::Contents contents = arrayBuffer->GetContents();
      length = contents.ByteLength();
      data = (char *)contents.Data();
    } else {
      static char empty[] = "";
      data = empty;
      length = 0;
    }
  }

  char *getData() { return data; }
  size_t getLength() { return length; }
  ~NativeString() {
    if (utf8Value) {
      utf8Value->~Utf8Value();
    }
  }
};

struct GroupData {
  Persistent<Function> connectionHandler, messageHandler, disconnectionHandler,
      pingHandler, pongHandler, errorHandler, httpRequestHandler,
      httpUpgradeHandler, httpCancelledRequestCallback;
  int size = 0;
};

template <bool isServer>
void createGroup(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group = hub.createGroup<isServer>(
      args[0].As<Integer>()->Value(), args[1].As<Integer>()->Value());
  group->setUserData(new GroupData);
  args.GetReturnValue().Set(External::New(args.GetIsolate(), group));
}

template <bool isServer>
void deleteGroup(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  delete (GroupData *)group->getUserData();
  delete group;
}

template <bool isServer>
inline Local<External> wrapSocket(cWS::WebSocket<isServer> *webSocket,
                                  Isolate *isolate) {
  return External::New(isolate, webSocket);
}

template <bool isServer>
inline cWS::WebSocket<isServer> *unwrapSocket(Local<External> external) {
  return (cWS::WebSocket<isServer> *)external->Value();
}

inline Local<Value> wrapMessage(const char *message, size_t length,
                                cWS::OpCode opCode, Isolate *isolate) {

  if (opCode == cWS::OpCode::BINARY) {
    return (Local<Value>)ArrayBuffer::New(isolate, (char *)message, length);
  }

  #if NODE_MAJOR_VERSION >= 13
    return (Local<Value>)String::NewFromUtf8(isolate, message, NewStringType::kNormal, length).ToLocalChecked();
  #else
    return (Local<Value>)String::NewFromUtf8(isolate, message, String::kNormalString, length);
  #endif
}

template <bool isServer>
inline Local<Value> getDataV8(cWS::WebSocket<isServer> *webSocket,
                              Isolate *isolate) {
  return webSocket->getUserData()
             ? Local<Value>::New(isolate,
                                 *(Persistent<Value> *)webSocket->getUserData())
             : Local<Value>::Cast(Undefined(isolate));
}

template <bool isServer>
void getUserData(const FunctionCallbackInfo<Value> &args) {
  args.GetReturnValue().Set(getDataV8(
      unwrapSocket<isServer>(args[0].As<External>()), args.GetIsolate()));
}

template <bool isServer>
void clearUserData(const FunctionCallbackInfo<Value> &args) {
  cWS::WebSocket<isServer> *webSocket =
      unwrapSocket<isServer>(args[0].As<External>());
  ((Persistent<Value> *)webSocket->getUserData())->Reset();
  delete (Persistent<Value> *)webSocket->getUserData();
}

template <bool isServer>
void setUserData(const FunctionCallbackInfo<Value> &args) {
  cWS::WebSocket<isServer> *webSocket =
      unwrapSocket<isServer>(args[0].As<External>());
  if (webSocket->getUserData()) {
    ((Persistent<Value> *)webSocket->getUserData())
        ->Reset(args.GetIsolate(), args[1]);
  } else {
    webSocket->setUserData(new Persistent<Value>(args.GetIsolate(), args[1]));
  }
}

template <bool isServer>
void getAddress(const FunctionCallbackInfo<Value> &args) {
  typename cWS::WebSocket<isServer>::Address address =
      unwrapSocket<isServer>(args[0].As<External>())->getAddress();
  Local<Array> array = Array::New(args.GetIsolate(), 3);

  #if NODE_MAJOR_VERSION >= 13
    array->Set(args.GetIsolate()->GetCurrentContext(), 0, Integer::New(args.GetIsolate(), address.port));
    array->Set(args.GetIsolate()->GetCurrentContext(), 1, String::NewFromUtf8(args.GetIsolate(), address.address).ToLocalChecked());
    array->Set(args.GetIsolate()->GetCurrentContext(), 2, String::NewFromUtf8(args.GetIsolate(), address.family).ToLocalChecked());
  #else
    array->Set(0, Integer::New(args.GetIsolate(), address.port));
    array->Set(1, String::NewFromUtf8(args.GetIsolate(), address.address));
    array->Set(2, String::NewFromUtf8(args.GetIsolate(), address.family));
  #endif

  args.GetReturnValue().Set(array);
}

uv_handle_t *getTcpHandle(void *handleWrap) {
  volatile char *memory = (volatile char *)handleWrap;
  for (volatile uv_handle_t *tcpHandle = (volatile uv_handle_t *)memory;
       tcpHandle->type != UV_TCP || tcpHandle->data != handleWrap ||
       tcpHandle->loop != uv_default_loop();
       tcpHandle = (volatile uv_handle_t *)memory) {
    memory++;
  }
  return (uv_handle_t *)memory;
}

struct SendCallbackData {
  Persistent<Function> jsCallback;
  Isolate *isolate;
};

template <bool isServer>
void sendCallback(cWS::WebSocket<isServer> *webSocket, void *data,
                  bool cancelled, void *reserved) {
  SendCallbackData *sc = (SendCallbackData *)data;
  if (!cancelled) {
    HandleScope hs(sc->isolate);
    node::MakeCallback(sc->isolate, sc->isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(sc->isolate, sc->jsCallback), 0,
                       nullptr);
  }
  sc->jsCallback.Reset();
  delete sc;
}

template <bool isServer>
void send(const FunctionCallbackInfo<Value> &args) {
  cWS::OpCode opCode = (cWS::OpCode)args[2].As<Integer>()->Value();
  NativeString nativeString(args.GetIsolate(), args[1]);

  SendCallbackData *sc = nullptr;
  void (*callback)(cWS::WebSocket<isServer> *, void *, bool, void *) = nullptr;

  if (args[3]->IsFunction()) {
    callback = sendCallback;
    sc = new SendCallbackData;
    sc->jsCallback.Reset(args.GetIsolate(), Local<Function>::Cast(args[3]));
    sc->isolate = args.GetIsolate();
  }

  bool compress = args[4].As<Boolean>()->Value();

  unwrapSocket<isServer>(args[0].As<External>())
      ->send(nativeString.getData(), nativeString.getLength(), opCode, callback,
             sc, compress);
}

void connect(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::CLIENT> *clientGroup =
      (cWS::Group<cWS::CLIENT> *)args[0].As<External>()->Value();
  NativeString uri(args.GetIsolate(), args[1]);
  hub.connect(std::string(uri.getData(), uri.getLength()),
              new Persistent<Value>(args.GetIsolate(), args[2]), {}, 5000,
              clientGroup);
}

struct Ticket {
  uv_os_sock_t fd;
  SSL *ssl;
};

void upgrade(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::SERVER> *serverGroup =
      (cWS::Group<cWS::SERVER> *)args[0].As<External>()->Value();
  Ticket *ticket = (Ticket *)args[1].As<External>()->Value();
  Isolate *isolate = args.GetIsolate();
  NativeString secKey(isolate, args[2]);
  NativeString extensions(isolate, args[3]);
  NativeString subprotocol(isolate, args[4]);

  // todo: move this check into core!
  if (ticket->fd != INVALID_SOCKET) {
    hub.upgrade(ticket->fd, secKey.getData(), ticket->ssl, extensions.getData(),
                extensions.getLength(), subprotocol.getData(),
                subprotocol.getLength(), serverGroup);
  } else {
    if (ticket->ssl) {
      SSL_free(ticket->ssl);
    }
  }
  delete ticket;
}

void transfer(const FunctionCallbackInfo<Value> &args) {
  // (_handle.fd OR _handle), SSL
  uv_handle_t *handle = nullptr;
  Ticket *ticket = new Ticket;
  if (args[0]->IsObject()) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();

    uv_fileno((handle = getTcpHandle(
                   args[0]->ToObject(context).ToLocalChecked()->GetAlignedPointerFromInternalField(0))),
              (uv_os_fd_t *)&ticket->fd);
  } else {
    ticket->fd = args[0].As<Integer>()->Value();
  }

  ticket->fd = dup(ticket->fd);
  ticket->ssl = nullptr;
  if (args[1]->IsExternal()) {
    ticket->ssl = (SSL *)args[1].As<External>()->Value();
    SSL_up_ref(ticket->ssl);
  }

  // uv_close calls shutdown if not set on Windows
  if (handle) {
    // UV_HANDLE_SHARED_TCP_SOCKET
    handle->flags |= 0x40000000;
  }

  args.GetReturnValue().Set(External::New(args.GetIsolate(), ticket));
}

template <bool isServer>
void onConnection(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *connectionCallback = &groupData->connectionHandler;
  connectionCallback->Reset(isolate, Local<Function>::Cast(args[1]));
  group->onConnection(
      [isolate, connectionCallback, groupData](
          cWS::WebSocket<isServer> *webSocket, cWS::HttpRequest req) {
        groupData->size++;
        HandleScope hs(isolate);
        Local<Value> argv[] = {wrapSocket(webSocket, isolate)};
        node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                           Local<Function>::New(isolate, *connectionCallback),
                           1, argv);
      });
}

template <bool isServer>
void onMessage(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *messageCallback = &groupData->messageHandler;

  messageCallback->Reset(isolate, Local<Function>::Cast(args[1]));
  group->onMessage([isolate, messageCallback, group](
                       cWS::WebSocket<isServer> *webSocket, const char *message,
                       size_t length, cWS::OpCode opCode) {
    if(length == 1 && message[0] == 65) {
      // emit pong event if we get pong from the client
      group->pongHandler(webSocket, nullptr, 0);
    } else {
      HandleScope hs(isolate);
      Local<Value> argv[] = {wrapMessage(message, length, opCode, isolate),
                            getDataV8(webSocket, isolate)};
      Local<Function>::New(isolate, *messageCallback)
          ->Call(isolate->GetCurrentContext(), Null(isolate), 2, argv);
    }
  });
}

template <bool isServer>
void onPing(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *pingCallback = &groupData->pingHandler;
  pingCallback->Reset(isolate, Local<Function>::Cast(args[1]));
  group->onPing([isolate, pingCallback](cWS::WebSocket<isServer> *webSocket,
                                        const char *message, size_t length) {
    HandleScope hs(isolate);
    Local<Value> argv[] = {
        wrapMessage(message, length, cWS::OpCode::PING, isolate),
        getDataV8(webSocket, isolate)};
    node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(isolate, *pingCallback), 2, argv);
  });
}

template <bool isServer>
void onPong(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *pongCallback = &groupData->pongHandler;
  pongCallback->Reset(isolate, Local<Function>::Cast(args[1]));
  group->onPong([isolate, pongCallback](cWS::WebSocket<isServer> *webSocket,
                                        const char *message, size_t length) {
    HandleScope hs(isolate);
    Local<Value> argv[] = {
        wrapMessage(message, length, cWS::OpCode::PONG, isolate),
        getDataV8(webSocket, isolate)};
    node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(isolate, *pongCallback), 2, argv);
  });
}

template <bool isServer>
void onDisconnection(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *disconnectionCallback =
      &groupData->disconnectionHandler;
  disconnectionCallback->Reset(isolate, Local<Function>::Cast(args[1]));

  group->onDisconnection([isolate, disconnectionCallback, groupData](
                             cWS::WebSocket<isServer> *webSocket, int code,
                             char *message, size_t length) {
    groupData->size--;
    HandleScope hs(isolate);
    Local<Value> argv[] = {
        wrapSocket(webSocket, isolate), Integer::New(isolate, code),
        wrapMessage(message, length, cWS::OpCode::CLOSE, isolate),
        getDataV8(webSocket, isolate)};
    node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(isolate, *disconnectionCallback), 4,
                       argv);
  });
}

void onError(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::CLIENT> *group =
      (cWS::Group<cWS::CLIENT> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();

  Isolate *isolate = args.GetIsolate();
  Persistent<Function> *errorCallback = &groupData->errorHandler;
  errorCallback->Reset(isolate, Local<Function>::Cast(args[1]));

  group->onError([isolate, errorCallback](void *user) {
    HandleScope hs(isolate);
    Local<Value> argv[] = {
        Local<Value>::New(isolate, *(Persistent<Value> *)user)};
    node::MakeCallback(isolate, isolate->GetCurrentContext()->Global(),
                       Local<Function>::New(isolate, *errorCallback), 1, argv);

    ((Persistent<Value> *)user)->Reset();
    delete (Persistent<Value> *)user;
  });
}

template <bool isServer>
void closeSocket(const FunctionCallbackInfo<Value> &args) {
  NativeString nativeString(args.GetIsolate(), args[2]);
  unwrapSocket<isServer>(args[0].As<External>())
      ->close(args[1].As<Integer>()->Value(), nativeString.getData(),
              nativeString.getLength());
}

template <bool isServer>
void terminateSocket(const FunctionCallbackInfo<Value> &args) {
  unwrapSocket<isServer>(args[0].As<External>())->terminate();
}

template <bool isServer>
void closeGroup(const FunctionCallbackInfo<Value> &args) {
  NativeString nativeString(args.GetIsolate(), args[2]);
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  group->close(args[1].As<Integer>()->Value(), nativeString.getData(),
               nativeString.getLength());
}

template <bool isServer>
void terminateGroup(const FunctionCallbackInfo<Value> &args) {
  ((cWS::Group<isServer> *)args[0].As<External>()->Value())->terminate();
}

template <bool isServer>
void broadcast(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<isServer> *group =
      (cWS::Group<isServer> *)args[0].As<External>()->Value();
  cWS::OpCode opCode =
      args[2].As<Boolean>()->Value() ? cWS::OpCode::BINARY : cWS::OpCode::TEXT;
  NativeString nativeString(args.GetIsolate(), args[1]);
  group->broadcast(nativeString.getData(), nativeString.getLength(), opCode, false);
}

template <bool isServer>
void prepareMessage(const FunctionCallbackInfo<Value> &args) {
  cWS::OpCode opCode = (cWS::OpCode)args[1].As<Integer>()->Value();
  NativeString nativeString(args.GetIsolate(), args[0]);
  args.GetReturnValue().Set(External::New(
      args.GetIsolate(),
      cWS::WebSocket<isServer>::prepareMessage(
          nativeString.getData(), nativeString.getLength(), opCode, false)));
}

template <bool isServer>
void sendPrepared(const FunctionCallbackInfo<Value> &args) {
  unwrapSocket<isServer>(args[0].As<External>())
      ->sendPrepared(
          (typename cWS::WebSocket<isServer>::PreparedMessage *)args[1]
              .As<External>()
              ->Value());
}

template <bool isServer>
void finalizeMessage(const FunctionCallbackInfo<Value> &args) {
  cWS::WebSocket<isServer>::finalizeMessage(
      (typename cWS::WebSocket<isServer>::PreparedMessage *)args[0]
          .As<External>()
          ->Value());
}

void forEach(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  cWS::Group<cWS::SERVER> *group =
      (cWS::Group<cWS::SERVER> *)args[0].As<External>()->Value();
  Local<Function> cb = Local<Function>::Cast(args[1]);
  Local<Context> context = isolate->GetCurrentContext();

  group->forEach([isolate, &cb, &context](cWS::WebSocket<cWS::SERVER> *webSocket) {
    Local<Value> argv[] = {getDataV8(webSocket, isolate)};
    cb->Call(context, Null(isolate), 1, argv);
  });
}

void getSize(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::SERVER> *group =
      (cWS::Group<cWS::SERVER> *)args[0].As<External>()->Value();
  GroupData *groupData = (GroupData *)group->getUserData();
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), groupData->size));
}

void startAutoPing(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::SERVER> *group =
      (cWS::Group<cWS::SERVER> *)args[0].As<External>()->Value();

  NativeString nativeString(args.GetIsolate(), args[2]);

  group->startAutoPing(
      args[1].As<Integer>()->Value(),
      nativeString.getData(), nativeString.getLength(), cWS::OpCode::BINARY);
}


void getSSLContext(const FunctionCallbackInfo<Value> &args) {
    Isolate* isolate = args.GetIsolate();
    if(args.Length() < 1 || !args[0]->IsObject()){

      #if NODE_MAJOR_VERSION >= 13
        isolate->ThrowException(Exception::TypeError(
          String::NewFromUtf8(isolate, "Error: One object expected").ToLocalChecked()));
      #else
        isolate->ThrowException(Exception::TypeError(
          String::NewFromUtf8(isolate, "Error: One object expected")));
      #endif

      return;
    }

    Local<Context> context = isolate->GetCurrentContext();
    Local<Object> obj = args[0]->ToObject(context).ToLocalChecked();

    #if NODE_MAJOR_VERSION < 10
      Local<Value> ext = obj->Get(String::NewFromUtf8(isolate, "_external"));
      args.GetReturnValue().Set(ext);
    #else
      TLSWrapSSLGetter* tw;
      ASSIGN_OR_RETURN_UNWRAP(&tw, obj);
      tw->setSSL(args);
    #endif
}

void setNoop(const FunctionCallbackInfo<Value> &args) {
  noop.Reset(args.GetIsolate(), Local<Function>::Cast(args[0]));
}

void listen(const FunctionCallbackInfo<Value> &args) {
  cWS::Group<cWS::SERVER> *group =
      (cWS::Group<cWS::SERVER> *)args[0].As<External>()->Value();
  hub.listen(args[1].As<Integer>()->Value(), nullptr, 0, group);
}

template <bool isServer>
struct Namespace {
  Local<Object> object;
  Namespace(Isolate *isolate) {
    object = Object::New(isolate);
    NODE_SET_METHOD(object, "send", send<isServer>);
    NODE_SET_METHOD(object, "close", closeSocket<isServer>);
    NODE_SET_METHOD(object, "terminate", terminateSocket<isServer>);
    NODE_SET_METHOD(object, "prepareMessage", prepareMessage<isServer>);
    NODE_SET_METHOD(object, "sendPrepared", sendPrepared<isServer>);
    NODE_SET_METHOD(object, "finalizeMessage", finalizeMessage<isServer>);

    Local<Object> group = Object::New(isolate);
    NODE_SET_METHOD(group, "onConnection", onConnection<isServer>);
    NODE_SET_METHOD(group, "onMessage", onMessage<isServer>);
    NODE_SET_METHOD(group, "onDisconnection", onDisconnection<isServer>);

    if (!isServer) {
      NODE_SET_METHOD(group, "onError", onError);
    } else {
      NODE_SET_METHOD(group, "forEach", forEach);
      NODE_SET_METHOD(group, "getSize", getSize);
      NODE_SET_METHOD(group, "startAutoPing", startAutoPing);
      NODE_SET_METHOD(group, "listen", listen);
    }

    NODE_SET_METHOD(group, "onPing", onPing<isServer>);
    NODE_SET_METHOD(group, "onPong", onPong<isServer>);
    NODE_SET_METHOD(group, "create", createGroup<isServer>);
    NODE_SET_METHOD(group, "delete", deleteGroup<isServer>);
    NODE_SET_METHOD(group, "close", closeGroup<isServer>);
    NODE_SET_METHOD(group, "terminate", terminateGroup<isServer>);
    NODE_SET_METHOD(group, "broadcast", broadcast<isServer>);

    #if NODE_MAJOR_VERSION >= 13
      object->Set(isolate->GetCurrentContext(), String::NewFromUtf8(isolate, "group").ToLocalChecked(), group);
    #else
      object->Set(String::NewFromUtf8(isolate, "group"), group);
    #endif
  }
};