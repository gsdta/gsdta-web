@echo off
REM Docker management script for the UI application (Windows)

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
echo   build       Build the production Docker image
echo   build-dev   Build the development Docker image
echo   run         Run the production container
echo   run-dev     Run the development container with hot reloading
echo   stop        Stop all running containers
echo   clean       Remove all containers and images
echo   logs        Show container logs
echo   shell       Open a shell in the running container
echo   help        Show this help message
goto end

:build
echo [INFO] Building production Docker image...
docker build -t gsdta-ui:latest .
if %errorlevel% equ 0 (
    echo [INFO] Production image built successfully!
) else (
    echo [ERROR] Failed to build production image
    exit /b 1
)
goto end

:build_dev
echo [INFO] Building development Docker image...
docker build -f Dockerfile.dev -t gsdta-ui:dev .
if %errorlevel% equ 0 (
    echo [INFO] Development image built successfully!
) else (
    echo [ERROR] Failed to build development image
    exit /b 1
)
goto end

:run
echo [INFO] Starting production container...
docker-compose up -d ui
if %errorlevel% equ 0 (
    echo [INFO] Production container started on http://localhost:3000
) else (
    echo [ERROR] Failed to start production container
    exit /b 1
)
goto end

:run_dev
echo [INFO] Starting development container with hot reloading...
docker-compose --profile dev up -d ui-dev
if %errorlevel% equ 0 (
    echo [INFO] Development container started on http://localhost:3001
) else (
    echo [ERROR] Failed to start development container
    exit /b 1
)
goto end

:stop
echo [INFO] Stopping all containers...
docker-compose down
if %errorlevel% equ 0 (
    echo [INFO] All containers stopped!
) else (
    echo [ERROR] Failed to stop containers
    exit /b 1
)
goto end

:clean
echo [WARNING] This will remove all containers and images. Are you sure? (y/N)
set /p response=
if /i "!response!"=="y" goto do_clean
if /i "!response!"=="yes" goto do_clean
echo [INFO] Cleanup cancelled.
goto end

:do_clean
echo [INFO] Cleaning up containers and images...
docker-compose down --rmi all --volumes --remove-orphans
if %errorlevel% equ 0 (
    echo [INFO] Cleanup completed!
) else (
    echo [ERROR] Cleanup failed
    exit /b 1
)
goto end

:logs
docker-compose logs -f
goto end

:shell
for /f %%i in ('docker-compose ps -q ui') do set container_id=%%i
if "!container_id!"=="" (
    echo [ERROR] No running production container found. Start it first with: %0 run
    exit /b 1
)
docker exec -it !container_id! /bin/sh
goto end

:end
