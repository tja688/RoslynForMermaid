@echo off
setlocal enabledelayedexpansion

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
set API_URL=http://localhost:5157
set WORKSPACE_ROOT=%LocalAppData%\ArchRadar

set LOG_DIR=%ROOT%\logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TS=%%i
set LOG_FILE=%LOG_DIR%\start-%TS%.log

call :log "BOOT start-archradar"
call :log "ROOT=%ROOT%"
call :log "API_URL=%API_URL%"
call :log "WORKSPACE_ROOT=%WORKSPACE_ROOT%"

set ARCHRADAR_WORKSPACE=%WORKSPACE_ROOT%

where dotnet >nul 2>&1
if errorlevel 1 (
  call :log "ERROR dotnet not found in PATH"
  echo dotnet not found. Install .NET SDK 10.0+ and retry.
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  call :log "ERROR pnpm not found in PATH"
  echo pnpm not found. Install pnpm and retry.
  exit /b 1
)

set CONFIG_PATH=
if exist "%ROOT%\.archradar\config.json" (
  set CONFIG_PATH=%ROOT%\.archradar\config.json
)
if not defined CONFIG_PATH if exist "%ROOT%\archradar.config.json" (
  set CONFIG_PATH=%ROOT%\archradar.config.json
)
if defined CONFIG_PATH (
  call :log "CONFIG_PATH=%CONFIG_PATH%"
) else (
  call :log "CONFIG_PATH=auto (will generate)"
)

if exist "%ROOT%\frontend-ui\.env.local" (
  for /f "tokens=1,2 delims==" %%a in ('findstr /i "^VITE_API_BASE=" "%ROOT%\frontend-ui\.env.local"') do set ENV_BASE=%%b
  if defined ENV_BASE (
    call :log "ENV.VITE_API_BASE=%ENV_BASE%"
    if /i not "%ENV_BASE%"=="%API_URL%" call :log "WARN env.local base differs from API_URL"
  )
)

where code >nul 2>&1
if not errorlevel 1 (
  set ARCHRADAR_EDITOR=code
  set ARCHRADAR_EDITOR_ARGS=-g {file}:{line}:{col}
  call :log "EDITOR=code"
)

call :log "STEP start backend"
start "ArchRadar Backend" cmd /k "cd /d ""%ROOT%"" && dotnet run --project ArchRadar.Api"

call :log "STEP wait for /api/health"
powershell -NoProfile -Command ^
  "$url='%API_URL%/api/health';" ^
  "$ok=$false;" ^
  "for($i=0;$i -lt 30;$i++){" ^
  "  try{" ^
  "    $r=Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 3;" ^
  "    if($r.ok){$ok=$true; break}" ^
  "  } catch { Start-Sleep -Seconds 1 }" ^
  "}" ^
  "if(-not $ok){ exit 1 }"

if errorlevel 1 (
  call :log "ERROR backend health check failed"
  echo Backend did not respond. Check the backend window.
  exit /b 1
)
call :log "OK backend health"

call :log "STEP register project"
powershell -NoProfile -Command ^
  "$body=@{ projectId='archradar-local'; name='ArchRadar Local'; projectRoot='%ROOT%' };" ^
  "if('%CONFIG_PATH%' -ne ''){ $body.configPath='%CONFIG_PATH%' };" ^
  "$body | ConvertTo-Json;" ^
  "Invoke-RestMethod -Method Post -Uri '%API_URL%/api/projects' -ContentType 'application/json' -Body $body | Out-Null"
if errorlevel 1 (
  call :log "ERROR register project failed"
  echo Project registration failed. Check backend logs.
  exit /b 1
)
call :log "OK register project"
call :log "INFO scan is manual; use Start Scan in the UI"

call :log "STEP start frontend"
if not exist "%ROOT%\frontend-ui\node_modules" (
  call :log "STEP pnpm install"
  pushd "%ROOT%\frontend-ui"
  pnpm install
  popd
)

start "ArchRadar Frontend" cmd /k "cd /d ""%ROOT%\frontend-ui"" && set VITE_API_BASE=%API_URL% && pnpm dev"
call :log "STEP open browser"
start "" "http://localhost:5173/"
call :log "STEP proxy health check"
powershell -NoProfile -Command ^
  "$ok=$false;" ^
  "for($i=0;$i -lt 20;$i++){" ^
  "  try{" ^
  "    $r=Invoke-RestMethod -Method Get -Uri 'http://localhost:5173/api/health' -TimeoutSec 3;" ^
  "    if($r.ok){$ok=$true; break}" ^
  "  } catch { Start-Sleep -Seconds 1 }" ^
  "}" ^
  "if(-not $ok){ exit 1 }"
if errorlevel 1 (
  call :log "ERROR proxy health check failed"
  echo Proxy health check failed. Check Vite logs or VITE_API_BASE.
  exit /b 1
)
call :log "OK proxy health check"
call :log "STEP client health check"
powershell -NoProfile -Command ^
  "$env:VITE_API_BASE='%API_URL%';" ^
  "$url='%API_URL%/api/health';" ^
  "try{ $r=Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 3; Write-Host ('client health ok: ' + $r.version) } catch { Write-Host ('client health failed: ' + $_.Exception.Message); exit 1 }"
if errorlevel 1 (
  call :log "ERROR client health check failed"
  echo Client health check failed. Check backend logs or VITE_API_BASE.
  exit /b 1
)
call :log "OK client health check"
call :log "DONE"
echo Started. Logs: %LOG_FILE%
exit /b 0

:log
echo [%date% %time%] %~1>>"%LOG_FILE%"
echo %~1
exit /b 0
