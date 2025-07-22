#!/usr/bin/env node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config/environment';

/**
 * Database setup script
 * Creates database, runs migrations, and seeds data
 */
class DatabaseSetup {
  private pool: Pool;
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, '../database/migrations');
    
    // Create connection pool
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async run(): Promise<void> {
    console.log('🗄️  Setting up Shipping Tracker Database');
    console.log('======================================\n');

    try {
      // Test database connection
      await this.testConnection();

      // Run migrations
      await this.runMigrations();

      // Verify setup
      await this.verifySetup();

      console.log('\n✅ Database setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Start the API server: npm run dev');
      console.log('2. Test the database connection');
      console.log('3. View data with pgAdmin at http://localhost:5050 (if running with --profile tools)');

    } catch (error) {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  private async testConnection(): Promise<void> {
    console.log('1. Testing database connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
      client.release();

      console.log(`   ✅ Connected to PostgreSQL`);
      console.log(`   📅 Server time: ${result.rows[0].current_time}`);
      console.log(`   🔢 Version: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  private async runMigrations(): Promise<void> {
    console.log('\n2. Running database migrations...');

    try {
      // Get all migration files
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('   ⚠️  No migration files found');
        return;
      }

      // Create migrations tracking table
      await this.createMigrationsTable();

      // Run each migration
      for (const file of migrationFiles) {
        await this.runMigration(file);
      }

      console.log(`   ✅ Completed ${migrationFiles.length} migrations`);
    } catch (error) {
      throw new Error(`Migration failed: ${error}`);
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await this.pool.query(query);
  }

  private async runMigration(filename: string): Promise<void> {
    // Check if migration already ran
    const checkQuery = 'SELECT filename FROM schema_migrations WHERE filename = $1';
    const checkResult = await this.pool.query(checkQuery, [filename]);

    if (checkResult.rows.length > 0) {
      console.log(`   ⏭️  Skipping ${filename} (already executed)`);
      return;
    }

    // Read and execute migration
    const migrationPath = path.join(this.migrationsPath, filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log(`   🔄 Executing ${filename}...`);

    try {
      // Execute migration in a transaction
      await this.pool.query('BEGIN');
      await this.pool.query(migrationSQL);
      
      // Record migration as completed
      const recordQuery = 'INSERT INTO schema_migrations (filename) VALUES ($1)';
      await this.pool.query(recordQuery, [filename]);
      
      await this.pool.query('COMMIT');
      console.log(`   ✅ Completed ${filename}`);
    } catch (error) {
      await this.pool.query('ROLLBACK');
      throw new Error(`Migration ${filename} failed: ${error}`);
    }
  }

  private async verifySetup(): Promise<void> {
    console.log('\n3. Verifying database setup...');

    try {
      // Check tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      const tables = tablesResult.rows.map(row => row.table_name);

      console.log(`   📋 Created tables: ${tables.join(', ')}`);

      // Check sample data
      const sampleQueries = [
        { name: 'shipments', query: 'SELECT COUNT(*) as count FROM shipments' },
        { name: 'search_history', query: 'SELECT COUNT(*) as count FROM search_history' },
        { name: 'api_usage', query: 'SELECT COUNT(*) as count FROM api_usage' },
      ];

      for (const { name, query } of sampleQueries) {
        try {
          const result = await this.pool.query(query);
          const count = result.rows[0].count;
          console.log(`   📊 ${name}: ${count} records`);
        } catch (error) {
          console.log(`   ⚠️  ${name}: table not found or error`);
        }
      }

      // Test functions
      console.log('\n   🔧 Testing database functions...');
      
      try {
        await this.pool.query('SELECT cleanup_expired_shipments()');
        console.log('   ✅ cleanup_expired_shipments() function works');
      } catch (error) {
        console.log('   ❌ cleanup_expired_shipments() function failed');
      }

      try {
        await this.pool.query("SELECT upsert_search_history('TEST123', 'container', 'test-session')");
        console.log('   ✅ upsert_search_history() function works');
      } catch (error) {
        console.log('   ❌ upsert_search_history() function failed');
      }

      // Test views
      try {
        const viewsQuery = `
          SELECT table_name 
          FROM information_schema.views 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `;
        
        const viewsResult = await this.pool.query(viewsQuery);
        const views = viewsResult.rows.map(row => row.table_name);
        
        if (views.length > 0) {
          console.log(`   👁️  Created views: ${views.join(', ')}`);
        }
      } catch (error) {
        console.log('   ⚠️  Could not verify views');
      }

    } catch (error) {
      throw new Error(`Verification failed: ${error}`);
    }
  }

  // Utility method to reset database (for development)
  async reset(): Promise<void> {
    console.log('🔄 Resetting database...');
    
    try {
      // Drop all tables
      const dropTablesQuery = `
        DROP TABLE IF EXISTS schema_migrations CASCADE;
        DROP TABLE IF EXISTS api_usage CASCADE;
        DROP TABLE IF EXISTS search_history CASCADE;
        DROP TABLE IF EXISTS shipments CASCADE;
        DROP VIEW IF EXISTS recent_search_activity CASCADE;
        DROP VIEW IF EXISTS api_usage_summary CASCADE;
      `;
      
      await this.pool.query(dropTablesQuery);
      console.log('   ✅ Dropped existing tables and views');
      
      // Re-run setup
      await this.runMigrations();
      await this.verifySetup();
      
      console.log('✅ Database reset completed');
    } catch (error) {
      throw new Error(`Database reset failed: ${error}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const setup = new DatabaseSetup();

  if (args.includes('--reset')) {
    await setup.reset();
  } else {
    await setup.run();
  }
}

// Run setup if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseSetup };