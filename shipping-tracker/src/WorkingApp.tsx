import React, { useState, useEffect } from 'react';
import OfflineIndicator from './components/OfflineIndicator';
import NotificationSettings from './components/NotificationSettings';
import PerformanceDashboard from './components/PerformanceDashboard';
import { useURLState, useShareableURL } from './utils/urlState';
import { trackingDataStorage, searchHistoryStorage } from './utils/localStorage';
import { notificationService } from './services/NotificationService';
import { performanceMonitoringService } from './services/PerformanceMonitoringService';

// Simple working app without complex dependencies
function WorkingApp() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  
  // URL state management
  const [urlState, setURLState] = useURLState();
  const { generateShareableURL, shareURL } = useShareableURL();

  // Initialize from URL state
  useEffect(() => {
    if (urlState.trackingNumber && urlState.trackingNumber !== trackingNumber) {
      setTrackingNumber(urlState.trackingNumber);
      // Auto-search if tracking number is in URL
      handleSearch({ preventDefault: () => {} } as any, urlState.trackingNumber);
    }
  }, [urlState.trackingNumber]);

  // Update URL when search is performed
  const updateURLState = (trackingNum: string) => {
    setURLState({
      trackingNumber: trackingNum,
      trackingType: 'container',
      concurrent: true,
    });
  };

  const handleSearch = async (e: React.FormEvent, urlTrackingNumber?: string) => {
    e.preventDefault();
    
    const searchNumber = urlTrackingNumber || trackingNumber;
    if (!searchNumber.trim()) return;

    setIsLoading(true);
    
    // Update URL state
    updateURLState(searchNumber);
    
    // Try to get cached data first
    const cachedData = trackingDataStorage.getTrackingData(searchNumber);
    if (cachedData && !navigator.onLine) {
      // Use cached data when offline
      setSearchResult({
        ...cachedData,
        offline: true,
        message: 'Showing cached data (offline)'
      });
      setIsLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      const resultData = {
        trackingNumber: searchNumber,
        status: 'In Transit',
        carrier: 'Demo Carrier',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        timeline: [
          { status: 'Booked', date: '2024-01-15', location: 'Shanghai, China' },
          { status: 'Departed', date: '2024-01-17', location: 'Shanghai Port' },
          { status: 'In Transit', date: '2024-01-20', location: 'Pacific Ocean' },
          { status: 'Arriving', date: '2024-01-25', location: 'Los Angeles, CA' }
        ],
        lastUpdated: new Date().toISOString(),
        offline: false
      };

      // Cache the result for offline use
      trackingDataStorage.saveTrackingData(searchNumber, resultData);
      
      // Add to search history
      searchHistoryStorage.addSearchHistory(searchNumber, 'container');
      
      setSearchResult(resultData);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Shipping Tracker</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g., TEST123)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !trackingNumber.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Searching for tracking information...</p>
            </div>
          )}
        </div>

        {/* Results */}
        {searchResult && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipment Details */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Shipment Details</h2>
                {searchResult.offline && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    Offline Data
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <p><span className="font-medium">Tracking:</span> {searchResult.trackingNumber}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {searchResult.status}
                  </span>
                </p>
                <p><span className="font-medium">Carrier:</span> {searchResult.carrier}</p>
                <p><span className="font-medium">Est. Delivery:</span> {searchResult.estimatedDelivery}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button 
                  onClick={() => handleSearch({ preventDefault: () => {} } as any)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Refresh
                </button>
                <button 
                  onClick={async () => {
                    const shareableURL = generateShareableURL(searchResult.trackingNumber, 'container', 'details');
                    const success = await shareURL(
                      shareableURL,
                      `Shipment Tracking - ${searchResult.trackingNumber}`,
                      `Track shipment ${searchResult.trackingNumber} - Status: ${searchResult.status}`
                    );
                    if (success) {
                      alert('Link copied to clipboard!');
                    }
                  }}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Share
                </button>
                <button 
                  onClick={() => setShowNotificationSettings(true)}
                  className="text-purple-600 hover:text-purple-800 text-sm"
                >
                  Notifications
                </button>
                <button 
                  onClick={async () => {
                    const success = await notificationService.notifyShipmentUpdate(
                      searchResult.trackingNumber,
                      searchResult.status,
                      'Pacific Ocean'
                    );
                    if (success) {
                      alert('Test notification sent!');
                    } else {
                      alert('Failed to send notification. Please enable notifications first.');
                    }
                  }}
                  className="text-orange-600 hover:text-orange-800 text-sm"
                >
                  Test Alert
                </button>
                <button 
                  onClick={() => setShowPerformanceDashboard(true)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Performance
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Timeline Component</h2>
              <div className="space-y-3">
                {searchResult.timeline.map((event: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === searchResult.timeline.length - 1 ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{event.status}</p>
                      <p className="text-sm text-gray-600">{event.date} - {event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Status: {searchResult.status}</p>
                <p>Progress: 100%</p>
                <p>Events: {searchResult.timeline.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Map Component Placeholder */}
        {searchResult && !isLoading && (
          <div className="mt-6 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Map Component</h2>
            <div className="h-64 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
              <div className="text-center">
                <p className="text-blue-700 font-medium">Route: Shanghai Port → Los Angeles Port</p>
                <p className="text-blue-600 text-sm mt-1">Ports: 2</p>
                <p className="text-blue-500 text-xs mt-2">(Map functionality temporarily disabled)</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!searchResult && !isLoading && (
          <div className="bg-white shadow-lg rounded-lg p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Track Your Shipment</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Enter a tracking number above to get real-time updates on your shipment's location and status.
            </p>
            <div className="text-sm text-gray-500">
              <p className="mb-2">Try these sample tracking numbers:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => setTrackingNumber('TEST123')}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs"
                >
                  TEST123
                </button>
                <button 
                  onClick={() => setTrackingNumber('DEMO456')}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs"
                >
                  DEMO456
                </button>
                <button 
                  onClick={() => setTrackingNumber('SAMPLE789')}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs"
                >
                  SAMPLE789
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <NotificationSettings
              trackingNumber={searchResult?.trackingNumber}
              onClose={() => setShowNotificationSettings(false)}
            />
          </div>
        </div>
      )}

      {/* Performance Dashboard Modal */}
      {showPerformanceDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <PerformanceDashboard
              onClose={() => setShowPerformanceDashboard(false)}
            />
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default WorkingApp;