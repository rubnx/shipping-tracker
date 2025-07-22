import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
  estimatedDuration?: number;
  provider?: string;
}

interface LoadingState {
  isLoading: boolean;
  currentStep: string | null;
  steps: LoadingStep[];
  startTime: Date | null;
  error: string | null;
  progress: number;
}

interface UseLoadingWithFeedbackOptions {
  steps: LoadingStep[];
  onTimeout?: () => void;
  timeoutMs?: number;
  enableProgressiveMessages?: boolean;
}

/**
 * Hook for managing loading states with detailed feedback
 * Implements Requirements 5.1, 5.2 for enhanced loading states
 */
export function useLoadingWithFeedback(options: UseLoadingWithFeedbackOptions) {
  const {
    steps: initialSteps,
    onTimeout,
    timeoutMs = 30000,
    enableProgressiveMessages = true,
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    currentStep: null,
    steps: initialSteps,
    startTime: null,
    error: null,
    progress: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const progressiveMessageRef = useRef<NodeJS.Timeout>();

  /**
   * Start loading with the first step
   */
  const startLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      currentStep: initialSteps[0]?.id || null,
      startTime: new Date(),
      error: null,
      progress: 0,
    }));

    // Set timeout
    if (onTimeout && timeoutMs > 0) {
      timeoutRef.current = setTimeout(() => {
        onTimeout();
        setState(prev => ({
          ...prev,
          error: 'Request timed out. Please try again.',
        }));
      }, timeoutMs);
    }
  }, [initialSteps, onTimeout, timeoutMs]);

  /**
   * Move to the next step
   */
  const nextStep = useCallback((stepId?: string) => {
    setState(prev => {
      const currentIndex = prev.steps.findIndex(step => step.id === prev.currentStep);
      const nextIndex = stepId 
        ? prev.steps.findIndex(step => step.id === stepId)
        : currentIndex + 1;
      
      const nextStep = prev.steps[nextIndex];
      const progress = ((nextIndex + 1) / prev.steps.length) * 100;

      return {
        ...prev,
        currentStep: nextStep?.id || null,
        progress: Math.min(progress, 100),
      };
    });
  }, []);

  /**
   * Set a specific step as current
   */
  const setCurrentStep = useCallback((stepId: string, customMessage?: string) => {
    setState(prev => {
      const stepIndex = prev.steps.findIndex(step => step.id === stepId);
      const progress = stepIndex >= 0 ? ((stepIndex + 1) / prev.steps.length) * 100 : prev.progress;

      // Update step with custom message if provided
      const updatedSteps = customMessage 
        ? prev.steps.map(step => 
            step.id === stepId 
              ? { ...step, description: customMessage }
              : step
          )
        : prev.steps;

      return {
        ...prev,
        currentStep: stepId,
        steps: updatedSteps,
        progress: Math.min(progress, 100),
      };
    });
  }, []);

  /**
   * Complete loading successfully
   */
  const completeLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressiveMessageRef.current) {
      clearTimeout(progressiveMessageRef.current);
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      currentStep: null,
      progress: 100,
    }));
  }, []);

  /**
   * Fail loading with error
   */
  const failLoading = useCallback((error: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressiveMessageRef.current) {
      clearTimeout(progressiveMessageRef.current);
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
    }));
  }, []);

  /**
   * Reset loading state
   */
  const resetLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (progressiveMessageRef.current) {
      clearTimeout(progressiveMessageRef.current);
    }

    setState({
      isLoading: false,
      currentStep: null,
      steps: initialSteps,
      startTime: null,
      error: null,
      progress: 0,
    });
  }, [initialSteps]);

  /**
   * Update step description dynamically
   */
  const updateStepDescription = useCallback((stepId: string, description: string) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, description } : step
      ),
    }));
  }, []);

  /**
   * Get current step details
   */
  const getCurrentStep = useCallback(() => {
    return state.steps.find(step => step.id === state.currentStep) || null;
  }, [state.steps, state.currentStep]);

  /**
   * Get elapsed time
   */
  const getElapsedTime = useCallback(() => {
    if (!state.startTime) return 0;
    return Date.now() - state.startTime.getTime();
  }, [state.startTime]);

  /**
   * Get estimated time remaining
   */
  const getEstimatedTimeRemaining = useCallback(() => {
    if (!state.isLoading || state.progress === 0) return 0;
    
    const elapsed = getElapsedTime();
    const estimatedTotal = elapsed / (state.progress / 100);
    return Math.max(0, estimatedTotal - elapsed);
  }, [state.isLoading, state.progress, getElapsedTime]);

  /**
   * Progressive message updates
   */
  useEffect(() => {
    if (!enableProgressiveMessages || !state.isLoading || !state.currentStep) return;

    const currentStep = getCurrentStep();
    if (!currentStep?.estimatedDuration) return;

    // Show progressive messages during long-running steps
    const showProgressiveMessage = () => {
      const messages = [
        'Still working on this...',
        'This is taking a bit longer than usual...',
        'Almost there, please wait...',
        'Processing your request...',
      ];

      const elapsed = getElapsedTime();
      const stepDuration = currentStep.estimatedDuration || 5000;
      
      if (elapsed > stepDuration * 1.5) {
        const messageIndex = Math.floor((elapsed - stepDuration * 1.5) / 3000) % messages.length;
        updateStepDescription(state.currentStep!, messages[messageIndex]);
      }
    };

    progressiveMessageRef.current = setInterval(showProgressiveMessage, 3000);

    return () => {
      if (progressiveMessageRef.current) {
        clearInterval(progressiveMessageRef.current);
      }
    };
  }, [state.isLoading, state.currentStep, enableProgressiveMessages, getCurrentStep, getElapsedTime, updateStepDescription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (progressiveMessageRef.current) {
        clearTimeout(progressiveMessageRef.current);
      }
    };
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    currentStep: state.currentStep,
    steps: state.steps,
    error: state.error,
    progress: state.progress,
    startTime: state.startTime,

    // Actions
    startLoading,
    nextStep,
    setCurrentStep,
    completeLoading,
    failLoading,
    resetLoading,
    updateStepDescription,

    // Computed values
    currentStepDetails: getCurrentStep(),
    elapsedTime: getElapsedTime(),
    estimatedTimeRemaining: getEstimatedTimeRemaining(),
  };
}

