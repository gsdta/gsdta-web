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
echo -e "${BLUE}║   Shakeout Test Runner for GSDTA Web  ║${NC}"
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

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Parse command line arguments
BASE_URL="${UAT_BASE_URL:-https://app.gsdta.com}"
HEADLESS="true"

while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --qa)
            BASE_URL="https://app.qa.gsdta.com"
            shift
            ;;
        --prod)
            BASE_URL="https://app.gsdta.com"
            shift
            ;;
        --headed)
            HEADLESS="false"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --qa              Run against QA environment"
            echo "  --prod            Run against Production environment (default)"
            echo "  --url URL         Override base URL"
            echo "  --headed          Run with visible browser (default: headless)"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Run against production"
            echo "  $0 --qa                     # Run against QA"
            echo "  $0 --headed                 # Run with visible browser"
            echo "  $0 --url http://localhost:3000  # Run against local"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Display configuration
print_info "Target URL: $BASE_URL"
print_info "Headless: $HEADLESS"
echo ""

# Step 1: Check if environment is healthy
print_step "Checking if environment is healthy..."
HEALTH_URL="${BASE_URL}/api/v1/health"

MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        print_success "Environment is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "Environment is not responding at $HEALTH_URL"
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 2: Check dependencies
print_step "Checking dependencies..."
cd "$SCRIPT_DIR/uat"

if [ ! -d "node_modules" ]; then
    print_step "Installing UAT dependencies..."
    cd "$SCRIPT_DIR"
    npm install
    cd "$SCRIPT_DIR/uat"
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 3: Check Playwright browsers
print_step "Checking Playwright browsers..."
if ! npx playwright install --check chromium > /dev/null 2>&1; then
    print_step "Installing Playwright Chromium..."
    npx playwright install chromium
    print_success "Playwright Chromium installed"
else
    print_success "Playwright Chromium already installed"
fi

# Step 4: Run shakeout tests
print_step "Running shakeout tests..."
echo ""

# Set environment variables
export UAT_BASE_URL="$BASE_URL"
export HEADLESS="$HEADLESS"

# Run Cucumber tests with shakeout profile
if npx cucumber-js --profile shakeout; then
    cd "$SCRIPT_DIR"
    echo ""
    print_success "Shakeout tests completed successfully!"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Shakeout Tests Passed ✨${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Show report location if exists
    if [ -f "uat/reports/shakeout-report.html" ]; then
        echo "View HTML report:"
        echo "  open uat/reports/shakeout-report.html"
        echo ""
    fi

    exit 0
else
    cd "$SCRIPT_DIR"
    echo ""
    print_error "Shakeout tests failed!"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Debugging options:"
    echo "  1. Run with visible browser: $0 --headed"
    echo "  2. Check the environment: curl $BASE_URL/api/v1/health"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Show report location if exists
    if [ -f "uat/reports/shakeout-report.html" ]; then
        echo "View HTML report:"
        echo "  open uat/reports/shakeout-report.html"
        echo ""
    fi

    exit 1
fi
