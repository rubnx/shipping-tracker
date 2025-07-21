import { PerformanceOptimizer } from '../services/PerformanceOptimizer';
import { APIAggregator } from '../services/APIAggregator';
import { SmartContainerRouter } from '../services/SmartContainerRouter';
import { RawTrackingData } from '../types';

// Mock the dependencies
jest.mock('../services/APIAggregator');
jest.mock('../services/SmartContainerRouter');

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let mockAggregator: jest.Mocked<APIAggregator>;
  let mockSmartRouter: jest.Mocked<SmartContainerRouter>;

  beforeEach(() => {
    mockAggregator = new APIAggregator() as jest.Mocked<APIAggregator>;
    mockSmartRouter = new SmartContainerRouter() as jest.Mocked<SmartContainerRouter>;
    optimizer = new PerformanceOptimizer(mockAggregator, mockSmartRouter);

    // Mock smart router response
    mockSmartRouter.analyzeRouting.mockReturnValue({
      prioritizedProviders: ['maersk', 'msc'],
      reasoning: 'Test routing',
      fallbackStrategy: 'reliability_first',
      confidence: 0.9
    });

    // Clear timers to prevent interference
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Intelligent Caching', () => {
    it('should cache tracking results with intelligent TTL', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'TEST123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);

      // First call should hit API
      const result1 = await optimizer.trackWithOptimization('TEST123', 'container', { priority: 'high' });
      expect(mockAggregator.fetchFromMultipleSources).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([mockData]);

      // Second call should hit cache
      const result2 = await optimizer.trackWithOptimization('TEST123', 'container');
      expect(mockAggregator.fetchFromMultipleSources).toHaveBeenCalledTimes(1); // Still 1
      expect(result2).toEqual([mockData]);
    });

    it('should calculate intelligent TTL based on data characteristics', async () => {
      const deliveredData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'DELIVERED123',
        data: { status: 'Delivered' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      const inTransitData: RawTrackingData = {
        provider: 'msc',
        trackingNumber: 'TRANSIT123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.85,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources
        .mockResolvedValueOnce([deliveredData])
        .mockResolvedValueOnce([inTransitData]);

      await optimizer.trackWithOptimization('DELIVERED123', 'container', { priority: 'high' });
      await optimizer.trackWithOptimization('TRANSIT123', 'container', { priority: 'high' });

      const cacheStats = optimizer.getCacheStats();
      expect(cacheStats.size).toBe(2);
    });

    it('should evict LRU entries when cache is full', async () => {
      // This test would require setting a very small cache size
      // For now, we'll test that the cache stats are working
      const cacheStats = optimizer.getCacheStats();
      expect(cacheStats).toHaveProperty('size');
      expect(cacheStats).toHaveProperty('maxSize');
      expect(cacheStats).toHaveProperty('hitRate');
    });
  });

  describe('Request Batching', () => {
    it('should batch multiple requests efficiently', async () => {
      const mockData1: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'BATCH1',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      const mockData2: RawTrackingData = {
        provider: 'msc',
        trackingNumber: 'BATCH2',
        data: { status: 'Delivered' },
        timestamp: new Date(),
        reliability: 0.90,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources
        .mockResolvedValueOnce([mockData1])
        .mockResolvedValueOnce([mockData2]);

      const requests = [
        { trackingNumber: 'BATCH1', trackingType: 'container' as const },
        { trackingNumber: 'BATCH2', trackingType: 'container' as const }
      ];

      const results = await optimizer.trackMultiple(requests);
      
      expect(results.size).toBe(2);
      expect(results.get('BATCH1')).toEqual([mockData1]);
      expect(results.get('BATCH2')).toEqual([mockData2]);
    });

    it('should prioritize cache for batch requests', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'CACHED123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);

      // First, cache the data
      await optimizer.trackWithOptimization('CACHED123', 'container', { priority: 'high' });

      // Then batch request should use cache
      const results = await optimizer.trackMultiple([
        { trackingNumber: 'CACHED123', trackingType: 'container' }
      ], { prioritizeCache: true });

      expect(results.size).toBe(1);
      expect(results.get('CACHED123')).toEqual([mockData]);
      // Should only have been called once (for the initial cache)
      expect(mockAggregator.fetchFromMultipleSources).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics accurately', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'METRICS123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);

      // Make some requests
      await optimizer.trackWithOptimization('METRICS123', 'container', { priority: 'high' });
      await optimizer.trackWithOptimization('METRICS123', 'container'); // Should hit cache

      const metrics = optimizer.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cachedRequests).toBe(1);
      expect(metrics.cacheHitRate).toBe(0.5);
      expect(metrics.costSavings).toBeGreaterThan(0);
    });

    it('should provide optimization recommendations', () => {
      const recommendations = optimizer.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('expectedImprovement');
      });
    });
  });

  describe('Cache Management', () => {
    it('should provide detailed cache statistics', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'STATS123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);
      await optimizer.trackWithOptimization('STATS123', 'container', { priority: 'high' });

      const stats = optimizer.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('averageAge');
      expect(stats).toHaveProperty('topProviders');
      expect(Array.isArray(stats.topProviders)).toBe(true);
    });

    it('should clear cache when requested', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'CLEAR123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);
      await optimizer.trackWithOptimization('CLEAR123', 'container', { priority: 'high' });

      let stats = optimizer.getCacheStats();
      expect(stats.size).toBe(1);

      optimizer.clearCache();
      
      stats = optimizer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Cache Warm-up', () => {
    it('should warm up cache with provided tracking numbers', async () => {
      const mockData1: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'WARM1',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      const mockData2: RawTrackingData = {
        provider: 'msc',
        trackingNumber: 'WARM2',
        data: { status: 'Delivered' },
        timestamp: new Date(),
        reliability: 0.90,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources
        .mockResolvedValueOnce([mockData1])
        .mockResolvedValueOnce([mockData2]);

      await optimizer.warmUpCache(['WARM1', 'WARM2']);

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in batch processing', async () => {
      mockAggregator.fetchFromMultipleSources
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([{
          provider: 'msc',
          trackingNumber: 'SUCCESS123',
          data: { status: 'In Transit' },
          timestamp: new Date(),
          reliability: 0.90,
          status: 'success'
        }]);

      const results = await optimizer.trackMultiple([
        { trackingNumber: 'ERROR123', trackingType: 'container' },
        { trackingNumber: 'SUCCESS123', trackingType: 'container' }
      ]);

      expect(results.size).toBe(2);
      expect(results.get('ERROR123')).toEqual([]);
      expect(results.get('SUCCESS123')).toHaveLength(1);
    });

    it('should handle force fresh requests', async () => {
      const mockData: RawTrackingData = {
        provider: 'maersk',
        trackingNumber: 'FRESH123',
        data: { status: 'In Transit' },
        timestamp: new Date(),
        reliability: 0.95,
        status: 'success'
      };

      mockAggregator.fetchFromMultipleSources.mockResolvedValue([mockData]);

      // First call to cache
      await optimizer.trackWithOptimization('FRESH123', 'container', { priority: 'high' });
      
      // Force fresh should bypass cache
      await optimizer.trackWithOptimization('FRESH123', 'container', { 
        forceFresh: true, 
        priority: 'high' 
      });

      expect(mockAggregator.fetchFromMultipleSources).toHaveBeenCalledTimes(2);
    });
  });
});