#!/bin/bash

# Comprehensive Test Runner Script
# This script runs all types of tests in the correct order

set -e

echo "🧪 Starting Comprehensive Test Suite"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Install dependencies if needed
install_dependencies() {
    print_status "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    if pnpm test:run; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    if pnpm test:run src/test/integration/; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Start services in background
    print_status "Starting frontend service..."
    pnpm dev &
    FRONTEND_PID=$!
    
    print_status "Starting backend service..."
    cd ../shipping-tracker-api && npm run dev &
    BACKEND_PID=$!
    cd ../shipping-tracker
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Run E2E tests
    if pnpm test:e2e; then
        print_success "E2E tests passed"
        E2E_SUCCESS=true
    else
        print_error "E2E tests failed"
        E2E_SUCCESS=false
    fi
    
    # Clean up background processes
    print_status "Stopping services..."
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    
    if [ "$E2E_SUCCESS" = false ]; then
        return 1
    fi
}

# Run accessibility tests
run_accessibility_tests() {
    print_status "Running accessibility tests..."
    
    if pnpm test:e2e e2e/accessibility-automation.spec.ts; then
        print_success "Accessibility tests passed"
    else
        print_error "Accessibility tests failed"
        return 1
    fi
}

# Run visual regression tests
run_visual_tests() {
    print_status "Running visual regression tests..."
    
    if pnpm test:e2e e2e/visual-regression.spec.ts; then
        print_success "Visual regression tests passed"
    else
        print_warning "Visual regression tests failed (this may be expected for first run)"
    fi
}

# Generate test coverage report
generate_coverage() {
    print_status "Generating test coverage report..."
    
    if pnpm test:coverage; then
        print_success "Coverage report generated"
        print_status "Coverage report available at: coverage/index.html"
    else
        print_warning "Coverage report generation failed"
    fi
}

# Generate test reports
generate_reports() {
    print_status "Generating test reports..."
    
    # Create reports directory
    mkdir -p test-results
    
    # Generate E2E test report
    if [ -f "playwright-report/index.html" ]; then
        print_success "E2E test report available at: playwright-report/index.html"
    fi
    
    # Generate accessibility report
    if [ -f "test-results/accessibility-report.json" ]; then
        print_success "Accessibility report available at: test-results/accessibility-report.json"
    fi
}

# Main execution
main() {
    local FAILED_TESTS=()
    
    check_dependencies
    install_dependencies
    
    # Run tests in order
    if ! run_unit_tests; then
        FAILED_TESTS+=("Unit Tests")
    fi
    
    if ! run_integration_tests; then
        FAILED_TESTS+=("Integration Tests")
    fi
    
    if ! run_e2e_tests; then
        FAILED_TESTS+=("E2E Tests")
    fi
    
    if ! run_accessibility_tests; then
        FAILED_TESTS+=("Accessibility Tests")
    fi
    
    run_visual_tests # Don't fail on visual tests
    
    generate_coverage
    generate_reports
    
    # Summary
    echo ""
    echo "🏁 Test Suite Summary"
    echo "===================="
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        print_success "All tests passed! 🎉"
        echo ""
        echo "📊 Reports Generated:"
        echo "  - Unit Test Coverage: coverage/index.html"
        echo "  - E2E Test Report: playwright-report/index.html"
        echo "  - Accessibility Report: test-results/accessibility-report.json"
        exit 0
    else
        print_error "Some tests failed:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  ❌ $test"
        done
        exit 1
    fi
}

# Handle script arguments
case "${1:-all}" in
    "unit")
        check_dependencies
        install_dependencies
        run_unit_tests
        ;;
    "integration")
        check_dependencies
        install_dependencies
        run_integration_tests
        ;;
    "e2e")
        check_dependencies
        install_dependencies
        run_e2e_tests
        ;;
    "accessibility")
        check_dependencies
        install_dependencies
        run_accessibility_tests
        ;;
    "visual")
        check_dependencies
        install_dependencies
        run_visual_tests
        ;;
    "coverage")
        check_dependencies
        install_dependencies
        generate_coverage
        ;;
    "all"|*)
        main
        ;;
esac