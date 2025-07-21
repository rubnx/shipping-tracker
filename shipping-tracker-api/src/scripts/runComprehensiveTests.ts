#!/usr/bin/env ts-node

import { ComprehensiveAPITesting } from '../test/ComprehensiveAPITesting';

/**
 * Script to run comprehensive API testing and generate reports
 * Usage: npm run test:comprehensive
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Container API Testing...\n');
  
  const testFramework = new ComprehensiveAPITesting();
  
  try {
    // Generate full test report
    console.log('📊 Generating comprehensive test report...');
    const report = await testFramework.generateTestReport();
    
    // Display real container test results
    if (report.realContainerResults && report.realContainerResults.length > 0) {
      console.log('\n📦 REAL CONTAINER TEST RESULTS');
      console.log('-'.repeat(40));
      
      const successfulContainers = report.realContainerResults.filter(r => r.success);
      const averageDataQuality = successfulContainers.length > 0 
        ? successfulContainers.reduce((sum, r) => sum + r.dataQuality, 0) / successfulContainers.length 
        : 0;
      
      console.log(`Total Container Tests: ${report.realContainerResults.length}`);
      console.log(`Successful Tests: ${successfulContainers.length}`);
      console.log(`Success Rate: ${(successfulContainers.length / report.realContainerResults.length * 100).toFixed(1)}%`);
      console.log(`Average Data Quality: ${(averageDataQuality * 100).toFixed(1)}%`);
    }
    
    // Display stress test results
    if (report.stressTestResults) {
      console.log('\n🔥 STRESS TEST RESULTS');
      console.log('-'.repeat(40));
      console.log(`Total Requests: ${report.stressTestResults.totalRequests}`);
      console.log(`Successful Requests: ${report.stressTestResults.successfulRequests}`);
      console.log(`Average Response Time: ${report.stressTestResults.averageResponseTime.toFixed(0)}ms`);
      console.log(`Max Response Time: ${report.stressTestResults.maxResponseTime.toFixed(0)}ms`);
      console.log(`Throughput: ${report.stressTestResults.throughput.toFixed(2)} req/sec`);
      console.log(`Error Rate: ${(report.stressTestResults.errorRate * 100).toFixed(1)}%`);
    }
    
    // Display monitoring results
    if (report.monitoringResults && report.monitoringResults.length > 0) {
      console.log('\n📊 API MONITORING RESULTS');
      console.log('-'.repeat(40));
      
      const monitoringByProvider = report.monitoringResults.reduce((acc, result) => {
        if (!acc[result.provider]) {
          acc[result.provider] = { up: 0, down: 0, degraded: 0, total: 0, totalResponseTime: 0 };
        }
        acc[result.provider][result.status.toLowerCase()]++;
        acc[result.provider].total++;
        acc[result.provider].totalResponseTime += result.responseTime;
        return acc;
      }, {} as Record<string, any>);
      
      Object.entries(monitoringByProvider).forEach(([provider, stats]) => {
        const uptime = (stats.up / stats.total * 100).toFixed(1);
        const avgResponseTime = (stats.totalResponseTime / stats.total).toFixed(0);
        console.log(`${provider.padEnd(15)} | ${uptime}% uptime | ${avgResponseTime}ms avg`);
      });
    }
    
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
    
    report.endToEndResults.testResults.forEach((test: any) => {
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
    
  } catch (error) {
    console.error('❌ Error running comprehensive tests:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

export { runComprehensiveTests };