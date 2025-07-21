import { TrackingType, APIError } from '../types';
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
export declare class SmartContainerRouter {
    private containerPatterns;
    private providerCosts;
    private providerReliability;
    private failureHistory;
    constructor();
    /**
     * Analyze container number and determine optimal routing strategy
     */
    analyzeRouting(context: RoutingContext): RoutingDecision;
    /**
     * Detect carrier from container number format patterns
     */
    private detectCarrierFromFormat;
    /**
     * Prioritize API providers based on context and detection results
     */
    private prioritizeProviders;
    /**
     * Calculate comprehensive score for each provider
     */
    private calculateProviderScore;
    /**
     * Determine the best fallback strategy based on context
     */
    private determineFallbackStrategy;
    /**
     * Record API failure for future routing decisions
     */
    recordFailure(provider: string, error: APIError): void;
    /**
     * Record successful API call for reliability tracking
     */
    recordSuccess(provider: string): void;
    /**
     * Get provider statistics for monitoring
     */
    getProviderStats(): Array<{
        provider: string;
        cost: number;
        reliability: number;
        recentFailures: number;
        lastFailure?: Date;
    }>;
    /**
     * Get provider statistics including unknown providers
     */
    getProviderStatsIncludingUnknown(provider: string): {
        provider: string;
        cost: number;
        reliability: number;
        recentFailures: number;
        lastFailure?: Date;
    };
    /**
     * Initialize container number patterns for carrier detection
     */
    private initializeContainerPatterns;
    /**
     * Apply heuristic detection for edge cases
     */
    private applyHeuristicDetection;
    /**
     * Initialize provider costs (in cents per request)
     */
    private initializeProviderCosts;
    /**
     * Initialize provider reliability scores
     */
    private initializeProviderReliability;
    /**
     * Get available providers for tracking type
     */
    private getAvailableProviders;
    /**
     * Check if provider supports BOL tracking
     */
    private supportsBOLTracking;
    /**
     * Generate human-readable reasoning for routing decision
     */
    private generateReasoningExplanation;
}
//# sourceMappingURL=SmartContainerRouter.d.ts.map