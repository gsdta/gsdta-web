@echo off
setlocal ENABLEDELAYEDEXPANSION
REM Build the API binary into bin\api.exe with version metadata
if not exist bin mkdir bin

REM Resolve VERSION from git describe (fallback: dev)
for /f %%i in ('git describe --tags --always 2^>NUL') do set VERSION=%%i
if "%VERSION%"=="" set VERSION=dev

REM Resolve COMMIT from git rev-parse (fallback: none)
for /f %%i in ('git rev-parse --short HEAD 2^>NUL') do set COMMIT=%%i
if "%COMMIT%"=="" set COMMIT=none

REM Build time in UTC ISO8601 via PowerShell
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"`) do set BUILDTIME=%%i

set PKG=github.com/gsdta/api
set LDFLAGS=-X %PKG%/internal/version.Version=%VERSION% -X %PKG%/internal/version.Commit=%COMMIT% -X %PKG%/internal/version.BuildTime=%BUILDTIME%

go build -ldflags "%LDFLAGS%" -o bin\api.exe ./cmd/api
if %ERRORLEVEL% NEQ 0 (
  echo Build failed. Ensure Go is installed and on PATH: https://go.dev/dl/
  exit /b 1
)

echo Built bin\api.exe (version=%VERSION%, commit=%COMMIT%, buildTime=%BUILDTIME%)
