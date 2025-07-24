// Simple NetworkStatus stub
import React from 'react';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#ff6b6b', 
      color: 'white', 
      textAlign: 'center',
      fontSize: '14px'
    }}>
      ⚠️ You are currently offline
    </div>
  );
};