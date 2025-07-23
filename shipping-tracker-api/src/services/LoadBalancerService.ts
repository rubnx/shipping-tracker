import { loggingService } from './LoggingService';

export interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  activeConnections: number;
  totalRequests: number;
  errorCount: number;
  region: string;
  version: string;
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'least_response_time' | 'ip_hash' | 'geographic';
  config?: Record<string, any>;
}

export interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  endpoint: string;
  expectedStatus: number;
  expectedResponse?: string;
}

class LoadBalancerService {
  private instances: Map<string, ServerInstance> = new Map();
  private strategy: LoadBalancingStrategy = { type: 'weighted_round_robin' };
  private healthCheckConfig: HealthCheckConfig;
  private currentIndex = 0;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.healthCheckConfig = {
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
      retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
      expectedStatus: parseInt(process.env.HEALTH_CHECK_STATUS || '200'),
      expectedResponse: process.env.HEALTH_CHECK_RESPONSE,
    };

    this.loadServerInstances();
    this.startHealthChecks();
  }

  private loadServerInstances(): void {
    const instancesConfig = process.env.SERVER_INSTANCES;
    
    if (instancesConfig) {
      try {
        const instances = JSON.parse(instancesConfig);
        instances.forEach((instance: any) => {
          this.addInstance({
            id: instance.id,
            host: instance.host,
            port: instance.port,
            weight: instance.weight || 1,
            region: instance.region || 'default',
            version: instance.version || '1.0.0',
          });
        });
      } catch (error) {
        loggingService.error('Failed to parse server instances config', error as Error);
      }
    }

    // Add default local instance if no instances configured
    if (this.instances.size === 0) {
      this.addInstance({
        id: 'local',
        host: 'localhost',
        port: parseInt(process.env.PORT || '3001'),
        weight: 1,
        region: 'local',
        version: '1.0.0',
      });
    }

    loggingService.info('Server instances loaded', {
      count: this.instances.size,
      instances: Array.from(this.instances.keys()),
    });
  }

  public addInstance(config: {
    id: string;
    host: string;
    port: number;
    weight?: number;
    region?: string;
    version?: string;
  }): void {
    const instance: ServerInstance = {
      id: config.id,
      host: config.host,
      port: config.port,
      weight: config.weight || 1,
      healthy: true,
      lastHealthCheck: new Date(),
      responseTime: 0,
      activeConnections: 0,
      totalRequests: 0,
      errorCount: 0,
      region: config.region || 'default',
      version: config.version || '1.0.0',
    };

    this.instances.set(config.id, instance);
    loggingService.info('Server instance added', { id: config.id, host: config.host, port: config.port });
  }

  public removeInstance(instanceId: string): boolean {
    const removed = this.instances.delete(instanceId);
    if (removed) {
      loggingService.info('Server instance removed', { id: instanceId });
    }
    return removed;
  }

  public getNextInstance(clientInfo?: {
    ip?: string;
    region?: string;
    userAgent?: string;
  }): ServerInstance | null {
    const healthyInstances = Array.from(this.instances.values()).filter(i => i.healthy);
    
    if (healthyInstances.length === 0) {
      loggingService.error('No healthy instances available');
      return null;
    }

    switch (this.strategy.type) {
      case 'round_robin':
        return this.roundRobin(healthyInstances);
      
      case 'weighted_round_robin':
        return this.weightedRoundRobin(healthyInstances);
      
      case 'least_connections':
        return this.leastConnections(healthyInstances);
      
      case 'least_response_time':
        return this.leastResponseTime(healthyInstances);
      
      case 'ip_hash':
        return this.ipHash(healthyInstances, clientInfo?.ip);
      
      case 'geographic':
        return this.geographic(healthyInstances, clientInfo?.region);
      
      default:
        return this.roundRobin(healthyInstances);
    }
  }

  private roundRobin(instances: ServerInstance[]): ServerInstance {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex++;
    return instance;
  }

  private weightedRoundRobin(instances: ServerInstance[]): ServerInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  private leastConnections(instances: ServerInstance[]): ServerInstance {
    return instances.reduce((min, instance) => 
      instance.activeConnections < min.activeConnections ? instance : min
    );
  }

  private leastResponseTime(instances: ServerInstance[]): ServerInstance {
    return instances.reduce((min, instance) => 
      instance.responseTime < min.responseTime ? instance : min
    );
  }

  private ipHash(instances: ServerInstance[], clientIp?: string): ServerInstance {
    if (!clientIp) {
      return this.roundRobin(instances);
    }
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < clientIp.length; i++) {
      hash = ((hash << 5) - hash + clientIp.charCodeAt(i)) & 0xffffffff;
    }
    
    const index = Math.abs(hash) % instances.length;
    return instances[index];
  }

  private geographic(instances: ServerInstance[], clientRegion?: string): ServerInstance {
    if (!clientRegion) {
      return this.roundRobin(instances);
    }
    
    // Try to find instance in same region
    const sameRegion = instances.filter(i => i.region === clientRegion);
    if (sameRegion.length > 0) {
      return this.roundRobin(sameRegion);
    }
    
    // Fallback to any healthy instance
    return this.roundRobin(instances);
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckConfig.interval);

    // Perform initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.instances.values()).map(instance =>
      this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkInstanceHealth(instance: ServerInstance): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.healthCheckConfig.retries) {
      try {
        const url = `http://${instance.host}:${instance.port}${this.healthCheckConfig.endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.healthCheckConfig.timeout);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        instance.responseTime = responseTime;
        instance.lastHealthCheck = new Date();

        if (response.status === this.healthCheckConfig.expectedStatus) {
          if (this.healthCheckConfig.expectedResponse) {
            const body = await response.text();
            if (body.includes(this.healthCheckConfig.expectedResponse)) {
              this.markInstanceHealthy(instance);
              return;
            } else {
              throw new Error(`Unexpected response body: ${body}`);
            }
          } else {
            this.markInstanceHealthy(instance);
            return;
          }
        } else {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < this.healthCheckConfig.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
        }
      }
    }

    // All retries failed
    this.markInstanceUnhealthy(instance, lastError);
  }

  private markInstanceHealthy(instance: ServerInstance): void {
    if (!instance.healthy) {
      instance.healthy = true;
      loggingService.info('Instance marked as healthy', {
        id: instance.id,
        host: instance.host,
        port: instance.port,
        responseTime: instance.responseTime,
      });
    }
  }

  private markInstanceUnhealthy(instance: ServerInstance, error: Error | null): void {
    if (instance.healthy) {
      instance.healthy = false;
      instance.errorCount++;
      
      loggingService.warn('Instance marked as unhealthy', {
        id: instance.id,
        host: instance.host,
        port: instance.port,
        error: error?.message,
        errorCount: instance.errorCount,
      });
    }
  }

  public recordRequest(instanceId: string, success: boolean, responseTime: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.totalRequests++;
    instance.responseTime = (instance.responseTime * 0.9) + (responseTime * 0.1); // Moving average

    if (!success) {
      instance.errorCount++;
    }
  }

  public recordConnection(instanceId: string, increment: boolean): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (increment) {
      instance.activeConnections++;
    } else {
      instance.activeConnections = Math.max(0, instance.activeConnections - 1);
    }
  }

  public getInstanceStats(): Array<{
    id: string;
    host: string;
    port: number;
    healthy: boolean;
    responseTime: number;
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
    region: string;
  }> {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      host: instance.host,
      port: instance.port,
      healthy: instance.healthy,
      responseTime: instance.responseTime,
      activeConnections: instance.activeConnections,
      totalRequests: instance.totalRequests,
      errorRate: instance.totalRequests > 0 ? (instance.errorCount / instance.totalRequests) * 100 : 0,
      region: instance.region,
    }));
  }

  public setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    loggingService.info('Load balancing strategy updated', strategy);
  }

  public getHealthyInstanceCount(): number {
    return Array.from(this.instances.values()).filter(i => i.healthy).length;
  }

  public getTotalInstanceCount(): number {
    return this.instances.size;
  }

  public createLoadBalancerMiddleware() {
    return (req: any, res: any, next: any) => {
      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        region: req.headers['cf-ipcountry'] || req.headers['x-user-region'],
        userAgent: req.get('User-Agent'),
      };

      const instance = this.getNextInstance(clientInfo);
      
      if (!instance) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'NO_HEALTHY_INSTANCES',
        });
      }

      // Add instance info to request
      req.selectedInstance = instance;
      req.instanceId = instance.id;

      // Record connection
      this.recordConnection(instance.id, true);

      // Override res.end to record metrics
      const originalEnd = res.end;
      const startTime = Date.now();
      
      res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        loadBalancerService.recordRequest(instance.id, success, responseTime);
        loadBalancerService.recordConnection(instance.id, false);
        
        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  public async drainInstance(instanceId: string, timeoutMs: number = 30000): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    loggingService.info('Starting instance drain', { id: instanceId, timeout: timeoutMs });

    // Mark instance as unhealthy to stop new requests
    instance.healthy = false;

    // Wait for active connections to finish
    const startTime = Date.now();
    while (instance.activeConnections > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      loggingService.debug('Waiting for connections to drain', {
        id: instanceId,
        activeConnections: instance.activeConnections,
      });
    }

    const success = instance.activeConnections === 0;
    loggingService.info('Instance drain completed', {
      id: instanceId,
      success,
      remainingConnections: instance.activeConnections,
      duration: Date.now() - startTime,
    });

    return success;
  }

  public updateHealthCheckConfig(config: Partial<HealthCheckConfig>): void {
    this.healthCheckConfig = { ...this.healthCheckConfig, ...config };
    
    // Restart health checks with new config
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.startHealthChecks();
    }

    loggingService.info('Health check configuration updated', config);
  }

  public async healthCheck(): Promise<{
    totalInstances: number;
    healthyInstances: number;
    strategy: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    const healthyCount = this.getHealthyInstanceCount();
    const totalCount = this.getTotalInstanceCount();

    if (healthyCount === 0) {
      issues.push('No healthy instances available');
    } else if (healthyCount < totalCount * 0.5) {
      issues.push('Less than 50% of instances are healthy');
    }

    if (totalCount === 1) {
      issues.push('Single point of failure - only one instance configured');
    }

    return {
      totalInstances: totalCount,
      healthyInstances: healthyCount,
      strategy: this.strategy.type,
      issues,
    };
  }

  public cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.instances.clear();
  }
}

export const loadBalancerService = new LoadBalancerService();