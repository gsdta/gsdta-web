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

# Step 5: Run e2e tests
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
