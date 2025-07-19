import { useState } from 'react';
import './App.css';
import { SearchComponent, TimelineComponent, MapComponent } from './components';
import { useSearchHistory } from './hooks';
import type { TrackingType, TimelineEvent, RouteInfo, Port, LatLng } from './types';

// Mock data for demo
const mockPorts: Port[] = [
  {
    code: 'USNYC',
    name: 'New York',
    city: 'New York',
    country: 'United States',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    timezone: 'America/New_York',
  },
  {
    code: 'NLRTM',
    name: 'Rotterdam',
    city: 'Rotterdam',
    country: 'Netherlands',
    coordinates: { lat: 51.9244, lng: 4.4777 },
    timezone: 'Europe/Amsterdam',
  },
  {
    code: 'GBFXT',
    name: 'Felixstowe',
    city: 'Felixstowe',
    country: 'United Kingdom',
    coordinates: { lat: 51.9539, lng: 1.3518 },
    timezone: 'Europe/London',
  },
];

const mockRoute: RouteInfo = {
  origin: mockPorts[0],
  destination: mockPorts[1],
  intermediateStops: [mockPorts[2]],
  estimatedTransitTime: 14,
  routePath: [
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 45.0, lng: -30.0 }, // Mid-Atlantic
    { lat: 51.9539, lng: 1.3518 }, // Felixstowe
    { lat: 51.9244, lng: 4.4777 }, // Rotterdam
  ],
};

const mockVesselPosition: LatLng = { lat: 45.0, lng: -30.0 };

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    status: 'Booking Confirmed',
    location: 'New York, USA',
    description: 'Shipment booking has been confirmed and container allocated',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '2',
    timestamp: new Date('2024-01-02T14:30:00Z'),
    status: 'Container Loaded',
    location: 'New York Port, USA',
    description: 'Container loaded onto vessel MSC OSCAR',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '3',
    timestamp: new Date('2024-01-03T08:15:00Z'),
    status: 'Departed Origin',
    location: 'New York Port, USA',
    description: 'Vessel departed from origin port',
    isCompleted: true,
    isCurrentStatus: false,
  },
  {
    id: '4',
    timestamp: new Date('2024-01-10T12:00:00Z'),
    status: 'In Transit',
    location: 'Atlantic Ocean',
    description: 'Shipment is currently in transit across the Atlantic',
    isCompleted: false,
    isCurrentStatus: true,
  },
  {
    id: '5',
    timestamp: new Date('2024-01-15T16:45:00Z'),
    status: 'Arrived Destination',
    location: 'Rotterdam, Netherlands',
    description: 'Vessel arrived at destination port',
    isCompleted: false,
    isCurrentStatus: false,
  },
  {
    id: '6',
    timestamp: new Date('2024-01-16T09:30:00Z'),
    status: 'Container Discharged',
    location: 'Rotterdam Port, Netherlands',
    description: 'Container discharged from vessel',
    isCompleted: false,
    isCurrentStatus: false,
  },
  {
    id: '7',
    timestamp: new Date('2024-01-17T14:00:00Z'),
    status: 'Available for Pickup',
    location: 'Rotterdam Port, Netherlands',
    description: 'Container available for pickup at terminal',
    isCompleted: false,
    isCurrentStatus: false,
  },
];

function App() {
  const [isSearching, setIsSearching] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const { history: recentSearches, addToHistory } = useSearchHistory();

  const handleSearch = async (query: string, type: TrackingType) => {
    console.log('Searching for:', query, 'Type:', type);
    setIsSearching(true);
    
    // Add to search history
    addToHistory({
      trackingNumber: query,
      trackingType: type,
      // carrier will be determined after API call in real implementation
    });
    
    // Simulate API call
    setTimeout(() => {
      setIsSearching(false);
      // TODO: Implement actual search logic
    }, 2000);
  };

  const handleMarkerClick = (port: Port) => {
    setSelectedPort(port);
    console.log('Port selected:', port.name);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Shipping Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Track your shipments with ease
          </p>
        </header>
        
        <main className="max-w-4xl mx-auto space-y-8">
          {/* Search Component */}
          <div className="card">
            <SearchComponent
              onSearch={handleSearch}
              isLoading={isSearching}
              recentSearches={recentSearches}
              autoFocus={true}
              showProgress={true}
              loadingMessage="Searching for tracking information..."
            />
          </div>

          {/* Demo Toggle */}
          {!isSearching && (
            <div className="text-center">
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showDemo ? 'Hide Timeline Demo' : 'Show Timeline Demo'}
              </button>
            </div>
          )}

          {/* Demo Content */}
          {showDemo && !isSearching && (
            <div className="space-y-6">
              {/* Interactive Map */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Interactive Route Map
                </h2>
                <p className="text-gray-600 mb-4">
                  Visualize your shipment's journey with our interactive map featuring real-time vessel tracking.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <MapComponent
                      route={mockRoute}
                      vesselPosition={mockVesselPosition}
                      ports={mockPorts}
                      onMarkerClick={handleMarkerClick}
                      height={400}
                      className="border border-gray-200 rounded-lg"
                      showControls={true}
                      interactive={true}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">Route Info</h3>
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Origin:</span> {mockRoute.origin.name}</div>
                        <div><span className="font-medium">Destination:</span> {mockRoute.destination.name}</div>
                        <div><span className="font-medium">Transit:</span> {mockRoute.estimatedTransitTime} days</div>
                      </div>
                    </div>
                    {selectedPort && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="font-semibold text-green-800 mb-2">Selected Port</h3>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Name:</span> {selectedPort.name}</div>
                          <div><span className="font-medium">Code:</span> {selectedPort.code}</div>
                          <div><span className="font-medium">Country:</span> {selectedPort.country}</div>
                        </div>
                      </div>
                    )}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h3 className="font-semibold text-orange-800 mb-2">Vessel Status</h3>
                      <div className="text-sm space-y-1">
                        <div><span className="font-medium">Position:</span> Mid-Atlantic</div>
                        <div><span className="font-medium">Status:</span> In Transit</div>
                        <div><span className="font-medium">Next Port:</span> Felixstowe</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Component */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Shipment Timeline
                </h2>
                <p className="text-gray-600 mb-4">
                  Track your shipment progress with our interactive timeline view.
                </p>
                <TimelineComponent
                  events={mockTimelineEvents}
                  currentStatus="In Transit"
                  completionPercentage={57}
                  showProgress={true}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;