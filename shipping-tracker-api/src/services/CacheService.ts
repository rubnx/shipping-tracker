import Redis from 'ioredis';
import { config } from '../config/environment';

/**
 * Redis Cache Service
 * Implements Requirements 7.3, 9.1, 9.2 for caching and performance optimization
 */
export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.database,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      console.log('Redis ready');
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from Redis:', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  public isRedisConnected(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * Generate cache key with namespace
   */
  private generateKey(namespace: string, key: string): string {
    return `shipping_tracker:${namespace}:${key}`;
  }

  /**
   * Set cache value with TTL
   */
  public async set(
    namespace: string,
    key: string,
    value: any,
    ttlSeconds: number = 3600
  ): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        console.warn('Redis not connected, skipping cache set');
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      });

      await this.redis.setex(cacheKey, ttlSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  public async get<T = any>(namespace: string, key: string): Promise<T | null> {
    try {
      if (!this.isRedisConnected()) {
        console.warn('Redis not connected, skipping cache get');
        return null;
      }

      const cacheKey = this.generateKey(namespace, key);
      const cachedValue = await this.redis.get(cacheKey);

      if (!cachedValue) {
        return null;
      }

      const parsed = JSON.parse(cachedValue);
      return parsed.data as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete cache value
   */
  public async delete(namespace: string, key: string): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        console.warn('Redis not connected, skipping cache delete');
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if cache key exists
   */
  public async exists(namespace: string, key: string): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Set cache value with expiration time
   */
  public async setWithExpiry(
    namespace: string,
    key: string,
    value: any,
    expiryDate: Date
  ): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        expiryDate: expiryDate.toISOString(),
      });

      const ttlSeconds = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));
      
      if (ttlSeconds <= 0) {
        return false;
      }

      await this.redis.setex(cacheKey, ttlSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache setWithExpiry error:', error);
      return false;
    }
  }

  /**
   * Get multiple cache values
   */
  public async getMultiple<T = any>(
    namespace: string,
    keys: string[]
  ): Promise<Record<string, T | null>> {
    try {
      if (!this.isRedisConnected() || keys.length === 0) {
        return {};
      }

      const cacheKeys = keys.map(key => this.generateKey(namespace, key));
      const values = await this.redis.mget(...cacheKeys);

      const result: Record<string, T | null> = {};
      
      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          try {
            const parsed = JSON.parse(value);
            result[key] = parsed.data as T;
          } catch {
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return {};
    }
  }

  /**
   * Set multiple cache values
   */
  public async setMultiple(
    namespace: string,
    keyValuePairs: Record<string, any>,
    ttlSeconds: number = 3600
  ): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const cacheKey = this.generateKey(namespace, key);
        const serializedValue = JSON.stringify({
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds,
        });
        
        pipeline.setex(cacheKey, ttlSeconds, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }

  /**
   * Delete multiple cache values
   */
  public async deleteMultiple(namespace: string, keys: string[]): Promise<number> {
    try {
      if (!this.isRedisConnected() || keys.length === 0) {
        return 0;
      }

      const cacheKeys = keys.map(key => this.generateKey(namespace, key));
      return await this.redis.del(...cacheKeys);
    } catch (error) {
      console.error('Cache deleteMultiple error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache in namespace
   */
  public async clearNamespace(namespace: string): Promise<number> {
    try {
      if (!this.isRedisConnected()) {
        return 0;
      }

      const pattern = this.generateKey(namespace, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      return await this.redis.del(...keys);
    } catch (error) {
      console.error('Cache clearNamespace error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: Record<string, any>;
    clients: number;
    uptime: number;
  }> {
    try {
      if (!this.isRedisConnected()) {
        return {
          connected: false,
          memory: '0',
          keyspace: {},
          clients: 0,
          uptime: 0,
        };
      }

      const info = await this.redis.info();
      const lines = info.split('\r\n');
      
      const stats = {
        connected: true,
        memory: '0',
        keyspace: {},
        clients: 0,
        uptime: 0,
      };

      lines.forEach(line => {
        if (line.startsWith('used_memory_human:')) {
          stats.memory = line.split(':')[1];
        } else if (line.startsWith('connected_clients:')) {
          stats.clients = parseInt(line.split(':')[1]);
        } else if (line.startsWith('uptime_in_seconds:')) {
          stats.uptime = parseInt(line.split(':')[1]);
        } else if (line.startsWith('db')) {
          const [db, info] = line.split(':');
          stats.keyspace[db] = info;
        }
      });

      return stats;
    } catch (error) {
      console.error('Cache getStats error:', error);
      return {
        connected: false,
        memory: '0',
        keyspace: {},
        clients: 0,
        uptime: 0,
      };
    }
  }

  /**
   * Increment counter
   */
  public async increment(
    namespace: string,
    key: string,
    amount: number = 1,
    ttlSeconds?: number
  ): Promise<number> {
    try {
      if (!this.isRedisConnected()) {
        return 0;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.incrby(cacheKey, amount);
      
      if (ttlSeconds && result === amount) {
        // Set TTL only if this is the first increment
        await this.redis.expire(cacheKey, ttlSeconds);
      }

      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  public async decrement(
    namespace: string,
    key: string,
    amount: number = 1
  ): Promise<number> {
    try {
      if (!this.isRedisConnected()) {
        return 0;
      }

      const cacheKey = this.generateKey(namespace, key);
      return await this.redis.decrby(cacheKey, amount);
    } catch (error) {
      console.error('Cache decrement error:', error);
      return 0;
    }
  }

  /**
   * Add item to set
   */
  public async addToSet(
    namespace: string,
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.sadd(cacheKey, value);
      
      if (ttlSeconds && result === 1) {
        await this.redis.expire(cacheKey, ttlSeconds);
      }

      return result === 1;
    } catch (error) {
      console.error('Cache addToSet error:', error);
      return false;
    }
  }

  /**
   * Get set members
   */
  public async getSetMembers(namespace: string, key: string): Promise<string[]> {
    try {
      if (!this.isRedisConnected()) {
        return [];
      }

      const cacheKey = this.generateKey(namespace, key);
      return await this.redis.smembers(cacheKey);
    } catch (error) {
      console.error('Cache getSetMembers error:', error);
      return [];
    }
  }

  /**
   * Remove item from set
   */
  public async removeFromSet(
    namespace: string,
    key: string,
    value: string
  ): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.srem(cacheKey, value);
      return result === 1;
    } catch (error) {
      console.error('Cache removeFromSet error:', error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  public async getTTL(namespace: string, key: string): Promise<number> {
    try {
      if (!this.isRedisConnected()) {
        return -1;
      }

      const cacheKey = this.generateKey(namespace, key);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      console.error('Cache getTTL error:', error);
      return -1;
    }
  }

  /**
   * Set TTL for existing key
   */
  public async setTTL(namespace: string, key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.expire(cacheKey, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error('Cache setTTL error:', error);
      return false;
    }
  }
}

export default CacheService;