@echo off
setlocal
REM Tidy go.mod/go.sum and vendor if needed

go mod tidy
if %ERRORLEVEL% NEQ 0 (
  echo go mod tidy failed. Ensure Go is installed and on PATH: https://go.dev/dl/
  exit /b 1
)

echo Dependencies tidied.

