import { TrackingService, TrackingError } from '../services/TrackingService';
import { TrackingType, ShipmentData } from '../types';

// Mock the ShipmentService
jest.mock('../services/ShipmentService');
jest.mock('../config/environment', () => ({
  config: {
    server: {
      port: 3001,
      nodeEnv: 'test',
      frontendUrl: 'http://localhost:5173'
    },
    apiKeys: {
      maersk: 'test-maersk-key',
      hapagLloyd: 'test-hapag-key',
      msc: 'test-msc-key',
      cmaCgm: 'test-cma-key'
    },
    database: {
      url: 'postgresql://test:test@localhost:5432/test'
    },
    redis: {
      url: 'redis://localhost:6379'
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100
    },
    security: {
      jwtSecret: 'test-secret',
      apiSecretKey: 'test-api-secret'
    }
  }
}));

describe('TrackingService', () => {
  let trackingService: TrackingService;

  beforeEach(() => {
    trackingService = new TrackingService();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject empty tracking number', async () => {
      const result = await trackingService.trackShipment('   '); // whitespace only
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMPTY_TRACKING_NUMBER');
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.retryable).toBe(false);
    });

    it('should reject null tracking number', async () => {
      const result = await trackingService.trackShipment(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TRACKING_NUMBER');
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.retryable).toBe(false);
    });

    it('should reject tracking number that is too short', async () => {
      const result = await trackingService.trackShipment('AB');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRACKING_NUMBER_TOO_SHORT');
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.retryable).toBe(false);
    });

    it('should reject tracking number that is too long', async () => {
      const longTrackingNumber = 'A'.repeat(51);
      const result = await trackingService.trackShipment(longTrackingNumber);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRACKING_NUMBER_TOO_LONG');
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.retryable).toBe(false);
    });

    it('should reject tracking number with invalid characters', async () => {
      const result = await trackingService.trackShipment('ABC@123#');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TRACKING_NUMBER_FORMAT');
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.retryable).toBe(false);
    });

    it('should accept valid tracking numbers', async () => {
      const validNumbers = [
        'ABC123',
        'CONTAINER-123',
        'BOL_456789',
        'MAEU1234567'
      ];

      for (const trackingNumber of validNumbers) {
        const result = await trackingService.trackShipment(trackingNumber);
        // Should not fail due to validation (may fail due to other reasons in test env)
        if (!result.success) {
          expect(result.error?.code).not.toMatch(/^(MISSING_TRACKING_NUMBER|EMPTY_TRACKING_NUMBER|TRACKING_NUMBER_TOO_SHORT|TRACKING_NUMBER_TOO_LONG|INVALID_TRACKING_NUMBER_FORMAT)$/);
        }
      }
    });
  });

  describe('Error Categorization', () => {
    it('should categorize network errors correctly', async () => {
      // Mock ShipmentService to throw network error
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('ECONNREFUSED connection refused')
      );

      const result = await trackingService.trackShipment('TEST123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.statusCode).toBe(503);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.userMessage).toContain('internet connection');
    });

    it('should categorize timeout errors correctly', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('Request timeout after 10000ms')
      );

      const result = await trackingService.trackShipment('TEST123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('REQUEST_TIMEOUT');
      expect(result.error?.statusCode).toBe(408);
      expect(result.error?.retryable).toBe(true);
    });

    it('should categorize rate limit errors correctly', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const result = await trackingService.trackShipment('TEST123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.statusCode).toBe(429);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.retryAfter).toBe(60);
    });

    it('should categorize tracking not found errors correctly', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        'Unable to find tracking information. Please verify the tracking number and try again.'
      );

      const result = await trackingService.trackShipment('NOTFOUND123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRACKING_NOT_FOUND');
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.retryable).toBe(false);
    });

    it('should categorize service unavailable errors correctly', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        'Tracking services are temporarily unavailable. Please try again in a few minutes.'
      );

      const result = await trackingService.trackShipment('SERVICE_DOWN');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SERVICE_TEMPORARILY_UNAVAILABLE');
      expect(result.error?.statusCode).toBe(503);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.retryAfter).toBe(300);
    });

    it('should handle unknown errors gracefully', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('Some unexpected error')
      );

      const result = await trackingService.trackShipment('UNKNOWN_ERROR');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.userMessage).toContain('unexpected error');
    });
  });

  describe('Caching Behavior', () => {
    const mockShipmentData: ShipmentData = {
      trackingNumber: 'CACHE_TEST_123',
      trackingType: 'container',
      carrier: 'Test Carrier',
      service: 'FCL',
      status: 'In Transit',
      timeline: [],
      lastUpdated: new Date(),
      dataSource: 'test',
      reliability: 0.9
    };

    it('should return fresh cached data when available', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      // Mock getCachedShipment to return fresh data
      jest.spyOn(mockShipmentService, 'getCachedShipment').mockResolvedValue({
        id: 'test-id',
        tracking_number: 'CACHE_TEST_123',
        tracking_type: 'container',
        carrier: 'Test Carrier',
        service: 'FCL',
        status: 'In Transit',
        data: mockShipmentData,
        last_updated: new Date(), // Fresh data
        created_at: new Date(),
        expires_at: new Date(Date.now() + 3600000) // 1 hour from now
      });

      // Mock the private method
      jest.spyOn(mockShipmentService as any, 'transformCachedToShipmentData').mockReturnValue(mockShipmentData);

      const result = await trackingService.trackShipment('CACHE_TEST_123');
      
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.dataAge).toBeLessThan(60); // Less than 1 hour
    });

    it('should attempt refresh for old cached data', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      // Mock getCachedShipment to return old data
      const oldData = { ...mockShipmentData, lastUpdated: new Date(Date.now() - 3600000 * 2) }; // 2 hours old
      jest.spyOn(mockShipmentService, 'getCachedShipment').mockResolvedValue({
        id: 'test-id',
        tracking_number: 'OLD_CACHE_123',
        tracking_type: 'container',
        carrier: 'Test Carrier',
        service: 'FCL',
        status: 'In Transit',
        data: oldData,
        last_updated: new Date(Date.now() - 3600000 * 2), // 2 hours old
        created_at: new Date(),
        expires_at: new Date(Date.now() + 3600000)
      });

      jest.spyOn(mockShipmentService as any, 'transformCachedToShipmentData').mockReturnValue(oldData);

      // Mock trackShipment to succeed with fresh data
      jest.spyOn(mockShipmentService, 'trackShipment').mockResolvedValue(mockShipmentData);

      const result = await trackingService.trackShipment('OLD_CACHE_123');
      
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false); // Should return fresh data
    });

    it('should fall back to cached data when refresh fails', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      // Mock getCachedShipment to return old data
      const oldData = { ...mockShipmentData, lastUpdated: new Date(Date.now() - 3600000 * 2) }; // 2 hours old
      jest.spyOn(mockShipmentService, 'getCachedShipment').mockResolvedValue({
        id: 'test-id',
        tracking_number: 'FALLBACK_123',
        tracking_type: 'container',
        carrier: 'Test Carrier',
        service: 'FCL',
        status: 'In Transit',
        data: oldData,
        last_updated: new Date(Date.now() - 3600000 * 2), // 2 hours old
        created_at: new Date(),
        expires_at: new Date(Date.now() + 3600000)
      });

      jest.spyOn(mockShipmentService as any, 'transformCachedToShipmentData').mockReturnValue(oldData);

      // Mock trackShipment to fail
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('API temporarily unavailable')
      );

      const result = await trackingService.trackShipment('FALLBACK_123');
      
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.error?.code).toBe('STALE_DATA_WARNING');
      expect(result.error?.userMessage).toContain('cached data');
    });
  });

  describe('Force Refresh', () => {
    it('should bypass cache when force refresh is requested', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      // Mock trackShipment to return fresh data
      jest.spyOn(mockShipmentService, 'trackShipment').mockResolvedValue({
        trackingNumber: 'FORCE_REFRESH_123',
        trackingType: 'container',
        carrier: 'Fresh Carrier',
        service: 'FCL',
        status: 'Delivered',
        timeline: [],
        lastUpdated: new Date(),
        dataSource: 'fresh',
        reliability: 0.95
      });

      const result = await trackingService.trackShipment('FORCE_REFRESH_123', undefined, undefined, true);
      
      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(result.dataAge).toBe(0);
    });
  });

  describe('Tracking History', () => {
    it('should return tracking history successfully', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      const mockData: ShipmentData = {
        trackingNumber: 'HISTORY_123',
        trackingType: 'container',
        carrier: 'Test Carrier',
        service: 'FCL',
        status: 'In Transit',
        timeline: [
          {
            id: '1',
            timestamp: new Date('2024-01-01'),
            status: 'Departed',
            location: 'Shanghai',
            description: 'Container departed',
            isCompleted: true
          },
          {
            id: '2',
            timestamp: new Date('2024-01-02'),
            status: 'In Transit',
            location: 'Pacific Ocean',
            description: 'Container in transit',
            isCompleted: false
          }
        ],
        lastUpdated: new Date(),
        dataSource: 'test',
        reliability: 0.9
      };

      jest.spyOn(mockShipmentService, 'trackShipment').mockResolvedValue(mockData);

      const result = await trackingService.getTrackingHistory('HISTORY_123');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].status).toBe('Departed');
      expect(result.data![1].status).toBe('In Transit');
    });

    it('should handle history retrieval errors', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'trackShipment').mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await trackingService.getTrackingHistory('ERROR_123');
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Search Suggestions', () => {
    it('should return search suggestions', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'getSearchSuggestions').mockResolvedValue([
        'MAEU1234567',
        'MAEU2345678',
        'MAEU3456789'
      ]);

      const suggestions = await trackingService.getSearchSuggestions('MAEU', 'test-session');
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('MAEU1234567');
    });

    it('should handle search suggestion errors gracefully', async () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'getSearchSuggestions').mockRejectedValue(
        new Error('Database error')
      );

      const suggestions = await trackingService.getSearchSuggestions('TEST');
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('Provider Health', () => {
    it('should return provider health status', () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'getAPIProviderStats').mockReturnValue([
        { name: 'maersk', reliability: 0.95, available: true },
        { name: 'hapag-lloyd', reliability: 0.90, available: true },
        { name: 'msc', reliability: 0.85, available: false }
      ]);

      const health = trackingService.getProviderHealth();
      
      expect(health.providers).toHaveLength(3);
      expect(health.overallHealth).toBe('healthy'); // 2/3 available with good reliability
    });

    it('should report degraded health when reliability is low', () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'getAPIProviderStats').mockReturnValue([
        { name: 'provider1', reliability: 0.5, available: true },
        { name: 'provider2', reliability: 0.6, available: true }
      ]);

      const health = trackingService.getProviderHealth();
      
      expect(health.overallHealth).toBe('degraded');
    });

    it('should report unavailable when no providers are available', () => {
      const mockShipmentService = trackingService['shipmentService'];
      
      jest.spyOn(mockShipmentService, 'getAPIProviderStats').mockReturnValue([
        { name: 'provider1', reliability: 0.95, available: false },
        { name: 'provider2', reliability: 0.90, available: false }
      ]);

      const health = trackingService.getProviderHealth();
      
      expect(health.overallHealth).toBe('unavailable');
    });
  });

  describe('Data Age Formatting', () => {
    it('should format data age correctly', () => {
      // Test private method through public interface
      const formatDataAge = trackingService['formatDataAge'];
      
      expect(formatDataAge(0)).toBe('just now');
      expect(formatDataAge(1)).toBe('1 minute');
      expect(formatDataAge(5)).toBe('5 minutes');
      expect(formatDataAge(60)).toBe('1 hour');
      expect(formatDataAge(120)).toBe('2 hours');
      expect(formatDataAge(1440)).toBe('1 day');
      expect(formatDataAge(2880)).toBe('2 days');
    });
  });
});