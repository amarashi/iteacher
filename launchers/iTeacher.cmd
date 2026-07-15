@echo off
rem iTeacher double-click launcher for Windows (#11).
rem Boots the built local server and opens the default browser at the served URL.
rem Non-technical use: double-click this file — no terminal knowledge needed.

setlocal
rem Project root is this script's parent folder (launchers\ sits under the root).
set "ROOT=%~dp0.."
cd /d "%ROOT%"

rem Port the server serves on (matches main.ts default). A PORT env var overrides.
set "IPORT=%PORT%"
if "%IPORT%"=="" set "IPORT=4173"

rem --- Locate Node ---------------------------------------------------------
rem Node here is managed by fnm, which only adds node to PATH inside a shell it
rem has initialised. A bare Explorer double-click has no such PATH, so we must
rem find node ourselves. fnm keeps a stable symlink to the default version at
rem %APPDATA%\fnm\aliases\default\node.exe — prefer PATH, fall back to that.
set "NODE=node"
where node >nul 2>nul || set "NODE=%APPDATA%\fnm\aliases\default\node.exe"

if not exist "%NODE%" if "%NODE%"=="node" goto :nonode
if not "%NODE%"=="node" if not exist "%NODE%" goto :nonode

rem --- Build the server ----------------------------------------------------
rem Always compile, so a double-click after any code change runs the NEW build
rem rather than a stale dist. --incremental makes an unchanged rebuild
rem near-instant (buildinfo lives in the gitignored dist\), so repeat launches
rem stay fast — the cost is only paid when sources actually changed.
echo Building iTeacher...
"%NODE%" "node_modules\typescript\bin\tsc" -p tsconfig.json --incremental --tsBuildInfoFile "dist\.tsbuildinfo" || (echo Build failed. & pause & exit /b 1)

rem --- Replace any server already holding the port -------------------------
rem A server left running from a previous launch keeps the port, and main.ts
rem defers to a busy port (it opens the browser at the existing instance) — so
rem an old server would serve stale code even after a rebuild. Stop whatever is
rem listening on the port first, so the fresh build binds it and the browser
rem shows current code. (Only listening sockets on this exact port are matched.)
for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /c:"LISTENING" ^| findstr /c:":%IPORT% "') do taskkill /f /pid %%P >nul 2>nul

rem --open tells the server to open the browser once it is actually listening.
set "PORT=%IPORT%"
"%NODE%" dist\server\main.js --open
goto :eof

:nonode
echo Could not find Node.js.
echo Install it, or open a terminal and run this launcher from there.
pause
exit /b 1
