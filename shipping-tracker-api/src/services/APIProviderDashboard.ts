import { APIProviderConfig } from '../types';

export interface ProviderStatus {
  name: string;
  status: 'active' | 'inactive' | 'rate_limited' | 'error';
  reliability: number;
  cost: 'free' | 'freemium' | 'paid';
  coverage: string[];
  supportedTypes: string[];
  lastChecked: Date;
  responseTime: number; // milliseconds
  successRate24h: number; // percentage
  requestsToday: number;
  rateLimitRemaining: number;
  errorCount24h: number;
  isAggregator: boolean;
}

export interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  averageReliability: number;
  totalRequestsToday: number;
  successRateToday: number;
  costBreakdown: {
    free: number;
    freemium: number;
    paid: number;
  };
  coverageStats: {
    global: number;
    regional: number;
    specialized: number;
  };
}

export class APIProviderDashboard {
  private providers: Map<string, APIProviderConfig>;
  private statusCache: Map<string, ProviderStatus>;
  private statsHistory: Map<string, any[]>;

  constructor(providers: Map<string, APIProviderConfig>) {
    this.providers = providers;
    this.statusCache = new Map();
    this.statsHistory = new Map();
  }

  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats(): DashboardStats {
    const providers = Array.from(this.providers.values());
    const activeProviders = providers.filter(p => !!p.apiKey);
    
    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      averageReliability: this.calculateAverageReliability(activeProviders),
      totalRequestsToday: this.getTotalRequestsToday(),
      successRateToday: this.getSuccessRateToday(),
      costBreakdown: this.getCostBreakdown(providers),
      coverageStats: this.getCoverageStats(providers)
    };
  }

  /**
   * Get detailed provider status information
   */
  getProviderStatuses(): ProviderStatus[] {
    return Array.from(this.providers.values()).map(provider => {
      const cached = this.statusCache.get(provider.name);
      
      return {
        name: provider.name,
        status: this.determineProviderStatus(provider),
        reliability: provider.reliability,
        cost: provider.cost,
        coverage: provider.coverage,
        supportedTypes: provider.supportedTypes,
        lastChecked: cached?.lastChecked || new Date(),
        responseTime: cached?.responseTime || 0,
        successRate24h: cached?.successRate24h || 0,
        requestsToday: cached?.requestsToday || 0,
        rateLimitRemaining: cached?.rateLimitRemaining || provider.rateLimit.requestsPerHour,
        errorCount24h: cached?.errorCount24h || 0,
        isAggregator: provider.aggregator || false
      };
    });
  }

  /**
   * Get providers by category for organized display
   */
  getProvidersByCategory(): Record<string, ProviderStatus[]> {
    const statuses = this.getProviderStatuses();
    
    return {
      'Major Ocean Carriers': statuses.filter(p => 
        ['maersk', 'msc', 'cma-cgm', 'hapag-lloyd', 'cosco', 'evergreen', 'yang-ming', 'one-line', 'zim'].includes(p.name)
      ),
      'Express & Courier': statuses.filter(p => 
        ['fedex', 'ups', 'dhl', 'tnt'].includes(p.name)
      ),
      'Third-Party Aggregators': statuses.filter(p => p.isAggregator),
      'Regional Specialists': statuses.filter(p => 
        ['hyundai-merchant', 'wan-hai', 'arkas', 'crowley'].includes(p.name)
      ),
      'Vessel Tracking': statuses.filter(p => 
        ['marine-traffic', 'vessel-finder'].includes(p.name)
      ),
      'Postal Services': statuses.filter(p => 
        ['usps', 'canada-post', 'royal-mail'].includes(p.name)
      ),
      'Specialized Services': statuses.filter(p => 
        ['aftership', 'shipstation', 'track-trace'].includes(p.name)
      )
    };
  }

  /**
   * Get recommendations for improving coverage
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getDashboardStats();
    const statuses = this.getProviderStatuses();
    
    // Check for inactive high-value providers
    const inactiveHighValue = statuses.filter(p => 
      p.status === 'inactive' && 
      (p.reliability > 0.9 || p.isAggregator)
    );
    
    if (inactiveHighValue.length > 0) {
      recommendations.push(
        `🔑 Activate high-value providers: ${inactiveHighValue.map(p => p.name).join(', ')} for better coverage`
      );
    }
    
    // Check success rate
    if (stats.successRateToday < 0.95) {
      recommendations.push(
        `📈 Success rate is ${(stats.successRateToday * 100).toFixed(1)}%. Consider activating more aggregators for better fallback coverage`
      );
    }
    
    // Check cost efficiency
    const paidProviders = statuses.filter(p => p.cost === 'paid' && p.status === 'active');
    const freeProviders = statuses.filter(p => p.cost === 'free' && p.status === 'active');
    
    if (freeProviders.length < 3) {
      recommendations.push(
        `💰 Activate more free providers (USPS, Track-Trace) to reduce API costs`
      );
    }
    
    // Check geographic coverage
    const globalProviders = statuses.filter(p => 
      p.coverage.includes('global') && p.status === 'active'
    ).length;
    
    if (globalProviders < 5) {
      recommendations.push(
        `🌍 Add more global providers for worldwide coverage. Current: ${globalProviders}`
      );
    }
    
    // Check aggregator coverage
    const activeAggregators = statuses.filter(p => 
      p.isAggregator && p.status === 'active'
    ).length;
    
    if (activeAggregators === 0) {
      recommendations.push(
        `🎯 Activate at least one aggregator (Project44, FourKites) for comprehensive fallback coverage`
      );
    }
    
    return recommendations;
  }

  /**
   * Update provider status after API call
   */
  updateProviderStatus(
    providerName: string, 
    responseTime: number, 
    success: boolean, 
    rateLimitRemaining?: number
  ): void {
    const existing = this.statusCache.get(providerName) || {
      name: providerName,
      status: 'active' as const,
      reliability: 0,
      cost: 'paid' as const,
      coverage: [],
      supportedTypes: [],
      lastChecked: new Date(),
      responseTime: 0,
      successRate24h: 0,
      requestsToday: 0,
      rateLimitRemaining: 0,
      errorCount24h: 0,
      isAggregator: false
    };
    
    // Update metrics
    existing.lastChecked = new Date();
    existing.responseTime = responseTime;
    existing.requestsToday += 1;
    
    if (rateLimitRemaining !== undefined) {
      existing.rateLimitRemaining = rateLimitRemaining;
    }
    
    if (!success) {
      existing.errorCount24h += 1;
    }
    
    // Recalculate success rate
    existing.successRate24h = this.calculateSuccessRate(providerName);
    
    this.statusCache.set(providerName, existing);
  }

  private determineProviderStatus(provider: APIProviderConfig): 'active' | 'inactive' | 'rate_limited' | 'error' {
    if (!provider.apiKey) {
      return 'inactive';
    }
    
    const cached = this.statusCache.get(provider.name);
    if (!cached) {
      return 'active';
    }
    
    if (cached.rateLimitRemaining <= 0) {
      return 'rate_limited';
    }
    
    if (cached.errorCount24h > 10) {
      return 'error';
    }
    
    return 'active';
  }

  private calculateAverageReliability(providers: APIProviderConfig[]): number {
    if (providers.length === 0) return 0;
    
    const total = providers.reduce((sum, p) => sum + p.reliability, 0);
    return total / providers.length;
  }

  private getTotalRequestsToday(): number {
    return Array.from(this.statusCache.values())
      .reduce((sum, status) => sum + status.requestsToday, 0);
  }

  private getSuccessRateToday(): number {
    const statuses = Array.from(this.statusCache.values());
    if (statuses.length === 0) return 0;
    
    const totalRequests = statuses.reduce((sum, s) => sum + s.requestsToday, 0);
    const totalErrors = statuses.reduce((sum, s) => sum + s.errorCount24h, 0);
    
    if (totalRequests === 0) return 0;
    
    return (totalRequests - totalErrors) / totalRequests;
  }

  private getCostBreakdown(providers: APIProviderConfig[]): { free: number; freemium: number; paid: number } {
    return {
      free: providers.filter(p => p.cost === 'free').length,
      freemium: providers.filter(p => p.cost === 'freemium').length,
      paid: providers.filter(p => p.cost === 'paid').length
    };
  }

  private getCoverageStats(providers: APIProviderConfig[]): { global: number; regional: number; specialized: number } {
    return {
      global: providers.filter(p => p.coverage.includes('global')).length,
      regional: providers.filter(p => 
        p.coverage.some(c => !['global'].includes(c))
      ).length,
      specialized: providers.filter(p => p.aggregator).length
    };
  }

  private calculateSuccessRate(providerName: string): number {
    const cached = this.statusCache.get(providerName);
    if (!cached || cached.requestsToday === 0) return 0;
    
    return (cached.requestsToday - cached.errorCount24h) / cached.requestsToday;
  }
}