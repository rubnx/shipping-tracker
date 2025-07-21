"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MaerskAPIService_1 = require("../services/carriers/MaerskAPIService");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock('axios');
const mockedAxios = axios_1.default;
// Mock environment config
jest.mock('../config/environment', () => ({
    config: {
        apiKeys: {
            maersk: 'test-maersk-api-key'
        }
    }
}));
describe('MaerskAPIService', () => {
    let maerskService;
    let mockAxiosInstance;
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
        maerskService = new MaerskAPIService_1.MaerskAPIService();
    });
    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.maersk.com/track',
                timeout: 10000,
                headers: {
                    'Authorization': 'Bearer test-maersk-api-key',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'ShippingTracker/1.0'
                }
            });
        });
        it('should set up request and response interceptors', () => {
            expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });
    describe('trackShipment', () => {
        const mockMaerskResponse = {
            trackingNumber: 'MAEU1234567',
            status: 'IN_PROGRESS',
            carrier: 'Maersk',
            service: 'FCL',
            events: [
                {
                    eventId: 'evt-001',
                    eventDateTime: '2024-01-15T10:00:00Z',
                    eventType: 'GATE_OUT',
                    eventDescription: 'Container departed from terminal',
                    location: {
                        locationName: 'Shanghai Port',
                        city: 'Shanghai',
                        country: 'China',
                        coordinates: {
                            latitude: 31.2304,
                            longitude: 121.4737
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
                        locationName: 'Shanghai Port',
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
                    containerNumber: 'MAEU1234567',
                    containerSize: '40ft',
                    containerType: 'GP',
                    sealNumber: 'SEAL123456',
                    weight: {
                        value: 25000,
                        unit: 'kg'
                    }
                }
            ],
            vessel: {
                vesselName: 'Maersk Shanghai',
                vesselIMO: 'IMO1234567',
                voyageNumber: 'V001',
                currentPosition: {
                    latitude: 35.0,
                    longitude: 125.0
                },
                estimatedTimeOfArrival: '2024-02-01T14:00:00Z'
            },
            route: {
                origin: {
                    portCode: 'CNSHA',
                    portName: 'Shanghai Port',
                    city: 'Shanghai',
                    country: 'China',
                    coordinates: {
                        latitude: 31.2304,
                        longitude: 121.4737
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
            lastUpdated: '2024-01-16T09:00:00Z'
        };
        it('should successfully track a container number', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/containers', {
                params: {
                    trackingNumber: 'MAEU1234567',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
            expect(result.provider).toBe('maersk');
            expect(result.trackingNumber).toBe('MAEU1234567');
            expect(result.reliability).toBe(0.95);
            expect(result.data.carrier).toBe('Maersk');
            expect(result.data.status).toBe('In Transit');
        });
        it('should successfully track a booking number', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('BOOK123456', 'booking');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bookings', {
                params: {
                    trackingNumber: 'BOOK123456',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
        });
        it('should successfully track a BOL number', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('BOL123456', 'bol');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bills-of-lading', {
                params: {
                    trackingNumber: 'BOL123456',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
        });
        it('should transform timeline events correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.data.timeline).toHaveLength(2);
            expect(result.data.timeline[0]).toMatchObject({
                id: 'evt-001',
                status: 'Departed',
                location: 'Shanghai Port, Shanghai, China',
                description: 'Container departed from terminal',
                isCompleted: true,
                coordinates: {
                    lat: 31.2304,
                    lng: 121.4737
                }
            });
        });
        it('should transform container information correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.data.containers).toHaveLength(1);
            expect(result.data.containers[0]).toMatchObject({
                number: 'MAEU1234567',
                size: '40ft',
                type: 'GP',
                sealNumber: 'SEAL123456',
                weight: 25000
            });
        });
        it('should transform vessel information correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.data.vessel).toMatchObject({
                name: 'Maersk Shanghai',
                imo: 'IMO1234567',
                voyage: 'V001',
                currentPosition: {
                    lat: 35.0,
                    lng: 125.0
                },
                eta: new Date('2024-02-01T14:00:00Z')
            });
        });
        it('should handle 404 not found errors', async () => {
            const error = {
                response: {
                    status: 404,
                    statusText: 'Not Found',
                    data: { message: 'Tracking number not found' }
                }
            };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await maerskService.trackShipment('INVALID123', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('NOT_FOUND');
            expect(result.error?.message).toContain('not found in Maersk system');
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
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('Invalid or expired API key');
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
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('RATE_LIMIT');
            expect(result.error?.retryAfter).toBe(60);
        });
        it('should handle timeout errors', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('TIMEOUT');
            expect(result.error?.message).toBe('Maersk API request timeout');
        });
        it('should handle network errors', async () => {
            const error = { code: 'ENOTFOUND' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('NETWORK_ERROR');
            expect(result.error?.message).toBe('Unable to connect to Maersk API');
        });
        it('should retry on failure up to maximum attempts', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // 3 retry attempts
            expect(result.status).toBe('error');
        });
        it('should succeed on retry after initial failure', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ data: mockMaerskResponse });
            const result = await maerskService.trackShipment('MAEU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
            expect(result.status).toBe('success');
        });
        it('should handle missing API key gracefully', async () => {
            // Test the early return path when API key is missing
            // We'll test this by mocking the apiKey property directly
            const serviceWithoutKey = new MaerskAPIService_1.MaerskAPIService();
            serviceWithoutKey.apiKey = '';
            const result = await serviceWithoutKey.trackShipment('MAEU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('Maersk API key not configured');
        });
    });
    describe('Status and Type Mapping', () => {
        it('should map Maersk statuses correctly', async () => {
            const testCases = [
                { maerskStatus: 'PLANNED', expectedStatus: 'Planned' },
                { maerskStatus: 'IN_PROGRESS', expectedStatus: 'In Transit' },
                { maerskStatus: 'COMPLETED', expectedStatus: 'Delivered' },
                { maerskStatus: 'DELAYED', expectedStatus: 'Delayed' },
                { maerskStatus: 'UNKNOWN_STATUS', expectedStatus: 'UNKNOWN_STATUS' }
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: testCase.maerskStatus,
                    carrier: 'Maersk',
                    service: 'FCL',
                    events: [],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await maerskService.trackShipment('TEST123', 'container');
                expect(result.data.status).toBe(testCase.expectedStatus);
            }
        });
        it('should map container sizes correctly', async () => {
            const testCases = [
                { maerskSize: '20ft', expectedSize: '20ft' },
                { maerskSize: '40ft', expectedSize: '40ft' },
                { maerskSize: '45ft', expectedSize: '45ft' },
                { maerskSize: 'unknown', expectedSize: '40ft' } // default
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: 'IN_PROGRESS',
                    carrier: 'Maersk',
                    service: 'FCL',
                    events: [],
                    containers: [{
                            containerNumber: 'TEST123',
                            containerSize: testCase.maerskSize,
                            containerType: 'GP'
                        }],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await maerskService.trackShipment('TEST123', 'container');
                expect(result.data.containers[0].size).toBe(testCase.expectedSize);
            }
        });
    });
    describe('Utility Methods', () => {
        it('should return availability status', () => {
            expect(maerskService.isAvailable()).toBe(true);
        });
        it('should return configuration info', () => {
            const config = maerskService.getConfig();
            expect(config).toMatchObject({
                name: 'maersk',
                baseUrl: 'https://api.maersk.com/track',
                hasApiKey: true,
                timeout: 10000,
                retryAttempts: 3,
                supportedTypes: ['container', 'booking', 'bol'],
                reliability: 0.95
            });
        });
    });
});
//# sourceMappingURL=MaerskAPIService.test.js.map