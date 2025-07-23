import { Pool, PoolClient, PoolConfig } from 'pg';
import { loggingService } from './LoggingService';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface PoolConfiguration {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  createTimeoutMillis: number;
}

export interface ConnectionStats {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  totalErrors: number;
  avgQueryTime: number;
  slowQueries: number;
}

export interface ReadReplica {
  id: string;
  config: DatabaseConfig;
  pool: Pool;
  weight: number;
  healthy: boolean;
  lastHealthCheck: Date;
  queryCount: number;
  errorCount: number;
}

class DatabasePoolingService {
  private masterPool: Pool;
  private readReplicas: Map<string, ReadReplica> = new Map();
  private stats: ConnectionStats = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingClients: 0,
    totalQueries: 0,
    totalErrors: 0,
    avgQueryTime: 0,
    slowQueries: 0,
  };
  
  private queryTimes: number[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private currentReplicaIndex = 0;

  constructor() {
    this.initializeMasterPool();
    this.initializeReadReplicas();
    this.startHealthChecks();
    this.startStatsCollection();
  }

  private initializeMasterPool(): void {
    const masterConfig: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'shipping_tracker',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
    };

    const poolConfig: PoolConfig = {
      host: masterConfig.host,
      port: masterConfig.port,
      database: masterConfig.database,
      user: masterConfig.user,
      password: masterConfig.password,
      ssl: masterConfig.ssl,
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    };

    this.masterPool = new Pool(poolConfig);

    this.masterPool.on('connect', (client) => {
      loggingService.debug('New master database connection established');
      this.stats.totalConnections++;
    });

    this.masterPool.on('error', (err) => {
      loggingService.error('Master database pool error', err);
      this.stats.totalErrors++;
    });

    this.masterPool.on('remove', () => {
      loggingService.debug('Master database connection removed');
      this.stats.totalConnections = Math.max(0, this.stats.totalConnections - 1);
    });

    loggingService.info('Master database pool initialized', {
      host: masterConfig.host,
      database: masterConfig.database,
      minConnections: poolConfig.min,
      maxConnections: poolConfig.max,
    });
  }

  private initializeReadReplicas(): void {
    const replicasConfig = process.env.DB_READ_REPLICAS;
    
    if (replicasConfig) {
      try {
        const replicas = JSON.parse(replicasConfig);
        
        replicas.forEach((replica: any, index: number) => {
          this.addReadReplica({
            id: replica.id || `replica-${index}`,
            config: {
              host: replica.host,
              port: replica.port || 5432,
              database: replica.database,
              user: replica.user,
              password: replica.password,
              ssl: replica.ssl || false,
            },
            weight: replica.weight || 1,
          });
        });
      } catch (error) {
        loggingService.error('Failed to parse read replicas configuration', error as Error);
      }
    }

    loggingService.info('Read replicas initialized', {
      count: this.readReplicas.size,
    });
  }

  public addReadReplica(config: {
    id: string;
    config: DatabaseConfig;
    weight?: number;
  }): void {
    const poolConfig: PoolConfig = {
      host: config.config.host,
      port: config.config.port,
      database: config.config.database,
      user: config.config.user,
      password: config.config.password,
      ssl: config.config.ssl,
      min: 1,
      max: parseInt(process.env.DB_REPLICA_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    };

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      loggingService.error(`Read replica ${config.id} pool error`, err);
      const replica = this.readReplicas.get(config.id);
      if (replica) {
        replica.errorCount++;
        replica.healthy = false;
      }
    });

    const replica: ReadReplica = {
      id: config.id,
      config: config.config,
      pool,
      weight: config.weight || 1,
      healthy: true,
      lastHealthCheck: new Date(),
      queryCount: 0,
      errorCount: 0,
    };

    this.readReplicas.set(config.id, replica);

    loggingService.info('Read replica added', {
      id: config.id,
      host: config.config.host,
      weight: replica.weight,
    });
  }

  public removeReadReplica(replicaId: string): boolean {
    const replica = this.readReplicas.get(replicaId);
    if (!replica) return false;

    replica.pool.end();
    this.readReplicas.delete(replicaId);

    loggingService.info('Read replica removed', { id: replicaId });
    return true;
  }

  private selectReadReplica(): ReadReplica | null {
    const healthyReplicas = Array.from(this.readReplicas.values()).filter(r => r.healthy);
    
    if (healthyReplicas.length === 0) {
      return null;
    }

    // Weighted round-robin selection
    const totalWeight = healthyReplicas.reduce((sum, replica) => sum + replica.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const replica of healthyReplicas) {
      randomWeight -= replica.weight;
      if (randomWeight <= 0) {
        return replica;
      }
    }
    
    return healthyReplicas[0]; // Fallback
  }

  public async executeQuery<T = any>(
    query: string,
    params?: any[],
    options?: {
      readOnly?: boolean;
      timeout?: number;
      retries?: number;
    }
  ): Promise<T[]> {
    const startTime = Date.now();
    const isReadOnly = options?.readOnly ?? this.isReadOnlyQuery(query);
    const timeout = options?.timeout ?? 30000;
    const retries = options?.retries ?? 2;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const pool = isReadOnly ? this.getReadPool() : this.masterPool;
        const client = await this.acquireClient(pool, timeout);
        
        try {
          const result = await client.query(query, params);
          const queryTime = Date.now() - startTime;
          
          this.recordQueryStats(queryTime, true);
          
          if (queryTime > 5000) { // Log slow queries
            loggingService.warn('Slow query detected', {
              query: query.substring(0, 100),
              queryTime,
              params: params?.length,
            });
          }
          
          return result.rows;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        const queryTime = Date.now() - startTime;
        
        this.recordQueryStats(queryTime, false);
        
        loggingService.error(`Query attempt ${attempt + 1} failed`, error as Error, {
          query: query.substring(0, 100),
          params: params?.length,
          attempt: attempt + 1,
          retries,
        });

        if (attempt < retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Query failed after all retries');
  }

  private async acquireClient(pool: Pool, timeout: number): Promise<PoolClient> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Client acquisition timeout'));
      }, timeout);

      pool.connect((err, client, release) => {
        clearTimeout(timeoutId);
        
        if (err) {
          reject(err);
        } else {
          // Wrap release to track stats
          const originalRelease = release;
          (client as any).release = () => {
            this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
            originalRelease();
          };
          
          this.stats.activeConnections++;
          resolve(client);
        }
      });
    });
  }

  private getReadPool(): Pool {
    const replica = this.selectReadReplica();
    
    if (replica) {
      replica.queryCount++;
      return replica.pool;
    }
    
    // Fallback to master if no healthy replicas
    loggingService.warn('No healthy read replicas available, using master');
    return this.masterPool;
  }

  private isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    const readOnlyKeywords = ['select', 'with', 'show', 'describe', 'explain'];
    const writeKeywords = ['insert', 'update', 'delete', 'create', 'drop', 'alter', 'truncate'];
    
    const firstKeyword = normalizedQuery.split(/\s+/)[0];
    
    if (writeKeywords.includes(firstKeyword)) {
      return false;
    }
    
    return readOnlyKeywords.includes(firstKeyword);
  }

  private recordQueryStats(queryTime: number, success: boolean): void {
    this.stats.totalQueries++;
    
    if (!success) {
      this.stats.totalErrors++;
    }
    
    if (queryTime > 5000) {
      this.stats.slowQueries++;
    }
    
    // Update average query time
    this.queryTimes.push(queryTime);
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }
    
    this.stats.avgQueryTime = this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds

    // Initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    // Check master pool
    try {
      await this.masterPool.query('SELECT 1');
      loggingService.debug('Master database health check passed');
    } catch (error) {
      loggingService.error('Master database health check failed', error as Error);
    }

    // Check read replicas
    for (const replica of this.readReplicas.values()) {
      try {
        await replica.pool.query('SELECT 1');
        replica.healthy = true;
        replica.lastHealthCheck = new Date();
        loggingService.debug(`Read replica ${replica.id} health check passed`);
      } catch (error) {
        replica.healthy = false;
        replica.errorCount++;
        loggingService.warn(`Read replica ${replica.id} health check failed`, {
          error: (error as Error).message,
          errorCount: replica.errorCount,
        });
      }
    }
  }

  private startStatsCollection(): void {
    setInterval(() => {
      this.updateConnectionStats();
    }, 10000); // Every 10 seconds
  }

  private updateConnectionStats(): void {
    // Update pool statistics
    this.stats.idleConnections = this.masterPool.idleCount;
    this.stats.waitingClients = this.masterPool.waitingCount;
    
    // Add replica stats
    for (const replica of this.readReplicas.values()) {
      this.stats.idleConnections += replica.pool.idleCount;
      this.stats.waitingClients += replica.pool.waitingCount;
    }
  }

  public async executeTransaction<T>(
    queries: Array<{ query: string; params?: any[] }>,
    options?: { timeout?: number }
  ): Promise<T[]> {
    const client = await this.acquireClient(this.masterPool, options?.timeout ?? 30000);
    const results: T[] = [];

    try {
      await client.query('BEGIN');
      
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      
      loggingService.debug('Transaction completed successfully', {
        queryCount: queries.length,
      });
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      
      loggingService.error('Transaction failed and rolled back', error as Error, {
        queryCount: queries.length,
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  public getConnectionStats(): ConnectionStats {
    return { ...this.stats };
  }

  public getReplicaStats(): Array<{
    id: string;
    healthy: boolean;
    queryCount: number;
    errorCount: number;
    errorRate: number;
    lastHealthCheck: Date;
  }> {
    return Array.from(this.readReplicas.values()).map(replica => ({
      id: replica.id,
      healthy: replica.healthy,
      queryCount: replica.queryCount,
      errorCount: replica.errorCount,
      errorRate: replica.queryCount > 0 ? (replica.errorCount / replica.queryCount) * 100 : 0,
      lastHealthCheck: replica.lastHealthCheck,
    }));
  }

  public async drainConnections(timeoutMs: number = 30000): Promise<boolean> {
    loggingService.info('Starting connection drain', { timeout: timeoutMs });

    const startTime = Date.now();
    
    // Stop accepting new connections
    this.masterPool.removeAllListeners();
    
    // Wait for active connections to finish
    while (this.stats.activeConnections > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      loggingService.debug('Waiting for connections to drain', {
        activeConnections: this.stats.activeConnections,
      });
    }

    const success = this.stats.activeConnections === 0;
    
    loggingService.info('Connection drain completed', {
      success,
      remainingConnections: this.stats.activeConnections,
      duration: Date.now() - startTime,
    });

    return success;
  }

  public async healthCheck(): Promise<{
    master: boolean;
    replicas: number;
    healthyReplicas: number;
    totalConnections: number;
    activeConnections: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let masterHealthy = false;

    // Check master
    try {
      await this.masterPool.query('SELECT 1');
      masterHealthy = true;
    } catch (error) {
      issues.push('Master database is unhealthy');
    }

    // Check replicas
    const healthyReplicas = Array.from(this.readReplicas.values()).filter(r => r.healthy).length;
    const totalReplicas = this.readReplicas.size;

    if (totalReplicas > 0 && healthyReplicas === 0) {
      issues.push('All read replicas are unhealthy');
    } else if (healthyReplicas < totalReplicas * 0.5) {
      issues.push('More than 50% of read replicas are unhealthy');
    }

    // Check connection pool health
    if (this.stats.waitingClients > 10) {
      issues.push('High number of waiting clients');
    }

    if (this.stats.totalErrors > this.stats.totalQueries * 0.05) {
      issues.push('High query error rate');
    }

    return {
      master: masterHealthy,
      replicas: totalReplicas,
      healthyReplicas,
      totalConnections: this.stats.totalConnections,
      activeConnections: this.stats.activeConnections,
      issues,
    };
  }

  public async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close master pool
    await this.masterPool.end();

    // Close replica pools
    for (const replica of this.readReplicas.values()) {
      await replica.pool.end();
    }

    this.readReplicas.clear();
    
    loggingService.info('Database pools cleaned up');
  }
}

export const databasePoolingService = new DatabasePoolingService();