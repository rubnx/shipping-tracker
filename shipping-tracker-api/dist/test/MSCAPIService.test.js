"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MSCAPIService_1 = require("../services/carriers/MSCAPIService");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock('axios');
const mockedAxios = axios_1.default;
// Mock environment config
jest.mock('../config/environment', () => ({
    config: {
        apiKeys: {
            msc: 'test-msc-api-key'
        }
    }
}));
describe('MSCAPIService', () => {
    let mscService;
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
        mscService = new MSCAPIService_1.MSCAPIService();
    });
    describe('Constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'https://api.msc.com/track',
                timeout: 12000,
                headers: {
                    'Authorization': 'Bearer test-msc-api-key',
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
        const mockMSCResponse = {
            trackingNumber: 'MSCU1234567',
            status: 'IN_TRANSIT',
            carrier: 'MSC',
            service: 'FCL',
            events: [
                {
                    eventId: 'evt-001',
                    eventDateTime: '2024-01-15T10:00:00Z',
                    eventCode: 'GATE_OUT',
                    eventDescription: 'Container departed from terminal',
                    location: {
                        locationName: 'Hamburg Port',
                        city: 'Hamburg',
                        country: 'Germany',
                        coordinates: {
                            latitude: 53.5511,
                            longitude: 9.9937
                        }
                    },
                    isCompleted: true
                },
                {
                    eventId: 'evt-002',
                    eventDateTime: '2024-01-16T08:30:00Z',
                    eventCode: 'DEPA',
                    eventDescription: 'Vessel departed from port',
                    location: {
                        locationName: 'Hamburg Port',
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
                    containerNumber: 'MSCU1234567',
                    containerSize: '40ft',
                    containerType: 'GP',
                    sealNumber: 'MSC123456',
                    weight: {
                        value: 28000,
                        unit: 'kg'
                    }
                }
            ],
            vessel: {
                vesselName: 'MSC Hamburg',
                vesselIMO: 'IMO7654321',
                voyageNumber: 'V002',
                currentPosition: {
                    latitude: 55.0,
                    longitude: 10.0
                },
                estimatedTimeOfArrival: '2024-02-05T16:00:00Z'
            },
            route: {
                origin: {
                    portCode: 'DEHAM',
                    portName: 'Hamburg Port',
                    city: 'Hamburg',
                    country: 'Germany',
                    coordinates: {
                        latitude: 53.5511,
                        longitude: 9.9937
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
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/containers', {
                params: {
                    trackingNumber: 'MSCU1234567',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
            expect(result.provider).toBe('msc');
            expect(result.trackingNumber).toBe('MSCU1234567');
            expect(result.reliability).toBe(0.88);
            expect(result.data.carrier).toBe('MSC');
            expect(result.data.status).toBe('In Transit');
        });
        it('should successfully track a booking number', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCBOOK123', 'booking');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bookings', {
                params: {
                    trackingNumber: 'MSCBOOK123',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
        });
        it('should successfully track a BOL number', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCBOL123', 'bol');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/bills-of-lading', {
                params: {
                    trackingNumber: 'MSCBOL123',
                    includeEvents: true,
                    includeContainers: true,
                    includeVessel: true,
                    includeRoute: true
                }
            });
            expect(result.status).toBe('success');
        });
        it('should transform timeline events correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.data.timeline).toHaveLength(2);
            expect(result.data.timeline[0]).toMatchObject({
                id: 'evt-001',
                status: 'Departed',
                location: 'Hamburg Port, Hamburg, Germany',
                description: 'Container departed from terminal',
                isCompleted: true,
                coordinates: {
                    lat: 53.5511,
                    lng: 9.9937
                }
            });
        });
        it('should transform container information correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.data.containers).toHaveLength(1);
            expect(result.data.containers[0]).toMatchObject({
                number: 'MSCU1234567',
                size: '40ft',
                type: 'GP',
                sealNumber: 'MSC123456',
                weight: 28000
            });
        });
        it('should transform vessel information correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.data.vessel).toMatchObject({
                name: 'MSC Hamburg',
                imo: 'IMO7654321',
                voyage: 'V002',
                currentPosition: {
                    lat: 55.0,
                    lng: 10.0
                },
                eta: new Date('2024-02-05T16:00:00Z')
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
            const result = await mscService.trackShipment('INVALID123', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('NOT_FOUND');
            expect(result.error?.message).toContain('not found in MSC system');
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
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('Invalid or expired MSC API key');
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
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('RATE_LIMIT');
            expect(result.error?.retryAfter).toBe(60);
        });
        it('should handle timeout errors', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('TIMEOUT');
            expect(result.error?.message).toBe('MSC API request timeout');
        });
        it('should handle network errors', async () => {
            const error = { code: 'ENOTFOUND' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('NETWORK_ERROR');
            expect(result.error?.message).toBe('Unable to connect to MSC API');
        });
        it('should retry on failure up to maximum attempts', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get.mockRejectedValue(error);
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // 3 retry attempts
            expect(result.status).toBe('error');
        });
        it('should succeed on retry after initial failure', async () => {
            const error = { code: 'ECONNABORTED' };
            mockAxiosInstance.get
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ data: mockMSCResponse });
            const result = await mscService.trackShipment('MSCU1234567', 'container');
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
            expect(result.status).toBe('success');
        });
        it('should handle missing API key gracefully', async () => {
            // Test the early return path when API key is missing
            const serviceWithoutKey = new MSCAPIService_1.MSCAPIService();
            serviceWithoutKey.apiKey = '';
            const result = await serviceWithoutKey.trackShipment('MSCU1234567', 'container');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('MSC API key not configured');
        });
    });
    describe('Status and Type Mapping', () => {
        it('should map MSC statuses correctly', async () => {
            const testCases = [
                { mscStatus: 'PLANNED', expectedStatus: 'Planned' },
                { mscStatus: 'IN_TRANSIT', expectedStatus: 'In Transit' },
                { mscStatus: 'DELIVERED', expectedStatus: 'Delivered' },
                { mscStatus: 'DELAYED', expectedStatus: 'Delayed' },
                { mscStatus: 'UNKNOWN_STATUS', expectedStatus: 'UNKNOWN_STATUS' }
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: testCase.mscStatus,
                    carrier: 'MSC',
                    service: 'FCL',
                    events: [],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await mscService.trackShipment('TEST123', 'container');
                expect(result.data.status).toBe(testCase.expectedStatus);
            }
        });
        it('should map MSC event codes correctly', async () => {
            const testCases = [
                { eventCode: 'GATE_OUT', expectedStatus: 'Departed' },
                { eventCode: 'GATE_IN', expectedStatus: 'Arrived' },
                { eventCode: 'LOAD', expectedStatus: 'Loaded' },
                { eventCode: 'DISC', expectedStatus: 'Discharged' },
                { eventCode: 'DEPA', expectedStatus: 'Vessel Departed' },
                { eventCode: 'ARRI', expectedStatus: 'Vessel Arrived' },
                { eventCode: 'UNKNOWN_CODE', expectedStatus: 'UNKNOWN CODE' }
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: 'IN_TRANSIT',
                    carrier: 'MSC',
                    service: 'FCL',
                    events: [{
                            eventId: 'test-event',
                            eventDateTime: '2024-01-15T10:00:00Z',
                            eventCode: testCase.eventCode,
                            eventDescription: 'Test event',
                            location: { locationName: 'Test Port' },
                            isCompleted: true
                        }],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await mscService.trackShipment('TEST123', 'container');
                expect(result.data.timeline[0].status).toBe(testCase.expectedStatus);
            }
        });
        it('should map container sizes correctly', async () => {
            const testCases = [
                { mscSize: '20ft', expectedSize: '20ft' },
                { mscSize: '40ft', expectedSize: '40ft' },
                { mscSize: '45ft', expectedSize: '45ft' },
                { mscSize: 'unknown', expectedSize: '40ft' } // default
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: 'IN_TRANSIT',
                    carrier: 'MSC',
                    service: 'FCL',
                    events: [],
                    containers: [{
                            containerNumber: 'TEST123',
                            containerSize: testCase.mscSize,
                            containerType: 'GP'
                        }],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await mscService.trackShipment('TEST123', 'container');
                expect(result.data.containers[0].size).toBe(testCase.expectedSize);
            }
        });
        it('should map container types correctly', async () => {
            const testCases = [
                { mscType: 'GP', expectedType: 'GP' },
                { mscType: 'High Cube', expectedType: 'HC' },
                { mscType: 'Reefer', expectedType: 'RF' },
                { mscType: 'Open Top', expectedType: 'OT' },
                { mscType: 'Flat Rack', expectedType: 'OT' },
                { mscType: 'unknown', expectedType: 'GP' } // default
            ];
            for (const testCase of testCases) {
                const mockResponse = {
                    trackingNumber: 'TEST123',
                    status: 'IN_TRANSIT',
                    carrier: 'MSC',
                    service: 'FCL',
                    events: [],
                    containers: [{
                            containerNumber: 'TEST123',
                            containerSize: '40ft',
                            containerType: testCase.mscType
                        }],
                    lastUpdated: '2024-01-16T09:00:00Z'
                };
                mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });
                const result = await mscService.trackShipment('TEST123', 'container');
                expect(result.data.containers[0].type).toBe(testCase.expectedType);
            }
        });
    });
    describe('Utility Methods', () => {
        it('should return availability status', () => {
            expect(mscService.isAvailable()).toBe(true);
        });
        it('should return configuration info', () => {
            const config = mscService.getConfig();
            expect(config).toMatchObject({
                name: 'msc',
                baseUrl: 'https://api.msc.com/track',
                hasApiKey: true,
                timeout: 12000,
                retryAttempts: 3,
                supportedTypes: ['container', 'booking', 'bol'],
                reliability: 0.88
            });
        });
    });
});
//# sourceMappingURL=MSCAPIService.test.js.map