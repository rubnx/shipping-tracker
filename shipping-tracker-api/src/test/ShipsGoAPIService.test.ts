import { ShipsGoAPIService } from '../services/carriers/ShipsGoAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment config
jest.mock('../config/environment', () => ({
  config: {
    apiKeys: {
      shipsgo: 'test-shipsgo-api-key'
    }
  }
}));

describe('ShipsGoAPIService', () => {
  let shipsGoService: ShipsGoAPIService;
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
    
    shipsGoService = new ShipsGoAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.shipsgo.com/v2/tracking',
        timeout: 8000,
        headers: {
          'Authorization': 'Bearer test-shipsgo-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ShippingTracker/1.0',
          'X-API-Version': '2.0'
        }
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('trackShipment', () => {
    const mockShipsGoResponse = {
      trackingNumber: 'SGCU1234567',
      status: 'IN_TRANSIT',
      carrier: 'Multiple Carriers',
      service: 'FCL',
      events: [
        {
          eventId: 'evt-001',
          eventDateTime: '2024-01-15T10:00:00Z',
          eventCode: 'GATE_OUT',
          eventDescription: 'Container departed from terminal',
          location: {
            locationName: 'Singapore Port',
            city: 'Singapore',
            country: 'Singapore',
            portCode: 'SGSIN',
            coordinates: {
              latitude: 1.2966,
              longitude: 103.8006
            }
          },
          isCompleted: true,
          actualDateTime: '2024-01-15T10:00:00Z'
        },
        {
          eventId: 'evt-002',
          eventDateTime: '2024-01-16T08:30:00Z',
          eventCode: 'DEPA',
          eventDescription: 'Vessel departed from port',
          location: {
            locationName: 'Singapore Port',
            city: 'Singapore',
            country: 'Singapore',
            portCode: 'SGSIN'
          },
          isCompleted: true
        }
      ],
      containers: [
        {
          containerNumber: 'SGCU1234567',
          containerSize: '40ft',
          containerType: 'GP',
          sealNumber: 'SG123456',
          weight: {
            value: 24000,
            unit: 'kg'
          },
          dimensions: {
            length: 12.2,
            width: 2.4,
            height: 2.6,
            unit: 'm'
          }
        }
      ],
      vessel: {
        vesselName: 'ShipsGo Express',
        vesselIMO: 'IMO9876543',
        voyageNumber: 'V004',
        currentPosition: {
          latitude: 2.0,
          longitude: 105.0,
          timestamp: '2024-01-16T12:00:00Z'
        },
        estimatedTimeOfArrival: '2024-02-10T18:00:00Z',
        speed: 18.5,
        heading: 270
      },
      route: {
        origin: {
          portCode: 'SGSIN',
          portName: 'Singapore Port',
          city: 'Singapore',
          country: 'Singapore',
          coordinates: {
            latitude: 1.2966,
            longitude: 103.8006
          },
          departureTime: '2024-01-16T08:30:00Z'
        },
        destination: {
          portCode: 'USLAX',
          portName: 'Los Angeles Port',
          city: 'Los Angeles',
          country: 'USA',
          coordinates: {
            latitude: 33.7361,
            longitude: -118.2639
          },
          arrivalTime: '2024-02-10T18:00:00Z'
        },
        intermediateStops: [
          {
            portCode: 'HKHKG',
            portName: 'Hong Kong Port',
            city: 'Hong Kong',
            country: 'Hong Kong',
            coordinates: {
              latitude: 22.3193,
              longitude: 114.1694
            },
            estimatedArrival: '2024-01-20T14:00:00Z'
          }
        ],
        totalDistance: 8500,
        estimatedTransitTime: 25
      },
      ports: [
        {
          portCode: 'SGSIN',
          portName: 'Singapore Port',
          congestionLevel: 'low',
          averageWaitTime: 2,
          weatherConditions: 'Clear',
          operationalStatus: 'normal'
        }
      ],
      lastUpdated: '2024-01-16T09:00:00Z',
      dataSource: 'aggregated',
      aggregatedFrom: ['Maersk', 'MSC', 'CMA CGM']
    };

    it('should successfully track a container number', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/container', {
        params: {
          trackingNumber: 'SGCU1234567',
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true,
          includePorts: true,
          aggregateData: true
        }
      });

      expect(result.status).toBe('success');
      expect(result.provider).toBe('shipsgo');
      expect(result.trackingNumber).toBe('SGCU1234567');
      expect(result.reliability).toBe(0.88);
      expect(result.data.carrier).toBe('Multiple Carriers');
      expect(result.data.status).toBe('In Transit');
    });

    it('should successfully track a booking number', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGBOOK123', 'booking');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/booking', {
        params: {
          trackingNumber: 'SGBOOK123',
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true,
          includePorts: true,
          aggregateData: true
        }
      });

      expect(result.status).toBe('success');
    });

    it('should reject BOL tracking', async () => {
      const result = await shipsGoService.trackShipment('BOL123456', 'bol');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toContain('does not support BOL tracking');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should transform timeline events correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.data.timeline).toHaveLength(2);
      expect(result.data.timeline[0]).toMatchObject({
        id: 'evt-001',
        status: 'Departed',
        location: 'Singapore Port, Singapore, Singapore',
        description: 'Container departed from terminal',
        isCompleted: true,
        coordinates: {
          lat: 1.2966,
          lng: 103.8006
        }
      });
    });

    it('should transform container information correctly with dimensions', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.data.containers).toHaveLength(1);
      expect(result.data.containers[0]).toMatchObject({
        number: 'SGCU1234567',
        size: '40ft',
        type: 'GP',
        sealNumber: 'SG123456',
        weight: 24000,
        dimensions: {
          length: 12.2,
          width: 2.4,
          height: 2.6,
          unit: 'm'
        }
      });
    });

    it('should transform vessel information correctly with enhanced data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.data.vessel).toMatchObject({
        name: 'ShipsGo Express',
        imo: 'IMO9876543',
        voyage: 'V004',
        currentPosition: {
          lat: 2.0,
          lng: 105.0
        },
        eta: new Date('2024-02-10T18:00:00Z')
      });
    });

    it('should transform route information with intermediate stops', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.data.route).toBeDefined();
      expect(result.data.route?.origin.code).toBe('SGSIN');
      expect(result.data.route?.destination.code).toBe('USLAX');
      expect(result.data.route?.intermediateStops).toHaveLength(1);
      expect(result.data.route?.intermediateStops[0].code).toBe('HKHKG');
      expect(result.data.route?.estimatedTransitTime).toBe(25);
    });

    it('should handle aggregated data source information', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.data.dataSource).toBe('aggregated');
      expect(result.data.aggregatedFrom).toEqual(['Maersk', 'MSC', 'CMA CGM']);
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

      const result = await shipsGoService.trackShipment('INVALID123', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('not found in ShipsGo system');
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

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('Invalid or expired ShipsGo API key');
    });

    it('should handle 429 rate limit errors', async () => {
      const error = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '60' },
          data: { message: 'Rate limit exceeded' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(60);
    });

    it('should handle 402 payment required (freemium quota exceeded)', async () => {
      const error = {
        response: {
          status: 402,
          statusText: 'Payment Required',
          data: { message: 'Freemium quota exceeded' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(3600); // 1 hour
      expect(result.error?.message).toContain('freemium quota exceeded');
    });

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('TIMEOUT');
      expect(result.error?.message).toBe('ShipsGo API request timeout');
    });

    it('should handle network errors', async () => {
      const error = { code: 'ENOTFOUND' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Unable to connect to ShipsGo API');
    });

    it('should retry on failure up to maximum attempts (2 for aggregator)', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2); // 2 retry attempts
      expect(result.status).toBe('error');
    });

    it('should succeed on retry after initial failure', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockShipsGoResponse });

      const result = await shipsGoService.trackShipment('SGCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
    });

    it('should handle missing API key gracefully', async () => {
      const serviceWithoutKey = new ShipsGoAPIService();
      (serviceWithoutKey as any).apiKey = '';
      
      const result = await serviceWithoutKey.trackShipment('SGCU1234567', 'container');
      
      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('ShipsGo API key not configured');
    });
  });

  describe('trackVessel', () => {
    const mockVesselResponse = {
      vesselName: 'Test Vessel',
      vesselIMO: 'IMO1234567',
      voyageNumber: 'V001',
      status: 'In Transit',
      currentPosition: {
        latitude: 35.0,
        longitude: 125.0,
        timestamp: '2024-01-16T12:00:00Z'
      },
      route: {
        origin: {
          portCode: 'SGSIN',
          portName: 'Singapore Port',
          city: 'Singapore',
          country: 'Singapore',
          coordinates: { latitude: 1.2966, longitude: 103.8006 }
        },
        destination: {
          portCode: 'USLAX',
          portName: 'Los Angeles Port',
          city: 'Los Angeles',
          country: 'USA',
          coordinates: { latitude: 33.7361, longitude: -118.2639 }
        }
      },
      containers: []
    };

    it('should successfully track a vessel by IMO', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockVesselResponse });

      const result = await shipsGoService.trackVessel('IMO1234567');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/vessel', {
        params: {
          imo: 'IMO1234567',
          includePosition: true,
          includeRoute: true,
          includeContainers: true
        }
      });

      expect(result.status).toBe('success');
      expect(result.provider).toBe('shipsgo');
      expect(result.data.vessel?.name).toBe('Test Vessel');
      expect(result.data.vessel?.currentPosition).toEqual({
        lat: 35.0,
        lng: 125.0
      });
    });

    it('should handle vessel tracking errors', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Vessel not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.trackVessel('IMO9999999');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NOT_FOUND');
    });
  });

  describe('getPortInfo', () => {
    const mockPortInfo = {
      portCode: 'SGSIN',
      portName: 'Singapore Port',
      congestionLevel: 'low',
      averageWaitTime: 2,
      weatherConditions: 'Clear',
      operationalStatus: 'normal'
    };

    it('should successfully get port information', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockPortInfo });

      const result = await shipsGoService.getPortInfo('SGSIN');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/port', {
        params: {
          portCode: 'SGSIN',
          includeCongestion: true,
          includeWeather: true
        }
      });

      expect(result).toEqual(mockPortInfo);
    });

    it('should return null on port info error', async () => {
      const error = { response: { status: 404 } };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await shipsGoService.getPortInfo('INVALID');

      expect(result).toBeNull();
    });

    it('should return null when API key is not configured', async () => {
      const serviceWithoutKey = new ShipsGoAPIService();
      (serviceWithoutKey as any).apiKey = '';

      const result = await serviceWithoutKey.getPortInfo('SGSIN');

      expect(result).toBeNull();
    });
  });

  describe('Status and Type Mapping', () => {
    it('should map ShipsGo statuses correctly', async () => {
      const testCases = [
        { sgStatus: 'PLANNED', expectedStatus: 'Planned' },
        { sgStatus: 'IN_TRANSIT', expectedStatus: 'In Transit' },
        { sgStatus: 'DELIVERED', expectedStatus: 'Delivered' },
        { sgStatus: 'LOADING', expectedStatus: 'Loading' },
        { sgStatus: 'DISCHARGING', expectedStatus: 'Discharging' },
        { sgStatus: 'UNKNOWN_STATUS', expectedStatus: 'UNKNOWN_STATUS' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          trackingNumber: 'TEST123',
          status: testCase.sgStatus,
          carrier: 'Test Carrier',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-16T09:00:00Z',
          dataSource: 'test',
          aggregatedFrom: []
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
        const result = await shipsGoService.trackShipment('TEST123', 'container');
        
        expect(result.data.status).toBe(testCase.expectedStatus);
      }
    });

    it('should map ShipsGo event codes correctly', async () => {
      const testCases = [
        { eventCode: 'GATE_OUT', expectedStatus: 'Departed' },
        { eventCode: 'GATE_IN', expectedStatus: 'Arrived' },
        { eventCode: 'LOAD', expectedStatus: 'Loaded' },
        { eventCode: 'DISC', expectedStatus: 'Discharged' },
        { eventCode: 'TMPS', expectedStatus: 'Transshipment' },
        { eventCode: 'STUF', expectedStatus: 'Stuffed' },
        { eventCode: 'STRP', expectedStatus: 'Stripped' },
        { eventCode: 'CUSTOM_EVENT', expectedStatus: 'CUSTOM EVENT' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          trackingNumber: 'TEST123',
          status: 'IN_TRANSIT',
          carrier: 'Test Carrier',
          service: 'FCL',
          events: [{
            eventId: 'test-event',
            eventDateTime: '2024-01-15T10:00:00Z',
            eventCode: testCase.eventCode,
            eventDescription: 'Test event',
            location: { locationName: 'Test Port' },
            isCompleted: true
          }],
          lastUpdated: '2024-01-16T09:00:00Z',
          dataSource: 'test',
          aggregatedFrom: []
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
        const result = await shipsGoService.trackShipment('TEST123', 'container');
        
        expect(result.data.timeline[0].status).toBe(testCase.expectedStatus);
      }
    });

    it('should handle missing optional data gracefully', async () => {
      const minimalResponse = {
        trackingNumber: 'TEST123',
        status: 'IN_TRANSIT',
        events: [],
        lastUpdated: '2024-01-16T09:00:00Z'
      };

      mockAxiosInstance.get.mockResolvedValue({ data: minimalResponse });
      const result = await shipsGoService.trackShipment('TEST123', 'container');
      
      expect(result.status).toBe('success');
      expect(result.data.carrier).toBe('Multiple Carriers');
      expect(result.data.service).toBe('FCL');
      expect(result.data.containers).toHaveLength(0);
      expect(result.data.vessel).toBeUndefined();
      expect(result.data.route).toBeUndefined();
    });
  });

  describe('Freemium Features', () => {
    it('should support container and booking tracking only', () => {
      const config = shipsGoService.getConfig();
      expect(config.supportedTypes).toEqual(['container', 'booking']);
      expect(config.tier).toBe('freemium');
      expect(config.limitations).toContain('No BOL tracking');
    });

    it('should have appropriate rate limits for freemium tier', () => {
      const config = shipsGoService.getConfig();
      expect(config.rateLimits?.perMinute).toBe(100);
      expect(config.rateLimits?.perHour).toBe(2000);
    });

    it('should list supported features', () => {
      const config = shipsGoService.getConfig();
      expect(config.features).toContain('Multi-carrier aggregation');
      expect(config.features).toContain('Vessel tracking');
      expect(config.features).toContain('Port information');
      expect(config.features).toContain('Real-time positions');
    });

    it('should provide list of supported carriers', () => {
      const carriers = shipsGoService.getSupportedCarriers();
      expect(carriers).toContain('Maersk');
      expect(carriers).toContain('MSC');
      expect(carriers).toContain('CMA CGM');
      expect(carriers).toContain('COSCO');
      expect(carriers.length).toBeGreaterThan(10);
    });
  });

  describe('Utility Methods', () => {
    it('should return availability status', () => {
      expect(shipsGoService.isAvailable()).toBe(true);
    });

    it('should return comprehensive configuration info', () => {
      const config = shipsGoService.getConfig();
      
      expect(config).toMatchObject({
        name: 'shipsgo',
        baseUrl: 'https://api.shipsgo.com/v2/tracking',
        hasApiKey: true,
        timeout: 8000,
        retryAttempts: 2,
        supportedTypes: ['container', 'booking'],
        reliability: 0.88,
        tier: 'freemium'
      });
      
      expect(config.features).toBeInstanceOf(Array);
      expect(config.limitations).toBeInstanceOf(Array);
      expect(config.features.length).toBeGreaterThan(0);
      expect(config.limitations.length).toBeGreaterThan(0);
    });
  });
});