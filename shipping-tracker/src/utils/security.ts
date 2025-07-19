/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize tracking number input
 */
export function sanitizeTrackingNumber(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Only allow alphanumeric characters, hyphens, and spaces
  return input
    .replace(/[^A-Za-z0-9\-\s]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Validate email format (basic validation)
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format and ensure it's safe
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if request is allowed for given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  /**
   * Get time until next request is allowed
   */
  getTimeUntilReset(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    if (requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }
  
  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Content Security Policy helper
 */
export function generateCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for Tailwind
    "img-src 'self' data: https:", // Allow images from self, data URLs, and HTTPS
    "font-src 'self' https:", // Allow fonts from self and HTTPS
    "connect-src 'self' https:", // Allow connections to self and HTTPS
    "frame-ancestors 'none'", // Prevent framing
    "base-uri 'self'", // Restrict base URI
    "form-action 'self'", // Restrict form actions
  ];
  
  return directives.join('; ');
}

/**
 * Generate secure headers for API responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': generateCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Validate API key format (basic validation)
 */
export function isValidApiKey(apiKey: string): boolean {
  if (typeof apiKey !== 'string') {
    return false;
  }
  
  // API key should be at least 32 characters and contain only alphanumeric characters
  return /^[A-Za-z0-9]{32,}$/.test(apiKey);
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

/**
 * Hash sensitive data (simple hash for client-side use)
 */
export async function hashData(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Validate request origin
 */
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }
  
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

/**
 * Check if request is from a bot/crawler
 */
export function isBotRequest(userAgent: string): boolean {
  if (!userAgent) {
    return true; // Suspicious if no user agent
  }
  
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Validate request size
 */
export function isValidRequestSize(contentLength: number, maxSize: number = 1024 * 1024): boolean {
  return contentLength > 0 && contentLength <= maxSize;
}