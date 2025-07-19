/**
 * Comprehensive error handling utilities
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userMessage: string;
  retryable: boolean;
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  OFFLINE_ERROR: 'OFFLINE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodes = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a standardized app error
 */
export function createAppError(
  code: ErrorCodes,
  message: string,
  details?: any,
  retryable: boolean = false
): AppError {
  const userMessages: Record<ErrorCodes, string> = {
    [ErrorCodes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
    [ErrorCodes.API_ERROR]: 'Unable to fetch tracking information. Please try again later.',
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your tracking number format and try again.',
    [ErrorCodes.NOT_FOUND]: 'Tracking number not found. Please verify the number and try again.',
    [ErrorCodes.UNAUTHORIZED]: 'Access denied. Please refresh the page and try again.',
    [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCodes.SERVER_ERROR]: 'Server error occurred. Please try again later.',
    [ErrorCodes.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
    [ErrorCodes.OFFLINE_ERROR]: 'You appear to be offline. Please check your connection.',
    [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  };

  return {
    code,
    message,
    details,
    timestamp: new Date(),
    userMessage: userMessages[code],
    retryable,
  };
}

/**
 * Parse HTTP errors into app errors
 */
export function parseHttpError(error: any): AppError {
  if (!navigator.onLine) {
    return createAppError(ErrorCodes.OFFLINE_ERROR, 'Offline', error, true);
  }

  if (error.name === 'AbortError') {
    return createAppError(ErrorCodes.TIMEOUT_ERROR, 'Request aborted', error, true);
  }

  if (!error.response) {
    return createAppError(ErrorCodes.NETWORK_ERROR, 'Network error', error, true);
  }

  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return createAppError(ErrorCodes.VALIDATION_ERROR, data?.message || 'Bad request', data, false);
    case 401:
      return createAppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', data, false);
    case 404:
      return createAppError(ErrorCodes.NOT_FOUND, 'Not found', data, false);
    case 429:
      return createAppError(ErrorCodes.RATE_LIMITED, 'Rate limited', data, true);
    case 500:
    case 502:
    case 503:
    case 504:
      return createAppError(ErrorCodes.SERVER_ERROR, 'Server error', data, true);
    default:
      return createAppError(ErrorCodes.API_ERROR, data?.message || 'API error', data, true);
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Don't retry non-retryable errors
      if (error instanceof Error && 'retryable' in error && !error.retryable) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Network connectivity detection
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Monitor network status
 */
export function onNetworkStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Log errors for monitoring
 */
export function logError(error: AppError | Error, context?: string): void {
  const errorData = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Log]', errorData);
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // errorTrackingService.captureError(errorData);
  }
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(createAppError(ErrorCodes.TIMEOUT_ERROR, `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}