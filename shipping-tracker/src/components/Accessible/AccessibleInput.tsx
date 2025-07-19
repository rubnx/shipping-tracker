import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showLabel?: boolean;
  required?: boolean;
  ariaDescribedBy?: string;
}

const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  showLabel = true,
  required = false,
  ariaDescribedBy,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  
  const describedBy = [
    ariaDescribedBy,
    errorId,
    helperId
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'block w-full rounded-md border-gray-300 shadow-sm',
    'focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500',
    'text-base', // Prevents zoom on iOS
    leftIcon ? 'pl-10' : 'pl-3',
    rightIcon ? 'pr-10' : 'pr-3',
    'py-2',
    error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-1">
      {/* Label */}
      <label
        htmlFor={inputId}
        className={`block text-sm font-medium text-gray-700 ${
          showLabel ? '' : 'sr-only'
        }`}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400" aria-hidden="true">
              {leftIcon}
            </span>
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400" aria-hidden="true">
              {rightIcon}
            </span>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-gray-600">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      )}
    </div>
  );
});

AccessibleInput.displayName = 'AccessibleInput';

export default AccessibleInput;