// Core type definitions for the shipping tracker application

// Enums and Union Types
export type TrackingType = 'booking' | 'container' | 'bol';
export type ServiceType = 'FCL' | 'LCL';
export type ContainerSize = '20ft' | '40ft' | '45ft';
export type ContainerType = 'GP' | 'HC' | 'RF' | 'OT';
export type ShipmentStatus = 
  | 'booking_confirmed'
  | 'container_loaded'
  | 'departed_origin'
  | 'in_transit'
  | 'arrived_destination'
  | 'container_discharged'
  | 'available_pickup'
  | 'delivered'
  | 'delayed'
  | 'cancelled';

export type APIProvider = 
  | 'maersk'
  | 'cma_cgm'
  | 'cosco'
  | 'hapag_lloyd'
  | 'msc'
  | 'marine_traffic'
  | 'vessel_finder'
  | 'ship24'
  | 'tracking_more';

export type ErrorType = 
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'SERVER_ERROR';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

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

// Timeline event structure
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  isCompleted: boolean;
  isCurrentStatus: boolean;
  coordinates?: LatLng;
}

// Container information
export interface Container {
  number: string;
  size: ContainerSize;
  type: ContainerType;
  sealNumber: string;
  weight?: number;
  dimensions?: Dimensions;
}

// Vessel information
export interface VesselInfo {
  name: string;
  imo: string;
  voyage: string;
  currentPosition?: LatLng;
  eta?: Date;
  ata?: Date;
}

// Port information
export interface Port {
  code: string;
  name: string;
  city: string;
  country: string;
  coordinates: LatLng;
  timezone: string;
}

// Route information
export interface RouteInfo {
  origin: Port;
  destination: Port;
  intermediateStops: Port[];
  estimatedTransitTime: number;
  actualTransitTime?: number;
  routePath?: LatLng[];
}

// Primary shipment tracking data
export interface ShipmentTracking {
  id: string;
  trackingNumber: string;
  trackingType: TrackingType;
  carrier: string;
  service: ServiceType;
  status: string;
  timeline: TimelineEvent[];
  route: RouteInfo;
  containers: Container[];
  vessel: VesselInfo;
  lastUpdated: Date;
  dataSource: string;
}

// API Error types
export interface APIError {
  provider: APIProvider;
  errorType: ErrorType;
  message: string;
  retryAfter?: number;
  statusCode?: number;
  timestamp: Date;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    source: APIProvider;
    timestamp: Date;
    requestId?: string;
  };
}

export interface RawTrackingData {
  provider: APIProvider;
  trackingNumber: string;
  status?: string;
  events?: any[];
  vessel?: any;
  route?: any;
  containers?: any[];
  lastUpdated: Date;
  raw: any; // Original API response
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: TrackingType;
  suggestions?: string[];
}

// Search History types
export interface SearchHistoryItem {
  trackingNumber: string;
  trackingType: TrackingType;
  searchCount: number;
  lastSearched: Date;
  carrier?: string;
}

// Loading and Error State types
export interface LoadingStates {
  search: LoadingState;
  details: LoadingState;
  timeline: LoadingState;
  map: LoadingState;
}

export interface ErrorStates {
  search: string | null;
  details: string | null;
  timeline: string | null;
  map: string | null;
}

// Component prop interfaces
export interface SearchComponentProps {
  onSearch: (query: string, type: TrackingType) => void;
  isLoading: boolean;
  recentSearches: SearchHistoryItem[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  loadingMessage?: string;
  showProgress?: boolean;
}

export interface SearchState {
  query: string;
  detectedType: TrackingType | null;
  validationError: string | null;
}

export interface TimelineComponentProps {
  events: TimelineEvent[];
  currentStatus: string;
  completionPercentage: number;
  isLoading?: boolean;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export interface MapComponentProps {
  route: RouteInfo;
  vesselPosition?: LatLng;
  ports: Port[];
  onMarkerClick: (location: Port) => void;
  height?: string | number;
  className?: string;
  showControls?: boolean;
  interactive?: boolean;
}

export interface ShipmentDetailsProps {
  shipment: ShipmentTracking;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  className?: string;
  showActions?: boolean;
}

// Service Layer Interfaces
export interface TrackingService {
  trackShipment(trackingNumber: string, type: TrackingType): Promise<ShipmentTracking>;
  getTrackingHistory(trackingNumber: string): Promise<TimelineEvent[]>;
  refreshTrackingData(trackingNumber: string): Promise<ShipmentTracking>;
}

export interface APIAggregator {
  fetchFromMultipleSources(trackingNumber: string): Promise<RawTrackingData[]>;
  prioritizeDataSources(data: RawTrackingData[]): ShipmentTracking;
  handleAPIFailures(errors: APIError[]): void;
}

// Database/Storage types
export interface CachedShipment {
  id: string;
  trackingNumber: string;
  trackingType: TrackingType;
  carrier?: string;
  service?: ServiceType;
  status?: string;
  data: ShipmentTracking;
  lastUpdated: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface APIUsageRecord {
  id: string;
  apiProvider: APIProvider;
  endpoint: string;
  requestsCount: number;
  windowStart: Date;
  rateLimitRemaining?: number;
}

// Hook return types
export interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  detectedType: TrackingType | null;
  validationError: string | null;
  isSearching: boolean;
  searchResults: ShipmentTracking | null;
  searchError: string | null;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

export interface UseSearchHistoryReturn {
  history: SearchHistoryItem[];
  addToHistory: (item: Omit<SearchHistoryItem, 'searchCount' | 'lastSearched'>) => void;
  removeFromHistory: (trackingNumber: string) => void;
  clearHistory: () => void;
  getFilteredHistory: (query: string) => SearchHistoryItem[];
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    rateLimitWindow: number;
  };
  cache: {
    defaultTTL: number;
    maxEntries: number;
  };
  features: {
    enableMaps: boolean;
    enableRealTimeUpdates: boolean;
    enableSearchHistory: boolean;
  };
}

// Event types for real-time updates
export interface TrackingUpdateEvent {
  trackingNumber: string;
  status: ShipmentStatus;
  timestamp: Date;
  location?: string;
  description?: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Form and Input types
export interface SearchFormData {
  trackingNumber: string;
  trackingType?: TrackingType;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  name?: string;
}

// Notification types
export interface NotificationConfig {
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  notificationTypes: {
    statusUpdates: boolean;
    delays: boolean;
    delivery: boolean;
  };
}

// Analytics and Metrics types
export interface SearchMetrics {
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  averageResponseTime: number;
  popularCarriers: Record<string, number>;
  searchesByType: Record<TrackingType, number>;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  errorRate: number;
}

// Re-export types from other files
export * from './api';
export * from './components';