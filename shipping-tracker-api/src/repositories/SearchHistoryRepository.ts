import { Pool, QueryResult } from 'pg';
import { pool } from '../config/database';
import { 
  SearchHistoryRecord, 
  SearchHistoryData, 
  TrackingType,
  DatabaseError 
} from '../types';

export class SearchHistoryRepository {
  private pool: Pool;

  constructor(dbPool: Pool = pool) {
    this.pool = dbPool;
  }

  // Add or update search history
  async upsertSearch(data: SearchHistoryData): Promise<SearchHistoryRecord> {
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
      const result: QueryResult<SearchHistoryRecord> = await this.pool.query(
        selectQuery, 
        [data.tracking_number, data.user_session]
      );
      
      return result.rows[0];
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get search history for a user session
  async getByUserSession(
    userSession: string, 
    limit: number = 10
  ): Promise<SearchHistoryRecord[]> {
    const query = `
      SELECT * FROM search_history 
      WHERE user_session = $1 
      ORDER BY last_searched DESC 
      LIMIT $2
    `;

    try {
      const result: QueryResult<SearchHistoryRecord> = await this.pool.query(
        query, 
        [userSession, limit]
      );
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get recent searches across all sessions
  async getRecentSearches(limit: number = 20): Promise<SearchHistoryRecord[]> {
    const query = `
      SELECT * FROM search_history 
      ORDER BY last_searched DESC 
      LIMIT $1
    `;

    try {
      const result: QueryResult<SearchHistoryRecord> = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get popular tracking numbers (most searched)
  async getPopularSearches(limit: number = 10): Promise<SearchHistoryRecord[]> {
    const query = `
      SELECT * FROM search_history 
      ORDER BY search_count DESC, last_searched DESC 
      LIMIT $1
    `;

    try {
      const result: QueryResult<SearchHistoryRecord> = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Find search history by tracking number
  async findByTrackingNumber(trackingNumber: string): Promise<SearchHistoryRecord[]> {
    const query = `
      SELECT * FROM search_history 
      WHERE tracking_number = $1 
      ORDER BY last_searched DESC
    `;

    try {
      const result: QueryResult<SearchHistoryRecord> = await this.pool.query(
        query, 
        [trackingNumber]
      );
      return result.rows;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Delete search history by ID
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM search_history WHERE id = $1`;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rowCount! > 0;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Delete search history for a user session
  async deleteByUserSession(userSession: string): Promise<number> {
    const query = `DELETE FROM search_history WHERE user_session = $1`;

    try {
      const result = await this.pool.query(query, [userSession]);
      return result.rowCount || 0;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Clean up old search history (older than specified days)
  async cleanupOldHistory(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM search_history 
      WHERE last_searched < NOW() - INTERVAL '${daysOld} days'
    `;

    try {
      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get search statistics
  async getStats(): Promise<{
    totalSearches: number;
    uniqueTrackingNumbers: number;
    uniqueSessions: number;
    averageSearchesPerSession: number;
    topSearchedNumbers: Array<{ tracking_number: string; search_count: number }>;
  }> {
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
      const [totalResult, numbersResult, sessionsResult, topResult] = await Promise.all(
        queries.map(query => this.pool.query(query))
      );

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
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Get search suggestions based on partial input
  async getSearchSuggestions(
    partialInput: string, 
    userSession?: string, 
    limit: number = 5
  ): Promise<string[]> {
    let query = `
      SELECT DISTINCT tracking_number 
      FROM search_history 
      WHERE tracking_number ILIKE $1
    `;
    const values: any[] = [`${partialInput}%`];

    if (userSession) {
      query += ` AND user_session = $2`;
      values.push(userSession);
    }

    query += ` ORDER BY tracking_number LIMIT $${values.length + 1}`;
    values.push(limit);

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => row.tracking_number);
    } catch (error: any) {
      throw this.handleDatabaseError(error);
    }
  }

  // Handle database errors
  private handleDatabaseError(error: any): DatabaseError {
    const dbError = new Error(error.message) as DatabaseError;
    dbError.code = error.code;
    dbError.detail = error.detail;
    dbError.constraint = error.constraint;
    dbError.name = 'DatabaseError';
    return dbError;
  }
}