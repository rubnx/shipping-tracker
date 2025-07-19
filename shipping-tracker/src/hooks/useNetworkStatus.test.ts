import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

// Mock the error handling utilities
vi.mock('../utils/errorHandling', () => ({
  isOnline: vi.fn(),
  onNetworkStatusChange: vi.fn(),
}));

describe('useNetworkStatus', () => {
  const mockOnNetworkStatusChange = vi.fn();
  const mockIsOnline = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    const { isOnline, onNetworkStatusChange } = require('../utils/errorHandling');
    isOnline.mockImplementation(mockIsOnline);
    onNetworkStatusChange.mockImplementation(mockOnNetworkStatusChange);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with current online status', () => {
    mockIsOnline.mockReturnValue(true);
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should initialize with offline status', () => {
    mockIsOnline.mockReturnValue(false);
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should set up network status change listener', () => {
    const mockCleanup = vi.fn();
    mockOnNetworkStatusChange.mockReturnValue(mockCleanup);
    mockIsOnline.mockReturnValue(true);
    
    const { unmount } = renderHook(() => useNetworkStatus());
    
    expect(mockOnNetworkStatusChange).toHaveBeenCalledWith(expect.any(Function));
    
    unmount();
    
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should update status when network changes to offline', () => {
    mockIsOnline.mockReturnValue(true);
    let networkCallback: (online: boolean) => void;
    mockOnNetworkStatusChange.mockImplementation((callback) => {
      networkCallback = callback;
      return vi.fn();
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    
    act(() => {
      networkCallback(false);
    });
    
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('should update status when network changes to online', () => {
    mockIsOnline.mockReturnValue(false);
    let networkCallback: (online: boolean) => void;
    mockOnNetworkStatusChange.mockImplementation((callback) => {
      networkCallback = callback;
      return vi.fn();
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
    
    act(() => {
      networkCallback(true);
    });
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('should track wasOffline state correctly', () => {
    mockIsOnline.mockReturnValue(true);
    let networkCallback: (online: boolean) => void;
    mockOnNetworkStatusChange.mockImplementation((callback) => {
      networkCallback = callback;
      return vi.fn();
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    // Start online
    expect(result.current.wasOffline).toBe(false);
    
    // Go offline
    act(() => {
      networkCallback(false);
    });
    
    expect(result.current.wasOffline).toBe(true);
    
    // Come back online
    act(() => {
      networkCallback(true);
    });
    
    // wasOffline should remain true
    expect(result.current.wasOffline).toBe(true);
  });
});