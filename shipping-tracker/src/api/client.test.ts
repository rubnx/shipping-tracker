import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIClient } from './client';
import { ErrorCodes } from '../utils/errorHandling';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the error handling utilities
vi.mock('../utils/errorHandling', async () => {
  const actual = await vi.importActual('../utils/errorHandling');
  return {
    ...actual,
    withTimeout: vi.fn((promise) => promise),
    parseHttpError: vi.fn(),
    retryWithBackoff: vi.fn(),
  };
});

// Mock the mock server
vi.mock('./mockServer', () => ({
  mockAPIServer: {
    searchShipment: vi.fn(),
    validateTrackingNumber: vi.fn(),
    getShipmentDetails: vi.fn(),
    refreshShipment: vi.fn(),
    getShipments: vi.fn(),
  },
}));

describe('APIClient', () => {
  let client: APIClient;
  const mockParseHttpError = vi.fn();
  const mockRetryWithBackoff = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    client = new APIClient();
    
    const { parseHttpError, retryWithBackoff } = require('../utils/errorHandling');
    parseHttpError.mockImplementation(mockParseHttpError);
    retryWithBackoff.mockImplementation(mockRetryWithBackoff);
    
    // Reset environment variable
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('request method', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test data' }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const result = await client['request']('/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toEqual({ data: 'test data' });
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ message: 'Not found' }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const mockError = { code: ErrorCodes.NOT_FOUND, message: 'Not found' };
      mockParseHttpError.mockReturnValue(mockError);
      
      await expect(client['request']('/test')).rejects.toEqual(mockError);
      
      expect(mockParseHttpError).toHaveBeenCalledWith({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Not found' },
        },
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);
      
      const mockError = { code: ErrorCodes.NETWORK_ERROR, message: 'Network error' };
      mockParseHttpError.mockReturnValue(mockError);
      
      await expect(client['request']('/test')).rejects.toEqual(mockError);
      
      expect(mockParseHttpError).toHaveBeenCalledWith(networkError);
    });

    it('should handle JSON parsing errors in error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const mockError = { code: ErrorCodes.SERVER_ERROR, message: 'Server error' };
      mockParseHttpError.mockReturnValue(mockError);
      
      await expect(client['request']('/test')).rejects.toEqual(mockError);
      
      expect(mockParseHttpError).toHaveBeenCalledWith({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
        },
      });
    });
  });

  describe('searchShipment', () => {
    it('should use mock API when configured', async () => {
      vi.stubEnv('VITE_USE_MOCK_API', 'true');
      const { mockAPIServer } = require('./mockServer');
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockAPIServer.searchShipment.mockResolvedValue(mockShipment);
      
      const result = await client.searchShipment('TEST123', 'container');
      
      expect(mockAPIServer.searchShipment).toHaveBeenCalledWith('TEST123', 'container');
      expect(result).toBe(mockShipment);
    });

    it('should use real API with retry logic when mock is disabled', async () => {
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockRetryWithBackoff.mockResolvedValue(mockShipment);
      
      const result = await client.searchShipment('TEST123', 'container');
      
      expect(mockRetryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        3,
        1000
      );
      expect(result).toBe(mockShipment);
    });

    it('should include type parameter when provided', async () => {
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockRetryWithBackoff.mockImplementation((fn) => fn());
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockShipment }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      await client.searchShipment('TEST123', 'container');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/track?trackingNumber=TEST123&type=container',
        expect.any(Object)
      );
    });

    it('should not include type parameter when not provided', async () => {
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockRetryWithBackoff.mockImplementation((fn) => fn());
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockShipment }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      await client.searchShipment('TEST123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/track?trackingNumber=TEST123',
        expect.any(Object)
      );
    });
  });

  describe('validateTrackingNumber', () => {
    it('should use mock API when configured', async () => {
      vi.stubEnv('VITE_USE_MOCK_API', 'true');
      const { mockAPIServer } = require('./mockServer');
      const mockValidation = { isValid: true, detectedType: 'container' };
      mockAPIServer.validateTrackingNumber.mockResolvedValue(mockValidation);
      
      const result = await client.validateTrackingNumber('TEST123');
      
      expect(mockAPIServer.validateTrackingNumber).toHaveBeenCalledWith('TEST123');
      expect(result).toBe(mockValidation);
    });

    it('should make POST request to validate endpoint', async () => {
      const mockValidation = { isValid: true, detectedType: 'container' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockValidation }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const result = await client.validateTrackingNumber('TEST123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ trackingNumber: 'TEST123' }),
        })
      );
      expect(result).toBe(mockValidation);
    });
  });

  describe('getShipmentDetails', () => {
    it('should use mock API when configured', async () => {
      vi.stubEnv('VITE_USE_MOCK_API', 'true');
      const { mockAPIServer } = require('./mockServer');
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockAPIServer.getShipmentDetails.mockResolvedValue(mockShipment);
      
      const result = await client.getShipmentDetails('TEST123');
      
      expect(mockAPIServer.getShipmentDetails).toHaveBeenCalledWith('TEST123');
      expect(result).toBe(mockShipment);
    });

    it('should make GET request to shipments endpoint', async () => {
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockShipment }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const result = await client.getShipmentDetails('TEST123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/shipments/TEST123',
        expect.any(Object)
      );
      expect(result).toBe(mockShipment);
    });
  });

  describe('refreshShipment', () => {
    it('should use mock API when configured', async () => {
      vi.stubEnv('VITE_USE_MOCK_API', 'true');
      const { mockAPIServer } = require('./mockServer');
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      mockAPIServer.refreshShipment.mockResolvedValue(mockShipment);
      
      const result = await client.refreshShipment('TEST123');
      
      expect(mockAPIServer.refreshShipment).toHaveBeenCalledWith('TEST123');
      expect(result).toBe(mockShipment);
    });

    it('should make POST request to refresh endpoint', async () => {
      const mockShipment = { id: '1', trackingNumber: 'TEST123' };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockShipment }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const result = await client.refreshShipment('TEST123');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/shipments/TEST123/refresh',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toBe(mockShipment);
    });
  });

  describe('getShipments', () => {
    it('should use mock API when configured', async () => {
      vi.stubEnv('VITE_USE_MOCK_API', 'true');
      const { mockAPIServer } = require('./mockServer');
      const mockShipments = [{ id: '1', trackingNumber: 'TEST123' }];
      mockAPIServer.getShipments.mockResolvedValue(mockShipments);
      
      const result = await client.getShipments(['TEST123']);
      
      expect(mockAPIServer.getShipments).toHaveBeenCalledWith(['TEST123']);
      expect(result).toBe(mockShipments);
    });

    it('should make POST request to batch endpoint', async () => {
      const mockShipments = [{ id: '1', trackingNumber: 'TEST123' }];
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockShipments }),
      };
      mockFetch.mockResolvedValue(mockResponse);
      
      const result = await client.getShipments(['TEST123', 'TEST456']);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/shipments/batch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ trackingNumbers: ['TEST123', 'TEST456'] }),
        })
      );
      expect(result).toBe(mockShipments);
    });
  });
});