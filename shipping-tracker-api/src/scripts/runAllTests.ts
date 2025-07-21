#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Comprehensive test suite runner for all container API tests
 * Executes all test categories and generates combined report
 */
class ComprehensiveTestRunner {
  private results: any = {
    timestamp: new Date().toISOString(),
    testSuites: [],
    summary: {
      totalSuites: 0,
      passedSuites: 0,
      failedSuites: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    }
  };

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Container API Test Suite');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    const testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm test -- --testPathPattern="test.*\\.test\\.ts$" --testPathIgnorePatterns="Integration|Performance|Comprehensive"',
        timeout: 120000
      },
      {
        name: 'Individual API Integration Tests',
        command: 'npm run test:all-apis',
        timeout: 300000
      },
      {
        name: 'Performance and Monitoring Tests',
        command: 'npm run test:performance',
        timeout: 600000
      },
      {
        name: 'Comprehensive API Testing Framework',
        command: 'npm run test:comprehensive',
        timeout: 900000
      }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    await this.generateFinalReport();
  }

  private async runTestSuite(suite: { name: string; command: string; timeout: number }): Promise<void> {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    let success = false;
    let output = '';
    let error = '';

    try {
      output = execSync(suite.command, {
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: 'pipe'
      });
      success = true;
      console.log('✅ PASSED');
    } catch (err: any) {
      success = false;
      error = err.message || 'Unknown error';
      output = err.stdout || '';
      console.log('❌ FAILED');
      console.log(`Error: ${error}`);
    }

    const duration = Date.now() - startTime;
    
    const suiteResult = {
      name: suite.name,
      success,
      duration,
      output: output.substring(0, 1000), // Truncate long output
      error: error.substring(0, 500), // Truncate long errors
      timestamp: new Date().toISOString()
    };

    this.results.testSuites.push(suiteResult);
    this.results.summary.totalSuites++;
    
    if (success) {
      this.results.summary.passedSuites++;
    } else {
      this.results.summary.failedSuites++;
    }

    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  }

  private async generateFinalReport(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(60));
    
    const { summary } = this.results;
    
    console.log(`Test Suites: ${summary.passedSuites}/${summary.totalSuites} passed`);
    console.log(`Overall Success Rate: ${(summary.passedSuites / summary.totalSuites * 100).toFixed(1)}%`);
    
    console.log('\n📋 Suite Results:');
    this.results.testSuites.forEach((suite: any) => {
      const status = suite.success ? '✅' : '❌';
      const duration = (suite.duration / 1000).toFixed(1);
      console.log(`${status} ${suite.name} (${duration}s)`);
    });

    // Save comprehensive report
    await this.saveReport();
    
    // Generate recommendations
    this.generateRecommendations();
    
    console.log('\n' + '='.repeat(60));
    
    if (summary.failedSuites === 0) {
      console.log('🎉 All test suites passed! Container API testing is comprehensive.');
    } else {
      console.log(`⚠️  ${summary.failedSuites} test suite(s) failed. Review the results above.`);
    }
    
    console.log('='.repeat(60));
  }

  private async saveReport(): Promise<void> {
    try {
      const reportsDir = path.join(__dirname, '../../reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `comprehensive-test-report-${timestamp}.json`;
      const filepath = path.join(reportsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
      
      // Also save as latest
      const latestPath = path.join(reportsDir, 'latest-test-report.json');
      fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));
      
      console.log(`\n📄 Comprehensive report saved to: ${filepath}`);
      
    } catch (error) {
      console.error('❌ Error saving report:', error);
    }
  }

  private generateRecommendations(): void {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    const failedSuites = this.results.testSuites.filter((s: any) => !s.success);
    
    if (failedSuites.length === 0) {
      console.log('✅ All tests are passing! Consider:');
      console.log('   - Running tests more frequently');
      console.log('   - Adding more edge case scenarios');
      console.log('   - Implementing continuous monitoring');
    } else {
      console.log('🔧 Issues detected:');
      
      failedSuites.forEach((suite: any) => {
        console.log(`\n❌ ${suite.name}:`);
        
        if (suite.error.includes('timeout')) {
          console.log('   - Consider increasing test timeouts');
          console.log('   - Check API response times');
          console.log('   - Verify network connectivity');
        }
        
        if (suite.error.includes('rate limit')) {
          console.log('   - Implement better rate limiting handling');
          console.log('   - Add delays between API calls');
          console.log('   - Consider using premium API tiers');
        }
        
        if (suite.error.includes('auth')) {
          console.log('   - Verify API credentials');
          console.log('   - Check API key permissions');
          console.log('   - Ensure environment variables are set');
        }
        
        if (suite.error.includes('network') || suite.error.includes('ENOTFOUND')) {
          console.log('   - Check internet connectivity');
          console.log('   - Verify API endpoint URLs');
          console.log('   - Consider network proxy settings');
        }
      });
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review failed test details above');
    console.log('   2. Fix any configuration issues');
    console.log('   3. Re-run specific test suites');
    console.log('   4. Set up continuous monitoring');
    console.log('   5. Schedule regular comprehensive testing');
  }
}

// CLI interface
async function main() {
  const runner = new ComprehensiveTestRunner();
  
  console.log('Container API Comprehensive Test Suite');
  console.log('=====================================');
  console.log('This will run all test categories:');
  console.log('  ✓ Unit Tests');
  console.log('  ✓ Individual API Integration Tests');
  console.log('  ✓ Performance and Monitoring Tests');
  console.log('  ✓ Comprehensive API Testing Framework');
  console.log('');
  console.log('⚠️  This may take 15-30 minutes to complete.');
  console.log('');
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveTestRunner };