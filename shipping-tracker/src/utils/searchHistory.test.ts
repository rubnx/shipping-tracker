import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SearchHistoryItem } from '../types';
import { searchHistoryUtils } from './index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('searchHistoryUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('getHistory', () => {
    it('should return empty array when no history exists', () => {
      const history = searchHistoryUtils.getHistory();
      expect(history).toEqual([]);
    });

    it('should return parsed history with Date objects', () => {
      const mockHistory: SearchHistoryItem[] = [
        {
          trackingNumber: 'TEST1234567',
          trackingType: 'container',
          searchCount: 2,
          lastSearched: new Date('2024-01-01T10:00:00Z'),
          carrier: 'Maersk',
        },
      ];

      localStorageMock.setItem('shipping-search-history', JSON.stringify(mockHistory));
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].trackingNumber).toBe('TEST1234567');
      expect(history[0].lastSearched).toBeInstanceOf(Date);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('shipping-search-history', 'invalid-json');
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('addToHistory', () => {
    it('should add new item to empty history', () => {
      const newItem = {
        trackingNumber: 'TEST1234567',
        trackingType: 'container' as const,
        carrier: 'Maersk',
      };

      searchHistoryUtils.addToHistory(newItem);
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].trackingNumber).toBe('TEST1234567');
      expect(history[0].searchCount).toBe(1);
      expect(history[0].lastSearched).toBeInstanceOf(Date);
    });

    it('should update existing item and move to front', () => {
      // Add initial item
      const initialItem = {
        trackingNumber: 'TEST1234567',
        trackingType: 'container' as const,
        carrier: 'Maersk',
      };
      searchHistoryUtils.addToHistory(initialItem);

      // Add another item
      const secondItem = {
        trackingNumber: 'BOOK123456',
        trackingType: 'booking' as const,
        carrier: 'CMA CGM',
      };
      searchHistoryUtils.addToHistory(secondItem);

      // Add the first item again
      searchHistoryUtils.addToHistory(initialItem);

      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].trackingNumber).toBe('TEST1234567'); // Should be first
      expect(history[0].searchCount).toBe(2); // Should be incremented
      expect(history[1].trackingNumber).toBe('BOOK123456');
    });

    it('should limit history to maximum items', () => {
      // Add 12 items (more than MAX_HISTORY_ITEMS = 10)
      for (let i = 1; i <= 12; i++) {
        searchHistoryUtils.addToHistory({
          trackingNumber: `TEST${i.toString().padStart(7, '0')}`,
          trackingType: 'container',
          carrier: 'Test Carrier',
        });
      }

      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(10);
      expect(history[0].trackingNumber).toBe('TEST0000012'); // Most recent first
      expect(history[9].trackingNumber).toBe('TEST0000003'); // Oldest kept
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const newItem = {
        trackingNumber: 'TEST1234567',
        trackingType: 'container' as const,
      };

      // Should not throw
      expect(() => searchHistoryUtils.addToHistory(newItem)).not.toThrow();

      // Restore original method
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('removeFromHistory', () => {
    beforeEach(() => {
      // Setup initial history
      const items = [
        {
          trackingNumber: 'TEST1234567',
          trackingType: 'container' as const,
          carrier: 'Maersk',
        },
        {
          trackingNumber: 'BOOK123456',
          trackingType: 'booking' as const,
          carrier: 'CMA CGM',
        },
      ];

      items.forEach(item => searchHistoryUtils.addToHistory(item));
    });

    it('should remove specific item from history', () => {
      searchHistoryUtils.removeFromHistory('TEST1234567');
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].trackingNumber).toBe('BOOK123456');
    });

    it('should handle removing non-existent item', () => {
      searchHistoryUtils.removeFromHistory('NONEXISTENT');
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toHaveLength(2); // Should remain unchanged
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      // Add some items first
      searchHistoryUtils.addToHistory({
        trackingNumber: 'TEST1234567',
        trackingType: 'container',
      });

      searchHistoryUtils.clearHistory();
      
      const history = searchHistoryUtils.getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getFilteredHistory', () => {
    beforeEach(() => {
      // Setup test data
      const items = [
        {
          trackingNumber: 'MAEU1234567',
          trackingType: 'container' as const,
          carrier: 'Maersk',
        },
        {
          trackingNumber: 'CMAU7654321',
          trackingType: 'container' as const,
          carrier: 'CMA CGM',
        },
        {
          trackingNumber: 'BOOK123456',
          trackingType: 'booking' as const,
          carrier: 'Hapag-Lloyd',
        },
      ];

      items.forEach(item => searchHistoryUtils.addToHistory(item));
    });

    it('should return all items when query is empty', () => {
      const filtered = searchHistoryUtils.getFilteredHistory('');
      expect(filtered).toHaveLength(3);
    });

    it('should filter by tracking number', () => {
      const filtered = searchHistoryUtils.getFilteredHistory('MAEU');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].trackingNumber).toBe('MAEU1234567');
    });

    it('should filter by carrier name', () => {
      const filtered = searchHistoryUtils.getFilteredHistory('CMA');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].carrier).toBe('CMA CGM');
    });

    it('should be case insensitive', () => {
      const filtered = searchHistoryUtils.getFilteredHistory('maersk');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].carrier).toBe('Maersk');
    });

    it('should handle partial matches', () => {
      const filtered = searchHistoryUtils.getFilteredHistory('123');
      expect(filtered).toHaveLength(2); // MAEU1234567 and BOOK123456
    });
  });

  describe('getHistorySortedByRecent', () => {
    it('should sort history by most recent first', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Mock Date.now to control timestamps
      const originalNow = Date.now;
      Date.now = vi.fn()
        .mockReturnValueOnce(twoHoursAgo.getTime())
        .mockReturnValueOnce(oneHourAgo.getTime())
        .mockReturnValueOnce(now.getTime());

      // Add items in reverse chronological order
      searchHistoryUtils.addToHistory({
        trackingNumber: 'OLD1234567',
        trackingType: 'container',
      });

      searchHistoryUtils.addToHistory({
        trackingNumber: 'MID1234567',
        trackingType: 'container',
      });

      searchHistoryUtils.addToHistory({
        trackingNumber: 'NEW1234567',
        trackingType: 'container',
      });

      const sorted = searchHistoryUtils.getHistorySortedByRecent();
      expect(sorted[0].trackingNumber).toBe('NEW1234567');
      expect(sorted[1].trackingNumber).toBe('MID1234567');
      expect(sorted[2].trackingNumber).toBe('OLD1234567');

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('getHistorySortedByCount', () => {
    it('should sort history by search count descending', () => {
      // Add items with different search counts
      const item1 = {
        trackingNumber: 'LOW1234567',
        trackingType: 'container' as const,
      };
      const item2 = {
        trackingNumber: 'HIGH123456',
        trackingType: 'container' as const,
      };

      // Add item1 once
      searchHistoryUtils.addToHistory(item1);

      // Add item2 three times
      searchHistoryUtils.addToHistory(item2);
      searchHistoryUtils.addToHistory(item2);
      searchHistoryUtils.addToHistory(item2);

      const sorted = searchHistoryUtils.getHistorySortedByCount();
      expect(sorted[0].trackingNumber).toBe('HIGH123456');
      expect(sorted[0].searchCount).toBe(3);
      expect(sorted[1].trackingNumber).toBe('LOW1234567');
      expect(sorted[1].searchCount).toBe(1);
    });
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(searchHistoryUtils.isStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws errors', () => {
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage not available');
      });

      expect(searchHistoryUtils.isStorageAvailable()).toBe(false);

      // Restore original method
      localStorageMock.setItem = originalSetItem;
    });
  });
});