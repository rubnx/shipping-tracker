#!/bin/bash

# Deployment script for shipping tracker application
# Usage: ./scripts/deploy.sh [staging|production] [frontend|backend|all]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
COMPONENT=${2:-all}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
        exit 1
    fi
    
    if [[ "$COMPONENT" != "frontend" && "$COMPONENT" != "backend" && "$COMPONENT" != "all" ]]; then
        log_error "Invalid component: $COMPONENT. Must be 'frontend', 'backend', or 'all'"
        exit 1
    fi
    
    log_info "Deploying $COMPONENT to $ENVIRONMENT environment"
}

# Load environment variables
load_env_vars() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment variables from $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_warning "Environment file $env_file not found"
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required tools are installed
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed"; exit 1; }
    
    if [[ "$COMPONENT" == "frontend" || "$COMPONENT" == "all" ]]; then
        command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed"; exit 1; }
    fi
    
    # Check if required environment variables are set
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ -z "$PRODUCTION_API_URL" ]]; then
            log_error "PRODUCTION_API_URL environment variable is required for production deployment"
            exit 1
        fi
    fi
    
    log_success "Pre-deployment checks passed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend application..."
    
    cd "$PROJECT_ROOT/shipping-tracker"
    
    # Install dependencies
    pnpm install --frozen-lockfile
    
    # Run tests
    log_info "Running frontend tests..."
    pnpm test:run
    
    # Build application
    log_info "Building frontend for $ENVIRONMENT..."
    if [[ "$ENVIRONMENT" == "production" ]]; then
        VITE_API_BASE_URL="$PRODUCTION_API_URL" \
        VITE_SENTRY_DSN="$SENTRY_DSN_FRONTEND" \
        pnpm build
    else
        VITE_API_BASE_URL="$STAGING_API_URL" \
        VITE_SENTRY_DSN="$SENTRY_DSN_FRONTEND" \
        pnpm build
    fi
    
    log_success "Frontend build completed"
}

# Build backend
build_backend() {
    log_info "Building backend application..."
    
    cd "$PROJECT_ROOT/shipping-tracker-api"
    
    # Install dependencies
    npm ci
    
    # Run tests
    log_info "Running backend tests..."
    npm test
    
    # Build application
    log_info "Building backend..."
    npm run build
    
    log_success "Backend build completed"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend to $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT/shipping-tracker"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Production deployment
        if [[ -n "$VERCEL_TOKEN" ]]; then
            log_info "Deploying to Vercel..."
            npx vercel --prod --token "$VERCEL_TOKEN" --yes
        elif [[ -n "$NETLIFY_AUTH_TOKEN" ]]; then
            log_info "Deploying to Netlify..."
            npx netlify deploy --prod --dir=dist --auth "$NETLIFY_AUTH_TOKEN"
        else
            log_warning "No deployment service configured. Skipping frontend deployment."
        fi
    else
        # Staging deployment
        if [[ -n "$VERCEL_TOKEN" ]]; then
            log_info "Deploying to Vercel staging..."
            npx vercel --token "$VERCEL_TOKEN" --yes
        elif [[ -n "$NETLIFY_AUTH_TOKEN" ]]; then
            log_info "Deploying to Netlify staging..."
            npx netlify deploy --dir=dist --auth "$NETLIFY_AUTH_TOKEN"
        else
            log_warning "No deployment service configured. Skipping frontend deployment."
        fi
    fi
    
    log_success "Frontend deployment completed"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend to $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT/shipping-tracker-api"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Production deployment
        if [[ -n "$RAILWAY_TOKEN" ]]; then
            log_info "Deploying to Railway..."
            railway deploy --service backend
        elif [[ -n "$RENDER_DEPLOY_HOOK" ]]; then
            log_info "Deploying to Render..."
            curl -X POST "$RENDER_DEPLOY_HOOK"
        else
            log_warning "No deployment service configured. Skipping backend deployment."
        fi
    else
        # Staging deployment
        if [[ -n "$RAILWAY_TOKEN" ]]; then
            log_info "Deploying to Railway staging..."
            railway deploy --service backend-staging
        elif [[ -n "$RENDER_DEPLOY_HOOK_STAGING" ]]; then
            log_info "Deploying to Render staging..."
            curl -X POST "$RENDER_DEPLOY_HOOK_STAGING"
        else
            log_warning "No deployment service configured. Skipping backend deployment."
        fi
    fi
    
    log_success "Backend deployment completed"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local api_url
    local frontend_url
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        api_url="$PRODUCTION_API_URL"
        frontend_url="$PRODUCTION_FRONTEND_URL"
    else
        api_url="$STAGING_API_URL"
        frontend_url="$STAGING_FRONTEND_URL"
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check backend health
    if [[ "$COMPONENT" == "backend" || "$COMPONENT" == "all" ]] && [[ -n "$api_url" ]]; then
        log_info "Checking backend health at $api_url/health"
        if curl -f "$api_url/health" >/dev/null 2>&1; then
            log_success "Backend health check passed"
        else
            log_error "Backend health check failed"
            return 1
        fi
    fi
    
    # Check frontend health
    if [[ "$COMPONENT" == "frontend" || "$COMPONENT" == "all" ]] && [[ -n "$frontend_url" ]]; then
        log_info "Checking frontend health at $frontend_url"
        if curl -f "$frontend_url" >/dev/null 2>&1; then
            log_success "Frontend health check passed"
        else
            log_error "Frontend health check failed"
            return 1
        fi
    fi
    
    log_success "All health checks passed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # This would implement rollback logic
    # For now, just log the action
    log_info "Rollback functionality would be implemented here"
    log_info "This might involve:"
    log_info "- Switching traffic back to previous version"
    log_info "- Restoring database if needed"
    log_info "- Notifying team of rollback"
}

# Main deployment function
main() {
    log_info "Starting deployment process..."
    
    validate_environment
    load_env_vars
    pre_deployment_checks
    
    # Build phase
    if [[ "$COMPONENT" == "frontend" || "$COMPONENT" == "all" ]]; then
        build_frontend
    fi
    
    if [[ "$COMPONENT" == "backend" || "$COMPONENT" == "all" ]]; then
        build_backend
    fi
    
    # Deploy phase
    if [[ "$COMPONENT" == "frontend" || "$COMPONENT" == "all" ]]; then
        deploy_frontend
    fi
    
    if [[ "$COMPONENT" == "backend" || "$COMPONENT" == "all" ]]; then
        deploy_backend
    fi
    
    # Verification phase
    if ! run_health_checks; then
        log_error "Health checks failed. Consider rolling back."
        if [[ "$ENVIRONMENT" == "production" ]]; then
            read -p "Do you want to rollback? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
        fi
        exit 1
    fi
    
    log_success "Deployment completed successfully!"
    log_info "Environment: $ENVIRONMENT"
    log_info "Component: $COMPONENT"
    log_info "Timestamp: $(date)"
}

# Handle script arguments
case "${1:-help}" in
    "staging"|"production")
        main
        ;;
    "rollback")
        rollback
        ;;
    "help"|*)
        echo "Usage: $0 [staging|production] [frontend|backend|all]"
        echo "       $0 rollback"
        echo ""
        echo "Examples:"
        echo "  $0 staging all          # Deploy both frontend and backend to staging"
        echo "  $0 production frontend  # Deploy only frontend to production"
        echo "  $0 rollback            # Rollback last deployment"
        exit 0
        ;;
esac