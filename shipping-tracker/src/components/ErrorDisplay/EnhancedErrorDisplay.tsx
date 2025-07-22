import { useState } from 'react';
import { ErrorHandlingService, type ErrorDetails, type ErrorRecoveryAction } from '../../services/ErrorHandlingService';

interface EnhancedErrorDisplayProps {
  error: any;
  context?: {
    trackingNumber?: string;
    operation?: string;
    provider?: string;
  };
  onRetry?: () => void | Promise<void>;
  onSwitchToDemo?: () => void | Promise<void>;
  onGoBack?: () => void | Promise<void>;
  onContactSupport?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onDismiss?: () => void;
  className?: string;
  showTechnicalDetails?: boolean;
}

export function EnhancedErrorDisplay({
  error,
  context = {},
  onRetry,
  onSwitchToDemo,
  onGoBack,
  onContactSupport,
  onRefresh,
  onDismiss,
  className = '',
  showTechnicalDetails = false,
}: EnhancedErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Categorize the error
  const errorDetails: ErrorDetails = ErrorHandlingService.categorizeError(error, context);
  
  // Generate recovery actions
  const recoveryActions: ErrorRecoveryAction[] = ErrorHandlingService.generateRecoveryActions(
    errorDetails,
    {
      retry: onRetry,
      switchToDemo: onSwitchToDemo,
      goBack: onGoBack,
      contactSupport: onContactSupport,
      refresh: onRefresh,
    }
  );

  // Get contextual error message
  const contextualMessage = ErrorHandlingService.getContextualErrorMessage(errorDetails, context);

  // Get styling based on severity
  const severityColors = ErrorHandlingService.getErrorSeverityColor(errorDetails.category.severity);
  const errorIcon = ErrorHandlingService.getErrorIcon(errorDetails.category.type);

  // Log error for debugging
  ErrorHandlingService.logError(errorDetails, context);

  const handleActionClick = async (action: ErrorRecoveryAction) => {
    if (action.label === 'Try Again') {
      setIsRetrying(true);
    }

    try {
      await action.action();
    } catch (actionError) {
      console.error('Recovery action failed:', actionError);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyError = () => {
    const errorInfo = {
      code: errorDetails.code,
      message: errorDetails.message,
      timestamp: errorDetails.timestamp,
      context,
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
  };

  return (
    <div className={`border rounded-lg p-4 ${severityColors} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-2xl" role="img" aria-label="Error icon">
            {errorIcon}
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {errorDetails.category.type === 'not_found' ? 'Tracking Number Not Found' :
               errorDetails.category.type === 'network' ? 'Connection Problem' :
               errorDetails.category.type === 'timeout' ? 'Request Timeout' :
               errorDetails.category.type === 'rate_limit' ? 'Rate Limit Exceeded' :
               errorDetails.category.type === 'validation' ? 'Invalid Input' :
               errorDetails.category.type === 'server' ? 'Server Error' :
               'Something Went Wrong'}
            </h3>
            <p className="mt-1 text-sm opacity-90">
              {contextualMessage}
            </p>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions */}
      {errorDetails.suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-sm mb-2">What you can try:</h4>
          <ul className="text-sm space-y-1 opacity-90">
            {errorDetails.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 mr-2 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recovery Actions */}
      {recoveryActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recoveryActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              disabled={isRetrying && action.label === 'Try Again'}
              className={`
                px-3 py-2 rounded text-sm font-medium transition-colors
                ${action.primary 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100'
                }
                disabled:cursor-not-allowed
              `}
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {isRetrying && action.label === 'Try Again' ? 'Retrying...' : action.label}
            </button>
          ))}
        </div>
      )}

      {/* Technical Details (Expandable) */}
      {(showTechnicalDetails || import.meta.env.DEV) && (
        <div className="mt-4 border-t pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg 
              className={`w-4 h-4 mr-1 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Technical Details
          </button>
          
          {isExpanded && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
              <div className="space-y-2">
                <div><strong>Error Code:</strong> {errorDetails.code}</div>
                <div><strong>Category:</strong> {errorDetails.category.type}</div>
                <div><strong>Severity:</strong> {errorDetails.category.severity}</div>
                <div><strong>Retryable:</strong> {errorDetails.category.retryable ? 'Yes' : 'No'}</div>
                <div><strong>Timestamp:</strong> {errorDetails.timestamp.toISOString()}</div>
                
                {context && Object.keys(context).length > 0 && (
                  <div>
                    <strong>Context:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(context, null, 2)}</pre>
                  </div>
                )}
                
                {errorDetails.technicalDetails && (
                  <div>
                    <strong>Technical Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{errorDetails.technicalDetails}</pre>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleCopyError}
                className="mt-2 text-blue-600 hover:text-blue-800 underline"
              >
                Copy Error Info
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error ID for support */}
      <div className="mt-4 text-xs text-gray-500">
        Error ID: {errorDetails.code}-{errorDetails.timestamp.getTime().toString(36)}
      </div>
    </div>
  );
}