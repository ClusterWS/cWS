call "%VS140COMNTOOLS%..\..\vc\vcvarsall.bat" amd64

set v57=v8.12.0
set v59=v9.11.2
set v64=v10.10.0
set v67=v11.0.0
set v72=v12.0.0

if not exist targets (
  mkdir targets
  curl https://nodejs.org/dist/%v57%/node-%v57%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v57%/win-x64/node.lib > targets/node-%v57%/node.lib
  curl https://nodejs.org/dist/%v59%/node-%v59%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v59%/win-x64/node.lib > targets/node-%v59%/node.lib
  curl https://nodejs.org/dist/%v64%/node-%v64%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v64%/win-x64/node.lib > targets/node-%v64%/node.lib
  curl https://nodejs.org/dist/%v67%/node-%v67%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v67%/win-x64/node.lib > targets/node-%v67%/node.lib
  curl https://nodejs.org/dist/%v72%/node-%v72%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v72%/win-x64/node.lib > targets/node-%v72%/node.lib
)

cl /I targets/node-%v57%/include/node /EHsc /Ox /LD /Fedist/cws_win32_57.node src/*.cpp targets/node-%v57%/node.lib
cl /I targets/node-%v59%/include/node /EHsc /Ox /LD /Fedist/cws_win32_59.node src/*.cpp targets/node-%v59%/node.lib
cl /I targets/node-%v64%/include/node /I targets/node-%v64%/deps/uv/include /I targets/node-%v64%/deps/v8/include /I targets/node-%v64%/deps/openssl/openssl/include /I targets/node-%v64%/deps/zlib /EHsc /Ox /LD /Fedist/cws_win32_64.node src/*.cpp targets/node-%v64%/node.lib
cl /I targets/node-%v67%/include/node /I targets/node-%v67%/deps/uv/include /I targets/node-%v67%/deps/v8/include /I targets/node-%v67%/deps/openssl/openssl/include /I targets/node-%v67%/deps/zlib /EHsc /Ox /LD /Fedist/cws_win32_67.node src/*.cpp targets/node-%v67%/node.lib
cl /I targets/node-%v72%/include/node /I targets/node-%v72%/deps/uv/include /I targets/node-%v72%/deps/v8/include /I targets/node-%v72%/deps/openssl/openssl/include /I targets/node-%v72%/deps/zlib /EHsc /Ox /LD /Fedist/cws_win32_72.node src/*.cpp targets/node-%v72%/node.lib

del ".\*.obj"
del ".\dist\*.exp"
del ".\dist\*.lib"