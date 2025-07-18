import { useState } from 'react';
import './App.css';
import { SearchComponent, TimelineComponent } from './components';
import { useSearchHistory } from './hooks';
import type { TrackingType, TimelineEvent } from './types';

// Mock timeline data for demo
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

          {/* Timeline Demo */}
          {showDemo && !isSearching && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Shipment Timeline
                </h2>
                <p className="text-gray-600 mb-4">
                  Track your shipment progress with our interactive timeline view.
                </p>
              </div>

              {/* Timeline Component */}
              <TimelineComponent
                events={mockTimelineEvents}
                currentStatus="In Transit"
                completionPercentage={57}
                showProgress={true}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;