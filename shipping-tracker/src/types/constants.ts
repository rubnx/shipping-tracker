// Constants and enums for the shipping tracker application

// Tracking number format patterns
export const TRACKING_PATTERNS = {
  CONTAINER: /^[A-Z]{4}[0-9]{7}$/,
  BOOKING: /^[A-Z0-9]{6,12}$/,
  BOL: /^[A-Z]{2,4}[0-9A-Z]{6,15}$/,
} as const;

// Shipment status progression
export const SHIPMENT_STATUSES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  CONTAINER_LOADED: 'container_loaded',
  DEPARTED_ORIGIN: 'departed_origin',
  IN_TRANSIT: 'in_transit',
  ARRIVED_DESTINATION: 'arrived_destination',
  CONTAINER_DISCHARGED: 'container_discharged',
  AVAILABLE_PICKUP: 'available_pickup',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  CANCELLED: 'cancelled',
} as const;

// Status display labels
export const STATUS_LABELS = {
  [SHIPMENT_STATUSES.BOOKING_CONFIRMED]: 'Booking Confirmed',
  [SHIPMENT_STATUSES.CONTAINER_LOADED]: 'Container Loaded',
  [SHIPMENT_STATUSES.DEPARTED_ORIGIN]: 'Departed Origin Port',
  [SHIPMENT_STATUSES.IN_TRANSIT]: 'In Transit',
  [SHIPMENT_STATUSES.ARRIVED_DESTINATION]: 'Arrived at Destination',
  [SHIPMENT_STATUSES.CONTAINER_DISCHARGED]: 'Container Discharged',
  [SHIPMENT_STATUSES.AVAILABLE_PICKUP]: 'Available for Pickup',
  [SHIPMENT_STATUSES.DELIVERED]: 'Delivered',
  [SHIPMENT_STATUSES.DELAYED]: 'Delayed',
  [SHIPMENT_STATUSES.CANCELLED]: 'Cancelled',
} as const;

// API Providers
export const API_PROVIDERS = {
  MAERSK: 'maersk',
  CMA_CGM: 'cma_cgm',
  COSCO: 'cosco',
  HAPAG_LLOYD: 'hapag_lloyd',
  MSC: 'msc',
  MARINE_TRAFFIC: 'marine_traffic',
  VESSEL_FINDER: 'vessel_finder',
  SHIP24: 'ship24',
  TRACKING_MORE: 'tracking_more',
} as const;

// Container types and sizes
export const CONTAINER_SIZES = {
  TWENTY_FT: '20ft',
  FORTY_FT: '40ft',
  FORTY_FIVE_FT: '45ft',
} as const;

export const CONTAINER_TYPES = {
  GP: 'GP', // General Purpose
  HC: 'HC', // High Cube
  RF: 'RF', // Refrigerated
  OT: 'OT', // Open Top
} as const;

// Service types
export const SERVICE_TYPES = {
  FCL: 'FCL', // Full Container Load
  LCL: 'LCL', // Less than Container Load
} as const;

// Error types
export const ERROR_TYPES = {
  RATE_LIMIT: 'RATE_LIMIT',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

// Loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SEARCH_HISTORY: 'shipping-search-history',
  USER_PREFERENCES: 'shipping-user-preferences',
  CACHE_PREFIX: 'shipping-cache-',
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 300000, // 5 minutes
  RATE_LIMIT_WINDOW: 60000, // 1 minute
} as const;

// UI Configuration
export const UI_CONFIG = {
  SEARCH_DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 5000,
  MAX_SEARCH_HISTORY: 10,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
} as const;

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 4,
  MAX_ZOOM: 18,
  MIN_ZOOM: 2,
  DEFAULT_CENTER: { lat: 20, lng: 0 },
  MARKER_COLORS: {
    ORIGIN: '#10b981',
    DESTINATION: '#ef4444',
    INTERMEDIATE: '#f59e0b',
    VESSEL: '#3b82f6',
  },
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  TRACKING_NUMBER_REQUIRED: 'Please enter a tracking number',
  INVALID_TRACKING_NUMBER: 'Invalid tracking number format. Please check and try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;

// Format examples for tracking numbers
export const FORMAT_EXAMPLES = {
  container: 'ABCD1234567',
  booking: 'ABC123456789',
  bol: 'ABCD123456789012',
} as const;

// Supported carriers
export const CARRIERS = {
  MAERSK: 'Maersk',
  CMA_CGM: 'CMA CGM',
  COSCO: 'COSCO',
  HAPAG_LLOYD: 'Hapag-Lloyd',
  MSC: 'MSC',
  EVERGREEN: 'Evergreen',
  YANG_MING: 'Yang Ming',
  ONE: 'Ocean Network Express',
} as const;

// Time zones for common ports
export const PORT_TIMEZONES = {
  SHANGHAI: 'Asia/Shanghai',
  SINGAPORE: 'Asia/Singapore',
  ROTTERDAM: 'Europe/Amsterdam',
  LOS_ANGELES: 'America/Los_Angeles',
  HAMBURG: 'Europe/Berlin',
  ANTWERP: 'Europe/Brussels',
  HONG_KONG: 'Asia/Hong_Kong',
  BUSAN: 'Asia/Seoul',
} as const;