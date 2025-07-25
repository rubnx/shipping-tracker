import { 
  TrackingType, 
  APIError
} from '../types';

export interface ContainerNumberPattern {
  carrier: string;
  pattern: RegExp;
  confidence: number;
  priority: number;
}

export interface RoutingDecision {
  suggestedCarrier?: string;
  confidence: number;
  prioritizedProviders: string[];
  reasoning: string;
  fallbackStrategy: 'free_first' | 'paid_first' | 'reliability_first';
}

export interface RoutingContext {
  trackingNumber: string;
  trackingType: TrackingType;
  userTier?: 'free' | 'premium' | 'enterprise';
  previousFailures?: string[];
  costOptimization?: boolean;
  reliabilityOptimization?: boolean;
}

/**
 * Smart Container Routing Logic
 * Implements Requirements 7.1, 7.2, 7.4 for intelligent API routing
 */
export class SmartContainerRouter {
  private containerPatterns: ContainerNumberPattern[];
  private providerCosts: Map<string, number>;
  private providerReliability: Map<string, number>;
  private failureHistory: Map<string, { count: number; lastFailure: Date }>;

  constructor() {
    this.containerPatterns = this.initializeContainerPatterns();
    this.providerCosts = this.initializeProviderCosts();
    this.providerReliability = this.initializeProviderReliability();
    this.failureHistory = new Map();
  }

  /**
   * Analyze container number and determine optimal routing strategy
   */
  analyzeRouting(context: RoutingContext): RoutingDecision {
    console.log(`🧠 Smart Router: Analyzing routing for ${context.trackingNumber}`);

    const carrierDetection = this.detectCarrierFromFormat(context.trackingNumber);
    const availableProviders = this.getAvailableProviders(context.trackingType);
    const prioritizedProviders = this.prioritizeProviders(availableProviders, context, carrierDetection);
    const fallbackStrategy = this.determineFallbackStrategy(context);

    const decision: RoutingDecision = {
      suggestedCarrier: carrierDetection.carrier,
      confidence: carrierDetection.confidence,
      prioritizedProviders,
      reasoning: this.generateReasoningExplanation(context, carrierDetection, prioritizedProviders),
      fallbackStrategy
    };

    return decision;
  }

  /**
   * Detect carrier from container number format patterns
   */
  private detectCarrierFromFormat(trackingNumber: string): { carrier?: string; confidence: number } {
    const cleanNumber = trackingNumber.trim().toUpperCase();
    let bestMatch: { carrier?: string; confidence: number } = { confidence: 0 };

    for (const pattern of this.containerPatterns) {
      if (pattern.pattern.test(cleanNumber)) {
        if (pattern.confidence > bestMatch.confidence) {
          bestMatch = {
            carrier: pattern.carrier || undefined,
            confidence: pattern.confidence
          };
        }
      }
    }

    if (bestMatch.confidence < 0.5) {
      const heuristicMatch = this.applyHeuristicDetection(cleanNumber);
      if (heuristicMatch.confidence > bestMatch.confidence) {
        bestMatch = heuristicMatch;
      }
    }

    return bestMatch;
  }

  /**
   * Prioritize API providers based on context and detection results
   */
  private prioritizeProviders(
    availableProviders: string[],
    context: RoutingContext,
    carrierDetection: { carrier?: string; confidence: number }
  ): string[] {
    const providers = [...availableProviders];
    
    const providerScores = providers.map(provider => ({
      provider,
      score: this.calculateProviderScore(provider, context, carrierDetection)
    }));

    providerScores.sort((a, b) => b.score - a.score);
    return providerScores.map(p => p.provider);
  }

  /**
   * Calculate comprehensive score for each provider
   */
  private calculateProviderScore(
    provider: string,
    context: RoutingContext,
    carrierDetection: { carrier?: string; confidence: number }
  ): number {
    let score = 0;

    const reliability = this.providerReliability.get(provider) || 0.5;
    score += reliability * 100;

    const cost = this.providerCosts.get(provider) || 50;
    if (context.costOptimization === true || context.userTier === 'free') {
      // More aggressive cost optimization
      score += Math.max(0, 200 - cost * 2); // Double the cost penalty
    } else if (context.costOptimization !== false) {
      score += Math.max(0, 100 - cost);
    }

    if (carrierDetection.carrier && provider === carrierDetection.carrier.toLowerCase()) {
      score += carrierDetection.confidence * 50;
    }

    if (context.userTier === 'free') {
      if (cost === 0) score += 100; // Big bonus for free providers
    } else if (context.userTier === 'premium' || context.userTier === 'enterprise') {
      score += reliability * 20;
    }

    const failures = this.failureHistory.get(provider);
    if (failures && context.previousFailures?.includes(provider)) {
      const timeSinceFailure = Date.now() - failures.lastFailure.getTime();
      const hoursSinceFailure = timeSinceFailure / (1000 * 60 * 60);
      const failurePenalty = Math.max(0, 30 * (1 - hoursSinceFailure / 24));
      score -= failurePenalty;
    }

    if (context.trackingType === 'bol' && !this.supportsBOLTracking(provider)) {
      score -= 1000;
    }

    return Math.max(0, score);
  }

