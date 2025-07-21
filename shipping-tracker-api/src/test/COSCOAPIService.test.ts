import { COSCOAPIService } from '../services/carriers/COSCOAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the config module
jest.mock('../config/environment', () => ({
  config: {
    apiKeys: {
      cosco: 'test-api-key'
    }
  }
}));

describe('COSCOAPIService', () => {
  let service: COSCOAPIService;
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
    service = new COSCOAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.cosco-shipping.com/tracking',
        timeout: 15000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ShippingTracker/1.0',
          'X-API-Version': '2.0',
          'Accept-Language': 'en-US,zh-CN'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('trackShipment', () => {
    const mockTrackingNumber = 'COSU1234567';
    const mockResponse = {
      data: {
        trackingNumber: mockTrackingNumber,
        status: 'IN_TRANSIT',
        carrier: 'COSCO',
        service: 'FCL',
        events: [
          {
            eventId: 'evt-001',
            eventDateTime: '2024-01-15T10:00:00Z',
            eventCode: 'GATE_OUT',
            eventDescription: 'Container departed from terminal',
            location: {
              locationName: 'Shanghai Port Terminal',
              city: 'Shanghai',
              country: 'China',
              coordinates: {
                latitude: 31.2304,
                longitude: 121.4737
              }
            },
            isCompleted: true
          }
        ],
        containers: [
          {
            containerNumber: mockTrackingNumber,
            containerSize: '40ft',
            containerType: 'GP',
            sealNumber: 'SEAL789012'
          }
        ],
        vessel: {
          vesselName: 'COSCO SHIPPING UNIVERSE',
          vesselIMO: 'IMO9795478',
          voyageNumber: 'CSU001E',
          currentPosition: {
            latitude: 31.0,
            longitude: 121.0
          },
          estimatedTimeOfArrival: '2024-01-25T08:00:00Z'
        },
        route: {
          origin: {
            portCode: 'CNSHA',
            portName: 'Shanghai',
            city: 'Shanghai',
            country: 'China',
            coordinates: {
              latitude: 31.2304,
              longitude: 121.4737
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

    it('should successfully track a container shipment', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/containers', {
        params: {
          trackingNumber: mockTrackingNumber,
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true,
          language: 'en'
        }
      });

      expect(result).toEqual({
        provider: 'cosco',
        trackingNumber: mockTrackingNumber,
        data: {
          trackingNumber: mockTrackingNumber,
          carrier: 'COSCO',
          service: 'FCL',
          status: 'In Transit',
          timeline: [
            {
              id: 'evt-001',
              timestamp: new Date('2024-01-15T10:00:00Z'),
              status: 'Departed',
              location: 'Shanghai Port Terminal, Shanghai, China',
              description: 'Container departed from terminal',
              isCompleted: true,
              coordinates: {
                lat: 31.2304,
                lng: 121.4737
              }
            }
          ],
          containers: [
            {
              number: mockTrackingNumber,
              size: '40ft',
              type: 'GP',
              sealNumber: 'SEAL789012',
              weight: undefined,
              dimensions: undefined
            }
          ],
          vessel: {
            name: 'COSCO SHIPPING UNIVERSE',
            imo: 'IMO9795478',
            voyage: 'CSU001E',
            currentPosition: {
              lat: 31.0,
              lng: 121.0
            },
            eta: new Date('2024-01-25T08:00:00Z'),
            ata: undefined
          },
          route: {
            origin: {
              code: 'CNSHA',
              name: 'Shanghai',
              city: 'Shanghai',
              country: 'China',
              coordinates: {
                lat: 31.2304,
                lng: 121.4737
              },
              timezone: 'Asia/Shanghai'
            },
            destination: {
              code: 'USLAX',
              name: 'Los Angeles',
              city: 'Los Angeles',
              country: 'United States',
              coordinates: {
                lat: 33.7701,
                lng: -118.1937
              },
              timezone: 'America/Los_Angeles'
            },
            intermediateStops: [],
            estimatedTransitTime: 0,
            actualTransitTime: undefined
          },
          lastUpdated: new Date('2024-01-15T12:00:00Z')
        },
        timestamp: expect.any(Date),
        reliability: 0.82,
        status: 'success'
      });
    });

    it('should handle booking number tracking', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.trackShipment('BOOKING123', 'booking');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bookings', expect.any(Object));
    });

    it('should handle BOL tracking', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.trackShipment('BOL123', 'bol');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bills-of-lading', expect.any(Object));
    });

    it('should return error when API key is not configured', async () => {
      // Test the behavior by temporarily modifying the service's apiKey property
      const serviceWithoutKey = new COSCOAPIService();
      (serviceWithoutKey as any).apiKey = '';

      const result = await serviceWithoutKey.trackShipment(mockTrackingNumber, 'container');

      expect(result).toEqual({
        provider: 'cosco',
        trackingNumber: mockTrackingNumber,
        data: null,
        timestamp: expect.any(Date),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'cosco',
          errorType: 'AUTH_ERROR',
          message: 'COSCO API key not configured'
        }
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

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('not found in COSCO system');
    });

    it('should handle rate limit error', async () => {
      const error = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '120' },
          data: { message: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(120);
    });

    it('should handle timeout error', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('TIMEOUT');
    });

    it('should handle network error', async () => {
      const error = { code: 'ENOTFOUND' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NETWORK_ERROR');
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse);

      const result = await service.trackShipment(mockTrackingNumber, 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
    });
  });

  describe('Status and Event Mapping', () => {
    it('should map Chinese status codes correctly', () => {
      const service = new COSCOAPIService();
      
      // Test Chinese status mapping through a mock response
      const mockResponseWithChineseStatus = {
        data: {
          trackingNumber: 'TEST123',
          status: '运输中',
          carrier: 'COSCO',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithChineseStatus);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.status).toBe('In Transit');
      });
    });

    it('should map Chinese event codes correctly', () => {
      const mockResponseWithChineseEvents = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'COSCO',
          service: 'FCL',
          events: [
            {
              eventId: 'evt-001',
              eventDateTime: '2024-01-15T10:00:00Z',
              eventCode: '装船',
              eventDescription: '集装箱已装船',
              location: {
                locationName: '青岛港',
                city: '青岛',
                country: 'China'
              },
              isCompleted: true
            }
          ],
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithChineseEvents);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.timeline[0].status).toBe('Loaded');
      });
    });
  });

  describe('Configuration', () => {
    it('should return correct configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual({
        name: 'cosco',
        baseUrl: 'https://api.cosco-shipping.com/tracking',
        hasApiKey: true, // API key is set in test environment
        timeout: 15000,
        retryAttempts: 3,
        supportedTypes: ['container', 'booking', 'bol'],
        reliability: 0.82,
        specialization: 'Asia-Pacific routes and Chinese carrier data'
      });
    });

    it('should report availability based on API key', () => {
      expect(service.isAvailable()).toBe(true); // API key is set in test
    });
  });

  describe('Asia-Pacific Route Specialization', () => {
    it('should handle Asia-Pacific port timezones correctly', () => {
      const mockResponseWithAsianPorts = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'COSCO',
          service: 'FCL',
          events: [],
          route: {
            origin: {
              portCode: 'CNSHA',
              portName: 'Shanghai',
              city: 'Shanghai',
              country: 'China',
              coordinates: { latitude: 31.2304, longitude: 121.4737 }
            },
            destination: {
              portCode: 'SGSIN',
              portName: 'Singapore',
              city: 'Singapore',
              country: 'Singapore',
              coordinates: { latitude: 1.2966, longitude: 103.7764 }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithAsianPorts);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.route?.origin.timezone).toBe('Asia/Shanghai');
        expect(result.data?.route?.destination.timezone).toBe('Asia/Singapore');
      });
    });

    it('should handle trans-Pacific routes correctly', () => {
      const mockResponseWithTransPacificRoute = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'COSCO',
          service: 'FCL',
          events: [],
          route: {
            origin: {
              portCode: 'CNSHA',
              portName: 'Shanghai',
              city: 'Shanghai',
              country: 'China',
              coordinates: { latitude: 31.2304, longitude: 121.4737 }
            },
            destination: {
              portCode: 'USLAX',
              portName: 'Los Angeles',
              city: 'Los Angeles',
              country: 'United States',
              coordinates: { latitude: 33.7701, longitude: -118.1937 }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithTransPacificRoute);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.route?.origin.timezone).toBe('Asia/Shanghai');
        expect(result.data?.route?.destination.timezone).toBe('America/Los_Angeles');
      });
    });
  });
});