@echo off
setlocal
REM Start the API server (loads .env via godotenv)
if not exist .env (
  echo .env not found, using defaults from code
)

go run ./cmd/api

