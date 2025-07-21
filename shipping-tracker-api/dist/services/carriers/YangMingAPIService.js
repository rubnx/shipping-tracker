"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YangMingAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * Yang Ming Marine Transport API Service for container, booking, and BOL tracking
 * Taiwan-based carrier with Asia-Pacific focus and regional route optimization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
class YangMingAPIService {
    constructor() {
        this.timeout = 12000; // Optimized for Asia-Pacific routes
        this.retryAttempts = 3;
        this.baseUrl = 'https://api.yangming.com/track';
        this.apiKey = environment_1.config.apiKeys.yangMing;
        if (!this.apiKey) {
            console.warn('⚠️ Yang Ming API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Region': 'asia-pacific', // Yang Ming's primary focus
                'X-API-Optimization': 'regional-routes' // Regional route optimization
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 Yang Ming API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ Yang Ming API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ Yang Ming API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ Yang Ming API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using Yang Ming API
     * Supports container numbers, booking numbers, and BOL numbers
     * Specialized for Asia-Pacific focus with regional route optimization
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'yang-ming',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'yang-ming',
                    errorType: 'AUTH_ERROR',
                    message: 'Yang Ming API key not configured'
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 Yang Ming API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const endpoint = this.getTrackingEndpoint(trackingType);
                const response = await this.client.get(endpoint, {
                    params: {
                        trackingNumber: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeContainers: true,
                        includeVessel: true,
                        includeRoute: true,
                        region: 'asia-pacific', // Yang Ming's primary coverage
                        optimization: 'regional' // Regional route optimization
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ Yang Ming API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Yang Ming API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
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
     * Transform Yang Ming API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: 'Yang Ming Marine Transport',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date())
            };
            return {
                provider: 'yang-ming',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.90, // Good reliability for Asia-Pacific regional routes
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming Yang Ming response:', error);
            throw new Error(`Failed to transform Yang Ming API response: ${error}`);
        }
    }
    /**
     * Transform Yang Ming events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `yang-ming-event-${index}`,
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
     * Transform Yang Ming containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // Yang Ming doesn't typically provide dimensions in tracking
        }));
    }
    /**
     * Transform Yang Ming vessel info to our format
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
     * Transform Yang Ming route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: 0, // Yang Ming doesn't provide this directly
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
            timezone: this.getRegionalTimezone(port.country) // Yang Ming focuses on Asia-Pacific
        };
    }
    /**
     * Get appropriate timezone for regional Asia-Pacific ports
     */
    getRegionalTimezone(country) {
        const timezoneMap = {
            // Primary Asia-Pacific region (Yang Ming's focus)
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
            'Hong Kong': 'Asia/Hong_Kong',
            'Myanmar': 'Asia/Yangon',
            'Cambodia': 'Asia/Phnom_Penh',
            'Laos': 'Asia/Vientiane',
            // Extended regional coverage
            'Australia': 'Australia/Sydney',
            'New Zealand': 'Pacific/Auckland',
            'India': 'Asia/Kolkata',
            'Bangladesh': 'Asia/Dhaka',
            'Sri Lanka': 'Asia/Colombo',
            // Americas (limited coverage)
            'United States': 'America/Los_Angeles', // West Coast focus
            'Canada': 'America/Vancouver'
        };
        return timezoneMap[country] || 'UTC';
    }
    /**
     * Map Yang Ming service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('consolidation')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map Yang Ming status to our standard status
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
            'CANCELLED': 'Cancelled',
            'REGIONAL_TRANSIT': 'Regional Transit' // Yang Ming specific
        };
        return statusMap[status.toUpperCase()] || status;
    }
    /**
     * Map Yang Ming event types to readable status
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
            'PORT_DEPARTURE': 'Departed from Port',
            'REGIONAL_HUB': 'Regional Hub Transit', // Yang Ming specific
            'FEEDER_SERVICE': 'Feeder Service Transit' // Regional optimization
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
                        provider: 'yang-ming',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired Yang Ming API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'yang-ming',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in Yang Ming system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'yang-ming',
                        errorType: 'RATE_LIMIT',
                        message: 'Yang Ming API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                default:
                    apiError = {
                        provider: 'yang-ming',
                        errorType: 'INVALID_RESPONSE',
                        message: `Yang Ming API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'yang-ming',
                errorType: 'TIMEOUT',
                message: 'Yang Ming API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'yang-ming',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to Yang Ming API'
            };
        }
        else {
            apiError = {
                provider: 'yang-ming',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown Yang Ming API error'
            };
        }
        return {
            provider: 'yang-ming',
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
            name: 'yang-ming',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking', 'bol'],
            reliability: 0.90,
            coverage: ['asia-pacific'],
            specialization: 'regional-route-optimization'
        };
    }
}
exports.YangMingAPIService = YangMingAPIService;
//# sourceMappingURL=YangMingAPIService.js.map