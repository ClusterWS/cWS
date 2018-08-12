CPP_SHARED := -DUSE_LIBUV -std=c++11 -O3 -I ./src -shared -fPIC ./src/Extensions.cpp ./src/Group.cpp ./src/Networking.cpp ./src/Hub.cpp ./src/Node.cpp ./src/WebSocket.cpp ./src/HTTPSocket.cpp ./src/Socket.cpp ./src/Epoll.cpp ./src/Addon.cpp
CPP_OSX := -stdlib=libc++ -mmacosx-version-min=10.7 -undefined dynamic_lookup

default:
	make targets
	NODE=targets/node-v8.11.3 ABI=57 make `(uname -s)`
	NODE=targets/node-v9.11.2 ABI=59 make `(uname -s)`
	NODE=targets/node-v10.8.0 ABI=64 make `(uname -s)`
	for f in dist/*.node; do chmod +x $$f; done
targets:
	mkdir targets
	curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-headers.tar.gz | tar xz -C targets
	curl https://nodejs.org/dist/v9.11.2/node-v9.11.2-headers.tar.gz | tar xz -C targets
	curl https://nodejs.org/dist/v10.8.0/node-v10.8.0-headers.tar.gz | tar xz -C targets
Linux:
	g++ $(CPP_SHARED) -static-libstdc++ -static-libgcc -I $$NODE/include/node -s -o dist/uws_linux_$$ABI.node
Darwin:
	g++ $(CPP_SHARED) $(CPP_OSX) -I $$NODE/include/node -o dist/uws_darwin_$$ABI.node
.PHONY: clean
clean: