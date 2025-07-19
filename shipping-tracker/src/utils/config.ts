/**
 * Secure configuration management
 */

/**
 * Environment variable validation and defaults
 */
export interface AppConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  useMockApi: boolean;
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  maxRequestSize: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  security: {
    allowedOrigins: string[];
    enableCSP: boolean;
    enableHSTS: boolean;
  };
}

/**
 * Validate environment variable
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Validate boolean environment variable
 */
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
}

/**
 * Validate number environment variable
 */
function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  
  return parsed;
}

/**
 * Validate array environment variable
 */
function getArrayEnvVar(key: string, defaultValue: string[] = []): string[] {
  const value = getEnvVar(key, defaultValue.join(','));
  
  if (!value) {
    return defaultValue;
  }
  
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Load and validate application configuration
 */
export function loadConfig(): AppConfig {
  try {
    const config: AppConfig = {
      apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001/api'),
      apiTimeout: getNumberEnvVar('VITE_API_TIMEOUT', 10000),
      useMockApi: getBooleanEnvVar('VITE_USE_MOCK_API', true),
      enableAnalytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', false),
      enableErrorTracking: getBooleanEnvVar('VITE_ENABLE_ERROR_TRACKING', false),
      maxRequestSize: getNumberEnvVar('VITE_MAX_REQUEST_SIZE', 1024 * 1024), // 1MB
      rateLimit: {
        maxRequests: getNumberEnvVar('VITE_RATE_LIMIT_MAX_REQUESTS', 10),
        windowMs: getNumberEnvVar('VITE_RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
      },
      security: {
        allowedOrigins: getArrayEnvVar('VITE_ALLOWED_ORIGINS', [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://localhost:3000',
          'https://localhost:5173',
        ]),
        enableCSP: getBooleanEnvVar('VITE_ENABLE_CSP', true),
        enableHSTS: getBooleanEnvVar('VITE_ENABLE_HSTS', false), // Only enable in production with HTTPS
      },
    };
    
    // Validate configuration
    validateConfig(config);
    
    return config;
  } catch (error) {
    console.error('Configuration error:', error);
    throw error;
  }
}

/**
 * Validate configuration values
 */
function validateConfig(config: AppConfig): void {
  // Validate API base URL
  try {
    new URL(config.apiBaseUrl);
  } catch {
    throw new Error('Invalid API base URL');
  }
  
  // Validate timeout
  if (config.apiTimeout <= 0) {
    throw new Error('API timeout must be positive');
  }
  
  // Validate max request size
  if (config.maxRequestSize <= 0) {
    throw new Error('Max request size must be positive');
  }
  
  // Validate rate limit settings
  if (config.rateLimit.maxRequests <= 0) {
    throw new Error('Rate limit max requests must be positive');
  }
  
  if (config.rateLimit.windowMs <= 0) {
    throw new Error('Rate limit window must be positive');
  }
  
  // Validate allowed origins
  for (const origin of config.security.allowedOrigins) {
    if (origin !== '*') {
      try {
        new URL(origin);
      } catch {
        throw new Error(`Invalid allowed origin: ${origin}`);
      }
    }
  }
}

/**
 * Get configuration for current environment
 */
export function getConfig(): AppConfig {
  // Cache configuration to avoid repeated validation
  if (!globalThis.__APP_CONFIG__) {
    globalThis.__APP_CONFIG__ = loadConfig();
  }
  
  return globalThis.__APP_CONFIG__;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD || process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Get safe configuration for client-side use (excludes sensitive data)
 */
export function getClientConfig(): Partial<AppConfig> {
  const config = getConfig();
  
  return {
    apiTimeout: config.apiTimeout,
    useMockApi: config.useMockApi,
    enableAnalytics: config.enableAnalytics,
    maxRequestSize: config.maxRequestSize,
    rateLimit: config.rateLimit,
    // Exclude sensitive configuration like API keys, internal URLs, etc.
  };
}

/**
 * Mask sensitive values in configuration for logging
 */
export function maskSensitiveConfig(config: any): any {
  const masked = { ...config };
  
  // List of keys that should be masked
  const sensitiveKeys = [
    'apiKey',
    'secret',
    'password',
    'token',
    'key',
  ];
  
  function maskValue(obj: any): any {
    if (typeof obj === 'string') {
      return obj.length > 4 ? `${obj.substring(0, 4)}****` : '****';
    }
    
    if (Array.isArray(obj)) {
      return obj.map(maskValue);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const shouldMask = sensitiveKeys.some(sensitiveKey => 
          key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );
        
        result[key] = shouldMask ? maskValue(value) : 
                     (typeof value === 'object' ? maskValue(value) : value);
      }
      
      return result;
    }
    
    return obj;
  }
  
  return maskValue(masked);
}

// Declare global type for configuration cache
declare global {
  var __APP_CONFIG__: AppConfig | undefined;
}