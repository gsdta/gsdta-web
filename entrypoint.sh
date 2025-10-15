#!/bin/sh
set -eu

API_BIN="/app/api"
NEXT_CMD="node /app/server.js"

API_PORT="${API_PORT:-8080}"
export API_PORT

# Start Go API
$API_BIN &
PID_API=$!
echo "Started Go API (pid=$PID_API) on :$API_PORT"

# Start Next.js server
$NEXT_CMD &
PID_NEXT=$!
echo "Started Next.js (pid=$PID_NEXT) on :${PORT:-3000}"

term_handler() {
  echo "Shutting down..."
  kill -TERM "$PID_NEXT" 2>/dev/null || true
  kill -TERM "$PID_API" 2>/dev/null || true
}

trap term_handler INT TERM

# Monitor both processes; exit if either exits
while kill -0 "$PID_API" 2>/dev/null && kill -0 "$PID_NEXT" 2>/dev/null; do
  sleep 1
done

# Determine which exited and exit accordingly
if ! kill -0 "$PID_API" 2>/dev/null; then
  echo "Go API process exited; stopping Next.js"
  kill -TERM "$PID_NEXT" 2>/dev/null || true
  wait "$PID_NEXT" 2>/dev/null || true
  exit 1
fi

if ! kill -0 "$PID_NEXT" 2>/dev/null; then
  echo "Next.js process exited; stopping Go API"
  kill -TERM "$PID_API" 2>/dev/null || true
  wait "$PID_API" 2>/dev/null || true
  exit 1
fi

