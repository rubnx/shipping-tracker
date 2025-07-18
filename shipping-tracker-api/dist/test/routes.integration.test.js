"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const tracking_1 = require("../routes/tracking");
const errorHandler_1 = require("../middleware/errorHandler");
// Mock all dependencies
jest.mock('../services/TrackingService', () => {
    return {
        TrackingService: jest.fn().mockImplementation(() => ({
            trackShipment: jest.fn().mockImplementation((trackingNumber) => {
                if (!trackingNumber) {
                    return Promise.resolve({
                        success: false,
                        error: {
                            code: 'MISSING_TRACKING_NUMBER',
                            message: 'Tracking number is required',
                            userMessage: 'Please enter a tracking number to search.',
                            statusCode: 400,
                            retryable: false
                        }
                    });
                }
                return Promise.resolve({
                    success: true,
                    data: {
                        trackingNumber: trackingNumber,
                        trackingType: 'container',
                        carrier: 'Mock Carrier',
                        service: 'FCL',
                        status: 'In Transit',
                        timeline: [],
                        lastUpdated: new Date(),
                        dataSource: 'mock',
                        reliability: 0.9
                    },
                    fromCache: false,
                    dataAge: 0
                });
            }),
            refreshTrackingData: jest.fn().mockResolvedValue({
                success: true,
                data: {
                    trackingNumber: 'REFRESH123456',
                    trackingType: 'container',
                    carrier: 'Mock Carrier',
                    service: 'FCL',
                    status: 'In Transit',
                    timeline: [],
                    lastUpdated: new Date(),
                    dataSource: 'mock',
                    reliability: 0.9
                },
                fromCache: false,
                dataAge: 0
            }),
            getTrackingHistory: jest.fn().mockResolvedValue({
                success: true,
                data: [
                    {
                        id: '1',
                        timestamp: new Date(),
                        status: 'Departed',
                        location: 'Shanghai',
                        description: 'Container departed',
                        isCompleted: true
                    }
                ]
            }),
            getSearchSuggestions: jest.fn().mockResolvedValue(['MAEU1234567', 'MAEU2345678']),
            getProviderHealth: jest.fn().mockReturnValue({
                providers: [
                    { name: 'maersk', reliability: 0.95, available: true }
                ],
                overallHealth: 'healthy'
            })
        }))
    };
});
jest.mock('../config/environment', () => ({
    config: {
        server: {
            port: 3001,
            nodeEnv: 'test',
            frontendUrl: 'http://localhost:5173'
        },
        apiKeys: {
            maersk: 'test-maersk-key',
            hapagLloyd: 'test-hapag-key',
            msc: 'test-msc-key',
            cmaCgm: 'test-cma-key'
        },
        database: {
            url: 'postgresql://test:test@localhost:5432/test'
        },
        redis: {
            url: 'redis://localhost:6379'
        },
        rateLimit: {
            windowMs: 900000,
            maxRequests: 100
        },
        security: {
            jwtSecret: 'test-secret',
            apiSecretKey: 'test-api-secret'
        }
    }
}));
describe('Tracking Routes Integration', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/tracking', tracking_1.trackingRoutes);
        app.use(errorHandler_1.errorHandler);
    });
    describe('GET /api/tracking/:trackingNumber', () => {
        it('should handle successful tracking requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/TEST123456')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
        it('should handle tracking requests with query parameters', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/TEST123456?type=container&session=test-session')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
    describe('POST /api/tracking/search', () => {
        it('should handle search requests with valid payload', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/tracking/search')
                .send({
                trackingNumber: 'SEARCH123456',
                type: 'container'
            })
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
        it('should reject search requests without tracking number', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/tracking/search')
                .send({})
                .expect(400)
                .expect('Content-Type', /json/);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/tracking/:trackingNumber/refresh', () => {
        it('should handle refresh requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/REFRESH123456/refresh')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
        it('should handle refresh requests with type parameter', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/REFRESH123456/refresh?type=booking')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
    describe('GET /api/tracking/history/:trackingNumber', () => {
        it('should handle history requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/history/HISTORY123456')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
        it('should handle history requests with type parameter', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/history/HISTORY123456?type=bol')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
    describe('GET /api/tracking/suggestions', () => {
        it('should handle suggestions requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/suggestions?q=MAEU')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('suggestions');
        });
        it('should reject suggestions requests without query', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/suggestions')
                .expect(400)
                .expect('Content-Type', /json/);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });
        it('should handle suggestions with session and limit parameters', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/suggestions?q=TEST&session=test-session&limit=3')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body.data).toHaveProperty('query', 'TEST');
        });
    });
    describe('GET /api/tracking/health', () => {
        it('should return provider health status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/tracking/health')
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('overallHealth');
            expect(response.body.data).toHaveProperty('providers');
        });
    });
    describe('Error Handling', () => {
        it('should handle malformed JSON in POST requests', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/tracking/search')
                .send('invalid json')
                .set('Content-Type', 'application/json')
                .expect(400);
            // Express should handle malformed JSON automatically
        });
        it('should handle very long tracking numbers', async () => {
            const longTrackingNumber = 'A'.repeat(100);
            const response = await (0, supertest_1.default)(app)
                .get(`/api/tracking/${longTrackingNumber}`)
                .expect('Content-Type', /json/);
            expect(response.body).toHaveProperty('success');
        });
    });
});
//# sourceMappingURL=routes.integration.test.js.map