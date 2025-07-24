import React, { useEffect, useState } from 'react';
import { ComprehensiveLoadingFeedback } from './ComprehensiveLoadingFeedback';
import { useEnhancedLoading, type APIProvider } from '../../hooks/useEnhancedLoading';

interface LoadingStateManagerProps {
  isLoading: boolean;
  trackingNumber?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onSwitchToDemo?: () => void;
  onTryDifferentNumber?: () => void;
  onReportIssue?: () => void;
  className?: string;
  loadingType?: 'shipment-details' | 'timeline' | 'map' | 'search-results';
  timeoutMs?: number;
  providers?: APIProvider[];
  variant?: 'mobile' | 'desktop';
  showProviderDetails?: boolean;
  onLoadingStateChange?: (state: any) => void;
}

/**
 * Loading State Manager that coordinates all loading components and provides
 * comprehensive loading feedback with progressive messages and timeout handling
 * Implements Requirements 5.1, 5.2 for comprehensive loading state management
 */
export function LoadingStateManager({
  isLoading,
  trackingNumber,
  onCancel,
  onRetry,
  onSwitchToDemo,
  onTryDifferentNumber,
  onReportIssue,
  className = '',
  loadingType = 'shipment-details',
  timeoutMs = 30000,
  providers: externalProviders = [],
  variant = 'desktop',
  showProviderDetails = true,
  onLoadingStateChange,
}: LoadingStateManagerProps) {
  const [currentProviders, setCurrentProviders] = useState<APIProvider[]>(externalProviders);

  // Initialize enhanced loading hook
  const {
    loadingState,
    startLoading,
    stopLoading,
    updateStep,
    updateProvider,
    retry: retryLoading,
    getCurrentProvider,
    getStats,
  } = useEnhancedLoading({
    timeoutMs,
    warningThresholdMs: timeoutMs * 0.7,
    providers: externalProviders,
    trackingNumber,
    onTimeout: () => {
      console.log('Loading timeout reached');
    },
    onWarning: () => {
      console.log('Loading taking longer than expected');
    },
    onProviderChange: (provider) => {
      console.log('Provider changed:', provider.name);
    },
    onComplete: () => {
      console.log('Loading completed successfully');
    },
    onError: (error) => {
      console.error('Loading error:', error);
    },
  });

  // Sync external loading state
  useEffect(() => {
    if (isLoading && !loadingState.isLoading) {
      startLoading('Searching for tracking information...', externalProviders);
    } else if (!isLoading && loadingState.isLoading) {
      stopLoading();
    }
  }, [isLoading, loadingState.isLoading, startLoading, stopLoading, externalProviders]);

  // Update providers when external providers change
  useEffect(() => {
    setCurrentProviders(externalProviders);
  }, [externalProviders]);

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingStateChange?.(loadingState);
  }, [loadingState, onLoadingStateChange]);

  // Simulate provider progression for demo purposes
  useEffect(() => {
    if (!loadingState.isLoading || externalProviders.length === 0) return;

    const simulateProviderProgression = () => {
      const { elapsedTime } = loadingState;
      const providers = [...currentProviders];
      let hasUpdates = false;

      // Simulate provider status changes based on elapsed time
      providers.forEach((provider, index) => {
        const delay = index * 3000 + provider.estimatedTime;
        
        if (elapsedTime > delay && provider.status === 'pending') {
          provider.status = 'active';
          updateStep(`Checking ${provider.name}...`);
          updateProvider(provider.name, { status: 'active' });
          hasUpdates = true;
        } else if (elapsedTime > delay + 2000 && provider.status === 'active') {
          // Simulate completion or failure
          const success = Math.random() > 0.3; // 70% success rate
          provider.status = success ? 'completed' : 'failed';
          provider.responseTime = delay + Math.random() * 2000;
          
          if (!success) {
            provider.error = getRandomError();
          }
          
          updateProvider(provider.name, {
            status: provider.status,
            responseTime: provider.responseTime,
            error: provider.error,
          });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        setCurrentProviders(providers);
      }

      // Check if all providers are done
      const allDone = providers.every(p => p.status === 'completed' || p.status === 'failed');
      const anySuccess = providers.some(p => p.status === 'completed');
      
      if (allDone) {
        if (anySuccess) {
          updateStep('Loading complete!');
          setTimeout(() => stopLoading(), 1000);
        } else {
          stopLoading('All providers failed to return data');
        }
      }
    };

    const interval = setInterval(simulateProviderProgression, 500);
    return () => clearInterval(interval);
  }, [loadingState.isLoading, loadingState.elapsedTime, currentProviders, updateStep, updateProvider, stopLoading]);

  /**
   * Get random error message for simulation
   */
  function getRandomError(): string {
    const errors = [
      'Rate limit exceeded',
      'Connection timeout',
      'Invalid tracking number format',
      'Service temporarily unavailable',
      'Authentication failed',
      'No data found',
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  /**
   * Handle retry action
   */
  const handleRetry = () => {
    retryLoading();
    onRetry?.();
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    stopLoading();
    onCancel?.();
  };

  // Don't render if not loading and no error
  if (!loadingState.isLoading && !loadingState.error) {
    return null;
  }

  return (
    <div className={`loading-state-manager ${className}`}>
      <ComprehensiveLoadingFeedback
        isLoading={loadingState.isLoading}
        trackingNumber={trackingNumber}
        currentStep={loadingState.currentStep}
        providers={currentProviders}
        elapsedTime={loadingState.elapsedTime}
        error={loadingState.error}
        onCancel={handleCancel}
        onRetry={handleRetry}
        onSwitchToDemo={onSwitchToDemo}
        onTryDifferentNumber={onTryDifferentNumber}
        onReportIssue={onReportIssue}
        loadingType={loadingType}
        timeoutMs={timeoutMs}
        showProviderDetails={showProviderDetails}
        variant={variant}
        className="w-full"
      />
      
      {/* Debug information in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-600">
          <div className="font-semibold mb-2">Debug Info:</div>
          <div>Phase: {loadingState.phase}</div>
          <div>Progress: {loadingState.progress.toFixed(1)}%</div>
          <div>Elapsed: {loadingState.elapsedTime}ms</div>
          <div>Current Provider: {getCurrentProvider()?.name || 'None'}</div>
          <div>Stats: {JSON.stringify(getStats())}</div>
        </div>
      )}
    </div>
  );
}

export default LoadingStateManager;