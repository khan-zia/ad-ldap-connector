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
copy .\src\renderer\assets\logo.png .\build\front\assets\logo.png
if not exist .\build\config mkdir .\build\config
copy .\src\main\config\default.example.json .\build\config\default.json
if not exist .\build\bin mkdir .\build\bin
copy .\static-server.cmd .\build\bin\start.cmd

set NODE_EXE="C:\Program Files\nodejs\node.exe"
IF EXIST %NODE_EXE% (
    copy %NODE_EXE% .\build\bin\
) else (
    echo ERROR: Node's runtime executable could not be found at the default location: %NODE_EXE%
    exit /b 1
)

setlocal enabledelayedexpansion

set EXTRACTION_FOLDER=%~dp0build-time-assets
if exist "%EXTRACTION_FOLDER%" rmdir /s /q "%EXTRACTION_FOLDER%"
mkdir "%EXTRACTION_FOLDER%"

set HTTPSERVER_VERSION=14.1.1
set HTTPSERVER_RELEASE_URL=https://github.com/http-party/http-server/archive/refs/tags/v!HTTPSERVER_VERSION!.tar.gz
set HTTPSERVER_ZIP_FILE=!EXTRACTION_FOLDER!\http-server-v!HTTPSERVER_VERSION!.tar.gz
set HTTPSERVER_EXTRACTED_AS=!EXTRACTION_FOLDER!\http-server-!HTTPSERVER_VERSION!
set HTTPSERVER_EXE=%~dp0build\bin\http-server

if not exist "%HTTPSERVER_EXE%" (
    curl -L "%HTTPSERVER_RELEASE_URL%" -o "%HTTPSERVER_ZIP_FILE%"
    tar --force-local -zxvf "%HTTPSERVER_ZIP_FILE%" -C ./build-time-assets
    cd %HTTPSERVER_EXTRACTED_AS%
    cmd /c npm install
    cmd /c ncc build .\bin\http-server -o .\dist
    cd /d %~dp0
    copy !HTTPSERVER_EXTRACTED_AS!\dist\index.js .\build\bin
    ren .\build\bin\index.js http-server
    cmd /c terser .\build\bin\http-server -o .\build\bin\http-server -c -m
)

set NSSM_EXE=%~dp0build\bin\nssm.exe
set NSSM_VERSION=2.24
set NSSM_RELEASE_URL=http://nssm.cc/release/nssm-!NSSM_VERSION!.zip
set NSSM_ZIP=!EXTRACTION_FOLDER!\nssm-!NSSM_VERSION!.zip
set NSSM_EXTRACTED_AS=!EXTRACTION_FOLDER!\nssm-!NSSM_VERSION!

if not exist "%NSSM_EXE%" (
    curl -L "%NSSM_RELEASE_URL%" -o "%NSSM_ZIP%"
    PowerShell -Command "Expand-Archive -LiteralPath '%NSSM_ZIP%' -DestinationPath '%EXTRACTION_FOLDER%'"
    copy !NSSM_EXTRACTED_AS!\win32\nssm.exe .\build\bin\
)

rmdir /s /q %EXTRACTION_FOLDER%

endlocal