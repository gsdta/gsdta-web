@echo off
echo Running API Unit Tests...
cd /d "%~dp0api"
call npm test
