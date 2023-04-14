@echo off

cmd /c ncc build .\src\main\app.ts -o .\src\main\dist
if not exist .\build mkdir .\build
sed -i 's/..\/..\/scripts/\.\/scripts/g' .\src\main\dist\index.js
cmd /c terser .\src\main\dist\index.js -o .\build\app.mjs -c -m --module
cd .\src\renderer
cmd /c yarn build
cd /d %~dp0
if not exist .\build\scripts mkdir .\build\scripts
xcopy /Y /E /I .\src\scripts .\build\scripts
if not exist .\build\front mkdir .\build\front
xcopy /Y /E /I .\src\renderer\dist .\build\front
if not exist .\build\config mkdir .\build\config
copy .\src\main\config\default.json .\build\config

set NODE_EXE="C:\Program Files\nodejs\node.exe"
IF EXIST %NODE_EXE% (
    copy %NODE_EXE% .\build
) else (
    echo ERROR: Node's runtime executable could not be found at the default location: %NODE_EXE%
    exit /b 1
)

setlocal enabledelayedexpansion

set HTTPSERVER_VERSION=14.1.1
set HTTPSERVER_RELEASE_URL=https://github.com/http-party/http-server/archive/refs/tags/v!HTTPSERVER_VERSION!.tar.gz
set HTTPSERVER_ZIP_FILE=%~dp0release\http-server-v!HTTPSERVER_VERSION!.tar.gz
set HTTPSERVER_EXTRACTION_FOLDER=%~dp0release-assets
set HTTPSERVER_EXTRACTED_AS=!HTTPSERVER_EXTRACTION_FOLDER!\http-server-!HTTPSERVER_VERSION!
set HTTPSERVER_EXE=%~dp0build\front\http-server

if not exist "%HTTPSERVER_EXE%" (
    if not exist "%HTTPSERVER_EXTRACTION_FOLDER%" mkdir -p "%HTTPSERVER_EXTRACTION_FOLDER%"
    curl -L "%HTTPSERVER_RELEASE_URL%" -o "%HTTPSERVER_ZIP_FILE%"
    tar --force-local -zxvf "%HTTPSERVER_ZIP_FILE%" -C ./release-assets
    del %HTTPSERVER_ZIP_FILE%
    cd %HTTPSERVER_EXTRACTED_AS%
    cmd /c npm install
    cmd /c ncc build .\bin\http-server -o .\dist
    cd /d %~dp0
    copy !HTTPSERVER_EXTRACTED_AS!\dist\index.js .\build\front
    ren .\build\front\index.js http-server
    rmdir /s /q %HTTPSERVER_EXTRACTED_AS%
    cmd /c terser .\build\front\http-server -o .\build\front\http-server -c -m
)

endlocal