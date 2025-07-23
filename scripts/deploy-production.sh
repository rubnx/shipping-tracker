#!/bin/bash

# Production Deployment Script
# This script handles complete deployment automation with zero-downtime deployment

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="deploy_${TIMESTAMP}"

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

# Configuration validation
validate_environment() {
    log_info "Validating deployment environment..."
    
    # Check required environment variables
    required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_URL"
        "SENTRY_DSN"
        "API_BASE_URL"
        "FRONTEND_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate NODE_ENV
    if [[ "$NODE_ENV" != "production" ]]; then
        log_error "NODE_ENV must be set to 'production' for production deployment"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed"; exit 1; }
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed"; exit 1; }
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check available disk space (require at least 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    required_space=5242880  # 5GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Required: 5GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi
    
    # Check if ports are available
    check_port() {
        local port=$1
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
            log_warning "Port $port is already in use"
            return 1
        fi
        return 0
    }
    
    # Check required ports (80, 443, 3000, 5432, 6379)
    ports=(80 443 3000 5432 6379)
    for port in "${ports[@]}"; do
        if ! check_port $port; then
            log_warning "Port $port is in use - this may cause conflicts"
        fi
    done
    
    log_success "Pre-deployment checks passed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    cd shipping-tracker-api
    npm ci --production=false
    
    log_info "Installing frontend dependencies..."
    cd ../shipping-tracker
    npm ci --production=false
    
    # Run tests
    log_info "Running tests..."
    npm run test:ci || {
        log_error "Tests failed - deployment aborted"
        exit 1
    }
    
    # Build frontend
    log_info "Building frontend..."
    npm run build || {
        log_error "Frontend build failed"
        exit 1
    }
    
    # Build backend
    log_info "Building backend..."
    cd ../shipping-tracker-api
    npm run build || {
        log_error "Backend build failed"
        exit 1
    }
    
    log_success "Application build completed"
}

# Database migration
run_database_migration() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT/shipping-tracker-api"
    
    # Create backup before migration
    backup_file="db_backup_${TIMESTAMP}.sql"
    log_info "Creating database backup: $backup_file"
    
    # Extract database info from DATABASE_URL
    db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    
    # Create backup
    PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
    pg_dump -h $db_host -p $db_port -U $db_user -d $db_name > "backups/$backup_file" || {
        log_error "Database backup failed"
        exit 1
    }
    
    # Run migrations
    npm run migrate || {
        log_error "Database migration failed"
        log_info "Restoring database from backup..."
        PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
        psql -h $db_host -p $db_port -U $db_user -d $db_name < "backups/$backup_file"
        exit 1
    }
    
    log_success "Database migration completed"
}

# Build Docker images
build_docker_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    log_info "Building backend Docker image..."
    docker build -t shipping-tracker-api:$TIMESTAMP -f shipping-tracker-api/Dockerfile.prod shipping-tracker-api/ || {
        log_error "Backend Docker build failed"
        exit 1
    }
    
    # Build frontend image
    log_info "Building frontend Docker image..."
    docker build -t shipping-tracker:$TIMESTAMP -f shipping-tracker/Dockerfile.prod shipping-tracker/ || {
        log_error "Frontend Docker build failed"
        exit 1
    }
    
    # Tag as latest
    docker tag shipping-tracker-api:$TIMESTAMP shipping-tracker-api:latest
    docker tag shipping-tracker:$TIMESTAMP shipping-tracker:latest
    
    log_success "Docker images built successfully"
}

