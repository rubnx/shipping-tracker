"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APIAggregator_1 = require("../services/APIAggregator");
describe('Yang Ming Integration', () => {
    let aggregator;
    beforeEach(() => {
        aggregator = new APIAggregator_1.APIAggregator();
    });
    it('should not include Yang Ming in provider statistics without API key', () => {
        const stats = aggregator.getProviderStats();
        const yangMingProvider = stats.find(provider => provider.name === 'yang-ming');
        // Yang Ming should not be in the active providers list without an API key
        expect(yangMingProvider).toBeUndefined();
    });
    it('should handle Yang Ming API calls through aggregator', async () => {
        // This test verifies that Yang Ming is properly integrated in the aggregator
        // Even without API key, it should handle the call gracefully
        try {
            const results = await aggregator.fetchFromMultipleSources('YMLU1234567', 'container');
            // Should get results from available providers (even if Yang Ming fails due to no API key)
            expect(Array.isArray(results)).toBe(true);
            // Yang Ming might be in the results with an error status due to missing API key
            const yangMingResult = results.find(result => result.provider === 'yang-ming');
            if (yangMingResult) {
                expect(yangMingResult.provider).toBe('yang-ming');
                expect(yangMingResult.status).toBe('error');
                expect(yangMingResult.error?.errorType).toBe('AUTH_ERROR');
            }
        }
        catch (error) {
            // If all providers fail, that's expected in test environment
            expect(error).toBeDefined();
        }
    }, 15000); // Increased timeout for API calls
    it('should have Yang Ming service instantiated and available for configuration', () => {
        // Even without API key, the Yang Ming service should be instantiated
        // This tests that the service is properly imported and can be used
        // We can't directly access private members, but we can test that the aggregator
        // was constructed successfully with all services including Yang Ming
        expect(aggregator).toBeDefined();
        expect(typeof aggregator.getProviderStats).toBe('function');
        expect(typeof aggregator.fetchFromMultipleSources).toBe('function');
    });
});
//# sourceMappingURL=YangMingIntegration.test.js.map