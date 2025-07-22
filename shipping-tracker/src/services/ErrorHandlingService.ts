/**
 * Error Handling Service
 * Implements Requirements 5.3, 5.4, 5.5 for comprehensive error handling
 */

export interface ErrorCategory {
  type: 'network' | 'validation' | 'not_found' | 'rate_limit' | 'timeout' | 'server' | 'authentication' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userFacing: boolean;
}

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  suggestions: string[];
  technicalDetails?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  icon?: string;
}

export class ErrorHandlingService {
  private static errorPatterns: Array<{
    pattern: RegExp | string;
    category: ErrorCategory;
    messageGenerator: (error: any) => Partial<ErrorDetails>;
  }> = [
    // Network Errors
    {
      pattern: /network|connection|fetch/i,
      category: {
        type: 'network',
        severity: 'high',
        retryable: true,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again',
          'Switch to demo mode if available',
        ],
      }),
    },

    // Timeout Errors
    {
      pattern: /timeout|timed out/i,
      category: {
        type: 'timeout',
        severity: 'medium',
        retryable: true,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'The request is taking longer than expected. This might be due to high server load.',
        suggestions: [
          'Wait a moment and try again',
          'Check if the tracking number is correct',
          'Try using a different API provider',
          'Contact support if the issue persists',
        ],
      }),
    },

    // Rate Limit Errors
    {
      pattern: /rate limit|too many requests|429/i,
      category: {
        type: 'rate_limit',
        severity: 'medium',
        retryable: true,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'Too many requests have been made. Please wait a moment before trying again.',
        suggestions: [
          'Wait a few minutes before trying again',
          'Reduce the frequency of your requests',
          'Try using demo mode for testing',
          'Consider upgrading to a premium API plan',
        ],
      }),
    },

    // Not Found Errors
    {
      pattern: /not found|404|tracking.*not.*found/i,
      category: {
        type: 'not_found',
        severity: 'low',
        retryable: false,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'The tracking number was not found. Please verify the number and try again.',
        suggestions: [
          'Double-check the tracking number for typos',
          'Ensure you\'re using the correct tracking format',
          'Try searching with a different tracking type',
          'Contact the shipping company directly',
          'The shipment might not be in the system yet',
        ],
      }),
    },

    // Validation Errors
    {
      pattern: /validation|invalid|400|bad request/i,
      category: {
        type: 'validation',
        severity: 'low',
        retryable: false,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'The tracking number format is invalid. Please check and try again.',
        suggestions: [
          'Check the tracking number format',
          'Remove any spaces or special characters',
          'Ensure the number is complete',
          'Try selecting a different tracking type',
        ],
      }),
    },

    // Authentication Errors
    {
      pattern: /unauthorized|401|authentication|api key/i,
      category: {
        type: 'authentication',
        severity: 'high',
        retryable: false,
        userFacing: false,
      },
      messageGenerator: (error) => ({
        userMessage: 'There\'s an issue with the service configuration. Please try again later.',
        suggestions: [
          'Try again in a few minutes',
          'Switch to demo mode if available',
          'Contact support if the issue persists',
        ],
      }),
    },

    // Server Errors
    {
      pattern: /server error|500|502|503|internal/i,
      category: {
        type: 'server',
        severity: 'high',
        retryable: true,
        userFacing: true,
      },
      messageGenerator: (error) => ({
        userMessage: 'The server is experiencing issues. Please try again in a few minutes.',
        suggestions: [
          'Wait a few minutes and try again',
          'Check the service status page',
          'Try using a different tracking provider',
          'Switch to demo mode if available',
        ],
      }),
    },
  ];

  /**
   * Categorize and enhance error information
   */
  static categorizeError(error: any, context?: Record<string, any>): ErrorDetails {
    const errorString = this.extractErrorString(error);
    const matchedPattern = this.errorPatterns.find(pattern => {
      if (typeof pattern.pattern === 'string') {
        return errorString.toLowerCase().includes(pattern.pattern.toLowerCase());
      }
      return pattern.pattern.test(errorString);
    });

    const category = matchedPattern?.category || {
      type: 'unknown',
      severity: 'medium',
      retryable: true,
      userFacing: true,
    };

    const baseDetails = matchedPattern?.messageGenerator(error) || {};

    return {
      code: this.extractErrorCode(error),
      message: errorString,
      userMessage: baseDetails.userMessage || 'An unexpected error occurred. Please try again.',
      category,
      suggestions: baseDetails.suggestions || [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if the issue persists',
      ],
      technicalDetails: this.extractTechnicalDetails(error),
      timestamp: new Date(),
      context,
      ...baseDetails,
    };
  }

  /**
   * Generate recovery actions based on error type
   */
  static generateRecoveryActions(
    errorDetails: ErrorDetails,
    callbacks: {
      retry?: () => void | Promise<void>;
      switchToDemo?: () => void | Promise<void>;
      goBack?: () => void | Promise<void>;
      contactSupport?: () => void | Promise<void>;
      refresh?: () => void | Promise<void>;
    }
  ): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    // Retry action for retryable errors
    if (errorDetails.category.retryable && callbacks.retry) {
      actions.push({
        label: 'Try Again',
        action: callbacks.retry,
        primary: true,
        icon: '🔄',
      });
    }

    // Demo mode for network/server issues
    if (
      (errorDetails.category.type === 'network' || 
       errorDetails.category.type === 'server' || 
       errorDetails.category.type === 'timeout') && 
      callbacks.switchToDemo
    ) {
      actions.push({
        label: 'Switch to Demo Mode',
        action: callbacks.switchToDemo,
        icon: '🎭',
      });
    }

    // Refresh for certain error types
    if (
      (errorDetails.category.type === 'network' || 
       errorDetails.category.type === 'server') && 
      callbacks.refresh
    ) {
      actions.push({
        label: 'Refresh Page',
        action: callbacks.refresh,
        icon: '🔄',
      });
    }

    // Go back for validation errors
    if (errorDetails.category.type === 'validation' && callbacks.goBack) {
      actions.push({
        label: 'Go Back',
        action: callbacks.goBack,
        icon: '←',
      });
    }

    // Contact support for critical errors
    if (
      errorDetails.category.severity === 'critical' || 
      errorDetails.category.type === 'authentication'
    ) {
      if (callbacks.contactSupport) {
        actions.push({
          label: 'Contact Support',
          action: callbacks.contactSupport,
          icon: '📞',
        });
      }
    }

    return actions;
  }

  /**
   * Get user-friendly error message with context
   */
  static getContextualErrorMessage(
    errorDetails: ErrorDetails,
    context: {
      trackingNumber?: string;
      operation?: string;
      provider?: string;
    }
  ): string {
    let message = errorDetails.userMessage;

    // Add context-specific information
    if (context.trackingNumber && errorDetails.category.type === 'not_found') {
      message += ` The tracking number "${context.trackingNumber}" could not be found.`;
    }

    if (context.provider && errorDetails.category.type === 'rate_limit') {
      message += ` The ${context.provider} API has reached its rate limit.`;
    }

    if (context.operation) {
      message = message.replace('The request', `The ${context.operation} request`);
    }

    return message;
  }

  /**
   * Get error severity color for UI
   */
  static getErrorSeverityColor(severity: ErrorCategory['severity']): string {
    switch (severity) {
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get error icon based on type
   */
  static getErrorIcon(type: ErrorCategory['type']): string {
    switch (type) {
      case 'network':
        return '🌐';
      case 'timeout':
        return '⏱️';
      case 'rate_limit':
        return '🚦';
      case 'not_found':
        return '🔍';
      case 'validation':
        return '⚠️';
      case 'authentication':
        return '🔐';
      case 'server':
        return '🖥️';
      default:
        return '❌';
    }
  }

  /**
   * Check if error should trigger fallback mode
   */
  static shouldTriggerFallback(errorDetails: ErrorDetails): boolean {
    return (
      errorDetails.category.type === 'network' ||
      errorDetails.category.type === 'server' ||
      errorDetails.category.type === 'timeout' ||
      errorDetails.category.severity === 'critical'
    );
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(errorDetails: ErrorDetails, attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    let multiplier = 1;
    switch (errorDetails.category.type) {
      case 'rate_limit':
        multiplier = 5; // 5 seconds base for rate limits
        break;
      case 'server':
        multiplier = 2; // 2 seconds base for server errors
        break;
      case 'timeout':
        multiplier = 3; // 3 seconds base for timeouts
        break;
      default:
        multiplier = 1;
    }

    // Exponential backoff
    const delay = Math.min(baseDelay * multiplier * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Private helper methods
   */
  private static extractErrorString(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.data?.message) return error.data.message;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.statusText) return error.response.statusText;
    return 'Unknown error occurred';
  }

  private static extractErrorCode(error: any): string {
    if (error?.code) return error.code;
    if (error?.response?.status) return `HTTP_${error.response.status}`;
    if (error?.status) return `HTTP_${error.status}`;
    if (error?.name) return error.name;
    return 'UNKNOWN_ERROR';
  }

  private static extractTechnicalDetails(error: any): string | undefined {
    const details: string[] = [];

    if (error?.stack) details.push(`Stack: ${error.stack}`);
    if (error?.response?.headers) details.push(`Headers: ${JSON.stringify(error.response.headers)}`);
    if (error?.config?.url) details.push(`URL: ${error.config.url}`);
    if (error?.config?.method) details.push(`Method: ${error.config.method.toUpperCase()}`);

    return details.length > 0 ? details.join('\n') : undefined;
  }

  /**
   * Log error for debugging (development only)
   */
  static logError(errorDetails: ErrorDetails, context?: Record<string, any>): void {
    if (import.meta.env.DEV) {
      console.group(`🚨 Error: ${errorDetails.code}`);
      console.error('Message:', errorDetails.message);
      console.error('User Message:', errorDetails.userMessage);
      console.error('Category:', errorDetails.category);
      console.error('Suggestions:', errorDetails.suggestions);
      if (errorDetails.technicalDetails) {
        console.error('Technical Details:', errorDetails.technicalDetails);
      }
      if (context) {
        console.error('Context:', context);
      }
      console.groupEnd();
    }
  }
}

export default ErrorHandlingService;