# Deploy with zero downtime
deploy_zero_downtime() {
    log_info "Starting zero-downtime deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Create deployment directory
    deployment_dir="deployments/$DEPLOYMENT_ID"
    mkdir -p "$deployment_dir"
    
    # Copy docker-compose files
    cp docker-compose.production.yml "$deployment_dir/"
    cp .env.production "$deployment_dir/.env"
    
    cd "$deployment_dir"
    
    # Update image tags in docker-compose
    sed -i "s/:latest/:$TIMESTAMP/g" docker-compose.production.yml
    
    # Start new containers with different names
    log_info "Starting new containers..."
    docker-compose -f docker-compose.production.yml -p "shipping-tracker-new" up -d || {
        log_error "Failed to start new containers"
        exit 1
    }
    
    # Health check for new deployment
    log_info "Performing health checks..."
    health_check_url="http://localhost:3001/health"  # Assuming new deployment uses port 3001
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_check_url" >/dev/null 2>&1; then
            log_success "Health check passed"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Health check failed after $max_attempts attempts"
            log_info "Rolling back deployment..."
            docker-compose -f docker-compose.production.yml -p "shipping-tracker-new" down
            exit 1
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    # Switch traffic (update load balancer or reverse proxy)
    log_info "Switching traffic to new deployment..."
    
    # Update nginx configuration to point to new containers
    if [[ -f "/etc/nginx/sites-available/shipping-tracker" ]]; then
        # Backup current nginx config
        cp /etc/nginx/sites-available/shipping-tracker "/etc/nginx/sites-available/shipping-tracker.backup.$TIMESTAMP"
        
        # Update upstream servers
        sed -i 's/server shipping-tracker-api:3000/server shipping-tracker-new_shipping-tracker-api_1:3000/g' /etc/nginx/sites-available/shipping-tracker
        sed -i 's/server shipping-tracker:80/server shipping-tracker-new_shipping-tracker_1:80/g' /etc/nginx/sites-available/shipping-tracker
        
        # Test nginx configuration
        nginx -t || {
            log_error "Nginx configuration test failed"
            # Restore backup
            cp "/etc/nginx/sites-available/shipping-tracker.backup.$TIMESTAMP" /etc/nginx/sites-available/shipping-tracker
            exit 1
        }
        
        # Reload nginx
        systemctl reload nginx || {
            log_error "Failed to reload nginx"
            exit 1
        }
    fi
    
    # Wait for traffic to stabilize
    log_info "Waiting for traffic to stabilize..."
    sleep 30
    
    # Final health check
    if ! curl -f -s "http://localhost/health" >/dev/null 2>&1; then
        log_error "Final health check failed"
        exit 1
    fi
    
    # Stop old containers
    log_info "Stopping old containers..."
    docker-compose -f docker-compose.production.yml -p "shipping-tracker" down || {
        log_warning "Failed to stop old containers (they may not exist)"
    }
    
    # Rename new deployment to main
    docker-compose -f docker-compose.production.yml -p "shipping-tracker-new" stop
    
    # Update main docker-compose to use new images
    cd "$PROJECT_ROOT"
    sed -i "s/:latest/:$TIMESTAMP/g" docker-compose.production.yml
    
    # Start main deployment
    docker-compose -f docker-compose.production.yml -p "shipping-tracker" up -d
    
    # Update nginx back to main containers
    if [[ -f "/etc/nginx/sites-available/shipping-tracker" ]]; then
        sed -i 's/server shipping-tracker-new_shipping-tracker-api_1:3000/server shipping-tracker_shipping-tracker-api_1:3000/g' /etc/nginx/sites-available/shipping-tracker
        sed -i 's/server shipping-tracker-new_shipping-tracker_1:80/server shipping-tracker_shipping-tracker_1:80/g' /etc/nginx/sites-available/shipping-tracker
        systemctl reload nginx
    fi
    
    # Clean up temporary deployment
    docker-compose -f "$deployment_dir/docker-compose.production.yml" -p "shipping-tracker-new" down
    
    log_success "Zero-downtime deployment completed"
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Health checks
    endpoints=(
        "http://localhost/health"
        "http://localhost/api/health"
        "http://localhost/api/metrics"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking endpoint: $endpoint"
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            log_success "✓ $endpoint is healthy"
        else
            log_error "✗ $endpoint is not responding"
            exit 1
        fi
    done
    
    # Database connectivity check
    log_info "Checking database connectivity..."
    cd "$PROJECT_ROOT/shipping-tracker-api"
    if npm run db:check >/dev/null 2>&1; then
        log_success "✓ Database connectivity verified"
    else
        log_error "✗ Database connectivity failed"
        exit 1
    fi
    
    # Redis connectivity check
    log_info "Checking Redis connectivity..."
    if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
        log_success "✓ Redis connectivity verified"
    else
        log_error "✗ Redis connectivity failed"
        exit 1
    fi
    
    # Performance check
    log_info "Running performance check..."
    response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/api/health)
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "✓ Response time is acceptable: ${response_time}s"
    else
        log_warning "⚠ Response time is slow: ${response_time}s"
    fi
    
    log_success "Post-deployment verification completed"
}

