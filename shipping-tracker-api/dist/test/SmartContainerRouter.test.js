"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SmartContainerRouter_1 = require("../services/SmartContainerRouter");
describe('SmartContainerRouter', () => {
    let router;
    beforeEach(() => {
        router = new SmartContainerRouter_1.SmartContainerRouter();
    });
    describe('Container Number Pattern Detection', () => {
        it('should detect Maersk containers with high confidence', () => {
            const context = {
                trackingNumber: 'MAEU1234567',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('maersk');
            expect(decision.confidence).toBeGreaterThan(0.9);
            expect(decision.prioritizedProviders[0]).toBe('maersk');
        });
        it('should detect MSC containers with high confidence', () => {
            const context = {
                trackingNumber: 'MSCU7654321',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('msc');
            expect(decision.confidence).toBeGreaterThan(0.9);
            expect(decision.prioritizedProviders).toContain('msc');
        });
        it('should detect CMA CGM containers', () => {
            const context = {
                trackingNumber: 'CMAU9876543',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('cma-cgm');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect COSCO containers', () => {
            const context = {
                trackingNumber: 'COSU1111111',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('cosco');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect Hapag-Lloyd containers', () => {
            const context = {
                trackingNumber: 'HLXU2222222',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('hapag-lloyd');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect Evergreen containers', () => {
            const context = {
                trackingNumber: 'EGLV3333333',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('evergreen');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect ONE Line containers', () => {
            const context = {
                trackingNumber: 'ONEU4444444',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('one-line');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect Yang Ming containers', () => {
            const context = {
                trackingNumber: 'YMLU5555555',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('yang-ming');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should detect ZIM containers', () => {
            const context = {
                trackingNumber: 'ZIMU6666666',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('zim');
            expect(decision.confidence).toBeGreaterThan(0.9);
        });
        it('should handle unknown container formats with low confidence', () => {
            const context = {
                trackingNumber: 'UNKN1234567',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.confidence).toBeLessThan(0.5);
            expect(decision.suggestedCarrier).toBeUndefined();
        });
        it('should apply heuristic detection for partial matches', () => {
            const context = {
                trackingNumber: 'MAE123456789', // Doesn't match exact pattern but has MAE prefix
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.suggestedCarrier).toBe('maersk');
            expect(decision.confidence).toBeGreaterThan(0.5);
            expect(decision.confidence).toBeLessThan(0.9);
        });
    });
    describe('Cost Optimization', () => {
        it('should prioritize free APIs for cost optimization', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                costOptimization: true
            };
            const decision = router.analyzeRouting(context);
            expect(decision.fallbackStrategy).toBe('free_first');
            expect(decision.reasoning).toContain('cost-effective');
            // Should prioritize low-cost providers (track-trace is free, shipsgo/searates are cheap)
            const topProviders = decision.prioritizedProviders.slice(0, 5);
            const lowCostProviders = ['track-trace', 'shipsgo', 'searates'];
            const hasLowCostProvider = lowCostProviders.some(provider => topProviders.includes(provider));
            expect(hasLowCostProvider).toBe(true);
        });
        it('should prioritize free APIs for free tier users', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                userTier: 'free'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.fallbackStrategy).toBe('free_first');
            // Should prioritize low-cost providers for free users
            const topProviders = decision.prioritizedProviders.slice(0, 5);
            const lowCostProviders = ['track-trace', 'shipsgo', 'searates'];
            const hasLowCostProvider = lowCostProviders.some(provider => topProviders.includes(provider));
            expect(hasLowCostProvider).toBe(true);
        });
        it('should prioritize reliability for enterprise users', () => {
            const context = {
                trackingNumber: 'MAEU1234567',
                trackingType: 'container',
                userTier: 'enterprise'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.fallbackStrategy).toBe('reliability_first');
            // Should prioritize Maersk due to both carrier match and high reliability
            expect(decision.prioritizedProviders[0]).toBe('maersk');
        });
        it('should balance cost and reliability for premium users', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                userTier: 'premium'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.fallbackStrategy).toBe('paid_first');
            // Should not necessarily prioritize the cheapest option
            expect(decision.prioritizedProviders[0]).not.toBe('track-trace');
        });
    });
    describe('Reliability Optimization', () => {
        it('should prioritize high-reliability providers when requested', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                reliabilityOptimization: true
            };
            const decision = router.analyzeRouting(context);
            expect(decision.fallbackStrategy).toBe('reliability_first');
            // Top providers should be high-reliability ones
            const topProviders = decision.prioritizedProviders.slice(0, 3);
            expect(topProviders).toContain('maersk'); // 0.95 reliability
        });
        it('should consider carrier match with reliability', () => {
            const context = {
                trackingNumber: 'MAEU1234567', // Maersk container
                trackingType: 'container',
                reliabilityOptimization: true
            };
            const decision = router.analyzeRouting(context);
            // Maersk should be top choice due to both carrier match and high reliability
            expect(decision.prioritizedProviders[0]).toBe('maersk');
            expect(decision.suggestedCarrier).toBe('maersk');
        });
    });
    describe('Failure Handling', () => {
        it('should record and penalize failed providers', () => {
            const error = {
                provider: 'maersk',
                errorType: 'TIMEOUT',
                message: 'Request timeout'
            };
            router.recordFailure('maersk', error);
            router.recordFailure('maersk', error); // Record multiple failures for stronger penalty
            const context = {
                trackingNumber: 'MAEU1234567',
                trackingType: 'container',
                previousFailures: ['maersk']
            };
            const decision = router.analyzeRouting(context);
            // Maersk should still be suggested due to carrier match
            expect(decision.suggestedCarrier).toBe('maersk');
            // Check that failure was recorded
            const stats = router.getProviderStats();
            const maerskStats = stats.find(s => s.provider === 'maersk');
            expect(maerskStats?.recentFailures).toBeGreaterThan(0);
        });
        it('should recover provider reputation on success', () => {
            // First record a failure
            const error = {
                provider: 'msc',
                errorType: 'RATE_LIMIT',
                message: 'Rate limit exceeded'
            };
            router.recordFailure('msc', error);
            // Then record a success
            router.recordSuccess('msc');
            const stats = router.getProviderStats();
            const mscStats = stats.find(s => s.provider === 'msc');
            expect(mscStats).toBeDefined();
            expect(mscStats.recentFailures).toBe(0); // Should be reduced
        });
        it('should track failure statistics', () => {
            const error = {
                provider: 'test-provider',
                errorType: 'NOT_FOUND',
                message: 'Not found'
            };
            router.recordFailure('test-provider', error);
            router.recordFailure('test-provider', error);
            const testStats = router.getProviderStatsIncludingUnknown('test-provider');
            expect(testStats).toBeDefined();
            expect(testStats.recentFailures).toBe(2);
            expect(testStats.lastFailure).toBeInstanceOf(Date);
        });
    });
    describe('BOL Tracking Support', () => {
        it('should filter providers for BOL tracking', () => {
            const context = {
                trackingNumber: 'BOL123456789',
                trackingType: 'bol'
            };
            const decision = router.analyzeRouting(context);
            // Only providers that support BOL should be included
            const bolSupportedProviders = ['maersk', 'msc', 'cosco', 'project44'];
            decision.prioritizedProviders.forEach(provider => {
                expect(bolSupportedProviders).toContain(provider);
            });
        });
        it('should exclude non-BOL providers for BOL tracking', () => {
            const context = {
                trackingNumber: 'BOL123456789',
                trackingType: 'bol'
            };
            const decision = router.analyzeRouting(context);
            // These providers don't support BOL
            const nonBolProviders = ['track-trace', 'shipsgo', 'searates'];
            nonBolProviders.forEach(provider => {
                expect(decision.prioritizedProviders).not.toContain(provider);
            });
        });
    });
    describe('Reasoning Generation', () => {
        it('should generate clear reasoning for carrier detection', () => {
            const context = {
                trackingNumber: 'MAEU1234567',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.reasoning).toContain('MAERSK');
            expect(decision.reasoning).toContain('confidence');
            expect(decision.reasoning).toContain('maersk');
        });
        it('should explain cost optimization reasoning', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                costOptimization: true
            };
            const decision = router.analyzeRouting(context);
            expect(decision.reasoning).toContain('cost-effective');
        });
        it('should explain reliability optimization reasoning', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                reliabilityOptimization: true
            };
            const decision = router.analyzeRouting(context);
            expect(decision.reasoning).toContain('reliability');
        });
        it('should explain failure avoidance reasoning', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container',
                previousFailures: ['provider1', 'provider2']
            };
            const decision = router.analyzeRouting(context);
            expect(decision.reasoning).toContain('failed providers');
            expect(decision.reasoning).toContain('provider1');
            expect(decision.reasoning).toContain('provider2');
        });
        it('should explain top provider choice', () => {
            const context = {
                trackingNumber: 'TEST1234567',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.reasoning).toContain('Top choice');
            expect(decision.reasoning).toContain(decision.prioritizedProviders[0]);
        });
    });
    describe('Provider Statistics', () => {
        it('should return comprehensive provider statistics', () => {
            const stats = router.getProviderStats();
            expect(stats).toBeInstanceOf(Array);
            expect(stats.length).toBeGreaterThan(0);
            const maerskStats = stats.find(s => s.provider === 'maersk');
            expect(maerskStats).toBeDefined();
            expect(maerskStats.cost).toBe(25); // cents
            expect(maerskStats.reliability).toBe(0.95);
            expect(maerskStats.recentFailures).toBe(0);
        });
        it('should include free provider statistics', () => {
            const stats = router.getProviderStats();
            const freeStats = stats.find(s => s.provider === 'track-trace');
            expect(freeStats).toBeDefined();
            expect(freeStats.cost).toBe(0);
            expect(freeStats.reliability).toBe(0.68);
        });
        it('should include aggregator statistics', () => {
            const stats = router.getProviderStats();
            const shipsgoStats = stats.find(s => s.provider === 'shipsgo');
            expect(shipsgoStats).toBeDefined();
            expect(shipsgoStats.cost).toBe(5);
            expect(shipsgoStats.reliability).toBe(0.88);
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty tracking numbers gracefully', () => {
            const context = {
                trackingNumber: '',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision.confidence).toBe(0);
            expect(decision.suggestedCarrier).toBeUndefined();
            expect(decision.prioritizedProviders.length).toBeGreaterThan(0);
        });
        it('should handle very long tracking numbers', () => {
            const context = {
                trackingNumber: 'VERYLONGTRACKINGNUM123456789012345678901234567890',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision).toBeDefined();
            expect(decision.prioritizedProviders.length).toBeGreaterThan(0);
        });
        it('should handle special characters in tracking numbers', () => {
            const context = {
                trackingNumber: 'TEST-123_456',
                trackingType: 'container'
            };
            const decision = router.analyzeRouting(context);
            expect(decision).toBeDefined();
            expect(decision.prioritizedProviders.length).toBeGreaterThan(0);
        });
        it('should handle all tracking types', () => {
            const trackingTypes = ['container', 'booking', 'bol'];
            trackingTypes.forEach(type => {
                const context = {
                    trackingNumber: 'TEST1234567',
                    trackingType: type
                };
                const decision = router.analyzeRouting(context);
                expect(decision).toBeDefined();
                expect(decision.prioritizedProviders.length).toBeGreaterThan(0);
            });
        });
    });
});
//# sourceMappingURL=SmartContainerRouter.test.js.map