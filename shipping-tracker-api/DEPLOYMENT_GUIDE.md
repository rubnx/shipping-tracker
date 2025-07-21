# Container API Deployment Guide

## Quick Start

```bash
# Clone and deploy
git clone <repository>
cd shipping-tracker-api
./deploy.sh
```

## Production Deployment Checklist

### 1. Environment Setup ✅
- [ ] Update `.env` with production API keys
- [ ] Configure database connection string
- [ ] Set up Redis cache URL
- [ ] Configure rate limiting parameters
- [ ] Set production security keys

### 2. Infrastructure Requirements ✅
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL database (15+)
- [ ] Redis cache (7+)
- [ ] Nginx reverse proxy
- [ ] SSL certificates configured
- [ ] Monitoring tools setup

### 3. API Key Configuration ✅
```bash
# Major Ocean Carriers (9 providers)
MAERSK_API_KEY=your_key_here
MSC_API_KEY=your_key_here
CMA_CGM_API_KEY=your_key_here
COSCO_API_KEY=your_key_here
HAPAG_LLOYD_API_KEY=your_key_here
EVERGREEN_API_KEY=your_key_here
ONE_LINE_API_KEY=your_key_here
YANG_MING_API_KEY=your_key_here
ZIM_API_KEY=your_key_here

# Premium Aggregator (1 provider)
PROJECT44_API_KEY=your_key_here

# Container Aggregators (2 providers)
SHIPSGO_API_KEY=your_key_here
SEARATES_API_KEY=your_key_here

# Vessel Tracking (2 providers)
MARINE_TRAFFIC_API_KEY=your_key_here
VESSEL_FINDER_API_KEY=your_key_here

# Free Tracking (1 provider)
TRACK_TRACE_API_KEY=your_key_here
```

### 4. Security Configuration ✅
- [ ] HTTPS enabled with valid SSL certificates
- [ ] API keys stored securely (not in code)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Database access restricted

### 5. Performance Optimization ✅
- [ ] Redis cache configured and running
- [ ] Database indexes created
- [ ] Connection pooling enabled
- [ ] Request batching configured
- [ ] CDN setup for static assets

### 6. Monitoring and Alerting ✅
- [ ] Health checks configured
- [ ] Performance monitoring active
- [ ] Error tracking enabled
- [ ] Cost monitoring setup
- [ ] Alert thresholds configured
- [ ] Log aggregation enabled

## Deployment Commands

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Health Checks
```bash
# API health
curl http://localhost:3001/api/health

# Provider status
curl http://localhost:3001/api/dashboard/providers

# Performance metrics
curl http://localhost:3001/api/dashboard/performance
```

## Scaling Configuration

### Horizontal Scaling
```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
    ports:
      - "3001-3003:3001"
```

### Load Balancer Configuration
```nginx
upstream api_backend {
    server api1:3001;
    server api2:3001;
    server api3:3001;
}
```

## Backup and Recovery

### Automated Backups
```bash
# Run backup script
./backup.sh

# Schedule with cron
0 2 * * * /path/to/backup.sh
```

### Recovery Process
```bash
# Restore database
docker-compose exec db psql -U postgres -d shipping_tracker < backup.sql

# Restore Redis
docker-compose exec redis redis-cli --pipe < backup.rdb
```

## Troubleshooting

### Common Issues

#### API Keys Not Working
```bash
# Check key validity
curl -H "Authorization: Bearer $MAERSK_API_KEY" https://api.maersk.com/track/test

# Verify environment variables
docker-compose exec api env | grep API_KEY
```

#### High Response Times
```bash
# Check cache hit rate
curl http://localhost:3001/api/dashboard/cache-stats

# Monitor provider performance
./monitor.sh
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec db pg_isready -U postgres

# View database logs
docker-compose logs db
```

## Maintenance

### Regular Tasks
- **Daily**: Monitor error rates and performance
- **Weekly**: Review cost optimization recommendations
- **Monthly**: Rotate API keys and update dependencies
- **Quarterly**: Review provider contracts and performance

### Update Process
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
./deploy.sh

# Verify deployment
./monitor.sh
```

## Support

### Emergency Contacts
- System Administrator: admin@company.com
- On-Call Engineer: oncall@company.com
- API Support: support@company.com

### Useful Commands
```bash
# View all containers
docker-compose ps

# Restart specific service
docker-compose restart api

# View real-time logs
docker-compose logs -f api

# Execute commands in container
docker-compose exec api bash

# Database access
docker-compose exec db psql -U postgres shipping_tracker
```

---

*This deployment guide ensures successful production deployment of the Container API system with all 15 providers and enterprise-grade reliability.*