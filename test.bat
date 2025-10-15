@echo off
setlocal
REM Test runner for GSDTA monorepo

if "%1"=="" goto :all
if "%1"=="api" goto :api
if "%1"=="ui" goto :ui
goto :usage

:all
echo Running all tests...
echo.
echo ========================================
echo API Tests
echo ========================================
cd api
call scripts\test.bat
if %ERRORLEVEL% NEQ 0 (
  echo API tests failed!
  exit /b 1
)
cd ..
echo.
echo ========================================
echo UI Tests
echo ========================================
cd ui
call npm test -- --ci
if %ERRORLEVEL% NEQ 0 (
  echo UI tests failed!
  exit /b 1
)
cd ..
echo.
echo All tests passed!
goto :end

:api
echo Running API tests...
cd api
call scripts\test.bat
goto :end

:ui
echo Running UI tests...
cd ui
call npm test
goto :end

:usage
echo Usage: test.bat [api^|ui]
echo.
echo   (no args) - Run all tests (API + UI)
echo   api       - Run API tests only
echo   ui        - Run UI tests only
goto :end

:end

