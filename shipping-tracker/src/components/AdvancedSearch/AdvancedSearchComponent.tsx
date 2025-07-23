import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  BookmarkIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { 
  advancedSearchService
} from '../../services/AdvancedSearchService';
import type { 
  SearchQuery, 
  SearchFilter, 
  SavedSearch, 
  SearchHistory,
  SearchSuggestion
} from '../../services/AdvancedSearchService';
import type { ShipmentTracking } from '../../types';

interface AdvancedSearchComponentProps {
  onSearch: (results: ShipmentTracking[], query: SearchQuery) => void;
  onLoading: (loading: boolean) => void;
  className?: string;
}

export const AdvancedSearchComponent: React.FC<AdvancedSearchComponentProps> = ({
  onSearch,
  onLoading,
  className = ''
}) => {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load initial data
  useEffect(() => {
    loadSavedSearches();
    loadSearchHistory();
  }, []);

  // Update suggestions when search text changes
  useEffect(() => {
    if (searchText.length > 0) {
      const newSuggestions = advancedSearchService.getSearchSuggestions(searchText);
      setSuggestions(newSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchText]);

  const loadSavedSearches = useCallback(() => {
    const searches = advancedSearchService.getSavedSearches();
    setSavedSearches(searches);
  }, []);

  const loadSearchHistory = useCallback(() => {
    const history = advancedSearchService.getSearchHistory();
    setSearchHistory(history);
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim() && filters.filter(f => f.enabled).length === 0) {
      return;
    }

    const query: SearchQuery = {
      text: searchText.trim() || undefined,
      filters: filters.filter(f => f.enabled),
      sortBy: sortBy || undefined,
      sortOrder,
    };

    onLoading(true);
    setShowSuggestions(false);

    try {
      const result = await advancedSearchService.executeSearch(query);
      onSearch(result.results, query);
      
      // Update suggestions with new results
      setSuggestions(result.suggestions);
      
      // Refresh history
      loadSearchHistory();
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      onLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchText(suggestion.value);
    setShowSuggestions(false);
    
    // Auto-search if it's a tracking number
    if (suggestion.type === 'tracking_number') {
      setTimeout(handleSearch, 100);
    }
  };

  const addFilter = () => {
    const availableFilters = advancedSearchService.getAvailableFilters();
    const unusedFilter = availableFilters.find(af => 
      !filters.some(f => f.field === af.field)
    );
    
    if (unusedFilter) {
      const newFilter: SearchFilter = {
        id: Math.random().toString(36).substring(2, 11),
        name: unusedFilter.name,
        type: unusedFilter.type,
        field: unusedFilter.field,
        operator: unusedFilter.operators[0],
        value: '',
        options: unusedFilter.options,
        enabled: true,
      };
      
      setFilters([...filters, newFilter]);
    }
  };

  const updateFilter = (filterId: string, updates: Partial<SearchFilter>) => {
    setFilters(filters.map(filter => 
      filter.id === filterId ? { ...filter, ...updates } : filter
    ));
  };

  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(filter => filter.id !== filterId));
  };

  const saveCurrentSearch = () => {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const query: SearchQuery = {
      text: searchText.trim() || undefined,
      filters: filters.filter(f => f.enabled),
      sortBy: sortBy || undefined,
      sortOrder,
    };

    try {
      advancedSearchService.saveSearch(name, query);
      loadSavedSearches();
      alert('Search saved successfully!');
    } catch (error) {
      console.error('Failed to save search:', error);
      alert('Failed to save search');
    }
  };

  const executeSavedSearch = async (searchId: string) => {
    onLoading(true);
    setShowSavedSearches(false);

    try {
      const result = await advancedSearchService.executeSavedSearch(searchId);
      
      // Update UI with saved search query
      const savedSearch = savedSearches.find(s => s.id === searchId);
      if (savedSearch) {
        setSearchText(savedSearch.query.text || '');
        setFilters(savedSearch.query.filters || []);
        setSortBy(savedSearch.query.sortBy || '');
        setSortOrder(savedSearch.query.sortOrder || 'asc');
      }
      
      onSearch(result.results, savedSearch?.query || { filters: [] });
      loadSearchHistory();
    } catch (error) {
      console.error('Failed to execute saved search:', error);
    } finally {
      onLoading(false);
    }
  };

  const executeHistorySearch = async (historyItem: SearchHistory) => {
    onLoading(true);
    setShowHistory(false);

    try {
      const result = await advancedSearchService.executeSearch(historyItem.query);
      
      // Update UI with history query
      setSearchText(historyItem.query.text || '');
      setFilters(historyItem.query.filters || []);
      setSortBy(historyItem.query.sortBy || '');
      setSortOrder(historyItem.query.sortOrder || 'asc');
      
      onSearch(result.results, historyItem.query);
    } catch (error) {
      console.error('Failed to execute history search:', error);
    } finally {
      onLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters([]);
    setSortBy('');
    setSortOrder('asc');
  };

  const renderFilter = (filter: SearchFilter) => {
    const availableFilters = advancedSearchService.getAvailableFilters();
    const filterConfig = availableFilters.find(af => af.field === filter.field);

    return (
      <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          checked={filter.enabled}
          onChange={(e) => updateFilter(filter.id, { enabled: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        
        <select
          value={filter.field}
          onChange={(e) => {
            const newConfig = availableFilters.find(af => af.field === e.target.value);
            updateFilter(filter.id, {
              field: e.target.value,
              name: newConfig?.name || '',
              type: newConfig?.type || 'text',
              operator: newConfig?.operators[0] || 'equals',
              options: newConfig?.options,
              value: '',
            });
          }}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {availableFilters.map(af => (
            <option key={af.id} value={af.field}>{af.name}</option>
          ))}
        </select>

        <select
          value={filter.operator}
          onChange={(e) => updateFilter(filter.id, { operator: e.target.value as SearchFilter['operator'] })}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {filterConfig?.operators.map(op => (
            <option key={op} value={op}>
              {op.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        {filter.type === 'select' && filter.options ? (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            {filter.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : filter.type === 'date' ? (
          <input
            type="date"
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        ) : filter.type === 'boolean' ? (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value === 'true' })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Enter value..."
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        <button
          onClick={() => removeFilter(filter.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Main Search Bar */}
      <div className="p-4">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter tracking number, container number, or search term..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {suggestion.type.replace('_', ' ')}
                      </span>
                      <span>{suggestion.label}</span>
                      {suggestion.frequency && (
                        <span className="ml-auto text-xs text-gray-400">
                          {suggestion.frequency}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : ''
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BookmarkIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClockIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={saveCurrentSearch}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save Search
              </button>
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {filters.map(renderFilter)}
            
            <button
              onClick={addFilter}
              className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-gray-600"
            >
              <PlusIcon className="h-4 w-4" />
              Add Filter
            </button>
          </div>
          
          {/* Sorting Options */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Sort Results</h4>
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No sorting</option>
                <option value="departureDate">Departure Date</option>
                <option value="arrivalDate">Arrival Date</option>
                <option value="carrier">Carrier</option>
                <option value="status">Status</option>
                <option value="lastUpdated">Last Updated</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches Panel */}
      {showSavedSearches && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Searches</h3>
          {savedSearches.length > 0 ? (
            <div className="space-y-2">
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <h4 className="font-medium text-gray-900">{search.name}</h4>
                    {search.description && (
                      <p className="text-sm text-gray-600">{search.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Used {search.usageCount} times</span>
                      {search.lastUsed && (
                        <span>Last used: {new Date(search.lastUsed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => executeSavedSearch(search.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Execute
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No saved searches yet</p>
          )}
        </div>
      )}

      {/* Search History Panel */}
      {showHistory && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Search History</h3>
            <button
              onClick={() => {
                advancedSearchService.clearSearchHistory();
                loadSearchHistory();
              }}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Clear History
            </button>
          </div>
          {searchHistory.length > 0 ? (
            <div className="space-y-2">
              {searchHistory.map(historyItem => (
                <div key={historyItem.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <div className="flex items-center gap-2">
                      {historyItem.query.text && (
                        <span className="font-medium text-gray-900">"{historyItem.query.text}"</span>
                      )}
                      {historyItem.query.filters.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                          {historyItem.query.filters.length} filters
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{historyItem.resultCount} results</span>
                      <span>{historyItem.executionTime}ms</span>
                      <span>{new Date(historyItem.executedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => executeHistorySearch(historyItem)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Repeat
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No search history yet</p>
          )}
        </div>
      )}
    </div>
  );
};