  /**
   * Determine the best fallback strategy based on context
   */
  private determineFallbackStrategy(context: RoutingContext): 'free_first' | 'paid_first' | 'reliability_first' {
    if (context.userTier === 'free' || context.costOptimization === true) {
      return 'free_first';
    }
    
    if (context.reliabilityOptimization === true || context.userTier === 'enterprise') {
      return 'reliability_first';
    }
    
    return 'paid_first';
  }

  /**
   * Record API failure for future routing decisions
   */
  recordFailure(provider: string, error: APIError): void {
    const current = this.failureHistory.get(provider) || { count: 0, lastFailure: new Date(0) };
    
    this.failureHistory.set(provider, {
      count: current.count + 1,
      lastFailure: new Date()
    });
  }

  /**
   * Record successful API call for reliability tracking
   */
  recordSuccess(provider: string): void {
    const current = this.failureHistory.get(provider);
    if (current && current.count > 0) {
      this.failureHistory.set(provider, {
        count: Math.max(0, current.count - 1),
        lastFailure: current.lastFailure
      });
    }
  }

  /**
   * Get provider statistics for monitoring
   */
  getProviderStats(): Array<{
    provider: string;
    cost: number;
    reliability: number;
    recentFailures: number;
    lastFailure?: Date;
  }> {
    const allProviders = Array.from(new Set([
      ...Array.from(this.providerCosts.keys()),
      ...Array.from(this.providerReliability.keys())
    ]));

    return allProviders.map(provider => {
      const failures = this.failureHistory.get(provider);
      return {
        provider,
        cost: this.providerCosts.get(provider) || 0,
        reliability: this.providerReliability.get(provider) || 0,
        recentFailures: failures?.count || 0,
        lastFailure: failures?.lastFailure
      };
    });
  }

  /**
   * Get provider statistics including unknown providers
   */
  getProviderStatsIncludingUnknown(provider: string): {
    provider: string;
    cost: number;
    reliability: number;
    recentFailures: number;
    lastFailure?: Date;
  } {
    const failures = this.failureHistory.get(provider);
    return {
      provider,
      cost: this.providerCosts.get(provider) || 0,
      reliability: this.providerReliability.get(provider) || 0,
      recentFailures: failures?.count || 0,
      lastFailure: failures?.lastFailure
    };
  }

  /**
   * Initialize container number patterns for carrier detection
   */
  private initializeContainerPatterns(): ContainerNumberPattern[] {
    return [
      { carrier: 'maersk', pattern: /^MAEU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'maersk', pattern: /^MSKU\d{7}$/, confidence: 0.90, priority: 2 },
      { carrier: 'msc', pattern: /^MSCU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'msc', pattern: /^MEDU\d{7}$/, confidence: 0.85, priority: 2 },
      { carrier: 'cma-cgm', pattern: /^CMAU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'cma-cgm', pattern: /^CGMU\d{7}$/, confidence: 0.90, priority: 2 },
      { carrier: 'cosco', pattern: /^COSU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'cosco', pattern: /^CXDU\d{7}$/, confidence: 0.85, priority: 2 },
      { carrier: 'hapag-lloyd', pattern: /^HLXU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'hapag-lloyd', pattern: /^HPLU\d{7}$/, confidence: 0.85, priority: 2 },
      { carrier: 'evergreen', pattern: /^EGLV\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'evergreen', pattern: /^EGHU\d{7}$/, confidence: 0.85, priority: 2 },
      { carrier: 'one-line', pattern: /^ONEU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'yang-ming', pattern: /^YMLU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: 'zim', pattern: /^ZIMU\d{7}$/, confidence: 0.95, priority: 1 },
      { carrier: '', pattern: /^[A-Z]{4}\d{7}$/, confidence: 0.30, priority: 10 }
    ];
  }

