#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { APIKeyValidator } from '../services/APIKeyValidator';
import { config, validateAPIKeys } from '../config/environment';

interface SetupConfig {
  useDefaults: boolean;
  setupFreeAPIs: boolean;
  setupPremiumAPIs: boolean;
  setupDatabase: boolean;
}

/**
 * Interactive environment setup script
 * Helps users configure API keys and environment variables
 */
class EnvironmentSetup {
  private rl: readline.Interface;
  private envPath: string;
  private envExamplePath: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    this.envPath = path.join(process.cwd(), '.env');
    this.envExamplePath = path.join(process.cwd(), '.env.example');
  }

  async run(): Promise<void> {
    console.log('🚢 Shipping Tracker API Environment Setup');
    console.log('=========================================\n');

    try {
      // Check if .env already exists
      if (fs.existsSync(this.envPath)) {
        const overwrite = await this.askQuestion(
          '⚠️  .env file already exists. Do you want to update it? (y/N): '
        );
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
          console.log('Setup cancelled.');
          return;
        }
      }

      // Get setup preferences
      const setupConfig = await this.getSetupPreferences();

      // Create or update .env file
      await this.createEnvironmentFile(setupConfig);

      // Validate the configuration
      await this.validateConfiguration();

      console.log('\n✅ Environment setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Review your .env file and add any missing API keys');
      console.log('2. Run: npm run validate:env to check your configuration');
      console.log('3. Run: npm run dev to start the development server');

    } catch (error) {
      console.error('❌ Setup failed:', error);
    } finally {
      this.rl.close();
    }
  }

  private async getSetupPreferences(): Promise<SetupConfig> {
    console.log('Setup Options:');
    console.log('1. Quick setup (recommended for development)');
    console.log('2. Custom setup');
    
    const choice = await this.askQuestion('Choose setup type (1/2): ');
    
    if (choice === '1') {
      return {
        useDefaults: true,
        setupFreeAPIs: true,
        setupPremiumAPIs: false,
        setupDatabase: true,
      };
    }

    return {
      useDefaults: false,
      setupFreeAPIs: await this.askYesNo('Setup free tier APIs (Track-Trace, ShipsGo, SeaRates)?'),
      setupPremiumAPIs: await this.askYesNo('Setup premium APIs (Maersk, MSC, etc.)?'),
      setupDatabase: await this.askYesNo('Setup database configuration?'),
    };
  }

  private async createEnvironmentFile(setupConfig: SetupConfig): Promise<void> {
    let envContent = '';

    // Server Configuration
    envContent += '# Server Configuration\n';
    envContent += 'PORT=3001\n';
    envContent += 'NODE_ENV=development\n';
    envContent += 'FRONTEND_URL=http://localhost:5173\n\n';

    // Free Tier APIs
    if (setupConfig.setupFreeAPIs) {
      envContent += '# === FREE TIER APIs (Recommended for development) ===\n';
      envContent += '# Track-Trace Free API - No API key required for basic usage\n';
      envContent += 'TRACK_TRACE_API_KEY=\n';
      envContent += 'TRACK_TRACE_BASE_URL=https://api.track-trace.com/v1\n';
      envContent += 'TRACK_TRACE_ENABLED=true\n\n';

      envContent += '# ShipsGo Freemium API - Free tier available (sign up at shipsgo.com)\n';
      envContent += '# Get your free API key at: https://www.shipsgo.com/api\n';
      
      if (setupConfig.useDefaults) {
        envContent += 'SHIPSGO_API_KEY=\n';
      } else {
        const shipsGoKey = await this.askQuestion('Enter ShipsGo API key (optional, press Enter to skip): ');
        envContent += `SHIPSGO_API_KEY=${shipsGoKey}\n`;
      }
      
      envContent += 'SHIPSGO_BASE_URL=https://api.shipsgo.com/v2\n';
      envContent += 'SHIPSGO_ENABLED=true\n\n';

      envContent += '# SeaRates Freemium API - Free tier available (sign up at searates.com)\n';
      envContent += '# Get your free API key at: https://www.searates.com/api\n';
      
      if (setupConfig.useDefaults) {
        envContent += 'SEARATES_API_KEY=\n';
      } else {
        const seaRatesKey = await this.askQuestion('Enter SeaRates API key (optional, press Enter to skip): ');
        envContent += `SEARATES_API_KEY=${seaRatesKey}\n`;
      }
      
      envContent += 'SEARATES_BASE_URL=https://api.searates.com/v1\n';
      envContent += 'SEARATES_ENABLED=true\n\n';
    }

    // Premium APIs
    if (setupConfig.setupPremiumAPIs) {
      envContent += '# === MAJOR OCEAN CARRIERS (Premium APIs) ===\n';
      
      const premiumAPIs = [
        { name: 'MAERSK', url: 'https://api.maersk.com/track' },
        { name: 'MSC', url: 'https://api.msc.com/tracking' },
        { name: 'CMA_CGM', url: 'https://api.cma-cgm.com/tracking' },
        { name: 'COSCO', url: 'https://api.cosco-shipping.com/track' },
        { name: 'HAPAG_LLOYD', url: 'https://api.hapag-lloyd.com/tracking' },
        { name: 'EVERGREEN', url: 'https://api.evergreen-line.com/tracking' },
        { name: 'ONE_LINE', url: 'https://api.one-line.com/tracking' },
        { name: 'YANG_MING', url: 'https://api.yangming.com/tracking' },
        { name: 'ZIM', url: 'https://api.zim.com/tracking' },
      ];

      for (const api of premiumAPIs) {
        if (!setupConfig.useDefaults) {
          const apiKey = await this.askQuestion(`Enter ${api.name} API key (optional, press Enter to skip): `);
          envContent += `${api.name}_API_KEY=${apiKey}\n`;
        } else {
          envContent += `${api.name}_API_KEY=\n`;
        }
        envContent += `${api.name}_BASE_URL=${api.url}\n\n`;
      }

      // Vessel Tracking Services
      envContent += '# === VESSEL TRACKING SERVICES ===\n';
      envContent += 'MARINE_TRAFFIC_API_KEY=\n';
      envContent += 'MARINE_TRAFFIC_BASE_URL=https://services.marinetraffic.com/api\n\n';
      envContent += 'VESSEL_FINDER_API_KEY=\n';
      envContent += 'VESSEL_FINDER_BASE_URL=https://api.vesselfinder.com/v1\n\n';

      // Premium Aggregators
      envContent += '# === PREMIUM AGGREGATORS ===\n';
      envContent += 'PROJECT44_API_KEY=\n';
      envContent += 'PROJECT44_BASE_URL=https://api.project44.com/v4\n\n';
    }

    // Database Configuration
    if (setupConfig.setupDatabase) {
      envContent += '# Database Configuration\n';
      envContent += 'DATABASE_URL=postgresql://postgres:password@localhost:5432/shipping_tracker\n';
      envContent += 'DATABASE_HOST=localhost\n';
      envContent += 'DATABASE_PORT=5432\n';
      envContent += 'DATABASE_NAME=shipping_tracker\n';
      envContent += 'DATABASE_USER=postgres\n';
      envContent += 'DATABASE_PASSWORD=password\n\n';

      envContent += '# Redis Configuration\n';
      envContent += 'REDIS_URL=redis://localhost:6379\n';
      envContent += 'REDIS_HOST=localhost\n';
      envContent += 'REDIS_PORT=6379\n\n';
    }

    // Security Configuration
    envContent += '# Security Configuration\n';
    envContent += `JWT_SECRET=${this.generateSecretKey()}\n`;
    envContent += `API_SECRET_KEY=${this.generateSecretKey()}\n`;
    envContent += 'CORS_ORIGIN=http://localhost:5173\n\n';

    // Rate Limiting Configuration
    envContent += '# Rate Limiting Configuration\n';
    envContent += 'RATE_LIMIT_WINDOW_MS=900000\n';
    envContent += 'RATE_LIMIT_MAX_REQUESTS=100\n';
    envContent += 'API_RATE_LIMIT_PER_MINUTE=60\n\n';

    // Demo Mode Configuration
    envContent += '# Demo Mode Configuration\n';
    envContent += 'DEMO_MODE=true\n';
    envContent += 'ENABLE_MOCK_DATA=true\n';
    envContent += 'CACHE_TTL_SECONDS=300\n\n';

    // Logging Configuration
    envContent += '# Logging Configuration\n';
    envContent += 'LOG_LEVEL=info\n';
    envContent += 'ENABLE_REQUEST_LOGGING=true\n\n';

    // API Timeout Configuration
    envContent += '# API Timeout Configuration\n';
    envContent += 'API_TIMEOUT_MS=10000\n';
    envContent += 'API_RETRY_ATTEMPTS=3\n';
    envContent += 'API_RETRY_DELAY_MS=1000\n';

    // Write the file
    fs.writeFileSync(this.envPath, envContent);
    console.log(`✅ Created ${this.envPath}`);
  }

  private async validateConfiguration(): Promise<void> {
    console.log('\n🔍 Validating configuration...');
    
    try {
      // Validate environment variables
      const validation = validateAPIKeys();
      
      console.log('\n📊 API Configuration Summary:');
      console.log(`✅ Valid APIs: ${validation.valid.length}`);
      validation.valid.forEach(api => console.log(`   - ${api}`));
      
      if (validation.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${validation.warnings.length}`);
        validation.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
      
      if (validation.invalid.length > 0) {
        console.log(`❌ Invalid/Missing APIs: ${validation.invalid.length}`);
        validation.invalid.forEach(api => console.log(`   - ${api}`));
      }

      // Test API connections if not in demo mode
      if (!config.demo.enabled) {
        console.log('\n🔗 Testing API connections...');
        const validator = new APIKeyValidator();
        const results = await validator.validateAllKeys();
        
        results.forEach(result => {
          const status = result.valid ? '✅' : '❌';
          const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
          const error = result.error ? ` - ${result.error}` : '';
          console.log(`   ${status} ${result.provider}${time}${error}`);
        });
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
    }
  }

  private generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private async askYesNo(question: string): Promise<boolean> {
    const answer = await this.askQuestion(`${question} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }
}

// Run the setup if called directly
if (require.main === module) {
  const setup = new EnvironmentSetup();
  setup.run().catch(console.error);
}

export { EnvironmentSetup };