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

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}