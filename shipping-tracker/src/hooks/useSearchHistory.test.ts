import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { SearchHistoryItem } from '../types';
import { useSearchHistory } from './useSearchHistory';
import { searchHistoryUtils } from '../utils';

// Mock the searchHistoryUtils
vi.mock('../utils', () => ({
  searchHistoryUtils: {
    isStorageAvailable: vi.fn(),
    getHistory: vi.fn(),
    addToHistory: vi.fn(),
    removeFromHistory: vi.fn(),
    clearHistory: vi.fn(),
    getFilteredHistory: vi.fn(),
  },
}));

const mockSearchHistoryUtils = searchHistoryUtils as any;

describe('useSearchHistory', () => {
  const mockHistoryItems: SearchHistoryItem[] = [
    {
      trackingNumber: 'TEST1234567',
      trackingType: 'container',
      searchCount: 2,
      lastSearched: new Date('2024-01-01T10:00:00Z'),
      carrier: 'Maersk',
    },
    {
      trackingNumber: 'BOOK123456',
      trackingType: 'booking',
      searchCount: 1,
      lastSearched: new Date('2024-01-01T09:00:00Z'),
      carrier: 'CMA CGM',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchHistoryUtils.isStorageAvailable.mockReturnValue(true);
    mockSearchHistoryUtils.getHistory.mockReturnValue(mockHistoryItems);
    mockSearchHistoryUtils.getFilteredHistory.mockImplementation((query: string) => {
      if (!query) return mockHistoryItems;
      return mockHistoryItems.filter(item => 
        item.trackingNumber.toLowerCase().includes(query.toLowerCase())
      );
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty history when storage is not available', () => {
      mockSearchHistoryUtils.isStorageAvailable.mockReturnValue(false);
      
      const { result } = renderHook(() => useSearchHistory());
      
      expect(result.current.history).toEqual([]);
      expect(result.current.isStorageAvailable).toBe(false);
    });

    it('should initialize with history from storage when available', () => {
      const { result } = renderHook(() => useSearchHistory());
      
      expect(result.current.history).toEqual(mockHistoryItems);
      expect(result.current.isStorageAvailable).toBe(true);
      expect(mockSearchHistoryUtils.getHistory).toHaveBeenCalledOnce();
    });
  });

  describe('addToHistory', () => {
    it('should add item to history when storage is available', () => {
      const updatedHistory = [
        {
          trackingNumber: 'NEW1234567',
          trackingType: 'container' as const,
          searchCount: 1,
          lastSearched: new Date(),
          carrier: 'Hapag-Lloyd',
        },
        ...mockHistoryItems,
      ];

      const { result } = renderHook(() => useSearchHistory());

      // Mock the second call to getHistory (after addToHistory)
      mockSearchHistoryUtils.getHistory.mockReturnValueOnce(updatedHistory);

      const newItem = {
        trackingNumber: 'NEW1234567',
        trackingType: 'container' as const,
        carrier: 'Hapag-Lloyd',
      };

      act(() => {
        result.current.addToHistory(newItem);
      });

      expect(mockSearchHistoryUtils.addToHistory).toHaveBeenCalledWith(newItem);
      expect(result.current.history).toEqual(updatedHistory);
    });

    it('should not add item when storage is not available', () => {
      mockSearchHistoryUtils.isStorageAvailable.mockReturnValue(false);
      
      const { result } = renderHook(() => useSearchHistory());

      const newItem = {
        trackingNumber: 'NEW1234567',
        trackingType: 'container' as const,
      };

      act(() => {
        result.current.addToHistory(newItem);
      });

      expect(mockSearchHistoryUtils.addToHistory).not.toHaveBeenCalled();
    });
  });

  describe('removeFromHistory', () => {
    it('should remove item from history when storage is available', () => {
      const updatedHistory = mockHistoryItems.filter(
        item => item.trackingNumber !== 'TEST1234567'
      );

      const { result } = renderHook(() => useSearchHistory());

      // Mock the second call to getHistory (after removeFromHistory)
      mockSearchHistoryUtils.getHistory.mockReturnValueOnce(updatedHistory);

      act(() => {
        result.current.removeFromHistory('TEST1234567');
      });

      expect(mockSearchHistoryUtils.removeFromHistory).toHaveBeenCalledWith('TEST1234567');
      expect(result.current.history).toEqual(updatedHistory);
    });

    it('should not remove item when storage is not available', () => {
      mockSearchHistoryUtils.isStorageAvailable.mockReturnValue(false);
      
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.removeFromHistory('TEST1234567');
      });

      expect(mockSearchHistoryUtils.removeFromHistory).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('should clear history when storage is available', () => {
      mockSearchHistoryUtils.getHistory.mockReturnValueOnce([]);

      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.clearHistory();
      });

      expect(mockSearchHistoryUtils.clearHistory).toHaveBeenCalledOnce();
      expect(result.current.history).toEqual([]);
    });

    it('should not clear history when storage is not available', () => {
      mockSearchHistoryUtils.isStorageAvailable.mockReturnValue(false);
      
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.clearHistory();
      });

      expect(mockSearchHistoryUtils.clearHistory).not.toHaveBeenCalled();
    });
  });

  describe('getFilteredHistory', () => {
    it('should return filtered history based on query', () => {
      const { result } = renderHook(() => useSearchHistory());

      const filtered = result.current.getFilteredHistory('TEST');
      
      expect(mockSearchHistoryUtils.getFilteredHistory).toHaveBeenCalledWith('TEST');
      expect(filtered).toEqual([mockHistoryItems[0]]); // Only TEST1234567
    });

    it('should return all history when query is empty', () => {
      const { result } = renderHook(() => useSearchHistory());

      const filtered = result.current.getFilteredHistory('');
      
      expect(mockSearchHistoryUtils.getFilteredHistory).toHaveBeenCalledWith('');
      expect(filtered).toEqual(mockHistoryItems);
    });
  });

  describe('hook stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useSearchHistory());

      const initialFunctions = {
        addToHistory: result.current.addToHistory,
        removeFromHistory: result.current.removeFromHistory,
        clearHistory: result.current.clearHistory,
        getFilteredHistory: result.current.getFilteredHistory,
      };

      rerender();

      expect(result.current.addToHistory).toBe(initialFunctions.addToHistory);
      expect(result.current.removeFromHistory).toBe(initialFunctions.removeFromHistory);
      expect(result.current.clearHistory).toBe(initialFunctions.clearHistory);
      expect(result.current.getFilteredHistory).toBe(initialFunctions.getFilteredHistory);
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', () => {
      mockSearchHistoryUtils.getHistory.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => renderHook(() => useSearchHistory())).not.toThrow();
    });

    it('should handle add operation errors gracefully', () => {
      mockSearchHistoryUtils.addToHistory.mockImplementation(() => {
        throw new Error('Add error');
      });

      const { result } = renderHook(() => useSearchHistory());

      const newItem = {
        trackingNumber: 'NEW1234567',
        trackingType: 'container' as const,
      };

      // Should not throw
      expect(() => {
        act(() => {
          result.current.addToHistory(newItem);
        });
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      let currentHistory = [...mockHistoryItems];
      
      mockSearchHistoryUtils.getHistory.mockImplementation(() => currentHistory);
      mockSearchHistoryUtils.addToHistory.mockImplementation((item: any) => {
        const newItem = {
          ...item,
          searchCount: 1,
          lastSearched: new Date(),
        };
        currentHistory = [newItem, ...currentHistory];
      });
      mockSearchHistoryUtils.removeFromHistory.mockImplementation((trackingNumber: string) => {
        currentHistory = currentHistory.filter(item => item.trackingNumber !== trackingNumber);
      });

      const { result } = renderHook(() => useSearchHistory());

      // Add new item
      act(() => {
        result.current.addToHistory({
          trackingNumber: 'NEW1234567',
          trackingType: 'container',
          carrier: 'MSC',
        });
      });

      expect(result.current.history).toHaveLength(3);

      // Remove an item
      act(() => {
        result.current.removeFromHistory('TEST1234567');
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history.find(item => item.trackingNumber === 'TEST1234567')).toBeUndefined();
    });
  });
});