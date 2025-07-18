# Shipping Tracker

A modern, responsive web application for tracking shipments using various tracking numbers (booking numbers, container numbers, and bill of lading numbers).

## Features

- 🔍 **Multi-format Search**: Support for booking numbers, container numbers, and bill of lading
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🗺️ **Interactive Maps**: Visualize shipping routes and vessel positions
- ⏱️ **Real-time Updates**: Live tracking information with timeline visualization
- 📝 **Search History**: Remember recent searches for quick access
- ♿ **Accessible**: Full keyboard navigation and screen reader support
- 🚀 **Performance Optimized**: Fast loading with code splitting and caching

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (to be added)
- **API Management**: React Query (to be added)
- **Maps**: Leaflet/Mapbox (to be added)
- **Testing**: Vitest + React Testing Library (to be added)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── services/           # API services and utilities
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── stores/             # State management (Zustand stores)
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Development Roadmap

This project follows a structured implementation plan:

1. ✅ **Project Setup** - Development environment and tooling
2. 🔄 **Core Types** - TypeScript interfaces and types
3. ⏳ **Search Component** - Input validation and format detection
4. ⏳ **Search History** - Local storage and auto-complete
5. ⏳ **Loading States** - Skeleton components and error handling
6. ⏳ **Shipment Details** - Information display components
7. ⏳ **Timeline Component** - Visual progress tracking
8. ⏳ **Backend API** - Server setup and routing
9. ⏳ **Database** - Data persistence and caching
10. ⏳ **API Integration** - Multi-carrier API aggregation
11. ⏳ **Interactive Maps** - Route visualization
12. ⏳ **Mobile Support** - Responsive design and touch support
13. ⏳ **Accessibility** - ARIA labels and keyboard navigation
14. ⏳ **State Management** - Global state and API caching
15. ⏳ **Performance** - Code splitting and optimization
16. ⏳ **Error Handling** - Comprehensive error management
17. ⏳ **Testing** - Unit, integration, and E2E tests
18. ⏳ **Security** - Input validation and secure practices
19. ⏳ **Deployment** - CI/CD and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.