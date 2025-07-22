import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorHandlingService, type ErrorDetails } from '../services/ErrorHandlingService';

interface ProgressiveErrorState {
  error: ErrorDetails | null;
  attemptCount: number;
  isRetrying: boolean;
  fallbackMode: boolean;
  lastAttempt: Date | null;
}

interface ProgressiveErrorHandlingOptions {
  maxRetries?: number;
  enableFallback?: boolean;
  retryDelay?: number;
  onFallback?: () => void;
  onMaxRetriesReached?: (error: ErrorDetails) => void;
}

/**
 * Hook for progressive error handling with automatic retries and fallback
 * Implements Requirements 5.3, 5.4, 5.5 for progressive error handling
 */
export function useProgressiveErrorHandling(options: ProgressiveErrorHandlingOptions = {}) {
  const {
    maxRetries = 3,
    enableFallback = true,
    retryDelay,
    onFallback,
    onMaxRetriesReached,
  } = options;

  const [state, setState] = useState<ProgressiveErrorState>({
    error: null,
    attemptCount: 0,
    isRetrying: false,
    fallbackMode: false,
    lastAttempt: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Handle an error with progressive retry logic
   */
  const handleError = useCallback(async (
    error: any,
    context?: Record<string, any>,
    retryFn?: () => Promise<any>
  ) => {
    const errorDetails = ErrorHandlingService.categorizeError(error, context);
    
    setState(prev => ({
      ...prev,
      error: errorDetails,
      attemptCount: prev.attemptCount + 1,
      lastAttempt: new Date(),
    }));

    // Check if we should trigger fallback immediately
    if (enableFallback && ErrorHandlingService.shouldTriggerFallback(errorDetails)) {
      setState(prev => ({ ...prev, fallbackMode: true }));
      onFallback?.();
      return;
    }

    // Check if error is retryable and we haven't exceeded max retries
    if (errorDetails.category.retryable && state.attemptCount < maxRetries && retryFn) {
      const delay = retryDelay || ErrorHandlingService.getRetryDelay(errorDetails, state.attemptCount);
      
      setState(prev => ({ ...prev, isRetrying: true }));

      retryTimeoutRef.current = setTimeout(async () => {
        try {
          await retryFn();
          // Success - reset error state
          setState({
            error: null,
            attemptCount: 0,
            isRetrying: false,
            fallbackMode: false,
            lastAttempt: null,
          });
        } catch (retryError) {
          // Retry failed - handle recursively
          setState(prev => ({ ...prev, isRetrying: false }));
          handleError(retryError, context, retryFn);
        }
      }, delay);
    } else if (state.attemptCount >= maxRetries) {
      // Max retries reached
      onMaxRetriesReached?.(errorDetails);
      
      if (enableFallback) {
        setState(prev => ({ ...prev, fallbackMode: true }));
        onFallback?.();
      }
    }
  }, [state.attemptCount, maxRetries, retryDelay, enableFallback, onFallback, onMaxRetriesReached]);

  /**
   * Manually retry the last failed operation
   */
  const retry = useCallback(async (retryFn: () => Promise<any>) => {
    if (!state.error || state.isRetrying) return;

    setState(prev => ({ ...prev, isRetrying: true }));

    try {
      await retryFn();
      // Success - reset error state
      setState({
        error: null,
        attemptCount: 0,
        isRetrying: false,
        fallbackMode: false,
        lastAttempt: null,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isRetrying: false }));
      // Don't increment attempt count for manual retries
      const errorDetails = ErrorHandlingService.categorizeError(error);
      setState(prev => ({ ...prev, error: errorDetails }));
    }
  }, [state.error, state.isRetrying]);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    setState({
      error: null,
      attemptCount: 0,
      isRetrying: false,
      fallbackMode: false,
      lastAttempt: null,
    });
  }, []);

  /**
   * Enable fallback mode manually
   */
  const enableFallbackMode = useCallback(() => {
    setState(prev => ({ ...prev, fallbackMode: true }));
    onFallback?.();
  }, [onFallback]);

  /**
   * Disable fallback mode
   */
  const disableFallbackMode = useCallback(() => {
    setState(prev => ({ ...prev, fallbackMode: false }));
  }, []);

  /**
   * Get time until next retry
   */
  const getTimeUntilNextRetry = useCallback((): number => {
    if (!state.error || !state.lastAttempt || !state.error.category.retryable) {
      return 0;
    }

    const delay = retryDelay || ErrorHandlingService.getRetryDelay(state.error, state.attemptCount);
    const elapsed = Date.now() - state.lastAttempt.getTime();
    return Math.max(0, delay - elapsed);
  }, [state.error, state.lastAttempt, state.attemptCount, retryDelay]);

  /**
   * Check if we can retry
   */
  const canRetry = useCallback((): boolean => {
    return !!(
      state.error?.category.retryable &&
      state.attemptCount < maxRetries &&
      !state.isRetrying
    );
  }, [state.error, state.attemptCount, maxRetries, state.isRetrying]);

  /**
   * Get retry progress (0-1)
   */
  const getRetryProgress = useCallback((): number => {
    return state.attemptCount / maxRetries;
  }, [state.attemptCount, maxRetries]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((context?: Record<string, any>): string => {
    if (!state.error) return '';
    return ErrorHandlingService.getContextualErrorMessage(state.error, context || {});
  }, [state.error]);

  /**
   * Check if error should show to user
   */
  const shouldShowError = useCallback((): boolean => {
    return !!(state.error?.category.userFacing && !state.isRetrying);
  }, [state.error, state.isRetrying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    error: state.error,
    isRetrying: state.isRetrying,
    fallbackMode: state.fallbackMode,
    attemptCount: state.attemptCount,
    lastAttempt: state.lastAttempt,

    // Actions
    handleError,
    retry,
    clearError,
    enableFallbackMode,
    disableFallbackMode,

    // Computed values
    canRetry: canRetry(),
    retryProgress: getRetryProgress(),
    timeUntilNextRetry: getTimeUntilNextRetry(),
    shouldShowError: shouldShowError(),
    
    // Helpers
    getErrorMessage,
  };
}

export default useProgressiveErrorHandling;