import React, { useState } from 'react';
import MapComponent from './MapComponent';
import type { RouteInfo, Port, LatLng } from '../../types';

// Example data for demonstration
const examplePorts: Port[] = [
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

const exampleRoute: RouteInfo = {
  origin: examplePorts[0],
  destination: examplePorts[1],
  intermediateStops: [examplePorts[2]],
  estimatedTransitTime: 14,
  routePath: [
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 45.0, lng: -30.0 }, // Mid-Atlantic
    { lat: 51.9539, lng: 1.3518 }, // Felixstowe
    { lat: 51.9244, lng: 4.4777 }, // Rotterdam
  ],
};

const MapExample: React.FC = () => {
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [vesselPosition] = useState<LatLng>({ lat: 45.0, lng: -30.0 });

  const handleMarkerClick = (port: Port) => {
    setSelectedPort(port);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shipping Route Map Example</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Component */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Interactive Route Map</h2>
            <MapComponent
              route={exampleRoute}
              vesselPosition={vesselPosition}
              ports={examplePorts}
              onMarkerClick={handleMarkerClick}
              height={500}
              className="border border-gray-200"
              showControls={true}
              interactive={true}
            />
          </div>
        </div>

        {/* Port Information Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Route Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Origin:</span> {exampleRoute.origin.name}
              </div>
              <div>
                <span className="font-medium">Destination:</span> {exampleRoute.destination.name}
              </div>
              <div>
                <span className="font-medium">Transit Time:</span> {exampleRoute.estimatedTransitTime} days
              </div>
              <div>
                <span className="font-medium">Stops:</span> {exampleRoute.intermediateStops.length}
              </div>
            </div>
          </div>

          {selectedPort && (
            <div className="bg-blue-50 rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">Selected Port</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {selectedPort.name}
                </div>
                <div>
                  <span className="font-medium">Code:</span> {selectedPort.code}
                </div>
                <div>
                  <span className="font-medium">City:</span> {selectedPort.city}
                </div>
                <div>
                  <span className="font-medium">Country:</span> {selectedPort.country}
                </div>
                <div>
                  <span className="font-medium">Coordinates:</span>{' '}
                  {selectedPort.coordinates.lat.toFixed(4)}, {selectedPort.coordinates.lng.toFixed(4)}
                </div>
                <div>
                  <span className="font-medium">Timezone:</span> {selectedPort.timezone}
                </div>
              </div>
            </div>
          )}

          <div className="bg-orange-50 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-orange-800">Vessel Status</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Current Position:</span>{' '}
                {vesselPosition.lat.toFixed(4)}, {vesselPosition.lng.toFixed(4)}
              </div>
              <div>
                <span className="font-medium">Status:</span> In Transit
              </div>
              <div>
                <span className="font-medium">Next Port:</span> Felixstowe
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Map Features</h3>
            <ul className="text-sm space-y-1">
              <li>• Interactive route visualization</li>
              <li>• Real-time vessel tracking</li>
              <li>• Port information popups</li>
              <li>• Responsive design</li>
              <li>• Touch-friendly controls</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapExample;