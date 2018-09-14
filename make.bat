call "%VS140COMNTOOLS%..\..\vc\vcvarsall.bat" amd64

set v57=v8.1.2
set v59=v9.2.0
set v64=v10.10.0

if not exist targets (
  mkdir targets
  curl https://nodejs.org/dist/%v57%/node-%v57%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v57%/win-x64/node.lib > targets/node-%v57%/node.lib
  curl https://nodejs.org/dist/%v59%/node-%v59%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v59%/win-x64/node.lib > targets/node-%v59%/node.lib
  REM download full src
  REM curl https://nodejs.org/dist/%v64%/node-%v64%.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v64%/node-%v64%-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/%v64%/win-x64/node.lib > targets/node-%v64%/node.lib
)

cl /I targets/node-%v57%/include/node /EHsc /Ox /LD /Fedist/uws_win32_57.node dist/src/*.cpp targets/node-%v57%/node.lib
cl /I targets/node-%v59%/include/node /EHsc /Ox /LD /Fedist/uws_win32_59.node dist/src/*.cpp targets/node-%v59%/node.lib
cl /I targets/node-%v64%/src /I targets/node-%v64%/deps/uv/include /I targets/node-%v64%/deps/v8/include /I targets/node-%v64%/deps/openssl/openssl/include /I targets/node-%v64%/deps/zlib /EHsc /Ox /LD /Fedist/uws_win32_64.node dist/src/*.cpp targets/node-%v64%/node.lib

del ".\*.obj"
del ".\dist\*.exp"
del ".\dist\*.lib"