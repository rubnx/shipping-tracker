import axios, { AxiosInstance } from 'axios';
import { config, apiProviders, APIProviderConfig } from '../config/environment';

export interface APIValidationResult {
  provider: string;
  valid: boolean;
  error?: string;
  responseTime?: number;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export interface APIHealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
  responseTime: number;
  error?: string;
}

/**
 * Service for validating API keys and checking API health
 * Implements Requirements 7.4, 10.1 for API key management and validation
 */
export class APIKeyValidator {
  private client: AxiosInstance;
  private healthCache: Map<string, APIHealthStatus> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = axios.create({
      timeout: config.api.timeout,
      headers: {
        'User-Agent': 'ShippingTracker/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validate all configured API keys
   */
  async validateAllKeys(): Promise<APIValidationResult[]> {
    const results: APIValidationResult[] = [];
    const enabledProviders = Object.entries(apiProviders).filter(([_, provider]) => provider.enabled);

    for (const [key, provider] of enabledProviders) {
      try {
        const result = await this.validateSingleKey(key, provider);
        results.push(result);
      } catch (error) {
        results.push({
          provider: provider.name,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Validate a single API key
   */
  private async validateSingleKey(providerKey: string, provider: APIProviderConfig): Promise<APIValidationResult> {
    const startTime = Date.now();

    try {
      // If no API key is required (free tier) or demo mode is enabled
      if (provider.tier === 'free' || config.demo.enabled) {
        return {
          provider: provider.name,
          valid: true,
          responseTime: Date.now() - startTime,
        };
      }

      // If API key is missing
      if (!provider.apiKey) {
        return {
          provider: provider.name,
          valid: false,
          error: 'API key not configured',
        };
      }

      // Perform actual validation based on provider
      const validationResult = await this.performProviderValidation(providerKey, provider);
      
      return {
        ...validationResult,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: provider.name,
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Perform provider-specific validation
   */
  private async performProviderValidation(providerKey: string, provider: APIProviderConfig): Promise<Omit<APIValidationResult, 'responseTime'>> {
    const headers: Record<string, string> = {};

    // Set authentication headers based on provider
    switch (providerKey) {
      case 'trackTrace':
        // Track-Trace doesn't require authentication for basic usage
        break;
      case 'shipsGo':
        if (provider.apiKey) {
          headers['X-API-Key'] = provider.apiKey;
        }
        break;
      case 'seaRates':
        if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }
        break;
      case 'maersk':
        if (provider.apiKey) {
          headers['Consumer-Key'] = provider.apiKey;
        }
        break;
      case 'msc':
        if (provider.apiKey) {
          headers['X-API-Key'] = provider.apiKey;
        }
        break;
      case 'project44':
        if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }
        break;
      default:
        if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }
    }

    try {
      // Try to make a simple API call to validate the key
      const testEndpoint = this.getValidationEndpoint(providerKey, provider);
      const response = await this.client.get(testEndpoint, { headers });

      // Extract rate limit information if available
      const rateLimit = this.extractRateLimitInfo(response.headers);

      return {
        provider: provider.name,
        valid: response.status === 200,
        rateLimit,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP status codes
        if (error.response?.status === 401) {
          return {
            provider: provider.name,
            valid: false,
            error: 'Invalid API key or unauthorized',
          };
        } else if (error.response?.status === 403) {
          return {
            provider: provider.name,
            valid: false,
            error: 'API key valid but access forbidden',
          };
        } else if (error.response?.status === 429) {
          return {
            provider: provider.name,
            valid: true, // Key is valid but rate limited
            error: 'Rate limit exceeded',
          };
        }
      }

      throw error;
    }
  }

  /**
   * Get validation endpoint for each provider
   */
  private getValidationEndpoint(providerKey: string, provider: APIProviderConfig): string {
    const baseEndpoints: Record<string, string> = {
      trackTrace: '/health',
      shipsGo: '/health',
      seaRates: '/health',
      maersk: '/health',
      msc: '/health',
      project44: '/health',
    };

    const endpoint = baseEndpoints[providerKey] || '/health';
    return `${provider.baseUrl}${endpoint}`;
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(headers: any): APIValidationResult['rateLimit'] {
    const remaining = headers['x-ratelimit-remaining'] || headers['x-rate-limit-remaining'];
    const reset = headers['x-ratelimit-reset'] || headers['x-rate-limit-reset'];

    if (remaining && reset) {
      return {
        remaining: parseInt(String(remaining), 10),
        reset: new Date(parseInt(String(reset), 10) * 1000),
      };
    }

    return undefined;
  }

  /**
   * Check health status of all APIs
   */
  async checkAPIHealth(): Promise<APIHealthStatus[]> {
    const results: APIHealthStatus[] = [];
    const enabledProviders = Object.entries(apiProviders).filter(([_, provider]) => provider.enabled);

    for (const [key, provider] of enabledProviders) {
      const cached = this.healthCache.get(key);
      
      // Use cached result if recent
      if (cached && Date.now() - cached.lastChecked.getTime() < this.HEALTH_CHECK_INTERVAL) {
        results.push(cached);
        continue;
      }

      try {
        const startTime = Date.now();
        const validation = await this.validateSingleKey(key, provider);
        const responseTime = Date.now() - startTime;

        const status: APIHealthStatus = {
          provider: provider.name,
          status: validation.valid ? 'healthy' : 'down',
          lastChecked: new Date(),
          responseTime,
          error: validation.error,
        };

        // Determine if service is degraded (slow response)
        if (status.status === 'healthy' && responseTime > 5000) {
          status.status = 'degraded';
        }

        this.healthCache.set(key, status);
        results.push(status);
      } catch (error) {
        const status: APIHealthStatus = {
          provider: provider.name,
          status: 'down',
          lastChecked: new Date(),
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Health check failed',
        };

        this.healthCache.set(key, status);
        results.push(status);
      }
    }

    return results;
  }

  /**
   * Get cached health status
   */
  getCachedHealthStatus(): APIHealthStatus[] {
    return Array.from(this.healthCache.values());
  }

  /**
   * Clear health cache
   */
  clearHealthCache(): void {
    this.healthCache.clear();
  }

  /**
   * Get API provider configuration summary
   */
  getProviderSummary(): {
    total: number;
    enabled: number;
    byTier: Record<string, number>;
    configured: string[];
    missing: string[];
  } {
    const allProviders = Object.values(apiProviders);
    const enabledProviders = allProviders.filter(p => p.enabled);
    
    const byTier = enabledProviders.reduce((acc, provider) => {
      acc[provider.tier] = (acc[provider.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const configured = enabledProviders
      .filter(p => p.apiKey || p.tier === 'free' || config.demo.enabled)
      .map(p => p.name);

    const missing = enabledProviders
      .filter(p => !p.apiKey && p.tier !== 'free' && !config.demo.enabled)
      .map(p => p.name);

    return {
      total: allProviders.length,
      enabled: enabledProviders.length,
      byTier,
      configured,
      missing,
    };
  }
}