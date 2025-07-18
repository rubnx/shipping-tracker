#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationScript = runMigrationScript;
const migrator_1 = require("../database/migrator");
const database_1 = require("../config/database");
const environment_1 = require("../config/environment");
async function runMigrationScript() {
    try {
        console.log('🔧 Starting database migration script...\n');
        // Validate environment
        (0, environment_1.validateEnvironment)();
        // Test database connection
        const connected = await (0, database_1.testConnection)();
        if (!connected) {
            console.error('❌ Cannot connect to database. Please check your DATABASE_URL.');
            process.exit(1);
        }
        // Run migrations
        await (0, migrator_1.runMigrations)();
        console.log('\n✅ Migration script completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    }
    finally {
        await (0, database_1.closePool)();
    }
}
// Run if called directly
if (require.main === module) {
    runMigrationScript();
}
//# sourceMappingURL=migrate.js.map