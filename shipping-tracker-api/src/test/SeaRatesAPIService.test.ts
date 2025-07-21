import { SeaRatesAPIService } from '../services/carriers/SeaRatesAPIService';
import { TrackingType } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment config
jest.mock('../config/environment', () => ({
  config: {
    apiKeys: {
      searates: 'test-searates-api-key'
    }
  }
}));

describe('SeaRatesAPIService', () => {
  let searatesService: SeaRatesAPIService;
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
    
    searatesService = new SeaRatesAPIService();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.searates.com/tracking',
        timeout: 8000,
        headers: {
          'Authorization': 'Bearer test-searates-api-key',
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
    const mockSeaRatesResponse = {
      trackingNumber: 'SRCU1234567',
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
            locationName: 'Dubai Port',
            city: 'Dubai',
            country: 'UAE',
            portCode: 'AEJEA',
            coordinates: {
              latitude: 25.2048,
              longitude: 55.2708
            }
          },
          isCompleted: true,
          estimatedDateTime: '2024-01-15T09:30:00Z'
        },
        {
          eventId: 'evt-002',
          eventDateTime: '2024-01-16T08:30:00Z',
          eventType: 'VESSEL_DEPARTURE',
          eventDescription: 'Vessel departed from port',
          location: {
            locationName: 'Dubai Port',
            city: 'Dubai',
            country: 'UAE',
            portCode: 'AEJEA'
          },
          isCompleted: true
        }
      ],
      containers: [
        {
          containerNumber: 'SRCU1234567',
          containerSize: '40ft',
          containerType: 'GP',
          sealNumber: 'SR123456',
          weight: {
            value: 22000,
            unit: 'kg'
          }
        }
      ],
      vessel: {
        vesselName: 'SeaRates Trader',
        vesselIMO: 'IMO5555555',
        voyageNumber: 'V005',
        currentPosition: {
          latitude: 26.0,
          longitude: 56.0
        },
        estimatedTimeOfArrival: '2024-02-15T20:00:00Z'
      },
      route: {
        origin: {
          portCode: 'AEJEA',
          portName: 'Dubai Port',
          city: 'Dubai',
          country: 'UAE',
          coordinates: {
            latitude: 25.2048,
            longitude: 55.2708
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
        },
        transitTime: 30,
        distance: 9500
      },
      rates: {
        estimatedCost: {
          value: 2500,
          currency: 'USD'
        },
        transitTime: 30,
        routeOptimization: 'cost-optimized',
        alternativeRoutes: [
          {
            route: 'Dubai -> Suez -> Los Angeles',
            cost: 2500,
            transitTime: 30
          },
          {
            route: 'Dubai -> Singapore -> Los Angeles',
            cost: 2800,
            transitTime: 28
          }
        ]
      },
      lastUpdated: '2024-01-16T09:00:00Z',
      dataSource: 'searates'
    };

    it('should successfully track a container number', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/container', {
        params: {
          trackingNumber: 'SRCU1234567',
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true,
          includeRates: true,
          includeOptimization: true
        }
      });

      expect(result.status).toBe('success');
      expect(result.provider).toBe('searates');
      expect(result.trackingNumber).toBe('SRCU1234567');
      expect(result.reliability).toBe(0.85);
      expect(result.data.carrier).toBe('Multiple Carriers');
      expect(result.data.status).toBe('In Transit');
    });

    it('should successfully track a booking number', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRBOOK123', 'booking');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/booking', {
        params: {
          trackingNumber: 'SRBOOK123',
          includeEvents: true,
          includeContainers: true,
          includeVessel: true,
          includeRoute: true,
          includeRates: true,
          includeOptimization: true
        }
      });

      expect(result.status).toBe('success');
    });

    it('should reject BOL tracking', async () => {
      const result = await searatesService.trackShipment('BOL123456', 'bol');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('INVALID_RESPONSE');
      expect(result.error?.message).toContain('does not support BOL tracking');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should transform timeline events correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.data.timeline).toHaveLength(2);
      expect(result.data.timeline[0]).toMatchObject({
        id: 'evt-001',
        status: 'Departed',
        location: 'Dubai Port, Dubai, UAE',
        description: 'Container departed from terminal',
        isCompleted: true,
        coordinates: {
          lat: 25.2048,
          lng: 55.2708
        }
      });
    });

    it('should transform container information correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.data.containers).toHaveLength(1);
      expect(result.data.containers[0]).toMatchObject({
        number: 'SRCU1234567',
        size: '40ft',
        type: 'GP',
        sealNumber: 'SR123456',
        weight: 22000
      });
    });

    it('should transform vessel information correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.data.vessel).toMatchObject({
        name: 'SeaRates Trader',
        imo: 'IMO5555555',
        voyage: 'V005',
        currentPosition: {
          lat: 26.0,
          lng: 56.0
        },
        eta: new Date('2024-02-15T20:00:00Z')
      });
    });

    it('should transform route information with cost analysis', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.data.route).toBeDefined();
      expect(result.data.route?.origin.code).toBe('AEJEA');
      expect(result.data.route?.destination.code).toBe('USLAX');
      expect(result.data.route?.estimatedTransitTime).toBe(30);
    });

    it('should include rates and cost analysis data', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.data.rates).toBeDefined();
      expect(result.data.rates.estimatedCost).toEqual({
        value: 2500,
        currency: 'USD'
      });
      expect(result.data.rates.alternativeRoutes).toHaveLength(2);
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

      const result = await searatesService.trackShipment('INVALID123', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NOT_FOUND');
      expect(result.error?.message).toContain('not found in SeaRates system');
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

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('Invalid or expired SeaRates API key');
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

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

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

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('RATE_LIMIT');
      expect(result.error?.retryAfter).toBe(3600); // 1 hour
      expect(result.error?.message).toContain('freemium quota exceeded');
    });

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('TIMEOUT');
      expect(result.error?.message).toBe('SeaRates API request timeout');
    });

    it('should handle network errors', async () => {
      const error = { code: 'ENOTFOUND' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('Unable to connect to SeaRates API');
    });

    it('should retry on failure up to maximum attempts (2 for aggregator)', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2); // 2 retry attempts
      expect(result.status).toBe('error');
    });

    it('should succeed on retry after initial failure', async () => {
      const error = { code: 'ECONNABORTED' };
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: mockSeaRatesResponse });

      const result = await searatesService.trackShipment('SRCU1234567', 'container');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('success');
    });

    it('should handle missing API key gracefully', async () => {
      const serviceWithoutKey = new SeaRatesAPIService();
      (serviceWithoutKey as any).apiKey = '';
      
      const result = await serviceWithoutKey.trackShipment('SRCU1234567', 'container');
      
      expect(result.status).toBe('error');
      expect(result.error?.errorType).toBe('AUTH_ERROR');
      expect(result.error?.message).toBe('SeaRates API key not configured');
    });
  });

  describe('getShippingRates', () => {
    const mockRatesResponse = {
      estimatedCost: {
        value: 2500,
        currency: 'USD'
      },
      transitTime: 30,
      routeOptimization: 'cost-optimized',
      alternativeRoutes: [
        {
          route: 'Dubai -> Suez -> Los Angeles',
          cost: 2500,
          transitTime: 30
        },
        {
          route: 'Dubai -> Singapore -> Los Angeles',
          cost: 2800,
          transitTime: 28
        }
      ]
    };

    it('should successfully get shipping rates', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockRatesResponse });

      const result = await searatesService.getShippingRates('AEJEA', 'USLAX', '40ft');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/rates', {
        params: {
          origin: 'AEJEA',
          destination: 'USLAX',
          containerType: '40ft',
          includeAlternatives: true,
          includeOptimization: true
        }
      });

      expect(result).toEqual(mockRatesResponse);
    });

    it('should return null on rates error', async () => {
      const error = { response: { status: 404 } };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searatesService.getShippingRates('INVALID', 'INVALID');

      expect(result).toBeNull();
    });

    it('should return null when API key is not configured', async () => {
      const serviceWithoutKey = new SeaRatesAPIService();
      (serviceWithoutKey as any).apiKey = '';

      const result = await serviceWithoutKey.getShippingRates('AEJEA', 'USLAX');

      expect(result).toBeNull();
    });
  });

  describe('getRouteOptimization', () => {
    const mockOptimizationResponse = {
      recommendedRoute: 'Dubai -> Suez -> Los Angeles',
      priority: 'cost',
      alternatives: [
        {
          route: 'Dubai -> Singapore -> Los Angeles',
          score: 85,
          benefits: ['Faster transit', 'Better reliability']
        }
      ]
    };

    it('should successfully get route optimization', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockOptimizationResponse });

      const result = await searatesService.getRouteOptimization('AEJEA', 'USLAX', {
        priority: 'cost',
        maxTransshipments: 2
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/optimize', {
        params: {
          origin: 'AEJEA',
          destination: 'USLAX',
          priority: 'cost',
          maxTransshipments: 2
        }
      });

      expect(result).toEqual(mockOptimizationResponse);
    });

    it('should use default preferences when not provided', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockOptimizationResponse });

      const result = await searatesService.getRouteOptimization('AEJEA', 'USLAX');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/optimize', {
        params: {
          origin: 'AEJEA',
          destination: 'USLAX',
          priority: 'cost',
          maxTransshipments: 2
        }
      });
    });

    it('should return null on optimization error', async () => {
      const error = { response: { status: 500 } };
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await searatesService.getRouteOptimization('AEJEA', 'USLAX');

      expect(result).toBeNull();
    });
  });

  describe('Status and Type Mapping', () => {
    it('should map SeaRates statuses correctly', async () => {
      const testCases = [
        { srStatus: 'PLANNED', expectedStatus: 'Planned' },
        { srStatus: 'IN_TRANSIT', expectedStatus: 'In Transit' },
        { srStatus: 'DELIVERED', expectedStatus: 'Delivered' },
        { srStatus: 'LOADING', expectedStatus: 'Loading' },
        { srStatus: 'DISCHARGING', expectedStatus: 'Discharging' },
        { srStatus: 'UNKNOWN_STATUS', expectedStatus: 'UNKNOWN_STATUS' }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          trackingNumber: 'TEST123',
          status: testCase.srStatus,
          carrier: 'Test Carrier',
          service: 'FCL',
          events: [],
          lastUpdated: '2024-01-16T09:00:00Z',
          dataSource: 'test'
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
        const result = await searatesService.trackShipment('TEST123', 'container');
        
        expect(result.data.status).toBe(testCase.expectedStatus);
      }
    });

    it('should map SeaRates event types correctly', async () => {
      const testCases = [
        { eventType: 'GATE_OUT', expectedStatus: 'Departed' },
        { eventType: 'GATE_IN', expectedStatus: 'Arrived' },
        { eventType: 'LOADED', expectedStatus: 'Loaded' },
        { eventType: 'DISCHARGED', expectedStatus: 'Discharged' },
        { eventType: 'VESSEL_DEPARTURE', expectedStatus: 'Vessel Departed' },
        { eventType: 'VESSEL_ARRIVAL', expectedStatus: 'Vessel Arrived' },
        { eventType: 'TRANSSHIPMENT', expectedStatus: 'Transshipment' },
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
        const result = await searatesService.trackShipment('TEST123', 'container');
        
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
      const result = await searatesService.trackShipment('TEST123', 'container');
      
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
      const config = searatesService.getConfig();
      expect(config.supportedTypes).toEqual(['container', 'booking']);
      expect(config.tier).toBe('freemium');
      expect(config.limitations).toContain('No BOL tracking');
    });

    it('should have appropriate rate limits for freemium tier', () => {
      const config = searatesService.getConfig();
      expect(config.rateLimits?.perMinute).toBe(60);
      expect(config.rateLimits?.perHour).toBe(1000);
    });

    it('should list cost analysis features', () => {
      const config = searatesService.getConfig();
      expect(config.features).toContain('Shipping rates analysis');
      expect(config.features).toContain('Route optimization');
      expect(config.features).toContain('Cost comparison');
      expect(config.features).toContain('Alternative routes');
    });

    it('should list specialties in cost analysis', () => {
      const config = searatesService.getConfig();
      expect(config.specialties).toContain('Cost analysis');
      expect(config.specialties).toContain('Route optimization');
      expect(config.specialties).toContain('Shipping rates');
    });

    it('should provide optimization priorities', () => {
      const priorities = searatesService.getOptimizationPriorities();
      expect(priorities).toEqual(['cost', 'time', 'reliability']);
    });

    it('should provide supported container types', () => {
      const containerTypes = searatesService.getSupportedContainerTypes();
      expect(containerTypes).toEqual(['20ft', '40ft', '45ft']);
    });
  });

  describe('Utility Methods', () => {
    it('should return availability status', () => {
      expect(searatesService.isAvailable()).toBe(true);
    });

    it('should return comprehensive configuration info', () => {
      const config = searatesService.getConfig();
      
      expect(config).toMatchObject({
        name: 'searates',
        baseUrl: 'https://api.searates.com/tracking',
        hasApiKey: true,
        timeout: 8000,
        retryAttempts: 2,
        supportedTypes: ['container', 'booking'],
        reliability: 0.85,
        tier: 'freemium'
      });
      
      expect(config.features).toBeInstanceOf(Array);
      expect(config.limitations).toBeInstanceOf(Array);
      expect(config.specialties).toBeInstanceOf(Array);
      expect(config.features.length).toBeGreaterThan(0);
      expect(config.limitations.length).toBeGreaterThan(0);
      expect(config.specialties.length).toBeGreaterThan(0);
    });
  });
});