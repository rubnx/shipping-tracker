import { useState, useEffect } from 'react';

interface EnhancedTimeoutHandlerProps {
  isVisible: boolean;
  elapsedTime: number;
  timeoutMs: number;
  trackingNumber?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onSwitchToDemo?: () => void;
  onReportIssue?: () => void;
  onTryDifferentNumber?: () => void;
  className?: string;
  variant?: 'warning' | 'timeout' | 'critical';
}

/**
 * Enhanced timeout handler with comprehensive fallback options
 * Implements Requirements 5.1, 5.2 for timeout handling with fallback options
 */
export function EnhancedTimeoutHandler({
  isVisible,
  elapsedTime,
  timeoutMs,
  trackingNumber,
  onRetry,
  onCancel,
  onSwitchToDemo,
  onReportIssue,
  onTryDifferentNumber,
  className = '',
  variant = 'warning',
}: EnhancedTimeoutHandlerProps) {
  const [countdown, setCountdown] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Calculate countdown and variant
  useEffect(() => {
    const remaining = Math.max(0, timeoutMs - elapsedTime);
    setCountdown(remaining);
    
    // Show advanced options after 80% of timeout
    if (elapsedTime > timeoutMs * 0.8) {
      setShowAdvancedOptions(true);
    }
  }, [elapsedTime, timeoutMs]);

  // Update countdown every second
  useEffect(() => {
    if (countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-900',
          text: 'text-red-700',
          accent: 'text-red-600',
        };
      case 'timeout':
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-500',
          title: 'text-orange-900',
          text: 'text-orange-700',
          accent: 'text-orange-600',
        };
      default: // warning
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-900',
          text: 'text-yellow-700',
          accent: 'text-yellow-600',
        };
    }
  };

  const styles = getVariantStyles();

  const getTitle = () => {
    switch (variant) {
      case 'critical':
        return 'Request Failed';
      case 'timeout':
        return 'Request Timed Out';
      default:
        return 'Taking Longer Than Expected';
    }
  };

  const getDescription = () => {
    switch (variant) {
      case 'critical':
        return 'All API providers failed to respond. This might be due to network issues or service outages.';
      case 'timeout':
        return 'The request has exceeded the maximum allowed time. This usually indicates API or network issues.';
      default:
        return 'The request is taking longer than usual. This might be due to high API load or network delays.';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`border rounded-lg shadow-sm ${styles.container} ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            {variant === 'critical' ? (
              <svg className={`w-6 h-6 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className={`w-6 h-6 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${styles.title}`}>
              {getTitle()}
            </h3>
            <p className={`text-sm mt-1 ${styles.text}`}>
              {getDescription()}
            </p>
            {countdown > 0 && variant === 'warning' && (
              <p className={`text-sm mt-2 font-medium ${styles.accent}`}>
                Timeout in {formatTime(countdown)}
              </p>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white bg-opacity-50 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${styles.title}`}>Current Status</p>
              <p className={`text-sm ${styles.text}`}>
                Elapsed time: {formatTime(elapsedTime)}
              </p>
              {trackingNumber && (
                <p className="text-xs text-gray-500 mt-1">
                  Tracking: <span className="font-mono">{trackingNumber}</span>
                </p>
              )}
            </div>
            {variant === 'warning' && (
              <div className={`w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin ${styles.icon}`}></div>
            )}
          </div>
        </div>

        {/* Primary Actions */}
        <div className="space-y-3 mb-6">
          <h4 className={`text-sm font-medium ${styles.title}`}>What would you like to do?</h4>
          
          {/* Retry */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Try Again</p>
                  <p className="text-xs text-gray-500">Start fresh with a new request</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Switch to Demo Mode */}
          {onSwitchToDemo && (
            <button
              onClick={onSwitchToDemo}
              className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">View Demo Data</p>
                  <p className="text-xs text-gray-500">See how the app works with sample tracking</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Continue Waiting (only for warning variant) */}
          {variant === 'warning' && (
            <button
              onClick={() => setShowAdvancedOptions(false)}
              className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Continue Waiting</p>
                  <p className="text-xs text-gray-500">Keep trying with current providers</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>More Options</span>
            </button>

            <div className="space-y-2">
              {/* Try Different Number */}
              {onTryDifferentNumber && (
                <button
                  onClick={onTryDifferentNumber}
                  className="w-full flex items-center justify-between p-2 text-left text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <span>Try Different Tracking Number</span>
                  </div>
                </button>
              )}

              {/* Report Issue */}
              {onReportIssue && (
                <button
                  onClick={onReportIssue}
                  className="w-full flex items-center justify-between p-2 text-left text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>Report This Issue</span>
                  </div>
                </button>
              )}

              {/* Cancel */}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full flex items-center justify-between p-2 text-left text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Cancel Request</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Help Information */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-gray-600">
              <p className="mb-1"><strong>Why is this happening?</strong></p>
              <ul className="space-y-1 text-gray-500">
                <li>• API providers may be experiencing high traffic</li>
                <li>• Some carriers have slower response times</li>
                <li>• Network connectivity issues</li>
                <li>• Rate limiting from free tier APIs</li>
                <li>• The tracking number might not be in the system yet</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedTimeoutHandler;