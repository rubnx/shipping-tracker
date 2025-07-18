"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackLastMigration = exports.runMigrations = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
// Create migrations table to track applied migrations
const createMigrationsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
    await database_1.pool.query(query);
};
// Get list of applied migrations
const getAppliedMigrations = async () => {
    const result = await database_1.pool.query('SELECT id FROM migrations ORDER BY applied_at');
    return result.rows.map(row => row.id);
};
// Load migration files
const loadMigrations = () => {
    const migrationsDir = (0, path_1.join)(__dirname, 'migrations');
    const migrations = [];
    // For now, we'll manually list migrations. In a real app, you'd scan the directory
    const migrationFiles = ['001_initial_schema.sql'];
    for (const filename of migrationFiles) {
        const id = filename.replace('.sql', '');
        const filepath = (0, path_1.join)(migrationsDir, filename);
        const sql = (0, fs_1.readFileSync)(filepath, 'utf8');
        migrations.push({ id, filename, sql });
    }
    return migrations;
};
// Apply a single migration
const applyMigration = async (migration) => {
    const client = await database_1.pool.connect();
    try {
        await client.query('BEGIN');
        // Execute migration SQL
        await client.query(migration.sql);
        // Record migration as applied
        await client.query('INSERT INTO migrations (id, filename) VALUES ($1, $2)', [migration.id, migration.filename]);
        await client.query('COMMIT');
        console.log(`✅ Applied migration: ${migration.filename}`);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${migration.filename}:`, error);
        throw error;
    }
    finally {
        client.release();
    }
};
// Run all pending migrations
const runMigrations = async () => {
    try {
        console.log('🔄 Starting database migrations...');
        // Create migrations table if it doesn't exist
        await createMigrationsTable();
        // Get applied migrations
        const appliedMigrations = await getAppliedMigrations();
        // Load all migrations
        const allMigrations = loadMigrations();
        // Find pending migrations
        const pendingMigrations = allMigrations.filter(migration => !appliedMigrations.includes(migration.id));
        if (pendingMigrations.length === 0) {
            console.log('✅ No pending migrations');
            return;
        }
        console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);
        // Apply each pending migration
        for (const migration of pendingMigrations) {
            await applyMigration(migration);
        }
        console.log('✅ All migrations completed successfully');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};
exports.runMigrations = runMigrations;
// Rollback last migration (for development)
const rollbackLastMigration = async () => {
    try {
        const result = await database_1.pool.query('SELECT id, filename FROM migrations ORDER BY applied_at DESC LIMIT 1');
        if (result.rows.length === 0) {
            console.log('No migrations to rollback');
            return;
        }
        const lastMigration = result.rows[0];
        // Remove from migrations table
        await database_1.pool.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
        console.log(`⏪ Rolled back migration: ${lastMigration.filename}`);
        console.log('⚠️  Note: You may need to manually undo schema changes');
    }
    catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
};
exports.rollbackLastMigration = rollbackLastMigration;
//# sourceMappingURL=migrator.js.map