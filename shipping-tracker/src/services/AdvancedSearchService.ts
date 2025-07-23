import type { ShipmentTracking } from '../types';

export interface SearchFilter {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'range' | 'boolean';
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  options?: Array<{ label: string; value: any }>;
  enabled: boolean;
}

export interface SearchQuery {
  text?: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchSuggestion {
  type: 'tracking_number' | 'carrier' | 'route' | 'container' | 'vessel';
  value: string;
  label: string;
  metadata?: Record<string, any>;
  frequency?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: SearchQuery;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  tags: string[];
  usageCount: number;
  lastUsed?: string;
}

export interface SearchHistory {
  id: string;
  query: SearchQuery;
  resultCount: number;
  executedAt: string;
  executionTime: number;
  userId?: string;
  sessionId: string;
}

export interface BulkTrackingRequest {
  trackingNumbers: string[];
  options: {
    includeHistory: boolean;
    includeVesselInfo: boolean;
    includeContainerDetails: boolean;
    preferredCarriers?: string[];
    timeout?: number;
  };
}

export interface BulkTrackingResult {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  results: Array<{
    trackingNumber: string;
    status: 'success' | 'error' | 'not_found';
    data?: ShipmentTracking;
    error?: string;
  }>;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

class AdvancedSearchService {
  private searchHistory: SearchHistory[] = [];
  private savedSearches: Map<string, SavedSearch> = new Map();
  private searchSuggestions: SearchSuggestion[] = [];
  private bulkRequests: Map<string, BulkTrackingResult> = new Map();
  private readonly MAX_HISTORY_SIZE = 100;
  private readonly MAX_SUGGESTIONS = 50;

  constructor() {
    this.loadSearchData();
    this.initializeDefaultSuggestions();
  }

