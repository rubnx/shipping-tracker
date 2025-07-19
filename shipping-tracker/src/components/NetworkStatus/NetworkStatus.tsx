import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface NetworkStatusProps {
  className?: string;
  showWhenOnline?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  className = '',
  showWhenOnline = false,
}) => {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected && !showWhenOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
      role="status"
      aria-live="polite"
    >
      {isOffline && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
          </svg>
          <span className="text-sm font-medium">You're offline</span>
        </div>
      )}
      
      {showReconnected && (
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Back online</span>
        </div>
      )}
      
      {isOnline && showWhenOnline && !showReconnected && (
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <span className="text-sm font-medium">Online</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;