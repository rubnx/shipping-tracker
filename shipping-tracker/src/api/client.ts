import type { 
  ShipmentTracking, 
  TrackingType, 
  APIResponse, 
  ValidationResult 
} from '../types';
import { mockAPIServer } from './mockServer';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = 10000; // 10 seconds
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'; // Default to true

// API client class
class APIClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  // Validate tracking number
  async validateTrackingNumber(trackingNumber: string): Promise<ValidationResult> {
    if (USE_MOCK_API) {
      return mockAPIServer.validateTrackingNumber(trackingNumber);
    }
    
    return this.request<ValidationResult>('/validate', {
      method: 'POST',
      body: JSON.stringify({ trackingNumber }),
    }).then(response => response.data!);
  }

  // Search for shipment
  async searchShipment(
    trackingNumber: string,
    type?: TrackingType
  ): Promise<ShipmentTracking> {
    if (USE_MOCK_API) {
      return mockAPIServer.searchShipment(trackingNumber, type);
    }
    
    const params = new URLSearchParams({ trackingNumber });
    if (type) params.append('type', type);

    return this.request<ShipmentTracking>(`/track?${params}`).then(
      response => response.data!
    );
  }

  // Get shipment details
  async getShipmentDetails(trackingNumber: string): Promise<ShipmentTracking> {
    if (USE_MOCK_API) {
      return mockAPIServer.getShipmentDetails(trackingNumber);
    }
    
    return this.request<ShipmentTracking>(`/shipments/${trackingNumber}`).then(
      response => response.data!
    );
  }

  // Refresh shipment data
  async refreshShipment(trackingNumber: string): Promise<ShipmentTracking> {
    if (USE_MOCK_API) {
      return mockAPIServer.refreshShipment(trackingNumber);
    }
    
    return this.request<ShipmentTracking>(`/shipments/${trackingNumber}/refresh`, {
      method: 'POST',
    }).then(response => response.data!);
  }

  // Get multiple shipments
  async getShipments(trackingNumbers: string[]): Promise<ShipmentTracking[]> {
    if (USE_MOCK_API) {
      return mockAPIServer.getShipments(trackingNumbers);
    }
    
    return this.request<ShipmentTracking[]>('/shipments/batch', {
      method: 'POST',
      body: JSON.stringify({ trackingNumbers }),
    }).then(response => response.data!);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    if (USE_MOCK_API) {
      return mockAPIServer.healthCheck();
    }
    
    return this.request<{ status: string; timestamp: string }>('/health').then(
      response => response.data!
    );
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for testing
export { APIClient };