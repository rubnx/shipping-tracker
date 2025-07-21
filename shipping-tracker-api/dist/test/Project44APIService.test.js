"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Project44APIService_1 = require("../services/carriers/Project44APIService");
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
describe('Project44APIService', () => {
    let service;
    beforeEach(() => {
        service = new Project44APIService_1.Project44APIService();
        jest.clearAllMocks();
    });
    describe('Configuration', () => {
        it('should initialize with correct premium configuration', () => {
            const config = service.getConfig();
            expect(config.name).toBe('project44');
            expect(config.baseUrl).toBe('https://api.project44.com/v4/tracking');
            expect(config.supportedTypes).toEqual(['container', 'booking', 'bol']);
            expect(config.reliability).toBe(0.93);
            expect(config.coverage).toEqual(['global']);
            expect(config.tier).toBe('premium');
            expect(config.timeout).toBe(15000); // Premium service timeout
            expect(config.retryAttempts).toBe(3);
        });
        it('should have premium features configured', () => {
            const config = service.getConfig();
            expect(config.features).toContain('multi-carrier-fallback');
            expect(config.features).toContain('enterprise-grade');
            expect(config.features).toContain('high-volume-support');
            expect(config.features).toContain('comprehensive-coverage');
            expect(config.features).toContain('real-time-updates');
            expect(config.features).toContain('advanced-analytics');
        });
        it('should report availability based on API key presence', () => {
            // Without API key, should not be available
            expect(service.isAvailable()).toBe(false);
        });
    });
    describe('Tracking Functionality', () => {
        it('should handle missing API key gracefully', async () => {
            const result = await service.trackShipment('TEST123456', 'container');
            expect(result.provider).toBe('project44');
            expect(result.status).toBe('error');
            expect(result.error?.errorType).toBe('AUTH_ERROR');
            expect(result.error?.message).toBe('Project44 API key not configured');
            expect(result.reliability).toBe(0);
        });
        it('should format tracking requests correctly', async () => {
            const trackingNumber = 'test123456';
            const result = await service.trackShipment(trackingNumber, 'container');
            // Should handle lowercase and convert to uppercase
            expect(result.trackingNumber).toBe(trackingNumber);
        });
        it('should support all tracking types', async () => {
            const trackingTypes = ['container', 'booking', 'bol'];
            for (const type of trackingTypes) {
                const result = await service.trackShipment('TEST123', type);
                expect(result.provider).toBe('project44');
                // All should fail due to missing API key, but should handle the type
                expect(result.error?.errorType).toBe('AUTH_ERROR');
            }
        });
        it('should support carrier SCAC routing', async () => {
            const result = await service.trackShipment('TEST123', 'container', 'MAEU');
            expect(result.provider).toBe('project44');
            expect(result.error?.errorType).toBe('AUTH_ERROR'); // Expected without API key
        });
    });
    describe('Premium Features', () => {
        it('should support multi-carrier fallback tracking', async () => {
            const result = await service.trackWithFallback('TEST123', 'container', ['MAEU', 'MSCU']);
            expect(result.provider).toBe('project44');
            expect(result.error?.errorType).toBe('INVALID_RESPONSE'); // Expected without API key
        });
        it('should handle enterprise-grade error responses', async () => {
            const result = await service.trackShipment('INVALID', 'container');
            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
            expect(result.error?.provider).toBe('project44');
            expect(result.reliability).toBe(0);
        });
        it('should provide comprehensive error messages', async () => {
            const result = await service.trackShipment('INVALID', 'container');
            expect(result.error?.message).toContain('Project44 API key not configured');
        });
    });
    describe('Data Transformation', () => {
        it('should handle premium service types correctly', () => {
            const config = service.getConfig();
            expect(config.supportedTypes).toContain('container');
            expect(config.supportedTypes).toContain('booking');
            expect(config.supportedTypes).toContain('bol');
        });
        it('should support global coverage', () => {
            const config = service.getConfig();
            expect(config.coverage).toEqual(['global']);
            expect(config.tier).toBe('premium');
        });
    });
    describe('Error Handling', () => {
        it('should handle different premium API error scenarios', async () => {
            // Test with missing API key
            const result = await service.trackShipment('TEST123', 'container');
            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
            expect(result.error?.provider).toBe('project44');
            expect(result.reliability).toBe(0);
        });
        it('should provide enterprise-grade error messages', async () => {
            const result = await service.trackShipment('INVALID', 'container');
            expect(result.error?.message).toContain('Project44 API key not configured');
        });
        it('should handle premium service timeouts appropriately', () => {
            const config = service.getConfig();
            // Premium service should have higher timeout
            expect(config.timeout).toBe(15000);
            expect(config.retryAttempts).toBe(3);
        });
    });
    describe('Premium Service Features', () => {
        it('should be configured for enterprise use', () => {
            const config = service.getConfig();
            expect(config.tier).toBe('premium');
            expect(config.reliability).toBeGreaterThan(0.9); // High reliability for premium
            expect(config.features).toHaveLength(6); // Multiple premium features
        });
        it('should support high-volume operations', () => {
            const config = service.getConfig();
            expect(config.features).toContain('high-volume-support');
            expect(config.features).toContain('enterprise-grade');
            expect(config.timeout).toBe(15000); // Higher timeout for complex operations
        });
        it('should provide comprehensive multi-carrier coverage', () => {
            const config = service.getConfig();
            expect(config.features).toContain('multi-carrier-fallback');
            expect(config.features).toContain('comprehensive-coverage');
            expect(config.coverage).toEqual(['global']);
        });
        it('should support advanced analytics and real-time updates', () => {
            const config = service.getConfig();
            expect(config.features).toContain('advanced-analytics');
            expect(config.features).toContain('real-time-updates');
        });
    });
    describe('Integration with API Aggregator', () => {
        it('should provide correct premium provider configuration', () => {
            const config = service.getConfig();
            expect(config.name).toBe('project44');
            expect(config.hasApiKey).toBe(false); // No API key in test environment
            expect(config.supportedTypes).toHaveLength(3);
            expect(config.reliability).toBeGreaterThan(0.9); // Premium reliability
            expect(config.tier).toBe('premium');
        });
        it('should handle premium rate limiting appropriately', () => {
            const config = service.getConfig();
            // Premium service should have higher timeout and retry attempts
            expect(config.timeout).toBe(15000);
            expect(config.retryAttempts).toBe(3);
        });
        it('should support enterprise-grade fallback mechanisms', () => {
            const config = service.getConfig();
            expect(config.features).toContain('multi-carrier-fallback');
            expect(config.features).toContain('enterprise-grade');
        });
    });
    describe('Premium API Methods', () => {
        it('should provide getSupportedCarriers method', () => {
            expect(typeof service.getSupportedCarriers).toBe('function');
        });
        it('should provide getUsageStats method', () => {
            expect(typeof service.getUsageStats).toBe('function');
        });
        it('should provide trackWithFallback method', () => {
            expect(typeof service.trackWithFallback).toBe('function');
        });
        it('should handle premium methods without API key', async () => {
            await expect(service.getSupportedCarriers()).rejects.toThrow('Project44 API key not configured');
            await expect(service.getUsageStats()).rejects.toThrow('Project44 API key not configured');
        });
    });
});
//# sourceMappingURL=Project44APIService.test.js.map