  /**
   * Execute advanced search
   */
  public async executeSearch(query: SearchQuery, userId?: string, sessionId?: string): Promise<{
    results: ShipmentTracking[];
    totalCount: number;
    executionTime: number;
    suggestions: SearchSuggestion[];
  }> {
    const startTime = Date.now();
    
    try {
      // Build search parameters
      const searchParams = this.buildSearchParams(query);
      
      // Execute search (this would typically call the backend API)
      const results = await this.performSearch(searchParams);
      
      // Apply client-side filtering if needed
      const filteredResults = this.applyFilters(results, query.filters);
      
      // Apply sorting
      const sortedResults = this.applySorting(filteredResults, query.sortBy, query.sortOrder);
      
      // Apply pagination
      const paginatedResults = this.applyPagination(sortedResults, query.limit, query.offset);
      
      const executionTime = Date.now() - startTime;
      
      // Record search history
      this.recordSearchHistory(query, paginatedResults.length, executionTime, userId, sessionId);
      
      // Update suggestions based on search
      this.updateSuggestions(query, paginatedResults);
      
      // Get contextual suggestions
      const suggestions = this.getContextualSuggestions(query);
      
      return {
        results: paginatedResults,
        totalCount: sortedResults.length,
        executionTime,
        suggestions,
      };
    } catch (error: any) {
      console.error('Search execution failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get search suggestions
   */
  public getSearchSuggestions(query: string, type?: SearchSuggestion['type']): SearchSuggestion[] {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return this.getPopularSuggestions(type);
    }
    
    let suggestions = this.searchSuggestions.filter(suggestion => {
      if (type && suggestion.type !== type) return false;
      
      return (
        suggestion.value.toLowerCase().includes(normalizedQuery) ||
        suggestion.label.toLowerCase().includes(normalizedQuery)
      );
    });
    
    // Sort by relevance (frequency and match quality)
    suggestions = suggestions.sort((a, b) => {
      const aFreq = a.frequency || 0;
      const bFreq = b.frequency || 0;
      
      // Exact matches first
      const aExact = a.value.toLowerCase() === normalizedQuery ? 1 : 0;
      const bExact = b.value.toLowerCase() === normalizedQuery ? 1 : 0;
      
      if (aExact !== bExact) return bExact - aExact;
      
      // Then by frequency
      return bFreq - aFreq;
    });
    
    return suggestions.slice(0, 10);
  }

  /**
   * Save search query
   */
  public saveSearch(
    name: string,
    query: SearchQuery,
    userId?: string,
    description?: string,
    tags: string[] = [],
    isPublic: boolean = false
  ): SavedSearch {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const savedSearch: SavedSearch = {
      id,
      name,
      description,
      query,
      isPublic,
      createdAt: now,
      updatedAt: now,
      userId,
      tags,
      usageCount: 0,
    };
    
    this.savedSearches.set(id, savedSearch);
    this.saveSearchData();
    
    return savedSearch;
  }

  /**
   * Get saved searches
   */
  public getSavedSearches(userId?: string, includePublic: boolean = true): SavedSearch[] {
    const searches = Array.from(this.savedSearches.values());
    
    return searches.filter(search => {
      if (search.userId === userId) return true;
      if (includePublic && search.isPublic) return true;
      return false;
    }).sort((a, b) => {
      // Sort by usage count, then by last used, then by created date
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Execute saved search
   */
  public async executeSavedSearch(
    searchId: string,
    userId?: string,
    sessionId?: string
  ): Promise<{
    results: ShipmentTracking[];
    totalCount: number;
    executionTime: number;
    suggestions: SearchSuggestion[];
  }> {
    const savedSearch = this.savedSearches.get(searchId);
    if (!savedSearch) {
      throw new Error('Saved search not found');
    }
    
    // Update usage statistics
    savedSearch.usageCount++;
    savedSearch.lastUsed = new Date().toISOString();
    this.saveSearchData();
    
    return this.executeSearch(savedSearch.query, userId, sessionId);
  }

  /**
   * Delete saved search
   */
  public deleteSavedSearch(searchId: string, userId?: string): boolean {
    const savedSearch = this.savedSearches.get(searchId);
    if (!savedSearch) return false;
    
    // Check permissions
    if (savedSearch.userId && savedSearch.userId !== userId) {
      throw new Error('Permission denied');
    }
    
    this.savedSearches.delete(searchId);
    this.saveSearchData();
    
    return true;
  }

  /**
   * Get search history
   */
  public getSearchHistory(userId?: string, limit: number = 20): SearchHistory[] {
    let history = this.searchHistory;
    
    if (userId) {
      history = history.filter(h => h.userId === userId);
    }
    
    return history
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Clear search history
   */
  public clearSearchHistory(userId?: string): void {
    if (userId) {
      this.searchHistory = this.searchHistory.filter(h => h.userId !== userId);
    } else {
      this.searchHistory = [];
    }
    
    this.saveSearchData();
  }

  /**
   * Start bulk tracking
   */
  public async startBulkTracking(request: BulkTrackingRequest): Promise<BulkTrackingResult> {
    const requestId = this.generateId();
    const now = new Date().toISOString();
    
    const bulkResult: BulkTrackingResult = {
      requestId,
      status: 'pending',
      progress: {
        total: request.trackingNumbers.length,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      results: [],
      startedAt: now,
    };
    
    this.bulkRequests.set(requestId, bulkResult);
    
    // Start processing in background
    this.processBulkTracking(requestId, request);
    
    return bulkResult;
  }

  /**
   * Get bulk tracking status
   */
  public getBulkTrackingStatus(requestId: string): BulkTrackingResult | null {
    return this.bulkRequests.get(requestId) || null;
  }

  /**
   * Cancel bulk tracking
   */
  public cancelBulkTracking(requestId: string): boolean {
    const request = this.bulkRequests.get(requestId);
    if (!request || request.status === 'completed') {
      return false;
    }
    
    request.status = 'failed';
    request.completedAt = new Date().toISOString();
    
    return true;
  }

  /**
   * Get available filters
   */
  public getAvailableFilters(): Array<{
    id: string;
    name: string;
    type: SearchFilter['type'];
    field: string;
    operators: SearchFilter['operator'][];
    options?: Array<{ label: string; value: any }>;
  }> {
    return [
      {
        id: 'carrier',
        name: 'Carrier',
        type: 'select',
        field: 'carrier',
        operators: ['equals', 'in', 'not_in'],
        options: [
          { label: 'Maersk', value: 'maersk' },
          { label: 'MSC', value: 'msc' },
          { label: 'CMA CGM', value: 'cma_cgm' },
          { label: 'COSCO', value: 'cosco' },
          { label: 'Hapag-Lloyd', value: 'hapag_lloyd' },
          { label: 'Evergreen', value: 'evergreen' },
          { label: 'ONE Line', value: 'one_line' },
          { label: 'Yang Ming', value: 'yang_ming' },
        ],
      },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        field: 'status',
        operators: ['equals', 'in', 'not_in'],
        options: [
          { label: 'In Transit', value: 'in_transit' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Delayed', value: 'delayed' },
          { label: 'At Port', value: 'at_port' },
          { label: 'Customs', value: 'customs' },
          { label: 'Exception', value: 'exception' },
        ],
      },
      {
        id: 'origin',
        name: 'Origin Port',
        type: 'text',
        field: 'origin.name',
        operators: ['contains', 'equals', 'starts_with'],
      },
      {
        id: 'destination',
        name: 'Destination Port',
        type: 'text',
        field: 'destination.name',
        operators: ['contains', 'equals', 'starts_with'],
      },
      {
        id: 'departure_date',
        name: 'Departure Date',
        type: 'date',
        field: 'departureDate',
        operators: ['equals', 'greater_than', 'less_than', 'between'],
      },
      {
        id: 'arrival_date',
        name: 'Arrival Date',
        type: 'date',
        field: 'arrivalDate',
        operators: ['equals', 'greater_than', 'less_than', 'between'],
      },
      {
        id: 'vessel_name',
        name: 'Vessel Name',
        type: 'text',
        field: 'vessel.name',
        operators: ['contains', 'equals', 'starts_with'],
      },
      {
        id: 'container_type',
        name: 'Container Type',
        type: 'select',
        field: 'containers.type',
        operators: ['equals', 'in'],
        options: [
          { label: '20ft Standard', value: '20ST' },
          { label: '40ft Standard', value: '40ST' },
          { label: '40ft High Cube', value: '40HC' },
          { label: '45ft High Cube', value: '45HC' },
          { label: '20ft Refrigerated', value: '20RF' },
          { label: '40ft Refrigerated', value: '40RF' },
        ],
      },
      {
        id: 'has_delays',
        name: 'Has Delays',
        type: 'boolean',
        field: 'hasDelays',
        operators: ['equals'],
      },
    ];
  }

  /**
   * Build search parameters
   */
  private buildSearchParams(query: SearchQuery): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (query.text) {
      params.q = query.text;
    }
    
    // Convert filters to API parameters
    query.filters.forEach(filter => {
      if (!filter.enabled || filter.value === undefined || filter.value === '') {
        return;
      }
      
      const paramKey = `filter_${filter.field}`;
      
      switch (filter.operator) {
        case 'equals':
          params[paramKey] = filter.value;
          break;
        case 'contains':
          params[`${paramKey}_contains`] = filter.value;
          break;
        case 'starts_with':
          params[`${paramKey}_starts`] = filter.value;
          break;
        case 'ends_with':
          params[`${paramKey}_ends`] = filter.value;
          break;
        case 'greater_than':
          params[`${paramKey}_gt`] = filter.value;
          break;
        case 'less_than':
          params[`${paramKey}_lt`] = filter.value;
          break;
        case 'between':
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            params[`${paramKey}_gte`] = filter.value[0];
            params[`${paramKey}_lte`] = filter.value[1];
          }
          break;
        case 'in':
          if (Array.isArray(filter.value)) {
            params[`${paramKey}_in`] = filter.value.join(',');
          }
          break;
        case 'not_in':
          if (Array.isArray(filter.value)) {
            params[`${paramKey}_not_in`] = filter.value.join(',');
          }
          break;
      }
    });
    
    if (query.sortBy) {
      params.sort = query.sortBy;
      params.order = query.sortOrder || 'asc';
    }
    
    if (query.limit) {
      params.limit = query.limit;
    }
    
    if (query.offset) {
      params.offset = query.offset;
    }
    
    return params;
  }

  /**
   * Perform search (mock implementation)
   */
  private async performSearch(params: Record<string, any>): Promise<ShipmentTracking[]> {
    // This would typically make an API call to the backend
    // For now, return mock data
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
    
    // Mock search results
    const mockResults: ShipmentTracking[] = [
      {
        trackingNumber: 'MAEU123456789',
        carrier: 'Maersk',
        status: 'In Transit',
        origin: { name: 'Shanghai, China', code: 'CNSHA' },
        destination: { name: 'Los Angeles, USA', code: 'USLAX' },
        departureDate: '2024-01-15T08:00:00Z',
        arrivalDate: '2024-01-30T16:00:00Z',
        vessel: { name: 'Maersk Sealand', imo: 'IMO1234567' },
        containers: [
          { number: 'MAEU1234567', type: '40HC', size: '40', carrier: 'Maersk' }
        ],
        events: [
          {
            timestamp: '2024-01-15T08:00:00Z',
            location: 'Shanghai Port',
            status: 'Departed',
            description: 'Container departed from Shanghai Port'
          }
        ],
        lastUpdated: '2024-01-20T12:00:00Z'
      }
    ];
    
    return mockResults;
  }

  /**
   * Apply filters to results
   */
  private applyFilters(results: ShipmentTracking[], filters: SearchFilter[]): ShipmentTracking[] {
    return results.filter(result => {
      return filters.every(filter => {
        if (!filter.enabled) return true;
        
        const value = this.getNestedValue(result, filter.field);
        return this.evaluateFilter(value, filter);
      });
    });
  }

  /**
   * Apply sorting to results
   */
  private applySorting(
    results: ShipmentTracking[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): ShipmentTracking[] {
    if (!sortBy) return results;
    
    return [...results].sort((a, b) => {
      const aValue = this.getNestedValue(a, sortBy);
      const bValue = this.getNestedValue(b, sortBy);
      
      let comparison = 0;
      
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Apply pagination to results
   */
  private applyPagination(
    results: ShipmentTracking[],
    limit?: number,
    offset?: number
  ): ShipmentTracking[] {
    if (!limit) return results;
    
    const start = offset || 0;
    const end = start + limit;
    
    return results.slice(start, end);
  }

  /**
   * Get nested object value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        if (Array.isArray(current)) {
          // For arrays, check if any item has the property
          return current.find(item => item && item[key] !== undefined)?.[key];
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(value: any, filter: SearchFilter): boolean {
    if (value === undefined || value === null) return false;
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'greater_than':
        return value > filter.value;
      case 'less_than':
        return value < filter.value;
      case 'between':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          return value >= filter.value[0] && value <= filter.value[1];
        }
        return false;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return true;
    }
  }

  /**
   * Record search history
   */
  private recordSearchHistory(
    query: SearchQuery,
    resultCount: number,
    executionTime: number,
    userId?: string,
    sessionId?: string
  ): void {
    const historyEntry: SearchHistory = {
      id: this.generateId(),
      query,
      resultCount,
      executedAt: new Date().toISOString(),
      executionTime,
      userId,
      sessionId: sessionId || 'anonymous',
    };
    
    this.searchHistory.unshift(historyEntry);
    
    // Keep only recent history
    if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_SIZE);
    }
    
    this.saveSearchData();
  }

  /**
   * Update suggestions based on search
   */
  private updateSuggestions(query: SearchQuery, results: ShipmentTracking[]): void {
    // Add text query as suggestion
    if (query.text) {
      this.addOrUpdateSuggestion({
        type: 'tracking_number',
        value: query.text,
        label: query.text,
      });
    }
    
    // Add carriers from results
    results.forEach(result => {
      if (result.carrier) {
        this.addOrUpdateSuggestion({
          type: 'carrier',
          value: result.carrier,
          label: result.carrier,
        });
      }
      
      if (result.origin?.name) {
        this.addOrUpdateSuggestion({
          type: 'route',
          value: result.origin.name,
          label: result.origin.name,
        });
      }
      
      if (result.destination?.name) {
        this.addOrUpdateSuggestion({
          type: 'route',
          value: result.destination.name,
          label: result.destination.name,
        });
      }
      
      if (result.vessel?.name) {
        this.addOrUpdateSuggestion({
          type: 'vessel',
          value: result.vessel.name,
          label: result.vessel.name,
        });
      }
    });
  }

  /**
   * Add or update suggestion
   */
  private addOrUpdateSuggestion(suggestion: Omit<SearchSuggestion, 'frequency'>): void {
    const existing = this.searchSuggestions.find(
      s => s.type === suggestion.type && s.value === suggestion.value
    );
    
    if (existing) {
      existing.frequency = (existing.frequency || 0) + 1;
    } else {
      this.searchSuggestions.push({
        ...suggestion,
        frequency: 1,
      });
    }
    
    // Keep only top suggestions
    if (this.searchSuggestions.length > this.MAX_SUGGESTIONS) {
      this.searchSuggestions.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
      this.searchSuggestions = this.searchSuggestions.slice(0, this.MAX_SUGGESTIONS);
    }
  }

  /**
   * Get contextual suggestions
   */
  private getContextualSuggestions(query: SearchQuery): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    
    // Suggest related carriers
    if (query.text) {
      const relatedCarriers = this.searchSuggestions
        .filter(s => s.type === 'carrier')
        .slice(0, 3);
      suggestions.push(...relatedCarriers);
    }
    
    // Suggest popular routes
    const popularRoutes = this.searchSuggestions
      .filter(s => s.type === 'route')
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, 5);
    suggestions.push(...popularRoutes);
    
    return suggestions;
  }

  /**
   * Get popular suggestions
   */
  private getPopularSuggestions(type?: SearchSuggestion['type']): SearchSuggestion[] {
    let suggestions = this.searchSuggestions;
    
    if (type) {
      suggestions = suggestions.filter(s => s.type === type);
    }
    
    return suggestions
      .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
      .slice(0, 10);
  }

  /**
   * Process bulk tracking
   */
  private async processBulkTracking(requestId: string, request: BulkTrackingRequest): Promise<void> {
    const bulkResult = this.bulkRequests.get(requestId);
    if (!bulkResult) return;
    
    bulkResult.status = 'processing';
    
    const batchSize = 5; // Process 5 at a time
    const batches = this.chunkArray(request.trackingNumbers, batchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (trackingNumber) => {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
          
          // Mock result
          const mockResult: ShipmentTracking = {
            trackingNumber,
            carrier: 'Mock Carrier',
            status: 'In Transit',
            events: [],
            lastUpdated: new Date().toISOString(),
          };
          
          bulkResult.results.push({
            trackingNumber,
            status: 'success',
            data: mockResult,
          });
          
          bulkResult.progress.completed++;
        } catch (error: any) {
          bulkResult.results.push({
            trackingNumber,
            status: 'error',
            error: error.message,
          });
          
          bulkResult.progress.failed++;
        }
        
        // Update progress
        bulkResult.progress.percentage = 
          ((bulkResult.progress.completed + bulkResult.progress.failed) / bulkResult.progress.total) * 100;
      });
      
      await Promise.all(batchPromises);
      
      // Check if cancelled
      if (bulkResult.status === 'failed') {
        return;
      }
    }
    
    bulkResult.status = 'completed';
    bulkResult.completedAt = new Date().toISOString();
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Initialize default suggestions
   */
  private initializeDefaultSuggestions(): void {
    const defaultSuggestions: SearchSuggestion[] = [
      { type: 'carrier', value: 'maersk', label: 'Maersk', frequency: 10 },
      { type: 'carrier', value: 'msc', label: 'MSC', frequency: 8 },
      { type: 'carrier', value: 'cma_cgm', label: 'CMA CGM', frequency: 6 },
      { type: 'route', value: 'Shanghai', label: 'Shanghai, China', frequency: 15 },
      { type: 'route', value: 'Los Angeles', label: 'Los Angeles, USA', frequency: 12 },
      { type: 'route', value: 'Rotterdam', label: 'Rotterdam, Netherlands', frequency: 10 },
    ];
    
    this.searchSuggestions = defaultSuggestions;
  }

  /**
   * Load search data from storage
   */
  private loadSearchData(): void {
    try {
      const savedData = localStorage.getItem('advancedSearchData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        if (data.searchHistory) {
          this.searchHistory = data.searchHistory;
        }
        
        if (data.savedSearches) {
          data.savedSearches.forEach((search: SavedSearch) => {
            this.savedSearches.set(search.id, search);
          });
        }
        
        if (data.searchSuggestions) {
          this.searchSuggestions = data.searchSuggestions;
        }
      }
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  }

  /**
   * Save search data to storage
   */
  private saveSearchData(): void {
    try {
      const data = {
        searchHistory: this.searchHistory,
        savedSearches: Array.from(this.savedSearches.values()),
        searchSuggestions: this.searchSuggestions,
      };
      
      localStorage.setItem('advancedSearchData', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save search data:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}

export const advancedSearchService = new AdvancedSearchService();