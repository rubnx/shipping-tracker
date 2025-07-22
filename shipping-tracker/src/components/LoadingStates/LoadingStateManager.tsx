import React, { useEffect, useState } from 'react';
import { ComprehensiveLoadingFeedback } from './ComprehensiveLoadingFeedback';
import { useEnhancedLoading, APIProvider } from '../../hooks/useEnhancedLoading';

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
      console.log('Loading timeout reached');\n    },\n    onWarning: () => {\n      console.log('Loading taking longer than expected');\n    },\n    onProviderChange: (provider) => {\n      console.log('Provider changed:', provider.name);\n    },\n    onComplete: () => {\n      console.log('Loading completed successfully');\n    },\n    onError: (error) => {\n      console.error('Loading error:', error);\n    },\n  });\n\n  // Sync external loading state\n  useEffect(() => {\n    if (isLoading && !loadingState.isLoading) {\n      startLoading('Searching for tracking information...', externalProviders);\n    } else if (!isLoading && loadingState.isLoading) {\n      stopLoading();\n    }\n  }, [isLoading, loadingState.isLoading, startLoading, stopLoading, externalProviders]);\n\n  // Update providers when external providers change\n  useEffect(() => {\n    setCurrentProviders(externalProviders);\n  }, [externalProviders]);\n\n  // Notify parent of loading state changes\n  useEffect(() => {\n    onLoadingStateChange?.(loadingState);\n  }, [loadingState, onLoadingStateChange]);\n\n  // Simulate provider progression for demo purposes\n  useEffect(() => {\n    if (!loadingState.isLoading || externalProviders.length === 0) return;\n\n    const simulateProviderProgression = () => {\n      const { elapsedTime } = loadingState;\n      const providers = [...currentProviders];\n      let hasUpdates = false;\n\n      // Simulate provider status changes based on elapsed time\n      providers.forEach((provider, index) => {\n        const delay = index * 3000 + provider.estimatedTime;\n        \n        if (elapsedTime > delay && provider.status === 'pending') {\n          provider.status = 'active';\n          updateStep(`Checking ${provider.name}...`);\n          updateProvider(provider.name, { status: 'active' });\n          hasUpdates = true;\n        } else if (elapsedTime > delay + 2000 && provider.status === 'active') {\n          // Simulate completion or failure\n          const success = Math.random() > 0.3; // 70% success rate\n          provider.status = success ? 'completed' : 'failed';\n          provider.responseTime = delay + Math.random() * 2000;\n          \n          if (!success) {\n            provider.error = getRandomError();\n          }\n          \n          updateProvider(provider.name, {\n            status: provider.status,\n            responseTime: provider.responseTime,\n            error: provider.error,\n          });\n          hasUpdates = true;\n        }\n      });\n\n      if (hasUpdates) {\n        setCurrentProviders(providers);\n      }\n\n      // Check if all providers are done\n      const allDone = providers.every(p => p.status === 'completed' || p.status === 'failed');\n      const anySuccess = providers.some(p => p.status === 'completed');\n      \n      if (allDone) {\n        if (anySuccess) {\n          updateStep('Loading complete!');\n          setTimeout(() => stopLoading(), 1000);\n        } else {\n          stopLoading('All providers failed to return data');\n        }\n      }\n    };\n\n    const interval = setInterval(simulateProviderProgression, 500);\n    return () => clearInterval(interval);\n  }, [loadingState.isLoading, loadingState.elapsedTime, currentProviders, updateStep, updateProvider, stopLoading]);\n\n  /**\n   * Get random error message for simulation\n   */\n  function getRandomError(): string {\n    const errors = [\n      'Rate limit exceeded',\n      'Connection timeout',\n      'Invalid tracking number format',\n      'Service temporarily unavailable',\n      'Authentication failed',\n      'No data found',\n    ];\n    return errors[Math.floor(Math.random() * errors.length)];\n  }\n\n  /**\n   * Handle retry action\n   */\n  const handleRetry = () => {\n    retryLoading();\n    onRetry?.();\n  };\n\n  /**\n   * Handle cancel action\n   */\n  const handleCancel = () => {\n    stopLoading();\n    onCancel?.();\n  };\n\n  // Don't render if not loading and no error\n  if (!loadingState.isLoading && !loadingState.error) {\n    return null;\n  }\n\n  return (\n    <div className={`loading-state-manager ${className}`}>\n      <ComprehensiveLoadingFeedback\n        isLoading={loadingState.isLoading}\n        trackingNumber={trackingNumber}\n        currentStep={loadingState.currentStep}\n        providers={currentProviders}\n        elapsedTime={loadingState.elapsedTime}\n        error={loadingState.error}\n        onCancel={handleCancel}\n        onRetry={handleRetry}\n        onSwitchToDemo={onSwitchToDemo}\n        onTryDifferentNumber={onTryDifferentNumber}\n        onReportIssue={onReportIssue}\n        loadingType={loadingType}\n        timeoutMs={timeoutMs}\n        showProviderDetails={showProviderDetails}\n        variant={variant}\n        className=\"w-full\"\n      />\n      \n      {/* Debug information in development */}\n      {process.env.NODE_ENV === 'development' && (\n        <div className=\"mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-600\">\n          <div className=\"font-semibold mb-2\">Debug Info:</div>\n          <div>Phase: {loadingState.phase}</div>\n          <div>Progress: {loadingState.progress.toFixed(1)}%</div>\n          <div>Elapsed: {loadingState.elapsedTime}ms</div>\n          <div>Current Provider: {getCurrentProvider()?.name || 'None'}</div>\n          <div>Stats: {JSON.stringify(getStats())}</div>\n        </div>\n      )}\n    </div>\n  );\n}\n\nexport default LoadingStateManager;"