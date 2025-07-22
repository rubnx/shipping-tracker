# Database Setup Guide

This guide explains how to set up the local development database for the Shipping Tracker application.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- PostgreSQL client tools (optional, for manual database access)

## Quick Start

### 1. Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Or start with management tools (pgAdmin, Redis Commander)
docker-compose -f docker-compose.dev.yml --profile tools up -d
```

### 2. Set Up Database Schema

```bash
cd shipping-tracker-api

# Install dependencies
npm install

# Set up database tables and seed data
npm run setup:db
```

### 3. Verify Setup

```bash
# Validate environment and database connection
npm run validate:env
```

## Detailed Setup

### Database Services

The `docker-compose.dev.yml` file provides the following services:

#### PostgreSQL Database
- **Port**: 5432
- **Database**: shipping_tracker
- **Username**: postgres
- **Password**: password
- **Data Volume**: postgres_data

#### Redis Cache
- **Port**: 6379
- **Configuration**: Custom redis.conf
- **Data Volume**: redis_data

#### Management Tools (Optional)
- **pgAdmin**: http://localhost:5050
  - Email: admin@shippingtracker.local
  - Password: admin
- **Redis Commander**: http://localhost:8081
  - Username: admin
  - Password: admin

### Database Schema

The database includes the following tables:

#### `shipments`
Stores cached tracking data from API responses.

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number VARCHAR(50) NOT NULL,
  tracking_type VARCHAR(20) NOT NULL CHECK (tracking_type IN ('booking', 'container', 'bol')),
  carrier VARCHAR(100),
  service VARCHAR(10) CHECK (service IN ('FCL', 'LCL')),
  status VARCHAR(50),
  data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `search_history`
Tracks user search patterns for auto-complete and analytics.

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number VARCHAR(50) NOT NULL,
  tracking_type VARCHAR(20) CHECK (tracking_type IN ('booking', 'container', 'bol')),
  search_count INTEGER DEFAULT 1,
  last_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `api_usage`
Monitors API usage for rate limiting and analytics.

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_provider VARCHAR(50) NOT NULL,
  endpoint VARCHAR(200),
  requests_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rate_limit_remaining INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Database Functions

#### `cleanup_expired_shipments()`
Removes expired cached shipment data.

```sql
SELECT cleanup_expired_shipments();
```

#### `upsert_search_history(tracking_number, tracking_type, user_session)`
Updates or inserts search history records.

```sql
SELECT upsert_search_history('DEMO123456789', 'container', 'user-session-123');
```

### Database Views

#### `recent_search_activity`
Shows search activity from the last 7 days.

```sql
SELECT * FROM recent_search_activity;
```

#### `api_usage_summary`
Summarizes API usage from the last 24 hours.

```sql
SELECT * FROM api_usage_summary;
```

## Development Commands

### Database Management

```bash
# Start database services
docker-compose -f docker-compose.dev.yml up -d

# Stop database services
docker-compose -f docker-compose.dev.yml down

# View database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Reset database (drops all tables and recreates)
npm run setup:db:reset

# Run migrations only
npm run migrate
```

### Environment Setup

```bash
# Interactive environment setup
npm run setup:env

# Validate environment configuration
npm run validate:env
```

### Database Connection

```bash
# Connect to PostgreSQL directly
docker exec -it shipping_tracker_postgres psql -U postgres -d shipping_tracker

# Connect to Redis directly
docker exec -it shipping_tracker_redis redis-cli
```

## Sample Data

The setup includes sample data for development:

### Demo Tracking Numbers
- `DEMO123456789` - In Transit container shipment
- `CONTAINER001` - Delivered container
- `BOOKING002` - Container loading booking

### Sample Search History
- Recent searches for demo tracking numbers
- Multiple user sessions for testing

### API Usage Data
- Sample usage data for different API providers
- Rate limiting information

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Check PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

#### Migration Errors
```bash
# Check migration status
docker exec -it shipping_tracker_postgres psql -U postgres -d shipping_tracker -c "SELECT * FROM schema_migrations;"

# Reset database completely
npm run setup:db:reset
```

#### Permission Issues
```bash
# Fix Docker volume permissions (Linux/macOS)
sudo chown -R $USER:$USER postgres_data redis_data

# Or remove volumes and recreate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Database Maintenance

#### Cleanup Expired Data
```sql
-- Manual cleanup
SELECT cleanup_expired_shipments();

-- Check expired data
SELECT COUNT(*) FROM shipments WHERE expires_at < NOW();
```

#### Monitor Database Size
```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('shipping_tracker'));

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Backup and Restore
```bash
# Backup database
docker exec shipping_tracker_postgres pg_dump -U postgres shipping_tracker > backup.sql

# Restore database
docker exec -i shipping_tracker_postgres psql -U postgres shipping_tracker < backup.sql
```

## Production Considerations

### Environment Variables
Update the following for production:
- `DATABASE_PASSWORD` - Use a strong password
- `POSTGRES_PASSWORD` - Use a strong password
- `REDIS_PASSWORD` - Enable Redis authentication

### Security
- Enable SSL/TLS for database connections
- Use connection pooling
- Implement proper backup strategies
- Monitor database performance

### Scaling
- Consider read replicas for high traffic
- Implement database sharding if needed
- Use Redis clustering for cache scaling
- Monitor and optimize query performance

## Configuration Files

### docker-compose.dev.yml
Main Docker Compose configuration for development services.

### redis.conf
Redis configuration optimized for development with:
- Memory limits and eviction policies
- Persistence settings
- Performance optimizations

### Migration Files
- `001_initial_schema.sql` - Creates tables, indexes, and functions
- `002_seed_data.sql` - Inserts sample data for development

## Support

For issues with database setup:
1. Check the troubleshooting section above
2. Verify Docker and Docker Compose are running
3. Check environment variables in `.env` files
4. Review database logs for specific errors

The database setup is designed to work out-of-the-box for development while providing flexibility for production deployment.