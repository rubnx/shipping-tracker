#!/bin/bash

# Container API Deployment Script
# Deploys the shipping tracker API with all 15 container providers

set -e

echo "🚀 Starting Container API Deployment..."

# Configuration
APP_NAME="shipping-tracker-api"
DOCKER_IMAGE="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-container"
PORT=3001

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Node.js (for local development)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js is not installed (required for local development)"
    fi
    
    log_success "Prerequisites check completed"
}

# Environment setup
setup_environment() {
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warning "Please update .env file with your API keys before deployment"
    fi
    
    # Validate critical environment variables
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set, using default PostgreSQL configuration"
    fi
    
    log_success "Environment setup completed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npm run build
    
    # Run tests
    log_info "Running tests..."
    npm test -- --passWithNoTests
    
    log_success "Application build completed"
}

# Build Docker image
build_docker_image() {
    log_info "Building Docker image..."
    
    # Create Dockerfile if it doesn't exist
    if [ ! -f Dockerfile ]; then
        log_info "Creating Dockerfile..."
        cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY .env ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
EOF
    fi
    
    # Build Docker image
    docker build -t $DOCKER_IMAGE .
    
    log_success "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_with_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Create docker-compose.yml if it doesn't exist
    if [ ! -f docker-compose.yml ]; then
        log_info "Creating docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/shipping_tracker
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: shipping_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF
    fi
    
    # Create nginx configuration
    if [ ! -f nginx.conf ]; then
        log_info "Creating nginx configuration..."
        cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3001;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            access_log off;
            proxy_pass http://api/api/health;
        }
    }
}
EOF
    fi
    
    # Create database initialization script
    if [ ! -f init.sql ]; then
        log_info "Creating database initialization script..."
        cat > init.sql << 'EOF'
-- Create database tables
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(50) NOT NULL,
    tracking_type VARCHAR(20) NOT NULL,
    carrier VARCHAR(100),
    service VARCHAR(10),
    status VARCHAR(50),
    data JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_number VARCHAR(50) NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched TIMESTAMP DEFAULT NOW(),
    user_session VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_provider VARCHAR(50) NOT NULL,
    endpoint VARCHAR(200),
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    rate_limit_remaining INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_tracking_number ON search_history(tracking_number);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(api_provider);
EOF
    fi
    
    # Deploy with Docker Compose
    docker-compose down
    docker-compose up -d
    
    log_success "Deployment with Docker Compose completed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Containers are running"
    else
        log_error "Some containers failed to start"
        docker-compose logs
        exit 1
    fi
    
    # Check API health
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    # Check database connection
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        log_success "Database connection verified"
    else
        log_error "Database connection failed"
        exit 1
    fi
    
    # Check Redis connection
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis connection verified"
    else
        log_error "Redis connection failed"
        exit 1
    fi
    
    log_success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring script
    cat > monitor.sh << 'EOF'
#!/bin/bash

# Container API Monitoring Script

echo "📊 Container API Monitoring Report"
echo "=================================="

# Check container status
echo "🐳 Container Status:"
docker-compose ps

# Check API health
echo -e "\n🏥 API Health:"
curl -s http://localhost:3001/api/health | jq '.'

# Check provider status
echo -e "\n📡 Provider Status:"
curl -s http://localhost:3001/api/dashboard/providers | jq '.data[] | {name: .name, status: .status, reliability: .reliability}'

# Check performance metrics
echo -e "\n⚡ Performance Metrics:"
curl -s http://localhost:3001/api/dashboard/performance | jq '.data'

# Check recent logs
echo -e "\n📝 Recent Logs:"
docker-compose logs --tail=10 api
EOF
    
    chmod +x monitor.sh
    
    log_success "Monitoring setup completed"
}

# Create backup script
create_backup_script() {
    log_info "Creating backup script..."
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# Container API Backup Script

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "📦 Creating backup..."

# Backup database
docker-compose exec -T db pg_dump -U postgres shipping_tracker > "$BACKUP_DIR/database_$TIMESTAMP.sql"

# Backup Redis data
docker-compose exec -T redis redis-cli --rdb - > "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# Backup configuration
cp .env "$BACKUP_DIR/env_$TIMESTAMP"
cp docker-compose.yml "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml"

echo "✅ Backup completed: $BACKUP_DIR"
EOF
    
    chmod +x backup.sh
    
    log_success "Backup script created"
}

# Main deployment function
main() {
    echo "🚀 Container API Deployment Script"
    echo "=================================="
    
    check_prerequisites
    setup_environment
    build_application
    build_docker_image
    deploy_with_compose
    verify_deployment
    setup_monitoring
    create_backup_script
    
    echo ""
    log_success "🎉 Container API Deployment Completed Successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "   • 15 Container API providers integrated"
    echo "   • PostgreSQL database configured"
    echo "   • Redis cache enabled"
    echo "   • Nginx reverse proxy setup"
    echo "   • Health monitoring active"
    echo "   • Backup scripts created"
    echo ""
    echo "🔗 Access Points:"
    echo "   • API: http://localhost:3001"
    echo "   • Dashboard: http://localhost:3001/api/dashboard/summary"
    echo "   • Health: http://localhost:3001/api/health"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   • Monitor: ./monitor.sh"
    echo "   • Backup: ./backup.sh"
    echo "   • Logs: docker-compose logs -f"
    echo "   • Stop: docker-compose down"
    echo ""
    echo "⚠️  Next Steps:"
    echo "   1. Update .env file with your API keys"
    echo "   2. Configure SSL certificates for production"
    echo "   3. Set up external monitoring and alerting"
    echo "   4. Schedule regular backups"
    echo ""
}

# Run main function
main "$@"