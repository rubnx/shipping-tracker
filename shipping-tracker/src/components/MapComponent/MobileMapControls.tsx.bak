import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface MobileMapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onToggleFullscreen?: () => void;
  showFullscreenButton?: boolean;
  className?: string;
}

/**
 * Mobile-optimized map controls with touch-friendly buttons
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile responsiveness and touch support
 */
export function MobileMapControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleFullscreen,
  showFullscreenButton = true,
  className = '',
}: MobileMapControlsProps) {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapCenter, setMapCenter] = useState<L.LatLng | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(3);

  // Track map state
  useEffect(() => {
    if (!map) return;

    const handleMoveEnd = () => {
      setMapCenter(map.getCenter());
      setMapZoom(map.getZoom());
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    // Initial state
    setMapCenter(map.getCenter());
    setMapZoom(map.getZoom());

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map]);

  const handleZoomIn = () => {
    if (map) {
      map.zoomIn();
      onZoomIn?.();
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.zoomOut();
      onZoomOut?.();
    }
  };

  const handleRecenter = () => {
    if (map && mapCenter) {
      map.setView(mapCenter, mapZoom);
      onRecenter?.();
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    onToggleFullscreen?.();
  };

  return (
    <div className={`absolute top-2 right-2 z-[1000] flex flex-col space-y-2 ${className}`}>
      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        className=\"bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg shadow-lg p-3 touch-manipulation transition-colors duration-150\"
        aria-label=\"Zoom in\"
        disabled={mapZoom >= 18}
      >
        <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
          <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 6v6m0 0v6m0-6h6m-6 0H6\" />
        </svg>
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        className=\"bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg shadow-lg p-3 touch-manipulation transition-colors duration-150\"
        aria-label=\"Zoom out\"
        disabled={mapZoom <= 1}
      >
        <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
          <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M18 12H6\" />
        </svg>
      </button>

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        className=\"bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg shadow-lg p-3 touch-manipulation transition-colors duration-150\"
        aria-label=\"Recenter map\"
      >
        <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
          <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z\" />
          <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 11a3 3 0 11-6 0 3 3 0 016 0z\" />
        </svg>
      </button>

      {/* Fullscreen Button */}
      {showFullscreenButton && (
        <button
          onClick={handleToggleFullscreen}
          className=\"bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 rounded-lg shadow-lg p-3 touch-manipulation transition-colors duration-150\"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5\" />
            </svg>
          ) : (
            <svg className=\"w-5 h-5 text-gray-700\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4\" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export default MobileMapControls;"