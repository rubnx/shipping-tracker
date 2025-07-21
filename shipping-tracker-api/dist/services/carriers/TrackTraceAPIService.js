"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackTraceAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * Track-Trace Free API Service for basic container tracking
 * Implements Requirements 7.1, 7.4 for free tier fallback integration
 * This service provides basic tracking functionality with rate limitations
 */
class TrackTraceAPIService {
    constructor() {
        this.timeout = 8000;
        this.retryAttempts = 2;
        this.rateLimitPerMinute = 50;
        this.rateLimitPerHour = 500;
        this.baseUrl = 'https://api.track-trace.com/v1/tracking';
        this.apiKey = environment_1.config.apiKeys.trackTrace;
        if (!this.apiKey) {
            console.warn('⚠️ Track-Trace API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Version': '1.0'
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🆓 Track-Trace API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ Track-Trace API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ Track-Trace API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ Track-Trace API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using Track-Trace Free API
     * Primarily supports container numbers with basic tracking information
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'track-trace',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'track-trace',
                    errorType: 'AUTH_ERROR',
                    message: 'Track-Trace API key not configured'
                }
            };
        }
        // Check if tracking type is supported
        if (trackingType !== 'container') {
            return {
                provider: 'track-trace',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'track-trace',
                    errorType: 'INVALID_RESPONSE',
                    message: `Track-Trace API only supports container tracking, not ${trackingType}`
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 Track-Trace API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const response = await this.client.get('/container', {
                    params: {
                        container: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeVessel: false, // Free tier limitation
                        includeRoute: false // Free tier limitation
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ Track-Trace API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Track-Trace API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, handle the error
                if (attempt >= this.retryAttempts) {
                    return this.handleError(trackingNumber, error);
                }
                // Wait before retrying (shorter delay for free tier)
                const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // This should never be reached, but TypeScript requires it
        throw new Error('Maximum retry attempts exceeded');
    }
    /**
     * Transform Track-Trace API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: data.carrier || 'Unknown',
                service: this.mapServiceType(data.service || 'FCL'),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date()),
                dataSource: data.dataSource || 'track-trace'
            };
            return {
                provider: 'track-trace',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.68, // Lower reliability for free tier
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming Track-Trace response:', error);
            throw new Error(`Failed to transform Track-Trace API response: ${error}`);
        }
    }
    /**
     * Transform Track-Trace events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `track-trace-event-${index}`,
            timestamp: new Date(event.eventDateTime),
            status: this.mapEventStatus(event.eventType),
            location: this.formatLocation(event.location),
            description: event.eventDescription || event.eventType,
            isCompleted: event.isCompleted,
            coordinates: event.location.coordinates ? {
                lat: event.location.coordinates.latitude,
                lng: event.location.coordinates.longitude
            } : undefined
        }));
    }
    /**
     * Transform Track-Trace containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize || '40ft'),
            type: this.mapContainerType(container.containerType || 'GP'),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // Free tier doesn't provide dimensions
        }));
    }
    /**
     * Transform Track-Trace vessel info to our format (limited in free tier)
     */
    transformVessel(vessel) {
        if (!vessel)
            return undefined;
        return {
            name: vessel.vesselName || 'Unknown',
            imo: vessel.vesselIMO || '',
            voyage: vessel.voyageNumber || '',
            currentPosition: vessel.currentPosition ? {
                lat: vessel.currentPosition.latitude,
                lng: vessel.currentPosition.longitude
            } : undefined,
            eta: vessel.estimatedTimeOfArrival ? new Date(vessel.estimatedTimeOfArrival) : undefined,
            ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined
        };
    }
    /**
     * Transform Track-Trace route info to our format (limited in free tier)
     */
    transformRoute(route) {
        if (!route || !route.origin || !route.destination)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: [], // Free tier doesn't provide intermediate stops
            estimatedTransitTime: 0,
            actualTransitTime: undefined
        };
    }
    /**
     * Transform port information (with defaults for missing data)
     */
    transformPort(port) {
        return {
            code: port.portCode || '',
            name: port.portName || 'Unknown Port',
            city: port.city || '',
            country: port.country || '',
            coordinates: port.coordinates ? {
                lat: port.coordinates.latitude,
                lng: port.coordinates.longitude
            } : { lat: 0, lng: 0 },
            timezone: 'UTC'
        };
    }
    /**
     * Map Track-Trace service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map Track-Trace status to our standard status
     */
    mapStatus(status) {
        const statusMap = {
            'PLANNED': 'Planned',
            'IN_TRANSIT': 'In Transit',
            'DELIVERED': 'Delivered',
            'DELAYED': 'Delayed',
            'ON_HOLD': 'On Hold',
            'CANCELLED': 'Cancelled',
            'DEPARTED': 'Departed',
            'ARRIVED': 'Arrived',
            'UNKNOWN': 'Unknown'
        };
        return statusMap[status.toUpperCase()] || status;
    }
    /**
     * Map Track-Trace event types to readable status
     */
    mapEventStatus(eventType) {
        const eventMap = {
            'GATE_OUT': 'Departed',
            'GATE_IN': 'Arrived',
            'LOADED': 'Loaded',
            'DISCHARGED': 'Discharged',
            'VESSEL_DEPARTURE': 'Vessel Departed',
            'VESSEL_ARRIVAL': 'Vessel Arrived',
            'CUSTOMS_RELEASE': 'Customs Released',
            'DELIVERED': 'Delivered',
            'PICKED_UP': 'Picked Up',
            'RETURNED': 'Returned'
        };
        return eventMap[eventType.toUpperCase()] || eventType.replace(/_/g, ' ');
    }
    /**
     * Map container sizes
     */
    mapContainerSize(size) {
        if (size.includes('20'))
            return '20ft';
        if (size.includes('45'))
            return '45ft';
        return '40ft'; // Default to 40ft
    }
    /**
     * Map container types
     */
    mapContainerType(type) {
        const typeLower = type.toLowerCase();
        if (typeLower.includes('high') || typeLower.includes('hc'))
            return 'HC';
        if (typeLower.includes('reefer') || typeLower.includes('rf'))
            return 'RF';
        if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat'))
            return 'OT';
        return 'GP'; // Default to General Purpose
    }
    /**
     * Format location string
     */
    formatLocation(location) {
        const parts = [location.locationName];
        if (location.city)
            parts.push(location.city);
        if (location.country)
            parts.push(location.country);
        return parts.join(', ');
    }
    /**
     * Handle API errors and convert to our error format
     * Special handling for free tier limitations
     */
    handleError(trackingNumber, error) {
        let apiError;
        if (error.response) {
            // HTTP error response
            const status = error.response.status;
            const statusText = error.response.statusText;
            const data = error.response.data;
            switch (status) {
                case 401:
                    apiError = {
                        provider: 'track-trace',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired Track-Trace API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'track-trace',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in Track-Trace system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    // Free tier rate limiting is more aggressive
                    apiError = {
                        provider: 'track-trace',
                        errorType: 'RATE_LIMIT',
                        message: 'Track-Trace API rate limit exceeded (free tier)',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 120 // Longer wait for free tier
                    };
                    break;
                case 402:
                    // Payment required - free tier limitation
                    apiError = {
                        provider: 'track-trace',
                        errorType: 'RATE_LIMIT',
                        message: 'Track-Trace free tier quota exceeded',
                        statusCode: status,
                        retryAfter: 3600 // 1 hour wait for quota reset
                    };
                    break;
                default:
                    apiError = {
                        provider: 'track-trace',
                        errorType: 'INVALID_RESPONSE',
                        message: `Track-Trace API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'track-trace',
                errorType: 'TIMEOUT',
                message: 'Track-Trace API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'track-trace',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to Track-Trace API'
            };
        }
        else {
            apiError = {
                provider: 'track-trace',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown Track-Trace API error'
            };
        }
        return {
            provider: 'track-trace',
            trackingNumber,
            data: null,
            timestamp: new Date(),
            reliability: 0,
            status: 'error',
            error: apiError
        };
    }
    /**
     * Check if API is available and configured
     */
    isAvailable() {
        return !!this.apiKey;
    }
    /**
     * Get API configuration info
     */
    getConfig() {
        return {
            name: 'track-trace',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container'], // Only container tracking in free tier
            reliability: 0.68,
            rateLimits: {
                perMinute: this.rateLimitPerMinute,
                perHour: this.rateLimitPerHour
            },
            tier: 'free',
            limitations: [
                'Container tracking only',
                'Limited vessel information',
                'No route details',
                'Basic event information',
                'Rate limited to 50 requests/minute'
            ]
        };
    }
    /**
     * Check current rate limit status (useful for free tier management)
     */
    getRateLimitStatus() {
        // This would typically be tracked in a database or cache
        // For now, return mock data
        return {
            remainingMinute: this.rateLimitPerMinute - 10, // Mock usage
            remainingHour: this.rateLimitPerHour - 50, // Mock usage
            resetTime: new Date(Date.now() + 60000) // Next minute
        };
    }
}
exports.TrackTraceAPIService = TrackTraceAPIService;
//# sourceMappingURL=TrackTraceAPIService.js.map