# Cleanup old deployments
cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."
    
    # Keep only last 5 deployments
    cd "$PROJECT_ROOT/deployments"
    ls -t | tail -n +6 | xargs -r rm -rf
    
    # Clean up old Docker images (keep last 3)
    docker images shipping-tracker-api --format "table {{.Tag}}" | grep -v "latest" | grep -v "TAG" | tail -n +4 | xargs -r docker rmi shipping-tracker-api: 2>/dev/null || true
    docker images shipping-tracker --format "table {{.Tag}}" | grep -v "latest" | grep -v "TAG" | tail -n +4 | xargs -r docker rmi shipping-tracker: 2>/dev/null || true
    
    # Clean up old database backups (keep last 10)
    cd "$PROJECT_ROOT/shipping-tracker-api/backups"
    ls -t db_backup_*.sql | tail -n +11 | xargs -r rm -f
    
    log_success "Cleanup completed"
}

# Rollback function
rollback_deployment() {
    local rollback_to=${1:-"previous"}
    
    log_warning "Rolling back deployment to: $rollback_to"
    
    if [[ "$rollback_to" == "previous" ]]; then
        # Find previous deployment
        cd "$PROJECT_ROOT/deployments"
        previous_deployment=$(ls -t | head -n 2 | tail -n 1)
        
        if [[ -z "$previous_deployment" ]]; then
            log_error "No previous deployment found"
            exit 1
        fi
        
        rollback_to="$previous_deployment"
    fi
    
    deployment_dir="$PROJECT_ROOT/deployments/$rollback_to"
    
    if [[ ! -d "$deployment_dir" ]]; then
        log_error "Deployment directory not found: $deployment_dir"
        exit 1
    fi
    
    log_info "Rolling back to deployment: $rollback_to"
    
    # Stop current deployment
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.production.yml down
    
    # Start previous deployment
    cd "$deployment_dir"
    docker-compose -f docker-compose.production.yml up -d
    
    # Update nginx if needed
    if [[ -f "/etc/nginx/sites-available/shipping-tracker.backup.$rollback_to" ]]; then
        cp "/etc/nginx/sites-available/shipping-tracker.backup.$rollback_to" /etc/nginx/sites-available/shipping-tracker
        systemctl reload nginx
    fi
    
    log_success "Rollback completed"
}

# Monitoring and alerting setup
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create monitoring configuration
    cat > "$PROJECT_ROOT/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'shipping-tracker-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    
  - job_name: 'shipping-tracker-frontend'
    static_configs:
      - targets: ['localhost:80']
    metrics_path: '/metrics'
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
EOF
    
    # Start monitoring stack
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.monitoring.yml up -d
    
    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    log_info "Starting production deployment: $DEPLOYMENT_ID"
    log_info "Timestamp: $(date)"
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/deployments"
    mkdir -p "$PROJECT_ROOT/shipping-tracker-api/backups"
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Redirect all output to log file
    exec > >(tee -a "$PROJECT_ROOT/logs/deployment_${TIMESTAMP}.log")
    exec 2>&1
    
    # Handle rollback if requested
    if [[ "$1" == "rollback" ]]; then
        rollback_deployment "$2"
        exit 0
    fi
    
    # Main deployment flow
    validate_environment
    pre_deployment_checks
    build_application
    run_database_migration
    build_docker_images
    deploy_zero_downtime
    post_deployment_verification
    setup_monitoring
    cleanup_old_deployments
    
    log_success "🎉 Production deployment completed successfully!"
    log_info "Deployment ID: $DEPLOYMENT_ID"
    log_info "Application URL: $FRONTEND_URL"
    log_info "API URL: $API_BASE_URL"
    log_info "Monitoring: http://localhost:3001/grafana"
    
    # Send deployment notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Shipping Tracker deployed successfully!\nDeployment ID: $DEPLOYMENT_ID\nURL: $FRONTEND_URL\"}" \
            "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback_deployment "$2"
        ;;
    "health-check")
        post_deployment_verification
        ;;
    "cleanup")
        cleanup_old_deployments
        ;;
    *)
        echo "Usage: $0 {deploy|rollback [deployment_id]|health-check|cleanup}"
        exit 1
        ;;
esac