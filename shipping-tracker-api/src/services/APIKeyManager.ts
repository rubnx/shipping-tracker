import crypto from 'crypto';
import { loggingService } from './LoggingService';

export interface APIKey {
  id: string;
  name: string;
  key: string;
  encryptedKey: string;
  provider: string;
  environment: 'development' | 'staging' | 'production';
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  usageCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  metadata?: Record<string, any>;
}

export interface APIKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
}

class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private usage: APIKeyUsage[] = [];
  private encryptionKey: string;
  private rotationSchedule: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.encryptionKey = process.env.API_KEY_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.loadAPIKeys();
    this.startRotationScheduler();
  }

  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    loggingService.warn('Generated new encryption key. Store this securely: API_KEY_ENCRYPTION_KEY');
    return key;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private loadAPIKeys(): void {
    // Load API keys from environment variables
    const providers = [
      'MAERSK', 'MSC', 'CMA_CGM', 'COSCO', 'HAPAG_LLOYD',
      'EVERGREEN', 'ONE_LINE', 'YANG_MING', 'ZIM',
      'PROJECT44', 'MARINE_TRAFFIC', 'VESSEL_FINDER',
      'TRACK_TRACE', 'SHIPSGO', 'SEARATES'
    ];

    providers.forEach(provider => {
      const apiKey = process.env[`${provider}_API_KEY`];
      if (apiKey && apiKey !== 'your_api_key_here') {
        this.addAPIKey({
          name: `${provider} API Key`,
          key: apiKey,
          provider: provider.toLowerCase(),
          environment: (process.env.NODE_ENV as any) || 'development',
          rateLimit: this.getDefaultRateLimit(provider),
        });
      }
    });

    loggingService.info(`Loaded ${this.keys.size} API keys`);
  }

  private getDefaultRateLimit(provider: string): APIKey['rateLimit'] {
    // Default rate limits based on typical API provider limits
    const rateLimits: Record<string, APIKey['rateLimit']> = {
      'PROJECT44': { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 },
      'MAERSK': { requestsPerMinute: 30, requestsPerHour: 500, requestsPerDay: 5000 },
      'MSC': { requestsPerMinute: 20, requestsPerHour: 300, requestsPerDay: 3000 },
      'TRACK_TRACE': { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 1000 },
      'SHIPSGO': { requestsPerMinute: 15, requestsPerHour: 200, requestsPerDay: 2000 },
      'SEARATES': { requestsPerMinute: 12, requestsPerHour: 150, requestsPerDay: 1500 },
    };

    return rateLimits[provider] || { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 1000 };
  }

  public addAPIKey(config: {
    name: string;
    key: string;
    provider: string;
    environment: 'development' | 'staging' | 'production';
    expiresAt?: Date;
    rateLimit?: APIKey['rateLimit'];
    metadata?: Record<string, any>;
  }): string {
    const id = crypto.randomUUID();
    const encryptedKey = this.encrypt(config.key);

    const apiKey: APIKey = {
      id,
      name: config.name,
      key: config.key, // Keep in memory for quick access
      encryptedKey,
      provider: config.provider,
      environment: config.environment,
      isActive: true,
      createdAt: new Date(),
      usageCount: 0,
      expiresAt: config.expiresAt,
      rateLimit: config.rateLimit,
      metadata: config.metadata,
    };

    this.keys.set(id, apiKey);

    // Schedule rotation if expiration is set
    if (config.expiresAt) {
      this.scheduleRotation(id, config.expiresAt);
    }

    loggingService.info(`Added API key for ${config.provider}`, {
      keyId: id,
      provider: config.provider,
      environment: config.environment,
    });

    return id;
  }

  public getAPIKey(provider: string, environment?: string): APIKey | null {
    const targetEnv = environment || process.env.NODE_ENV || 'development';
    
    for (const [id, key] of this.keys) {
      if (key.provider === provider && 
          key.environment === targetEnv && 
          key.isActive && 
          !this.isExpired(key)) {
        return key;
      }
    }

    return null;
  }

  public getDecryptedKey(keyId: string): string | null {
    const apiKey = this.keys.get(keyId);
    if (!apiKey || !apiKey.isActive || this.isExpired(apiKey)) {
      return null;
    }

    try {
      return this.decrypt(apiKey.encryptedKey);
    } catch (error) {
      loggingService.error('Failed to decrypt API key', error as Error, { keyId });
      return null;
    }
  }

  public recordUsage(keyId: string, endpoint: string, success: boolean, responseTime: number, errorMessage?: string): void {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) return;

    // Update key usage
    apiKey.usageCount++;
    apiKey.lastUsed = new Date();

    // Record usage
    const usage: APIKeyUsage = {
      keyId,
      timestamp: new Date(),
      endpoint,
      success,
      responseTime,
      errorMessage,
    };

    this.usage.push(usage);

    // Keep only recent usage records (last 1000)
    if (this.usage.length > 1000) {
      this.usage = this.usage.slice(-1000);
    }

    loggingService.debug('API key usage recorded', {
      keyId,
      provider: apiKey.provider,
      endpoint,
      success,
      responseTime,
    });
  }

  public checkRateLimit(keyId: string): { allowed: boolean; resetTime?: Date; remaining?: number } {
    const apiKey = this.keys.get(keyId);
    if (!apiKey || !apiKey.rateLimit) {
      return { allowed: true };
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentUsage = this.usage.filter(u => u.keyId === keyId);
    const lastMinute = recentUsage.filter(u => u.timestamp > oneMinuteAgo).length;
    const lastHour = recentUsage.filter(u => u.timestamp > oneHourAgo).length;
    const lastDay = recentUsage.filter(u => u.timestamp > oneDayAgo).length;

    const { requestsPerMinute, requestsPerHour, requestsPerDay } = apiKey.rateLimit;

    if (lastMinute >= requestsPerMinute) {
      return {
        allowed: false,
        resetTime: new Date(now.getTime() + 60 * 1000),
        remaining: 0,
      };
    }

    if (lastHour >= requestsPerHour) {
      return {
        allowed: false,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000),
        remaining: 0,
      };
    }

    if (lastDay >= requestsPerDay) {
      return {
        allowed: false,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        requestsPerMinute - lastMinute,
        requestsPerHour - lastHour,
        requestsPerDay - lastDay
      ),
    };
  }

  public rotateAPIKey(keyId: string, newKey: string): boolean {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) return false;

    const oldKey = apiKey.key;
    apiKey.key = newKey;
    apiKey.encryptedKey = this.encrypt(newKey);
    apiKey.usageCount = 0;
    apiKey.lastUsed = undefined;

    loggingService.info('API key rotated', {
      keyId,
      provider: apiKey.provider,
      environment: apiKey.environment,
    });

    // Clear old key from memory
    oldKey.replace(/./g, '0');

    return true;
  }

  public deactivateAPIKey(keyId: string): boolean {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) return false;

    apiKey.isActive = false;

    // Cancel rotation schedule
    const rotationTimer = this.rotationSchedule.get(keyId);
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      this.rotationSchedule.delete(keyId);
    }

    loggingService.info('API key deactivated', {
      keyId,
      provider: apiKey.provider,
    });

    return true;
  }

  private isExpired(apiKey: APIKey): boolean {
    return apiKey.expiresAt ? new Date() > apiKey.expiresAt : false;
  }

  private scheduleRotation(keyId: string, expiresAt: Date): void {
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();
    
    // Schedule rotation 24 hours before expiration
    const rotationTime = Math.max(0, timeUntilExpiration - 24 * 60 * 60 * 1000);

    const timer = setTimeout(() => {
      this.triggerKeyRotation(keyId);
    }, rotationTime);

    this.rotationSchedule.set(keyId, timer);
  }

  private triggerKeyRotation(keyId: string): void {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) return;

    loggingService.warn('API key rotation required', {
      keyId,
      provider: apiKey.provider,
      expiresAt: apiKey.expiresAt,
    });

    // In a real implementation, this would:
    // 1. Generate a new API key with the provider
    // 2. Update the key in the system
    // 3. Notify administrators
    // For now, we'll just log the requirement
  }

  private startRotationScheduler(): void {
    // Check for keys that need rotation every hour
    setInterval(() => {
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const [keyId, apiKey] of this.keys) {
        if (apiKey.expiresAt && 
            apiKey.expiresAt <= twentyFourHoursFromNow && 
            apiKey.isActive) {
          loggingService.warn('API key expiring soon', {
            keyId,
            provider: apiKey.provider,
            expiresAt: apiKey.expiresAt,
          });
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  public getUsageStatistics(keyId?: string, timeWindow?: number): any {
    const now = new Date();
    const windowStart = timeWindow ? new Date(now.getTime() - timeWindow) : new Date(0);
    
    let relevantUsage = this.usage.filter(u => u.timestamp >= windowStart);
    
    if (keyId) {
      relevantUsage = relevantUsage.filter(u => u.keyId === keyId);
    }

    const totalRequests = relevantUsage.length;
    const successfulRequests = relevantUsage.filter(u => u.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const avgResponseTime = totalRequests > 0 
      ? relevantUsage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests 
      : 0;

    const providerStats = relevantUsage.reduce((acc, usage) => {
      const apiKey = this.keys.get(usage.keyId);
      if (apiKey) {
        const provider = apiKey.provider;
        if (!acc[provider]) {
          acc[provider] = { requests: 0, successes: 0, failures: 0, avgResponseTime: 0 };
        }
        acc[provider].requests++;
        if (usage.success) {
          acc[provider].successes++;
        } else {
          acc[provider].failures++;
        }
        acc[provider].avgResponseTime = 
          (acc[provider].avgResponseTime * (acc[provider].requests - 1) + usage.responseTime) / acc[provider].requests;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime),
      providerStats,
      timeWindow: timeWindow ? timeWindow / 1000 : 'all time',
    };
  }

  public getAllKeys(): APIKey[] {
    return Array.from(this.keys.values()).map(key => ({
      ...key,
      key: '***REDACTED***', // Don't expose actual keys
    }));
  }

  public cleanup(): void {
    // Clear rotation timers
    for (const timer of this.rotationSchedule.values()) {
      clearTimeout(timer);
    }
    this.rotationSchedule.clear();

    // Clear sensitive data from memory
    for (const key of this.keys.values()) {
      key.key = key.key.replace(/./g, '0');
    }
  }
}

export const apiKeyManager = new APIKeyManager();