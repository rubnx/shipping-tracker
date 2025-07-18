import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-blue-600',
  className = '',
  message,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-4',
  };

  const spinnerClass = `animate-spin ${sizeClasses[size]} border-current border-t-transparent rounded-full ${color} ${className}`;

  if (message) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className={spinnerClass} aria-hidden="true" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    );
  }

  return <div className={spinnerClass} aria-hidden="true" />;
};

export default LoadingSpinner;