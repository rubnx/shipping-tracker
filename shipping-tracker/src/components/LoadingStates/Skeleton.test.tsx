import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  it('renders with default props', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-200', 'animate-pulse', 'rounded');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '50px',
    });
  });

  it('applies numeric width and height', () => {
    const { container } = render(<Skeleton width={100} height={20} />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({
      width: '100px',
      height: '20px',
    });
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('disables animation when animate is false', () => {
    const { container } = render(<Skeleton animate={false} />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).not.toHaveClass('animate-pulse');
  });

  it('applies rounded-full class when rounded is true', () => {
    const { container } = render(<Skeleton rounded />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('rounded-full');
    expect(skeleton).not.toHaveClass('rounded');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});