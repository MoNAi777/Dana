@echo off
echo Starting DocMerger application...
echo.

echo Starting server in a new window...
start cmd /k "cd /d "%~dp0server" & npm start"

timeout /t 5

echo Starting client in a new window...
start cmd /k "cd /d "%~dp0client" & npm start"

echo.
echo Application started!
echo Server running at: http://localhost:5000
echo Client running at: http://localhost:3000
echo.
echo You can close this window, but keep the server and client windows open. 