import type { 
  ShipmentTracking, 
  TrackingType, 
  APIResponse, 
  ValidationResult 
} from '../types';
import { mockAPIServer } from './mockServer';
import { parseHttpError, withTimeout, retryWithBackoff } from '../utils';

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
    
    try {
      const response = await withTimeout(
        fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        }),
        this.timeout
      );

      if (!response.ok) {
        const errorData = {
          response: {
            status: response.status,
            statusText: response.statusText,
            data: await response.json().catch(() => ({})),
          }
        };
        throw errorData;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Parse and throw standardized error
      throw parseHttpError(error);
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

    return retryWithBackoff(
      () => this.request<ShipmentTracking>(`/track?${params}`).then(
        response => response.data!
      ),
      3,
      1000
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