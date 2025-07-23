# Deployment Guide

This guide covers deploying the Shipping Tracker application to production environments with high availability, security, and performance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Load Balancer Configuration](#load-balancer-configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Backup Configuration](#backup-configuration)
9. [Security Hardening](#security-hardening)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps connection

#### Recommended Requirements
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 500GB SSD
- **Network**: 10Gbps connection

### Software Requirements
- **Operating System**: Ubuntu 20.04 LTS or CentOS 8
- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher
- **Node.js**: 18.x (for build process)
- **PostgreSQL**: 14.x
- **Redis**: 6.x
- **Nginx**: 1.20 or higher

### Domain and SSL
- Registered domain name
- SSL certificate (Let's Encrypt or commercial)
- DNS configuration access

## Environment Setup

### 1. Server Preparation

#### Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### Install Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Install Additional Tools
```bash
# Ubuntu/Debian
sudo apt install -y nginx certbot python3-certbot-nginx htop iotop git

# CentOS/RHEL
sudo yum install -y nginx certbot python3-certbot-nginx htop iotop git
```

### 2. User Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash shipping-tracker
sudo usermod -aG docker shipping-tracker

# Switch to application user
sudo su - shipping-tracker
```

### 3. Application Directory Structure
```bash
mkdir -p /home/shipping-tracker/{app,backups,logs,ssl,scripts}
cd /home/shipping-tracker/app

# Clone repository
git clone https://github.com/your-org/shipping-tracker.git .
```

## Environment Configuration

### 1. Production Environment Variables

Create `.env.production`:
```bash
# Application
NODE_ENV=production
PORT=3000
API_PORT=3001

# Domain Configuration
DOMAIN=shipping-tracker.com
API_DOMAIN=api.shipping-tracker.com
FRONTEND_URL=https://shipping-tracker.com
API_BASE_URL=https://api.shipping-tracker.com

# Database
DATABASE_URL=postgresql://shipping_user:secure_password@localhost:5432/shipping_tracker_prod
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=secure_redis_password

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
API_RATE_LIMIT=10000
CORS_ORIGIN=https://shipping-tracker.com

# External APIs
MAERSK_API_KEY=your_maersk_api_key
MSC_API_KEY=your_msc_api_key
CMA_CGM_API_KEY=your_cma_cgm_api_key
COSCO_API_KEY=your_cosco_api_key
HAPAG_LLOYD_API_KEY=your_hapag_lloyd_api_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true

# Notifications
SLACK_WEBHOOK_URL=your_slack_webhook_url
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email@gmail.com
EMAIL_SMTP_PASS=your_app_password

# Backup
S3_BUCKET=shipping-tracker-backups
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
```

### 2. Docker Environment
Create `docker-compose.production.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: shipping-tracker-postgres
    environment:
      POSTGRES_DB: shipping_tracker_prod
      POSTGRES_USER: shipping_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100

  redis:
    image: redis:6-alpine
    container_name: shipping-tracker-redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  shipping-tracker-api:
    image: shipping-tracker-api:latest
    container_name: shipping-tracker-api
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3001:3000"
    volumes:
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  shipping-tracker:
    image: shipping-tracker:latest
    container_name: shipping-tracker
    ports:
      - "3000:80"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: shipping-tracker-network
```

## Database Setup

### 1. PostgreSQL Installation and Configuration

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
```

#### Configure PostgreSQL
```bash
sudo -u postgres psql

-- Create database and user
CREATE DATABASE shipping_tracker_prod;
CREATE USER shipping_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE shipping_tracker_prod TO shipping_user;

-- Configure for production
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

SELECT pg_reload_conf();
\q
```

#### Configure Authentication
Edit `/etc/postgresql/14/main/pg_hba.conf`:
```
# Add SSL requirement
hostssl shipping_tracker_prod shipping_user 0.0.0.0/0 md5
```

Edit `/etc/postgresql/14/main/postgresql.conf`:
```
listen_addresses = 'localhost'
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### 2. Database Migration
```bash
cd /home/shipping-tracker/app/shipping-tracker-api
npm run migrate:prod
```

### 3. Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX CONCURRENTLY idx_shipments_carrier ON shipments(carrier);
CREATE INDEX CONCURRENTLY idx_shipments_status ON shipments(status);
CREATE INDEX CONCURRENTLY idx_shipments_created_at ON shipments(created_at);
CREATE INDEX CONCURRENTLY idx_events_shipment_id ON events(shipment_id);
CREATE INDEX CONCURRENTLY idx_events_timestamp ON events(timestamp);

-- Analyze tables
ANALYZE shipments;
ANALYZE events;
ANALYZE search_history;
```

## Application Deployment

### 1. Build Application
```bash
cd /home/shipping-tracker/app

# Build backend
cd shipping-tracker-api
npm ci --production
npm run build

# Build frontend
cd ../shipping-tracker
npm ci --production
npm run build

# Build Docker images
cd ..
docker build -t shipping-tracker-api:latest -f shipping-tracker-api/Dockerfile.prod shipping-tracker-api/
docker build -t shipping-tracker:latest -f shipping-tracker/Dockerfile.prod shipping-tracker/
```

### 2. Deploy with Script
```bash
# Make deployment script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh
```

### 3. Manual Deployment
```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Load Balancer Configuration

### 1. Nginx Configuration

Create `/etc/nginx/sites-available/shipping-tracker`:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

# Upstream servers
upstream shipping_tracker_api {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    # Add more servers for horizontal scaling
    # server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}

upstream shipping_tracker_web {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    # Add more servers for horizontal scaling
    # server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
}

# API Server
server {
    listen 80;
    listen [::]:80;
    server_name api.shipping-tracker.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.shipping-tracker.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.shipping-tracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.shipping-tracker.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://shipping_tracker_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://shipping_tracker_api/health;
    }

    # Metrics endpoint (restrict access)
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://shipping_tracker_api/metrics;
    }
}

# Web Server
server {
    listen 80;
    listen [::]:80;
    server_name shipping-tracker.com www.shipping-tracker.com;
    return 301 https://shipping-tracker.com$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.shipping-tracker.com;
    return 301 https://shipping-tracker.com$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name shipping-tracker.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/shipping-tracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shipping-tracker.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.shipping-tracker.com;";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req zone=web burst=50 nodelay;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://shipping_tracker_web;
    }

    location / {
        proxy_pass http://shipping_tracker_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/shipping-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Setup

### 1. Let's Encrypt Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d shipping-tracker.com -d www.shipping-tracker.com
sudo certbot --nginx -d api.shipping-tracker.com

# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 2. Commercial SSL Certificate
```bash
# Generate private key
openssl genrsa -out shipping-tracker.com.key 2048

# Generate CSR
openssl req -new -key shipping-tracker.com.key -out shipping-tracker.com.csr

# Install certificate files
sudo cp shipping-tracker.com.crt /etc/ssl/certs/
sudo cp shipping-tracker.com.key /etc/ssl/private/
sudo cp intermediate.crt /etc/ssl/certs/

# Set permissions
sudo chmod 644 /etc/ssl/certs/shipping-tracker.com.crt
sudo chmod 600 /etc/ssl/private/shipping-tracker.com.key
```

## Monitoring Setup

### 1. Deploy Monitoring Stack
```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Configure Grafana
```bash
# Access Grafana
open http://localhost:3001

# Default credentials: admin/admin
# Import dashboards from monitoring/grafana/dashboards/
```

### 3. Configure Alerting
Create `monitoring/alertmanager.yml`:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@shipping-tracker.com'
  smtp_auth_username: 'alerts@shipping-tracker.com'
  smtp_auth_password: 'your_app_password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@shipping-tracker.com'
    subject: 'Shipping Tracker Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
  
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
    title: 'Shipping Tracker Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Backup Configuration

### 1. Automated Backups
```bash
# Make backup script executable
chmod +x scripts/backup-restore.sh

# Set up daily backups
echo "0 2 * * * /home/shipping-tracker/app/scripts/backup-restore.sh backup" | crontab -

# Test backup
./scripts/backup-restore.sh backup
```

### 2. S3 Backup Configuration
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
```

### 3. Backup Verification
```bash
# List backups
./scripts/backup-restore.sh list

# Test restore (on staging)
./scripts/backup-restore.sh restore-db backup_file.sql.gz
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Ubuntu/Debian (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. SSH Hardening
Edit `/etc/ssh/sshd_config`:
```
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

### 3. System Hardening
```bash
# Disable unused services
sudo systemctl disable bluetooth
sudo systemctl disable cups

# Set up fail2ban
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure automatic updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Application Security
```bash
# Set up log monitoring
sudo apt install logwatch
echo "logwatch --output mail --mailto admin@shipping-tracker.com --detail high" | sudo crontab -

# Set up intrusion detection
sudo apt install aide
sudo aideinit
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Performance Optimization

### 1. System Optimization
```bash
# Optimize kernel parameters
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.ip_local_port_range = 1024 65535" | sudo tee -a /etc/sysctl.conf
echo "fs.file-max = 100000" | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

### 2. Database Optimization
```sql
-- Optimize PostgreSQL settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Application Optimization
```bash
# Enable Node.js clustering
export NODE_OPTIONS="--max-old-space-size=2048"

# Optimize Docker containers
docker system prune -f
docker image prune -f
```

### 4. CDN Setup
```bash
# Configure CloudFlare or AWS CloudFront
# Update DNS to point to CDN
# Configure cache rules for static assets
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs shipping-tracker-api
docker-compose logs shipping-tracker

# Check system resources
htop
df -h
free -h

# Check port availability
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U shipping_user -d shipping_tracker_prod

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Optimize containers
docker stats
docker update --memory=1g shipping-tracker-api
```

### 2. Performance Issues

#### Slow API Responses
```bash
# Check database performance
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Check Redis performance
redis-cli --latency-history

# Check system load
uptime
iostat -x 1
```

#### High CPU Usage
```bash
# Identify processes
top -p $(pgrep -d',' node)

# Check application metrics
curl http://localhost:3001/metrics

# Scale horizontally
docker-compose up --scale shipping-tracker-api=3
```

### 3. Monitoring and Alerts

#### Set Up Health Checks
```bash
# Create health check script
cat > /home/shipping-tracker/scripts/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "API health check failed" | mail -s "Shipping Tracker Alert" admin@shipping-tracker.com
    exit 1
fi
EOF

chmod +x /home/shipping-tracker/scripts/health-check.sh

# Add to crontab
echo "*/5 * * * * /home/shipping-tracker/scripts/health-check.sh" | crontab -
```

#### Log Analysis
```bash
# Analyze error logs
grep "ERROR" /home/shipping-tracker/app/logs/application.log | tail -100

# Monitor access patterns
tail -f /var/log/nginx/access.log | grep -E "(POST|PUT|DELETE)"

# Check for suspicious activity
fail2ban-client status nginx-limit-req
```

## Maintenance

### 1. Regular Maintenance Tasks

#### Daily
```bash
# Check system health
./scripts/deploy-production.sh health-check

# Verify backups
./scripts/backup-restore.sh list

# Monitor logs
tail -100 /home/shipping-tracker/app/logs/application.log
```

#### Weekly
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker
docker system prune -f

# Rotate logs
sudo logrotate -f /etc/logrotate.conf
```

#### Monthly
```bash
# Security updates
sudo unattended-upgrades

# Performance review
./scripts/performance-report.sh

# Backup verification
./scripts/backup-restore.sh verify
```

### 2. Scaling

#### Horizontal Scaling
```bash
# Add more API instances
docker-compose up --scale shipping-tracker-api=3

# Update Nginx upstream
# Add new servers to upstream block
```

#### Vertical Scaling
```bash
# Increase container resources
docker update --memory=4g --cpus=2 shipping-tracker-api

# Update database resources
# Modify PostgreSQL configuration
```

---

This deployment guide provides a comprehensive approach to deploying the Shipping Tracker application in a production environment. Follow the steps carefully and adapt them to your specific infrastructure requirements.