@echo off
rem iTeacher double-click launcher for Windows (#11).
rem Boots the built local server and opens the default browser at the served URL.
rem Non-technical use: double-click this file — no terminal knowledge needed.

setlocal
rem Project root is this script's parent folder (launchers\ sits under the root).
set "ROOT=%~dp0.."
cd /d "%ROOT%"

rem --- Locate Node ---------------------------------------------------------
rem Node here is managed by fnm, which only adds node to PATH inside a shell it
rem has initialised. A bare Explorer double-click has no such PATH, so we must
rem find node ourselves. fnm keeps a stable symlink to the default version at
rem %APPDATA%\fnm\aliases\default\node.exe — prefer PATH, fall back to that.
set "NODE=node"
where node >nul 2>nul || set "NODE=%APPDATA%\fnm\aliases\default\node.exe"

if not exist "%NODE%" if "%NODE%"=="node" goto :nonode
if not "%NODE%"=="node" if not exist "%NODE%" goto :nonode

rem --- Build once if the compiled server isn't there yet --------------------
if not exist "dist\server\main.js" (
  echo Building iTeacher for first use...
  rem Compile with the project-local TypeScript via node — avoids needing pnpm
  rem on PATH, which (like node) is absent from a bare Explorer environment.
  "%NODE%" "node_modules\typescript\bin\tsc" -p tsconfig.json || (echo Build failed. & pause & exit /b 1)
)

rem --open tells the server to open the browser once it is actually listening.
"%NODE%" dist\server\main.js --open
goto :eof

:nonode
echo Could not find Node.js.
echo Install it, or open a terminal and run this launcher from there.
pause
exit /b 1
