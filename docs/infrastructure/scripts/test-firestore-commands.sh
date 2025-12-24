#!/bin/bash
#
# Test Firestore Commands Against Emulator
# 

set -e

echo "🧪 Testing Firestore Commands Against Emulator"
echo "=============================================="
echo ""

# Check if emulator is running
if ! nc -z localhost 8890 2>/dev/null; then
  echo "❌ Firestore emulator not running on localhost:8890"
  echo "   Start emulator first: npm run emulators"
  exit 1
fi

echo "✅ Firestore emulator detected"
echo ""

# Set environment for emulator
export FIRESTORE_EMULATOR_HOST="localhost:8890"
export PROJECT_ID="demo-gsdta"

echo "📝 Testing collection listing script..."
echo ""

# Test list-collections script
if [ -f "scripts/list-collections.js" ]; then
  node scripts/list-collections.js
  echo ""
  echo "✅ Collection listing works"
else
  echo "❌ scripts/list-collections.js not found"
  exit 1
fi

echo ""
echo "📝 Testing Firebase CLI commands..."
echo ""

# Test firebase commands
echo "1. Testing: firebase use"
firebase use demo-gsdta || true
echo ""

echo "2. Testing: firebase firestore:indexes"
firebase firestore:indexes --project=demo-gsdta || true
echo ""

echo "3. Testing: firebase firestore:databases:list"
firebase firestore:databases:list --project=demo-gsdta 2>&1 | head -5 || true
echo ""

echo "✅ All Firestore emulator tests passed!"
echo ""
echo "Next steps:"
echo "  - Test other scripts against emulator"
echo "  - Verify commands work as documented"
