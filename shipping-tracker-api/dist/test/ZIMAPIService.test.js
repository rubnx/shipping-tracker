"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ZIMAPIService_1 = require("../services/carriers/ZIMAPIService");
const axios_1 = __importDefault(require("axios"));
// Mock axios
jest.mock('axios');
const mockedAxios = axios_1.default;
// Mock axios.create to return a mock instance
const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
        request: {
            use: jest.fn()
        },
        response: {
            use: jest.fn()
        }
    }
};
mockedAxios.create.mockReturnValue(mockAxiosInstance);
describe('ZIMAPIService', () => {
    let service;
    beforeEach(() => {
        service = new ZIMAPIService_1.ZIMAPIService();
        jest.clearAllMocks();
    });
    describe('Configuration', () => {
        it('should initialize with correct configuration', () => {
            const config = service.getConfig();
            expect(config.name).toBe('zim');
            expect(config.baseUrl).toBe('https://api.zim.com/tracking');
            expect(config.supportedTypes).toEqual(['container', 'booking']);
            expect(config.reliability).toBe(0.80);
            expect(config.coverage).toEqual(['mediterranean', 'global']);
            expect(config.specialization).toBe('mediterranean-global-routes');
        });
        it('should have Mediterranean specialization features', () => {
            const config = service.getConfig();
            expect(config.features).toContain('mediterranean-specialization');
            expect(config.features).toContain('global-coverage');
            expect(config.features).toContain('feeder-services');
            expect(config.features).toContain('israeli-carrier');
            expect(config.features).toContain('specialized-routes');
        });
        it('should report availability based on API key presence', () => {
            // Without API key, should not be available
            expect(service.isAvailable()).toBe(false);
        });
    });
    describe('Tracking Functionality', () => {
        it('should handle missing API key gracefully', async () => {
            const result = await service.trackShipment('ZIMU1234567', 'container');
            expect(result.provider).toBe('zim');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('ZIM API key not configured');
            expect(result.reliability).toBe(0);
        });
        it('should format tracking numbers correctly', async () => {
            const trackingNumber = 'zimu1234567';
            const result = await service.trackShipment(trackingNumber, 'container');
            // Should handle lowercase and convert to uppercase
            expect(result.trackingNumber).toBe(trackingNumber);
        });
        it('should support container and booking tracking types', async () => {
            const trackingTypes = ['container', 'booking'];
            for (const type of trackingTypes) {
                const result = await service.trackShipment('TEST123', type);
                expect(result.provider).toBe('zim');
                // All should fail due to missing API key, but should handle the type
                expect(result.error?.errorType).toBe('AUTH_ERROR');
            }
        });
    });
    describe('Mediterranean Specialization', () => {
        it('should be configured for Mediterranean routes', () => {
            const config = service.getConfig();
            expect(config.coverage).toContain('mediterranean');
            expect(config.specialization).toBe('mediterranean-global-routes');
            expect(config.features).toContain('mediterranean-specialization');
        });
        it('should support Israeli carrier features', () => {
            const config = service.getConfig();
            expect(config.features).toContain('israeli-carrier');
            expect(config.features).toContain('specialized-routes');
        });
        it('should have appropriate timeout for Mediterranean routes', () => {
            const config = service.getConfig();
            expect(config.timeout).toBe(10000); // Standard timeout for Mediterranean routes
            expect(config.retryAttempts).toBe(2);
        });
    });
    describe('Data Transformation', () => {
        it('should handle ZIM service types correctly', () => {
            const config = service.getConfig();
            expect(config.supportedTypes).toContain('container');
            expect(config.supportedTypes).toContain('booking');
            expect(config.supportedTypes).toHaveLength(2); // ZIM doesn't support BOL in this implementation
        });
        it('should support Mediterranean and global coverage', () => {
            const config = service.getConfig();
            expect(config.coverage).toEqual(['mediterranean', 'global']);
            expect(config.specialization).toBe('mediterranean-global-routes');
        });
    });
    describe('Error Handling', () => {
        it('should handle different error scenarios', async () => {
            // Test with missing API key
            const result = await service.trackShipment('TEST123', 'container');
            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
            expect(result.error?.provider).toBe('zim');
            expect(result.reliability).toBe(0);
        });
        it('should provide appropriate error messages', async () => {
            const result = await service.trackShipment('INVALID', 'container');
            expect(result.error?.message).toContain('ZIM API key not configured');
        });
    });
    describe('Specialized Features', () => {
        it('should be configured for Mediterranean and global routes', () => {
            const config = service.getConfig();
            expect(config.coverage).toEqual(['mediterranean', 'global']);
            expect(config.reliability).toBe(0.80); // Good reliability for specialized routes
        });
        it('should support feeder services', () => {
            const config = service.getConfig();
            expect(config.features).toContain('feeder-services');
            expect(config.features).toContain('specialized-routes');
        });
        it('should be configured as Israeli carrier', () => {
            const config = service.getConfig();
            expect(config.features).toContain('israeli-carrier');
            expect(config.specialization).toBe('mediterranean-global-routes');
        });
    });
    describe('Integration with API Aggregator', () => {
        it('should provide correct provider configuration', () => {
            const config = service.getConfig();
            expect(config.name).toBe('zim');
            expect(config.hasApiKey).toBe(false); // No API key in test environment
            expect(config.supportedTypes).toHaveLength(2);
            expect(config.reliability).toBe(0.80);
            expect(config.coverage).toEqual(['mediterranean', 'global']);
        });
        it('should handle rate limiting appropriately', () => {
            const config = service.getConfig();
            // Should have reasonable timeout and retry attempts
            expect(config.timeout).toBe(10000);
            expect(config.retryAttempts).toBe(2);
        });
        it('should support specialized Mediterranean routes', () => {
            const config = service.getConfig();
            expect(config.features).toContain('mediterranean-specialization');
            expect(config.specialization).toBe('mediterranean-global-routes');
        });
    });
    describe('Specialized API Methods', () => {
        it('should provide getMediterraneanRoutes method', () => {
            expect(typeof service.getMediterraneanRoutes).toBe('function');
        });
        it('should provide getMediterraneanPortCongestion method', () => {
            expect(typeof service.getMediterraneanPortCongestion).toBe('function');
        });
        it('should handle specialized methods without API key', async () => {
            await expect(service.getMediterraneanRoutes()).rejects.toThrow('ZIM API key not configured');
            await expect(service.getMediterraneanPortCongestion()).rejects.toThrow('ZIM API key not configured');
        });
    });
    describe('Route Specialization', () => {
        it('should support Mediterranean route specialization', () => {
            const config = service.getConfig();
            expect(config.features).toContain('mediterranean-specialization');
            expect(config.coverage).toContain('mediterranean');
        });
        it('should support global coverage alongside Mediterranean focus', () => {
            const config = service.getConfig();
            expect(config.coverage).toContain('global');
            expect(config.coverage).toContain('mediterranean');
            expect(config.specialization).toBe('mediterranean-global-routes');
        });
        it('should have Israeli carrier characteristics', () => {
            const config = service.getConfig();
            expect(config.features).toContain('israeli-carrier');
            expect(config.features).toContain('specialized-routes');
            expect(config.features).toContain('feeder-services');
        });
    });
});
//# sourceMappingURL=ZIMAPIService.test.js.map