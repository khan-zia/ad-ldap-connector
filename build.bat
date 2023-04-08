@echo off
cmd /c ncc build .\src\main\app.ts -o .\src\main\dist
if not exist .\build mkdir .\build
copy .\src\main\dist\index.js .\build\index.js
cd .\src\renderer
cmd /c yarn build
cd /d %~dp0
if not exist .\build\scripts mkdir .\build\scripts
xcopy /E /I .\src\scripts .\build\scripts
if not exist .\build\front mkdir .\build\front
xcopy /E /I .\src\renderer\dist .\build\front
if not exist .\build\config mkdir .\build\config
copy .\src\main\config\default.json .\build\config