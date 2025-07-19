import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAppError,
  parseHttpError,
  retryWithBackoff,
  isOnline,
  onNetworkStatusChange,
  logError,
  withTimeout,
  ErrorCodes,
} from './errorHandling';

describe('errorHandling', () => {
  describe('createAppError', () => {
    it('should create an app error with correct properties', () => {
      const error = createAppError(
        ErrorCodes.NETWORK_ERROR,
        'Network failed',
        { details: 'test' },
        true
      );

      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.message).toBe('Network failed');
      expect(error.details).toEqual({ details: 'test' });
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toBe('Network connection failed. Please check your internet connection and try again.');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should set retryable to false by default', () => {
      const error = createAppError(ErrorCodes.VALIDATION_ERROR, 'Validation failed');
      expect(error.retryable).toBe(false);
    });
  });

  describe('parseHttpError', () => {
    beforeEach(() => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle offline errors', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const error = parseHttpError(new Error('Network error'));
      
      expect(error.code).toBe(ErrorCodes.OFFLINE_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should handle abort errors', () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      const error = parseHttpError(abortError);
      
      expect(error.code).toBe(ErrorCodes.TIMEOUT_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network error');
      const error = parseHttpError(networkError);
      
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
    });

    it('should handle HTTP 400 errors', () => {
      const httpError = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        }
      };
      const error = parseHttpError(httpError);
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.retryable).toBe(false);
    });

    it('should handle HTTP 404 errors', () => {
      const httpError = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };
      const error = parseHttpError(httpError);
      
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      expect(error.retryable).toBe(false);
    });

    it('should handle HTTP 429 errors', () => {
      const httpError = {
        response: {
          status: 429,
          data: { message: 'Rate limited' }
        }
      };
      const error = parseHttpError(httpError);
      
      expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
      expect(error.retryable).toBe(true);
    });

    it('should handle HTTP 500 errors', () => {
      const httpError = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      };
      const error = parseHttpError(httpError);
      
      expect(error.code).toBe(ErrorCodes.SERVER_ERROR);
      expect(error.retryable).toBe(true);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn, 3, 100);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockFn, 3, 10);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Non-retryable') as any;
      nonRetryableError.retryable = false;
      const mockFn = vi.fn().mockRejectedValue(nonRetryableError);
      
      await expect(retryWithBackoff(mockFn, 3, 10)).rejects.toThrow('Non-retryable');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      expect(isOnline()).toBe(true);
      
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      expect(isOnline()).toBe(false);
    });
  });

  describe('onNetworkStatusChange', () => {
    it('should register event listeners and return cleanup function', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const callback = vi.fn();
      
      const cleanup = onNetworkStatusChange(callback);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      
      cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = createAppError(ErrorCodes.NETWORK_ERROR, 'Test error');
      logError(error, 'test context');
      
      expect(console.error).toHaveBeenCalledWith('[Error Log]', expect.objectContaining({
        timestamp: expect.any(String),
        context: 'test context',
        error: error,
        userAgent: expect.any(String),
        url: expect.any(String),
      }));
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle regular Error objects', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      logError(error);
      
      expect(console.error).toHaveBeenCalledWith('[Error Log]', expect.objectContaining({
        error: {
          name: 'Error',
          message: 'Test error',
          stack: expect.any(String),
        }
      }));
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('success');
    });

    it('should reject if promise takes longer than timeout', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100)).rejects.toThrow('Operation timed out after 100ms');
    });

    it('should reject if original promise rejects', async () => {
      const promise = Promise.reject(new Error('Original error'));
      
      await expect(withTimeout(promise, 1000)).rejects.toThrow('Original error');
    });
  });
});