import { TrackTraceAPIService } from '../services/carriers/TrackTraceAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment config
jest.mock('../config/environment', () => ({
  config: {
    apiKeys: {
      trackTrace: 'test-track-trace-api-key'
    }
  }
}));

describe('TrackTraceAPIService', () => {
  let trackTraceService: TrackTraceAPIService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    trackTraceService = new TrackTraceAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.track-trace.com/v1/tracking',
        timeout: 8000,
        headers: {
          'Authorization': 'Bearer test-track-trace-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ShippingTracker/1.0',
          'X-API-Version': '1.0'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('trackShipment', () => {
    const mockTrackTraceResponse = {
      trackingNumber: 'TTCU1234567',
      status: 'IN_TRANSIT',
      carrier: 'Multiple Carriers',
      service: 'FCL',
      events: [
        {
          eventId: 'evt-001',
          eventDateTime: '2024-01-15T10:00:00Z',
          eventType: 'GATE_OUT',
          eventDescription: 'Container departed from terminal',
          location: {
            locationName: 'Rotterdam Port',
            city: 'Rotterdam',
            country: 'Netherlands',
            coordinates: {
              latitude: 51.9244,
              longitude: 4.4777
            }
          },
          isCompleted: true
        },
        {
          eventId: 'evt-002',
          eventDateTime: '2024-01-16T08:30:00Z',
          eventType: 'VESSEL_DEPARTURE',
          eventDescription: 'Vessel departed from port',
          location: {
            locationName: 'Rotterdam Port',
            city: 'Rotterdam',
            country: 'Netherlands'
          },
          isCompleted: true
        }
      ],
      containers: [
        {
          containerNumber: 'TTCU1234567',
          containerSize: '40ft',
          containerType: 'GP',
          sealNumber: 'TT123456'
        }
      ],
      vessel: {
        vesselName: 'Generic Vessel',
        voyageNumber: 'V003'
      },
      route: {
        origin: {
          portCode: 'NLRTM',
          portName: 'Rotterdam Port',
          city: 'Rotterdam',
          country: 'Netherlands',
          coordinates: {
            latitude: 51.9244,
            longitude: 4.4777
          }
        },
        destination: {
          portCode: 'USLAX',
          portName: 'Los Angeles Port',
          city: 'Los Angeles',
          country: 'USA',
          coordinates: {
            latitude: 33.7361,
            longitude: -118.2639
          }
        }
      },
      lastUpdated: '2024-01-16T09:00:00Z',
      dataSource: 'aggregated'
    };

    it('should successfully track a container number', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTrackTraceResponse });

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/container', {
        params: {
          container: 'TTCU1234567',
          includeEvents: true,
          includeVessel: false,
          includeRoute: false
        }
      });

      expect(result.status).toBe('success');
      expect(result.provider).toBe('track-trace');
      expect(result.trackingNumber).toBe('TTCU1234567');
      expect(result.reliability).toBe(0.68);
      expect(result.data.carrier).toBe('Multiple Carriers');
      expect(result.data.status).toBe('In Transit');
    });

    it('should reject non-container tracking types', async () => {
      const result = await trackTraceService.trackShipment('BOOK123456', 'booking');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toContain('only supports container tracking');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should reject BOL tracking', async () => {
      const result = await trackTraceService.trackShipment('BOL123456', 'bol');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toContain('only supports container tracking');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should transform timeline events correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTrackTraceResponse });

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.data.timeline).toHaveLength(2);
      expect(result.data.timeline[0]).toMatchObject({
        id: 'evt-001',
        status: 'Departed',
        location: 'Rotterdam Port, Rotterdam, Netherlands',
        description: 'Container departed from terminal',
        isCompleted: true,
        coordinates: {
          lat: 51.9244,
          lng: 4.4777
        }
      });
    });

    it('should transform container information correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTrackTraceResponse });

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.data.containers).toHaveLength(1);
      expect(result.data.containers[0]).toMatchObject({
        number: 'TTCU1234567',
        size: '40ft',
        type: 'GP',
        sealNumber: 'TT123456',
        weight: undefined // Free tier doesn't provide weight
      });
    });

    it('should transform vessel information correctly with limited data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTrackTraceResponse });

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.data.vessel).toMatchObject({
        name: 'Generic Vessel',
        imo: '', // Free tier doesn't provide IMO
        voyage: 'V003',
        currentPosition: undefined, // Free tier doesn't provide position
        eta: undefined
      });
    });

    it('should handle 404 not found errors', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Container not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('INVALID123', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('not found in Track-Trace system');
    });

    it('should handle 401 authentication errors', async () => {
      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Invalid API key' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('Invalid or expired Track-Trace API key');
    });

    it('should handle 429 rate limit errors with longer retry time', async () => {
      const error = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '120' },
          data: { message: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(120);
      expect(result.error?.message).toContain('free tier');
    });

    it('should handle 402 payment required (quota exceeded)', async () => {
      const error = {
        response: {
          status: 402,
          statusText: 'Payment Required',
          data: { message: 'Free tier quota exceeded' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(3600); // 1 hour
      expect(result.error?.message).toContain('quota exceeded');
    });

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('TIMEOUT');
      expect(result.error?.message).toBe('Track-Trace API request timeout');
    });

    it('should handle network errors', async () => {
      const error = { code: 'ENOTFOUND' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Unable to connect to Track-Trace API');
    });

    it('should retry on failure up to maximum attempts (2 for free tier)', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2); // 2 retry attempts for free tier
      expect(result.status).toBe('error');
    });

    it('should succeed on retry after initial failure', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockTrackTraceResponse });

      const result = await trackTraceService.trackShipment('TTCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
    });

    it('should handle missing API key gracefully', async () => {
      const serviceWithoutKey = new TrackTraceAPIService();
      (serviceWithoutKey as any).apiKey = '';
      
      const result = await serviceWithoutKey.trackShipment('TTCU1234567', 'container');
      
      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('Track-Trace API key not configured');
    });
  });

  describe('Status and Type Mapping', () => {
    it('should map Track-Trace statuses correctly', async () => {
      const testCases = [
        { ttStatus: 'PLANNED', expectedStatus: 'Planned' },
        { ttStatus: 'IN_TRANSIT', expectedStatus: 'In Transit' },
        { ttStatus: 'DELIVERED', expectedStatus: 'Delivered' },
        { ttStatus: 'DELAYED', expectedStatus: 'Delayed' },
        { ttStatus: 'UNKNOWN', expectedStatus: 'Unknown' },
        { ttStatus: 'CUSTOM_STATUS', expectedStatus: 'CUSTOM_STATUS' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          trackingNumber: 'TEST123',
          status: testCase.ttStatus,
          carrier: 'Test Carrier',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-16T09:00:00Z',
          dataSource: 'test'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
        const result = await trackTraceService.trackShipment('TEST123', 'container');
        
        expect(result.data.status).toBe(testCase.expectedStatus);
      }
    });

    it('should map Track-Trace event types correctly', async () => {
      const testCases = [
        { eventType: 'GATE_OUT', expectedStatus: 'Departed' },
        { eventType: 'GATE_IN', expectedStatus: 'Arrived' },
        { eventType: 'LOADED', expectedStatus: 'Loaded' },
        { eventType: 'DISCHARGED', expectedStatus: 'Discharged' },
        { eventType: 'VESSEL_DEPARTURE', expectedStatus: 'Vessel Departed' },
        { eventType: 'VESSEL_ARRIVAL', expectedStatus: 'Vessel Arrived' },
        { eventType: 'CUSTOM_EVENT', expectedStatus: 'CUSTOM EVENT' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Test Carrier',
          service: 'FCL',
          events: [{
            eventDateTime: '2024-01-15T10:00:00Z',
            eventType: testCase.eventType,
            eventDescription: 'Test event',
            location: { locationName: 'Test Port' },
            isCompleted: true
          }],
          lastUpdated: '2024-01-16T09:00:00Z',
          dataSource: 'test'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
        const result = await trackTraceService.trackShipment('TEST123', 'container');
        
        expect(result.data.timeline[0].status).toBe(testCase.expectedStatus);
      }
    });

    it('should handle missing optional data gracefully', async () => {
      const minimalResponse = {
        trackingNumber: 'TEST123',
        status: 'IN_TRANSIT',
        events: [{
          eventDateTime: '2024-01-15T10:00:00Z',
          eventType: 'GATE_OUT',
          eventDescription: 'Test event',
          location: { locationName: 'Test Port' },
          isCompleted: true
        }],
        lastUpdated: '2024-01-16T09:00:00Z'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: minimalResponse });
      const result = await trackTraceService.trackShipment('TEST123', 'container');
      
      expect(result.status).toBe('success');
      expect(result.data.carrier).toBe('Unknown');
      expect(result.data.service).toBe('FCL');
      expect(result.data.containers).toHaveLength(0);
      expect(result.data.vessel).toBeUndefined();
      expect(result.data.route).toBeUndefined();
    });
  });

  describe('Free Tier Limitations', () => {
    it('should only support container tracking', () => {
      const config = trackTraceService.getConfig();
      expect(config.supportedTypes).toEqual(['container']);
      expect(config.tier).toBe('free');
      expect(config.limitations).toContain('Container tracking only');
    });

    it('should have appropriate rate limits for free tier', () => {
      const config = trackTraceService.getConfig();
      expect(config.rateLimits?.perMinute).toBe(50);
      expect(config.rateLimits?.perHour).toBe(500);
    });

    it('should provide rate limit status', () => {
      const rateLimitStatus = trackTraceService.getRateLimitStatus();
      expect(rateLimitStatus).toHaveProperty('remainingMinute');
      expect(rateLimitStatus).toHaveProperty('remainingHour');
      expect(rateLimitStatus).toHaveProperty('resetTime');
      expect(rateLimitStatus.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('Utility Methods', () => {
    it('should return availability status', () => {
      expect(trackTraceService.isAvailable()).toBe(true);
    });

    it('should return comprehensive configuration info', () => {
      const config = trackTraceService.getConfig();
      
      expect(config).toMatchObject({
        name: 'track-trace',
        baseUrl: 'https://api.track-trace.com/v1/tracking',
        hasApiKey: true,
        timeout: 8000,
        retryAttempts: 2,
        supportedTypes: ['container'],
        reliability: 0.68,
        tier: 'free'
      });
      
      expect(config.limitations).toBeInstanceOf(Array);
      expect(config.limitations.length).toBeGreaterThan(0);
    });
  });
});