  /**
   * Apply heuristic detection for edge cases
   */
  private applyHeuristicDetection(trackingNumber: string): { carrier?: string; confidence: number } {
    const prefixMap: Record<string, { carrier: string; confidence: number }> = {
      'MAE': { carrier: 'maersk', confidence: 0.60 },
      'MSK': { carrier: 'maersk', confidence: 0.55 },
      'MSC': { carrier: 'msc', confidence: 0.60 },
      'CMA': { carrier: 'cma-cgm', confidence: 0.60 },
      'CGM': { carrier: 'cma-cgm', confidence: 0.55 },
      'COS': { carrier: 'cosco', confidence: 0.60 },
      'HAP': { carrier: 'hapag-lloyd', confidence: 0.55 },
      'HLL': { carrier: 'hapag-lloyd', confidence: 0.55 },
      'EVG': { carrier: 'evergreen', confidence: 0.55 },
      'EGL': { carrier: 'evergreen', confidence: 0.60 },
      'ONE': { carrier: 'one-line', confidence: 0.60 },
      'YML': { carrier: 'yang-ming', confidence: 0.60 },
      'ZIM': { carrier: 'zim', confidence: 0.60 }
    };

    for (const [prefix, match] of Object.entries(prefixMap)) {
      if (trackingNumber.startsWith(prefix)) {
        return match;
      }
    }

    return { confidence: 0 };
  }

  /**
   * Initialize provider costs (in cents per request)
   */
  private initializeProviderCosts(): Map<string, number> {
    const costs = new Map<string, number>();
    
    costs.set('track-trace', 0);
    costs.set('shipsgo', 5);
    costs.set('searates', 8);
    costs.set('maersk', 25);
    costs.set('msc', 20);
    costs.set('cma-cgm', 22);
    costs.set('cosco', 18);
    costs.set('hapag-lloyd', 24);
    costs.set('evergreen', 20);
    costs.set('one-line', 20);
    costs.set('yang-ming', 18);
    costs.set('zim', 15);
    costs.set('project44', 50);
    costs.set('marine-traffic', 30);
    costs.set('vessel-finder', 25);

    return costs;
  }

  /**
   * Initialize provider reliability scores
   */
  private initializeProviderReliability(): Map<string, number> {
    const reliability = new Map<string, number>();
    
    reliability.set('maersk', 0.95);
    reliability.set('msc', 0.88);
    reliability.set('cma-cgm', 0.85);
    reliability.set('cosco', 0.87);
    reliability.set('hapag-lloyd', 0.90);
    reliability.set('evergreen', 0.84);
    reliability.set('one-line', 0.86);
    reliability.set('yang-ming', 0.82);
    reliability.set('zim', 0.80);
    reliability.set('shipsgo', 0.88);
    reliability.set('searates', 0.85);
    reliability.set('project44', 0.93);
    reliability.set('marine-traffic', 0.70);
    reliability.set('vessel-finder', 0.72);
    reliability.set('track-trace', 0.68);

    return reliability;
  }

  /**
   * Get available providers for tracking type
   */
  private getAvailableProviders(trackingType: TrackingType): string[] {
    const allProviders = [
      'track-trace', 'shipsgo', 'searates', 'maersk', 'msc', 
      'cma-cgm', 'cosco', 'hapag-lloyd', 'evergreen', 
      'one-line', 'yang-ming', 'zim', 'project44'
    ];

    return allProviders.filter(provider => {
      if (trackingType === 'bol') {
        return this.supportsBOLTracking(provider);
      }
      return true;
    });
  }

  /**
   * Check if provider supports BOL tracking
   */
  private supportsBOLTracking(provider: string): boolean {
    const bolSupportedProviders = ['maersk', 'msc', 'cosco', 'project44'];
    return bolSupportedProviders.includes(provider);
  }

  /**
   * Generate human-readable reasoning for routing decision
   */
  private generateReasoningExplanation(
    context: RoutingContext,
    carrierDetection: { carrier?: string; confidence: number },
    prioritizedProviders: string[]
  ): string {
    const reasons: string[] = [];

    if (carrierDetection.carrier && carrierDetection.confidence > 0.7) {
      reasons.push(`Detected ${carrierDetection.carrier.toUpperCase()} container format (${Math.round(carrierDetection.confidence * 100)}% confidence)`);
    }

    if (context.costOptimization === true || context.userTier === 'free') {
      reasons.push('Prioritizing cost-effective APIs');
    }

    if (context.reliabilityOptimization === true) {
      reasons.push('Prioritizing high-reliability providers');
    }

    if (context.previousFailures && context.previousFailures.length > 0) {
      reasons.push(`Avoiding recently failed providers: ${context.previousFailures.join(', ')}`);
    }

    const topProvider = prioritizedProviders[0];
    if (topProvider) {
      const cost = this.providerCosts.get(topProvider) || 0;
      const reliability = this.providerReliability.get(topProvider) || 0;
      reasons.push(`Top choice: ${topProvider} (${cost === 0 ? 'free' : cost + '¢'}, ${Math.round(reliability * 100)}% reliable)`);
    }

    return reasons.join('; ');
  }
}