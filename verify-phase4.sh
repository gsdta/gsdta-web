#!/bin/bash
# Verify Phase 4 implementation

echo "🔍 Verifying Phase 4: CI/CD with Firebase Emulators"
echo ""

errors=0

# Check CI workflow
echo "Checking CI workflow..."

if [ -f ".github/workflows/ci.yml" ]; then
    echo "✅ .github/workflows/ci.yml exists"
else
    echo "❌ .github/workflows/ci.yml missing"
    errors=$((errors + 1))
fi

if grep -q "firebase emulators:start" .github/workflows/ci.yml; then
    echo "✅ CI workflow starts Firebase emulators"
else
    echo "❌ CI workflow doesn't start emulators"
    errors=$((errors + 1))
fi

if grep -q "npm run seed" .github/workflows/ci.yml; then
    echo "✅ CI workflow seeds test data"
else
    echo "❌ CI workflow doesn't seed data"
    errors=$((errors + 1))
fi

if grep -q "FIRESTORE_EMULATOR_HOST" .github/workflows/ci.yml; then
    echo "✅ CI workflow sets emulator environment variables"
else
    echo "❌ CI workflow missing emulator env vars"
    errors=$((errors + 1))
fi

if grep -q "cache@v4" .github/workflows/ci.yml; then
    echo "✅ CI workflow caches emulators"
else
    echo "❌ CI workflow doesn't cache emulators"
    errors=$((errors + 1))
fi

echo ""
echo "Checking deploy workflow..."

if [ -f ".github/workflows/deploy.yml" ]; then
    echo "✅ .github/workflows/deploy.yml exists"
else
    echo "❌ .github/workflows/deploy.yml missing"
    errors=$((errors + 1))
fi

if grep -q "emulator-tests" .github/workflows/deploy.yml; then
    echo "✅ Deploy workflow has emulator tests job"
else
    echo "❌ Deploy workflow missing emulator tests"
    errors=$((errors + 1))
fi

echo ""
echo "Checking documentation..."

if [ -f "PHASE4-COMPLETE.md" ]; then
    echo "✅ PHASE4-COMPLETE.md exists"
else
    echo "❌ PHASE4-COMPLETE.md missing"
    errors=$((errors + 1))
fi

echo ""
if [ $errors -eq 0 ]; then
    echo "🎉 Phase 4 implementation verified successfully!"
    echo ""
    echo "✅ CI workflow uses emulators"
    echo "✅ Deploy workflow includes emulator tests"
    echo "✅ Test data seeding configured"
    echo "✅ Emulator caching enabled"
    echo "✅ Documentation complete"
    echo ""
    echo "Next steps:"
    echo "  1. Push to develop branch to test CI workflow"
    echo "  2. Check GitHub Actions tab for workflow runs"
    echo "  3. Continue to Phase 5: Deprecate mock mode"
    echo ""
    echo "See PHASE4-COMPLETE.md for full details."
else
    echo "⚠️  Found $errors issue(s). Please review the errors above."
    exit 1
fi
