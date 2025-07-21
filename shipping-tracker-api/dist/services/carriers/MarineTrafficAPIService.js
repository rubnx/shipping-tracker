"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarineTrafficAPIService = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../../config/environment");
/**
 * Marine Traffic API Service for vessel tracking and port information
 * Implements Requirements 3.1, 3.3, 7.1 for real-time vessel tracking
 */
class MarineTrafficAPIService {
    constructor() {
        this.timeout = 15000;
        this.retryAttempts = 3;
        this.baseUrl = 'https://services.marinetraffic.com/api';
        this.apiKey = environment_1.config.apiKeys.marineTraffic;
        if (!this.apiKey) {
            console.warn('⚠️ Marine Traffic API key not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'ShippingTracker/1.0'
            }
        });
        // Add request interceptor for logging
        this.client.interceptors.request.use((config) => {
            console.log(`🚢 Marine Traffic API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('❌ Marine Traffic API Request Error:', error);
            return Promise.reject(error);
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            console.log(`✅ Marine Traffic API Response: ${response.status} ${response.statusText}`);
            return response;
        }, (error) => {
            console.error('❌ Marine Traffic API Response Error:', error.response?.status, error.response?.statusText);
            return Promise.reject(error);
        });
    }
    /**
     * Get vessel position by IMO number
     */
    async getVesselPosition(imo) {
        if (!this.apiKey) {
            throw new Error('Marine Traffic API key not configured');
        }
        const startTime = Date.now();
        let attempt = 0;
        while (attempt < this.retryAttempts) {
            try {
                attempt++;
                console.log(`🔍 Marine Traffic API: Getting vessel position for IMO ${imo} (attempt ${attempt}/${this.retryAttempts})`);
                const response = await this.client.get('/exportvessel/v:8', {
                    params: {
                        key: this.apiKey,
                        imo: imo,
                        protocol: 'jsono'
                    }
                });
                const processingTime = Date.now() - startTime;
                console.log(`✅ Marine Traffic API: Successfully retrieved vessel position in ${processingTime}ms`);
                return this.transformVesselPosition(response.data);
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                console.error(`❌ Marine Traffic API: Attempt ${attempt} failed after ${processingTime}ms:`, error);
                // If this is the last attempt, throw the error
                if (attempt >= this.retryAttempts) {
                    throw this.handleError(error);
                }
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return null;
    }
    /**
     * Get vessel route and waypoints
     */
    async getVesselRoute(imo, timespan = 24) {
        if (!this.apiKey) {
            throw new Error('Marine Traffic API key not configured');
        }
        try {
            console.log(`🔍 Marine Traffic API: Getting vessel route for IMO ${imo}`);
            const response = await this.client.get('/exportvesseltrack/v:2', {
                params: {
                    key: this.apiKey,
                    imo: imo,
                    timespan: timespan, // hours
                    protocol: 'jsono'
                }
            });
            console.log(`✅ Marine Traffic API: Successfully retrieved vessel route`);
            return this.transformVesselRoute(imo, response.data);
        }
        catch (error) {
            console.error('❌ Marine Traffic API: Failed to get vessel route:', error);
            throw this.handleError(error);
        }
    }
    /**
     * Get port congestion information
     */
    async getPortCongestion(portId) {
        if (!this.apiKey) {
            throw new Error('Marine Traffic API key not configured');
        }
        try {
            console.log(`🔍 Marine Traffic API: Getting port congestion data`);
            const params = {
                key: this.apiKey,
                protocol: 'jsono'
            };
            if (portId) {
                params.portid = portId;
            }
            const response = await this.client.get('/portcongestion/v:1', {
                params
            });
            console.log(`✅ Marine Traffic API: Successfully retrieved port congestion data`);
            return this.transformPortCongestion(response.data);
        }
        catch (error) {
            console.error('❌ Marine Traffic API: Failed to get port congestion:', error);
            throw this.handleError(error);
        }
    }
    /**
     * Search vessels by name or other criteria
     */
    async searchVessels(query) {
        if (!this.apiKey) {
            throw new Error('Marine Traffic API key not configured');
        }
        try {
            console.log(`🔍 Marine Traffic API: Searching vessels with query: ${query}`);
            const response = await this.client.get('/exportvessel/v:8', {
                params: {
                    key: this.apiKey,
                    shipname: query,
                    protocol: 'jsono'
                }
            });
            console.log(`✅ Marine Traffic API: Successfully found vessels`);
            return this.transformVesselList(response.data);
        }
        catch (error) {
            console.error('❌ Marine Traffic API: Failed to search vessels:', error);
            throw this.handleError(error);
        }
    }
    /**
     * Get vessels in a specific area (bounding box)
     */
    async getVesselsInArea(minLat, maxLat, minLon, maxLon) {
        if (!this.apiKey) {
            throw new Error('Marine Traffic API key not configured');
        }
        try {
            console.log(`🔍 Marine Traffic API: Getting vessels in area`);
            const response = await this.client.get('/exportvessel/v:8', {
                params: {
                    key: this.apiKey,
                    minlat: minLat,
                    maxlat: maxLat,
                    minlon: minLon,
                    maxlon: maxLon,
                    protocol: 'jsono'
                }
            });
            console.log(`✅ Marine Traffic API: Successfully retrieved vessels in area`);
            return this.transformVesselList(response.data);
        }
        catch (error) {
            console.error('❌ Marine Traffic API: Failed to get vessels in area:', error);
            throw this.handleError(error);
        }
    }
    /**
     * Transform Marine Traffic vessel data to our VesselPosition format
     */
    transformVesselPosition(data) {
        if (!data.success || !data.data || data.data.length === 0) {
            return null;
        }
        const vessel = data.data[0];
        return {
            imo: vessel.IMO.toString(),
            mmsi: vessel.MMSI.toString(),
            name: vessel.SHIPNAME,
            position: {
                lat: vessel.LAT,
                lng: vessel.LON
            },
            timestamp: new Date(vessel.TIMESTAMP),
            speed: vessel.SPEED,
            heading: vessel.HEADING,
            status: this.mapVesselStatus(vessel.STATUS),
            destination: vessel.DESTINATION,
            eta: vessel.ETA ? new Date(vessel.ETA) : undefined
        };
    }
    /**
     * Transform vessel list data
     */
    transformVesselList(data) {
        if (!data.success || !data.data) {
            return [];
        }
        return data.data.map(vessel => ({
            imo: vessel.IMO.toString(),
            mmsi: vessel.MMSI.toString(),
            name: vessel.SHIPNAME,
            position: {
                lat: vessel.LAT,
                lng: vessel.LON
            },
            timestamp: new Date(vessel.TIMESTAMP),
            speed: vessel.SPEED,
            heading: vessel.HEADING,
            status: this.mapVesselStatus(vessel.STATUS),
            destination: vessel.DESTINATION,
            eta: vessel.ETA ? new Date(vessel.ETA) : undefined
        }));
    }
    /**
     * Transform vessel route data
     */
    transformVesselRoute(imo, data) {
        if (!data.success || !data.data) {
            return null;
        }
        const routePoints = data.data.map((point) => ({
            lat: point.LAT,
            lng: point.LON
        }));
        const waypoints = data.data.map((point) => ({
            position: {
                lat: point.LAT,
                lng: point.LON
            },
            timestamp: new Date(point.TIMESTAMP),
            event: point.STATUS_NAME
        }));
        return {
            imo,
            name: data.data[0]?.SHIPNAME || '',
            route: routePoints,
            waypoints
        };
    }
    /**
     * Transform port congestion data
     */
    transformPortCongestion(data) {
        if (!data.success || !data.data) {
            return [];
        }
        return data.data.map(port => ({
            portCode: port.port_id.toString(),
            portName: port.port_name,
            congestionLevel: this.mapCongestionLevel(port.congestion_factor),
            averageWaitTime: port.average_waiting_time,
            vesselsWaiting: port.vessels_in_port,
            lastUpdated: new Date(port.last_updated)
        }));
    }
    /**
     * Map Marine Traffic vessel status codes to readable status
     */
    mapVesselStatus(status) {
        const statusMap = {
            0: 'Under way using engine',
            1: 'At anchor',
            2: 'Not under command',
            3: 'Restricted manoeuvrability',
            4: 'Constrained by her draught',
            5: 'Moored',
            6: 'Aground',
            7: 'Engaged in fishing',
            8: 'Under way sailing',
            9: 'Reserved for future amendment',
            10: 'Reserved for future amendment',
            11: 'Power-driven vessel towing astern',
            12: 'Power-driven vessel pushing ahead',
            13: 'Reserved for future use',
            14: 'AIS-SART',
            15: 'Undefined'
        };
        return statusMap[status] || 'Unknown';
    }
    /**
     * Map congestion factor to congestion level
     */
    mapCongestionLevel(factor) {
        if (factor < 0.3)
            return 'low';
        if (factor < 0.6)
            return 'medium';
        if (factor < 0.8)
            return 'high';
        return 'critical';
    }
    /**
     * Handle API errors and convert to our error format
     */
    handleError(error) {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            switch (status) {
                case 401:
                    throw new Error('Invalid Marine Traffic API key');
                case 403:
                    throw new Error('Marine Traffic API access forbidden - check subscription');
                case 404:
                    throw new Error('Vessel not found in Marine Traffic database');
                case 429:
                    throw new Error('Marine Traffic API rate limit exceeded');
                default:
                    throw new Error(`Marine Traffic API error: ${status} ${error.response.statusText}`);
            }
        }
        else if (error.code === 'ECONNABORTED') {
            throw new Error('Marine Traffic API request timeout');
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new Error('Unable to connect to Marine Traffic API');
        }
        else {
            throw new Error(error.message || 'Unknown Marine Traffic API error');
        }
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
            name: 'marine-traffic',
            baseUrl: this.baseUrl,
            hasApiKey: !!this.apiKey,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            supportedTypes: ['vessel'],
            reliability: 0.90
        };
    }
}
exports.MarineTrafficAPIService = MarineTrafficAPIService;
//# sourceMappingURL=MarineTrafficAPIService.js.map