import { useState, useEffect } from 'react';
import { ProgressiveMessageDisplay } from './ProgressiveMessageDisplay';
import { EnhancedTimeoutHandler } from './EnhancedTimeoutHandler';
import { EnhancedSkeletonLoader } from './EnhancedSkeletonLoader';

interface APIProvider {
  name: string;
  tier: 'free' | 'freemium' | 'premium';
  status: 'pending' | 'active' | 'completed' | 'failed';
  responseTime?: number;
  error?: string;
  description: string;
  estimatedTime: number;
}

interface ComprehensiveLoadingFeedbackProps {
  isLoading: boolean;
  trackingNumber?: string;
  currentStep?: string;
  providers?: APIProvider[];
  elapsedTime?: number;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onSwitchToDemo?: () => void;
  onTryDifferentNumber?: () => void;
  onReportIssue?: () => void;
  className?: string;
  loadingType?: 'shipment-details' | 'timeline' | 'map' | 'search-results';
  timeoutMs?: number;
  showProviderDetails?: boolean;
  variant?: 'mobile' | 'desktop';
}

/**
 * Comprehensive loading feedback component that provides progressive messages,
 * timeout handling, and fallback options
 * Implements Requirements 5.1, 5.2 for comprehensive loading states and user feedback
 */
export function ComprehensiveLoadingFeedback({
  isLoading,
  trackingNumber,
  currentStep,
  providers = [],
  elapsedTime = 0,
  error,
  onCancel,
  onRetry,
  onSwitchToDemo,
  onTryDifferentNumber,
  onReportIssue,
  className = '',
  loadingType = 'shipment-details',
  timeoutMs = 30000,
  showProviderDetails = true,
  variant = 'desktop',
}: ComprehensiveLoadingFeedbackProps) {
  const [loadingPhase, setLoadingPhase] = useState<'initial' | 'intermediate' | 'warning' | 'timeout' | 'critical'>('initial');
  const [showSkeletonContent, setShowSkeletonContent] = useState(true);

  // Determine loading phase based on elapsed time
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase('initial');
      setShowSkeletonContent(true);
      return;
    }

    if (error) {
      setLoadingPhase('critical');
      setShowSkeletonContent(false);
    } else if (elapsedTime >= timeoutMs) {
      setLoadingPhase('timeout');
      setShowSkeletonContent(false);
    } else if (elapsedTime > timeoutMs * 0.8) {
      setLoadingPhase('warning');
      setShowSkeletonContent(false);
    } else if (elapsedTime > 10000) {
      setLoadingPhase('intermediate');
      setShowSkeletonContent(true);
    } else {
      setLoadingPhase('initial');
      setShowSkeletonContent(true);
    }
  }, [isLoading, elapsedTime, timeoutMs, error]);

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getCurrentProvider = () => {
    return providers.find(p => p.status === 'active');
  };

  const getOverallProgress = (): number => {
    if (providers.length === 0) return 0;
    
    const completedCount = providers.filter(p => p.status === 'completed' || p.status === 'failed').length;
    const activeCount = providers.filter(p => p.status === 'active').length;
    
    return Math.round(((completedCount + activeCount * 0.5) / providers.length) * 100);
  };

  const getProviderStatusIcon = (status: APIProvider['status']) => {
    const iconSize = variant === 'mobile' ? 'w-4 h-4' : 'w-5 h-5';
    
    switch (status) {
      case 'completed':
        return (
          <svg className={`${iconSize} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <div className={`${iconSize} border-2 border-blue-500 border-t-transparent rounded-full animate-spin`} />
        );
      case 'failed':
        return (
          <svg className={`${iconSize} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className={`${iconSize} border-2 border-gray-300 rounded-full`} />
        );
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'freemium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'free':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isLoading && !error) return null;

  // Show timeout handler for warning, timeout, or critical phases
  if (loadingPhase === 'warning' || loadingPhase === 'timeout' || loadingPhase === 'critical') {
    const timeoutVariant = loadingPhase === 'critical' ? 'critical' : 
                          loadingPhase === 'timeout' ? 'timeout' : 'warning';
    
    return (
      <div className={`space-y-4 ${className}`}>
        <EnhancedTimeoutHandler
          isVisible={true}
          elapsedTime={elapsedTime}
          timeoutMs={timeoutMs}
          trackingNumber={trackingNumber}
          onRetry={onRetry}
          onCancel={onCancel}
          onSwitchToDemo={onSwitchToDemo}
          onReportIssue={onReportIssue}
          onTryDifferentNumber={onTryDifferentNumber}
          variant={timeoutVariant}
        />
      </div>
    );
  }

  // Main loading interface
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Loading Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className={`p-${variant === 'mobile' ? '4' : '6'} border-b border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`${variant === 'mobile' ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                Searching for Tracking Information
              </h3>
              {trackingNumber && (
                <p className={`${variant === 'mobile' ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                  Tracking: <span className="font-mono font-medium">{trackingNumber}</span>
                </p>
              )}
            </div>
            
            {isLoading && (
              <div className="text-right">
                <div className={`${variant === 'mobile' ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  {formatTime(elapsedTime)}
                </div>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className={`${variant === 'mobile' ? 'text-xs px-2 py-1' : 'text-xs'} text-gray-400 hover:text-gray-600 mt-1 transition-colors`}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isLoading && providers.length > 0 && (
            <div className="mt-4">
              <div className={`flex items-center justify-between ${variant === 'mobile' ? 'text-xs' : 'text-sm'} text-gray-600 mb-2`}>
                <span>Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getOverallProgress()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Progressive Messages */}
        {isLoading && (
          <div className={`p-${variant === 'mobile' ? '4' : '6'}`}>
            <ProgressiveMessageDisplay
              isLoading={isLoading}
              elapsedTime={elapsedTime}
              currentProvider={getCurrentProvider()?.name}
              providerTier={getCurrentProvider()?.tier}
              variant={variant === 'mobile' ? 'compact' : 'detailed'}
            />
          </div>
        )}

        {/* Provider Details */}
        {showProviderDetails && providers.length > 0 && (
          <div className={`p-${variant === 'mobile' ? '4' : '6'} border-t border-gray-100`}>
            <h4 className={`${variant === 'mobile' ? 'text-sm' : 'text-sm'} font-medium text-gray-700 mb-3`}>
              API Providers ({providers.filter(p => p.status === 'completed').length}/{providers.length})
            </h4>
            
            <div className="space-y-2">
              {providers.map((provider) => (
                <div key={provider.name} className={`flex items-center justify-between p-${variant === 'mobile' ? '2' : '3'} bg-gray-50 rounded-md`}>
                  <div className="flex items-center space-x-3">
                    {getProviderStatusIcon(provider.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`${variant === 'mobile' ? 'text-sm' : 'text-sm'} font-medium text-gray-900 truncate`}>
                          {provider.name}
                        </span>
                        <span className={`px-${variant === 'mobile' ? '1.5' : '2'} py-0.5 ${variant === 'mobile' ? 'text-xs' : 'text-xs'} font-medium rounded-full border ${getTierBadgeColor(provider.tier)}`}>
                          {provider.tier}
                        </span>
                        {provider.status === 'active' && (
                          <span className={`px-${variant === 'mobile' ? '1.5' : '2'} py-0.5 ${variant === 'mobile' ? 'text-xs' : 'text-xs'} bg-blue-100 text-blue-800 rounded-full`}>
                            Active
                          </span>
                        )}
                      </div>
                      {provider.error && (
                        <p className={`${variant === 'mobile' ? 'text-xs' : 'text-xs'} text-red-600 mt-1 truncate`}>
                          {provider.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {provider.responseTime && (
                    <span className={`${variant === 'mobile' ? 'text-xs' : 'text-xs'} text-gray-500 ml-2`}>
                      {formatTime(provider.responseTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton Content */}
        {showSkeletonContent && isLoading && (
          <div className={`p-${variant === 'mobile' ? '4' : '6'} border-t border-gray-100`}>
            <EnhancedSkeletonLoader
              type={loadingType}
              showProgress={true}
              elapsedTime={elapsedTime}
              showIntermediateMessages={true}
              showTimeoutWarning={loadingPhase === 'warning'}
              timeoutMs={timeoutMs}
              className="opacity-90"
              progressMessage={currentStep || 'Loading tracking information...'}
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`p-${variant === 'mobile' ? '4' : '6'} border-t border-gray-100`}>
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

        {/* Footer with tips */}
        {isLoading && elapsedTime > 8000 && loadingPhase === 'intermediate' && (
          <div className={`px-${variant === 'mobile' ? '4' : '6'} py-${variant === 'mobile' ? '3' : '4'} bg-gray-50 border-t border-gray-100 rounded-b-lg`}>
            <div className={`${variant === 'mobile' ? 'text-xs' : 'text-xs'} text-gray-500`}>
              <p className="mb-1">💡 <strong>Tip:</strong> We're checking multiple data sources to get you the most accurate information.</p>
              <p>Free tier APIs may respond slower than premium services.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComprehensiveLoadingFeedback;