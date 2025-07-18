"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackingRoutes = void 0;
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const TrackingService_1 = require("../services/TrackingService");
const router = (0, express_1.Router)();
exports.trackingRoutes = router;
const trackingService = new TrackingService_1.TrackingService();
// GET /api/tracking/suggestions
// Get search suggestions based on partial input
router.get('/suggestions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { q: query, session, limit } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Query parameter is required',
            timestamp: new Date().toISOString()
        });
    }
    const suggestions = await trackingService.getSearchSuggestions(query.trim(), session, limit ? parseInt(limit, 10) : 5);
    res.json({
        success: true,
        data: {
            query: query.trim(),
            suggestions
        },
        message: 'Search suggestions retrieved successfully',
        timestamp: new Date().toISOString()
    });
}));
// GET /api/tracking/health
// Get API provider health status
router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const health = trackingService.getProviderHealth();
    const statusCode = health.overallHealth === 'unavailable' ? 503 : 200;
    res.status(statusCode).json({
        success: true,
        data: {
            overallHealth: health.overallHealth,
            providers: health.providers,
            timestamp: new Date().toISOString()
        },
        message: `Tracking service is ${health.overallHealth}`,
        timestamp: new Date().toISOString()
    });
}));
// GET /api/tracking/:trackingNumber
// Track a shipment by tracking number
router.get('/:trackingNumber', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { trackingNumber } = req.params;
    const { type, session } = req.query;
    const result = await trackingService.trackShipment(trackingNumber, type, session);
    if (result.success && result.data) {
        const response = {
            success: true,
            data: {
                trackingNumber: result.data.trackingNumber,
                trackingType: result.data.trackingType,
                carrier: result.data.carrier,
                service: result.data.service,
                status: result.data.status,
                timeline: result.data.timeline,
                route: result.data.route,
                containers: result.data.containers,
                vessel: result.data.vessel,
                lastUpdated: result.data.lastUpdated.toISOString(),
                dataSource: result.data.dataSource,
                reliability: result.data.reliability
            },
            message: result.fromCache
                ? `Tracking information retrieved from cache (${result.dataAge}min old)`
                : 'Tracking information retrieved successfully',
            timestamp: new Date().toISOString(),
            ...(result.error && { warning: result.error.userMessage })
        };
        return res.status(200).json(response);
    }
    else {
        const error = result.error;
        return res.status(error.statusCode).json({
            success: false,
            error: error.userMessage,
            code: error.code,
            retryable: error.retryable,
            retryAfter: error.retryAfter,
            timestamp: new Date().toISOString()
        });
    }
}));
// POST /api/tracking/search
// Search for tracking information with more detailed request body
router.post('/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { trackingNumber, type } = req.body;
    const { session } = req.query;
    const result = await trackingService.trackShipment(trackingNumber, type, session);
    if (result.success && result.data) {
        const response = {
            success: true,
            data: {
                trackingNumber: result.data.trackingNumber,
                trackingType: result.data.trackingType,
                carrier: result.data.carrier,
                service: result.data.service,
                status: result.data.status,
                timeline: result.data.timeline,
                route: result.data.route,
                containers: result.data.containers,
                vessel: result.data.vessel,
                lastUpdated: result.data.lastUpdated.toISOString(),
                dataSource: result.data.dataSource,
                reliability: result.data.reliability
            },
            message: result.fromCache
                ? `Tracking search completed using cached data (${result.dataAge}min old)`
                : 'Tracking search completed successfully',
            timestamp: new Date().toISOString(),
            ...(result.error && { warning: result.error.userMessage })
        };
        return res.status(200).json(response);
    }
    else {
        const error = result.error;
        return res.status(error.statusCode).json({
            success: false,
            error: error.userMessage,
            code: error.code,
            retryable: error.retryable,
            retryAfter: error.retryAfter,
            timestamp: new Date().toISOString()
        });
    }
}));
// GET /api/tracking/:trackingNumber/refresh
// Refresh tracking data for a specific shipment
router.get('/:trackingNumber/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { trackingNumber } = req.params;
    const { type } = req.query;
    const result = await trackingService.refreshTrackingData(trackingNumber, type);
    if (result.success && result.data) {
        const response = {
            success: true,
            data: {
                trackingNumber: result.data.trackingNumber,
                trackingType: result.data.trackingType,
                carrier: result.data.carrier,
                service: result.data.service,
                status: result.data.status,
                timeline: result.data.timeline,
                route: result.data.route,
                containers: result.data.containers,
                vessel: result.data.vessel,
                lastUpdated: result.data.lastUpdated.toISOString(),
                dataSource: result.data.dataSource,
                reliability: result.data.reliability
            },
            message: 'Tracking data refreshed successfully',
            timestamp: new Date().toISOString()
        };
        return res.status(200).json(response);
    }
    else {
        const error = result.error;
        return res.status(error.statusCode).json({
            success: false,
            error: error.userMessage,
            code: error.code,
            retryable: error.retryable,
            retryAfter: error.retryAfter,
            timestamp: new Date().toISOString()
        });
    }
}));
// GET /api/tracking/history/:trackingNumber
// Get tracking history for a shipment
router.get('/history/:trackingNumber', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { trackingNumber } = req.params;
    const { type } = req.query;
    const result = await trackingService.getTrackingHistory(trackingNumber, type);
    if (result.success && result.data) {
        const response = {
            success: true,
            data: {
                trackingNumber: trackingNumber.toUpperCase(),
                history: result.data.map(event => ({
                    id: event.id,
                    timestamp: event.timestamp.toISOString(),
                    status: event.status,
                    location: event.location,
                    description: event.description,
                    isCompleted: event.isCompleted,
                    coordinates: event.coordinates
                }))
            },
            message: 'Tracking history retrieved successfully',
            timestamp: new Date().toISOString()
        };
        return res.status(200).json(response);
    }
    else {
        const error = result.error;
        return res.status(error.statusCode).json({
            success: false,
            error: error.userMessage,
            code: error.code,
            retryable: error.retryable,
            timestamp: new Date().toISOString()
        });
    }
}));
//# sourceMappingURL=tracking.js.map