#!/usr/bin/env ts-node

import { runMigrations } from '../database/migrator';
import { testConnection, closePool } from '../config/database';
import { validateEnvironment } from '../config/environment';

async function runMigrationScript() {
  try {
    console.log('🔧 Starting database migration script...\n');
    
    // Validate environment
    validateEnvironment();
    
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your DATABASE_URL.');
      process.exit(1);
    }
    
    // Run migrations
    await runMigrations();
    
    console.log('\n✅ Migration script completed successfully!');
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrationScript();
}

export { runMigrationScript };