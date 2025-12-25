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
echo -e "${BLUE}║   Unit Test Runner for GSDTA Web      ║${NC}"
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
RUN_UI=true
RUN_API=true
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --ui)
            RUN_UI=true
            RUN_API=false
            shift
            ;;
        --api)
            RUN_UI=false
            RUN_API=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --ui              Run UI unit tests only"
            echo "  --api             Run API unit tests only"
            echo "  --coverage        Generate coverage report (UI only)"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                # Run all unit tests"
            echo "  $0 --ui           # Run UI tests only"
            echo "  $0 --api          # Run API tests only"
            echo "  $0 --coverage     # Run with coverage"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Track results
UI_PASSED=true
API_PASSED=true

# Step 1: Run UI unit tests
if [ "$RUN_UI" = true ]; then
    print_step "Running UI unit tests (Jest)..."
    echo ""
    cd "$SCRIPT_DIR/ui"

    if [ "$COVERAGE" = true ]; then
        if npm test -- --coverage --passWithNoTests; then
            print_success "UI unit tests passed"
        else
            UI_PASSED=false
            print_error "UI unit tests failed"
        fi
    else
        if npm test -- --passWithNoTests; then
            print_success "UI unit tests passed"
        else
            UI_PASSED=false
            print_error "UI unit tests failed"
        fi
    fi

    cd "$SCRIPT_DIR"
    echo ""
fi

# Step 2: Run API unit tests
if [ "$RUN_API" = true ]; then
    print_step "Running API unit tests (Node test runner)..."
    echo ""
    cd "$SCRIPT_DIR/api"

    if npm test; then
        print_success "API unit tests passed"
    else
        API_PASSED=false
        print_error "API unit tests failed"
    fi

    cd "$SCRIPT_DIR"
    echo ""
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}           Test Summary                ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$RUN_UI" = true ]; then
    if [ "$UI_PASSED" = true ]; then
        echo -e "  UI Tests:  ${GREEN}✅ PASSED${NC}"
    else
        echo -e "  UI Tests:  ${RED}❌ FAILED${NC}"
    fi
fi

if [ "$RUN_API" = true ]; then
    if [ "$API_PASSED" = true ]; then
        echo -e "  API Tests: ${GREEN}✅ PASSED${NC}"
    else
        echo -e "  API Tests: ${RED}❌ FAILED${NC}"
    fi
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Exit with error if any tests failed
if [ "$UI_PASSED" = false ] || [ "$API_PASSED" = false ]; then
    print_error "Some unit tests failed!"
    exit 1
else
    print_success "All unit tests passed!"
    echo ""
    echo -e "${GREEN}✨ Unit Tests Complete ✨${NC}"
    echo ""
    exit 0
fi
