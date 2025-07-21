import { HapagLloydAPIService } from '../services/carriers/HapagLloydAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the config module
jest.mock('../config/environment', () => ({
  config: {
    apiKeys: {
      hapagLloyd: 'test-api-key'
    }
  }
}));

describe('HapagLloydAPIService', () => {
  let service: HapagLloydAPIService;
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
    service = new HapagLloydAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.hapag-lloyd.com/tracking',
        timeout: 12000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ShippingTracker/1.0',
          'X-API-Version': '2.0',
          'Accept-Language': 'en-US,de-DE'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('trackShipment', () => {
    const mockTrackingNumber = 'HLBU1234567';
    const mockResponse = {
      data: {
        trackingNumber: mockTrackingNumber,
        status: 'IN_TRANSIT',
        carrier: 'Hapag-Lloyd',
        service: 'FCL',
        events: [
          {
            eventId: 'evt-001',
            eventDateTime: '2024-01-15T10:00:00Z',
            eventCode: 'GATE_OUT',
            eventDescription: 'Container departed from terminal',
            location: {
              locationName: 'Hamburg Terminal',
              city: 'Hamburg',
              country: 'Germany',
              coordinates: {
                latitude: 53.5511,
                longitude: 9.9937
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
            sealNumber: 'SEAL345678'
          }
        ],
        vessel: {
          vesselName: 'HAPAG-LLOYD BERLIN',
          vesselIMO: 'IMO9454321',
          voyageNumber: 'HLB001E',
          currentPosition: {
            latitude: 53.0,
            longitude: 10.0
          },
          estimatedTimeOfArrival: '2024-01-22T14:00:00Z'
        },
        route: {
          origin: {
            portCode: 'DEHAM',
            portName: 'Hamburg',
            city: 'Hamburg',
            country: 'Germany',
            coordinates: {
              latitude: 53.5511,
              longitude: 9.9937
            }
          },
          destination: {
            portCode: 'USNYC',
            portName: 'New York',
            city: 'New York',
            country: 'United States',
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
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
        provider: 'hapag-lloyd',
        trackingNumber: mockTrackingNumber,
        data: {
          trackingNumber: mockTrackingNumber,
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          status: 'In Transit',
          timeline: [
            {
              id: 'evt-001',
              timestamp: new Date('2024-01-15T10:00:00Z'),
              status: 'Departed',
              location: 'Hamburg Terminal, Hamburg, Germany',
              description: 'Container departed from terminal',
              isCompleted: true,
              coordinates: {
                lat: 53.5511,
                lng: 9.9937
              }
            }
          ],
          containers: [
            {
              number: mockTrackingNumber,
              size: '40ft',
              type: 'HC',
              sealNumber: 'SEAL345678',
              weight: undefined,
              dimensions: undefined
            }
          ],
          vessel: {
            name: 'HAPAG-LLOYD BERLIN',
            imo: 'IMO9454321',
            voyage: 'HLB001E',
            currentPosition: {
              lat: 53.0,
              lng: 10.0
            },
            eta: new Date('2024-01-22T14:00:00Z'),
            ata: undefined
          },
          route: {
            origin: {
              code: 'DEHAM',
              name: 'Hamburg',
              city: 'Hamburg',
              country: 'Germany',
              coordinates: {
                lat: 53.5511,
                lng: 9.9937
              },
              timezone: 'Europe/Berlin'
            },
            destination: {
              code: 'USNYC',
              name: 'New York',
              city: 'New York',
              country: 'United States',
              coordinates: {
                lat: 40.7128,
                lng: -74.0060
              },
              timezone: 'America/New_York'
            },
            intermediateStops: [],
            estimatedTransitTime: 0,
            actualTransitTime: undefined
          },
          lastUpdated: new Date('2024-01-15T12:00:00Z')
        },
        timestamp: expect.any(Date),
        reliability: 0.90,
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
      const serviceWithoutKey = new HapagLloydAPIService();
      (serviceWithoutKey as any).apiKey = '';

      const result = await serviceWithoutKey.trackShipment(mockTrackingNumber, 'container');

      expect(result).toEqual({
        provider: 'hapag-lloyd',
        trackingNumber: mockTrackingNumber,
        data: null,
        timestamp: expect.any(Date),
        reliability: 0,
        status: 'error',
        error: {
          provider: 'hapag-lloyd',
          errorType: 'AUTH_ERROR',
          message: 'Hapag-Lloyd API key not configured'
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
      expect(result.error?.message).toContain('not found in Hapag-Lloyd system');
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
    it('should map German status codes correctly', () => {
      const service = new HapagLloydAPIService();
      
      // Test German status mapping through a mock response
      const mockResponseWithGermanStatus = {
        data: {
          trackingNumber: 'TEST123',
          status: 'UNTERWEGS',
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithGermanStatus);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.status).toBe('In Transit');
      });
    });

    it('should map German event codes correctly', () => {
      const mockResponseWithGermanEvents = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          events: [
            {
              eventId: 'evt-001',
              eventDateTime: '2024-01-15T10:00:00Z',
              eventCode: 'BELADEN',
              eventDescription: 'Container wurde beladen',
              location: {
                locationName: 'Bremerhaven Terminal',
                city: 'Bremerhaven',
                country: 'Germany'
              },
              isCompleted: true
            }
          ],
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithGermanEvents);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.timeline[0].status).toBe('Loaded');
      });
    });
  });

  describe('Configuration', () => {
    it('should return correct configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual({
        name: 'hapag-lloyd',
        baseUrl: 'https://api.hapag-lloyd.com/tracking',
        hasApiKey: true, // API key is set in test environment
        timeout: 12000,
        retryAttempts: 3,
        supportedTypes: ['container', 'booking', 'bol'],
        reliability: 0.90,
        specialization: 'Global coverage with European route optimization'
      });
    });

    it('should report availability based on API key', () => {
      expect(service.isAvailable()).toBe(true); // API key is set in test
    });
  });

  describe('Global Coverage Specialization', () => {
    it('should handle European port timezones correctly', () => {
      const mockResponseWithEuropeanPorts = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          events: [],
          route: {
            origin: {
              portCode: 'DEHAM',
              portName: 'Hamburg',
              city: 'Hamburg',
              country: 'Germany',
              coordinates: { latitude: 53.5511, longitude: 9.9937 }
            },
            destination: {
              portCode: 'NLRTM',
              portName: 'Rotterdam',
              city: 'Rotterdam',
              country: 'Netherlands',
              coordinates: { latitude: 51.9225, longitude: 4.4792 }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithEuropeanPorts);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.route?.origin.timezone).toBe('Europe/Berlin');
        expect(result.data?.route?.destination.timezone).toBe('Europe/Amsterdam');
      });
    });

    it('should handle trans-Atlantic routes correctly', () => {
      const mockResponseWithTransAtlanticRoute = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          events: [],
          route: {
            origin: {
              portCode: 'DEHAM',
              portName: 'Hamburg',
              city: 'Hamburg',
              country: 'Germany',
              coordinates: { latitude: 53.5511, longitude: 9.9937 }
            },
            destination: {
              portCode: 'USNYC',
              portName: 'New York',
              city: 'New York',
              country: 'United States',
              coordinates: { latitude: 40.7128, longitude: -74.0060 }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithTransAtlanticRoute);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.route?.origin.timezone).toBe('Europe/Berlin');
        expect(result.data?.route?.destination.timezone).toBe('America/New_York');
      });
    });

    it('should handle Asia-Europe routes correctly', () => {
      const mockResponseWithAsiaEuropeRoute = {
        data: {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Hapag-Lloyd',
          service: 'FCL',
          events: [],
          route: {
            origin: {
              portCode: 'SGSIN',
              portName: 'Singapore',
              city: 'Singapore',
              country: 'Singapore',
              coordinates: { latitude: 1.2966, longitude: 103.7764 }
            },
            destination: {
              portCode: 'DEHAM',
              portName: 'Hamburg',
              city: 'Hamburg',
              country: 'Germany',
              coordinates: { latitude: 53.5511, longitude: 9.9937 }
            }
          },
          lastUpdated: '2024-01-15T12:00:00Z'
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponseWithAsiaEuropeRoute);

      return service.trackShipment('TEST123', 'container').then(result => {
        expect(result.data?.route?.origin.timezone).toBe('Asia/Singapore');
        expect(result.data?.route?.destination.timezone).toBe('Europe/Berlin');
      });
    });
  });
});