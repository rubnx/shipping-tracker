import { Request, Response, NextFunction } from 'express';
import { apiKeyManager } from '../services/APIKeyManager';
import { requestSigningService } from '../services/RequestSigningService';
import { loggingService } from '../services/LoggingService';

export interface AuthenticatedRequest extends Request {
  apiKeyId?: string;
  apiKey?: any;
  rateLimitInfo?: {
    remaining: number;
    resetTime?: Date;
  };
}

// Middleware to validate API key usage
export const apiKeyValidation = (requiredProvider?: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const providerHeader = req.headers['x-provider'] as string;

    if (!apiKeyHeader) {
      return res.status(401).json({
        error: 'API key required',
        code: 'MISSING_API_KEY',
      });
    }

    // Find the API key
    const provider = requiredProvider || providerHeader;
    if (!provider) {
      return res.status(400).json({
        error: 'Provider must be specified',
        code: 'MISSING_PROVIDER',
      });
    }

    const apiKey = apiKeyManager.getAPIKey(provider);
    if (!apiKey) {
      loggingService.warn('API key not found', {
        provider,
        requestPath: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      return res.status(401).json({
        error: 'Invalid API key or provider',
        code: 'INVALID_API_KEY',
      });
    }

    // Verify the provided key matches
    if (apiKey.key !== apiKeyHeader) {
      loggingService.warn('API key mismatch', {
        keyId: apiKey.id,
        provider,
        requestPath: req.path,
        ip: req.ip,
      });

      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    // Check rate limits
    const rateLimitResult = apiKeyManager.checkRateLimit(apiKey.id);
    if (!rateLimitResult.allowed) {
      loggingService.warn('Rate limit exceeded', {
        keyId: apiKey.id,
        provider,
        resetTime: rateLimitResult.resetTime,
        requestPath: req.path,
        ip: req.ip,
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: rateLimitResult.resetTime,
        retryAfter: rateLimitResult.resetTime 
          ? Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000)
          : 60,
      });
    }

    // Attach API key info to request
    req.apiKeyId = apiKey.id;
    req.apiKey = apiKey;
    req.rateLimitInfo = {
      remaining: rateLimitResult.remaining || 0,
      resetTime: rateLimitResult.resetTime,
    };

    // Add rate limit headers
    res.set({
      'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime 
        ? Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString()
        : '',
    });

    next();
  };
};

// Middleware to record API key usage
export const recordAPIUsage = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;

    if (req.apiKeyId) {
      apiKeyManager.recordUsage(
        req.apiKeyId,
        req.path,
        success,
        responseTime,
        success ? undefined : `HTTP ${res.statusCode}`
      );
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Middleware for signed requests (high-security operations)
export const requireSignedRequest = (req: Request, res: Response, next: NextFunction) => {
  const validationResult = requestSigningService.validateSignature(req);

  if (!validationResult.isValid) {
    loggingService.warn('Invalid request signature', {
      error: validationResult.error,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: validationResult.timestamp,
      age: validationResult.age,
    });

    return res.status(401).json({
      error: 'Invalid request signature',
      code: 'INVALID_SIGNATURE',
      details: validationResult.error,
    });
  }

  loggingService.debug('Request signature validated', {
    path: req.path,
    method: req.method,
    age: validationResult.age,
  });

  next();
};

// Middleware to validate admin operations
export const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers['x-admin-key'] as string;
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  if (!expectedAdminKey) {
    loggingService.error('Admin API key not configured');
    return res.status(500).json({
      error: 'Admin operations not available',
      code: 'ADMIN_NOT_CONFIGURED',
    });
  }

  if (!adminKey || adminKey !== expectedAdminKey) {
    loggingService.warn('Invalid admin key attempt', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }

  next();
};

// Middleware to log sensitive operations
export const logSensitiveOperation = (operation: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    loggingService.info(`Sensitive operation: ${operation}`, {
      operation,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      apiKeyId: req.apiKeyId,
      timestamp: new Date().toISOString(),
    });

    next();
  };
};