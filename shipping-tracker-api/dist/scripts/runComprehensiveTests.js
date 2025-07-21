#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runComprehensiveTests = runComprehensiveTests;
const ComprehensiveAPITesting_1 = require("../test/ComprehensiveAPITesting");
/**
 * Script to run comprehensive API testing and generate reports
 * Usage: npm run test:comprehensive
 */
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive Container API Testing...\n');
    const testFramework = new ComprehensiveAPITesting_1.ComprehensiveAPITesting();
    try {
        // Generate full test report
        console.log('📊 Generating comprehensive test report...');
        const report = await testFramework.generateTestReport();
        // Display summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 COMPREHENSIVE API TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total APIs Tested: ${report.summary.totalAPIs}`);
        console.log(`Working APIs: ${report.summary.workingAPIs}`);
        console.log(`Average Reliability: ${(report.summary.averageReliability * 100).toFixed(1)}%`);
        console.log(`Total Features: ${report.summary.totalFeatures}`);
        // Performance Summary
        console.log('\n📈 PERFORMANCE METRICS');
        console.log('-'.repeat(40));
        console.log(`Total Requests: ${report.performanceResults.totalRequests}`);
        console.log(`Successful Requests: ${report.performanceResults.successfulRequests}`);
        console.log(`Average Response Time: ${report.performanceResults.averageResponseTime.toFixed(0)}ms`);
        console.log(`Throughput: ${report.performanceResults.throughput.toFixed(2)} req/sec`);
        console.log(`Error Rate: ${(report.performanceResults.errorRate * 100).toFixed(1)}%`);
        // API Results Summary
        console.log('\n🔌 API PROVIDER RESULTS');
        console.log('-'.repeat(40));
        report.apiResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            const responseTime = result.responseTime.toFixed(0);
            const reliability = (result.reliability * 100).toFixed(0);
            console.log(`${status} ${result.provider.padEnd(15)} | ${responseTime}ms | ${reliability}% reliable`);
        });
        // End-to-End Results
        console.log('\n🔍 END-TO-END TEST RESULTS');
        console.log('-'.repeat(40));
        console.log(`Total Tests: ${report.endToEndResults.totalTests}`);
        console.log(`Passed: ${report.endToEndResults.passedTests}`);
        console.log(`Failed: ${report.endToEndResults.failedTests}`);
        report.endToEndResults.testResults.forEach((test) => {
            const status = test.success ? '✅' : '❌';
            console.log(`${status} ${test.testName} (${test.duration}ms)`);
        });
        // Reliability Results
        console.log('\n⏱️  RELIABILITY TEST RESULTS');
        console.log('-'.repeat(40));
        report.reliabilityResults.forEach(result => {
            const uptime = (result.uptime * 100).toFixed(1);
            const avgTime = result.averageResponseTime.toFixed(0);
            console.log(`${result.provider.padEnd(15)} | ${uptime}% uptime | ${avgTime}ms avg`);
        });
        console.log('\n' + '='.repeat(60));
        console.log('✅ Comprehensive API Testing Complete!');
        console.log('='.repeat(60));
    }
    catch (error) {
        console.error('❌ Error running comprehensive tests:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    runComprehensiveTests().catch(console.error);
}
//# sourceMappingURL=runComprehensiveTests.js.map