# Shipping Tracker Application

## Overview

The Shipping Tracker Application is a comprehensive, production-ready web application for tracking shipments across multiple carriers and data sources. It provides real-time tracking information, interactive visualizations, and advanced features for both individual users and enterprise customers.

## Features

### Core Features
- **Multi-Carrier Tracking**: Support for multiple shipping carriers and APIs
- **Real-Time Updates**: Live tracking information with automatic updates
- **Interactive Timeline**: Visual timeline showing shipment progress
- **Map Visualization**: Interactive maps showing shipment routes and current location
- **Mobile Optimization**: Fully responsive design with touch gestures
- **Offline Support**: Works offline with cached data and service worker

### Advanced Features
- **Advanced Search**: Multi-criteria filtering and bulk tracking
- **Data Export**: Export tracking data in multiple formats (CSV, JSON, PDF)
- **Analytics**: Shipment analytics, trends, and comparison features
- **Notifications**: Push notifications and email alerts
- **Performance Monitoring**: Comprehensive monitoring and alerting
- **Security**: Input validation, rate limiting, and security headers

## Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Multiple API integrations** for carrier data
- **Redis** for caching (optional)
- **Sentry** for error tracking

### Key Components
- `SearchComponent`: Main search interface
- `ShipmentDetailsComponent`: Detailed shipment information
- `TimelineComponent`: Interactive timeline visualization
- `MapComponent`: Interactive map with route display
- `LoadingStateManager`: Progressive loading with provider status
- `ErrorBoundary`: Comprehensive error handling

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shipping-tracker
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

5. Start the API server:
```bash
cd shipping-tracker-api
npm run dev
```

### Environment Variables

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

#### Backend (.env)
```
PORT=3001
NODE_ENV=development
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-sentry-dsn
API_KEYS_TRACK_TRACE=your-api-key
API_KEYS_SHIPS_GO=your-api-key
```

## Development

### Project Structure
```
shipping-tracker/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and business logic services
│   ├── store/              # State management
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── main.tsx            # Application entry point
├── shipping-tracker-api/   # Backend API server
├── docs/                   # Documentation
└── public/                 # Static assets
```

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests

### Testing

The application includes comprehensive testing:

- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint and component integration tests
- **Accessibility Tests**: WCAG compliance testing
- **Performance Tests**: Load testing and performance benchmarks

Run tests with:
```bash
npm run test
```

### Code Quality

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type checking and safety
- **Husky**: Git hooks for pre-commit checks

## Deployment

### Production Build

1. Build the application:
```bash
npm run build
```

2. Build the API:
```bash
cd shipping-tracker-api
npm run build
```

### Environment Setup

#### Staging
- API URL: `https://staging-api.example.com`
- Enable dev tools: `false`
- Log level: `info`

#### Production
- API URL: `https://api.example.com`
- Enable dev tools: `false`
- Log level: `error`
- Enable monitoring and alerting

### Health Checks

The application includes health check endpoints:
- Frontend: `/health`
- Backend: `/api/health`

### Monitoring

Production monitoring includes:
- **Uptime Monitoring**: Service availability checks
- **Performance Monitoring**: Response times and Core Web Vitals
- **Error Tracking**: Automatic error reporting with Sentry
- **User Analytics**: Usage patterns and behavior tracking

## API Documentation

### Endpoints

#### GET /api/health
Health check endpoint
- **Response**: `{ status: "healthy", timestamp: "...", version: "..." }`

#### GET /api/tracking/:trackingNumber
Get tracking information for a shipment
- **Parameters**: `trackingNumber` - The tracking number to search for
- **Query Parameters**: 
  - `type` - Tracking type (container, booking, bol)
  - `concurrent` - Enable concurrent API calls (true/false)
- **Response**: Shipment tracking data

#### POST /api/tracking/batch
Batch tracking for multiple shipments
- **Body**: `{ trackingNumbers: string[] }`
- **Response**: Array of shipment tracking data

### Rate Limiting
- 100 requests per minute per IP address
- 1000 requests per hour per API key

## Security

### Implemented Security Measures
- Input validation and sanitization
- Rate limiting and DDoS protection
- Security headers (CSP, HSTS, etc.)
- CORS configuration
- API key management
- Error handling without information disclosure

### Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Secure environment variable management
- HTTPS enforcement in production

## Performance

### Optimization Techniques
- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- Service worker for offline support
- React Query for efficient data fetching
- Memoization for expensive computations

### Performance Budgets
- Initial bundle size: < 250KB
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 4s
- Cumulative Layout Shift: < 0.1

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes: `git commit -m 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

### Code Style
- Follow the existing code style
- Use TypeScript for type safety
- Write tests for new features
- Update documentation as needed

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the FAQ section

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release with core tracking functionality
- Multi-carrier API integration
- Interactive timeline and map components
- Mobile optimization
- Offline support

### Version 1.1.0
- Advanced search and filtering
- Data export functionality
- Performance monitoring
- Security enhancements

### Version 1.2.0
- Analytics and insights
- Notification system
- Accessibility improvements
- Production deployment automation