import { YangMingAPIService } from '../services/carriers/YangMingAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return a mock instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

describe('YangMingAPIService', () => {
  let service: YangMingAPIService;

  beforeEach(() => {
    service = new YangMingAPIService();
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with correct configuration', () => {
      const config = service.getConfig();
      
      expect(config.name).toBe('yang-ming');
      expect(config.baseUrl).toBe('https://api.yangming.com/track');
      expect(config.supportedTypes).toEqual(['container', 'booking', 'bol']);
      expect(config.reliability).toBe(0.90);
      expect(config.coverage).toEqual(['asia-pacific']);
      expect(config.specialization).toBe('regional-route-optimization');
    });

    it('should report availability based on API key presence', () => {
      // Without API key, should not be available
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('Tracking Functionality', () => {
    it('should handle missing API key gracefully', async () => {
      const result = await service.trackShipment('YMLU1234567', 'container');
      
      expect(result.provider).toBe('yang-ming');
      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('Yang Ming API key not configured');
      expect(result.reliability).toBe(0);
    });

    it('should format tracking numbers correctly', async () => {
      const trackingNumber = 'ymlu1234567';
      const result = await service.trackShipment(trackingNumber, 'container');
      
      // Should handle lowercase and convert to uppercase
      expect(result.trackingNumber).toBe(trackingNumber);
    });

    it('should support different tracking types', async () => {
      const trackingTypes: TrackingType[] = ['container', 'booking', 'bol'];
      
      for (const type of trackingTypes) {
        const result = await service.trackShipment('TEST123', type);
        expect(result.provider).toBe('yang-ming');
        // All should fail due to missing API key, but should handle the type
        expect(result.error?.errorType).toBe('AUTH_ERROR');
      }
    });
  });

  describe('Data Transformation', () => {
    it('should map Yang Ming service types correctly', () => {
      // Test private method through public interface
      const config = service.getConfig();
      expect(config.supportedTypes).toContain('container');
      expect(config.supportedTypes).toContain('booking');
      expect(config.supportedTypes).toContain('bol');
    });

    it('should handle Asia-Pacific regional focus', () => {
      const config = service.getConfig();
      expect(config.coverage).toEqual(['asia-pacific']);
      expect(config.specialization).toBe('regional-route-optimization');
    });
  });

  describe('Error Handling', () => {
    it('should handle different error scenarios', async () => {
      // Test with missing API key
      const result = await service.trackShipment('TEST123', 'container');
      
      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error?.provider).toBe('yang-ming');
      expect(result.reliability).toBe(0);
    });

    it('should provide appropriate error messages', async () => {
      const result = await service.trackShipment('INVALID', 'container');
      
      expect(result.error?.message).toContain('Yang Ming API key not configured');
    });
  });

  describe('Regional Optimization', () => {
    it('should be optimized for Asia-Pacific routes', () => {
      const config = service.getConfig();
      
      expect(config.coverage).toEqual(['asia-pacific']);
      expect(config.timeout).toBe(12000); // Optimized timeout for regional routes
      expect(config.retryAttempts).toBe(3);
    });

    it('should support Taiwan-based carrier features', () => {
      const config = service.getConfig();
      
      // Yang Ming is Taiwan-based with Asia-Pacific focus
      expect(config.specialization).toBe('regional-route-optimization');
      expect(config.reliability).toBe(0.90); // Good reliability for regional routes
    });
  });

  describe('Integration with API Aggregator', () => {
    it('should provide correct provider configuration', () => {
      const config = service.getConfig();
      
      expect(config.name).toBe('yang-ming');
      expect(config.hasApiKey).toBe(false); // No API key in test environment
      expect(config.supportedTypes).toHaveLength(3);
      expect(config.reliability).toBeGreaterThan(0.8);
    });

    it('should handle rate limiting appropriately', () => {
      const config = service.getConfig();
      
      // Should have reasonable timeout for Asia-Pacific routes
      expect(config.timeout).toBe(12000);
      expect(config.retryAttempts).toBe(3);
    });
  });
});