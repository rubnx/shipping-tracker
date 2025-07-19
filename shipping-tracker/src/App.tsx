import { useEffect } from 'react';
import './App.css';
import { SearchComponent, ShipmentDisplay, SkipLink } from './components';
import { useIsMobile, useBreakpoint, usePrefersHighContrast } from './hooks';
import { useTrackingStore, useUIStore, useAppStore } from './store';
import { useTrackingSearch } from './api';
import type { TrackingType, Port } from './types';



function App() {
  // Store hooks
  const {
    searchHistory: recentSearches,
    currentShipment,
    isSearching,
  } = useTrackingStore();
  
  const {
    showDemo,
    setShowDemo,
    selectedPort,
    setSelectedPort,
    isMobile,
    setIsMobile,
  } = useUIStore();
  
  const { highContrast } = useAppStore();
  
  // API hooks
  const { search } = useTrackingSearch();
  
  // Responsive hooks
  const isMobileDevice = useIsMobile();
  const breakpoint = useBreakpoint();
  const prefersHighContrast = usePrefersHighContrast();
  
  // Update mobile state in store
  useEffect(() => {
    setIsMobile(isMobileDevice);
  }, [isMobileDevice, setIsMobile]);

  const handleSearch = async (query: string, type: TrackingType) => {
    search(query, type);
  };

  const handleMarkerClick = (port: Port) => {
    setSelectedPort(port);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${prefersHighContrast || highContrast ? 'high-contrast' : ''}`}>
      {/* Skip Links */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#search-form">Skip to search</SkipLink>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <header className="text-center mb-6 sm:mb-8" role="banner">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Shipping Tracker
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Track your shipments with ease
          </p>
        </header>
        
        <main id="main-content" className="max-w-7xl mx-auto space-y-6 sm:space-y-8" role="main">
          {/* Search Component */}
          <section id="search-form" className="card" aria-labelledby="search-heading">
            <h2 id="search-heading" className="sr-only">Search for shipment</h2>
            <SearchComponent
              onSearch={handleSearch}
              isLoading={isSearching}
              recentSearches={recentSearches}
              autoFocus={true}
              showProgress={true}
              loadingMessage="Searching for tracking information..."
            />
          </section>

          {/* Demo Toggle */}
          {!isSearching && (
            <div className="text-center">
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                aria-expanded={showDemo}
                aria-controls="demo-content"
              >
                {showDemo ? 'Hide Demo' : 'Show Demo'}
              </button>
            </div>
          )}

          {/* Shipment Results */}
          {currentShipment && !isSearching && (
            <ShipmentDisplay />
          )}

          {/* Demo Content */}
          {showDemo && !currentShipment && !isSearching && (
            <div id="demo-content" className="space-y-6 sm:space-y-8">
              <div className="card">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                  Try the Demo
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Enter one of these sample tracking numbers to see the application in action:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Container</h3>
                    <code className="text-sm bg-white px-2 py-1 rounded">ABCD1234567</code>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Booking</h3>
                    <code className="text-sm bg-white px-2 py-1 rounded">ABC123456789</code>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-800 mb-2">Bill of Lading</h3>
                    <code className="text-sm bg-white px-2 py-1 rounded">ABCD123456789012</code>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Test Error Handling</h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    Try these special tracking numbers to test error scenarios:
                  </p>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">ERROR123</code> - Simulates "not found" error</div>
                    <div><code className="bg-white px-2 py-1 rounded">TIMEOUT123</code> - Simulates timeout error</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;