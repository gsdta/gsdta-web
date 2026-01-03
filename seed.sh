#!/bin/bash
# Standalone seed script - seeds emulators with test data

echo "🌱 Seeding Firebase Emulators with Test Data"
echo ""

# Check if emulators are running
if ! curl -s http://localhost:4445 > /dev/null 2>&1; then
    echo "❌ Firebase emulators are not running!"
    echo ""
    echo "Please start emulators first:"
    echo "  Option 1: pnpm run emulators"
    echo "  Option 2: firebase emulators:start --project demo-gsdta"
    echo "  Option 3: ./start-dev-local.sh"
    echo ""
    exit 1
fi

echo "✅ Emulators detected at http://localhost:4445"
echo ""

# Check if seed script dependencies are installed (with pnpm hoisted, check root node_modules)
if [ ! -d "node_modules/firebase-admin" ]; then
    echo "📦 Installing dependencies..."
    pnpm install --frozen-lockfile
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Set emulator environment variables
export FIRESTORE_EMULATOR_HOST=localhost:8889
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Run seed script
echo "🌱 Running seed script..."
cd scripts
node seed-emulator.js
SEED_EXIT_CODE=$?
cd ..

if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Seed completed successfully!"
else
    echo ""
    echo "❌ Seed failed with exit code $SEED_EXIT_CODE"
    exit $SEED_EXIT_CODE
fi
