"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvergreenAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * Evergreen Line API Service for container, booking, and BOL tracking
 * Taiwan-based carrier with strong Asia-Pacific route specialization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
class EvergreenAPIService {
    constructor() {
        this.timeout = 12000; // Slightly longer for Asia-Pacific routes
        this.retryAttempts = 3;
        this.baseUrl = 'https://api.evergreen-line.com/track';
        this.apiKey = environment_1.config.apiKeys.evergreen;
        if (!this.apiKey) {
            console.warn('⚠️ Evergreen API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Region': 'asia-pacific' // Evergreen specialization
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 Evergreen API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ Evergreen API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ Evergreen API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ Evergreen API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using Evergreen API
     * Supports container numbers, booking numbers, and BOL numbers
     * Specialized for Asia-Pacific routes and intra-Asia services
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'evergreen',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'evergreen',
                    errorType: 'AUTH_ERROR',
                    message: 'Evergreen API key not configured'
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 Evergreen API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const endpoint = this.getTrackingEndpoint(trackingType);
                const response = await this.client.get(endpoint, {
                    params: {
                        trackingNumber: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeContainers: true,
                        includeVessel: true,
                        includeRoute: true,
                        region: 'asia-pacific' // Evergreen's primary coverage area
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ Evergreen API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Evergreen API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, throw the error
                if (attempt >= this.retryAttempts) {
                    return this.handleError(trackingNumber, error);
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // This should never be reached, but TypeScript requires it
        throw new Error('Maximum retry attempts exceeded');
    }
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    getTrackingEndpoint(trackingType) {
        switch (trackingType) {
            case 'container':
                return '/containers';
            case 'booking':
                return '/bookings';
            case 'bol':
                return '/bills-of-lading';
            default:
                return '/containers'; // Default to container tracking
        }
    }
    /**
     * Transform Evergreen API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: 'Evergreen Line',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date())
            };
            return {
                provider: 'evergreen',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.92, // High reliability for Asia-Pacific routes
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming Evergreen response:', error);
            throw new Error(`Failed to transform Evergreen API response: ${error}`);
        }
    }
    /**
     * Transform Evergreen events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `evergreen-event-${index}`,
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
     * Transform Evergreen containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // Evergreen doesn't typically provide dimensions in tracking
        }));
    }
    /**
     * Transform Evergreen vessel info to our format
     */
    transformVessel(vessel) {
        if (!vessel)
            return undefined;
        return {
            name: vessel.vesselName,
            imo: vessel.vesselIMO,
            voyage: vessel.voyageNumber,
            currentPosition: vessel.currentPosition ? {
                lat: vessel.currentPosition.latitude,
                lng: vessel.currentPosition.longitude
            } : undefined,
            eta: vessel.estimatedTimeOfArrival ? new Date(vessel.estimatedTimeOfArrival) : undefined,
            ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined
        };
    }
    /**
     * Transform Evergreen route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: 0, // Evergreen doesn't provide this directly
            actualTransitTime: undefined
        };
    }
    /**
     * Transform port information
     */
    transformPort(port) {
        return {
            code: port.portCode,
            name: port.portName,
            city: port.city,
            country: port.country,
            coordinates: {
                lat: port.coordinates.latitude,
                lng: port.coordinates.longitude
            },
            timezone: this.getAsianTimezone(port.country) // Evergreen specializes in Asia-Pacific
        };
    }
    /**
     * Get appropriate timezone for Asian ports
     */
    getAsianTimezone(country) {
        const timezoneMap = {
            'Taiwan': 'Asia/Taipei',
            'China': 'Asia/Shanghai',
            'Japan': 'Asia/Tokyo',
            'South Korea': 'Asia/Seoul',
            'Singapore': 'Asia/Singapore',
            'Malaysia': 'Asia/Kuala_Lumpur',
            'Thailand': 'Asia/Bangkok',
            'Vietnam': 'Asia/Ho_Chi_Minh',
            'Philippines': 'Asia/Manila',
            'Indonesia': 'Asia/Jakarta',
            'Hong Kong': 'Asia/Hong_Kong'
        };
        return timezoneMap[country] || 'UTC';
    }
    /**
     * Map Evergreen service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('consolidation')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map Evergreen status to our standard status
     */
    mapStatus(status) {
        const statusMap = {
            'PLANNED': 'Planned',
            'BOOKING_CONFIRMED': 'Booking Confirmed',
            'CONTAINER_LOADED': 'Container Loaded',
            'VESSEL_DEPARTED': 'Vessel Departed',
            'IN_TRANSIT': 'In Transit',
            'VESSEL_ARRIVED': 'Vessel Arrived',
            'CONTAINER_DISCHARGED': 'Container Discharged',
            'CUSTOMS_CLEARED': 'Customs Cleared',
            'DELIVERED': 'Delivered',
            'DELAYED': 'Delayed',
            'ON_HOLD': 'On Hold',
            'CANCELLED': 'Cancelled'
        };
        return statusMap[status.toUpperCase()] || status;
    }
    /**
     * Map Evergreen event types to readable status
     */
    mapEventStatus(eventType) {
        const eventMap = {
            'GATE_OUT': 'Departed Terminal',
            'GATE_IN': 'Arrived at Terminal',
            'LOADED_ON_VESSEL': 'Loaded on Vessel',
            'DISCHARGED_FROM_VESSEL': 'Discharged from Vessel',
            'VESSEL_DEPARTURE': 'Vessel Departed',
            'VESSEL_ARRIVAL': 'Vessel Arrived',
            'CUSTOMS_RELEASE': 'Customs Released',
            'DELIVERED_TO_CONSIGNEE': 'Delivered',
            'EMPTY_RETURN': 'Empty Container Returned',
            'TRANSSHIPMENT': 'Transshipment',
            'PORT_ARRIVAL': 'Arrived at Port',
            'PORT_DEPARTURE': 'Departed from Port'
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
        if (typeLower.includes('high') || typeLower.includes('hc') || typeLower.includes('cube'))
            return 'HC';
        if (typeLower.includes('reefer') || typeLower.includes('rf') || typeLower.includes('refrigerated'))
            return 'RF';
        if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('top'))
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
                        provider: 'evergreen',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired Evergreen API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'evergreen',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in Evergreen system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'evergreen',
                        errorType: 'RATE_LIMIT',
                        message: 'Evergreen API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                default:
                    apiError = {
                        provider: 'evergreen',
                        errorType: 'INVALID_RESPONSE',
                        message: `Evergreen API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'evergreen',
                errorType: 'TIMEOUT',
                message: 'Evergreen API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'evergreen',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to Evergreen API'
            };
        }
        else {
            apiError = {
                provider: 'evergreen',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown Evergreen API error'
            };
        }
        return {
            provider: 'evergreen',
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
            name: 'evergreen',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking', 'bol'],
            reliability: 0.92,
            coverage: ['asia-pacific', 'global'],
            specialization: 'intra-asia-routes'
        };
    }
}
exports.EvergreenAPIService = EvergreenAPIService;
//# sourceMappingURL=EvergreenAPIService.js.map