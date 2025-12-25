#!/usr/bin/env bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}║            GSDTA Web - Complete Test Suite                   ║${NC}"
echo -e "${CYAN}║                                                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
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

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Default options
RUN_UNIT=true
RUN_CUCUMBER=true
RUN_E2E=true
RUN_UAT=false
RUN_SHAKEOUT=false
STOP_ON_FAILURE=false
UAT_URL=""
SHAKEOUT_URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT=true
            RUN_CUCUMBER=false
            RUN_E2E=false
            RUN_UAT=false
            RUN_SHAKEOUT=false
            shift
            ;;
        --cucumber)
            RUN_UNIT=false
            RUN_CUCUMBER=true
            RUN_E2E=false
            RUN_UAT=false
            RUN_SHAKEOUT=false
            shift
            ;;
        --e2e)
            RUN_UNIT=false
            RUN_CUCUMBER=false
            RUN_E2E=true
            RUN_UAT=false
            RUN_SHAKEOUT=false
            shift
            ;;
        --uat)
            RUN_UNIT=false
            RUN_CUCUMBER=false
            RUN_E2E=false
            RUN_UAT=true
            RUN_SHAKEOUT=false
            shift
            ;;
        --shakeout)
            RUN_UNIT=false
            RUN_CUCUMBER=false
            RUN_E2E=false
            RUN_UAT=false
            RUN_SHAKEOUT=true
            shift
            ;;
        --local)
            # Run unit, cucumber, and e2e (all local tests)
            RUN_UNIT=true
            RUN_CUCUMBER=true
            RUN_E2E=true
            RUN_UAT=false
            RUN_SHAKEOUT=false
            shift
            ;;
        --remote)
            # Run UAT and shakeout (all remote tests)
            RUN_UNIT=false
            RUN_CUCUMBER=false
            RUN_E2E=false
            RUN_UAT=true
            RUN_SHAKEOUT=true
            shift
            ;;
        --all)
            RUN_UNIT=true
            RUN_CUCUMBER=true
            RUN_E2E=true
            RUN_UAT=true
            RUN_SHAKEOUT=true
            shift
            ;;
        --skip-unit)
            RUN_UNIT=false
            shift
            ;;
        --skip-cucumber)
            RUN_CUCUMBER=false
            shift
            ;;
        --skip-e2e)
            RUN_E2E=false
            shift
            ;;
        --stop-on-failure)
            STOP_ON_FAILURE=true
            shift
            ;;
        --uat-url)
            UAT_URL="$2"
            shift 2
            ;;
        --shakeout-url)
            SHAKEOUT_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Run specific test suites:"
            echo "  --unit              Run unit tests only"
            echo "  --cucumber          Run API Cucumber tests only"
            echo "  --e2e               Run UI E2E (Playwright) tests only"
            echo "  --uat               Run UAT tests only (requires QA environment)"
            echo "  --shakeout          Run shakeout tests only (requires production)"
            echo ""
            echo "Run groups of tests:"
            echo "  --local             Run all local tests (unit + cucumber + e2e)"
            echo "  --remote            Run all remote tests (uat + shakeout)"
            echo "  --all               Run all test suites"
            echo ""
            echo "Skip options (can combine with groups):"
            echo "  --skip-unit         Skip unit tests"
            echo "  --skip-cucumber     Skip Cucumber API tests"
            echo "  --skip-e2e          Skip E2E Playwright tests"
            echo ""
            echo "Other options:"
            echo "  --stop-on-failure   Stop running tests after first failure"
            echo "  --uat-url URL       Override UAT base URL"
            echo "  --shakeout-url URL  Override shakeout base URL"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Run unit, cucumber, and e2e tests"
            echo "  $0 --local                  # Same as above (all local tests)"
            echo "  $0 --unit                   # Run only unit tests"
            echo "  $0 --all                    # Run everything including UAT and shakeout"
            echo "  $0 --local --skip-e2e       # Run unit and cucumber tests"
            echo "  $0 --stop-on-failure        # Stop at first failure"
            echo ""
            echo "Default behavior (no options): runs unit, cucumber, and e2e tests"
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

# Track results
declare -A RESULTS
RESULTS["unit"]="skipped"
RESULTS["cucumber"]="skipped"
RESULTS["e2e"]="skipped"
RESULTS["uat"]="skipped"
RESULTS["shakeout"]="skipped"

# Track timing
START_TIME=$(date +%s)

# Display configuration
print_info "Test Configuration:"
echo "  Unit Tests:     $([ "$RUN_UNIT" = true ] && echo 'Yes' || echo 'No')"
echo "  Cucumber Tests: $([ "$RUN_CUCUMBER" = true ] && echo 'Yes' || echo 'No')"
echo "  E2E Tests:      $([ "$RUN_E2E" = true ] && echo 'Yes' || echo 'No')"
echo "  UAT Tests:      $([ "$RUN_UAT" = true ] && echo 'Yes' || echo 'No')"
echo "  Shakeout Tests: $([ "$RUN_SHAKEOUT" = true ] && echo 'Yes' || echo 'No')"
echo "  Stop on Failure: $([ "$STOP_ON_FAILURE" = true ] && echo 'Yes' || echo 'No')"
echo ""

