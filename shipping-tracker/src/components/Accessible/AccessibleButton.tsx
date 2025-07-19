import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../hooks';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaExpanded?: boolean;
  ariaHaspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Loading...',
  leftIcon,
  rightIcon,
  fullWidth = false,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaHaspopup,
  disabled,
  className = '',
  ...props
}, ref) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-md',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'transition-colors duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth ? 'w-full' : '',
    prefersReducedMotion ? '' : 'transform hover:scale-105 active:scale-95'
  ].filter(Boolean).join(' ');

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 border border-transparent',
    outline: 'bg-transparent text-blue-600 hover:bg-blue-50 focus:ring-blue-500 border border-blue-600',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500 border border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-6 py-3 text-base min-h-[44px]'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {!loading && leftIcon && (
        <span className="mr-2" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      <span>
        {loading ? loadingText : children}
      </span>
      
      {!loading && rightIcon && (
        <span className="ml-2" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;