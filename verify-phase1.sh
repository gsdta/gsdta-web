#!/bin/bash
# Quick verification that Phase 1 setup is complete

echo "🔍 Verifying Phase 1 Setup..."
echo ""

errors=0

# Check firebase.json
if grep -q '"auth"' firebase.json; then
    echo "✅ firebase.json configured with Auth emulator"
else
    echo "❌ firebase.json missing Auth emulator config"
    errors=$((errors + 1))
fi

# Check Docker Compose file
if [ -f "docker-compose.local.yml" ]; then
    echo "✅ docker-compose.local.yml exists"
else
    echo "❌ docker-compose.local.yml missing"
    errors=$((errors + 1))
fi

# Check Dockerfiles
if [ -f "ui/Dockerfile.dev" ]; then
    echo "✅ ui/Dockerfile.dev exists"
else
    echo "❌ ui/Dockerfile.dev missing"
    errors=$((errors + 1))
fi

if [ -f "api/Dockerfile.dev" ]; then
    echo "✅ api/Dockerfile.dev exists"
else
    echo "❌ api/Dockerfile.dev missing"
    errors=$((errors + 1))
fi

# Check environment templates
if [ -f "ui/.env.local.emulator" ]; then
    echo "✅ ui/.env.local.emulator exists"
else
    echo "❌ ui/.env.local.emulator missing"
    errors=$((errors + 1))
fi

if [ -f "api/.env.local.emulator" ]; then
    echo "✅ api/.env.local.emulator exists"
else
    echo "❌ api/.env.local.emulator missing"
    errors=$((errors + 1))
fi

# Check startup script
if [ -f "start-dev-local.sh" ] && [ -x "start-dev-local.sh" ]; then
    echo "✅ start-dev-local.sh exists and is executable"
else
    echo "❌ start-dev-local.sh missing or not executable"
    errors=$((errors + 1))
fi

# Check gitignore
if grep -q "firebase-data" .gitignore; then
    echo "✅ .gitignore configured for firebase-data"
else
    echo "❌ .gitignore missing firebase-data entry"
    errors=$((errors + 1))
fi

echo ""
if [ $errors -eq 0 ]; then
    echo "🎉 Phase 1 setup is complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Test the setup: ./start-dev-local.sh"
    echo "  2. Continue to Phase 2: Update Firebase client code"
    echo ""
    echo "See PHASE1-COMPLETE.md for detailed instructions."
else
    echo "⚠️  Found $errors issue(s). Please review the errors above."
    exit 1
fi
