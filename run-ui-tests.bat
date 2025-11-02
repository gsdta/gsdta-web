@echo off
echo Running UI Unit Tests...
cd /d "%~dp0ui"
call npm test -- --passWithNoTests
