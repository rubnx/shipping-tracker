import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapComponentProps, Port, LatLng } from '../../types';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (type: 'origin' | 'destination' | 'intermediate' | 'vessel') => {
  const iconHtml = {
    origin: `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
      <div class="w-2 h-2 bg-white rounded-full"></div>
    </div>`,
    destination: `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
      <div class="w-2 h-2 bg-white rounded-full"></div>
    </div>`,
    intermediate: `<div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>`,
    vessel: `<div class="w-8 h-8 bg-orange-500 rounded-lg border-2 border-white shadow-lg flex items-center justify-center transform rotate-45">
      <div class="w-3 h-3 bg-white rounded-sm transform -rotate-45"></div>
    </div>`
  };

  return L.divIcon({
    html: iconHtml[type],
    className: 'custom-marker',
    iconSize: type === 'vessel' ? [32, 32] : type === 'intermediate' ? [20, 20] : [24, 24],
    iconAnchor: type === 'vessel' ? [16, 16] : type === 'intermediate' ? [10, 10] : [12, 12],
    popupAnchor: [0, type === 'vessel' ? -16 : type === 'intermediate' ? -10 : -12]
  });
};

// Component to fit map bounds to route
const MapBounds: React.FC<{ route: MapComponentProps['route']; vesselPosition?: LatLng }> = ({ 
  route, 
  vesselPosition 
}) => {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);
    
    // Add route points to bounds
    bounds.extend([route.origin.coordinates.lat, route.origin.coordinates.lng]);
    bounds.extend([route.destination.coordinates.lat, route.destination.coordinates.lng]);
    
    // Add intermediate stops
    route.intermediateStops.forEach(stop => {
      bounds.extend([stop.coordinates.lat, stop.coordinates.lng]);
    });
    
    // Add vessel position if available
    if (vesselPosition) {
      bounds.extend([vesselPosition.lat, vesselPosition.lng]);
    }
    
    // Add route path if available
    if (route.routePath && route.routePath.length > 0) {
      route.routePath.forEach(point => {
        bounds.extend([point.lat, point.lng]);
      });
    }
    
    // Fit map to bounds with padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, route, vesselPosition]);

  return null;
};

// Port marker component
const PortMarker: React.FC<{
  port: Port;
  type: 'origin' | 'destination' | 'intermediate';
  onClick: (port: Port) => void;
}> = ({ port, type, onClick }) => {
  const handleClick = () => {
    onClick(port);
  };

  return (
    <Marker
      position={[port.coordinates.lat, port.coordinates.lng]}
      icon={createCustomIcon(type)}
      eventHandlers={{
        click: handleClick
      }}
    >
      <Popup>
        <div className="p-2 min-w-[180px] max-w-[250px]">
          <h3 className="font-semibold text-base sm:text-lg mb-2 break-words">{port.name}</h3>
          <div className="space-y-1 text-xs sm:text-sm">
            <p><span className="font-medium">Code:</span> {port.code}</p>
            <p><span className="font-medium">City:</span> {port.city}</p>
            <p><span className="font-medium">Country:</span> {port.country}</p>
            <p className="hidden sm:block"><span className="font-medium">Timezone:</span> {port.timezone}</p>
            <p className="text-xs"><span className="font-medium">Coordinates:</span> {port.coordinates.lat.toFixed(4)}, {port.coordinates.lng.toFixed(4)}</p>
          </div>
          <div className="mt-2 px-2 py-1 bg-gray-100 rounded text-xs font-medium">
            {type === 'origin' ? 'Origin Port' : type === 'destination' ? 'Destination Port' : 'Intermediate Stop'}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Vessel marker component
const VesselMarker: React.FC<{
  position: LatLng;
  vesselInfo?: {
    name: string;
    imo: string;
    voyage: string;
    eta?: Date;
    ata?: Date;
  };
}> = ({ position, vesselInfo }) => {
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={createCustomIcon('vessel')}
    >
      <Popup>
        <div className="p-2 min-w-[180px] max-w-[250px]">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Vessel Position</h3>
          {vesselInfo ? (
            <div className="space-y-1 text-xs sm:text-sm">
              <p><span className="font-medium">Name:</span> {vesselInfo.name}</p>
              <p><span className="font-medium">IMO:</span> {vesselInfo.imo}</p>
              <p><span className="font-medium">Voyage:</span> {vesselInfo.voyage}</p>
              {vesselInfo.eta && (
                <p><span className="font-medium">ETA:</span> {vesselInfo.eta.toLocaleDateString()}</p>
              )}
              {vesselInfo.ata && (
                <p><span className="font-medium">ATA:</span> {vesselInfo.ata.toLocaleDateString()}</p>
              )}
            </div>
          ) : (
            <p className="text-xs sm:text-sm">Current vessel position</p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </p>
          <div className="mt-2 px-2 py-1 bg-orange-100 rounded text-xs font-medium text-orange-800">
            Current Position
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

// Route line component
const RouteLine: React.FC<{ route: MapComponentProps['route'] }> = ({ route }) => {
  // Create route path if not provided
  const routePath = route.routePath || [
    route.origin.coordinates,
    ...route.intermediateStops.map(stop => stop.coordinates),
    route.destination.coordinates
  ];

  if (routePath.length < 2) return null;

  return (
    <Polyline
      positions={routePath.map(point => [point.lat, point.lng])}
      color="#3B82F6"
      weight={3}
      opacity={0.7}
      dashArray="10, 5"
    />
  );
};

const MapComponent: React.FC<MapComponentProps> = ({
  route,
  vesselPosition,
  ports,
  onMarkerClick,
  height = 400,
  className = '',
  showControls = true,
  interactive = true
}) => {
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Default center point (middle of Atlantic Ocean)
  const defaultCenter: [number, number] = [30, -30];
  const defaultZoom = 3;

  // Handle marker clicks
  const handlePortClick = (port: Port) => {
    onMarkerClick(port);
  };



  if (mapError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <div className="text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Map Unavailable</p>
          <p className="text-sm text-gray-500 mt-1">{mapError}</p>
          <button
            onClick={() => setMapError(null)}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
        zoomControl={showControls}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          errorTileUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM5OTkiPk1hcCBUaWxlIEVycm9yPC90ZXh0Pjwvc3ZnPg=="
        />
        
        {/* Route line */}
        <RouteLine route={route} />
        
        {/* Origin port marker */}
        <PortMarker
          port={route.origin}
          type="origin"
          onClick={handlePortClick}
        />
        
        {/* Destination port marker */}
        <PortMarker
          port={route.destination}
          type="destination"
          onClick={handlePortClick}
        />
        
        {/* Intermediate stops */}
        {route.intermediateStops.map((stop, index) => (
          <PortMarker
            key={`intermediate-${stop.code}-${index}`}
            port={stop}
            type="intermediate"
            onClick={handlePortClick}
          />
        ))}
        
        {/* Additional ports */}
        {ports.filter(port => 
          port.code !== route.origin.code && 
          port.code !== route.destination.code &&
          !route.intermediateStops.some(stop => stop.code === port.code)
        ).map((port, index) => (
          <PortMarker
            key={`port-${port.code}-${index}`}
            port={port}
            type="intermediate"
            onClick={handlePortClick}
          />
        ))}
        
        {/* Vessel position marker */}
        {vesselPosition && (
          <VesselMarker position={vesselPosition} />
        )}
        
        {/* Auto-fit bounds to route */}
        <MapBounds route={route} vesselPosition={vesselPosition} />
      </MapContainer>
      
      {/* Map legend - responsive positioning */}
      {showControls && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-white rounded-lg shadow-lg p-2 sm:p-3 text-xs z-[1000] max-w-[200px] sm:max-w-none">
          <h4 className="font-semibold mb-2 text-xs sm:text-sm">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs">Origin Port</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs">Destination Port</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <span className="text-xs">Intermediate Stop</span>
            </div>
            {vesselPosition && (
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded transform rotate-45 flex-shrink-0"></div>
                <span className="text-xs">Vessel Position</span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2 pt-1 border-t border-gray-200">
              <div className="w-3 sm:w-4 h-0 border-t-2 border-dashed border-blue-500 flex-shrink-0"></div>
              <span className="text-xs">Shipping Route</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;