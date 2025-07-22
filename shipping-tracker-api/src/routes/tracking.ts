import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, TrackingRequest, TrackingResponse, TrackingType } from '../types';
import { TrackingService } from '../services/TrackingService';
import { MockDataService } from '../services/MockDataService';
import { isDemoMode } from '../config/environment';

const router = Router();
const trackingService = new TrackingService();

// GET /api/tracking/demo/info
// Get demo mode information and available demo tracking numbers
router.get('/demo/info', asyncHandler(async (req: Request, res: Response) => {
  const demoInfo = MockDataService.getDemoModeInfo();
  
  res.json({
    success: true,
    data: {
      ...demoInfo,
      currentlyEnabled: isDemoMode(),
    },
    message: 'Demo mode information retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/tracking/demo/numbers
// Get list of available demo tracking numbers
router.get('/demo/numbers', asyncHandler(async (req: Request, res: Response) => {
  const demoNumbers = MockDataService.getDemoTrackingNumbers();
  
  res.json({
    success: true,
    data: {
      trackingNumbers: demoNumbers,
      count: demoNumbers.length,
      categories: {
        containers: demoNumbers.filter(num => num.includes('CONTAINER') || num.includes('CNTR')),
        bookings: demoNumbers.filter(num => num.includes('BOOKING') || num.includes('BKG')),
        billsOfLading: demoNumbers.filter(num => num.includes('BOL') || num.includes('BILL')),
        carriers: demoNumbers.filter(num => 
          ['MAERSK', 'MSC', 'CMACGM', 'COSCO', 'HAPAG', 'EVERGREEN', 'ONE', 'YANGMING', 'ZIM'].some(carrier => 
            num.includes(carrier)
          )
        ),
        errorTesting: demoNumbers.filter(num => 
          ['ERROR', 'TIMEOUT', 'NOTFOUND', 'RATELIMIT'].some(error => 
            num.includes(error)
          )
        ),
      }
    },
    message: 'Demo tracking numbers retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/tracking/demo/status
// Get demo mode status and mock API health
router.get('/demo/status', asyncHandler(async (req: Request, res: Response) => {
  const mockStatus = MockDataService.getMockAPIStatus();
  
  res.json({
    success: true,
    data: {
      demoMode: isDemoMode(),
      mockAPIs: mockStatus,
      features: [
        'Realistic shipment data generation',
        'Multiple carrier simulation',
        'Error scenario testing',
        'Consistent data based on tracking number',
        'Simulated API response delays',
      ]
    },
    message: 'Demo mode status retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/tracking/suggestions
// Get search suggestions based on partial input
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const { q: query, session, limit } = req.query;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter is required',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }

  const suggestions = await trackingService.getSearchSuggestions(
    query.trim(),
    session as string,
    limit ? parseInt(limit as string, 10) : 5
  );

  res.json({
    success: true,
    data: {
      query: query.trim(),
      suggestions
    },
    message: 'Search suggestions retrieved successfully',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}));

// GET /api/tracking/health
// Get API provider health status
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
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
  } as ApiResponse);
}));

// GET /api/tracking/:trackingNumber
// Track a shipment by tracking number
router.get('/:trackingNumber', asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  const { type, session } = req.query;

  const result = await trackingService.trackShipment(
    trackingNumber,
    type as TrackingType,
    session as string
  );

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
    } as ApiResponse;

    return res.status(200).json(response);
  } else {
    const error = result.error!;
    return res.status(error.statusCode).json({
      success: false,
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
}));

// POST /api/tracking/search
// Search for tracking information with more detailed request body
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber, type }: TrackingRequest = req.body;
  const { session } = req.query;

  const result = await trackingService.trackShipment(
    trackingNumber,
    type,
    session as string
  );

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
    } as ApiResponse;

    return res.status(200).json(response);
  } else {
    const error = result.error!;
    return res.status(error.statusCode).json({
      success: false,
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
}));

// GET /api/tracking/:trackingNumber/refresh
// Refresh tracking data for a specific shipment
router.get('/:trackingNumber/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  const { type } = req.query;

  const result = await trackingService.refreshTrackingData(
    trackingNumber,
    type as TrackingType
  );

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
    } as ApiResponse;

    return res.status(200).json(response);
  } else {
    const error = result.error!;
    return res.status(error.statusCode).json({
      success: false,
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
}));

// GET /api/tracking/history/:trackingNumber
// Get tracking history for a shipment
router.get('/history/:trackingNumber', asyncHandler(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  const { type } = req.query;

  const result = await trackingService.getTrackingHistory(
    trackingNumber,
    type as TrackingType
  );

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
    } as ApiResponse;

    return res.status(200).json(response);
  } else {
    const error = result.error!;
    return res.status(error.statusCode).json({
      success: false,
      error: error.userMessage,
      code: error.code,
      retryable: error.retryable,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
}));

export { router as trackingRoutes };