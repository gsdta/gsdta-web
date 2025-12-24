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
echo -e "${BLUE}║   Cucumber Test Runner for GSDTA      ║${NC}"
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

# Parse command line arguments
SPECIFIC_FEATURE=""
TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --feature)
            SPECIFIC_FEATURE="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --feature FILE    Run a specific feature file (e.g., health.feature)"
            echo "  --tag TAG         Run features with specific tag (e.g., @admin)"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Run all Cucumber tests"
            echo "  $0 --feature health.feature  # Run specific feature"
            echo "  $0 --tag @admin              # Run tests tagged with @admin"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

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

# Step 3: Seed minimal test data for API tests
print_step "Seeding minimal test data for API tests..."
node scripts/seed-api-tests.js
print_success "Test data seeded"

# Step 4: Check if dependencies are installed
print_step "Checking API dependencies..."
cd api
if [ ! -d "node_modules" ]; then
    print_step "Installing API dependencies..."
    npm ci
    print_success "API dependencies installed"
else
    print_success "API dependencies already installed"
fi

# Step 5: Run Cucumber tests
print_step "Running Cucumber tests..."
echo ""

# Set environment variables for emulators
export FIRESTORE_EMULATOR_HOST=localhost:8890
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# Build Cucumber command with options
if [ -n "$SPECIFIC_FEATURE" ]; then
    print_step "Running feature: $SPECIFIC_FEATURE"
    # Run cucumber with specific feature
    if npm run test:e2e:seed -- tests/e2e/features/$SPECIFIC_FEATURE; then
        cd ..
        echo ""
        print_success "Cucumber tests completed successfully!"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ Cucumber Tests Passed ✨${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        exit 0
    else
        cd ..
        echo ""
        print_error "Cucumber tests failed!"
        echo ""
        echo "Run specific feature:"
        echo "  $0 --feature health.feature"
        echo ""
        exit 1
    fi
elif [ -n "$TAG" ]; then
    print_step "Running tests with tag: $TAG"
    if npx cross-env TS_NODE_PROJECT=tsconfig.cucumber.json npx cucumber-js --tags "$TAG"; then
        cd ..
        echo ""
        print_success "Cucumber tests completed successfully!"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ Cucumber Tests Passed ✨${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        exit 0
    else
        cd ..
        echo ""
        print_error "Cucumber tests failed!"
        echo ""
        exit 1
    fi
else
    # Run all tests
    if npm run test:e2e; then
        cd ..
        echo ""
        print_success "All Cucumber tests completed successfully!"
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ Cucumber Tests Passed ✨${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "Feature files tested:"
        echo "  $(ls api/tests/e2e/features/*.feature | wc -l) feature files"
        echo ""
        exit 0
    else
        cd ..
        echo ""
        print_error "Cucumber tests failed!"
        echo ""
        echo "Debugging options:"
        echo "  1. Check API logs for errors"
        echo "  2. Check emulator UI: http://localhost:4445"
        echo "  3. Review feature files: api/tests/e2e/features/"
        echo "  4. Review step definitions: api/tests/e2e/steps/"
        echo ""
        echo "Run specific feature:"
        echo "  $0 --feature health.feature"
        echo ""
        exit 1
    fi
fi
