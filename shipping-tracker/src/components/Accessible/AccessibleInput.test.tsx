import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AccessibleInput from './AccessibleInput';

describe('AccessibleInput', () => {
  it('renders input with label', () => {
    render(<AccessibleInput label="Test Input" />);
    
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
    expect(screen.getByText('Test Input')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<AccessibleInput label="Required Field" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText(/Required Field/)).toHaveAttribute('aria-required', 'true');
  });

  it('displays error message', () => {
    render(<AccessibleInput label="Test Input" error="This field is required" />);
    
    const input = screen.getByLabelText('Test Input');
    const errorMessage = screen.getByText('This field is required');
    
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('displays helper text', () => {
    render(<AccessibleInput label="Test Input" helperText="This is helpful" />);
    
    expect(screen.getByText('This is helpful')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<AccessibleInput label="Hidden Label" showLabel={false} />);
    
    const label = screen.getByText('Hidden Label');
    expect(label).toHaveClass('sr-only');
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;
    
    render(
      <AccessibleInput 
        label="Test Input" 
        leftIcon={leftIcon} 
        rightIcon={rightIcon} 
      />
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies correct ARIA attributes', () => {
    render(
      <AccessibleInput 
        label="Test Input" 
        error="Error message"
        helperText="Helper text"
        ariaDescribedBy="custom-description"
      />
    );
    
    const input = screen.getByLabelText('Test Input');
    const describedBy = input.getAttribute('aria-describedby');
    
    expect(describedBy).toContain('custom-description');
    expect(describedBy).toContain('error');
    expect(describedBy).toContain('helper');
  });
});