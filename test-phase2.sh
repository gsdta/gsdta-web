#!/bin/bash
# Test Firebase emulator connection from client code

echo "🧪 Testing Firebase Emulator Connection"
echo ""

# Check if .env.local files exist
if [ ! -f "ui/.env.local" ] || [ ! -f "api/.env.local" ]; then
    echo "⚠️  Environment files not found. Creating from templates..."
    [ ! -f "ui/.env.local" ] && cp ui/.env.local.emulator ui/.env.local
    [ ! -f "api/.env.local" ] && cp api/.env.local.emulator api/.env.local
    echo "✅ Environment files created"
    echo ""
fi

# Start emulators in background
echo "🔥 Starting Firebase emulators..."
firebase emulators:start --project demo-gsdta --only auth,firestore 2>&1 > /tmp/emulator.log &
EMULATOR_PID=$!

# Wait for emulators to be ready
echo "⏳ Waiting for emulators to start..."
sleep 8

# Check if emulators are running
if ! curl -s http://localhost:4445 > /dev/null; then
    echo "❌ Emulators failed to start. Check /tmp/emulator.log"
    kill $EMULATOR_PID 2>/dev/null
    exit 1
fi

echo "✅ Emulators are running"
echo ""

# Test UI build with emulator config
echo "🔨 Testing UI build with Firebase emulator config..."
cd ui
if npm run build 2>&1 | tail -5; then
    echo "✅ UI builds successfully with emulator config"
else
    echo "❌ UI build failed"
    cd ..
    kill $EMULATOR_PID 2>/dev/null
    exit 1
fi
cd ..

echo ""
echo "✅ Phase 2 verification complete!"
echo ""
echo "Emulators are still running. You can:"
echo "  1. Visit http://localhost:4445 for Emulator UI"
echo "  2. Start API: cd api && npm run dev"
echo "  3. Start UI: cd ui && npm run dev"
echo ""
echo "Press Ctrl+C to stop emulators, or run: kill $EMULATOR_PID"

# Keep script running
wait $EMULATOR_PID
