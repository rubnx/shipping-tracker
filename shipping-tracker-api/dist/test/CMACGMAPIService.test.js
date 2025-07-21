"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CMACGMAPIService_1 = require("../services/carriers/CMACGMAPIService");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock('axios');
const mockedAxios = axios_1.default;
// Mock the config module
jest.mock('../config/environment', () => ({
    config: {
        apiKeys: {
            cmaCgm: 'test-api-key'
        }
    }
}));
describe('CMACGMAPIService', () => {
    let service;
    let mockAxiosInstance;
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
        service = new CMACGMAPIService_1.CMACGMAPIService();
    });
    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.cma-cgm.com/tracking',
                timeout: 12000,
                headers: {
                    'Authorization': 'Bearer test-api-key',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ShippingTracker/1.0',
                    'X-API-Version': '1.0',
                    'Accept-Language': 'en-US,fr-FR'
                }
            });
        });
        it('should set up request and response interceptors', () => {
            expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });
    describe('trackShipment', () => {
        const mockTrackingNumber = 'CMAU1234567';
        const mockResponse = {
            data: {
                trackingNumber: mockTrackingNumber,
                status: 'IN_TRANSIT',
                carrier: 'CMA CGM',
                service: 'FCL',
                events: [
                    {
                        eventId: 'evt-001',
                        eventDateTime: '2024-01-15T10:00:00Z',
                        eventCode: 'GATE_OUT',
                        eventDescription: 'Container departed from terminal',
                        location: {
                            locationName: 'Le Havre Terminal',
                            city: 'Le Havre',
                            country: 'France',
                            coordinates: {
                                latitude: 49.4944,
                                longitude: 0.1079
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
                        sealNumber: 'SEAL123456'
                    }
                ],
                vessel: {
                    vesselName: 'CMA CGM MARCO POLO',
                    vesselIMO: 'IMO9454436',
                    voyageNumber: 'MP001E',
                    currentPosition: {
                        latitude: 49.0,
                        longitude: 2.0
                    },
                    estimatedTimeOfArrival: '2024-01-20T08:00:00Z'
                },
                route: {
                    origin: {
                        portCode: 'FRLEH',
                        portName: 'Le Havre',
                        city: 'Le Havre',
                        country: 'France',
                        coordinates: {
                            latitude: 49.4944,
                            longitude: 0.1079
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
                provider: 'cma-cgm',
                trackingNumber: mockTrackingNumber,
                data: {
                    trackingNumber: mockTrackingNumber,
                    carrier: 'CMA CGM',
                    service: 'FCL',
                    status: 'In Transit',
                    timeline: [
                        {
                            id: 'evt-001',
                            timestamp: new Date('2024-01-15T10:00:00Z'),
                            status: 'Departed',
                            location: 'Le Havre Terminal, Le Havre, France',
                            description: 'Container departed from terminal',
                            isCompleted: true,
                            coordinates: {
                                lat: 49.4944,
                                lng: 0.1079
                            }
                        }
                    ],
                    containers: [
                        {
                            number: mockTrackingNumber,
                            size: '40ft',
                            type: 'GP',
                            sealNumber: 'SEAL123456',
                            weight: undefined,
                            dimensions: undefined
                        }
                    ],
                    vessel: {
                        name: 'CMA CGM MARCO POLO',
                        imo: 'IMO9454436',
                        voyage: 'MP001E',
                        currentPosition: {
                            lat: 49.0,
                            lng: 2.0
                        },
                        eta: new Date('2024-01-20T08:00:00Z'),
                        ata: undefined
                    },
                    route: {
                        origin: {
                            code: 'FRLEH',
                            name: 'Le Havre',
                            city: 'Le Havre',
                            country: 'France',
                            coordinates: {
                                lat: 49.4944,
                                lng: 0.1079
                            },
                            timezone: 'Europe/Paris'
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
                reliability: 0.85,
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
            // This is a more direct approach than trying to mock the config module
            const serviceWithoutKey = new CMACGMAPIService_1.CMACGMAPIService();
            // Access the private apiKey property through type assertion
            serviceWithoutKey.apiKey = '';
            const result = await serviceWithoutKey.trackShipment(mockTrackingNumber, 'container');
            expect(result).toEqual({
                provider: 'cma-cgm',
                trackingNumber: mockTrackingNumber,
                data: null,
                timestamp: expect.any(Date),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'cma-cgm',
                    errorType: 'AUTH_ERROR',
                    message: 'CMA CGM API key not configured'
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
            expect(result.error?.message).toContain('not found in CMA CGM system');
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
        it('should map French status codes correctly', () => {
            const service = new CMACGMAPIService_1.CMACGMAPIService();
            // Test French status mapping through a mock response
            const mockResponseWithFrenchStatus = {
                data: {
                    trackingNumber: 'TEST123',
                    status: 'EN_COURS',
                    carrier: 'CMA CGM',
                    service: 'FCL',
                    events: [],
                    lastUpdated: '2024-01-15T12:00:00Z'
                }
            };
            mockAxiosInstance.get.mockResolvedValue(mockResponseWithFrenchStatus);
            return service.trackShipment('TEST123', 'container').then(result => {
                expect(result.data?.status).toBe('In Transit');
            });
        });
        it('should map French event codes correctly', () => {
            const mockResponseWithFrenchEvents = {
                data: {
                    trackingNumber: 'TEST123',
                    status: 'IN_TRANSIT',
                    carrier: 'CMA CGM',
                    service: 'FCL',
                    events: [
                        {
                            eventId: 'evt-001',
                            eventDateTime: '2024-01-15T10:00:00Z',
                            eventCode: 'CHARGEMENT',
                            eventDescription: 'Conteneur chargé',
                            location: {
                                locationName: 'Terminal de Marseille',
                                city: 'Marseille',
                                country: 'France'
                            },
                            isCompleted: true
                        }
                    ],
                    lastUpdated: '2024-01-15T12:00:00Z'
                }
            };
            mockAxiosInstance.get.mockResolvedValue(mockResponseWithFrenchEvents);
            return service.trackShipment('TEST123', 'container').then(result => {
                expect(result.data?.timeline[0].status).toBe('Loaded');
            });
        });
    });
    describe('Configuration', () => {
        it('should return correct configuration', () => {
            const config = service.getConfig();
            expect(config).toEqual({
                name: 'cma-cgm',
                baseUrl: 'https://api.cma-cgm.com/tracking',
                hasApiKey: true, // API key is set in test environment
                timeout: 12000,
                retryAttempts: 3,
                supportedTypes: ['container', 'booking', 'bol'],
                reliability: 0.85,
                specialization: 'European routes and French carrier data'
            });
        });
        it('should report availability based on API key', () => {
            expect(service.isAvailable()).toBe(true); // API key is set in test
        });
    });
    describe('European Route Specialization', () => {
        it('should handle European port timezones correctly', () => {
            const mockResponseWithEuropeanPorts = {
                data: {
                    trackingNumber: 'TEST123',
                    status: 'IN_TRANSIT',
                    carrier: 'CMA CGM',
                    service: 'FCL',
                    events: [],
                    route: {
                        origin: {
                            portCode: 'FRLEH',
                            portName: 'Le Havre',
                            city: 'Le Havre',
                            country: 'France',
                            coordinates: { latitude: 49.4944, longitude: 0.1079 }
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
            mockAxiosInstance.get.mockResolvedValue(mockResponseWithEuropeanPorts);
            return service.trackShipment('TEST123', 'container').then(result => {
                expect(result.data?.route?.origin.timezone).toBe('Europe/Paris');
                expect(result.data?.route?.destination.timezone).toBe('Europe/Berlin');
            });
        });
    });
});
//# sourceMappingURL=CMACGMAPIService.test.js.map