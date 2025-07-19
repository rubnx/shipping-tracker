import { useState, useCallback } from 'react';
import { createAppError, ErrorCodes, logError, parseHttpError } from '../utils/errorHandling';
import type { AppError } from '../utils/errorHandling';

interface UseErrorHandlingReturn {
  error: AppError | null;
  setError: (error: AppError | Error | null) => void;
  clearError: () => void;
  handleError: (error: any, context?: string) => void;
  retry: (() => void) | null;
  isRetryable: boolean;
}

/**
 * Custom hook for comprehensive error handling
 */
export function useErrorHandling(
  onRetry?: () => void,
  autoLog: boolean = true
): UseErrorHandlingReturn {
  const [error, setErrorState] = useState<AppError | null>(null);

  const setError = useCallback((error: AppError | Error | null) => {
    if (!error) {
      setErrorState(null);
      return;
    }

    let appError: AppError;
    
    if (error instanceof Error) {
      // Convert regular Error to AppError
      appError = createAppError(
        ErrorCodes.UNKNOWN_ERROR,
        error.message,
        { originalError: error },
        true
      );
    } else {
      appError = error;
    }

    setErrorState(appError);

    if (autoLog) {
      logError(appError);
    }
  }, [autoLog]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    let appError: AppError;

    try {
      // Try to parse as HTTP error first
      appError = parseHttpError(error);
    } catch {
      // Fallback to generic error handling
      if (error instanceof Error) {
        appError = createAppError(
          ErrorCodes.UNKNOWN_ERROR,
          error.message,
          { originalError: error },
          true
        );
      } else {
        appError = createAppError(
          ErrorCodes.UNKNOWN_ERROR,
          'An unknown error occurred',
          { originalError: error },
          true
        );
      }
    }

    setErrorState(appError);

    if (autoLog) {
      logError(appError, context);
    }
  }, [autoLog]);

  const retry = error?.retryable && onRetry ? onRetry : null;

  return {
    error,
    setError,
    clearError,
    handleError,
    retry,
    isRetryable: error?.retryable ?? false,
  };
}