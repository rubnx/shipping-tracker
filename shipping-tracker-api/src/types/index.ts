// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Tracking types
export type TrackingType = 'booking' | 'container' | 'bol';
export type ServiceType = 'FCL' | 'LCL';

export interface TrackingRequest {
  trackingNumber: string;
  type?: TrackingType;
}

export interface TrackingResponse {
  trackingNumber: string;
  trackingType: TrackingType;
  carrier: string;
  status: string;
  lastUpdated: string;
  // Additional fields will be added as we implement more features
}

// Database models
export interface ShipmentRecord {
  id: string;
  tracking_number: string;
  tracking_type: TrackingType;
  carrier?: string;
  service?: ServiceType;
  status?: string;
  data: any; // JSONB data
  last_updated: Date;
  expires_at?: Date;
  created_at: Date;
}

export interface SearchHistoryRecord {
  id: string;
  tracking_number: string;
  tracking_type?: TrackingType;
  search_count: number;
  last_searched: Date;
  user_session?: string;
  created_at: Date;
}

export interface ApiUsageRecord {
  id: string;
  api_provider: string;
  endpoint?: string;
  requests_count: number;
  window_start: Date;
  rate_limit_remaining?: number;
  created_at: Date;
}

// CRUD operation interfaces
export interface CreateShipmentData {
  tracking_number: string;
  tracking_type: TrackingType;
  carrier?: string;
  service?: ServiceType;
  status?: string;
  data: any;
  expires_at?: Date;
}

export interface UpdateShipmentData {
  carrier?: string;
  service?: ServiceType;
  status?: string;
  data?: any;
  expires_at?: Date;
}

export interface SearchHistoryData {
  tracking_number: string;
  tracking_type?: TrackingType;
  user_session?: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

// API Aggregator types
export interface RawTrackingData {
  provider: string;
  trackingNumber: string;
  data: any;
  timestamp: Date;
  reliability: number; // 0-1 score for data source reliability
  status: 'success' | 'error' | 'partial';
  error?: APIError;
}

export interface APIError {
  provider: string;
  errorType: 'RATE_LIMIT' | 'NOT_FOUND' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'AUTH_ERROR' | 'NETWORK_ERROR';
  message: string;
  retryAfter?: number;
  statusCode?: number;
}

export interface ShipmentData {
  trackingNumber: string;
  trackingType: TrackingType;
  carrier: string;
  service: ServiceType;
  status: string;
  timeline: TimelineEvent[];
  route?: RouteInfo;
  containers?: Container[];
  vessel?: VesselInfo;
  lastUpdated: Date;
  dataSource: string;
  reliability: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  isCompleted: boolean;
  coordinates?: LatLng;
}

export interface Container {
  number: string;
  size: '20ft' | '40ft' | '45ft';
  type: 'GP' | 'HC' | 'RF' | 'OT';
  sealNumber: string;
  weight?: number;
  dimensions?: Dimensions;
}

export interface VesselInfo {
  name: string;
  imo: string;
  voyage: string;
  currentPosition?: LatLng;
  eta?: Date;
  ata?: Date;
}

export interface RouteInfo {
  origin: Port;
  destination: Port;
  intermediateStops: Port[];
  estimatedTransitTime: number;
  actualTransitTime?: number;
}

export interface Port {
  code: string;
  name: string;
  city: string;
  country: string;
  coordinates: LatLng;
  timezone: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'ft' | 'm';
}

// API Provider configuration
export interface APIProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  reliability: number; // 0-1 score
  timeout: number; // milliseconds
  retryAttempts: number;
  supportedTypes: TrackingType[];
}