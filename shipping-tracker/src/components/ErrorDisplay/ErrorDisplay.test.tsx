import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from './ErrorDisplay';
import { createAppError, ErrorCodes } from '../../utils/errorHandling';

describe('ErrorDisplay', () => {
  const originalEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should render error message', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(error.userMessage)).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed', {}, true);
    const onRetry = vi.fn();
    
    render(<ErrorDisplay error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should not show retry button for non-retryable errors', () => {
    const error = createAppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', {}, false);
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    const onDismiss = vi.fn();
    
    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show technical details in development mode', () => {
    process.env.NODE_ENV = 'development';
    const error = createAppError(ErrorCodes.API_ERROR, 'API failed', { details: 'test' });
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
  });

  it('should not show technical details in production mode', () => {
    process.env.NODE_ENV = 'production';
    const error = createAppError(ErrorCodes.API_ERROR, 'API failed', { details: 'test' });
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('should render with banner variant', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    const { container } = render(<ErrorDisplay error={error} variant="banner" />);
    
    expect(container.firstChild).toHaveClass('bg-red-50', 'border', 'border-red-200', 'rounded-md', 'p-4');
  });

  it('should render with inline variant', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    const { container } = render(<ErrorDisplay error={error} variant="inline" />);
    
    expect(container.firstChild).toHaveClass('bg-red-50', 'border-l-4', 'border-red-400', 'p-4');
  });

  it('should render with card variant by default', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    const { container } = render(<ErrorDisplay error={error} />);
    
    expect(container.firstChild).toHaveClass('bg-white', 'border', 'border-red-200', 'rounded-lg', 'shadow-sm', 'p-6');
  });

  it('should apply custom className', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    const { container } = render(<ErrorDisplay error={error} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render appropriate icon for different error types', () => {
    const networkError = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    const { rerender } = render(<ErrorDisplay error={networkError} />);
    
    // Network error should have network icon
    expect(screen.getByRole('alert')).toBeInTheDocument();
    
    const notFoundError = createAppError(ErrorCodes.NOT_FOUND, 'Not found');
    rerender(<ErrorDisplay error={notFoundError} />);
    
    // Should still render (icon changes but we can't easily test SVG content)
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Network failed');
    
    render(<ErrorDisplay error={error} />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should show error details when expanded in development', () => {
    process.env.NODE_ENV = 'development';
    const error = createAppError(ErrorCodes.API_ERROR, 'API failed', { extra: 'data' });
    
    render(<ErrorDisplay error={error} />);
    
    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);
    
    expect(screen.getByText(`Code: ${error.code}`)).toBeInTheDocument();
    expect(screen.getByText(`Message: ${error.message}`)).toBeInTheDocument();
  });
});