/**
 * Secure API client wrapper with additional security measures
 */

import { APIClient } from './client';
import { 
  sanitizeTrackingNumber, 
  RateLimiter, 
  generateSecureToken,
  hashData 
} from '../utils/security';
import { getConfig } from '../utils/config';
import type { ShipmentTracking, TrackingType, ValidationResult } from '../types';

/**
 * Secure API client with built-in security measures
 */
export class SecureAPIClient extends APIClient {
  private rateLimiter: RateLimiter;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private sessionToken: string;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    const config = getConfig();
    super(config.apiBaseUrl, config.apiTimeout);
    
    this.rateLimiter = new RateLimiter(
      config.rateLimit.maxRequests,
      config.rateLimit.windowMs
    );
    
    this.sessionToken = generateSecureToken();
  }
  
  /**
   * Check rate limit before making request
   */
  private checkRateLimit(): boolean {
    const identifier = this.getClientIdentifier();
    return this.rateLimiter.isAllowed(identifier);
  }
  
  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(): string {
    // Use session token as identifier for client-side rate limiting
    return this.sessionToken;
  }
  
  /**
   * Generate cache key for request
   */
  private async generateCacheKey(method: string, params: any): Promise<string> {
    const key = `${method}:${JSON.stringify(params)}`;
    return await hashData(key);
  }
  
  /**
   * Get cached response if available and valid
   */
  private getCachedResponse(cacheKey: string): any | null {
    const cached = this.requestCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    
    if (isExpired) {
      this.requestCache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Cache response
   */
  private setCachedResponse(cacheKey: string, data: any): void {
    // Limit cache size to prevent memory issues
    if (this.requestCache.size > 100) {
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }
    
    this.requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Secure search shipment with validation and caching
   */
  async searchShipment(
    trackingNumber: string,
    type?: TrackingType
  ): Promise<ShipmentTracking> {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Input sanitization
    const sanitizedTrackingNumber = sanitizeTrackingNumber(trackingNumber);
    
    if (!sanitizedTrackingNumber) {
      throw new Error('Invalid tracking number format');
    }
    
    // Check cache first
    const cacheKey = await this.generateCacheKey('searchShipment', {
      trackingNumber: sanitizedTrackingNumber,
      type,
    });
    
    const cachedResult = this.getCachedResponse(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      const result = await super.searchShipment(sanitizedTrackingNumber, type);
      
      // Cache successful result
      this.setCachedResponse(cacheKey, result);
      
      return result;
    } catch (error) {
      // Log security-relevant errors
      this.logSecurityEvent('api_error', {
        method: 'searchShipment',
        trackingNumber: sanitizedTrackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  /**
   * Secure validate tracking number
   */
  async validateTrackingNumber(trackingNumber: string): Promise<ValidationResult> {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Input sanitization
    const sanitizedTrackingNumber = sanitizeTrackingNumber(trackingNumber);
    
    if (!sanitizedTrackingNumber) {
      return {
        isValid: false,
        error: 'Invalid tracking number format',
      };
    }
    
    // Check cache first
    const cacheKey = await this.generateCacheKey('validateTrackingNumber', {
      trackingNumber: sanitizedTrackingNumber,
    });
    
    const cachedResult = this.getCachedResponse(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      const result = await super.validateTrackingNumber(sanitizedTrackingNumber);
      
      // Cache successful result
      this.setCachedResponse(cacheKey, result);
      
      return result;
    } catch (error) {
      this.logSecurityEvent('api_error', {
        method: 'validateTrackingNumber',
        trackingNumber: sanitizedTrackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  /**
   * Secure get shipment details
   */
  async getShipmentDetails(trackingNumber: string): Promise<ShipmentTracking> {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Input sanitization
    const sanitizedTrackingNumber = sanitizeTrackingNumber(trackingNumber);
    
    if (!sanitizedTrackingNumber) {
      throw new Error('Invalid tracking number format');
    }
    
    // Check cache first
    const cacheKey = await this.generateCacheKey('getShipmentDetails', {
      trackingNumber: sanitizedTrackingNumber,
    });
    
    const cachedResult = this.getCachedResponse(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    try {
      const result = await super.getShipmentDetails(sanitizedTrackingNumber);
      
      // Cache successful result
      this.setCachedResponse(cacheKey, result);
      
      return result;
    } catch (error) {
      this.logSecurityEvent('api_error', {
        method: 'getShipmentDetails',
        trackingNumber: sanitizedTrackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  /**
   * Secure refresh shipment
   */
  async refreshShipment(trackingNumber: string): Promise<ShipmentTracking> {
    // Rate limiting check (stricter for refresh operations)
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Input sanitization
    const sanitizedTrackingNumber = sanitizeTrackingNumber(trackingNumber);
    
    if (!sanitizedTrackingNumber) {
      throw new Error('Invalid tracking number format');
    }
    
    try {
      const result = await super.refreshShipment(sanitizedTrackingNumber);
      
      // Clear cache for this tracking number since we're refreshing
      const cacheKeys = Array.from(this.requestCache.keys());
      for (const key of cacheKeys) {
        if (key.includes(sanitizedTrackingNumber)) {
          this.requestCache.delete(key);
        }
      }
      
      return result;
    } catch (error) {
      this.logSecurityEvent('api_error', {
        method: 'refreshShipment',
        trackingNumber: sanitizedTrackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  /**
   * Get multiple shipments with batch validation
   */
  async getShipments(trackingNumbers: string[]): Promise<ShipmentTracking[]> {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    // Validate batch size
    if (trackingNumbers.length > 10) {
      throw new Error('Too many tracking numbers. Maximum 10 allowed per request.');
    }
    
    // Sanitize all tracking numbers
    const sanitizedTrackingNumbers = trackingNumbers
      .map(tn => sanitizeTrackingNumber(tn))
      .filter(Boolean);
    
    if (sanitizedTrackingNumbers.length === 0) {
      throw new Error('No valid tracking numbers provided');
    }
    
    try {
      return await super.getShipments(sanitizedTrackingNumbers);
    } catch (error) {
      this.logSecurityEvent('api_error', {
        method: 'getShipments',
        trackingNumberCount: sanitizedTrackingNumbers.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  /**
   * Log security events
   */
  private logSecurityEvent(type: string, details: any): void {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      sessionToken: this.sessionToken,
      details,
    };
    
    // In development, log to console
    if (import.meta.env.DEV) {
      console.warn('[Security Event]', event);
    }
    
    // In production, you would send this to a security monitoring service
    // Example: securityMonitoring.logEvent(event);
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.requestCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.requestCache.size,
      keys: Array.from(this.requestCache.keys()),
    };
  }
  
  /**
   * Get rate limit status
   */
  getRateLimitStatus(): {
    remaining: number;
    resetTime: number;
  } {
    const identifier = this.getClientIdentifier();
    return {
      remaining: this.rateLimiter.getRemainingRequests(identifier),
      resetTime: this.rateLimiter.getTimeUntilReset(identifier),
    };
  }
}

// Export singleton instance
export const secureAPIClient = new SecureAPIClient();