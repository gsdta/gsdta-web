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
echo -e "${BLUE}║   UAT Test Runner for GSDTA Web       ║${NC}"
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
MODE="full"  # Default: run smoke then full suite (like CI)
TAG=""
PROFILE=""
BASE_URL="${UAT_BASE_URL:-https://app.qa.gsdta.com}"
HEADLESS="true"

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            MODE="tag"
            TAG="$2"
            PROFILE="default"
            shift 2
            ;;
        --all)
            MODE="all"
            TAG="not @skip and not @wip"
            PROFILE="default"
            shift
            ;;
        --smoke)
            MODE="smoke"
            TAG="@smoke"
            PROFILE="smoke"
            shift
            ;;
        --shakeout)
            MODE="shakeout"
            TAG="@shakeout"
            PROFILE="shakeout"
            shift
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --headed)
            HEADLESS="false"
            shift
            ;;
        --ci)
            MODE="ci"
            PROFILE="ci"
            TAG="not @skip and not @wip and not @manual"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  (no args)         Run smoke tests first, then full suite (like CI)"
            echo "  --smoke           Run smoke tests only"
            echo "  --shakeout        Run shakeout tests only (quick post-deploy verification)"
            echo "  --all             Run all tests (excluding @skip and @wip)"
            echo "  --tag TAG         Run tests with specific tag (e.g., @auth, @public)"
            echo "  --url URL         Override base URL (default: https://app.qa.gsdta.com)"
            echo "  --headed          Run with visible browser (default: headless)"
            echo "  --ci              Run in CI mode with parallel execution and reports"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Run smoke + full suite (like CI)"
            echo "  $0 --smoke                  # Run smoke tests only"
            echo "  $0 --shakeout               # Run shakeout tests only"
            echo "  $0 --all                    # Run all tests"
            echo "  $0 --tag @auth              # Run auth tests only"
            echo "  $0 --tag '@smoke and @api'  # Run smoke API tests"
            echo "  $0 --headed                 # Run with visible browser"
            echo "  $0 --url http://localhost:3000  # Run against local"
            echo ""
            echo "Environment Variables:"
            echo "  UAT_BASE_URL              Base URL for tests"
            echo "  UAT_ADMIN_EMAIL           Admin test user email"
            echo "  UAT_ADMIN_PASSWORD        Admin test user password"
            echo "  UAT_SUPER_ADMIN_EMAIL     Super Admin test user email"
            echo "  UAT_SUPER_ADMIN_PASSWORD  Super Admin test user password"
            echo "  UAT_TEACHER_EMAIL         Teacher test user email"
            echo "  UAT_TEACHER_PASSWORD      Teacher test user password"
            echo "  UAT_PARENT_EMAIL          Parent test user email"
            echo "  UAT_PARENT_PASSWORD       Parent test user password"
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
print_info "Mode: $MODE"
if [ -n "$TAG" ]; then
    print_info "Tags: $TAG"
fi
print_info "Headless: $HEADLESS"
echo ""

# Step 1: Check if QA environment is healthy
print_step "Checking if QA environment is healthy..."
HEALTH_URL="${BASE_URL}/api/v1/health"

MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        print_success "QA environment is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "QA environment is not responding at $HEALTH_URL"
        echo "Please check if the QA environment is deployed and running."
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 2: Check for .env file or environment variables
print_step "Checking credentials..."
cd "$SCRIPT_DIR/uat"

if [ -f ".env" ]; then
    print_success "Found .env file"
    source .env
elif [ -n "$UAT_ADMIN_EMAIL" ]; then
    print_success "Using environment variables"
else
    print_error "No credentials found!"
    echo ""
    echo "Please either:"
    echo "  1. Create uat/.env file (copy from uat/.env.example)"
    echo "  2. Set environment variables (UAT_ADMIN_EMAIL, etc.)"
    echo ""
    exit 1
fi

# Step 3: Check dependencies
print_step "Checking dependencies..."
if [ ! -d "../node_modules" ]; then
    print_step "Installing dependencies..."
    cd "$SCRIPT_DIR"
    pnpm install --frozen-lockfile
    cd "$SCRIPT_DIR/uat"
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Step 4: Check Playwright browsers
print_step "Checking Playwright browsers..."
if ! npx playwright install --check chromium > /dev/null 2>&1; then
    print_step "Installing Playwright Chromium..."
    npx playwright install chromium
    print_success "Playwright Chromium installed"
else
    print_success "Playwright Chromium already installed"
fi

# Step 5: Run UAT tests
echo ""

# Set environment variables
export UAT_BASE_URL="$BASE_URL"
export HEADLESS="$HEADLESS"

# Function to run tests and handle results
run_tests() {
    local tag="$1"
    local profile="$2"
    local description="$3"

    print_step "Running $description..."
    echo ""

    if npx cucumber-js --tags "$tag" --profile "$profile"; then
        print_success "$description passed!"
        return 0
    else
        print_error "$description failed!"
        return 1
    fi
}

# Function to show final results
show_results() {
    local success="$1"
    cd "$SCRIPT_DIR"
    echo ""

    if [ "$success" = "true" ]; then
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✨ UAT Tests Passed ✨${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}❌ UAT Tests Failed${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "Debugging options:"
        echo "  1. Check screenshots: ls uat/reports/screenshots/"
        echo "  2. Run with visible browser: $0 --headed"
        echo "  3. Run specific tag: $0 --tag @public"
        echo "  4. Check QA logs in GCP Console"
    fi
    echo ""

    # Show report location if exists
    if [ -f "uat/reports/cucumber-report.html" ]; then
        echo "View HTML report:"
        echo "  open uat/reports/cucumber-report.html"
        echo ""
    fi
}

# Execute based on mode
case $MODE in
    full)
        # Run smoke tests first, then full suite (like CI)
        print_info "Running smoke tests first, then full suite..."
        echo ""

        if run_tests "@smoke" "smoke" "Smoke tests"; then
            echo ""
            if run_tests "not @skip and not @wip and not @manual" "default" "Full test suite"; then
                show_results "true"
                exit 0
            else
                show_results "false"
                exit 1
            fi
        else
            print_error "Smoke tests failed - skipping full suite"
            show_results "false"
            exit 1
        fi
        ;;
    smoke|shakeout|all|tag|ci)
        # Run single test suite
        if run_tests "$TAG" "$PROFILE" "UAT tests ($MODE)"; then
            show_results "true"
            exit 0
        else
            show_results "false"
            exit 1
        fi
        ;;
esac
