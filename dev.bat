@echo off
setlocal
REM Development helper script for GSDTA

if "%1"=="" goto :ui
if "%1"=="ui" goto :ui
goto :usage

:ui
echo Starting UI development server...
cd ui
call npm run dev
goto :end

:usage
echo Usage: dev.bat [ui]
echo.
echo   (no args) - Start UI development server (localhost:3000)
echo   ui        - Start UI development server (localhost:3000)
echo.
echo Examples:
echo   dev.bat       # Run UI
echo   dev.bat ui    # Run UI
goto :end

:end

