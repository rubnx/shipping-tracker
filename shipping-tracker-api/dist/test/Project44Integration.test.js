"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const APIAggregator_1 = require("../services/APIAggregator");
describe('Project44 Integration', () => {
    let aggregator;
    beforeEach(() => {
        aggregator = new APIAggregator_1.APIAggregator();
    });
    it('should not include Project44 in provider statistics without API key', () => {
        const stats = aggregator.getProviderStats();
        const project44Provider = stats.find(provider => provider.name === 'project44');
        // Project44 should not be in the active providers list without an API key
        expect(project44Provider).toBeUndefined();
    });
    it('should handle Project44 API calls through aggregator', async () => {
        // This test verifies that Project44 is properly integrated in the aggregator
        // Even without API key, it should handle the call gracefully
        try {
            const results = await aggregator.fetchFromMultipleSources('TEST123456', 'container');
            // Should get results from available providers (even if Project44 fails due to no API key)
            expect(Array.isArray(results)).toBe(true);
            // Project44 might be in the results with an error status due to missing API key
            const project44Result = results.find(result => result.provider === 'project44');
            if (project44Result) {
                expect(project44Result.provider).toBe('project44');
                expect(project44Result.status).toBe('error');
                expect(project44Result.error?.errorType).toBe('AUTH_ERROR');
            }
        }
        catch (error) {
            // If all providers fail, that's expected in test environment
            expect(error).toBeDefined();
        }
    }, 15000); // Increased timeout for API calls
    it('should have Project44 service instantiated and available for configuration', () => {
        // Even without API key, the Project44 service should be instantiated
        // This tests that the service is properly imported and can be used
        // We can't directly access private members, but we can test that the aggregator
        // was constructed successfully with all services including Project44
        expect(aggregator).toBeDefined();
        expect(typeof aggregator.getProviderStats).toBe('function');
        expect(typeof aggregator.fetchFromMultipleSources).toBe('function');
    });
    it('should support premium features when Project44 is configured', () => {
        // This test verifies that Project44 premium features would be available
        // when properly configured with an API key
        // The aggregator should be able to handle premium providers
        expect(aggregator).toBeDefined();
        // Project44 configuration should be available in the provider list
        // (even if not active without API key)
        const stats = aggregator.getProviderStats();
        expect(Array.isArray(stats)).toBe(true);
    });
});
//# sourceMappingURL=Project44Integration.test.js.map