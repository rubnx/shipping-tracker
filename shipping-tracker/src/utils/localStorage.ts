// Local Storage Management for Offline Functionality

export interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private prefix: string;

  private constructor(prefix: string = 'shipping-tracker') {
    this.prefix = prefix;
  }

  public static getInstance(prefix?: string): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager(prefix);
    }
    return LocalStorageManager.instance;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Set item in localStorage with optional expiration
   */
  public setItem<T>(key: string, data: T, expirationHours?: number): boolean {
    try {
      const item: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        ...(expirationHours && { expiresAt: Date.now() + (expirationHours * 60 * 60 * 1000) })
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('❌ LocalStorage: Failed to set item', key, error);
      return false;
    }
  }

  /**
   * Get item from localStorage with expiration check
   */
  public getItem<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.getKey(key));
      if (!itemStr) return null;

      const item: StorageItem<T> = JSON.parse(itemStr);
      
      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('❌ LocalStorage: Failed to get item', key, error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  public removeItem(key: string): boolean {
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error('❌ LocalStorage: Failed to remove item', key, error);
      return false;
    }
  }

  /**
   * Clear all items with the current prefix
   */
  public clear(): boolean {
    try {
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter(key => key.startsWith(`${this.prefix}:`));
      
      prefixedKeys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('❌ LocalStorage: Failed to clear items', error);
      return false;
    }
  }

  /**
   * Get all keys with the current prefix
   */
  public getKeys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(`${this.prefix}:`))
        .map(key => key.replace(`${this.prefix}:`, ''));
    } catch (error) {
      console.error('❌ LocalStorage: Failed to get keys', error);
      return [];
    }
  }

  /**
   * Get storage usage information
   */
  public getStorageInfo(): {
    used: number;
    available: number;
    total: number;
    percentage: number;
  } {
    try {
      let used = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        used += key.length + (localStorage.getItem(key)?.length || 0);
      });

      // Estimate total available storage (usually ~5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const available = total - used;
      const percentage = (used / total) * 100;

      return {
        used,
        available,
        total,
        percentage
      };
    } catch (error) {
      console.error('❌ LocalStorage: Failed to get storage info', error);
      return { used: 0, available: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Clean up expired items
   */
  public cleanupExpired(): number {
    let cleanedCount = 0;
    
    try {
      const keys = this.getKeys();
      
      keys.forEach(key => {
        const itemStr = localStorage.getItem(this.getKey(key));
        if (itemStr) {
          try {
            const item: StorageItem = JSON.parse(itemStr);
            if (item.expiresAt && Date.now() > item.expiresAt) {
              this.removeItem(key);
              cleanedCount++;
            }
          } catch (error) {
            // Remove corrupted items
            this.removeItem(key);
            cleanedCount++;
          }
        }
      });
    } catch (error) {
      console.error('❌ LocalStorage: Failed to cleanup expired items', error);
    }

    if (cleanedCount > 0) {
      console.log(`🧹 LocalStorage: Cleaned up ${cleanedCount} expired items`);
    }

    return cleanedCount;
  }
}

// Specific storage managers for different data types
export class TrackingDataStorage {
  private storage: LocalStorageManager;

  constructor() {
    this.storage = LocalStorageManager.getInstance();
  }

  public saveTrackingData(trackingNumber: string, data: any): boolean {
    return this.storage.setItem(`tracking:${trackingNumber}`, data, 24); // 24 hours expiration
  }

  public getTrackingData(trackingNumber: string): any | null {
    return this.storage.getItem(`tracking:${trackingNumber}`);
  }

  public removeTrackingData(trackingNumber: string): boolean {
    return this.storage.removeItem(`tracking:${trackingNumber}`);
  }

  public getAllCachedTrackingNumbers(): string[] {
    return this.storage.getKeys()
      .filter(key => key.startsWith('tracking:'))
      .map(key => key.replace('tracking:', ''));
  }
}

export class SearchHistoryStorage {
  private storage: LocalStorageManager;
  private maxHistoryItems: number;

  constructor(maxItems: number = 50) {
    this.storage = LocalStorageManager.getInstance();
    this.maxHistoryItems = maxItems;
  }

  public addSearchHistory(trackingNumber: string, trackingType: string): boolean {
    const history = this.getSearchHistory();
    
    // Remove existing entry if present
    const filteredHistory = history.filter(item => item.trackingNumber !== trackingNumber);
    
    // Add new entry at the beginning
    const newHistory = [
      { trackingNumber, trackingType, timestamp: Date.now() },
      ...filteredHistory
    ].slice(0, this.maxHistoryItems);

    return this.storage.setItem('search-history', newHistory);
  }

  public getSearchHistory(): Array<{
    trackingNumber: string;
    trackingType: string;
    timestamp: number;
  }> {
    return this.storage.getItem('search-history') || [];
  }

  public clearSearchHistory(): boolean {
    return this.storage.removeItem('search-history');
  }

  public removeFromHistory(trackingNumber: string): boolean {
    const history = this.getSearchHistory();
    const filteredHistory = history.filter(item => item.trackingNumber !== trackingNumber);
    return this.storage.setItem('search-history', filteredHistory);
  }
}

export class FavoritesStorage {
  private storage: LocalStorageManager;

  constructor() {
    this.storage = LocalStorageManager.getInstance();
  }

  public addFavorite(trackingNumber: string, alias?: string): boolean {
    const favorites = this.getFavorites();
    
    // Check if already exists
    if (favorites.some(fav => fav.trackingNumber === trackingNumber)) {
      return false;
    }

    const newFavorites = [
      ...favorites,
      {
        trackingNumber,
        alias: alias || trackingNumber,
        addedAt: Date.now()
      }
    ];

    return this.storage.setItem('favorites', newFavorites);
  }

  public getFavorites(): Array<{
    trackingNumber: string;
    alias: string;
    addedAt: number;
  }> {
    return this.storage.getItem('favorites') || [];
  }

  public removeFavorite(trackingNumber: string): boolean {
    const favorites = this.getFavorites();
    const filteredFavorites = favorites.filter(fav => fav.trackingNumber !== trackingNumber);
    return this.storage.setItem('favorites', filteredFavorites);
  }

  public isFavorite(trackingNumber: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.trackingNumber === trackingNumber);
  }
}

// Initialize and export instances
export const trackingDataStorage = new TrackingDataStorage();
export const searchHistoryStorage = new SearchHistoryStorage();
export const favoritesStorage = new FavoritesStorage();

// Auto cleanup expired items on initialization
LocalStorageManager.getInstance().cleanupExpired();