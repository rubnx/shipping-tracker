import { useState, useEffect, useCallback, useRef } from 'react';

export interface APIProvider {
  name: string;
  tier: 'free' | 'freemium' | 'premium';
  status: 'pending' | 'active' | 'completed' | 'failed';
  responseTime?: number;
  error?: string;
  description: string;
  estimatedTime: number;
}

export interface LoadingState {
  isLoading: boolean;
  elapsedTime: number;
  currentStep: string;
  providers: APIProvider[];
  phase: 'initial' | 'intermediate' | 'warning' | 'timeout' | 'critical';
  progress: number;
  error?: string;
  hasTimedOut: boolean;
  canRetry: boolean;
  canCancel: boolean;
  showFallbackOptions: boolean;
}

export interface UseEnhancedLoadingOptions {
  timeoutMs?: number;
  warningThresholdMs?: number;
  providers?: APIProvider[];
  trackingNumber?: string;
  onTimeout?: () => void;
  onWarning?: () => void;
  onProviderChange?: (provider: APIProvider) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced loading hook that provides comprehensive loading state management
 * with progressive feedback, timeout handling, and provider tracking
 * Implements Requirements 5.1, 5.2 for enhanced loading states and user feedback
 */
export function useEnhancedLoading(options: UseEnhancedLoadingOptions = {}) {
  const {
    timeoutMs = 30000,
    warningThresholdMs = 20000,
    providers: initialProviders = [],
    trackingNumber,
    onTimeout,
    onWarning,
    onProviderChange,
    onComplete,
    onError,
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    elapsedTime: 0,
    currentStep: '',
    providers: initialProviders,
    phase: 'initial',
    progress: 0,
    hasTimedOut: false,
    canRetry: true,
    canCancel: true,
    showFallbackOptions: false,
  });

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarningFiredRef = useRef(false);

