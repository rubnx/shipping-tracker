import { useState, useEffect } from 'react';
import { apiClient, type ConnectionStatus } from '../../services/ApiClient';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>(apiClient.getConnectionStatus());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(apiClient.getConnectionStatus());
    };

    // Update status every second
    const interval = setInterval(updateStatus, 1000);

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!status.online) return 'bg-red-500';
    if (!status.apiReachable) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!status.online) return 'Offline';
    if (!status.apiReachable) return 'API Unavailable';
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!status.online) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          <path d="M3 16l14-14" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    }

    if (!status.apiReachable) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  };

  const handleHealthCheck = async () => {
    const health = await apiClient.healthCheck();
    console.log('Health check result:', health);
    setStatus(apiClient.getConnectionStatus());
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div className="flex items-center space-x-2 text-gray-700">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Network Status:</span>
              <span className={`ml-2 font-medium ${status.online ? 'text-green-600' : 'text-red-600'}`}>
                {status.online ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500">API Status:</span>
              <span className={`ml-2 font-medium ${status.apiReachable ? 'text-green-600' : 'text-red-600'}`}>
                {status.apiReachable ? 'Reachable' : 'Unreachable'}
              </span>
            </div>
          </div>

          {status.latency && (
            <div>
              <span className="text-gray-500">Latency:</span>
              <span className={`ml-2 font-medium ${
                status.latency < 100 ? 'text-green-600' : 
                status.latency < 500 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {status.latency}ms
              </span>
            </div>
          )}

          <div>
            <span className="text-gray-500">Last Checked:</span>
            <span className="ml-2 text-gray-700">
              {status.lastChecked.toLocaleTimeString()}
            </span>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleHealthCheck}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
            >
              Check Health
            </button>
            
            {!status.online && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                Offline Mode Active
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}