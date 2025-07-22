import React, { useState, useEffect } from 'react';

interface TimeoutHandlerProps {
  isVisible: boolean;
  elapsedTime: number;
  timeoutMs: number;
  trackingNumber?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onSwitchToDemo?: () => void;
  onReportIssue?: () => void;
  className?: string;
}

/**
 * Component that handles timeout scenarios with fallback options
 * Implements Requirements 5.1, 5.2 for timeout handling with fallback options
 */
export function TimeoutHandler({
  isVisible,
  elapsedTime,
  timeoutMs,
  trackingNumber,
  onRetry,
  onCancel,
  onSwitchToDemo,
  onReportIssue,
  className = '',
}: TimeoutHandlerProps) {
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Show fallback options when approaching timeout
  useEffect(() => {
    if (elapsedTime > timeoutMs * 0.8) {
      setShowFallbackOptions(true);
      setCountdown(Math.max(0, timeoutMs - elapsedTime));
    } else {
      setShowFallbackOptions(false);
      setCountdown(0);
    }
  }, [elapsedTime, timeoutMs]);

  // Update countdown
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

  if (!isVisible || !showFallbackOptions) return null;

  return (
    <div className={`bg-white border border-orange-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Request Taking Longer Than Expected
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              We're still trying to get your tracking information, but it's taking longer than usual.
            </p>
            {countdown > 0 && (
              <p className="text-sm text-orange-600 mt-2">
                <strong>Timeout in {formatTime(countdown)}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Current Status</p>
              <p className="text-sm text-gray-600">
                Elapsed time: {formatTime(elapsedTime)}
              </p>
              {trackingNumber && (
                <p className="text-xs text-gray-500 mt-1">
                  Tracking: <span className="font-mono">{trackingNumber}</span>
                </p>
              )}
            </div>
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Fallback Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">What would you like to do?</h4>
          
          {/* Continue Waiting */}
          <button
            onClick={() => setShowFallbackOptions(false)}
            className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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

          {/* Retry */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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

          {/* Cancel */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cancel Request</p>
                  <p className="text-xs text-gray-500">Stop the current search</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Additional Help */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-gray-600">
              <p className="mb-1"><strong>Why is this taking so long?</strong></p>
              <ul className="space-y-1 text-gray-500">
                <li>• API providers may be experiencing high traffic</li>
                <li>• Some carriers have slower response times</li>
                <li>• Network connectivity issues</li>
                <li>• Rate limiting from free tier APIs</li>
              </ul>
              {onReportIssue && (
                <button
                  onClick={onReportIssue}
                  className="text-blue-600 hover:text-blue-800 underline mt-2"
                >
                  Report this issue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimeoutHandler;