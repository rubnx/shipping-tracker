# Shipping Tracker Application

A comprehensive, production-ready shipping container tracking application with advanced analytics, real-time monitoring, and multi-carrier API integration.

## 🚀 Features

### Core Functionality
- **Multi-Carrier Tracking**: Support for 15+ major shipping carriers including Maersk, MSC, CMA CGM, COSCO, and more
- **Real-Time Updates**: Live tracking with automatic status updates and notifications
- **Interactive Maps**: Visual route tracking with vessel positions and port information
- **Advanced Search**: Powerful search and filtering capabilities with saved searches
- **Bulk Tracking**: Process multiple containers simultaneously
- **Timeline Visualization**: Detailed shipment timeline with milestone tracking

### Analytics & Business Intelligence
- **Interactive Charts**: Customizable charts and graphs for shipping analytics
- **Performance Metrics**: Carrier performance analysis and route optimization
- **Cost Analysis**: API usage tracking and cost optimization recommendations
- **Export Capabilities**: PDF, Excel, CSV, JSON, and XML export options
- **Custom Dashboards**: Configurable monitoring dashboards

### Enterprise Features
- **API Key Management**: Secure API key rotation and usage monitoring
- **Rate Limiting**: Advanced rate limiting and abuse prevention
- **Caching**: Multi-layer caching with Redis and edge caching
- **Security**: Comprehensive security measures and audit logging
- **Monitoring**: Full observability with Prometheus, Grafana, and alerting
- **Auto-scaling**: Horizontal scaling and load balancing

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with responsive design
- **State Management**: Zustand for global state
- **API Client**: React Query for server state management
- **Maps**: Leaflet for interactive mapping
- **Charts**: Recharts for data visualization

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for session and data caching
- **Authentication**: JWT-based authentication
- **API Documentation**: OpenAPI/Swagger specification

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus + Grafana stack
- **Logging**: Structured logging with log rotation
- **CI/CD**: GitHub Actions for automated deployment

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher
- **Docker Compose**: 2.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/shipping-tracker.git
cd shipping-tracker
```

### 2. Environment Setup
```bash
# Copy environment files
cp .env.example .env.development
cp shipping-tracker-api/.env.example shipping-tracker-api/.env
cp shipping-tracker/.env.example shipping-tracker/.env

# Edit environment variables
nano .env.development
```

### 3. Start Development Environment
```bash
# Start all services
docker-compose up -d

# Install dependencies
npm run install:all

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Monitoring**: http://localhost:3002/grafana

## 🔧 Configuration

### Environment Variables

#### Core Application
```bash
NODE_ENV=development
PORT=3000
API_PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shipping_tracker
REDIS_URL=redis://localhost:6379

# API Keys (obtain from respective carriers)
MAERSK_API_KEY=your_maersk_api_key
MSC_API_KEY=your_msc_api_key
CMA_CGM_API_KEY=your_cma_cgm_api_key
# ... additional carrier API keys

# External Services
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook
```

#### Security
```bash
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
API_RATE_LIMIT=1000
```

#### Monitoring
```bash
PROMETHEUS_ENABLED=true
GRAFANA_USER=admin
GRAFANA_PASSWORD=secure_password
```

### API Key Configuration

The application supports multiple carrier APIs. Configure them in the admin panel or via environment variables:

1. **Maersk API**: Register at [Maersk Developer Portal](https://developer.maersk.com)
2. **MSC API**: Contact MSC for API access
3. **Track-Trace API**: Free tier available at [Track-Trace.com](https://track-trace.com)

## 📚 API Documentation

### Authentication
All API endpoints require authentication via API key or JWT token:

```bash
# API Key authentication
curl -H "X-API-Key: your_api_key" http://localhost:3001/api/tracking/MAEU123456789

# JWT authentication
curl -H "Authorization: Bearer your_jwt_token" http://localhost:3001/api/tracking/MAEU123456789
```

### Core Endpoints

#### Tracking
```bash
# Track single container
GET /api/tracking/:trackingNumber

# Bulk tracking
POST /api/tracking/bulk
{
  "trackingNumbers": ["MAEU123456789", "MSCU987654321"],
  "options": {
    "includeHistory": true,
    "includeVesselInfo": true
  }
}
```

#### Analytics
```bash
# Get shipping analytics
GET /api/analytics/shipping-routes?timeRange=30d

# Get business intelligence
GET /api/analytics/business-intelligence

# Export data
GET /api/analytics/export?format=csv&timeRange=7d
```

#### Admin
```bash
# API key management
GET /api/admin/api-keys
POST /api/admin/api-keys
PUT /api/admin/api-keys/:id
DELETE /api/admin/api-keys/:id

# System health
GET /api/health
GET /api/metrics
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Test Structure
```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── e2e/                 # End-to-end tests
├── fixtures/            # Test data
└── helpers/             # Test utilities
```

### Writing Tests
```typescript
// Example unit test
import { trackingService } from '../src/services/TrackingService';

describe('TrackingService', () => {
  it('should validate tracking number format', () => {
    const result = trackingService.validateTrackingNumber('MAEU123456789');
    expect(result.isValid).toBe(true);
    expect(result.carrier).toBe('Maersk');
  });
});
```

## 🚀 Deployment

### Production Deployment

#### 1. Prepare Environment
```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=your_production_db_url
export REDIS_URL=your_production_redis_url

# Configure SSL certificates
sudo certbot --nginx -d your-domain.com
```

#### 2. Deploy with Script
```bash
# Run production deployment
./scripts/deploy-production.sh

# Check deployment status
./scripts/deploy-production.sh health-check

# Rollback if needed
./scripts/deploy-production.sh rollback
```

#### 3. Zero-Downtime Deployment
The deployment script supports zero-downtime deployment:
- Builds new Docker images
- Starts new containers alongside existing ones
- Performs health checks
- Switches traffic to new containers
- Removes old containers

### Docker Deployment
```bash
# Build production images
docker build -t shipping-tracker-api:latest -f shipping-tracker-api/Dockerfile.prod shipping-tracker-api/
docker build -t shipping-tracker:latest -f shipping-tracker/Dockerfile.prod shipping-tracker/

# Start production stack
docker-compose -f docker-compose.production.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n shipping-tracker
kubectl get services -n shipping-tracker
```

## 📊 Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Custom business metrics and performance indicators
- **System Metrics**: CPU, memory, disk, and network usage
- **Database Metrics**: Query performance and connection pooling
- **API Metrics**: Request rates, response times, and error rates

### Dashboards
Access pre-configured dashboards:
- **Application Overview**: http://localhost:3001/grafana/d/app-overview
- **System Health**: http://localhost:3001/grafana/d/system-health
- **API Performance**: http://localhost:3001/grafana/d/api-performance
- **Business Metrics**: http://localhost:3001/grafana/d/business-metrics

### Alerting
Configure alerts for:
- High error rates (>5%)
- Slow response times (>2s)
- System resource usage (>80%)
- API quota limits
- Database connection issues

### Log Management
```bash
# View application logs
docker-compose logs -f shipping-tracker-api

# Search logs with specific criteria
grep "ERROR" logs/application.log

# Export logs for analysis
./scripts/export-logs.sh --since="2024-01-01" --format=json
```

## 🔒 Security

### Security Features
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Per-IP and per-user rate limiting
- **API Key Management**: Secure key generation and rotation
- **Audit Logging**: Complete audit trail of all actions
- **HTTPS Enforcement**: SSL/TLS encryption for all traffic
- **Security Headers**: OWASP recommended security headers

### Security Best Practices
1. **Regular Updates**: Keep dependencies updated
2. **API Key Rotation**: Rotate API keys regularly
3. **Access Control**: Implement proper RBAC
4. **Monitoring**: Monitor for suspicious activities
5. **Backup**: Regular encrypted backups

### Vulnerability Scanning
```bash
# Run security audit
npm audit

# Check for known vulnerabilities
npm run security:check

# Update vulnerable packages
npm audit fix
```

## 🔧 Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health and alerts
- Check error logs for issues
- Verify backup completion
- Review API usage and costs

#### Weekly
- Update dependencies
- Clean up old logs and backups
- Review performance metrics
- Test disaster recovery procedures

#### Monthly
- Security audit and vulnerability scan
- Performance optimization review
- Capacity planning assessment
- Documentation updates

### Backup & Recovery
```bash
# Create full backup
./scripts/backup-restore.sh backup

# Restore from backup
./scripts/backup-restore.sh restore-db backup_file.sql.gz

# Disaster recovery
./scripts/backup-restore.sh disaster-recovery 20240101_120000
```

### Performance Optimization
```bash
# Analyze performance
npm run analyze:performance

# Optimize database
npm run db:optimize

# Clear caches
npm run cache:clear

# Update search indexes
npm run search:reindex
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for quality checks

### Pull Request Guidelines
- Include tests for new features
- Update documentation as needed
- Follow conventional commit messages
- Ensure CI/CD pipeline passes
- Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and inline documentation
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact support@shipping-tracker.com

### Troubleshooting

#### Common Issues

**Database Connection Issues**
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
npm run db:test-connection
```

**API Rate Limiting**
```bash
# Check current usage
curl -H "X-API-Key: your_key" http://localhost:3001/api/admin/usage

# Reset rate limits
npm run admin:reset-limits
```

**Performance Issues**
```bash
# Check system resources
docker stats

# Analyze slow queries
npm run db:slow-queries

# Clear caches
npm run cache:clear
```

### Performance Benchmarks
- **Response Time**: <200ms for cached requests, <2s for API calls
- **Throughput**: 1000+ requests per second
- **Uptime**: 99.9% availability target
- **Error Rate**: <1% error rate target

## 🗺️ Roadmap

### Version 2.0 (Q2 2024)
- [ ] Machine learning for delivery predictions
- [ ] Mobile application (React Native)
- [ ] Advanced analytics with AI insights
- [ ] Multi-tenant architecture
- [ ] GraphQL API support

### Version 2.1 (Q3 2024)
- [ ] Blockchain integration for supply chain transparency
- [ ] IoT sensor data integration
- [ ] Advanced notification system
- [ ] Custom workflow automation
- [ ] Enhanced security features

### Version 3.0 (Q4 2024)
- [ ] Microservices architecture
- [ ] Kubernetes native deployment
- [ ] Advanced AI/ML capabilities
- [ ] Global CDN integration
- [ ] Enterprise SSO integration

## 📊 Metrics & KPIs

### Application Metrics
- **Active Users**: Track daily/monthly active users
- **API Calls**: Monitor API usage and performance
- **Error Rates**: Track and minimize error rates
- **Response Times**: Maintain fast response times
- **Uptime**: Achieve 99.9% uptime target

### Business Metrics
- **Tracking Accuracy**: >95% accurate tracking data
- **Cost Efficiency**: Optimize API costs per tracking request
- **User Satisfaction**: Monitor user feedback and ratings
- **Feature Adoption**: Track usage of new features
- **Support Tickets**: Minimize support requests

---

**Built with ❤️ by the Shipping Tracker Team**

For more information, visit our [website](https://shipping-tracker.com) or contact us at [support@shipping-tracker.com](mailto:support@shipping-tracker.com).