"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMACGMAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * CMA CGM API Service for container, booking, and BOL tracking
 * French carrier with strong European route coverage
 * Implements Requirements 7.1, 7.2 for Tier 1 ocean carrier integration
 */
class CMACGMAPIService {
    constructor() {
        this.timeout = 12000;
        this.retryAttempts = 3;
        this.baseUrl = 'https://api.cma-cgm.com/tracking';
        this.apiKey = environment_1.config.apiKeys.cmaCgm;
        if (!this.apiKey) {
            console.warn('⚠️ CMA CGM API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0',
                'X-API-Version': '1.0',
                'Accept-Language': 'en-US,fr-FR'
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 CMA CGM API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ CMA CGM API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ CMA CGM API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ CMA CGM API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Track shipment using CMA CGM API
     * Supports container numbers, booking numbers, and BOL numbers
     */
    async trackShipment(trackingNumber, trackingType) {
        if (!this.apiKey) {
            return {
                provider: 'cma-cgm',
                trackingNumber,
                data: null,
                timestamp: new Date(),
                reliability: 0,
                status: 'error',
                error: {
                    provider: 'cma-cgm',
                    errorType: 'AUTH_ERROR',
                    message: 'CMA CGM API key not configured'
                }
            };
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 CMA CGM API: Tracking ${trackingNumber} (attempt ${attempt}/${this.retryAttempts})`);
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
                console.log(`✅ CMA CGM API: Successfully tracked ${trackingNumber} in ${processingTime}ms`);
                return this.transformResponse(trackingNumber, response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ CMA CGM API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
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
     * Transform CMA CGM API response to our standard format
     */
    transformResponse(trackingNumber, data) {
        try {
            const transformedData = {
                trackingNumber,
                carrier: 'CMA CGM',
                service: this.mapServiceType(data.service),
                status: this.mapStatus(data.status),
                timeline: this.transformEvents(data.events || []),
                containers: this.transformContainers(data.containers || []),
                vessel: this.transformVessel(data.vessel),
                route: this.transformRoute(data.route),
                lastUpdated: new Date(data.lastUpdated || new Date())
            };
            return {
                provider: 'cma-cgm',
                trackingNumber,
                data: transformedData,
                timestamp: new Date(),
                reliability: 0.85, // CMA CGM has good reliability, especially for European routes
                status: 'success'
            };
        }
        catch (error) {
            console.error('❌ Error transforming CMA CGM response:', error);
            throw new Error(`Failed to transform CMA CGM API response: ${error}`);
        }
    }
    /**
     * Transform CMA CGM events to our timeline format
     */
    transformEvents(events) {
        return events.map((event, index) => ({
            id: event.eventId || `cma-cgm-event-${index}`,
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
     * Transform CMA CGM containers to our format
     */
    transformContainers(containers) {
        return containers.map(container => ({
            number: container.containerNumber,
            size: this.mapContainerSize(container.containerSize),
            type: this.mapContainerType(container.containerType),
            sealNumber: container.sealNumber || '',
            weight: container.weight ? container.weight.value : undefined,
            dimensions: undefined // CMA CGM doesn't typically provide dimensions in tracking
        }));
    }
    /**
     * Transform CMA CGM vessel info to our format
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
     * Transform CMA CGM route info to our format
     */
    transformRoute(route) {
        if (!route)
            return undefined;
        return {
            origin: this.transformPort(route.origin),
            destination: this.transformPort(route.destination),
            intermediateStops: route.intermediateStops?.map(stop => this.transformPort(stop)) || [],
            estimatedTransitTime: 0, // CMA CGM doesn't provide this directly
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
            timezone: this.getPortTimezone(port.country) // CMA CGM provides better timezone info for European ports
        };
    }
    /**
     * Get timezone for port based on country (CMA CGM specializes in European routes)
     */
    getPortTimezone(country) {
        const timezoneMap = {
            'France': 'Europe/Paris',
            'Germany': 'Europe/Berlin',
            'Netherlands': 'Europe/Amsterdam',
            'Belgium': 'Europe/Brussels',
            'Spain': 'Europe/Madrid',
            'Italy': 'Europe/Rome',
            'United Kingdom': 'Europe/London',
            'China': 'Asia/Shanghai',
            'Singapore': 'Asia/Singapore',
            'United States': 'America/New_York'
        };
        return timezoneMap[country] || 'UTC';
    }
    /**
     * Map CMA CGM service types to our standard types
     */
    mapServiceType(service) {
        const serviceLower = service.toLowerCase();
        if (serviceLower.includes('lcl') || serviceLower.includes('groupage') || serviceLower.includes('less than container')) {
            return 'LCL';
        }
        return 'FCL'; // Default to FCL
    }
    /**
     * Map CMA CGM status to our standard status
     */
    mapStatus(status) {
        const statusMap = {
            'PLANNED': 'Planned',
            'EN_COURS': 'In Transit', // French: "En cours"
            'IN_TRANSIT': 'In Transit',
            'DELIVERED': 'Delivered',
            'LIVRE': 'Delivered', // French: "Livré"
            'DELAYED': 'Delayed',
            'RETARDE': 'Delayed', // French: "Retardé"
            'ON_HOLD': 'On Hold',
            'EN_ATTENTE': 'On Hold', // French: "En attente"
            'CANCELLED': 'Cancelled',
            'ANNULE': 'Cancelled', // French: "Annulé"
            'DEPARTED': 'Departed',
            'PARTI': 'Departed', // French: "Parti"
            'ARRIVED': 'Arrived',
            'ARRIVE': 'Arrived' // French: "Arrivé"
        };
        return statusMap[status.toUpperCase()] || status;
    }
    /**
     * Map CMA CGM event codes to readable status (includes French translations)
     */
    mapEventStatus(eventCode) {
        const eventMap = {
            'GATE_OUT': 'Departed',
            'SORTIE_PORTAIL': 'Departed', // French
            'GATE_IN': 'Arrived',
            'ENTREE_PORTAIL': 'Arrived', // French
            'LOAD': 'Loaded',
            'CHARGEMENT': 'Loaded', // French
            'DISC': 'Discharged',
            'DECHARGEMENT': 'Discharged', // French
            'DEPA': 'Vessel Departed',
            'DEPART_NAVIRE': 'Vessel Departed', // French
            'ARRI': 'Vessel Arrived',
            'ARRIVEE_NAVIRE': 'Vessel Arrived', // French
            'CREL': 'Customs Released',
            'DEDOUANEMENT': 'Customs Released', // French
            'DLVR': 'Delivered',
            'LIVRAISON': 'Delivered', // French
            'PICK': 'Picked Up',
            'ENLEVEMENT': 'Picked Up', // French
            'RETU': 'Returned',
            'RETOUR': 'Returned' // French
        };
        return eventMap[eventCode.toUpperCase()] || eventCode.replace(/_/g, ' ');
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
        if (typeLower.includes('reefer') || typeLower.includes('rf') || typeLower.includes('frigo'))
            return 'RF';
        if (typeLower.includes('open') || typeLower.includes('ot') || typeLower.includes('flat') || typeLower.includes('ouvert'))
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
                        provider: 'cma-cgm',
                        errorType: 'AUTH_ERROR',
                        message: 'Invalid or expired CMA CGM API key',
                        statusCode: status
                    };
                    break;
                case 404:
                    apiError = {
                        provider: 'cma-cgm',
                        errorType: 'NOT_FOUND',
                        message: `Tracking number ${trackingNumber} not found in CMA CGM system`,
                        statusCode: status
                    };
                    break;
                case 429:
                    apiError = {
                        provider: 'cma-cgm',
                        errorType: 'RATE_LIMIT',
                        message: 'CMA CGM API rate limit exceeded',
                        statusCode: status,
                        retryAfter: parseInt(error.response.headers['retry-after']) || 60
                    };
                    break;
                default:
                    apiError = {
                        provider: 'cma-cgm',
                        errorType: 'INVALID_RESPONSE',
                        message: `CMA CGM API error: ${status} ${statusText}`,
                        statusCode: status
                    };
            }
        }
        else if (error.code === 'ECONNABORTED') {
            apiError = {
                provider: 'cma-cgm',
                errorType: 'TIMEOUT',
                message: 'CMA CGM API request timeout'
            };
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            apiError = {
                provider: 'cma-cgm',
                errorType: 'NETWORK_ERROR',
                message: 'Unable to connect to CMA CGM API'
            };
        }
        else {
            apiError = {
                provider: 'cma-cgm',
                errorType: 'INVALID_RESPONSE',
                message: error.message || 'Unknown CMA CGM API error'
            };
        }
        return {
            provider: 'cma-cgm',
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
            name: 'cma-cgm',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['container', 'booking', 'bol'],
            reliability: 0.85,
            specialization: 'European routes and French carrier data'
        };
    }
}
exports.CMACGMAPIService = CMACGMAPIService;
//# sourceMappingURL=CMACGMAPIService.js.map