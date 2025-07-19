import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NetworkStatus from './NetworkStatus';

// Mock the useNetworkStatus hook
vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

describe('NetworkStatus', () => {
  const mockUseNetworkStatus = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    const { useNetworkStatus } = require('../../hooks/useNetworkStatus');
    useNetworkStatus.mockImplementation(mockUseNetworkStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when online and showWhenOnline is false', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });
    
    const { container } = render(<NetworkStatus />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when online and showWhenOnline is true', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });
    
    render(<NetworkStatus showWhenOnline={true} />);
    
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render offline status when offline', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    render(<NetworkStatus />);
    
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show reconnected message when back online after being offline', async () => {
    // Start with reconnected state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });
    
    render(<NetworkStatus />);
    
    expect(screen.getByText('Back online')).toBeInTheDocument();
    
    // Wait for the message to disappear after timeout
    await waitFor(() => {
      expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('should apply custom className', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    const { container } = render(<NetworkStatus className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    render(<NetworkStatus />);
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should render with correct positioning classes', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    const { container } = render(<NetworkStatus />);
    
    expect(container.firstChild).toHaveClass(
      'fixed',
      'top-4',
      'left-1/2',
      'transform',
      '-translate-x-1/2',
      'z-50'
    );
  });

  it('should show appropriate colors for different states', () => {
    // Test offline state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    const { rerender } = render(<NetworkStatus />);
    
    expect(screen.getByText("You're offline").closest('div')).toHaveClass('bg-red-600');
    
    // Test online state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: false,
    });
    
    rerender(<NetworkStatus showWhenOnline={true} />);
    
    expect(screen.getByText('Online').closest('div')).toHaveClass('bg-green-600');
    
    // Test reconnected state
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });
    
    rerender(<NetworkStatus />);
    
    expect(screen.getByText('Back online').closest('div')).toHaveClass('bg-green-600');
  });

  it('should handle rapid network state changes', async () => {
    // Start offline
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      isOffline: true,
      wasOffline: false,
    });
    
    const { rerender } = render(<NetworkStatus />);
    
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    
    // Go online (should show reconnected)
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      wasOffline: true,
    });
    
    rerender(<NetworkStatus />);
    
    expect(screen.getByText('Back online')).toBeInTheDocument();
    
    // Should hide after timeout
    await waitFor(() => {
      expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    }, { timeout: 4000 });
  });
});