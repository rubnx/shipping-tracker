"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchHistoryRepository = void 0;
const database_1 = require("../config/database");
class SearchHistoryRepository {
    constructor(dbPool = database_1.pool) {
        this.pool = dbPool;
    }
    // Add or update search history
    async upsertSearch(data) {
        const query = `SELECT upsert_search_history($1, $2, $3)`;
        const values = [
            data.tracking_number,
            data.tracking_type,
            data.user_session
        ];
        try {
            await this.pool.query(query, values);
            // Fetch the updated record
            const selectQuery = `
        SELECT * FROM search_history 
        WHERE tracking_number = $1 AND user_session = $2
      `;
            const result = await this.pool.query(selectQuery, [data.tracking_number, data.user_session]);
            return result.rows[0];
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Get search history for a user session
    async getByUserSession(userSession, limit = 10) {
        const query = `
      SELECT * FROM search_history 
      WHERE user_session = $1 
      ORDER BY last_searched DESC 
      LIMIT $2
    `;
        try {
            const result = await this.pool.query(query, [userSession, limit]);
            return result.rows;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Get recent searches across all sessions
    async getRecentSearches(limit = 20) {
        const query = `
      SELECT * FROM search_history 
      ORDER BY last_searched DESC 
      LIMIT $1
    `;
        try {
            const result = await this.pool.query(query, [limit]);
            return result.rows;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Get popular tracking numbers (most searched)
    async getPopularSearches(limit = 10) {
        const query = `
      SELECT * FROM search_history 
      ORDER BY search_count DESC, last_searched DESC 
      LIMIT $1
    `;
        try {
            const result = await this.pool.query(query, [limit]);
            return result.rows;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Find search history by tracking number
    async findByTrackingNumber(trackingNumber) {
        const query = `
      SELECT * FROM search_history 
      WHERE tracking_number = $1 
      ORDER BY last_searched DESC
    `;
        try {
            const result = await this.pool.query(query, [trackingNumber]);
            return result.rows;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Delete search history by ID
    async delete(id) {
        const query = `DELETE FROM search_history WHERE id = $1`;
        try {
            const result = await this.pool.query(query, [id]);
            return result.rowCount > 0;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Delete search history for a user session
    async deleteByUserSession(userSession) {
        const query = `DELETE FROM search_history WHERE user_session = $1`;
        try {
            const result = await this.pool.query(query, [userSession]);
            return result.rowCount || 0;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Clean up old search history (older than specified days)
    async cleanupOldHistory(daysOld = 30) {
        const query = `
      DELETE FROM search_history 
      WHERE last_searched < NOW() - INTERVAL '${daysOld} days'
    `;
        try {
            const result = await this.pool.query(query);
            return result.rowCount || 0;
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Get search statistics
    async getStats() {
        const queries = [
            'SELECT SUM(search_count) as total_searches FROM search_history',
            'SELECT COUNT(DISTINCT tracking_number) as unique_numbers FROM search_history',
            'SELECT COUNT(DISTINCT user_session) as unique_sessions FROM search_history WHERE user_session IS NOT NULL',
            `SELECT tracking_number, SUM(search_count) as total_count 
       FROM search_history 
       GROUP BY tracking_number 
       ORDER BY total_count DESC 
       LIMIT 5`
        ];
        try {
            const [totalResult, numbersResult, sessionsResult, topResult] = await Promise.all(queries.map(query => this.pool.query(query)));
            const totalSearches = parseInt(totalResult.rows[0].total_searches || '0');
            const uniqueSessions = parseInt(sessionsResult.rows[0].unique_sessions || '0');
            return {
                totalSearches,
                uniqueTrackingNumbers: parseInt(numbersResult.rows[0].unique_numbers || '0'),
                uniqueSessions,
                averageSearchesPerSession: uniqueSessions > 0 ? totalSearches / uniqueSessions : 0,
                topSearchedNumbers: topResult.rows.map(row => ({
                    tracking_number: row.tracking_number,
                    search_count: parseInt(row.total_count)
                }))
            };
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Get search suggestions based on partial input
    async getSearchSuggestions(partialInput, userSession, limit = 5) {
        let query = `
      SELECT DISTINCT tracking_number 
      FROM search_history 
      WHERE tracking_number ILIKE $1
    `;
        const values = [`${partialInput}%`];
        if (userSession) {
            query += ` AND user_session = $2`;
            values.push(userSession);
        }
        query += ` ORDER BY tracking_number LIMIT $${values.length + 1}`;
        values.push(limit);
        try {
            const result = await this.pool.query(query, values);
            return result.rows.map(row => row.tracking_number);
        }
        catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
    // Handle database errors
    handleDatabaseError(error) {
        const dbError = new Error(error.message);
        dbError.code = error.code;
        dbError.detail = error.detail;
        dbError.constraint = error.constraint;
        dbError.name = 'DatabaseError';
        return dbError;
    }
}
exports.SearchHistoryRepository = SearchHistoryRepository;
//# sourceMappingURL=SearchHistoryRepository.js.map