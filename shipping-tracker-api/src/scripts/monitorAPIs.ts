#!/usr/bin/env ts-node

import { ComprehensiveAPITesting } from '../test/ComprehensiveAPITesting';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Continuous API monitoring script for uptime and reliability tracking
 * Usage: npm run monitor:apis
 */
class APIMonitor {
  private testFramework: ComprehensiveAPITesting;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.testFramework = new ComprehensiveAPITesting();
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Monitoring is already running');
      return;
    }

    console.log(`🚀 Starting API monitoring (checking every ${intervalMinutes} minutes)...`);
    this.isRunning = true;

    // Initial check
    await this.performHealthCheck();

    // Set up recurring checks
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down API monitoring...');
      this.stopMonitoring();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down API monitoring...');
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('✅ API monitoring stopped');
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`\n🏥 Health Check - ${timestamp}`);
    console.log('='.repeat(60));

    try {
      // Quick API test
      const apiResults = await this.testFramework.testAllAPIs();
      
      // Calculate health metrics
      const totalAPIs = apiResults.length;
      const workingAPIs = apiResults.filter(r => r.success).length;
      const averageResponseTime = apiResults.reduce((sum, r) => sum + r.responseTime, 0) / totalAPIs;
      const healthScore = (workingAPIs / totalAPIs) * 100;

      // Display results
      console.log(`📊 Health Summary:`);
      console.log(`   Total APIs: ${totalAPIs}`);
      console.log(`   Working APIs: ${workingAPIs}`);
      console.log(`   Health Score: ${healthScore.toFixed(1)}%`);
      console.log(`   Avg Response Time: ${averageResponseTime.toFixed(0)}ms`);

      // Show individual API status
      console.log(`\n🔌 API Status:`);
      apiResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const responseTime = result.responseTime.toFixed(0);
        console.log(`   ${status} ${result.provider.padEnd(15)} | ${responseTime}ms`);
      });

      // Save health data
      await this.saveHealthData({
        timestamp: new Date(),
        totalAPIs,
        workingAPIs,
        healthScore,
        averageResponseTime,
        apiResults
      });

      // Alert if health is poor
      if (healthScore < 50) {
        console.log(`\n🚨 ALERT: Poor API health detected (${healthScore.toFixed(1)}%)`);
        await this.sendAlert(`API Health Alert: Only ${workingAPIs}/${totalAPIs} APIs are working`);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      await this.sendAlert(`Health Check Failed: ${error}`);
    }
  }

  /**
   * Save health data to file
   */
  private async saveHealthData(healthData: any): Promise<void> {
    try {
      const healthDir = path.join(__dirname, '../../health-data');
      
      if (!fs.existsSync(healthDir)) {
        fs.mkdirSync(healthDir, { recursive: true });
      }

      // Save daily health log
      const date = new Date().toISOString().split('T')[0];
      const dailyLogPath = path.join(healthDir, `health-${date}.json`);
      
      let dailyData = [];
      if (fs.existsSync(dailyLogPath)) {
        const existingData = fs.readFileSync(dailyLogPath, 'utf8');
        dailyData = JSON.parse(existingData);
      }
      
      dailyData.push(healthData);
      fs.writeFileSync(dailyLogPath, JSON.stringify(dailyData, null, 2));

      // Save latest health status
      const latestPath = path.join(healthDir, 'latest-health.json');
      fs.writeFileSync(latestPath, JSON.stringify(healthData, null, 2));

    } catch (error) {
      console.error('❌ Error saving health data:', error);
    }
  }

  /**
   * Send alert (placeholder for notification system)
   */
  private async sendAlert(message: string): Promise<void> {
    // In a real implementation, this would send notifications via:
    // - Email
    // - Slack
    // - Discord
    // - SMS
    // - PagerDuty
    // etc.
    
    console.log(`🚨 ALERT: ${message}`);
    
    // Save alert to file
    try {
      const alertsDir = path.join(__dirname, '../../alerts');
      
      if (!fs.existsSync(alertsDir)) {
        fs.mkdirSync(alertsDir, { recursive: true });
      }

      const alertData = {
        timestamp: new Date().toISOString(),
        message,
        severity: 'HIGH'
      };

      const alertsPath = path.join(alertsDir, 'alerts.json');
      let alerts = [];
      
      if (fs.existsSync(alertsPath)) {
        const existingAlerts = fs.readFileSync(alertsPath, 'utf8');
        alerts = JSON.parse(existingAlerts);
      }
      
      alerts.push(alertData);
      
      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts = alerts.slice(-100);
      }
      
      fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

    } catch (error) {
      console.error('❌ Error saving alert:', error);
    }
  }

  /**
   * Generate health report
   */
  async generateHealthReport(): Promise<void> {
    console.log('📊 Generating health report...');
    
    try {
      const healthDir = path.join(__dirname, '../../health-data');
      
      if (!fs.existsSync(healthDir)) {
        console.log('❌ No health data found');
        return;
      }

      // Get all daily health files
      const healthFiles = fs.readdirSync(healthDir)
        .filter(file => file.startsWith('health-') && file.endsWith('.json'))
        .sort();

      if (healthFiles.length === 0) {
        console.log('❌ No health data files found');
        return;
      }

      console.log(`📈 Analyzing ${healthFiles.length} days of health data...`);

      let totalChecks = 0;
      let totalUptime = 0;
      const providerStats: Record<string, { checks: number; successes: number; totalResponseTime: number }> = {};

      // Analyze all health data
      for (const file of healthFiles) {
        const filePath = path.join(healthDir, file);
        const dailyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        for (const check of dailyData) {
          totalChecks++;
          totalUptime += check.healthScore;
          
          // Analyze individual API performance
          for (const apiResult of check.apiResults) {
            if (!providerStats[apiResult.provider]) {
              providerStats[apiResult.provider] = { checks: 0, successes: 0, totalResponseTime: 0 };
            }
            
            providerStats[apiResult.provider].checks++;
            providerStats[apiResult.provider].totalResponseTime += apiResult.responseTime;
            
            if (apiResult.success) {
              providerStats[apiResult.provider].successes++;
            }
          }
        }
      }

      // Generate report
      const averageUptime = totalChecks > 0 ? totalUptime / totalChecks : 0;
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 API HEALTH REPORT');
      console.log('='.repeat(60));
      console.log(`Overall System Uptime: ${averageUptime.toFixed(1)}%`);
      console.log(`Total Health Checks: ${totalChecks}`);
      console.log(`Monitoring Period: ${healthFiles.length} days`);
      
      console.log('\n🔌 Individual API Performance:');
      console.log('-'.repeat(60));
      
      Object.entries(providerStats).forEach(([provider, stats]) => {
        const uptime = (stats.successes / stats.checks * 100).toFixed(1);
        const avgResponseTime = (stats.totalResponseTime / stats.checks).toFixed(0);
        
        console.log(`${provider.padEnd(15)} | ${uptime.padStart(6)}% uptime | ${avgResponseTime.padStart(6)}ms avg`);
      });

      // Save report
      const report = {
        generatedAt: new Date().toISOString(),
        monitoringPeriod: `${healthFiles.length} days`,
        totalChecks,
        averageUptime,
        providerStats: Object.entries(providerStats).map(([provider, stats]) => ({
          provider,
          uptime: stats.successes / stats.checks * 100,
          averageResponseTime: stats.totalResponseTime / stats.checks,
          totalChecks: stats.checks
        }))
      };

      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportPath = path.join(reportsDir, `health-report-${new Date().toISOString().split('T')[0]}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`\n📄 Health report saved to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Error generating health report:', error);
    }
  }
}

// CLI interface
async function main() {
  const monitor = new APIMonitor();
  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    await monitor.generateHealthReport();
    return;
  }
  
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 5;
  
  console.log('🏥 Container API Health Monitor');
  console.log('==============================');
  console.log('Commands:');
  console.log('  --interval=N  Set monitoring interval in minutes (default: 5)');
  console.log('  --report      Generate health report from existing data');
  console.log('  Ctrl+C        Stop monitoring');
  console.log('');
  
  await monitor.startMonitoring(interval);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { APIMonitor };