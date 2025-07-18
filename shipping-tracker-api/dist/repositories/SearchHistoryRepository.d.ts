import { Pool } from 'pg';
import { SearchHistoryRecord, SearchHistoryData } from '../types';
export declare class SearchHistoryRepository {
    private pool;
    constructor(dbPool?: Pool);
    upsertSearch(data: SearchHistoryData): Promise<SearchHistoryRecord>;
    getByUserSession(userSession: string, limit?: number): Promise<SearchHistoryRecord[]>;
    getRecentSearches(limit?: number): Promise<SearchHistoryRecord[]>;
    getPopularSearches(limit?: number): Promise<SearchHistoryRecord[]>;
    findByTrackingNumber(trackingNumber: string): Promise<SearchHistoryRecord[]>;
    delete(id: string): Promise<boolean>;
    deleteByUserSession(userSession: string): Promise<number>;
    cleanupOldHistory(daysOld?: number): Promise<number>;
    getStats(): Promise<{
        totalSearches: number;
        uniqueTrackingNumbers: number;
        uniqueSessions: number;
        averageSearchesPerSession: number;
        topSearchedNumbers: Array<{
            tracking_number: string;
            search_count: number;
        }>;
    }>;
    getSearchSuggestions(partialInput: string, userSession?: string, limit?: number): Promise<string[]>;
    private handleDatabaseError;
}
//# sourceMappingURL=SearchHistoryRepository.d.ts.map