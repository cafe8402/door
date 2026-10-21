@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000) } catch { $client.Dispose(); exit 0 }; $client.Dispose(); try { $page = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/' -TimeoutSec 3; if ($page.Content.Contains('mundansok-local-app')) { exit 10 } } catch {}; exit 11"
set "TASK_SERVER_STATE=%ERRORLEVEL%"
if /i "%~1"=="--check" exit /b %TASK_SERVER_STATE%
if "%TASK_SERVER_STATE%"=="10" goto already_running
if "%TASK_SERVER_STATE%"=="11" goto port_in_use
if not "%TASK_SERVER_STATE%"=="0" goto check_failed
where npm.cmd >nul 2>nul
if not errorlevel 1 goto npm
set "TASK_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if exist "%TASK_PNPM%" goto pnpm
echo Node.js 24 LTS or newer is required. Install Node.js from https://nodejs.org
pause
exit /b 1
:npm
if not exist node_modules\vite\bin\vite.js (
  call npm.cmd install
  if errorlevel 1 goto failed
)
echo Open http://127.0.0.1:3000 in your browser. Press Ctrl+C to stop.
call npm.cmd run dev
goto end
:pnpm
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
if not exist node_modules\vite\bin\vite.js (
  call "%TASK_PNPM%" install --frozen-lockfile
  if errorlevel 1 goto failed
)
echo Open http://127.0.0.1:3000 in your browser. Press Ctrl+C to stop.
call "%TASK_PNPM%" run dev
goto end
:already_running
echo Mundansok is already running. Opening the existing app.
start "" "http://127.0.0.1:3000/"
exit /b 0
:port_in_use
echo Port 3000 is being used by a different application.
echo Close that application and run start.cmd again.
pause
exit /b 1
:check_failed
echo Unable to check the local server. Open http://127.0.0.1:3000 in your browser.
pause
exit /b 1
:failed
echo Dependency installation failed. Check your internet connection and retry.
:end
pause
