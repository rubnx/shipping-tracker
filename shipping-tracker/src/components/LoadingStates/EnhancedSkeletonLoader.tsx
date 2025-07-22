import { useState, useEffect } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
  animate?: boolean;
}

function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '', 
  rounded = false,
  animate = true 
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 
        ${animate ? 'animate-pulse' : ''} 
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={{ width, height }}
    />
  );
}

interface EnhancedSkeletonLoaderProps {
  type: 'shipment-details' | 'timeline' | 'map' | 'search-results' | 'dashboard' | 'custom';
  lines?: number;
  showProgress?: boolean;
  progressMessage?: string;
  className?: string;
  customLayout?: React.ReactNode;
  elapsedTime?: number;
  showIntermediateMessages?: boolean;
  showTimeoutWarning?: boolean;
  timeoutMs?: number;
}

export function EnhancedSkeletonLoader({
  type,
  lines = 3,
  showProgress = false,
  progressMessage,
  className = '',
  customLayout,
  elapsedTime = 0,
  showIntermediateMessages = true,
  showTimeoutWarning = false,
  timeoutMs = 30000,
}: EnhancedSkeletonLoaderProps) {
  const [dots, setDots] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Animated dots for progress message
  useEffect(() => {
    if (!showProgress || !progressMessage) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [showProgress, progressMessage]);

  // Generate progressive messages and progress based on elapsed time
  useEffect(() => {
    if (!showIntermediateMessages) return;

    let message = progressMessage || 'Loading content...';
    let progress = 0;

    if (elapsedTime > 0) {
      if (elapsedTime < 2000) {
        message = 'Preparing content...';
        progress = 15;
      } else if (elapsedTime < 5000) {
        message = 'Loading data...';
        progress = 35;
      } else if (elapsedTime < 8000) {
        message = 'Processing information...';
        progress = 55;
      } else if (elapsedTime < 12000) {
        message = 'Finalizing details...';
        progress = 75;
      } else if (elapsedTime < 20000) {
        message = 'Almost ready...';
        progress = 85;
      } else {
        message = 'Still working on it...';
        progress = 90;
      }
    } else {
      // Simulate progress for better UX when no elapsed time is provided
      progress = Math.min(85, (Date.now() % 8000) / 100);
    }

    setCurrentMessage(message);
    setProgressPercentage(progress);
  }, [elapsedTime, progressMessage, showIntermediateMessages]);

  const renderShipmentDetailsSkeleton = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton width="200px" height="24px" />
          <Skeleton width="150px" height="16px" />
        </div>
        <Skeleton width="80px" height="32px" rounded />
      </div>

      {/* Status Card */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <Skeleton width="40px" height="40px" rounded />
          <div className="space-y-2">
            <Skeleton width="120px" height="18px" />
            <Skeleton width="200px" height="14px" />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton width="80px" height="14px" />
            <Skeleton width="140px" height="16px" />
          </div>
        ))}
      </div>

      {/* Container Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <Skeleton width="100px" height="18px" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1">
              <Skeleton width="60px" height="12px" />
              <Skeleton width="80px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimelineSkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="20px" />
        <Skeleton width="60px" height="16px" />
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <Skeleton width="24px" height="24px" rounded />
              {i < 5 && <div className="w-0.5 h-8 bg-gray-200 mt-2" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton width="140px" height="16px" />
                <Skeleton width="80px" height="12px" />
              </div>
              <Skeleton width="200px" height="14px" />
              <Skeleton width="100px" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMapSkeleton = () => (
    <div className="relative">
      <div className="aspect-video bg-gray-200 rounded-lg animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <Skeleton width="120px" height="14px" />
          </div>
        </div>
      </div>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Skeleton width="40px" height="40px" />
        <Skeleton width="40px" height="40px" />
      </div>

      {/* Route Info */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-white rounded-lg p-3 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton width="100px" height="16px" />
            <Skeleton width="60px" height="14px" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton width="80px" height="12px" />
            <div className="flex-1 h-1 bg-gray-200 rounded" />
            <Skeleton width="80px" height="12px" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchResultsSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton width="40px" height="40px" rounded />
              <div className="space-y-1">
                <Skeleton width="160px" height="16px" />
                <Skeleton width="100px" height="14px" />
              </div>
            </div>
            <Skeleton width="80px" height="24px" rounded />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(j => (
              <div key={j} className="space-y-1">
                <Skeleton width="60px" height="12px" />
                <Skeleton width="80px" height="14px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDashboardSkeleton = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton width="80px" height="14px" />
            <Skeleton width="60px" height="24px" />
            <Skeleton width="100px" height="12px" />
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div className="border rounded-lg p-4">
        <Skeleton width="150px" height="20px" className="mb-4" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Recent Activity */}
      <div className="border rounded-lg p-4 space-y-4">
        <Skeleton width="120px" height="18px" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton width="32px" height="32px" rounded />
            <div className="flex-1 space-y-1">
              <Skeleton width="200px" height="14px" />
              <Skeleton width="120px" height="12px" />
            </div>
            <Skeleton width="60px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={`${Math.random() * 40 + 60}%`} 
          height="16px" 
        />
      ))}
    </div>
  );

  const renderSkeleton = () => {
    if (customLayout) return customLayout;

    switch (type) {
      case 'shipment-details':
        return renderShipmentDetailsSkeleton();
      case 'timeline':
        return renderTimelineSkeleton();
      case 'map':
        return renderMapSkeleton();
      case 'search-results':
        return renderSearchResultsSkeleton();
      case 'dashboard':
        return renderDashboardSkeleton();
      case 'custom':
      default:
        return renderCustomSkeleton();
    }
  };

  return (
    <div className={`animate-fadeIn ${className}`}>
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">{currentMessage || progressMessage}{dots}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Intermediate feedback messages */}
          {showIntermediateMessages && elapsedTime > 3000 && (
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>
                  {elapsedTime > 8000 
                    ? 'This is taking longer than usual, but we\'re still working on it...'
                    : 'Processing your request...'}
                </span>
              </div>
            </div>
          )}

          {/* Timeout warning */}
          {showTimeoutWarning && elapsedTime > timeoutMs * 0.8 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-yellow-700">
                  <p className="font-medium mb-1">Taking longer than expected</p>
                  <p>The request is approaching timeout. Consider trying again or switching to demo mode.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {renderSkeleton()}
      
      {/* Loading hints for long waits */}
      {showIntermediateMessages && elapsedTime > 10000 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Why is this taking so long?</p>
              <ul className="space-y-1 text-blue-600">
                <li>• We're checking multiple data sources for accuracy</li>
                <li>• Some carrier APIs may be experiencing delays</li>
                <li>• Free tier services typically respond slower</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Preset configurations for common use cases
export const SkeletonPresets = {
  shipmentCard: (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width="140px" height="18px" />
        <Skeleton width="60px" height="20px" rounded />
      </div>
      <div className="space-y-2">
        <Skeleton width="100px" height="14px" />
        <Skeleton width="180px" height="14px" />
      </div>
    </div>
  ),

  timelineEvent: (
    <div className="flex items-start space-x-4">
      <Skeleton width="24px" height="24px" rounded />
      <div className="flex-1 space-y-2">
        <Skeleton width="120px" height="16px" />
        <Skeleton width="200px" height="14px" />
        <Skeleton width="80px" height="12px" />
      </div>
    </div>
  ),

  searchBar: (
    <div className="flex items-center space-x-3">
      <div className="flex-1">
        <Skeleton width="100%" height="40px" />
      </div>
      <Skeleton width="80px" height="40px" />
    </div>
  ),
};

export default EnhancedSkeletonLoader;