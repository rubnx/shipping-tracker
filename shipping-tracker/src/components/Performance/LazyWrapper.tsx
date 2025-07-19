import React, { Suspense, type ReactNode } from 'react';
import { LoadingSpinner } from '../LoadingStates';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  minHeight?: number;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  className = '',
  minHeight = 200,
}) => {
  const defaultFallback = (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight }}
    >
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyWrapper;