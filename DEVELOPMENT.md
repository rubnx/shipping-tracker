# Development Workflow Guide

This guide explains how to set up and work with the Shipping Tracker application in development mode.

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd shipping-tracker

# Install all dependencies and set up environment
npm run setup
```

### 2. Start Development Environment

```bash
# Option 1: Start with local Node.js (Recommended for development)
npm run dev

# Option 2: Start with Docker (Full containerized environment)
npm run docker:up
docker compose --profile fullstack up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **pgAdmin**: http://localhost:5050 (admin@shippingtracker.local / admin)
- **Redis Commander**: http://localhost:8081 (admin / admin)

## Development Modes

### Local Development (Recommended)

This mode runs the services locally with Node.js while using Docker only for databases.

```bash
# Start databases
npm run docker:up

# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:api      # Backend only
npm run dev:frontend # Frontend only
```

**Advantages:**
- Faster hot reload and debugging
- Direct access to source code
- Better IDE integration
- Easier debugging with breakpoints

### Containerized Development

This mode runs everything in Docker containers.

```bash
# Start full stack with Docker
docker compose --profile fullstack up -d

# View logs
npm run docker:logs

# Stop services
docker compose down
```

**Advantages:**
- Consistent environment across team
- Production-like setup
- Isolated dependencies
- Easy cleanup

## Project Structure

```
shipping-tracker/
├── package.json                 # Root package.json with workspace scripts
├── docker-compose.yml          # Full-stack Docker configuration
├── docker-compose.dev.yml      # Database-only Docker configuration
├── DEVELOPMENT.md              # This file
├── DATABASE_SETUP.md           # Database setup guide
├── shipping-tracker/           # Frontend React application
│   ├── package.json
│   ├── vite.config.ts          # Vite config with proxy settings
│   ├── Dockerfile.dev          # Development Dockerfile
│   └── src/
└── shipping-tracker-api/       # Backend Node.js API
    ├── package.json
    ├── Dockerfile.dev          # Development Dockerfile
    └── src/
```

## Available Scripts

### Root Level Scripts

```bash
# Development
npm run dev                     # Start both frontend and backend
npm run dev:api                 # Start backend only
npm run dev:frontend           # Start frontend only

# Building
npm run build                  # Build both applications
npm run build:api              # Build backend only
npm run build:frontend         # Build frontend only

# Testing
npm run test                   # Run all tests
npm run test:api               # Run backend tests
npm run test:frontend          # Run frontend tests
npm run test:watch             # Run tests in watch mode

# Setup and Validation
npm run setup                  # Complete setup (install + env + db)
npm run setup:install          # Install all dependencies
npm run setup:env              # Interactive environment setup
npm run setup:db               # Set up database
npm run validate               # Validate environment and build
npm run validate:env           # Validate environment configuration

# Docker Management
npm run docker:up              # Start database services
npm run docker:down            # Stop all services
npm run docker:logs            # View service logs
npm run docker:reset           # Reset all data and restart

# Maintenance
npm run clean                  # Clean all node_modules and build files
npm run lint                   # Run linting on both projects
```

### Individual Project Scripts

#### Backend (shipping-tracker-api)
```bash
cd shipping-tracker-api

npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run test                   # Run tests
npm run setup:env              # Interactive environment setup
npm run setup:db               # Set up database
npm run validate:env           # Validate environment
```

#### Frontend (shipping-tracker)
```bash
cd shipping-tracker

npm run dev                    # Start development server
npm run build                  # Build for production
npm run preview                # Preview production build
npm run test                   # Run tests
npm run lint                   # Run ESLint
```

## Development Workflow

### 1. Daily Development

```bash
# Start your development session
npm run docker:up              # Start databases
npm run dev                    # Start both services

# Make changes to code
# Both frontend and backend will hot-reload automatically

# Run tests
npm run test

# Validate before committing
npm run validate
```

### 2. Working with APIs

The application supports multiple development modes:

- **Demo Mode** (default): Uses mock data, no real API keys needed
- **Live Mode**: Uses real APIs, requires API key configuration

```bash
# Configure API keys (interactive)
cd shipping-tracker-api
npm run setup:env

# Validate API configuration
npm run validate:env
```

### 3. Database Development

```bash
# Reset database with fresh data
npm run setup:db:reset

# View database with pgAdmin
# Go to http://localhost:5050
# Login: admin@shippingtracker.local / admin

# Connect to database directly
docker exec -it shipping_tracker_postgres psql -U postgres -d shipping_tracker
```

