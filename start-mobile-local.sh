#!/bin/bash
set -e

echo "📱 Starting GSDTA Mobile Development Stack"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get local IP for mobile to connect
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo -e "${BLUE}📍 Your local IP: ${LOCAL_IP}${NC}"
echo ""

# Kill any processes blocking ports
echo "🔍 Checking for processes blocking ports..."
for port in 4445 8889 9099 4400 8080 8081; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "   Killing process $pid on port $port..."
        kill -9 $pid 2>/dev/null || true
    fi
done
echo -e "${GREEN}✅ Ports cleared${NC}"
echo ""

# Ensure mobile .env exists
if [ ! -f "mobile/.env" ]; then
    echo "📝 Creating mobile/.env from template..."
    cp mobile/.env.example mobile/.env
    # Update API URL with local IP
    sed -i '' "s|EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=http://${LOCAL_IP}:8080|" mobile/.env
    echo -e "${GREEN}✅ Created mobile/.env${NC}"
else
    # Update existing .env with current IP
    sed -i '' "s|EXPO_PUBLIC_API_BASE_URL=http://[0-9.]*:8080|EXPO_PUBLIC_API_BASE_URL=http://${LOCAL_IP}:8080|" mobile/.env
    echo -e "${GREEN}✅ Updated mobile/.env with current IP${NC}"
fi
echo ""

# Start Firebase emulators in background
echo "🔥 Starting Firebase Emulators..."
pnpm run emulators > /tmp/gsdta-emulators.log 2>&1 &
EMULATOR_PID=$!
echo "   Emulator PID: $EMULATOR_PID"

# Wait for emulators to be ready
echo "   Waiting for emulators to start..."
MAX_WAIT=60
WAITED=0
while ! curl -s http://localhost:4445 > /dev/null 2>&1; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ Emulators failed to start after ${MAX_WAIT}s${NC}"
        echo "   Check logs: cat /tmp/gsdta-emulators.log"
        exit 1
    fi
    echo "   Still waiting... (${WAITED}s)"
done
echo -e "${GREEN}✅ Emulators ready${NC}"
echo ""

# Run seed script
echo "🌱 Seeding test data..."
export FIRESTORE_EMULATOR_HOST=localhost:8889
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Install dependencies if needed (with pnpm hoisted, check root node_modules)
if [ ! -d "node_modules/firebase-admin" ]; then
    echo "   Installing dependencies..."
    pnpm install --frozen-lockfile
fi

# Run seed
(cd scripts && node seed-emulator.js)
echo -e "${GREEN}✅ Seed complete${NC}"
echo ""

# Start API in background
echo "🚀 Starting API Server..."
FIRESTORE_EMULATOR_HOST=localhost:8889 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 pnpm run dev:api > /tmp/gsdta-api.log 2>&1 &
API_PID=$!
echo "   API PID: $API_PID"

# Wait for API to be ready
echo "   Waiting for API to start..."
WAITED=0
while ! curl -s http://localhost:8080/v1/health > /dev/null 2>&1; do
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${YELLOW}⚠️  API may still be starting (no /health endpoint)${NC}"
        break
    fi
done
sleep 3  # Give it a moment to fully initialize
echo -e "${GREEN}✅ API started${NC}"
echo ""

# Print summary
echo "=================================================="
echo -e "${GREEN}🎉 Development Stack Ready!${NC}"
echo "=================================================="
echo ""
echo "📍 Services:"
echo "   Emulator UI:  http://localhost:4445"
echo "   Auth:         localhost:9099"
echo "   Firestore:    localhost:8889"
echo "   API:          http://localhost:8080"
echo ""
echo "📱 Mobile App:"
echo "   API URL:      http://${LOCAL_IP}:8080"
echo ""
echo "👤 Test Users:"
echo "   Admin:        admin@test.com / admin123"
echo "   Teacher:      teacher@test.com / teacher123"
echo "   Parent:       parent@test.com / parent123"
echo ""
echo "📝 Logs:"
echo "   Emulators:    tail -f /tmp/gsdta-emulators.log"
echo "   API:          tail -f /tmp/gsdta-api.log"
echo ""
echo "=================================================="
echo ""

# Start Expo (foreground)
echo "📱 Starting Expo Mobile Server..."
echo "   Press 'i' for iOS Simulator"
echo "   Press 'a' for Android Emulator"
echo "   Press 'w' for Web"
echo ""

cd mobile
npx expo start

# Cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $EMULATOR_PID 2>/dev/null || true
    kill $API_PID 2>/dev/null || true
    echo "✅ Services stopped"
}
trap cleanup EXIT
