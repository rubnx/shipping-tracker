import { ShipmentService } from './ShipmentService';
import { 
  TrackingType, 
  ShipmentData, 
  APIError,
  TimelineEvent
} from '../types';

export interface TrackingError {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;
}

export interface TrackingResult {
  success: boolean;
  data?: ShipmentData;
  error?: TrackingError;
  fromCache?: boolean;
  dataAge?: number; // Age in minutes
}

export class TrackingService {
  private shipmentService: ShipmentService;
  private readonly CACHE_WARNING_AGE = 60; // 1 hour in minutes
  private readonly STALE_DATA_AGE = 1440; // 24 hours in minutes

  constructor() {
    this.shipmentService = new ShipmentService();
  }

  /**
   * Main tracking method with comprehensive error handling
   * Requirements: 5.3, 5.4, 5.5, 7.1, 7.4
   */
  async trackShipment(
    trackingNumber: string,
    trackingType?: TrackingType,
    userSession?: string,
    forceRefresh: boolean = false
  ): Promise<TrackingResult> {
    const startTime = Date.now();
    
    try {
      // Input validation
      const validationError = this.validateTrackingNumber(trackingNumber);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      console.log(`🔍 TrackingService: Starting tracking for ${trackingNumber}`);

      // If force refresh is requested, bypass cache
      if (forceRefresh) {
        return await this.performFreshTracking(trackingNumber, trackingType, userSession);
      }

      // Try to get cached data first
      const cachedResult = await this.getCachedTrackingData(trackingNumber, trackingType);
      if (cachedResult.success && cachedResult.data) {
        const dataAge = this.calculateDataAge(cachedResult.data.lastUpdated);
        
        // Return cached data if it's fresh enough
        if (dataAge < this.CACHE_WARNING_AGE) {
          console.log(`📦 Returning fresh cached data (${dataAge}min old)`);
          return {
            ...cachedResult,
            fromCache: true,
            dataAge
          };
        }
        
        // For older cached data, try to refresh but fall back to cache if needed
        console.log(`⚠️ Cached data is ${dataAge}min old, attempting refresh`);
        const freshResult = await this.performFreshTracking(trackingNumber, trackingType, userSession);
        
        if (freshResult.success) {
          return freshResult;
        } else {
          // Fresh tracking failed, return cached data with warning
          console.log(`⚠️ Fresh tracking failed, returning cached data`);
          return {
            success: true,
            data: cachedResult.data,
            fromCache: true,
            dataAge,
            error: {
              code: 'STALE_DATA_WARNING',
              message: 'Using cached data due to API unavailability',
              userMessage: `Showing cached data from ${this.formatDataAge(dataAge)} ago. Live data is temporarily unavailable.`,
              statusCode: 200,
              retryable: true,
              retryAfter: 300 // 5 minutes
            }
          };
        }
      }

      // No cached data available, perform fresh tracking
      return await this.performFreshTracking(trackingNumber, trackingType, userSession);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ TrackingService error after ${processingTime}ms:`, error);
      
      return {
        success: false,
        error: this.categorizeError(error)
      };
    }
  }

  /**
   * Refresh tracking data by bypassing cache
   */
  async refreshTrackingData(
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<TrackingResult> {
    console.log(`🔄 Refreshing tracking data for ${trackingNumber}`);
    return await this.trackShipment(trackingNumber, trackingType, undefined, true);
  }

  /**
   * Get tracking timeline/history
   */
  async getTrackingHistory(
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<{ success: boolean; data?: TimelineEvent[]; error?: TrackingError }> {
    try {
      const result = await this.trackShipment(trackingNumber, trackingType);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.timeline || []
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: 'HISTORY_UNAVAILABLE',
            message: 'Unable to retrieve tracking history',
            userMessage: 'Tracking history is currently unavailable. Please try again later.',
            statusCode: 503,
            retryable: true
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: this.categorizeError(error)
      };
    }
  }

  /**
   * Get search suggestions based on history
   */
  async getSearchSuggestions(
    partialInput: string,
    userSession?: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      return await this.shipmentService.getSearchSuggestions(partialInput, userSession, limit);
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get API provider health status
   */
  getProviderHealth(): { 
    providers: { name: string; reliability: number; available: boolean }[];
    overallHealth: 'healthy' | 'degraded' | 'unavailable';
  } {
    const providers = this.shipmentService.getAPIProviderStats();
    const availableProviders = providers.filter(p => p.available);
    const avgReliability = availableProviders.length > 0 
      ? availableProviders.reduce((sum, p) => sum + p.reliability, 0) / availableProviders.length 
      : 0;

    let overallHealth: 'healthy' | 'degraded' | 'unavailable';
    if (availableProviders.length === 0) {
      overallHealth = 'unavailable';
    } else if (avgReliability > 0.8 && availableProviders.length >= providers.length * 0.5) {
      overallHealth = 'healthy';
    } else {
      overallHealth = 'degraded';
    }

    return {
      providers,
      overallHealth
    };
  }

  /**
   * Perform fresh tracking without cache
   */
  private async performFreshTracking(
    trackingNumber: string,
    trackingType?: TrackingType,
    userSession?: string
  ): Promise<TrackingResult> {
    try {
      const shipmentData = await this.shipmentService.trackShipment(
        trackingNumber,
        trackingType,
        userSession
      );

      return {
        success: true,
        data: shipmentData,
        fromCache: false,
        dataAge: 0
      };
    } catch (error) {
      console.error(`❌ Fresh tracking failed for ${trackingNumber}:`, error);
      
      // Try to get stale cached data as last resort
      const staleResult = await this.getStaleTrackingData(trackingNumber, trackingType);
      if (staleResult.success && staleResult.data) {
        const dataAge = this.calculateDataAge(staleResult.data.lastUpdated);
        
        return {
          success: true,
          data: staleResult.data,
          fromCache: true,
          dataAge,
          error: {
            code: 'VERY_STALE_DATA',
            message: 'Using very old cached data',
            userMessage: `Showing cached data from ${this.formatDataAge(dataAge)} ago. Current tracking information is unavailable.`,
            statusCode: 200,
            retryable: true,
            retryAfter: 600 // 10 minutes
          }
        };
      }

      return {
        success: false,
        error: this.categorizeError(error)
      };
    }
  }

  /**
   * Get cached tracking data
   */
  private async getCachedTrackingData(
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<{ success: boolean; data?: ShipmentData }> {
    try {
      const cached = await this.shipmentService.getCachedShipment(trackingNumber, trackingType);
      if (cached && cached.data) {
        const shipmentData = this.shipmentService['transformCachedToShipmentData'](cached);
        return { success: true, data: shipmentData };
      }
      return { success: false };
    } catch (error) {
      console.error('Error getting cached data:', error);
      return { success: false };
    }
  }

  /**
   * Get stale cached data (even if expired)
   */
  private async getStaleTrackingData(
    trackingNumber: string,
    trackingType?: TrackingType
  ): Promise<{ success: boolean; data?: ShipmentData }> {
    try {
      const stale = await this.shipmentService['getStaleCache'](trackingNumber, trackingType);
      if (stale && stale.data) {
        const shipmentData = this.shipmentService['transformCachedToShipmentData'](stale);
        return { success: true, data: shipmentData };
      }
      return { success: false };
    } catch (error) {
      console.error('Error getting stale cached data:', error);
      return { success: false };
    }
  }

  /**
   * Validate tracking number format and content
   */
  private validateTrackingNumber(trackingNumber: string): TrackingError | null {
    if (!trackingNumber) {
      return {
        code: 'MISSING_TRACKING_NUMBER',
        message: 'Tracking number is required',
        userMessage: 'Please enter a tracking number to search.',
        statusCode: 400,
        retryable: false
      };
    }

    const cleaned = trackingNumber.trim();
    if (cleaned.length === 0) {
      return {
        code: 'EMPTY_TRACKING_NUMBER',
        message: 'Tracking number cannot be empty',
        userMessage: 'Please enter a valid tracking number.',
        statusCode: 400,
        retryable: false
      };
    }

    if (cleaned.length < 3) {
      return {
        code: 'TRACKING_NUMBER_TOO_SHORT',
        message: 'Tracking number is too short',
        userMessage: 'Tracking number must be at least 3 characters long.',
        statusCode: 400,
        retryable: false
      };
    }

    if (cleaned.length > 50) {
      return {
        code: 'TRACKING_NUMBER_TOO_LONG',
        message: 'Tracking number is too long',
        userMessage: 'Tracking number cannot exceed 50 characters.',
        statusCode: 400,
        retryable: false
      };
    }

    // Check for invalid characters
    if (!/^[A-Za-z0-9\-_]+$/.test(cleaned)) {
      return {
        code: 'INVALID_TRACKING_NUMBER_FORMAT',
        message: 'Tracking number contains invalid characters',
        userMessage: 'Tracking number can only contain letters, numbers, hyphens, and underscores.',
        statusCode: 400,
        retryable: false
      };
    }

    return null;
  }

  /**
   * Categorize errors into user-friendly messages
   */
  private categorizeError(error: any): TrackingError {
    if (typeof error === 'string') {
      if (error.includes('temporarily unavailable')) {
        return {
          code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: error,
          userMessage: 'Our tracking service is temporarily unavailable. Please try again in a few minutes.',
          statusCode: 503,
          retryable: true,
          retryAfter: 300
        };
      }
      
      if (error.includes('Unable to find tracking information')) {
        return {
          code: 'TRACKING_NOT_FOUND',
          message: error,
          userMessage: 'We couldn\'t find tracking information for this number. Please verify the tracking number and try again.',
          statusCode: 404,
          retryable: false
        };
      }
    }

    if (error instanceof Error) {
      // Network-related errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return {
          code: 'NETWORK_ERROR',
          message: error.message,
          userMessage: 'Unable to connect to tracking services. Please check your internet connection and try again.',
          statusCode: 503,
          retryable: true,
          retryAfter: 60
        };
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return {
          code: 'REQUEST_TIMEOUT',
          message: error.message,
          userMessage: 'The request took too long to complete. Please try again.',
          statusCode: 408,
          retryable: true,
          retryAfter: 30
        };
      }

      // Rate limiting errors
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.includes('Too Many Requests') ||
          error.message.includes('Rate limit exceeded')) {
        return {
          code: 'RATE_LIMITED',
          message: error.message,
          userMessage: 'Too many requests. Please wait a moment before searching again.',
          statusCode: 429,
          retryable: true,
          retryAfter: 60
        };
      }

      // Database errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        return {
          code: 'DATABASE_ERROR',
          message: error.message,
          userMessage: 'A temporary system error occurred. Please try again later.',
          statusCode: 503,
          retryable: true,
          retryAfter: 120
        };
      }
    }

    // Generic error fallback
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
      retryable: true,
      retryAfter: 300
    };
  }

  /**
   * Calculate data age in minutes
   */
  private calculateDataAge(lastUpdated: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastUpdated).getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Format data age for user display
   */
  private formatDataAge(ageInMinutes: number): string {
    if (ageInMinutes < 1) {
      return 'just now';
    } else if (ageInMinutes < 60) {
      return `${ageInMinutes} minute${ageInMinutes === 1 ? '' : 's'}`;
    } else if (ageInMinutes < 1440) {
      const hours = Math.floor(ageInMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    } else {
      const days = Math.floor(ageInMinutes / 1440);
      return `${days} day${days === 1 ? '' : 's'}`;
    }
  }
}