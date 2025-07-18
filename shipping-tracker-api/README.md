# Shipping Tracker API

Backend API for the shipping tracking application.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Database Setup

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE shipping_tracker;
CREATE USER shipping_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE shipping_tracker TO shipping_user;
\q
```

### 3. Configure Environment

Copy the example environment file and update with your database credentials:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in your `.env` file:
```
DATABASE_URL=postgresql://shipping_user:your_password@localhost:5432/shipping_tracker
```

## Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Test database connection (optional)
npm run test:db
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Database Schema

The application uses the following main tables:

### shipments
- Caches tracking data from external APIs
- Includes expiration timestamps for cache invalidation
- Stores JSONB data for flexible shipment information

### search_history
- Tracks user search patterns
- Enables search suggestions and auto-complete
- Supports session-based history

### api_usage
- Monitors API usage for rate limiting
- Tracks requests per provider and endpoint

## API Endpoints

- `GET /health` - Health check
- `GET /api/tracking/:trackingNumber` - Get tracking information
- `POST /api/tracking/search` - Search with detailed request body
- `GET /api/tracking/:trackingNumber/refresh` - Refresh tracking data
- `GET /api/tracking/history/:trackingNumber` - Get tracking history

## Database Operations

The application implements comprehensive CRUD operations through repository classes:

### ShipmentRepository
- `create()` - Insert new shipment records
- `findByTrackingNumber()` - Query by tracking number
- `update()` - Update existing records
- `upsert()` - Insert or update (cache mechanism)
- `delete()` - Remove records
- `cleanupExpired()` - Remove expired cache entries

### SearchHistoryRepository
- `upsertSearch()` - Record search activity
- `getByUserSession()` - Get user search history
- `getSearchSuggestions()` - Auto-complete functionality
- `cleanupOldHistory()` - Remove old search records

## Testing

```bash
# Test database operations (requires running PostgreSQL)
npm run test:db

# Run migrations manually
npm run migrate
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `npm run migrate`
4. Build application: `npm run build`
5. Start server: `npm start`

## Environment Variables

See `.env.example` for all required environment variables including:
- Database connection string
- API keys for shipping carriers
- Security keys
- Rate limiting configuration