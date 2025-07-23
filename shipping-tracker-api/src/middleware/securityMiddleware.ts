import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { loggingService } from '../services/LoggingService';

// Rate limiting configurations
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req, res) => {
      loggingService.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
      
      res.status(429).json({
        error: options.message || 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests for this endpoint, please try again later.',
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Input validation schemas
export const trackingNumberValidation = [
  param('trackingNumber')
    .isLength({ min: 1, max: 50 })
    .matches(/^[A-Z0-9\-_]+$/i)
    .withMessage('Invalid tracking number format'),
];

export const searchValidation = [
  query('trackingNumber')
    .optional()
    .isLength({ min: 1, max: 50 })
    .matches(/^[A-Z0-9\-_]+$/i)
    .withMessage('Invalid tracking number format'),
  query('type')
    .optional()
    .isIn(['container', 'booking', 'bol'])
    .withMessage('Invalid tracking type'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
];

export const apiKeyValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Invalid API key name'),
  body('provider')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Invalid provider name'),
  body('environment')
    .isIn(['development', 'staging', 'production'])
    .withMessage('Invalid environment'),
];

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Remove potential XSS payloads
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] });
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names
      const sanitizedKey = DOMPurify.sanitize(key, { ALLOWED_TAGS: [] });
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    loggingService.warn('Validation errors', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }

  next();
};

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and API endpoints with proper authentication
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    loggingService.warn('CSRF token validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasToken: !!csrfToken,
      hasSessionToken: !!sessionToken,
    });

    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
    });
  }

  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      loggingService.warn('IP not in whitelist', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_ALLOWED',
      });
    }

    next();
  };
};

// Suspicious activity detection
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i, // XSS patterns
    /(union|select|insert|delete|drop|create|alter|exec)/i, // SQL injection patterns
    /(\.\.\/|\.\.\\|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal patterns
    /(<\?php|\<\%|\$\{|#\{)/i, // Code injection patterns
  ];

  const checkForSuspiciousContent = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkForSuspiciousContent);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkForSuspiciousContent);
    }
    
    return false;
  };

  const isSuspicious = 
    checkForSuspiciousContent(req.body) ||
    checkForSuspiciousContent(req.query) ||
    checkForSuspiciousContent(req.params);

  if (isSuspicious) {
    loggingService.warn('Suspicious activity detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      params: req.params,
    });

    return res.status(400).json({
      error: 'Suspicious content detected',
      code: 'SUSPICIOUS_CONTENT',
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 1024 * 1024) => { // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      loggingService.warn('Request size too large', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        contentLength,
        maxSize,
      });

      return res.status(413).json({
        error: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize,
      });
    }

    next();
  };
};

// Audit logging middleware
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  loggingService.info('API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    loggingService.info('API response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};