import { loggingService } from './LoggingService';

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
  baseUrl: string;
  apiKey?: string;
  zoneId?: string;
  distributionId?: string;
  enabled: boolean;
  cacheTTL: number;
  purgeOnUpdate: boolean;
}

export interface CDNStats {
  totalRequests: number;
  cacheHitRate: number;
  bandwidth: number;
  topAssets: Array<{ path: string; requests: number; size: number }>;
  geographicDistribution: Record<string, number>;
}

export interface AssetOptimization {
  path: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  optimizations: string[];
}

class CDNService {
  private config: CDNConfig;
  private assetCache: Map<string, AssetOptimization> = new Map();
  private requestStats: Map<string, number> = new Map();

  constructor() {
    this.config = {
      provider: (process.env.CDN_PROVIDER as any) || 'cloudflare',
      baseUrl: process.env.CDN_BASE_URL || '',
      apiKey: process.env.CDN_API_KEY,
      zoneId: process.env.CDN_ZONE_ID,
      distributionId: process.env.CDN_DISTRIBUTION_ID,
      enabled: process.env.CDN_ENABLED === 'true',
      cacheTTL: parseInt(process.env.CDN_CACHE_TTL || '3600'),
      purgeOnUpdate: process.env.CDN_PURGE_ON_UPDATE === 'true',
    };

    if (this.config.enabled) {
      loggingService.info('CDN service initialized', {
        provider: this.config.provider,
        baseUrl: this.config.baseUrl,
      });
    }
  }

