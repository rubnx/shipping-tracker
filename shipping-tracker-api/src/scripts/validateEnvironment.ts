#!/usr/bin/env node

import { config, validateAPIKeys, getEnabledProviders, isDemoMode } from '../config/environment';
import { APIKeyValidator } from '../services/APIKeyValidator';

/**
 * Environment validation script
 * Validates configuration and API keys on startup
 */
async function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');

  // 1. Basic configuration validation
  console.log('📋 Basic Configuration:');
  console.log(`  Environment: ${config.server.nodeEnv}`);
  console.log(`  Port: ${config.server.port}`);
  console.log(`  Frontend URL: ${config.server.frontendUrl}`);
  console.log(`  Demo Mode: ${isDemoMode() ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`  Mock Data: ${config.demo.enableMockData ? '✅ Enabled' : '❌ Disabled'}`);
  console.log();

  // 2. Database configuration
  console.log('🗄️  Database Configuration:');
  console.log(`  Host: ${config.database.host}:${config.database.port}`);
  console.log(`  Database: ${config.database.name}`);
  console.log(`  User: ${config.database.user}`);
  console.log();

  // 3. Redis configuration
  console.log('🔴 Redis Configuration:');
  console.log(`  Host: ${config.redis.host}:${config.redis.port}`);
  console.log();

  // 4. API Provider validation
  console.log('🔑 API Provider Validation:');
  const keyValidation = validateAPIKeys();
  
  if (keyValidation.valid.length > 0) {
    console.log('  ✅ Valid/Available APIs:');
    keyValidation.valid.forEach(api => console.log(`    - ${api}`));
  }

  if (keyValidation.warnings.length > 0) {
    console.log('  ⚠️  Warnings:');
    keyValidation.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  if (keyValidation.invalid.length > 0) {
    console.log('  ❌ Missing/Invalid APIs:');
    keyValidation.invalid.forEach(api => console.log(`    - ${api}`));
  }

  console.log();

  // 5. Detailed API provider status
  const enabledProviders = getEnabledProviders();
  console.log('📡 API Provider Details:');
  console.log(`  Total Enabled: ${enabledProviders.length}`);
  
  const byTier = enabledProviders.reduce((acc, provider) => {
    acc[provider.tier] = (acc[provider.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(byTier).forEach(([tier, count]) => {
    console.log(`  ${tier.charAt(0).toUpperCase() + tier.slice(1)}: ${count} providers`);
  });

  console.log();

  // 6. Live API validation (if not in demo mode)
  if (!isDemoMode() && keyValidation.valid.length > 0) {
    console.log('🌐 Testing API Connectivity...');
    const validator = new APIKeyValidator();
    
    try {
      const results = await validator.validateAllKeys();
      const successful = results.filter(r => r.valid);
      const failed = results.filter(r => !r.valid);

      if (successful.length > 0) {
        console.log('  ✅ Successfully Connected:');
        successful.forEach(result => {
          const timing = result.responseTime ? ` (${result.responseTime}ms)` : '';
          console.log(`    - ${result.provider}${timing}`);
        });
      }

      if (failed.length > 0) {
        console.log('  ❌ Connection Failed:');
        failed.forEach(result => {
          console.log(`    - ${result.provider}: ${result.error}`);
        });
      }
    } catch (error) {
      console.log('  ⚠️  API validation failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  } else if (isDemoMode()) {
    console.log('🎭 Demo mode enabled - skipping live API validation');
  }

  console.log();

  // 7. Security validation
  console.log('🔒 Security Configuration:');
  const jwtSecretLength = config.security.jwtSecret.length;
  const apiSecretLength = config.security.apiSecretKey.length;
  
  console.log(`  JWT Secret: ${jwtSecretLength >= 32 ? '✅' : '❌'} ${jwtSecretLength} characters`);
  console.log(`  API Secret: ${apiSecretLength >= 32 ? '✅' : '❌'} ${apiSecretLength} characters`);
  console.log(`  CORS Origin: ${config.server.corsOrigin}`);
  console.log();

  // 8. Rate limiting configuration
  console.log('⏱️  Rate Limiting:');
  console.log(`  Window: ${config.rateLimit.windowMs / 1000}s`);
  console.log(`  Max Requests: ${config.rateLimit.maxRequests}`);
  console.log(`  API Rate Limit: ${config.rateLimit.apiRateLimitPerMinute}/min`);
  console.log();

  // 9. Summary and recommendations
  console.log('📊 Summary:');
  const totalIssues = keyValidation.invalid.length + 
    (jwtSecretLength < 32 ? 1 : 0) + 
    (apiSecretLength < 32 ? 1 : 0);

  if (totalIssues === 0) {
    console.log('  ✅ Environment configuration is valid and ready for use!');
  } else {
    console.log(`  ⚠️  Found ${totalIssues} configuration issue(s) that should be addressed.`);
  }

  if (isDemoMode()) {
    console.log('  🎭 Running in demo mode - perfect for development and testing!');
  }

  if (keyValidation.invalid.length > 0 && !isDemoMode()) {
    console.log('\n💡 Recommendations:');
    console.log('  - Enable demo mode for development: DEMO_MODE=true');
    console.log('  - Configure free tier APIs: Track-Trace, ShipsGo, SeaRates');
    console.log('  - Check API provider documentation for key setup');
  }

  console.log('\n🚀 Environment validation complete!');
  
  return totalIssues === 0;
}

// Run validation if called directly
if (require.main === module) {
  validateEnvironment()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Environment validation failed:', error);
      process.exit(1);
    });
}

export { validateEnvironment };