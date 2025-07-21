"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EvergreenAPIService_1 = require("../services/carriers/EvergreenAPIService");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('EvergreenAPIService', () => {
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
        service = new EvergreenAPIService_1.EvergreenAPIService();
    });
    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.evergreen-line.com/track',
                timeout: 12000,
                headers: {
                    'Authorization': 'Bearer ',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ShippingTracker/1.0',
                    'X-API-Region': 'asia-pacific'
                }
            });
        });
        it('should set up request and response interceptors', () => {
            expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });
    describe('trackShipment', () => {
        const mockTrackingNumber = 'EGLV123456789';
        const mockTrackingType = 'container';
        it('should return error when API key is not configured', async () => {
            const result = await service.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result).toEqual({
                provider: 'evergreen',
                trackingNumber: mockTrackingNumber,
                data: null,
                timestamp: expect.any(Date),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'evergreen',
                    errorType: 'AUTH_ERROR',
                    message: 'Evergreen API key not configured'
                }
            });
        });
        it('should successfully track container shipment', async () => {
            // Mock successful API response
            const mockApiResponse = {
                data: {
                    trackingNumber: mockTrackingNumber,
                    status: 'IN_TRANSIT',
                    carrier: 'Evergreen Line',
                    service: 'FCL',
                    events: [
                        {
                            eventId: 'evt-001',
                            eventDateTime: '2024-01-15T10:00:00Z',
                            eventType: 'LOADED_ON_VESSEL',
                            eventDescription: 'Container loaded on vessel',
                            location: {
                                locationName: 'Kaohsiung Port',
                                city: 'Kaohsiung',
                                country: 'Taiwan',
                                coordinates: {
                                    latitude: 22.6273,
                                    longitude: 120.3014
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
                        vesselName: 'Ever Given',
                        vesselIMO: 'IMO9811000',
                        voyageNumber: 'EG001E',
                        currentPosition: {
                            latitude: 25.0330,
                            longitude: 121.5654
                        },
                        estimatedTimeOfArrival: '2024-01-20T08:00:00Z'
                    },
                    route: {
                        origin: {
                            portCode: 'TWKHH',
                            portName: 'Kaohsiung',
                            city: 'Kaohsiung',
                            country: 'Taiwan',
                            coordinates: {
                                latitude: 22.6273,
                                longitude: 120.3014
                            }
                        },
                        destination: {
                            portCode: 'JPYOK',
                            portName: 'Yokohama',
                            city: 'Yokohama',
                            country: 'Japan',
                            coordinates: {
                                latitude: 35.4437,
                                longitude: 139.6380
                            }
                        }
                    },
                    lastUpdated: '2024-01-15T12:00:00Z'
                }
            };
            mockAxiosInstance.get.mockResolvedValue(mockApiResponse);
            // Mock API key being available
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('success');
            expect(result.provider).toBe('evergreen');
            expect(result.trackingNumber).toBe(mockTrackingNumber);
            expect(result.reliability).toBe(0.92);
            expect(result.data).toMatchObject({
                trackingNumber: mockTrackingNumber,
                carrier: 'Evergreen Line',
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
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('error');
            expect(result.error).toMatchObject({
                provider: 'evergreen',
                errorType: 'NOT_FOUND',
                message: `Tracking number ${mockTrackingNumber} not found in Evergreen system`,
                statusCode: 404
            });
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
            // Mock API key being available
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('error');
            expect(result.error).toMatchObject({
                provider: 'evergreen',
                errorType: 'RATE_LIMIT',
                message: 'Evergreen API rate limit exceeded',
                statusCode: 429,
                retryAfter: 120
            });
        });
        it('should handle timeout error', async () => {
            const error = {
                code: 'ECONNABORTED',
                message: 'timeout of 12000ms exceeded'
            };
            mockAxiosInstance.get.mockRejectedValue(error);
            // Mock API key being available
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('error');
            expect(result.error).toMatchObject({
                provider: 'evergreen',
                errorType: 'TIMEOUT',
                message: 'Evergreen API request timeout'
            });
        });
        it('should handle network error', async () => {
            const error = {
                code: 'ENOTFOUND',
                message: 'getaddrinfo ENOTFOUND api.evergreen-line.com'
            };
            mockAxiosInstance.get.mockRejectedValue(error);
            // Mock API key being available
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('error');
            expect(result.error).toMatchObject({
                provider: 'evergreen',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to Evergreen API'
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
                    carrier: 'Evergreen Line',
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
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            const result = await serviceWithKey.trackShipment(mockTrackingNumber, mockTrackingType);
            expect(result.status).toBe('success');
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
        });
    });
    describe('getTrackingEndpoint', () => {
        it('should return correct endpoint for container tracking', () => {
            const endpoint = service.getTrackingEndpoint('container');
            expect(endpoint).toBe('/containers');
        });
        it('should return correct endpoint for booking tracking', () => {
            const endpoint = service.getTrackingEndpoint('booking');
            expect(endpoint).toBe('/bookings');
        });
        it('should return correct endpoint for BOL tracking', () => {
            const endpoint = service.getTrackingEndpoint('bol');
            expect(endpoint).toBe('/bills-of-lading');
        });
        it('should default to container endpoint for unknown type', () => {
            const endpoint = service.getTrackingEndpoint('unknown');
            expect(endpoint).toBe('/containers');
        });
    });
    describe('mapServiceType', () => {
        it('should map LCL service types correctly', () => {
            expect(service.mapServiceType('LCL')).toBe('LCL');
            expect(service.mapServiceType('Less than Container Load')).toBe('LCL');
            expect(service.mapServiceType('Consolidation Service')).toBe('LCL');
        });
        it('should default to FCL for other service types', () => {
            expect(service.mapServiceType('FCL')).toBe('FCL');
            expect(service.mapServiceType('Full Container Load')).toBe('FCL');
            expect(service.mapServiceType('Standard Service')).toBe('FCL');
        });
    });
    describe('mapStatus', () => {
        it('should map Evergreen statuses correctly', () => {
            expect(service.mapStatus('PLANNED')).toBe('Planned');
            expect(service.mapStatus('BOOKING_CONFIRMED')).toBe('Booking Confirmed');
            expect(service.mapStatus('IN_TRANSIT')).toBe('In Transit');
            expect(service.mapStatus('DELIVERED')).toBe('Delivered');
            expect(service.mapStatus('DELAYED')).toBe('Delayed');
        });
        it('should return original status for unmapped values', () => {
            expect(service.mapStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
        });
    });
    describe('getAsianTimezone', () => {
        it('should return correct timezone for Asian countries', () => {
            expect(service.getAsianTimezone('Taiwan')).toBe('Asia/Taipei');
            expect(service.getAsianTimezone('China')).toBe('Asia/Shanghai');
            expect(service.getAsianTimezone('Japan')).toBe('Asia/Tokyo');
            expect(service.getAsianTimezone('Singapore')).toBe('Asia/Singapore');
        });
        it('should default to UTC for unknown countries', () => {
            expect(service.getAsianTimezone('Unknown Country')).toBe('UTC');
        });
    });
    describe('isAvailable', () => {
        it('should return false when API key is not configured', () => {
            expect(service.isAvailable()).toBe(false);
        });
        it('should return true when API key is configured', () => {
            const serviceWithKey = new EvergreenAPIService_1.EvergreenAPIService();
            serviceWithKey.apiKey = 'test-api-key';
            expect(serviceWithKey.isAvailable()).toBe(true);
        });
    });
    describe('getConfig', () => {
        it('should return correct configuration', () => {
            const config = service.getConfig();
            expect(config).toEqual({
                name: 'evergreen',
                baseUrl: 'https://api.evergreen-line.com/track',
                hasApiKey: false,
                timeout: 12000,
                retryAttempts: 3,
                supportedTypes: ['container', 'booking', 'bol'],
                reliability: 0.92,
                coverage: ['asia-pacific', 'global'],
                specialization: 'intra-asia-routes'
            });
        });
    });
});
//# sourceMappingURL=EvergreenAPIService.test.js.map