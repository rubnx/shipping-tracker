/**
 * Security middleware for API requests
 */

import { 
  sanitizeString, 
  sanitizeTrackingNumber, 
  RateLimiter, 
  getSecurityHeaders,
  isValidOrigin,
  isBotRequest,
  isValidRequestSize
} from '../utils/security';

// Rate limiter instances
const searchRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
const generalRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

/**
 * Security middleware for API requests
 */
export class SecurityMiddleware {
  private allowedOrigins: string[];
  private maxRequestSize: number;
  
  constructor(
    allowedOrigins: string[] = ['http://localhost:3000', 'http://localhost:5173'],
    maxRequestSize: number = 1024 * 1024 // 1MB
  ) {
    this.allowedOrigins = allowedOrigins;
    this.maxRequestSize = maxRequestSize;
  }
  
  /**
   * Validate request headers and origin
   */
  validateRequest(request: {
    headers: Record<string, string>;
    method: string;
    url: string;
    body?: any;
  }): { isValid: boolean; error?: string } {
    const { headers, method } = request;
    
    // Check origin for CORS
    const origin = headers.origin || headers.referer;
    if (origin && !isValidOrigin(origin, this.allowedOrigins)) {
      return { isValid: false, error: 'Invalid origin' };
    }
    
    // Check user agent for bot detection
    const userAgent = headers['user-agent'] || '';
    if (isBotRequest(userAgent)) {
      return { isValid: false, error: 'Bot requests not allowed' };
    }
    
    // Check request size
    const contentLength = parseInt(headers['content-length'] || '0', 10);
    if (contentLength > 0 && !isValidRequestSize(contentLength, this.maxRequestSize)) {
      return { isValid: false, error: 'Request too large' };
    }
    
    // Validate HTTP method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    if (!allowedMethods.includes(method.toUpperCase())) {
      return { isValid: false, error: 'Method not allowed' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Apply rate limiting
   */
  checkRateLimit(identifier: string, endpoint: string): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number; 
  } {
    const limiter = endpoint.includes('/track') ? searchRateLimiter : generalRateLimiter;
    
    const allowed = limiter.isAllowed(identifier);
    const remaining = limiter.getRemainingRequests(identifier);
    const resetTime = limiter.getTimeUntilReset(identifier);
    
    return { allowed, remaining, resetTime };
  }
  
  /**
   * Sanitize request data
   */
  sanitizeRequestData(data: any): any {
    if (typeof data === 'string') {
      return sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeRequestData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = sanitizeString(key);
        
        if (key === 'trackingNumber' && typeof value === 'string') {
          sanitized[sanitizedKey] = sanitizeTrackingNumber(value);
        } else {
          sanitized[sanitizedKey] = this.sanitizeRequestData(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * Get security headers for response
   */
  getResponseHeaders(): Record<string, string> {
    return getSecurityHeaders();
  }
  
  /**
   * Validate API key (if provided)
   */
  validateApiKey(apiKey?: string): boolean {
    if (!apiKey) {
      return true; // API key is optional for public endpoints
    }
    
    // In a real application, you would validate against a database
    // For now, we'll just check the format
    return /^[A-Za-z0-9]{32,}$/.test(apiKey);
  }
  
  /**
   * Log security events
   */
  logSecurityEvent(event: {
    type: 'rate_limit' | 'invalid_origin' | 'bot_detected' | 'invalid_request';
    identifier: string;
    details: any;
    timestamp?: Date;
  }): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };
    
    // In production, you would send this to a security monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Security Event]', logEntry);
    }
  }
}

/**
 * Default security middleware instance
 */
export const securityMiddleware = new SecurityMiddleware();

/**
 * Express-like middleware function
 */
export function createSecurityMiddleware(options?: {
  allowedOrigins?: string[];
  maxRequestSize?: number;
}) {
  const middleware = new SecurityMiddleware(
    options?.allowedOrigins,
    options?.maxRequestSize
  );
  
  return (req: any, res: any, next: any) => {
    // Get client identifier (IP address or user ID)
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Validate request
    const validation = middleware.validateRequest({
      headers: req.headers,
      method: req.method,
      url: req.url,
      body: req.body,
    });
    
    if (!validation.isValid) {
      middleware.logSecurityEvent({
        type: 'invalid_request',
        identifier,
        details: { error: validation.error, url: req.url },
      });
      
      return res.status(400).json({ error: validation.error });
    }
    
    // Check rate limit
    const rateLimit = middleware.checkRateLimit(identifier, req.url);
    
    if (!rateLimit.allowed) {
      middleware.logSecurityEvent({
        type: 'rate_limit',
        identifier,
        details: { url: req.url, resetTime: rateLimit.resetTime },
      });
      
      res.set({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetTime).toISOString(),
      });
      
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil(rateLimit.resetTime / 1000),
      });
    }
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    });
    
    // Sanitize request data
    if (req.body) {
      req.body = middleware.sanitizeRequestData(req.body);
    }
    
    if (req.query) {
      req.query = middleware.sanitizeRequestData(req.query);
    }
    
    // Set security headers
    res.set(middleware.getResponseHeaders());
    
    next();
  };
}