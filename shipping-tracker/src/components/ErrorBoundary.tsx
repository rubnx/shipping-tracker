import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTrackingService } from '../services/ErrorTrackingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  recoveryActions: Array<{
    id: string;
    title: string;
    description: string;
    action: () => void | Promise<void>;
  }>;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, recoveryActions: [] };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, recoveryActions: [] };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Capture error with tracking service
    const errorId = errorTrackingService.captureError(error, {
      category: 'javascript',
      severity: 'critical',
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      tags: ['error-boundary', 'react'],
    });

    // Get recovery actions
    const recoveryActions = errorTrackingService.getErrorRecoveryActions(error);
    
    this.setState({
      error,
      errorInfo,
      errorId,
      recoveryActions,
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
                {this.state.errorId && (
                  <p className="text-xs text-gray-500">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="space-y-3">
              {this.state.recoveryActions.length > 0 ? (
                this.state.recoveryActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={async () => {
                      try {
                        await action.action();
                        // If action succeeds, try to recover
                        this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined, recoveryActions: [] });
                      } catch (error) {
                        console.error('Recovery action failed:', error);
                        errorTrackingService.captureError(error as Error, {
                          category: 'user',
                          severity: 'medium',
                          context: { recoveryAttempt: true },
                        });
                      }
                    }}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {action.description}
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined, recoveryActions: [] })}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;