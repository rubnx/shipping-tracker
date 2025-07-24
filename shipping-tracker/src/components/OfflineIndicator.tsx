import React, { useState, useEffect } from 'react';

interface OfflineIndicatorProps {
  className?: string;
  showOnlineStatus?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showOnlineStatus = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    const handleNetworkStatusChange = (event: CustomEvent) => {
      const { isOnline: online } = event.detail;
      setIsOnline(online);
      setShowNotification(true);
      if (online) {
        setTimeout(() => setShowNotification(false), 3000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('networkStatusChange', handleNetworkStatusChange as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('networkStatusChange', handleNetworkStatusChange as EventListener);
    };
  }, []);

  // Don't show anything if online and not configured to show online status
  if (isOnline && !showOnlineStatus && !showNotification) {
    return null;
  }

  const getStatusColor = () => {
    return isOnline ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    return isOnline ? 'Online' : 'Offline';
  };

  const getStatusIcon = () => {
    if (isOnline) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {/* Persistent indicator (always visible when offline) */}
      {!isOnline && (
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${getStatusColor()}`}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
          <div className="text-xs opacity-90">
            Limited functionality
          </div>
        </div>
      )}

      {/* Notification (temporary) */}
      {showNotification && (
        <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${getStatusColor()} ${!isOnline ? 'mt-2' : ''}`}>
          {getStatusIcon()}
          <div>
            <div className="font-semibold">
              {isOnline ? 'Back Online' : 'You\'re Offline'}
            </div>
            <div className="text-xs opacity-90">
              {isOnline 
                ? 'All features are now available' 
                : 'Some features may be limited'
              }
            </div>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="ml-2 text-white hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;