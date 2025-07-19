import React from 'react';
import type { AppError } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
  variant = 'card',
}) => {
  const getIcon = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'OFFLINE_ERROR':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
          </svg>
        );
      case 'NOT_FOUND':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'RATE_LIMITED':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'banner':
        return 'bg-red-50 border border-red-200 rounded-md p-4';
      case 'inline':
        return 'bg-red-50 border-l-4 border-red-400 p-4';
      case 'card':
      default:
        return 'bg-white border border-red-200 rounded-lg shadow-sm p-6';
    }
  };

  return (
    <div className={`${getVariantClasses()} ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="text-red-400">
            {getIcon()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.userMessage}</p>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">
                Technical Details
              </summary>
              <div className="mt-1 text-xs text-red-600 font-mono">
                <div>Code: {error.code}</div>
                <div>Message: {error.message}</div>
                <div>Time: {error.timestamp.toLocaleString()}</div>
                {error.details && (
                  <div>Details: {JSON.stringify(error.details, null, 2)}</div>
                )}
              </div>
            </details>
          )}

          <div className="mt-4 flex space-x-2">
            {error.retryable && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="bg-white px-3 py-2 rounded-md text-sm font-medium text-red-800 border border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;