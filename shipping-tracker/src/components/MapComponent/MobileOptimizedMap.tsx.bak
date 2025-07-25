import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MobileMapControls } from './MobileMapControls';
import type { MapComponentProps } from '../../types';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MobileOptimizedMapProps extends MapComponentProps {
  enableFullscreen?: boolean;
  enableGestures?: boolean;
  showCurrentLocation?: boolean;
  onLocationFound?: (location: { lat: number; lng: number }) => void;
  touchSensitivity?: 'low' | 'medium' | 'high';
}

/**
 * Mobile-optimized map component with enhanced touch controls
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile map interaction
 */
export function MobileOptimizedMap({
  route,
  markers = [],
  center = [0, 0],
  zoom = 3,
  className = '',
  isLoading = false,
  enableFullscreen = true,
  enableGestures = true,
  showCurrentLocation = false,
  onLocationFound,
  touchSensitivity = 'medium',
}: MobileOptimizedMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get user's current location
  useEffect(() => {
    if (showCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setCurrentLocation(location);
          onLocationFound?.({ lat: location[0], lng: location[1] });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }
  }, [showCurrentLocation, onLocationFound]);

  // Handle fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Map event handlers
  const MapEventHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      mapRef.current = map;
      setMapReady(true);

      // Configure touch sensitivity
      const touchZoomOptions = {
        low: { touchZoom: 'center' },
        medium: { touchZoom: true },
        high: { touchZoom: true, bounceAtZoomLimits: false },
      };

      // Apply touch sensitivity settings
      if (isMobile && enableGestures) {
        map.options.touchZoom = touchZoomOptions[touchSensitivity].touchZoom;
        if (touchSensitivity === 'high') {
          map.options.bounceAtZoomLimits = false;
        }
      }

      // Disable scroll wheel zoom on mobile to prevent accidental zooming
      if (isMobile) {
        map.scrollWheelZoom.disable();
      }

      return () => {
        mapRef.current = null;
      };
    }, [map]);

    return null;
  };

  // Custom marker icons
  const createCustomIcon = (type: 'origin' | 'destination' | 'current' | 'waypoint') => {
    const colors = {
      origin: '#10B981', // green
      destination: '#EF4444', // red
      current: '#3B82F6', // blue
      waypoint: '#F59E0B', // amber
    };

    return L.divIcon({
      html: `
        <div style=\"
          width: 24px;
          height: 24px;
          background-color: ${colors[type]};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        \">
          ${type === 'current' ? '📍' : ''}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className=\"absolute inset-0 flex items-center justify-center\">
          <div className=\"text-center\">
            <div className=\"w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2\" />
            <p className=\"text-sm text-gray-600\">Loading map...</p>
          </div>
        </div>
        <div className=\"h-64 sm:h-96\" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`
        relative bg-gray-100 rounded-lg overflow-hidden
        ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}
        ${className}
      `}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className={`
          w-full
          ${isFullscreen ? 'h-screen' : 'h-64 sm:h-96'}
          ${isMobile ? 'touch-pan-y touch-pinch-zoom' : ''}
        `}
        zoomControl={false}
        attributionControl={!isMobile}
        touchZoom={enableGestures}
        doubleClickZoom={enableGestures}
        dragging={enableGestures}
        tap={isMobile}
        tapTolerance={isMobile ? 20 : 15}
      >
        <MapEventHandler />
        
        {/* Tile Layer */}
        <TileLayer
          url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"
          attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'
          maxZoom={18}
          tileSize={256}
          detectRetina={true}
        />

        {/* Route Polyline */}
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            color=\"#3B82F6\"
            weight={4}
            opacity={0.8}
            smoothFactor={1}
          />
        )}

        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            icon={createCustomIcon(marker.type || 'waypoint')}
          >
            {marker.popup && (
              <Popup
                closeButton={!isMobile}
                autoClose={isMobile}
                closeOnEscapeKey={!isMobile}
                className={isMobile ? 'mobile-popup' : ''}
              >
                <div className={isMobile ? 'text-sm' : ''}>
                  {marker.popup}
                </div>
              </Popup>
            )}
          </Marker>
        ))}

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={createCustomIcon('current')}
          >
            <Popup>
              <div className={isMobile ? 'text-sm' : ''}>
                <strong>Your Location</strong>
                <br />
                Lat: {currentLocation[0].toFixed(6)}
                <br />
                Lng: {currentLocation[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Mobile Map Controls */}
      {mapReady && (
        <MobileMapControls
          onToggleFullscreen={enableFullscreen ? handleToggleFullscreen : undefined}
          showFullscreenButton={enableFullscreen}
          className={isFullscreen ? 'top-4 right-4' : ''}
        />
      )}

      {/* Mobile Map Legend */}
      {isMobile && markers.length > 0 && (
        <div className=\"absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs\">
          <h4 className=\"text-xs font-semibold text-gray-900 mb-2\">Legend</h4>
          <div className=\"space-y-1 text-xs\">
            {markers.some(m => m.type === 'origin') && (
              <div className=\"flex items-center space-x-2\">
                <div className=\"w-3 h-3 bg-green-500 rounded-full border border-white\" />
                <span className=\"text-gray-700\">Origin</span>
              </div>
            )}
            {markers.some(m => m.type === 'destination') && (
              <div className=\"flex items-center space-x-2\">
                <div className=\"w-3 h-3 bg-red-500 rounded-full border border-white\" />
                <span className=\"text-gray-700\">Destination</span>
              </div>
            )}
            {currentLocation && (
              <div className=\"flex items-center space-x-2\">
                <div className=\"w-3 h-3 bg-blue-500 rounded-full border border-white\" />
                <span className=\"text-gray-700\">Your Location</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
        <button
          onClick={handleToggleFullscreen}
          className=\"absolute top-4 left-4 z-[1000] bg-white bg-opacity-90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 touch-manipulation\"
          aria-label=\"Exit fullscreen\"
        >
          <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" />
          </svg>
        </button>
      )}

      {/* Mobile Touch Hints */}
      {isMobile && !isFullscreen && (
        <div className=\"absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded\">
          Pinch to zoom • Drag to pan
        </div>
      )}
    </div>
  );
}

export default MobileOptimizedMap;