### 4. Frontend-Backend Integration

The frontend automatically proxies API calls to the backend during development:

- Frontend runs on http://localhost:5173
- Backend runs on http://localhost:3001
- API calls to `/api/*` are automatically proxied to the backend

```typescript
// This automatically goes to http://localhost:3001/api/tracking/DEMO123
fetch('/api/tracking/DEMO123')
```

## Environment Configuration

### Frontend Environment Variables

Create `shipping-tracker/.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=10000

# Demo Mode
VITE_DEMO_MODE=true
VITE_ENABLE_MOCK_DATA=true
VITE_SHOW_API_STATUS=true

# Feature Flags
VITE_ENABLE_SEARCH_HISTORY=true
VITE_ENABLE_MAP_COMPONENT=true
VITE_ENABLE_TIMELINE_COMPONENT=true
```

### Backend Environment Variables

Create `shipping-tracker-api/.env`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=shipping_tracker
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Demo Mode
DEMO_MODE=true
ENABLE_MOCK_DATA=true

# Security (development only)
JWT_SECRET=development_jwt_secret_32_chars_min
API_SECRET_KEY=development_api_secret_32_chars_min
```

## Debugging

### Frontend Debugging

1. **Browser DevTools**: Standard React DevTools work normally
2. **Vite HMR**: Hot module replacement for instant updates
3. **Source Maps**: Available in development mode

### Backend Debugging

1. **VS Code Debugging**: Use the provided launch configuration
2. **Console Logging**: Structured logging with different levels
3. **API Testing**: Use the built-in health check endpoints

```bash
# Test backend health
curl http://localhost:3001/health

# Test API endpoints
curl http://localhost:3001/api/tracking/DEMO123456789
```

### Database Debugging

1. **pgAdmin**: Web interface at http://localhost:5050
2. **Direct Connection**: Use psql or your preferred client
3. **Query Logs**: Enable in PostgreSQL configuration

## Common Issues and Solutions

### Port Conflicts

```bash
# Check what's using ports
lsof -i :3001  # Backend port
lsof -i :5173  # Frontend port
lsof -i :5432  # PostgreSQL port

# Kill processes if needed
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# Restart database
docker compose restart postgres

# Reset database completely
npm run docker:reset
```

### Node Modules Issues

```bash
# Clean and reinstall everything
npm run clean
npm run setup:install
```

### API Integration Issues

```bash
# Validate environment
npm run validate:env

# Check API connectivity
cd shipping-tracker-api
npm run validate:keys
```

## Performance Tips

### Development Performance

1. **Use Local Mode**: Run Node.js locally instead of Docker for faster development
2. **Selective Testing**: Run specific test suites instead of all tests
3. **Optimize Dependencies**: Use `npm ci` instead of `npm install` for faster installs

### Build Performance

1. **Parallel Builds**: The build process runs frontend and backend in parallel
2. **Incremental Builds**: Only changed files are rebuilt
3. **Caching**: Docker layers and npm cache are optimized

## Team Collaboration

### Code Quality

```bash
# Before committing
npm run lint                   # Check code style
npm run test                   # Run all tests
npm run validate               # Validate build and environment
```

### Environment Consistency

1. **Use Docker**: For consistent database and Redis versions
2. **Lock Files**: Commit package-lock.json files
3. **Environment Templates**: Use .env.example files as templates

### Documentation

1. **API Changes**: Update API documentation when changing endpoints
2. **Environment Changes**: Update .env.example files
3. **Database Changes**: Document schema changes in migrations

## Production Deployment

### Build for Production

```bash
# Build both applications
npm run build

# Test production build locally
npm run start
```

### Environment Variables

Update environment variables for production:

- Remove demo mode settings
- Add real API keys
- Configure production database URLs
- Set secure JWT secrets

### Docker Production

```bash
# Build production images
docker build -t shipping-tracker-api ./shipping-tracker-api
docker build -t shipping-tracker-frontend ./shipping-tracker

# Run with production compose file
docker compose -f docker-compose.prod.yml up -d
```

## Support

For development issues:

1. Check this documentation first
2. Review the troubleshooting sections
3. Check the GitHub issues
4. Ask in the team chat

The development environment is designed to be as smooth as possible while maintaining production parity where it matters.