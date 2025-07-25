"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZIMAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * ZIM Integrated Shipping Services API Service
 * Israeli shipping company with Mediterranean and global container tracking
 * Implements Requirements 7.1, 7.2 for specialized route coverage
 */
class ZIMAPIService {
    constructor() {
        this.timeout = 10000; // Standard timeout for Mediterranean routes
        this.retryAttempts = 2;
        this.baseUrl = 'https://api.zim.com/tracking';
        this.apiKey = environment_1.config.apiKeys.zim;
        if (!this.apiKey) {
            console.warn('⚠️ ZIM API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Version': 'v1',
                'X-Client-Region': 'mediterranean', // ZIM's primary focus
                'X-Route-Specialization': 'mediterranean-global' // Specialized route coverage
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🇮🇱 ZIM API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ ZIM API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ ZIM API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ ZIM API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using ZIM API
     * Supports container numbers and booking numbers
     * Specialized for Mediterranean and global route coverage
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'zim',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'zim',
                    errorType: 'AUTH_ERROR',
                    message: 'ZIM API key not configured'
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 ZIM API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const endpoint = this.getTrackingEndpoint(trackingType);
                const response = await this.client.get(endpoint, {
                    params: {
                        trackingNumber: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeContainers: true,
                        includeVessel: true,
                        includeRoute: true,
                        routeSpecialization: 'mediterranean-global' // ZIM's specialized coverage
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ ZIM API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ ZIM API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, throw the error
                if (attempt >= this.retryAttempts) {
                    return this.handleError(trackingNumber, error);
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
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
     * Transform ZIM API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: 'ZIM Integrated Shipping Services',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date()),
                metadata: {
                    requestId: data.metadata.requestId,
                    processingTime: data.metadata.processingTime,
                    dataSource: data.metadata.dataSource,
                    routeSpecialization: 'mediterranean-global'
                }
            };
            return {
                provider: 'zim',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.80, // Good reliability for Mediterranean and specialized routes
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming ZIM response:', error);
            throw new Error(`Failed to transform ZIM API response: ${error}`);
        }
    }
    /**
     * Transform ZIM events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `zim-event-${index}`,
            timestamp: new Date(event.eventDateTime),
            status: this.mapEventStatus(event.eventType),
            location: this.formatLocation(event.location),
            description: event.eventDescription || event.eventType,
            isCompleted: event.isCompleted,
            isMilestone: event.isMilestone,
            coordinates: event.location.coordinates ? {
                lat: event.location.coordinates.latitude,
                lng: event.location.coordinates.longitude
            } : undefined
        }));
    }
    /**
     * Transform ZIM containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // ZIM doesn't typically provide dimensions in tracking
        }));
    }
    /**
     * Transform ZIM vessel info to our format
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
            ata: vessel.actualTimeOfArrival ? new Date(vessel.actualTimeOfArrival) : undefined,
            flag: vessel.flag
        };
    }
    /**
     * Transform ZIM route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: 0, // ZIM doesn't provide this directly
            actualTransitTime: undefined,
            routeType: route.routeType,
            specialization: this.getRouteSpecialization(route.routeType)
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
            timezone: this.getTimezoneForCountry(port.country)
        };
    }
    /**
     * Get route specialization description
     */
    getRouteSpecialization(routeType) {
        const specializationMap = {
            'MEDITERRANEAN': 'Mediterranean Sea specialized routes',
            'GLOBAL': 'Global shipping network',
            'FEEDER': 'Regional feeder services'
        };
        return specializationMap[routeType] || 'Standard shipping route';
    }
    /**
     * Get appropriate timezone for countries (focusing on Mediterranean region)
     */
    getTimezoneForCountry(country) {
        const timezoneMap = {
            // Mediterranean region (ZIM's primary focus)
            'Israel': 'Asia/Jerusalem',
            'Italy': 'Europe/Rome',
            'Spain': 'Europe/Madrid',
            'France': 'Europe/Paris',
            'Greece': 'Europe/Athens',
            'Turkey': 'Europe/Istanbul',
            'Egypt': 'Africa/Cairo',
            'Cyprus': 'Asia/Nicosia',
            'Malta': 'Europe/Malta',
            'Croatia': 'Europe/Zagreb',
            'Slovenia': 'Europe/Ljubljana',
            'Montenegro': 'Europe/Podgorica',
            'Albania': 'Europe/Tirane',
            'Morocco': 'Africa/Casablanca',
            'Tunisia': 'Africa/Tunis',
            'Algeria': 'Africa/Algiers',
            'Libya': 'Africa/Tripoli',
            // Global coverage
            'United States': 'America/New_York',
            'Canada': 'America/Toronto',
            'United Kingdom': 'Europe/London',
            'Germany': 'Europe/Berlin',
            'Netherlands': 'Europe/Amsterdam',
            'Belgium': 'Europe/Brussels',
            'China': 'Asia/Shanghai',
            'Japan': 'Asia/Tokyo',
            'South Korea': 'Asia/Seoul',
            'Singapore': 'Asia/Singapore',
            'India': 'Asia/Kolkata',
            'Australia': 'Australia/Sydney',
            'Brazil': 'America/Sao_Paulo',
            'Argentina': 'America/Buenos_Aires',
            'Chile': 'America/Santiago',
            'South Africa': 'Africa/Johannesburg'
        };
        return timezoneMap[country] || 'UTC';
    }
    /**
     * Map ZIM service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('consolidation')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map ZIM status to our standard status
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
            'MEDITERRANEAN_TRANSIT': 'Mediterranean Transit', // ZIM specific
            'FEEDER_SERVICE': 'Feeder Service' // Regional specialization
        };
        return statusMap[status.toUpperCase()] || status;
    }
    /**
     * Map ZIM event types to readable status
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
            'MEDITERRANEAN_HUB': 'Mediterranean Hub Transit', // ZIM specific
            'FEEDER_CONNECTION': 'Feeder Service Connection', // Regional specialization
            'HAIFA_TERMINAL': 'Haifa Terminal Processing', // ZIM's main hub
            'ASHDOD_TERMINAL': 'Ashdod Terminal Processing' // ZIM's secondary hub
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
                        provider: 'zim',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired ZIM API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'zim',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in ZIM system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'zim',
                        errorType: 'RATE_LIMIT',
                        message: 'ZIM API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                default:
                    apiError = {
                        provider: 'zim',
                        errorType: 'INVALID_RESPONSE',
                        message: `ZIM API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'zim',
                errorType: 'TIMEOUT',
                message: 'ZIM API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'zim',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to ZIM API'
            };
        }
        else {
            apiError = {
                provider: 'zim',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown ZIM API error'
            };
        }
        return {
            provider: 'zim',
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
            name: 'zim',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking'],
            reliability: 0.80,
            coverage: ['mediterranean', 'global'],
            specialization: 'mediterranean-global-routes',
            features: [
                'mediterranean-specialization',
                'global-coverage',
                'feeder-services',
                'israeli-carrier',
                'specialized-routes'
            ]
        };
    }
    /**
     * Get Mediterranean route information (specialized feature)
     */
    async getMediterraneanRoutes() {
        if (!this.apiKey) {
            throw new Error('ZIM API key not configured');
        }
        try {
            const response = await this.client.get('/routes/mediterranean');
            return response.data.routes || [];
        }
        catch (error) {
            console.error('❌ Error fetching ZIM Mediterranean routes:', error);
            return [];
        }
    }
    /**
     * Get port congestion information for Mediterranean ports
     */
    async getMediterraneanPortCongestion() {
        if (!this.apiKey) {
            throw new Error('ZIM API key not configured');
        }
        try {
            const response = await this.client.get('/ports/mediterranean/congestion');
            return response.data.ports || [];
        }
        catch (error) {
            console.error('❌ Error fetching Mediterranean port congestion:', error);
            return [];
        }
    }
}
exports.ZIMAPIService = ZIMAPIService;
//# sourceMappingURL=ZIMAPIService.js.map