  public getAssetUrl(path: string, optimizations?: {
    format?: 'webp' | 'avif' | 'auto';
    quality?: number;
    width?: number;
    height?: number;
    resize?: 'fit' | 'fill' | 'crop';
  }): string {
    if (!this.config.enabled || !this.config.baseUrl) {
      return path;
    }

    let url = `${this.config.baseUrl}${path}`;

    if (optimizations) {
      const params = new URLSearchParams();
      
      if (optimizations.format) {
        params.append('format', optimizations.format);
      }
      
      if (optimizations.quality) {
        params.append('quality', optimizations.quality.toString());
      }
      
      if (optimizations.width) {
        params.append('width', optimizations.width.toString());
      }
      
      if (optimizations.height) {
        params.append('height', optimizations.height.toString());
      }
      
      if (optimizations.resize) {
        params.append('resize', optimizations.resize);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    // Track request for analytics
    this.trackRequest(path);

    return url;
  }

  public async purgeCache(paths?: string[]): Promise<boolean> {
    if (!this.config.enabled || !this.config.apiKey) {
      loggingService.warn('CDN purge requested but CDN not properly configured');
      return false;
    }

    try {
      switch (this.config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflare(paths);
        case 'aws':
          return await this.purgeAWS(paths);
        case 'azure':
          return await this.purgeAzure(paths);
        default:
          loggingService.warn('CDN purge not implemented for provider', {
            provider: this.config.provider,
          });
          return false;
      }
    } catch (error) {
      loggingService.error('CDN purge failed', error as Error, { paths });
      return false;
    }
  }

  private async purgeCloudflare(paths?: string[]): Promise<boolean> {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`;
    
    const body = paths && paths.length > 0 
      ? { files: paths.map(path => `${this.config.baseUrl}${path}`) }
      : { purge_everything: true };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    
    if (result.success) {
      loggingService.info('Cloudflare cache purged successfully', { paths });
      return true;
    } else {
      loggingService.error('Cloudflare cache purge failed', undefined, { 
        errors: result.errors,
        paths,
      });
      return false;
    }
  }

  private async purgeAWS(paths?: string[]): Promise<boolean> {
    // AWS CloudFront invalidation
    loggingService.info('AWS CloudFront purge would be implemented here', { paths });
    return true; // Placeholder
  }

  private async purgeAzure(paths?: string[]): Promise<boolean> {
    // Azure CDN purge
    loggingService.info('Azure CDN purge would be implemented here', { paths });
    return true; // Placeholder
  }

  public async preloadAssets(paths: string[]): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Preload assets by making requests to CDN
      const preloadPromises = paths.map(async (path) => {
        const url = this.getAssetUrl(path);
        try {
          const response = await fetch(url, { method: 'HEAD' });
          return response.ok;
        } catch (error) {
          loggingService.warn('Asset preload failed', { path, error });
          return false;
        }
      });

      const results = await Promise.all(preloadPromises);
      const successCount = results.filter(Boolean).length;

      loggingService.info('Asset preload completed', {
        total: paths.length,
        successful: successCount,
        failed: paths.length - successCount,
      });

      return successCount === paths.length;
    } catch (error) {
      loggingService.error('Asset preload error', error as Error, { paths });
      return false;
    }
  }

  public optimizeAsset(
    path: string,
    originalSize: number,
    optimizations: string[]
  ): AssetOptimization {
    // Simulate optimization (in production, this would integrate with image optimization services)
    const compressionRatio = 0.7; // 30% reduction
    const optimizedSize = Math.floor(originalSize * compressionRatio);
    
    const optimization: AssetOptimization = {
      path,
      originalSize,
      optimizedSize,
      compressionRatio,
      format: this.detectFormat(path),
      optimizations,
    };

    this.assetCache.set(path, optimization);
    
    loggingService.debug('Asset optimized', optimization);
    
    return optimization;
  }

  private detectFormat(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private trackRequest(path: string): void {
    const current = this.requestStats.get(path) || 0;
    this.requestStats.set(path, current + 1);
  }

  public async getStats(): Promise<CDNStats> {
    // In production, this would fetch real stats from CDN provider
    const totalRequests = Array.from(this.requestStats.values())
      .reduce((sum, count) => sum + count, 0);

    const topAssets = Array.from(this.requestStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, requests]) => {
        const optimization = this.assetCache.get(path);
        return {
          path,
          requests,
          size: optimization?.optimizedSize || 0,
        };
      });

    return {
      totalRequests,
      cacheHitRate: 85.5, // Mock data
      bandwidth: totalRequests * 1024, // Mock calculation
      topAssets,
      geographicDistribution: {
        'US': 45,
        'EU': 30,
        'ASIA': 20,
        'OTHER': 5,
      },
    };
  }

  public generateCacheHeaders(path: string, maxAge?: number): Record<string, string> {
    const headers: Record<string, string> = {};
    
    const ttl = maxAge || this.config.cacheTTL;
    
    // Determine cache strategy based on file type
    const extension = path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'css':
        // Long cache for versioned assets
        headers['Cache-Control'] = `public, max-age=${ttl}, immutable`;
        break;
      
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        // Long cache for images
        headers['Cache-Control'] = `public, max-age=${ttl}`;
        break;
      
      case 'html':
        // Short cache for HTML
        headers['Cache-Control'] = 'public, max-age=300, must-revalidate';
        break;
      
      default:
        headers['Cache-Control'] = `public, max-age=${Math.floor(ttl / 2)}`;
    }

    // Add ETag for better caching
    headers['ETag'] = `"${this.generateETag(path)}"`;
    
    // Add Vary header for content negotiation
    headers['Vary'] = 'Accept-Encoding, Accept';

    return headers;
  }

  private generateETag(path: string): string {
    // Simple ETag generation (in production, use file hash)
    return Buffer.from(path + Date.now()).toString('base64').substring(0, 16);
  }

  public async warmupCache(paths: string[]): Promise<void> {
    loggingService.info('Starting CDN cache warmup', { pathCount: paths.length });
    
    const batchSize = 10;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      await this.preloadAssets(batch);
      
      // Small delay between batches to avoid overwhelming the CDN
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    loggingService.info('CDN cache warmup completed');
  }

  public createCacheMiddleware() {
    return (req: any, res: any, next: any) => {
      // Skip caching for API endpoints
      if (req.path.startsWith('/api/')) {
        return next();
      }

      const headers = this.generateCacheHeaders(req.path);
      
      // Set cache headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Handle conditional requests
      const ifNoneMatch = req.headers['if-none-match'];
      const etag = headers['ETag'];
      
      if (ifNoneMatch && ifNoneMatch === etag) {
        return res.status(304).end();
      }

      next();
    };
  }

  public updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...newConfig };
    loggingService.info('CDN configuration updated', newConfig);
  }

  public getConfig(): CDNConfig {
    return { ...this.config };
  }

  public async healthCheck(): Promise<{
    enabled: boolean;
    provider: string;
    baseUrl: string;
    reachable: boolean;
  }> {
    let reachable = false;
    
    if (this.config.enabled && this.config.baseUrl) {
      try {
        const response = await fetch(this.config.baseUrl, { method: 'HEAD' });
        reachable = response.ok;
      } catch (error) {
        loggingService.warn('CDN health check failed', { error });
      }
    }

    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      baseUrl: this.config.baseUrl,
      reachable,
    };
  }
}

export const cdnService = new CDNService();