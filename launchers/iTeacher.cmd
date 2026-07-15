@echo off
rem iTeacher double-click launcher for Windows (#11).
rem Boots the built local server and opens the default browser at the served URL.
rem Non-technical use: double-click this file — no terminal knowledge needed.

setlocal
rem Project root is this script's parent folder (launchers\ sits under the root).
set "ROOT=%~dp0.."
cd /d "%ROOT%"

rem Build once if the compiled server isn't there yet.
if not exist "dist\server\main.js" (
  echo Building iTeacher for first use...
  call pnpm build || (echo Build failed. & pause & exit /b 1)
)

rem --open tells the server to open the browser once it is actually listening.
node dist\server\main.js --open
