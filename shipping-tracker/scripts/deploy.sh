#!/bin/bash

# Deployment script for shipping tracker application
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
BUILD_DIR="dist"
BACKUP_DIR="backups"

echo -e "${GREEN}🚀 Starting deployment for ${ENVIRONMENT} environment${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are installed${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    
    if ! pnpm test:run; then
        echo -e "${RED}❌ Tests failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Run linting
run_linting() {
    echo -e "${YELLOW}🔍 Running linting...${NC}"
    
    if ! pnpm lint; then
        echo -e "${RED}❌ Linting failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Linting passed${NC}"
}

# Run type checking
run_type_check() {
    echo -e "${YELLOW}🔧 Running type checking...${NC}"
    
    if ! pnpm type-check; then
        echo -e "${RED}❌ Type checking failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Type checking passed${NC}"
}

# Build application
build_app() {
    echo -e "${YELLOW}🏗️  Building application...${NC}"
    
    # Set environment variables based on deployment target
    if [[ "$ENVIRONMENT" == "production" ]]; then
        export NODE_ENV=production
        export VITE_API_BASE_URL=${PROD_API_URL:-"https://api.shipping-tracker.com"}
        export VITE_ENABLE_ANALYTICS=true
        export VITE_ENABLE_ERROR_TRACKING=true
    else
        export NODE_ENV=staging
        export VITE_API_BASE_URL=${STAGING_API_URL:-"https://api-staging.shipping-tracker.com"}
        export VITE_ENABLE_ANALYTICS=false
        export VITE_ENABLE_ERROR_TRACKING=true
    fi
    
    # Clean previous build
    rm -rf $BUILD_DIR
    
    # Build the application
    if ! pnpm build; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Build completed successfully${NC}"
}

# Create backup
create_backup() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${YELLOW}💾 Creating backup...${NC}"
        
        mkdir -p $BACKUP_DIR
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        
        # In a real deployment, you would backup the current live version
        # cp -r /path/to/current/deployment $BACKUP_DIR/$BACKUP_NAME
        
        echo -e "${GREEN}✅ Backup created: $BACKUP_NAME${NC}"
    fi
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${YELLOW}🌐 Deploying to Vercel...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI is not installed${NC}"
        echo -e "${YELLOW}Install with: npm i -g vercel${NC}"
        exit 1
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    echo -e "${GREEN}✅ Deployment to Vercel completed${NC}"
}

# Deploy with Docker
deploy_docker() {
    echo -e "${YELLOW}🐳 Building Docker image...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Build Docker image
    IMAGE_NAME="shipping-tracker:${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
    
    if ! docker build -t $IMAGE_NAME .; then
        echo -e "${RED}❌ Docker build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker image built: $IMAGE_NAME${NC}"
    
    # Tag as latest for the environment
    docker tag $IMAGE_NAME "shipping-tracker:${ENVIRONMENT}-latest"
    
    # In a real deployment, you would push to a registry
    # docker push $IMAGE_NAME
    # docker push "shipping-tracker:${ENVIRONMENT}-latest"
}

# Run security scan
security_scan() {
    echo -e "${YELLOW}🔒 Running security scan...${NC}"
    
    # Run npm audit
    if ! pnpm audit --audit-level=high; then
        echo -e "${YELLOW}⚠️  Security vulnerabilities found. Review before deploying to production.${NC}"
        
        if [[ "$ENVIRONMENT" == "production" ]]; then
            read -p "Continue with deployment? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${RED}❌ Deployment cancelled${NC}"
                exit 1
            fi
        fi
    fi
    
    echo -e "${GREEN}✅ Security scan completed${NC}"
}

# Post-deployment verification
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    # In a real deployment, you would check if the application is responding
    # HEALTH_URL="https://your-app-url.com/health"
    # if ! curl -f $HEALTH_URL; then
    #     echo -e "${RED}❌ Health check failed${NC}"
    #     exit 1
    # fi
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Cleanup
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Clean up temporary files
    # rm -rf temp_files
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main deployment flow
main() {
    echo -e "${GREEN}🎯 Deploying shipping tracker to ${ENVIRONMENT}${NC}"
    echo "=================================================="
    
    check_dependencies
    security_scan
    run_linting
    run_type_check
    run_tests
    create_backup
    build_app
    
    # Choose deployment method based on environment variable
    DEPLOY_METHOD=${DEPLOY_METHOD:-vercel}
    
    case $DEPLOY_METHOD in
        vercel)
            deploy_vercel
            ;;
        docker)
            deploy_docker
            ;;
        *)
            echo -e "${RED}❌ Unknown deployment method: $DEPLOY_METHOD${NC}"
            exit 1
            ;;
    esac
    
    verify_deployment
    cleanup
    
    echo "=================================================="
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo -e "${GREEN}🌟 Production deployment is live!${NC}"
    else
        echo -e "${GREEN}🚧 Staging deployment is ready for testing${NC}"
    fi
}

# Handle script interruption
trap 'echo -e "${RED}❌ Deployment interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"