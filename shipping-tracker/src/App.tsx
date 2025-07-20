import { useState } from 'react';
import './App.css';
import SearchComponent from './components/SearchComponent';
import TimelineComponent from './components/TimelineComponent';
import { MapComponent } from './components/MapComponent';
import ShipmentDetailsComponent from './components/ShipmentDetailsComponent';
import { NetworkStatus } from './components/NetworkStatus';
import { useTrackingSearch } from './api/queries';
import { useSearchHistory } from './hooks/useSearchHistory';
import type { TrackingType, Port, ShipmentTracking } from './types';

function App() {
  const [currentShipment, setCurrentShipment] = useState<ShipmentTracking | null>(null);
  const { history } = useSearchHistory();
  const { search, isSearching, error, data, reset } = useTrackingSearch();

  // Handle search submission
  const handleSearch = async (query: string, type: TrackingType) => {
    try {
      reset();
      search(query, type);
      // The data will be available in the `data` property from useTrackingSearch
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Update current shipment when data changes
  if (data && data !== currentShipment) {
    setCurrentShipment(data);
  }

  // Handle map marker clicks
  const handleMarkerClick = (port: Port) => {
    console.log('Port clicked:', port);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (currentShipment?.trackingNumber) {
      handleSearch(currentShipment.trackingNumber, currentShipment.trackingType);
    }
  };

  // Calculate completion percentage for timeline
  const getCompletionPercentage = (shipment: any) => {
    if (!shipment?.timeline) return 0;
    const completedEvents = shipment.timeline.filter((event: any) => event.isCompleted).length;
    return Math.round((completedEvents / shipment.timeline.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Network Status */}
      <NetworkStatus />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Shipping Tracker
            </h1>
            <div className="text-sm text-gray-500">
              Track your shipments in real-time
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Section */}
        <div className="mb-8">
          <SearchComponent
            onSearch={handleSearch}
            isLoading={isSearching}
            recentSearches={history}
            placeholder="Enter tracking number (container, booking, or BOL)..."
            autoFocus={true}
            showProgress={true}
            loadingMessage="Searching for tracking information..."
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800 font-medium">Search Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={reset}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Section */}
        {currentShipment && (
          <div className="space-y-6">
            {/* Shipment Details */}
            <ShipmentDetailsComponent
              shipment={currentShipment}
              isLoading={isSearching}
              error={error || null}
              onRefresh={handleRefresh}
              showActions={true}
            />

            {/* Timeline and Map Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <div className="order-2 lg:order-1">
                <TimelineComponent
                  events={currentShipment.timeline || []}
                  currentStatus={currentShipment.status || ''}
                  completionPercentage={getCompletionPercentage(currentShipment)}
                  isLoading={isSearching}
                  showProgress={true}
                  compact={false}
                />
              </div>

              {/* Map */}
              <div className="order-1 lg:order-2">
                {currentShipment.route && (
                  <MapComponent
                    route={currentShipment.route}
                    vesselPosition={currentShipment.vessel?.currentPosition}
                    ports={[
                      currentShipment.route.origin,
                      currentShipment.route.destination,
                      ...currentShipment.route.intermediateStops
                    ]}
                    onMarkerClick={handleMarkerClick}
                    height={400}
                    showControls={true}
                    interactive={true}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentShipment && !isSearching && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Track Your Shipment
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Enter a tracking number above to get real-time updates on your shipment's location and status.
            </p>
            <div className="text-sm text-gray-500">
              <p className="mb-2">Supported formats:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-3 py-1 bg-gray-100 rounded-full">Container Numbers</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">Booking Numbers</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">Bill of Lading</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2024 Shipping Tracker. Built with modern web technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;