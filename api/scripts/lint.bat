@echo off
setlocal
REM Lint code (requires golangci-lint installed and on PATH)
where golangci-lint >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo golangci-lint not found on PATH. Install from https://golangci-lint.run/installation/
  exit /b 0
)

golangci-lint run

