import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandling } from './useErrorHandling';
import { createAppError, ErrorCodes } from '../utils';

// Mock the error handling utilities
vi.mock('../utils', async () => {
  const actual = await vi.importActual('../utils');
  return {
    ...actual,
    logError: vi.fn(),
    parseHttpError: vi.fn(),
  };
});

describe('useErrorHandling', () => {
  const mockOnRetry = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with no error', () => {
    const { result } = renderHook(() => useErrorHandling());
    
    expect(result.current.error).toBeNull();
    expect(result.current.retry).toBeNull();
    expect(result.current.isRetryable).toBe(false);
  });

  it('should set and clear errors', () => {
    const { result } = renderHook(() => useErrorHandling());
    const appError = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error', {}, true);
    
    act(() => {
      result.current.setError(appError);
    });
    
    expect(result.current.error).toBe(appError);
    expect(result.current.isRetryable).toBe(true);
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
    expect(result.current.isRetryable).toBe(false);
  });

  it('should convert regular Error to AppError', () => {
    const { result } = renderHook(() => useErrorHandling());
    const regularError = new Error('Regular error');
    
    act(() => {
      result.current.setError(regularError);
    });
    
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    expect(result.current.error?.message).toBe('Regular error');
  });

  it('should handle null error', () => {
    const { result } = renderHook(() => useErrorHandling());
    const appError = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error');
    
    act(() => {
      result.current.setError(appError);
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      result.current.setError(null);
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should provide retry function for retryable errors', () => {
    const { result } = renderHook(() => useErrorHandling(mockOnRetry));
    const retryableError = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error', {}, true);
    
    act(() => {
      result.current.setError(retryableError);
    });
    
    expect(result.current.retry).toBe(mockOnRetry);
    expect(result.current.isRetryable).toBe(true);
  });

  it('should not provide retry function for non-retryable errors', () => {
    const { result } = renderHook(() => useErrorHandling(mockOnRetry));
    const nonRetryableError = createAppError(ErrorCodes.VALIDATION_ERROR, 'Test error', {}, false);
    
    act(() => {
      result.current.setError(nonRetryableError);
    });
    
    expect(result.current.retry).toBeNull();
    expect(result.current.isRetryable).toBe(false);
  });

  it('should handle errors with handleError method', async () => {
    const { parseHttpError } = await import('../utils');
    const mockAppError = createAppError(ErrorCodes.API_ERROR, 'API error');
    parseHttpError.mockReturnValue(mockAppError);
    
    const { result } = renderHook(() => useErrorHandling());
    const httpError = { response: { status: 500 } };
    
    act(() => {
      result.current.handleError(httpError, 'test context');
    });
    
    expect(parseHttpError).toHaveBeenCalledWith(httpError);
    expect(result.current.error).toBe(mockAppError);
  });

  it('should log errors when autoLog is enabled', async () => {
    const { logError } = await import('../utils');
    const { result } = renderHook(() => useErrorHandling(undefined, true));
    const appError = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error');
    
    act(() => {
      result.current.setError(appError);
    });
    
    expect(logError).toHaveBeenCalledWith(appError);
  });

  it('should not log errors when autoLog is disabled', async () => {
    const { logError } = await import('../utils');
    const { result } = renderHook(() => useErrorHandling(undefined, false));
    const appError = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error');
    
    act(() => {
      result.current.setError(appError);
    });
    
    expect(logError).not.toHaveBeenCalled();
  });

  it('should handle unknown errors in handleError', async () => {
    const { parseHttpError } = await import('../utils');
    parseHttpError.mockImplementation(() => {
      throw new Error('Parse failed');
    });
    
    const { result } = renderHook(() => useErrorHandling());
    const unknownError = { weird: 'object' };
    
    act(() => {
      result.current.handleError(unknownError);
    });
    
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe(ErrorCodes.UNKNOWN_ERROR);
  });
});