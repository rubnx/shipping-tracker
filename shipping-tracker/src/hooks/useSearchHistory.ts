import { useState, useEffect, useCallback } from 'react';
import type { SearchHistoryItem } from '../types';
import { searchHistoryUtils } from '../utils';

export interface UseSearchHistoryReturn {
  history: SearchHistoryItem[];
  addToHistory: (item: Omit<SearchHistoryItem, 'searchCount' | 'lastSearched'>) => void;
  removeFromHistory: (trackingNumber: string) => void;
  clearHistory: () => void;
  getFilteredHistory: (query: string) => SearchHistoryItem[];
  isStorageAvailable: boolean;
}

/**
 * Custom hook for managing search history
 */
export const useSearchHistory = (): UseSearchHistoryReturn => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isStorageAvailable, setIsStorageAvailable] = useState(false);

  // Initialize history and check storage availability
  useEffect(() => {
    const storageAvailable = searchHistoryUtils.isStorageAvailable();
    setIsStorageAvailable(storageAvailable);
    
    if (storageAvailable) {
      try {
        const initialHistory = searchHistoryUtils.getHistory();
        setHistory(initialHistory);
      } catch (error) {
        // Handle initialization errors gracefully
        console.warn('Failed to load search history:', error);
        setHistory([]);
      }
    }
  }, []);

  // Add item to history
  const addToHistory = useCallback((item: Omit<SearchHistoryItem, 'searchCount' | 'lastSearched'>) => {
    if (!isStorageAvailable) return;
    
    try {
      searchHistoryUtils.addToHistory(item);
      const updatedHistory = searchHistoryUtils.getHistory();
      setHistory(updatedHistory);
    } catch (error) {
      console.warn('Failed to add item to search history:', error);
    }
  }, [isStorageAvailable]);

  // Remove item from history
  const removeFromHistory = useCallback((trackingNumber: string) => {
    if (!isStorageAvailable) return;
    
    try {
      searchHistoryUtils.removeFromHistory(trackingNumber);
      const updatedHistory = searchHistoryUtils.getHistory();
      setHistory(updatedHistory);
    } catch (error) {
      console.warn('Failed to remove item from search history:', error);
    }
  }, [isStorageAvailable]);

  // Clear all history
  const clearHistory = useCallback(() => {
    if (!isStorageAvailable) return;
    
    try {
      searchHistoryUtils.clearHistory();
      setHistory([]);
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, [isStorageAvailable]);

  // Get filtered history
  const getFilteredHistory = useCallback((query: string): SearchHistoryItem[] => {
    return searchHistoryUtils.getFilteredHistory(query);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getFilteredHistory,
    isStorageAvailable,
  };
};

export default useSearchHistory;