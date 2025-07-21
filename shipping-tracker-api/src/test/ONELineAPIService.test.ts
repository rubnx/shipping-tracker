import { ONELineAPIService } from '../services/carriers/ONELineAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ONELineAPIService', () => {
  let service: ONELineAPIService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create service instance
    service = new ONELineAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.one-line.com/track',
        timeout: 15000,
        headers: {
          'Authorization': 'Bearer ',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ShippingTracker/1.0',
          'X-API-Alliance': 'ocean-network-express',
          'X-API-Coverage': 'global'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('trackShipment', () => {
    const mockTrackingNumber = 'ONEU123456789';
    const mockTrackingType: TrackingType = 'container';

    it('should return error when API key is not configured', async () => {
      const result = await service.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result).toEqual({
        provider: 'one-line',
        trackingNumber: mockTrackingNumber,
        data: null,
        timestamp: expect.any(Date),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'one-line',
          errorType: 'AUTH_ERROR',
          message: 'ONE Line API key not configured'
        }
      });
    });

    it('should successfully track container shipment', async () => {
      // Mock successful API response
      const mockApiResponse = {
        data: {
          trackingNumber: mockTrackingNumber,
          status: 'IN_TRANSIT',
          carrier: 'Ocean Network Express',
          service: 'FCL',
          events: [
            {
              eventId: 'evt-001',
              eventDateTime: '2024-01-15T10:00:00Z',
              eventType: 'LOADED_ON_VESSEL',
              eventDescription: 'Container loaded on vessel',
              location: {
                locationName: 'Tokyo Port',
                city: 'Tokyo',
                country: 'Japan',
                coordinates: {
                  latitude: 35.6762,
                  longitude: 139.6503
                }
              },
              isCompleted: true
            }
          ],
          containers: [
            {
              containerNumber: mockTrackingNumber,
              containerSize: '40ft',
              containerType: 'HC',
              sealNumber: 'SEAL789012'
            }
          ],
          vessel: {
            vesselName: 'ONE Innovation',
            vesselIMO: 'IMO9812000',
            voyageNumber: 'OI001E',
            currentPosition: {
              latitude: 35.6762,
              longitude: 139.6503
            },
            estimatedTimeOfArrival: '2024-01-22T14:00:00Z'
          },
          route: {
            origin: {
              portCode: 'JPTYO',
              portName: 'Tokyo',
              city: 'Tokyo',
              country: 'Japan',
              coordinates: {
                latitude: 35.6762,
                longitude: 139.6503
              }
            },
            destination: {
              portCode: 'USLAX',
              portName: 'Los Angeles',
              city: 'Los Angeles',
              country: 'United States',
              coordinates: {
                latitude: 33.7701,
                longitude: -118.1937
              }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('success');
      expect(result.provider).toBe('one-line');
      expect(result.trackingNumber).toBe(mockTrackingNumber);
      expect(result.reliability).toBe(0.94);
      expect(result.data).toMatchObject({
        trackingNumber: mockTrackingNumber,
        carrier: 'Ocean Network Express (ONE)',
        service: 'FCL',
        status: 'In Transit'
      });
    });

    it('should handle 404 not found error', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Tracking number not found' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('error');
      expect(result.error).toMatchObject({
        provider: 'one-line',
        errorType: 'NOT_FOUND',
        message: `Tracking number ${mockTrackingNumber} not found in ONE Line system`,
        statusCode: 404
      });
    });

    it('should handle rate limit error', async () => {
      const error = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '180' },
          data: { message: 'Rate limit exceeded' }
        }
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('error');
      expect(result.error).toMatchObject({
        provider: 'one-line',
        errorType: 'RATE_LIMIT',
        message: 'ONE Line API rate limit exceeded',
        statusCode: 429,
        retryAfter: 180
      });
    });

    it('should handle timeout error', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 15000ms exceeded'
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('error');
      expect(result.error).toMatchObject({
        provider: 'one-line',
        errorType: 'TIMEOUT',
        message: 'ONE Line API request timeout'
      });
    });

    it('should handle network error', async () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.one-line.com'
      };

      mockAxiosInstance.get.mockRejectedValue(error);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('error');
      expect(result.error).toMatchObject({
        provider: 'one-line',
        errorType: 'NETWORK_ERROR',
        message: 'Unable to connect to ONE Line API'
      });
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };

      const mockApiResponse = {
        data: {
          trackingNumber: mockTrackingNumber,
          status: 'DELIVERED',
          carrier: 'Ocean Network Express',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      // First call fails, second succeeds
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockApiResponse);

      // Mock API key being available
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';

      const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);

      expect(result.status).toBe('success');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTrackingEndpoint', () => {
    it('should return correct endpoint for container tracking', () => {
      const endpoint = (service as any).getTrackingEndpoint('container');
      expect(endpoint).toBe('/containers');
    });

    it('should return correct endpoint for booking tracking', () => {
      const endpoint = (service as any).getTrackingEndpoint('booking');
      expect(endpoint).toBe('/bookings');
    });

    it('should return correct endpoint for BOL tracking', () => {
      const endpoint = (service as any).getTrackingEndpoint('bol');
      expect(endpoint).toBe('/bills-of-lading');
    });

    it('should default to container endpoint for unknown type', () => {
      const endpoint = (service as any).getTrackingEndpoint('unknown' as TrackingType);
      expect(endpoint).toBe('/containers');
    });
  });

  describe('mapServiceType', () => {
    it('should map LCL service types correctly', () => {
      expect((service as any).mapServiceType('LCL')).toBe('LCL');
      expect((service as any).mapServiceType('Less than Container Load')).toBe('LCL');
      expect((service as any).mapServiceType('Consolidation Service')).toBe('LCL');
    });

    it('should default to FCL for other service types', () => {
      expect((service as any).mapServiceType('FCL')).toBe('FCL');
      expect((service as any).mapServiceType('Full Container Load')).toBe('FCL');
      expect((service as any).mapServiceType('Standard Service')).toBe('FCL');
    });
  });

  describe('mapStatus', () => {
    it('should map ONE Line statuses correctly', () => {
      expect((service as any).mapStatus('PLANNED')).toBe('Planned');
      expect((service as any).mapStatus('BOOKING_CONFIRMED')).toBe('Booking Confirmed');
      expect((service as any).mapStatus('IN_TRANSIT')).toBe('In Transit');
      expect((service as any).mapStatus('TRANSSHIPMENT')).toBe('In Transshipment');
      expect((service as any).mapStatus('DELIVERED')).toBe('Delivered');
      expect((service as any).mapStatus('DELAYED')).toBe('Delayed');
    });

    it('should return original status for unmapped values', () => {
      expect((service as any).mapStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
    });
  });

  describe('getGlobalTimezone', () => {
    it('should return correct timezone for Asia-Pacific countries', () => {
      expect((service as any).getGlobalTimezone('Japan')).toBe('Asia/Tokyo');
      expect((service as any).getGlobalTimezone('South Korea')).toBe('Asia/Seoul');
      expect((service as any).getGlobalTimezone('China')).toBe('Asia/Shanghai');
      expect((service as any).getGlobalTimezone('Singapore')).toBe('Asia/Singapore');
    });

    it('should return correct timezone for Americas', () => {
      expect((service as any).getGlobalTimezone('United States')).toBe('America/New_York');
      expect((service as any).getGlobalTimezone('Canada')).toBe('America/Toronto');
      expect((service as any).getGlobalTimezone('Brazil')).toBe('America/Sao_Paulo');
    });

    it('should return correct timezone for Europe', () => {
      expect((service as any).getGlobalTimezone('United Kingdom')).toBe('Europe/London');
      expect((service as any).getGlobalTimezone('Germany')).toBe('Europe/Berlin');
      expect((service as any).getGlobalTimezone('Netherlands')).toBe('Europe/Amsterdam');
    });

    it('should handle US cities specifically', () => {
      expect((service as any).getGlobalTimezone('United States', 'Los Angeles')).toBe('America/Los_Angeles');
      expect((service as any).getGlobalTimezone('United States', 'New York')).toBe('America/New_York');
      expect((service as any).getGlobalTimezone('United States', 'Long Beach')).toBe('America/Los_Angeles');
    });

    it('should default to UTC for unknown countries', () => {
      expect((service as any).getGlobalTimezone('Unknown Country')).toBe('UTC');
    });
  });

  describe('mapEventStatus', () => {
    it('should map ONE Line event types correctly', () => {
      expect((service as any).mapEventStatus('LOADED_ON_VESSEL')).toBe('Loaded on Vessel');
      expect((service as any).mapEventStatus('VESSEL_DEPARTURE')).toBe('Vessel Departed');
      expect((service as any).mapEventStatus('TRANSSHIPMENT_LOADED')).toBe('Transshipment Loaded');
      expect((service as any).mapEventStatus('RAIL_DEPARTURE')).toBe('Rail Departed');
      expect((service as any).mapEventStatus('TRUCK_ARRIVAL')).toBe('Truck Arrived');
    });

    it('should format unknown event types', () => {
      expect((service as any).mapEventStatus('CUSTOM_EVENT_TYPE')).toBe('CUSTOM EVENT TYPE');
    });
  });

  describe('isAvailable', () => {
    it('should return false when API key is not configured', () => {
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when API key is configured', () => {
      const serviceWithKey = new ONELineAPIService();
      (serviceWithKey as any).apiKey = 'test-api-key';
      expect(serviceWithKey.isAvailable()).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return correct configuration', () => {
      const config = service.getConfig();
      
      expect(config).toEqual({
        name: 'one-line',
        baseUrl: 'https://api.one-line.com/track',
        hasApiKey: false,
        timeout: 15000,
        retryAttempts: 3,
        supportedTypes: ['container', 'booking', 'bol'],
        reliability: 0.94,
        coverage: ['asia-pacific', 'global', 'americas', 'europe'],
        alliance: 'ocean-network-express'
      });
    });
  });
});