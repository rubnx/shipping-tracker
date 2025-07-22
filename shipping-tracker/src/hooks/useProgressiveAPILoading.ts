import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadingWithFeedback, LoadingStepPresets } from './useLoadingWithFeedback';

interface APIProvider {
  name: string;
  tier: 'free' | 'freemium' | 'premium';
  estimatedResponseTime: number;
  description: string;
}

interface APILoadingStep {
  id: string;
  label: string;
  description: string;
  estimatedDuration: number;
  provider?: APIProvider;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
}

interface UseProgressiveAPILoadingOptions {
  trackingNumber: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onTimeout?: () => void;
  timeoutMs?: number;
  enableFallback?: boolean;
}

/**
 * Hook for progressive API loading with detailed feedback about which APIs are being tried
 * Implements Requirements 5.1, 5.2 for enhanced loading states with API-specific feedback
 */
export function useProgressiveAPILoading(options: UseProgressiveAPILoadingOptions) {
  const {
    trackingNumber,
    onSuccess,
    onError,
    onTimeout,
    timeoutMs = 30000,
    enableFallback = true,
  } = options;

  // API providers in order of preference (free -> premium)
  const apiProviders: APIProvider[] = [
    {
      name: 'Track-Trace',
      tier: 'free',
      estimatedResponseTime: 3000,
      description: 'Free tier API - checking basic tracking info',
    },
    {
      name: 'ShipsGo',
      tier: 'freemium',
      estimatedResponseTime: 2500,
      description: 'Enhanced tracking with vessel information',
    },
    {
      name: 'SeaRates',
      tier: 'freemium',
      estimatedResponseTime: 2000,
      description: 'Comprehensive shipping data and rates',
    },
    {
      name: 'Project44',
      tier: 'premium',
      estimatedResponseTime: 1500,
      description: 'Enterprise-grade logistics platform',
    },
  ];

  const [apiSteps, setApiSteps] = useState<APILoadingStep[]>([]);
  const [currentProvider, setCurrentProvider] = useState<APIProvider | null>(null);
  const [attemptedProviders, setAttemptedProviders] = useState<string[]>([]);
  const [fallbackMessage, setFallbackMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController>();
  const retryCountRef = useRef<number>(0);

  // Create dynamic loading steps based on tracking number format
  const createLoadingSteps = useCallback(() => {
    const baseSteps = [
      {
        id: 'validate',
        label: 'Validating tracking number',
        description: `Analyzing format for: ${trackingNumber}`,
        estimatedDuration: 500,
        status: 'pending' as const,
      },
      {
        id: 'detect-carrier',
        label: 'Detecting carrier',
        description: 'Identifying the shipping company',
        estimatedDuration: 800,
        status: 'pending' as const,
      },
    ];

    // Add API provider steps
    const apiSteps = apiProviders.map((provider, index) => ({
      id: `api-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      label: `Trying ${provider.name}`,
      description: provider.description,
      estimatedDuration: provider.estimatedResponseTime,
      provider,
      status: 'pending' as const,
    }));

    const finalSteps = [
      {
        id: 'process-results',
        label: 'Processing results',
        description: 'Organizing tracking information',
        estimatedDuration: 1000,
        status: 'pending' as const,
      },
    ];

    return [...baseSteps, ...apiSteps, ...finalSteps];
  }, [trackingNumber]);

  // Initialize loading steps
  useEffect(() => {
    setApiSteps(createLoadingSteps());
  }, [createLoadingSteps]);

  const loadingHook = useLoadingWithFeedback({
    steps: apiSteps.map(step => ({
      id: step.id,
      label: step.label,
      description: step.description,
      estimatedDuration: step.estimatedDuration,
      provider: step.provider?.name,
    })),
    onTimeout: () => {
      handleTimeout();
      onTimeout?.();
    },
    timeoutMs,
    enableProgressiveMessages: true,
  });

  /**
   * Start the progressive API loading process
   */
  const startAPILoading = useCallback(async () => {
    retryCountRef.current = 0;
    setAttemptedProviders([]);
    setFallbackMessage('');
    
    loadingHook.startLoading();
    
    try {
      // Step 1: Validate tracking number
      loadingHook.setCurrentStep('validate');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!trackingNumber || trackingNumber.length < 3) {
        throw new Error('Invalid tracking number format');
      }

      // Step 2: Detect carrier
      loadingHook.setCurrentStep('detect-carrier');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const detectedCarrier = detectCarrier(trackingNumber);
      loadingHook.updateStepDescription('detect-carrier', 
        detectedCarrier ? `Detected carrier: ${detectedCarrier}` : 'Carrier detection completed'
      );

      // Step 3: Try APIs in order
      await tryAPIsSequentially();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      loadingHook.failLoading(errorMessage);
      onError?.(errorMessage);
    }
  }, [trackingNumber, loadingHook, onError]);

  /**
   * Try APIs sequentially with fallback
   */
  const tryAPIsSequentially = useCallback(async () => {
    for (const provider of apiProviders) {
      if (attemptedProviders.includes(provider.name)) continue;

      try {
        setCurrentProvider(provider);
        const stepId = `api-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        loadingHook.setCurrentStep(stepId, `Contacting ${provider.name}...`);
        
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();
        
        // Update step with provider-specific message
        updateStepWithProviderInfo(stepId, provider, 'active');
        
        const result = await callAPI(provider, abortControllerRef.current.signal);
        
        if (result) {
          // Success! Mark step as completed
          updateStepWithProviderInfo(stepId, provider, 'completed');
          
          // Process results
          loadingHook.setCurrentStep('process-results');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          loadingHook.completeLoading();
          onSuccess?.(result);
          return;
        }
        
      } catch (error) {
        const stepId = `api-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        updateStepWithProviderInfo(stepId, provider, 'failed');
        
        setAttemptedProviders(prev => [...prev, provider.name]);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }
        
        // Continue to next provider
        const errorMsg = error instanceof Error ? error.message : 'API call failed';
        loadingHook.updateStepDescription(stepId, `${provider.name} failed: ${errorMsg}`);
        
        // Add fallback message
        if (enableFallback) {
          const remainingProviders = apiProviders.filter(p => 
            !attemptedProviders.includes(p.name) && p.name !== provider.name
          );
          
          if (remainingProviders.length > 0) {
            setFallbackMessage(`Trying ${remainingProviders[0].name} as fallback...`);
          }
        }
      }
    }
    
    // If we get here, all APIs failed
    throw new Error('All API providers failed. Please try again later.');
  }, [attemptedProviders, loadingHook, onSuccess, enableFallback]);

  /**
   * Update step with provider-specific information
   */
  const updateStepWithProviderInfo = useCallback((
    stepId: string, 
    provider: APIProvider, 
    status: 'active' | 'completed' | 'failed'
  ) => {
    setApiSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        let description = step.description;
        
        switch (status) {
          case 'active':
            description = `${provider.description} (${provider.tier} tier)`;
            break;
          case 'completed':
            description = `✓ Successfully retrieved data from ${provider.name}`;
            break;
          case 'failed':
            description = `✗ ${provider.name} unavailable, trying next provider...`;
            break;
        }
        
        return { ...step, status, description };
      }
      return step;
    }));
  }, []);

  /**
   * Detect carrier from tracking number format
   */
  const detectCarrier = useCallback((trackingNumber: string): string | null => {
    // Simple carrier detection logic
    const upperTracking = trackingNumber.toUpperCase();
    
    if (/^[A-Z]{4}[0-9]{7}$/.test(upperTracking)) {
      return 'Container Number';
    }
    if (/^[0-9]{11}$/.test(upperTracking)) {
      return 'Bill of Lading';
    }
    if (/^[A-Z]{3}[0-9]{8}$/.test(upperTracking)) {
      return 'Booking Number';
    }
    
    return null;
  }, []);

  /**
   * Call API with timeout and abort signal
   */
  const callAPI = useCallback(async (
    provider: APIProvider, 
    signal: AbortSignal
  ): Promise<any> => {
    // Simulate API call with realistic timing
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!signal.aborted) {
          // Simulate different success rates for different providers
          const successRate = provider.tier === 'premium' ? 0.9 : 
                             provider.tier === 'freemium' ? 0.7 : 0.5;
          
          if (Math.random() < successRate) {
            resolve({
              trackingNumber,
              carrier: provider.name,
              status: 'In Transit',
              provider: provider.name,
              tier: provider.tier,
            });
          } else {
            reject(new Error(`${provider.name} API returned no data`));
          }
        }
      }, provider.estimatedResponseTime);

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Request aborted'));
      });
    });
  }, [trackingNumber]);

  /**
   * Handle timeout
   */
  const handleTimeout = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setFallbackMessage('Request timed out. You can try again or check back later.');
  }, []);

  /**
   * Cancel current loading
   */
  const cancelLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    loadingHook.resetLoading();
    setCurrentProvider(null);
    setAttemptedProviders([]);
    setFallbackMessage('');
  }, [loadingHook]);

  /**
   * Retry with different strategy
   */
  const retryWithFallback = useCallback(() => {
    retryCountRef.current += 1;
    
    if (retryCountRef.current <= 2) {
      // Reset and try again
      setAttemptedProviders([]);
      startAPILoading();
    } else {
      // Switch to demo mode or show offline message
      setFallbackMessage('Switching to demo mode with sample data...');
      
      setTimeout(() => {
        onSuccess?.({
          trackingNumber,
          carrier: 'Demo Carrier',
          status: 'Demo Mode',
          isDemoData: true,
        });
      }, 1500);
    }
  }, [startAPILoading, onSuccess, trackingNumber]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Loading state
    ...loadingHook,
    
    // API-specific state
    currentProvider,
    attemptedProviders,
    fallbackMessage,
    apiSteps,
    
    // Actions
    startAPILoading,
    cancelLoading,
    retryWithFallback,
    
    // Computed values
    totalProviders: apiProviders.length,
    remainingProviders: apiProviders.length - attemptedProviders.length,
    retryCount: retryCountRef.current,
  };
}

export default useProgressiveAPILoading;