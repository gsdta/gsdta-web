#!/bin/bash
# Verify Phase 3 implementation

echo "🔍 Verifying Phase 3: Developer Experience & Seed Scripts"
echo ""

errors=0

# Check seed script exists
echo "Checking seed script..."

if [ -f "scripts/seed-emulator.js" ]; then
    echo "✅ scripts/seed-emulator.js exists"
else
    echo "❌ scripts/seed-emulator.js missing"
    errors=$((errors + 1))
fi

if [ -f "scripts/package.json" ]; then
    echo "✅ scripts/package.json exists"
else
    echo "❌ scripts/package.json missing"
    errors=$((errors + 1))
fi

if [ -d "scripts/node_modules" ]; then
    echo "✅ scripts/node_modules installed"
else
    echo "❌ scripts/node_modules not installed (run: cd scripts && npm install)"
    errors=$((errors + 1))
fi

echo ""
echo "Checking convenience scripts..."

if [ -f "seed.sh" ] && [ -x "seed.sh" ]; then
    echo "✅ seed.sh exists and is executable"
else
    echo "❌ seed.sh missing or not executable"
    errors=$((errors + 1))
fi

if [ -f "package.json" ]; then
    if grep -q '"seed":' package.json; then
        echo "✅ npm run seed script configured"
    else
        echo "❌ npm run seed script not configured"
        errors=$((errors + 1))
    fi
    
    if grep -q '"emulators":' package.json; then
        echo "✅ npm run emulators script configured"
    else
        echo "❌ npm run emulators script not configured"
        errors=$((errors + 1))
    fi
else
    echo "❌ package.json missing in root"
    errors=$((errors + 1))
fi

echo ""
echo "Checking seed script content..."

if grep -q "TEST_USERS" scripts/seed-emulator.js; then
    echo "✅ Seed script defines test users"
else
    echo "❌ Seed script missing test users"
    errors=$((errors + 1))
fi

if grep -q "SAMPLE_STUDENTS" scripts/seed-emulator.js; then
    echo "✅ Seed script defines sample students"
else
    echo "❌ Seed script missing sample students"
    errors=$((errors + 1))
fi

if grep -q "SAMPLE_INVITES" scripts/seed-emulator.js; then
    echo "✅ Seed script defines sample invites"
else
    echo "❌ Seed script missing sample invites"
    errors=$((errors + 1))
fi

if grep -q "seedAuthUsers" scripts/seed-emulator.js; then
    echo "✅ Seed script has seedAuthUsers function"
else
    echo "❌ Seed script missing seedAuthUsers function"
    errors=$((errors + 1))
fi

if grep -q "seedUserProfiles" scripts/seed-emulator.js; then
    echo "✅ Seed script has seedUserProfiles function"
else
    echo "❌ Seed script missing seedUserProfiles function"
    errors=$((errors + 1))
fi

if grep -q "clearAllData" scripts/seed-emulator.js; then
    echo "✅ Seed script has clearAllData function"
else
    echo "❌ Seed script missing clearAllData function"
    errors=$((errors + 1))
fi

echo ""
echo "Checking documentation..."

if [ -f "PHASE3-COMPLETE.md" ]; then
    echo "✅ PHASE3-COMPLETE.md exists"
else
    echo "❌ PHASE3-COMPLETE.md missing"
    errors=$((errors + 1))
fi

echo ""
if [ $errors -eq 0 ]; then
    echo "🎉 Phase 3 implementation verified successfully!"
    echo ""
    echo "✅ Seed script ready"
    echo "✅ Convenience scripts configured"
    echo "✅ Documentation complete"
    echo ""
    echo "Next steps:"
    echo "  1. Test seeding: Start emulators, then run 'npm run seed'"
    echo "  2. View data: http://localhost:4445"
    echo "  3. Test sign-in with credentials from seed script"
    echo ""
    echo "See PHASE3-COMPLETE.md for full usage guide."
else
    echo "⚠️  Found $errors issue(s). Please review the errors above."
    exit 1
fi
