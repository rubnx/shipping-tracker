import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'border-2', 'text-blue-600');
  });

  it('applies different sizes correctly', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-4', 'w-4', 'border-2');

    rerender(<LoadingSpinner size="lg" />);
    spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-8', 'w-8', 'border-3');

    rerender(<LoadingSpinner size="xl" />);
    spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('h-12', 'w-12', 'border-4');
  });

  it('applies custom color', () => {
    const { container } = render(<LoadingSpinner color="text-red-500" />);
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('text-red-500');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-spinner" />);
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('displays message when provided', () => {
    const { container } = render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toBeInTheDocument();
  });

  it('does not display message container when message is not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[aria-hidden="true"]');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });
});