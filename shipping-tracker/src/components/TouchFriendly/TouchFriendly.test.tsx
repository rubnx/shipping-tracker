import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TouchFriendly from './TouchFriendly';

// Mock the useIsTouchDevice hook
vi.mock('../../hooks', () => ({
  useIsTouchDevice: vi.fn(() => true),
}));

describe('TouchFriendly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', () => {
    render(
      <TouchFriendly>
        <div data-testid="child">Test Content</div>
      </TouchFriendly>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies touch-friendly class when touch device is detected', () => {
    const { container } = render(
      <TouchFriendly>
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('touch-friendly');
  });

  it('applies custom className', () => {
    const { container } = render(
      <TouchFriendly className="custom-class">
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('sets correct touch action style', () => {
    const { container } = render(
      <TouchFriendly>
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.touchAction).toBe('manipulation');
  });

  it('disables touch action when disabled', () => {
    const { container } = render(
      <TouchFriendly disabled>
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.touchAction).toBe('auto');
  });

  it('sets user-select none for touch devices', () => {
    const { container } = render(
      <TouchFriendly>
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ userSelect: 'none' });
  });

  it('handles missing callbacks gracefully', () => {
    expect(() => {
      render(
        <TouchFriendly>
          <div>Test Content</div>
        </TouchFriendly>
      );
    }).not.toThrow();
  });

  it('renders with default props', () => {
    const { container } = render(
      <TouchFriendly>
        <div>Test Content</div>
      </TouchFriendly>
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.tagName).toBe('DIV');
  });
});