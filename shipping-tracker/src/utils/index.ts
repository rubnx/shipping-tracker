// Utility functions for the shipping tracker application

import type { TrackingType } from '../types';

/**
 * Detects the tracking number type based on format patterns
 */
export const detectTrackingType = (trackingNumber: string): TrackingType | null => {
  const cleaned = trackingNumber.trim().toUpperCase();
  
  if (!cleaned) {
    return null;
  }
  
  // Container number pattern: exactly 4 letters + 7 digits (most specific)
  if (/^[A-Z]{4}[0-9]{7}$/.test(cleaned)) {
    return 'container';
  }
  
  // Bill of Lading pattern: 2-4 letters followed by 9+ alphanumeric characters
  // Extended range to handle longer BOL numbers
  if (/^[A-Z]{2,4}[0-9A-Z]{9,20}$/.test(cleaned) && cleaned.length >= 13) {
    return 'bol';
  }
  
  // Booking number pattern: 6-12 alphanumeric characters
  // Must contain at least one letter and one number to be valid
  // Must not match container or BOL patterns
  if (/^[A-Z0-9]{6,12}$/.test(cleaned) && 
      /[A-Z]/.test(cleaned) && 
      /[0-9]/.test(cleaned) &&
      !(/^[A-Z]{4}[0-9]{7}$/.test(cleaned)) && 
      !(cleaned.length >= 13 && /^[A-Z]{2,4}[0-9A-Z]{9,20}$/.test(cleaned))) {
    return 'booking';
  }
  
  return null;
};

/**
 * Validates tracking number format
 */
export const validateTrackingNumber = (trackingNumber: string): {
  isValid: boolean;
  error?: string;
  detectedType?: TrackingType;
} => {
  if (!trackingNumber || trackingNumber.trim().length === 0) {
    return {
      isValid: false,
      error: 'Please enter a tracking number',
    };
  }
  
  const detectedType = detectTrackingType(trackingNumber);
  
  if (!detectedType) {
    return {
      isValid: false,
      error: 'Invalid tracking number format. Please check and try again.',
    };
  }
  
  return {
    isValid: true,
    detectedType,
  };
};

/**
 * Formats date for display
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Calculates completion percentage based on timeline events
 */
export const calculateCompletionPercentage = (events: any[]): number => {
  if (!events || events.length === 0) return 0;
  
  const completedEvents = events.filter(event => event.isCompleted);
  return Math.round((completedEvents.length / events.length) * 100);
};

/**
 * Debounce function for search input
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Local storage utilities for search history
 */
import type { SearchHistoryItem } from '../types';

const SEARCH_HISTORY_KEY = 'shipping-search-history';
const MAX_HISTORY_ITEMS = 10;

export const searchHistoryUtils = {
  /**
   * Get search history from localStorage
   */
  getHistory: (): SearchHistoryItem[] => {
    try {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!history) return [];
      
      const parsed = JSON.parse(history);
      // Convert date strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        lastSearched: new Date(item.lastSearched),
      }));
    } catch {
      return [];
    }
  },
  
  /**
   * Add or update a search history item
   */
  addToHistory: (item: Omit<SearchHistoryItem, 'searchCount' | 'lastSearched'>): void => {
    try {
      const history = searchHistoryUtils.getHistory();
      const existingIndex = history.findIndex(
        historyItem => historyItem.trackingNumber === item.trackingNumber
      );
      
      if (existingIndex >= 0) {
        // Update existing item
        history[existingIndex] = {
          ...history[existingIndex],
          ...item,
          searchCount: history[existingIndex].searchCount + 1,
          lastSearched: new Date(),
        };
        // Move to front
        const updatedItem = history.splice(existingIndex, 1)[0];
        history.unshift(updatedItem);
      } else {
        // Add new item
        const newItem: SearchHistoryItem = {
          ...item,
          searchCount: 1,
          lastSearched: new Date(),
        };
        history.unshift(newItem);
      }
      
      // Keep only the most recent items
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  
  /**
   * Remove a specific item from search history
   */
  removeFromHistory: (trackingNumber: string): void => {
    try {
      const history = searchHistoryUtils.getHistory();
      const filtered = history.filter(item => item.trackingNumber !== trackingNumber);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  
  /**
   * Clear all search history
   */
  clearHistory: (): void => {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  
  /**
   * Get filtered search history based on query
   */
  getFilteredHistory: (query: string): SearchHistoryItem[] => {
    const history = searchHistoryUtils.getHistory();
    if (!query.trim()) return history;
    
    const lowerQuery = query.toLowerCase();
    return history.filter(item =>
      item.trackingNumber.toLowerCase().includes(lowerQuery) ||
      (item.carrier && item.carrier.toLowerCase().includes(lowerQuery))
    );
  },
  
  /**
   * Get search history sorted by most recent first
   */
  getHistorySortedByRecent: (): SearchHistoryItem[] => {
    const history = searchHistoryUtils.getHistory();
    return history.sort((a, b) => b.lastSearched.getTime() - a.lastSearched.getTime());
  },
  
  /**
   * Get search history sorted by search count (most searched first)
   */
  getHistorySortedByCount: (): SearchHistoryItem[] => {
    const history = searchHistoryUtils.getHistory();
    return history.sort((a, b) => b.searchCount - a.searchCount);
  },
  
  /**
   * Check if localStorage is available
   */
  isStorageAvailable: (): boolean => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
};

// Error handling utilities
export {
  createAppError,
  parseHttpError,
  retryWithBackoff,
  isOnline,
  onNetworkStatusChange,
  logError,
  withTimeout,
  ErrorCodes,
  type AppError
} from './errorHandling';

// Security utilities
export {
  sanitizeString,
  sanitizeTrackingNumber,
  isValidEmail,
  isValidUrl,
  RateLimiter,
  generateCSPHeader,
  getSecurityHeaders,
  isValidApiKey,
  generateSecureToken,
  hashData,
  isValidOrigin,
  isBotRequest,
  isValidRequestSize
} from './security';

// Configuration utilities
export {
  loadConfig,
  getConfig,
  isDevelopment,
  isProduction,
  isTest,
  getClientConfig,
  maskSensitiveConfig,
  type AppConfig
} from './config';