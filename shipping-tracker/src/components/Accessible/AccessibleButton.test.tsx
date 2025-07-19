import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccessibleButton from './AccessibleButton';

// Mock the accessibility hooks
vi.mock('../../hooks', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

describe('AccessibleButton', () => {
  it('renders button with children', () => {
    render(<AccessibleButton>Click me</AccessibleButton>);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    render(<AccessibleButton variant="primary">Primary</AccessibleButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('applies correct size classes', () => {
    render(<AccessibleButton size="lg">Large</AccessibleButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('shows loading state correctly', () => {
    render(
      <AccessibleButton loading loadingText="Loading...">
        Submit
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<AccessibleButton onClick={handleClick}>Click me</AccessibleButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies ARIA attributes correctly', () => {
    render(
      <AccessibleButton
        ariaLabel="Custom label"
        ariaDescribedBy="description"
        ariaExpanded={true}
        ariaHaspopup="menu"
      >
        Menu
      </AccessibleButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;
    
    render(
      <AccessibleButton leftIcon={leftIcon} rightIcon={rightIcon}>
        With Icons
      </AccessibleButton>
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies full width when specified', () => {
    render(<AccessibleButton fullWidth>Full Width</AccessibleButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('is disabled when disabled prop is true', () => {
    render(<AccessibleButton disabled>Disabled</AccessibleButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});