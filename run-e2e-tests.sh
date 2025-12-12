#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   E2E Test Runner for GSDTA Web       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to cleanup
cleanup() {
    print_step "Cleaning up..."
    docker-compose -f docker-compose.local.yml down 2>/dev/null || true
    print_success "Cleanup complete"
}

# Trap errors and cleanup
trap cleanup EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Step 1: Stop any existing containers
print_step "Stopping existing containers (if any)..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || true
print_success "Existing containers stopped"

# Step 2: Start Firebase emulators
print_step "Starting Firebase emulators..."
docker-compose -f docker-compose.local.yml up -d firebase-emulators

# Wait for emulators to be ready
print_step "Waiting for emulators to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:4445 > /dev/null 2>&1; then
        print_success "Firebase emulators are ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Firebase emulators failed to start"
        docker-compose -f docker-compose.local.yml logs firebase-emulators
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

# Step 3: Install lightningcss for current platform
print_step "Checking lightningcss installation..."
cd ui

# Detect platform
OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        LIGHTNINGCSS_PKG="lightningcss-darwin-arm64"
    else
        LIGHTNINGCSS_PKG="lightningcss-darwin-x64"
    fi
elif [ "$OS" = "Linux" ]; then
    if [ "$ARCH" = "x86_64" ]; then
        LIGHTNINGCSS_PKG="lightningcss-linux-x64-gnu"
    else
        print_error "Unsupported Linux architecture: $ARCH"
        exit 1
    fi
else
    print_error "Unsupported OS: $OS"
    exit 1
fi

# Check if already installed
if [ ! -f "node_modules/$LIGHTNINGCSS_PKG/package.json" ]; then
    print_step "Installing $LIGHTNINGCSS_PKG..."
    npm install --no-save "$LIGHTNINGCSS_PKG"
    print_success "Installed $LIGHTNINGCSS_PKG"
else
    print_success "$LIGHTNINGCSS_PKG already installed"
fi

cd ..

# Step 4: Seed test data
print_step "Seeding test data..."
npm run seed
print_success "Test data seeded"

# Set environment variables for build
# Note: We do NOT set USE_TEST_AUTH=true here because E2E tests use real Firebase Auth emulator
# tokens, not mock test tokens. USE_TEST_AUTH is only for Cucumber API tests with mock tokens.
export NEXT_PUBLIC_AUTH_MODE=firebase
export NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8889
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gsdta
export NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key-for-emulator
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-gsdta.firebaseapp.com
export NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
export NEXT_PUBLIC_API_BASE_URL=/api
export ALLOW_TEST_INVITES=1
# Note: NODE_ENV must be 'production' for build, but USE_TEST_AUTH controls auth mode at runtime

# Step 5: Build API and UI
print_step "Building API..."
cd api
npm run build
cd ..
print_success "API built"

print_step "Building UI..."
cd ui
npm run build
cd ..
print_success "UI built"

# Step 6: Run e2e tests
print_step "Running Playwright e2e tests..."
echo ""
cd ui

# Set environment variables for emulators
export FIRESTORE_EMULATOR_HOST=localhost:8889
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Run tests
if npm run test:e2e; then
    cd ..
    echo ""
    print_success "All e2e tests completed successfully!"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ E2E Tests Passed ✨${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "View detailed HTML report:"
    echo "  cd ui && npx playwright show-report"
    echo ""
    exit 0
else
    cd ..
    echo ""
    print_error "E2E tests failed!"
    echo ""
    echo "Debugging options:"
    echo "  1. View HTML report: cd ui && npx playwright show-report"
    echo "  2. Check test results: ls ui/test-results/"
    echo "  3. View traces for failed tests"
    echo "  4. Check emulator UI: http://localhost:4445"
    echo ""
    exit 1
fi
