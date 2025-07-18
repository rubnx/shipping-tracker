"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const environment_1 = require("./environment");
// Database configuration
const dbConfig = {
    connectionString: environment_1.config.database.url,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    ssl: environment_1.config.server.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
};
// Create connection pool
exports.pool = new pg_1.Pool(dbConfig);
// Handle pool errors
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Database connection test
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection established successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
// Graceful shutdown
const closePool = async () => {
    try {
        await exports.pool.end();
        console.log('🔌 Database pool closed');
    }
    catch (error) {
        console.error('Error closing database pool:', error);
    }
};
exports.closePool = closePool;
// Handle process termination
process.on('SIGINT', exports.closePool);
process.on('SIGTERM', exports.closePool);
//# sourceMappingURL=database.js.map