@echo off
set "arguments=%*"
@start /b /wait powershell.exe -c "& {Start-Process powershell.exe -ArgumentList '%arguments%' -WindowStyle Hidden -Wait}"