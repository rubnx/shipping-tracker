import React, { useState, useEffect } from 'react';
import { ProgressiveLoadingIndicator } from './ProgressiveLoadingIndicator';

interface APIProvider {
  name: string;
  tier: 'free' | 'freemium' | 'premium';
  status: 'pending' | 'active' | 'completed' | 'failed';
  responseTime?: number;
  error?: string;
}

interface IntermediateFeedbackLoaderProps {
  isLoading: boolean;
  currentStep?: string;
  providers?: APIProvider[];
  trackingNumber?: string;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
  showProviderDetails?: boolean;
  showTimeoutWarning?: boolean;
  timeoutMs?: number;
}

/**
 * Enhanced loading component with intermediate feedback during long API calls
 * Implements Requirements 5.1, 5.2 for improved loading states and user feedback
 */
export function IntermediateFeedbackLoader({
  isLoading,
  currentStep,
  providers = [],
  trackingNumber,
  error,
  onCancel,
  onRetry,
  className = '',
  showProviderDetails = true,
  showTimeoutWarning = true,
  timeoutMs = 30000,
}: IntermediateFeedbackLoaderProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [intermediateMessages, setIntermediateMessages] = useState<string[]>([]);
  const [showTimeoutWarningState, setShowTimeoutWarningState] = useState(false);

  // Track elapsed time
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      setIntermediateMessages([]);
      setShowTimeoutWarningState(false);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      // Show timeout warning at 80% of timeout duration
      if (showTimeoutWarning && elapsed > timeoutMs * 0.8) {
        setShowTimeoutWarningState(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, timeoutMs, showTimeoutWarning]);

  // Generate intermediate messages based on elapsed time and current step
  useEffect(() => {
    if (!isLoading || !currentStep) return;

    const messages: string[] = [];
    
    if (elapsedTime > 5000) {
      messages.push('This is taking longer than usual...');
    }
    
    if (elapsedTime > 10000) {
      messages.push('Still working on your request...');
    }
    
    if (elapsedTime > 15000) {
      messages.push('Almost there, please be patient...');
    }
    
    if (elapsedTime > 20000) {
      messages.push('Trying alternative data sources...');
    }

    // Add step-specific messages
    if (currentStep?.includes('api-')) {
      const activeProvider = providers.find(p => p.status === 'active');
      if (activeProvider) {
        if (elapsedTime > 8000) {
          messages.push(`${activeProvider.name} is responding slowly, this may take a moment...`);
        }
        if (elapsedTime > 12000 && activeProvider.tier === 'free') {
          messages.push('Free tier APIs can be slower. Consider upgrading for faster results.');
        }
      }
    }

    setIntermediateMessages(messages);
  }, [elapsedTime, currentStep, providers, isLoading]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getProviderStatusIcon = (status: APIProvider['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'freemium':
        return 'bg-blue-100 text-blue-800';
      case 'free':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isLoading && !error) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {error ? 'Loading Failed' : 'Searching for Tracking Information'}
            </h3>
            {trackingNumber && (
              <p className="text-sm text-gray-600 mt-1">
                Tracking: <span className="font-mono font-medium">{trackingNumber}</span>
              </p>
            )}
          </div>
          
          {isLoading && (
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {formatTime(elapsedTime)} elapsed
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Provider Status */}
        {showProviderDetails && providers.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">API Providers</h4>
            <div className="space-y-2">
              {providers.map((provider, index) => (
                <div key={provider.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    {getProviderStatusIcon(provider.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierBadgeColor(provider.tier)}`}>
                          {provider.tier}
                        </span>
                      </div>
                      {provider.error && (
                        <p className="text-xs text-red-600 mt-1">{provider.error}</p>
                      )}
                    </div>
                  </div>
                  
                  {provider.responseTime && (
                    <span className="text-xs text-gray-500">
                      {formatTime(provider.responseTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intermediate Messages */}
        {intermediateMessages.length > 0 && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Status Update</h4>
                  <div className="mt-2 text-sm text-blue-700">
                    {intermediateMessages[intermediateMessages.length - 1]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeout Warning */}
        {showTimeoutWarningState && isLoading && (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Taking Longer Than Expected</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    The request is taking longer than usual. This might be due to high API load or network issues.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Error</h4>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  {onRetry && (
                    <div className="mt-3">
                      <button
                        onClick={onRetry}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">
                {currentStep ? `${currentStep}...` : 'Loading...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with helpful tips */}
      {isLoading && elapsedTime > 10000 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div className="text-xs text-gray-500">
            <p className="mb-1">💡 <strong>Tip:</strong> Slow responses are often due to API rate limits or high traffic.</p>
            <p>We're trying multiple providers to get you the best results.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntermediateFeedbackLoader;