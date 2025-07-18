import React from 'react';
import Skeleton from './Skeleton';

export interface MapSkeletonProps {
  height?: string | number;
  className?: string;
  showControls?: boolean;
}

const MapSkeleton: React.FC<MapSkeletonProps> = ({
  height = '400px',
  className = '',
  showControls = true,
}) => {
  const mapHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`} aria-label="Loading map">
      {/* Map container */}
      <div 
        className="relative bg-gradient-to-br from-blue-50 to-blue-100"
        style={{ height: mapHeight }}
      >
        {/* Loading overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>

        {/* Mock map elements */}
        <div className="absolute inset-0 opacity-20">
          {/* Mock coastlines */}
          <svg className="w-full h-full" viewBox="0 0 400 300">
            <path
              d="M50,100 Q100,80 150,100 T250,120 Q300,110 350,130"
              stroke="#94a3b8"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
            <path
              d="M20,200 Q80,180 140,200 T280,220 Q340,210 380,230"
              stroke="#94a3b8"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
          </svg>
          
          {/* Mock markers */}
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-green-400 rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-red-400 rounded-full animate-pulse" />
          <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
        </div>

        {/* Map controls skeleton */}
        {showControls && (
          <>
            {/* Zoom controls */}
            <div className="absolute top-4 right-4 space-y-1">
              <Skeleton width="32px" height="32px" className="bg-white shadow-sm" />
              <Skeleton width="32px" height="32px" className="bg-white shadow-sm" />
            </div>

            {/* Attribution */}
            <div className="absolute bottom-2 right-2">
              <Skeleton width="120px" height="16px" className="bg-white bg-opacity-75" />
            </div>
          </>
        )}
      </div>

      {/* Map legend skeleton */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm p-3 space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton width="12px" height="12px" rounded />
          <Skeleton width="60px" height="12px" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton width="12px" height="12px" rounded />
          <Skeleton width="80px" height="12px" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton width="12px" height="12px" rounded />
          <Skeleton width="50px" height="12px" />
        </div>
      </div>
    </div>
  );
};

export default MapSkeleton;