/**
 * Predefined step configurations for common operations
 */
export const LoadingStepPresets = {
  trackingSearch: [
    {
      id: 'validate',
      label: 'Validating tracking number',
      description: 'Checking format and carrier detection',
      estimatedDuration: 500,
    },
    {
      id: 'api-selection',
      label: 'Selecting API providers',
      description: 'Choosing the best APIs for your tracking number',
      estimatedDuration: 1000,
    },
    {
      id: 'api-call',
      label: 'Fetching tracking data',
      description: 'Contacting shipping providers',
      estimatedDuration: 5000,
    },
    {
      id: 'processing',
      label: 'Processing results',
      description: 'Organizing and validating tracking information',
      estimatedDuration: 1500,
    },
  ],

  apiHealthCheck: [
    {
      id: 'connectivity',
      label: 'Checking connectivity',
      description: 'Testing network connection',
      estimatedDuration: 1000,
    },
    {
      id: 'api-status',
      label: 'Checking API status',
      description: 'Verifying API provider availability',
      estimatedDuration: 3000,
    },
    {
      id: 'validation',
      label: 'Validating responses',
      description: 'Testing API response quality',
      estimatedDuration: 2000,
    },
  ],

  dataRefresh: [
    {
      id: 'cache-check',
      label: 'Checking cache',
      description: 'Looking for existing data',
      estimatedDuration: 500,
    },
    {
      id: 'refresh-call',
      label: 'Refreshing data',
      description: 'Getting latest tracking information',
      estimatedDuration: 4000,
    },
    {
      id: 'update-cache',
      label: 'Updating cache',
      description: 'Storing fresh data',
      estimatedDuration: 1000,
    },
  ],
};

export default useLoadingWithFeedback;