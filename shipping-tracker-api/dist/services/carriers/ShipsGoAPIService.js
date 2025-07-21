"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipsGoAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * ShipsGo API Service for multi-carrier container tracking
 * Implements Requirements 7.1, 7.2, 7.3 for container-focused aggregator integration
 * ShipsGo provides freemium access to multiple carrier data with vessel tracking
 */
class ShipsGoAPIService {
    constructor() {
        this.timeout = 8000;
        this.retryAttempts = 2;
        this.rateLimitPerMinute = 100;
        this.rateLimitPerHour = 2000;
        this.baseUrl = 'https://api.shipsgo.com/v2/tracking';
        this.apiKey = environment_1.config.apiKeys.shipsgo;
        if (!this.apiKey) {
            console.warn('⚠️ ShipsGo API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Version': '2.0'
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 ShipsGo API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ ShipsGo API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ ShipsGo API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ ShipsGo API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using ShipsGo API
     * Supports container numbers and booking numbers with multi-carrier aggregation
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'shipsgo',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'shipsgo',
                    errorType: 'AUTH_ERROR',
                    message: 'ShipsGo API key not configured'
                }
            };
        }
        // Check if tracking type is supported
        if (trackingType === 'bol') {
            return {
                provider: 'shipsgo',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'shipsgo',
                    errorType: 'INVALID_RESPONSE',
                    message: `ShipsGo API does not support BOL tracking, only container and booking`
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 ShipsGo API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const endpoint = this.getTrackingEndpoint(trackingType);
                const response = await this.client.get(endpoint, {
                    params: {
                        trackingNumber: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeContainers: true,
                        includeVessel: true,
                        includeRoute: true,
                        includePorts: true,
                        aggregateData: true // ShipsGo's multi-carrier aggregation
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ ShipsGo API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ ShipsGo API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, handle the error
                if (attempt >= this.retryAttempts) {
                    return this.handleError(trackingNumber, error);
                }
                // Wait before retrying (shorter delay for aggregator)
                const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        // This should never be reached, but TypeScript requires it
        throw new Error('Maximum retry attempts exceeded');
    }
    /**
     * Get vessel tracking information
     */
    async trackVessel(vesselIMO) {
        if (!this.apiKey) {
            return {
                provider: 'shipsgo',
                trackingNumber: vesselIMO,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'shipsgo',
                    errorType: 'AUTH_ERROR',
                    message: 'ShipsGo API key not configured'
                }
            };
        }
        try {
            console.log(`🚢 ShipsGo API: Tracking vessel ${vesselIMO}`);
            const response = await this.client.get('/vessel', {
                params: {
                    imo: vesselIMO,
                    includePosition: true,
                    includeRoute: true,
                    includeContainers: true
                }
            });
            return this.transformVesselResponse(vesselIMO, response.data);
        }
        catch (error) {
            return this.handleError(vesselIMO, error);
        }
    }
    /**
     * Get port information and congestion data
     */
    async getPortInfo(portCode) {
        if (!this.apiKey) {
            return null;
        }
        try {
            console.log(`🏭 ShipsGo API: Getting port info for ${portCode}`);
            const response = await this.client.get('/port', {
                params: {
                    portCode: portCode.toUpperCase(),
                    includeCongestion: true,
                    includeWeather: true
                }
            });
            return response.data;
        }
        catch (error) {
            console.error(`❌ ShipsGo API: Failed to get port info for ${portCode}:`, error);
            return null;
        }
    }
    /**
     * Get the appropriate API endpoint based on tracking type
     */
    getTrackingEndpoint(trackingType) {
        switch (trackingType) {
            case 'container':
                return '/container';
            case 'booking':
                return '/booking';
            default:
                return '/container'; // Default to container tracking
        }
    }
    /**
     * Transform ShipsGo API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: data.carrier || 'Multiple Carriers',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date()),
                dataSource: data.dataSource || 'shipsgo',
                aggregatedFrom: data.aggregatedFrom || []
            };
            return {
                provider: 'shipsgo',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.88, // Good reliability for aggregator
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming ShipsGo response:', error);
            throw new Error(`Failed to transform ShipsGo API response: ${error}`);
        }
    }
    /**
     * Transform vessel tracking response
     */
    transformVesselResponse(vesselIMO, data) {
        try {
            const transformedData = {
                trackingNumber: vesselIMO,
                carrier: 'Vessel Tracking',
                service: 'FCL',
                status: data.status || 'In Transit',
                timeline: [],
                containers: data.containers ? this.transformContainers(data.containers) : [],
                vessel: this.transformVessel(data),
                route: this.transformRoute(data.route),
                lastUpdated: new Date()
            };
            return {
                provider: 'shipsgo',
                trackingNumber: vesselIMO,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.85,
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming ShipsGo vessel response:', error);
            throw new Error(`Failed to transform ShipsGo vessel response: ${error}`);
        }
    }
    /**
     * Transform ShipsGo events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `shipsgo-event-${index}`,
            timestamp: new Date(event.actualDateTime || event.eventDateTime),
            status: this.mapEventStatus(event.eventCode),
            location: this.formatLocation(event.location),
            description: event.eventDescription || event.eventCode,
            isCompleted: event.isCompleted,
            coordinates: event.location.coordinates ? {
                lat: event.location.coordinates.latitude,
                lng: event.location.coordinates.longitude
            } : undefined
        }));
    }
    /**
     * Transform ShipsGo containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: container.dimensions ? {
                length: container.dimensions.length,
                width: container.dimensions.width,
                height: container.dimensions.height,
                unit: container.dimensions.unit === 'm' ? 'm' : 'ft'
            } : undefined
        }));
    }
    /**
     * Transform ShipsGo vessel info to our format
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
     * Transform ShipsGo route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: route.estimatedTransitTime || 0,
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
            timezone: 'UTC' // Default timezone
        };
    }
    /**
     * Map ShipsGo service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service?.toLowerCase() || '';
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map ShipsGo status to our standard status
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
            'LOADING': 'Loading',
            'DISCHARGING': 'Discharging'
        };
        return statusMap[status?.toUpperCase()] || status || 'Unknown';
    }
    /**
     * Map ShipsGo event codes to readable status
     */
    mapEventStatus(eventCode) {
        const eventMap = {
            'GATE_OUT': 'Departed',
            'GATE_IN': 'Arrived',
            'LOAD': 'Loaded',
            'DISC': 'Discharged',
            'DEPA': 'Vessel Departed',
            'ARRI': 'Vessel Arrived',
            'CREL': 'Customs Released',
            'DLVR': 'Delivered',
            'PICK': 'Picked Up',
            'RETU': 'Returned',
            'TMPS': 'Transshipment',
            'STUF': 'Stuffed',
            'STRP': 'Stripped'
        };
        return eventMap[eventCode?.toUpperCase()] || eventCode?.replace(/_/g, ' ') || 'Unknown';
    }
    /**
     * Map container sizes
     */
    mapContainerSize(size) {
        if (!size)
            return '40ft';
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
        if (!type)
            return 'GP';
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
                        provider: 'shipsgo',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired ShipsGo API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'shipsgo',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in ShipsGo system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'shipsgo',
                        errorType: 'RATE_LIMIT',
                        message: 'ShipsGo API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                case 402:
                    // Payment required - freemium limitation
                    apiError = {
                        provider: 'shipsgo',
                        errorType: 'RATE_LIMIT',
                        message: 'ShipsGo freemium quota exceeded',
                        statusCode: status,
                        retryAfter: 3600 // 1 hour wait for quota reset
                    };
                    break;
                default:
                    apiError = {
                        provider: 'shipsgo',
                        errorType: 'INVALID_RESPONSE',
                        message: `ShipsGo API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'shipsgo',
                errorType: 'TIMEOUT',
                message: 'ShipsGo API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'shipsgo',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to ShipsGo API'
            };
        }
        else {
            apiError = {
                provider: 'shipsgo',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown ShipsGo API error'
            };
        }
        return {
            provider: 'shipsgo',
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
            name: 'shipsgo',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking'],
            reliability: 0.88,
            rateLimits: {
                perMinute: this.rateLimitPerMinute,
                perHour: this.rateLimitPerHour
            },
            tier: 'freemium',
            features: [
                'Multi-carrier aggregation',
                'Vessel tracking',
                'Port information',
                'Real-time positions',
                'Route optimization',
                'Container dimensions'
            ],
            limitations: [
                'No BOL tracking',
                'Freemium rate limits',
                'Some premium features require upgrade'
            ]
        };
    }
    /**
     * Get supported carriers (aggregated data sources)
     */
    getSupportedCarriers() {
        return [
            'Maersk', 'MSC', 'CMA CGM', 'COSCO', 'Hapag-Lloyd',
            'Evergreen', 'ONE', 'Yang Ming', 'HMM', 'PIL',
            'ZIM', 'Wan Hai', 'OOCL', 'APL', 'MOL'
        ];
    }
}
exports.ShipsGoAPIService = ShipsGoAPIService;
//# sourceMappingURL=ShipsGoAPIService.js.map