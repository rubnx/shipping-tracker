import { useState, useEffect } from 'react';
import { isOnline, onNetworkStatusChange } from '../utils/errorHandling';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
}

/**
 * Custom hook for monitoring network connectivity
 */
export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: isOnline(),
    wasOffline: false,
  });

  useEffect(() => {
    const cleanup = onNetworkStatusChange((online) => {
      setNetworkStatus(prev => ({
        isOnline: online,
        wasOffline: prev.wasOffline || !online,
      }));
    });

    return cleanup;
  }, []);

  return {
    isOnline: networkStatus.isOnline,
    isOffline: !networkStatus.isOnline,
    wasOffline: networkStatus.wasOffline,
  };
}