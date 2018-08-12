call "%VS140COMNTOOLS%..\..\vc\vcvarsall.bat" amd64

if not exist targets (
  mkdir targets
  curl https://nodejs.org/dist/v8.11.3/node-v8.11.3-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/v8.11.3/win-x64/node.lib > targets/node-v8.11.3/node.lib
  curl https://nodejs.org/dist/v9.11.2/node-v9.11.2-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/v9.11.2/win-x64/node.lib > targets/node-v9.11.2/node.lib
  curl https://nodejs.org/dist/v10.8.0/node-v10.8.0-headers.tar.gz | tar xz -C targets
  curl https://nodejs.org/dist/v10.8.0/win-x64/node.lib > targets/node-v10.8.0/node.lib
)

cl /I targets/node-v8.11.3/include/node /EHsc /Ox /LD /Fedist/uws_win32_57.node src/*.cpp targets/node-v8.11.3/node.lib
cl /I targets/node-v9.11.2/include/node /EHsc /Ox /LD /Fedist/uws_win32_59.node src/*.cpp targets/node-v9.11.2/node.lib
cl /I targets/node-v10.8.0/include/node /EHsc /Ox /LD /Fedist/uws_win32_64.node src/*.cpp targets/node-v10.8.0/node.lib

del ".\*.obj"
del ".\dist\*.exp"
del ".\dist\*.lib"