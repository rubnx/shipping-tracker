// API-specific type definitions

import type { APIProvider, ShipmentTracking } from './index';

// External API Response Formats
export interface MaerskAPIResponse {
  shipmentId: string;
  status: string;
  events: MaerskEvent[];
  vessel?: MaerskVessel;
  containers: MaerskContainer[];
}

export interface MaerskEvent {
  eventType: string;
  eventDateTime: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  description: string;
}

export interface MaerskVessel {
  name: string;
  imo: string;
  voyage: string;
  eta?: string;
  ata?: string;
}

export interface MaerskContainer {
  containerNumber: string;
  containerSize: string;
  containerType: string;
  sealNumber?: string;
  weight?: {
    value: number;
    unit: string;
  };
}

// Generic API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers?: Record<string, string>;
  apiKey?: string;
}

// Rate Limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// API Request/Response Interceptors
export interface APIRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

export interface APIResponseMeta {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  duration: number;
  retryCount: number;
}

// Webhook types for real-time updates
export interface WebhookPayload {
  trackingNumber: string;
  provider: APIProvider;
  event: {
    type: string;
    timestamp: string;
    data: any;
  };
  signature?: string;
}

// API Error Response formats
export interface StandardAPIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Batch API operations
export interface BatchTrackingRequest {
  trackingNumbers: string[];
  providers?: APIProvider[];
  options?: {
    includeHistory: boolean;
    maxAge: number;
  };
}

export interface BatchTrackingResponse {
  results: Array<{
    trackingNumber: string;
    success: boolean;
    data?: ShipmentTracking;
    error?: StandardAPIError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}