  /**
   * Start the loading process
   */
  const startLoading = useCallback((step: string = 'Starting...', providers?: APIProvider[]) => {
    startTimeRef.current = Date.now();
    hasWarningFiredRef.current = false;

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      elapsedTime: 0,
      currentStep: step,
      providers: providers || prev.providers,
      phase: 'initial',
      progress: 0,
      error: undefined,
      hasTimedOut: false,
      canRetry: true,
      canCancel: true,
      showFallbackOptions: false,
    }));

    // Start elapsed time tracking
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        
        setLoadingState(prev => {
          const newPhase = getLoadingPhase(elapsed, timeoutMs, warningThresholdMs, prev.error);
          const newProgress = calculateProgress(elapsed, timeoutMs, prev.providers);
          
          return {
            ...prev,
            elapsedTime: elapsed,
            phase: newPhase,
            progress: newProgress,
            showFallbackOptions: elapsed > warningThresholdMs,
          };
        });
      }
    }, 100);

    // Set up warning timeout
    warningRef.current = setTimeout(() => {
      if (!hasWarningFiredRef.current) {
        hasWarningFiredRef.current = true;
        onWarning?.();
      }
    }, warningThresholdMs);

    // Set up main timeout
    timeoutRef.current = setTimeout(() => {
      setLoadingState(prev => ({
        ...prev,
        hasTimedOut: true,
        phase: 'timeout',
        showFallbackOptions: true,
      }));
      onTimeout?.();
    }, timeoutMs);
  }, [timeoutMs, warningThresholdMs, onTimeout, onWarning]);

  /**
   * Stop the loading process
   */
  const stopLoading = useCallback((error?: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      phase: error ? 'critical' : 'initial',
      error,
      progress: error ? prev.progress : 100,
    }));

    if (error) {
      onError?.(error);
    } else {
      onComplete?.();
    }

    startTimeRef.current = null;
  }, [onComplete, onError]);

  /**
   * Update current step
   */
  const updateStep = useCallback((step: string) => {
    setLoadingState(prev => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  /**
   * Update provider status
   */
  const updateProvider = useCallback((providerName: string, updates: Partial<APIProvider>) => {
    setLoadingState(prev => {
      const updatedProviders = prev.providers.map(provider => {
        if (provider.name === providerName) {
          const updatedProvider = { ...provider, ...updates };
          
          // Notify about provider changes
          if (updates.status === 'active') {
            onProviderChange?.(updatedProvider);
          }
          
          return updatedProvider;
        }
        return provider;
      });

      const newProgress = calculateProgress(prev.elapsedTime, timeoutMs, updatedProviders);

      return {
        ...prev,
        providers: updatedProviders,
        progress: newProgress,
      };
    });
  }, [timeoutMs, onProviderChange]);

  /**
   * Add a new provider
   */
  const addProvider = useCallback((provider: APIProvider) => {
    setLoadingState(prev => ({
      ...prev,
      providers: [...prev.providers, provider],
    }));
  }, []);

  /**
   * Reset loading state
   */
  const reset = useCallback(() => {
    stopLoading();
    setLoadingState({
      isLoading: false,
      elapsedTime: 0,
      currentStep: '',
      providers: initialProviders,
      phase: 'initial',
      progress: 0,
      hasTimedOut: false,
      canRetry: true,
      canCancel: true,
      showFallbackOptions: false,
    });
  }, [stopLoading, initialProviders]);

  /**
   * Retry the loading process
   */
  const retry = useCallback(() => {
    reset();
    startLoading('Retrying...', loadingState.providers.map(p => ({ ...p, status: 'pending', error: undefined })));
  }, [reset, startLoading, loadingState.providers]);

  /**
   * Get current active provider
   */
  const getCurrentProvider = useCallback(() => {
    return loadingState.providers.find(p => p.status === 'active');
  }, [loadingState.providers]);

  /**
   * Get loading statistics
   */
  const getStats = useCallback(() => {
    const { providers } = loadingState;
    const completed = providers.filter(p => p.status === 'completed').length;
    const failed = providers.filter(p => p.status === 'failed').length;
    const active = providers.filter(p => p.status === 'active').length;
    const pending = providers.filter(p => p.status === 'pending').length;

    return {
      total: providers.length,
      completed,
      failed,
      active,
      pending,
      successRate: providers.length > 0 ? (completed / providers.length) * 100 : 0,
    };
  }, [loadingState.providers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, []);

  return {
    loadingState,
    startLoading,
    stopLoading,
    updateStep,
    updateProvider,
    addProvider,
    reset,
    retry,
    getCurrentProvider,
    getStats,
    
    // Convenience getters
    isLoading: loadingState.isLoading,
    elapsedTime: loadingState.elapsedTime,
    currentStep: loadingState.currentStep,
    providers: loadingState.providers,
    phase: loadingState.phase,
    progress: loadingState.progress,
    error: loadingState.error,
    hasTimedOut: loadingState.hasTimedOut,
    canRetry: loadingState.canRetry,
    canCancel: loadingState.canCancel,
    showFallbackOptions: loadingState.showFallbackOptions,
  };
}

/**
 * Determine loading phase based on elapsed time and conditions
 */
function getLoadingPhase(
  elapsedTime: number,
  timeoutMs: number,
  warningThresholdMs: number,
  error?: string
): LoadingState['phase'] {
  if (error) return 'critical';
  if (elapsedTime >= timeoutMs) return 'timeout';
  if (elapsedTime >= warningThresholdMs) return 'warning';
  if (elapsedTime > 10000) return 'intermediate';
  return 'initial';
}

/**
 * Calculate overall progress based on elapsed time and provider status
 */
function calculateProgress(
  elapsedTime: number,
  timeoutMs: number,
  providers: APIProvider[]
): number {
  if (providers.length === 0) {
    // Time-based progress when no providers
    return Math.min((elapsedTime / timeoutMs) * 100, 95);
  }

  // Provider-based progress
  const completed = providers.filter(p => p.status === 'completed' || p.status === 'failed').length;
  const active = providers.filter(p => p.status === 'active').length;
  
  const providerProgress = ((completed + active * 0.5) / providers.length) * 80;
  const timeProgress = Math.min((elapsedTime / timeoutMs) * 20, 20);
  
  return Math.min(providerProgress + timeProgress, 95);
}

export default useEnhancedLoading;