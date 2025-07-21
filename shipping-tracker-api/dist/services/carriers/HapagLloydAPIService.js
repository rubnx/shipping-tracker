"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HapagLloydAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * Hapag-Lloyd API Service for container, booking, and BOL tracking
 * German carrier with strong global coverage and European route optimization
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
class HapagLloydAPIService {
    constructor() {
        this.timeout = 12000;
        this.retryAttempts = 3;
        this.baseUrl = 'https://api.hapag-lloyd.com/tracking';
        this.apiKey = environment_1.config.apiKeys.hapagLloyd;
        if (!this.apiKey) {
            console.warn('⚠️ Hapag-Lloyd API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Version': '2.0',
                'Accept-Language': 'en-US,de-DE'
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 Hapag-Lloyd API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ Hapag-Lloyd API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ Hapag-Lloyd API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ Hapag-Lloyd API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using Hapag-Lloyd API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'hapag-lloyd',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'hapag-lloyd',
                    errorType: 'AUTH_ERROR',
                    message: 'Hapag-Lloyd API key not configured'
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 Hapag-Lloyd API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
                const endpoint = this.getTrackingEndpoint(trackingType);
                const response = await this.client.get(endpoint, {
                    params: {
                        trackingNumber: trackingNumber.trim().toUpperCase(),
                        includeEvents: true,
                        includeContainers: true,
                        includeVessel: true,
                        includeRoute: true,
                        language: 'en'
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ Hapag-Lloyd API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Hapag-Lloyd API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, handle the error
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
     * Transform Hapag-Lloyd API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: 'Hapag-Lloyd',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date())
            };
            return {
                provider: 'hapag-lloyd',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.90, // Hapag-Lloyd has excellent reliability and global coverage
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming Hapag-Lloyd response:', error);
            throw new Error(`Failed to transform Hapag-Lloyd API response: ${error}`);
        }
    }
    /**
     * Transform Hapag-Lloyd events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `hapag-lloyd-event-${index}`,
            timestamp: new Date(event.eventDateTime),
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
     * Transform Hapag-Lloyd containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // Hapag-Lloyd doesn't typically provide dimensions in tracking
        }));
    }
    /**
     * Transform Hapag-Lloyd vessel info to our format
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
     * Transform Hapag-Lloyd route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: 0, // Hapag-Lloyd doesn't provide this directly
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
            timezone: this.getPortTimezone(port.country) // Hapag-Lloyd provides comprehensive global coverage
        };
    }
    /**
     * Get timezone for port based on country (Hapag-Lloyd has global coverage)
     */
    getPortTimezone(country) {
        const timezoneMap = {
            'Germany': 'Europe/Berlin',
            'Netherlands': 'Europe/Amsterdam',
            'Belgium': 'Europe/Brussels',
            'France': 'Europe/Paris',
            'United Kingdom': 'Europe/London',
            'Spain': 'Europe/Madrid',
            'Italy': 'Europe/Rome',
            'Poland': 'Europe/Warsaw',
            'Denmark': 'Europe/Copenhagen',
            'Sweden': 'Europe/Stockholm',
            'Norway': 'Europe/Oslo',
            'Finland': 'Europe/Helsinki',
            'Russia': 'Europe/Moscow',
            'China': 'Asia/Shanghai',
            'Japan': 'Asia/Tokyo',
            'South Korea': 'Asia/Seoul',
            'Singapore': 'Asia/Singapore',
            'India': 'Asia/Kolkata',
            'United Arab Emirates': 'Asia/Dubai',
            'United States': 'America/New_York',
            'Canada': 'America/Toronto',
            'Brazil': 'America/Sao_Paulo',
            'Chile': 'America/Santiago',
            'Australia': 'Australia/Sydney',
            'New Zealand': 'Pacific/Auckland',
            'South Africa': 'Africa/Johannesburg',
            'Egypt': 'Africa/Cairo'
        };
        return timezoneMap[country] || 'UTC';
    }
    /**
     * Map Hapag-Lloyd service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('less than container') || serviceLower.includes('groupage')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map Hapag-Lloyd status to our standard status
     */
    mapStatus(status) {
        const statusMap = {
            'PLANNED': 'Planned',
            'GEPLANT': 'Planned', // German: "Planned"
            'IN_TRANSIT': 'In Transit',
            'UNTERWEGS': 'In Transit', // German: "In Transit"
            'DELIVERED': 'Delivered',
            'ZUGESTELLT': 'Delivered', // German: "Delivered"
            'DELAYED': 'Delayed',
            'VERSPÄTET': 'Delayed', // German: "Delayed"
            'ON_HOLD': 'On Hold',
            'WARTEND': 'On Hold', // German: "On Hold"
            'CANCELLED': 'Cancelled',
            'STORNIERT': 'Cancelled', // German: "Cancelled"
            'DEPARTED': 'Departed',
            'ABGEFAHREN': 'Departed', // German: "Departed"
            'ARRIVED': 'Arrived',
            'ANGEKOMMEN': 'Arrived' // German: "Arrived"
        };
        return statusMap[status.toUpperCase()] || statusMap[status] || status;
    }
    /**
     * Map Hapag-Lloyd event codes to readable status (includes German translations)
     */
    mapEventStatus(eventCode) {
        const eventMap = {
            'GATE_OUT': 'Departed',
            'TOR_AUSGANG': 'Departed', // German
            'GATE_IN': 'Arrived',
            'TOR_EINGANG': 'Arrived', // German
            'LOAD': 'Loaded',
            'BELADEN': 'Loaded', // German
            'DISC': 'Discharged',
            'ENTLADEN': 'Discharged', // German
            'DEPA': 'Vessel Departed',
            'SCHIFF_ABFAHRT': 'Vessel Departed', // German
            'ARRI': 'Vessel Arrived',
            'SCHIFF_ANKUNFT': 'Vessel Arrived', // German
            'CREL': 'Customs Released',
            'ZOLL_FREIGABE': 'Customs Released', // German
            'DLVR': 'Delivered',
            'ZUSTELLUNG': 'Delivered', // German
            'PICK': 'Picked Up',
            'ABHOLUNG': 'Picked Up', // German
            'RETU': 'Returned',
            'RÜCKGABE': 'Returned' // German
        };
        return eventMap[eventCode.toUpperCase()] || eventMap[eventCode] || eventCode.replace(/_/g, ' ');
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
        if (typeLower.includes('high') || typeLower.includes('hc') || typeLower.includes('cube') || typeLower.includes('hoch'))
            return 'HC';
        if (typeLower.includes('reefer') || typeLower.includes('rf') || typeLower.includes('kühl'))
            return 'RF';
        if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat') || typeLower.includes('offen'))
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
            switch (status) {
                case 401:
                    apiError = {
                        provider: 'hapag-lloyd',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired Hapag-Lloyd API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'hapag-lloyd',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in Hapag-Lloyd system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'hapag-lloyd',
                        errorType: 'RATE_LIMIT',
                        message: 'Hapag-Lloyd API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                default:
                    apiError = {
                        provider: 'hapag-lloyd',
                        errorType: 'INVALID_RESPONSE',
                        message: `Hapag-Lloyd API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'hapag-lloyd',
                errorType: 'TIMEOUT',
                message: 'Hapag-Lloyd API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'hapag-lloyd',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to Hapag-Lloyd API'
            };
        }
        else {
            apiError = {
                provider: 'hapag-lloyd',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown Hapag-Lloyd API error'
            };
        }
        return {
            provider: 'hapag-lloyd',
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
            name: 'hapag-lloyd',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking', 'bol'],
            reliability: 0.90,
            specialization: 'Global coverage with European route optimization'
        };
    }
}
exports.HapagLloydAPIService = HapagLloydAPIService;
//# sourceMappingURL=HapagLloydAPIService.js.map