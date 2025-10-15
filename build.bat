@echo off
setlocal
REM Build script for GSDTA monorepo

if "%1"=="" goto :all
if "%1"=="api" goto :api
if "%1"=="ui" goto :ui
goto :usage

:all
echo Building entire monorepo...
echo.
echo ========================================
echo Building API
echo ========================================
cd api
call scripts\build.bat
if %ERRORLEVEL% NEQ 0 (
  echo API build failed!
  exit /b 1
)
cd ..
echo.
echo ========================================
echo Building UI
echo ========================================
cd ui
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo UI build failed!
  exit /b 1
)
cd ..
echo.
echo Build complete!
goto :end

:api
echo Building API...
cd api
call scripts\build.bat
goto :end

:ui
echo Building UI...
cd ui
call npm run build
goto :end

:usage
echo Usage: build.bat [api^|ui]
echo.
echo   (no args) - Build both API and UI
echo   api       - Build API binary only
echo   ui        - Build UI only
goto :end

:end
@echo off
setlocal
REM Development helper script for GSDTA monorepo

if "%1"=="" goto :usage
if "%1"=="api" goto :api
if "%1"=="ui" goto :ui
if "%1"=="both" goto :both
goto :usage

:api
echo Starting API development server...
cd api
call scripts\dev.bat
goto :end

:ui
echo Starting UI development server...
cd ui
call npm run dev
goto :end

:both
echo Starting both API and UI in Docker dev mode...
docker-compose --profile dev up
goto :end

:usage
echo Usage: dev.bat [api^|ui^|both]
echo.
echo   api   - Start API development server (localhost:8080)
echo   ui    - Start UI development server (localhost:3000)
echo   both  - Start both in Docker with hot reload (UI on :3001)
echo.
echo Examples:
echo   dev.bat api     # Run API only
echo   dev.bat ui      # Run UI only
echo   dev.bat both    # Run both in Docker
goto :end

:end

