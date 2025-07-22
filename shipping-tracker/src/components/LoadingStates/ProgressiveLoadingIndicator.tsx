import { useState, useEffect } from 'react';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
  estimatedDuration?: number; // in milliseconds
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
}

interface ProgressiveLoadingIndicatorProps {
  steps: Omit<LoadingStep, 'status' | 'startTime' | 'endTime'>[];
  currentStep?: string;
  isLoading: boolean;
  error?: string;
  onTimeout?: () => void;
  timeoutMs?: number;
  className?: string;
  showProgress?: boolean;
  showEstimatedTime?: boolean;
}

export function ProgressiveLoadingIndicator({
  steps: initialSteps,
  currentStep,
  isLoading,
  error,
  onTimeout,
  timeoutMs = 30000, // 30 seconds default timeout
  className = '',
  showProgress = true,
  showEstimatedTime = true,
}: ProgressiveLoadingIndicatorProps) {
  const [steps, setSteps] = useState<LoadingStep[]>(() =>
    initialSteps.map(step => ({ ...step, status: 'pending' }))
  );
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update steps based on current step
  useEffect(() => {
    if (!isLoading) {
      if (error) {
        // Mark current step as failed
        setSteps(prev => prev.map(step => {
          if (step.id === currentStep) {
            return { ...step, status: 'failed', endTime: new Date() };
          }
          return step;
        }));
      } else {
        // Mark all steps as completed
        setSteps(prev => prev.map(step => ({ ...step, status: 'completed', endTime: new Date() })));
      }
      return;
    }

    setSteps(prev => prev.map(step => {
      if (step.id === currentStep) {
        return { 
          ...step, 
          status: 'active', 
          startTime: step.startTime || new Date() 
        };
      } else if (prev.find(s => s.id === currentStep && s.status === 'active')) {
        // If we have an active step, mark previous steps as completed
        const currentIndex = prev.findIndex(s => s.id === currentStep);
        const stepIndex = prev.findIndex(s => s.id === step.id);
        if (stepIndex < currentIndex) {
          return { ...step, status: 'completed', endTime: step.endTime || new Date() };
        }
      }
      return step;
    }));
  }, [currentStep, isLoading, error]);

  // Track elapsed time
  useEffect(() => {
    if (isLoading && !startTime) {
      setStartTime(new Date());
    }

    if (!isLoading) {
      setStartTime(null);
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      if (startTime) {
        setElapsedTime(Date.now() - startTime.getTime());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  // Handle timeout
  useEffect(() => {
    if (!isLoading || !onTimeout) return;

    const timeout = setTimeout(() => {
      onTimeout();
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [isLoading, onTimeout, timeoutMs]);

  const getStepIcon = (step: LoadingStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getStepDuration = (step: LoadingStep): number => {
    if (step.startTime && step.endTime) {
      return step.endTime.getTime() - step.startTime.getTime();
    }
    if (step.startTime && step.status === 'active') {
      return Date.now() - step.startTime.getTime();
    }
    return 0;
  };

  const getTotalProgress = (): number => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const activeSteps = steps.filter(step => step.status === 'active').length;
    return ((completedSteps + activeSteps * 0.5) / steps.length) * 100;
  };

  const getEstimatedTimeRemaining = (): number => {
    const totalEstimated = steps.reduce((sum, step) => sum + (step.estimatedDuration || 2000), 0);
    const progress = getTotalProgress() / 100;
    return Math.max(0, totalEstimated * (1 - progress));
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  if (!isLoading && !error) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {error ? 'Loading Failed' : 'Loading Tracking Information'}
        </h3>
        {showEstimatedTime && isLoading && (
          <div className="text-sm text-gray-500">
            {elapsedTime > 0 && `${formatTime(elapsedTime)} elapsed`}
            {getEstimatedTimeRemaining() > 0 && ` • ~${formatTime(getEstimatedTimeRemaining())} remaining`}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(getTotalProgress())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                error ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getTotalProgress()}%` }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            {/* Step Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step)}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  step.status === 'completed' ? 'text-green-700' :
                  step.status === 'active' ? 'text-blue-700' :
                  step.status === 'failed' ? 'text-red-700' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </p>
                
                {step.status === 'active' && step.startTime && (
                  <span className="text-xs text-gray-500">
                    {formatTime(getStepDuration(step))}
                  </span>
                )}
                
                {step.status === 'completed' && (
                  <span className="text-xs text-green-600">
                    ✓ {formatTime(getStepDuration(step))}
                  </span>
                )}
              </div>
              
              {step.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {step.description}
                </p>
              )}

              {/* Active step additional info */}
              {step.status === 'active' && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span>Processing...</span>
                    {step.estimatedDuration && (
                      <span>
                        (usually takes ~{formatTime(step.estimatedDuration)})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Timeout Warning */}
      {isLoading && elapsedTime > timeoutMs * 0.8 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-yellow-700">
              This is taking longer than usual. The request may timeout soon.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}