# Function to check if should continue
should_continue() {
    if [ "$STOP_ON_FAILURE" = true ]; then
        for key in "${!RESULTS[@]}"; do
            if [ "${RESULTS[$key]}" = "failed" ]; then
                return 1
            fi
        done
    fi
    return 0
}

# ============================================================================
# 1. Unit Tests
# ============================================================================
if [ "$RUN_UNIT" = true ] && should_continue; then
    print_section "1. Unit Tests (Jest + Node Test Runner)"

    if "$SCRIPT_DIR/run-unit-tests.sh"; then
        RESULTS["unit"]="passed"
        print_success "Unit tests completed"
    else
        RESULTS["unit"]="failed"
        print_error "Unit tests failed"
    fi
fi

# ============================================================================
# 2. Cucumber API Tests
# ============================================================================
if [ "$RUN_CUCUMBER" = true ] && should_continue; then
    print_section "2. Cucumber API Tests"

    if "$SCRIPT_DIR/run-cucumber-tests.sh"; then
        RESULTS["cucumber"]="passed"
        print_success "Cucumber tests completed"
    else
        RESULTS["cucumber"]="failed"
        print_error "Cucumber tests failed"
    fi
fi

# ============================================================================
# 3. E2E Playwright Tests
# ============================================================================
if [ "$RUN_E2E" = true ] && should_continue; then
    print_section "3. E2E Playwright Tests"

    if "$SCRIPT_DIR/run-e2e-tests.sh"; then
        RESULTS["e2e"]="passed"
        print_success "E2E tests completed"
    else
        RESULTS["e2e"]="failed"
        print_error "E2E tests failed"
    fi
fi

# ============================================================================
# 4. UAT Tests (Remote QA Environment)
# ============================================================================
if [ "$RUN_UAT" = true ] && should_continue; then
    print_section "4. UAT Tests (QA Environment)"

    UAT_CMD="$SCRIPT_DIR/run-uat-tests.sh"
    if [ -n "$UAT_URL" ]; then
        UAT_CMD="$UAT_CMD --url $UAT_URL"
    fi

    if $UAT_CMD; then
        RESULTS["uat"]="passed"
        print_success "UAT tests completed"
    else
        RESULTS["uat"]="failed"
        print_error "UAT tests failed"
    fi
fi

# ============================================================================
# 5. Shakeout Tests (Remote Production Environment)
# ============================================================================
if [ "$RUN_SHAKEOUT" = true ] && should_continue; then
    print_section "5. Shakeout Tests (Production Environment)"

    SHAKEOUT_CMD="$SCRIPT_DIR/run-shakeout-tests.sh"
    if [ -n "$SHAKEOUT_URL" ]; then
        SHAKEOUT_CMD="$SHAKEOUT_CMD --url $SHAKEOUT_URL"
    fi

    if $SHAKEOUT_CMD; then
        RESULTS["shakeout"]="passed"
        print_success "Shakeout tests completed"
    else
        RESULTS["shakeout"]="failed"
        print_error "Shakeout tests failed"
    fi
fi

# ============================================================================
# Final Summary
# ============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Test Results Summary                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Count results
PASSED=0
FAILED=0
SKIPPED=0

for key in unit cucumber e2e uat shakeout; do
    result="${RESULTS[$key]}"
    case $result in
        passed)
            ((PASSED++))
            echo -e "  $(printf '%-15s' "$key:") ${GREEN}✅ PASSED${NC}"
            ;;
        failed)
            ((FAILED++))
            echo -e "  $(printf '%-15s' "$key:") ${RED}❌ FAILED${NC}"
            ;;
        skipped)
            ((SKIPPED++))
            echo -e "  $(printf '%-15s' "$key:") ${YELLOW}⏭  SKIPPED${NC}"
            ;;
    esac
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Total Time: ${MINUTES}m ${SECONDS}s"
echo -e "  Passed: ${GREEN}$PASSED${NC}  Failed: ${RED}$FAILED${NC}  Skipped: ${YELLOW}$SKIPPED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Final exit
if [ $FAILED -gt 0 ]; then
    print_error "Some tests failed!"
    echo ""
    echo "To debug:"
    echo "  - Unit tests:     npm run test:ui / npm run test:api"
    echo "  - Cucumber tests: ./run-cucumber-tests.sh --feature <file>"
    echo "  - E2E tests:      cd ui && npx playwright show-report"
    echo "  - UAT tests:      ./run-uat-tests.sh --headed"
    echo "  - Shakeout tests: ./run-shakeout-tests.sh --headed"
    echo ""
    exit 1
else
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✨ All Tests Passed! ✨                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 0
fi
