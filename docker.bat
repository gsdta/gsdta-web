@echo off
REM Docker management script for GSDTA Web (UI + API) (Windows)

setlocal enabledelayedexpansion

if "%1"=="" goto usage
if "%1"=="help" goto usage
if "%1"=="--help" goto usage
if "%1"=="-h" goto usage

if "%1"=="build" goto build
if "%1"=="build-dev" goto build_dev
if "%1"=="run" goto run
if "%1"=="run-dev" goto run_dev
if "%1"=="stop" goto stop
if "%1"=="clean" goto clean
if "%1"=="logs" goto logs
if "%1"=="shell" goto shell

echo [ERROR] Unknown command: %1
echo.
goto usage

:usage
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   build       Build the production Docker image (UI + API)
echo   build-dev   Build the development Docker images
echo   run         Run the production container
echo   run-dev     Run the development containers with hot reloading
echo   stop        Stop all running containers
echo   clean       Remove all containers and images
echo   logs        Show container logs
echo   shell       Open a shell in the running container
echo   help        Show this help message
goto end

:build
echo [INFO] Building production Docker image (UI + API)...
docker build -t gsdta-web:latest .
if %errorlevel% equ 0 (
    echo [INFO] Production image built successfully!
) else (
    echo [ERROR] Failed to build production image
    exit /b 1
)
goto end

:build_dev
echo [INFO] Building development Docker images...
docker-compose --profile dev build
if %errorlevel% equ 0 (
    echo [INFO] Development images built successfully!
) else (
    echo [ERROR] Failed to build development images
    exit /b 1
)
goto end

:run
echo [INFO] Running production container...
docker-compose up -d ui
echo [INFO] Container started! Access at http://localhost:3000
goto end

:run_dev
echo [INFO] Running development containers...
docker-compose --profile dev up -d
echo [INFO] Development containers started! Access UI at http://localhost:3001
goto end

:stop
echo [INFO] Stopping containers...
docker-compose down
docker-compose --profile dev down
echo [INFO] All containers stopped
goto end

:clean
echo [INFO] Cleaning up containers and images...
docker-compose down -v --rmi local
docker-compose --profile dev down -v --rmi local
echo [INFO] Cleanup complete
goto end

:logs
echo [INFO] Showing container logs (Ctrl+C to exit)...
docker-compose logs -f
goto end

:shell
echo [INFO] Opening shell in running container...
docker-compose exec ui sh
goto end

:end
endlocal
