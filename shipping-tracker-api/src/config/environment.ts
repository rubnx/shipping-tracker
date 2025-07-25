import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Database Configuration
  DATABASE_URL: z.string().optional(),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.string().default('5432').transform(Number),
  DATABASE_NAME: z.string().default('shipping_tracker'),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string().default('password'),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DATABASE: z.string().default('0').transform(Number),

  // Security Configuration
  JWT_SECRET: z.string().min(32),
  API_SECRET_KEY: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  API_RATE_LIMIT_PER_MINUTE: z.string().default('60').transform(Number),

  // Demo Mode
  DEMO_MODE: z.string().default('true').transform(val => val === 'true'),
  ENABLE_MOCK_DATA: z.string().default('true').transform(val => val === 'true'),
  CACHE_TTL_SECONDS: z.string().default('300').transform(Number),

  // API Configuration
  API_TIMEOUT_MS: z.string().default('10000').transform(Number),
  API_RETRY_ATTEMPTS: z.string().default('3').transform(Number),
  API_RETRY_DELAY_MS: z.string().default('1000').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_REQUEST_LOGGING: z.string().default('true').transform(val => val === 'true'),

  // Free Tier APIs
  TRACK_TRACE_API_KEY: z.string().optional(),
  TRACK_TRACE_BASE_URL: z.string().default('https://api.track-trace.com/v1'),
  TRACK_TRACE_ENABLED: z.string().default('true').transform(val => val === 'true'),
  SHIPSGO_API_KEY: z.string().optional(),
  SHIPSGO_BASE_URL: z.string().default('https://api.shipsgo.com/v2'),
  SHIPSGO_ENABLED: z.string().default('true').transform(val => val === 'true'),
  SEARATES_API_KEY: z.string().optional(),
  SEARATES_BASE_URL: z.string().default('https://api.searates.com/v1'),
  SEARATES_ENABLED: z.string().default('true').transform(val => val === 'true'),

  // Premium APIs (optional for development)
  MAERSK_API_KEY: z.string().optional(),
  MAERSK_BASE_URL: z.string().default('https://api.maersk.com/track'),
  MSC_API_KEY: z.string().optional(),
  MSC_BASE_URL: z.string().default('https://api.msc.com/tracking'),
  PROJECT44_API_KEY: z.string().optional(),
  PROJECT44_BASE_URL: z.string().default('https://api.project44.com/v4'),
});

// Validate and parse environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment configuration:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

// API Provider Configuration
export interface APIProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  enabled: boolean;
  tier: 'free' | 'freemium' | 'premium';
  rateLimit: number;
  timeout: number;
}

export const apiProviders: Record<string, APIProviderConfig> = {
  trackTrace: {
    name: 'Track-Trace',
    apiKey: env.TRACK_TRACE_API_KEY,
    baseUrl: env.TRACK_TRACE_BASE_URL,
    enabled: env.TRACK_TRACE_ENABLED,
    tier: 'free',
    rateLimit: 100, // requests per hour
    timeout: env.API_TIMEOUT_MS,
  },
  shipsGo: {
    name: 'ShipsGo',
    apiKey: env.SHIPSGO_API_KEY,
    baseUrl: env.SHIPSGO_BASE_URL,
    enabled: env.SHIPSGO_ENABLED && (!!env.SHIPSGO_API_KEY || env.DEMO_MODE),
    tier: 'freemium',
    rateLimit: 1000, // requests per day
    timeout: env.API_TIMEOUT_MS,
  },
  seaRates: {
    name: 'SeaRates',
    apiKey: env.SEARATES_API_KEY,
    baseUrl: env.SEARATES_BASE_URL,
    enabled: env.SEARATES_ENABLED && (!!env.SEARATES_API_KEY || env.DEMO_MODE),
    tier: 'freemium',
    rateLimit: 500, // requests per day
    timeout: env.API_TIMEOUT_MS,
  },
  maersk: {
    name: 'Maersk',
    apiKey: env.MAERSK_API_KEY,
    baseUrl: env.MAERSK_BASE_URL,
    enabled: !!env.MAERSK_API_KEY,
    tier: 'premium',
    rateLimit: 10000, // requests per day
    timeout: env.API_TIMEOUT_MS,
  },
  msc: {
    name: 'MSC',
    apiKey: env.MSC_API_KEY,
    baseUrl: env.MSC_BASE_URL,
    enabled: !!env.MSC_API_KEY,
    tier: 'premium',
    rateLimit: 10000, // requests per day
    timeout: env.API_TIMEOUT_MS,
  },
  project44: {
    name: 'Project44',
    apiKey: env.PROJECT44_API_KEY,
    baseUrl: env.PROJECT44_BASE_URL,
    enabled: !!env.PROJECT44_API_KEY,
    tier: 'premium',
    rateLimit: 50000, // requests per day
    timeout: env.API_TIMEOUT_MS,
  },
};

// Environment configuration export
export const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
    corsOrigin: env.CORS_ORIGIN,
  },
  database: {
    url: env.DATABASE_URL || `postgresql://${env.DATABASE_USER}:${env.DATABASE_PASSWORD}@${env.DATABASE_HOST}:${env.DATABASE_PORT}/${env.DATABASE_NAME}`,
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    name: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
  },
  redis: {
    url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    database: env.REDIS_DATABASE,
  },
  security: {
    jwtSecret: env.JWT_SECRET,
    apiSecretKey: env.API_SECRET_KEY,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    apiRateLimitPerMinute: env.API_RATE_LIMIT_PER_MINUTE,
  },
  demo: {
    enabled: env.DEMO_MODE,
    enableMockData: env.ENABLE_MOCK_DATA,
    cacheTtlSeconds: env.CACHE_TTL_SECONDS,
  },
  api: {
    timeout: env.API_TIMEOUT_MS,
    retryAttempts: env.API_RETRY_ATTEMPTS,
    retryDelay: env.API_RETRY_DELAY_MS,
  },
  logging: {
    level: env.LOG_LEVEL,
    enableRequestLogging: env.ENABLE_REQUEST_LOGGING,
  },
  apiProviders,
};

// API Key validation functions
export function validateAPIKeys(): { valid: string[]; invalid: string[]; warnings: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];

  Object.entries(apiProviders).forEach(([key, provider]) => {
    if (provider.enabled) {
      if (provider.apiKey && provider.apiKey.length > 0) {
        valid.push(provider.name);
      } else if (provider.tier === 'free') {
        valid.push(`${provider.name} (no key required)`);
      } else if (env.DEMO_MODE) {
        warnings.push(`${provider.name} will use mock data (demo mode)`);
        valid.push(`${provider.name} (demo mode)`);
      } else {
        invalid.push(`${provider.name} (missing API key)`);
      }
    }
  });

  return { valid, invalid, warnings };
}

// Get enabled API providers
export function getEnabledProviders(): APIProviderConfig[] {
  return Object.values(apiProviders).filter(provider => provider.enabled);
}

// Get providers by tier
export function getProvidersByTier(tier: 'free' | 'freemium' | 'premium'): APIProviderConfig[] {
  return getEnabledProviders().filter(provider => provider.tier === tier);
}

// Check if demo mode is enabled
export function isDemoMode(): boolean {
  return env.DEMO_MODE;
}

// Check if mock data is enabled
export function isMockDataEnabled(): boolean {
  return env.ENABLE_MOCK_DATA;
}

// Validate environment configuration
export function validateEnvironment(): boolean {
  try {
    envSchema.parse(process.env);
    return true;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    return false;
  }
}

export default config;