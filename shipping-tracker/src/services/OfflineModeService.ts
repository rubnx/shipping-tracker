import { DemoModeUtils, demoTrackingNumbers } from '../config/demo';

/**
 * Offline mode service for cached sample data
 * Implements Requirements 5.1, 5.2, 9.3 for offline functionality
 */

export interface OfflineTrackingData {
  trackingNumber: string;
  trackingType: 'booking' | 'container' | 'bol';
  carrier: string;
  service: 'FCL' | 'LCL';
  status: string;
  timeline: Array<{
    id: string;
    timestamp: string;
    status: string;
    location: string;
    description: string;
    isCompleted: boolean;
    coordinates?: { lat: number; lng: number };
  }>;
  route: {
    origin: {
      code: string;
      name: string;
      city: string;
      country: string;
      coordinates: { lat: number; lng: number };
    };
    destination: {
      code: string;
      name: string;
      city: string;
      country: string;
      coordinates: { lat: number; lng: number };
    };
    intermediateStops: Array<{
      code: string;
      name: string;
      city: string;
      country: string;
      coordinates: { lat: number; lng: number };
    }>;
  };
  containers: Array<{
    number: string;
    size: '20ft' | '40ft' | '45ft';
    type: 'GP' | 'HC' | 'RF' | 'OT';
    sealNumber: string;
    weight?: number;
  }>;
  vessel: {
    name: string;
    imo: string;
    voyage: string;
    currentPosition?: { lat: number; lng: number };
    eta?: string;
  };
  lastUpdated: string;
  dataSource: string;
}

export class OfflineModeService {
  private static readonly STORAGE_KEY = 'shipping_tracker_offline_data';
  private static readonly SEARCH_HISTORY_KEY = 'shipping_tracker_search_history';
  private static readonly CACHE_EXPIRY_HOURS = 24;

  /**
   * Check if offline mode is available
   */
  static isAvailable(): boolean {
    return typeof localStorage !== 'undefined' && DemoModeUtils.isEnabled();
  }

  /**
   * Check if we're currently offline
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Get cached tracking data
   */
  static getCachedTrackingData(trackingNumber: string): OfflineTrackingData | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const cached = localStorage.getItem(`${this.STORAGE_KEY}_${trackingNumber.toUpperCase()}`);
      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      
      // Check if cache is expired
      const cacheTime = new Date(data.cachedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > this.CACHE_EXPIRY_HOURS) {
        this.removeCachedData(trackingNumber);
        return null;
      }

      return data.trackingData;
    } catch (error) {
      console.error('Error reading cached tracking data:', error);
      return null;
    }
  }

  /**
   * Cache tracking data
   */
  static cacheTrackingData(trackingNumber: string, data: OfflineTrackingData): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const cacheEntry = {
        trackingData: data,
        cachedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        `${this.STORAGE_KEY}_${trackingNumber.toUpperCase()}`,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.error('Error caching tracking data:', error);
    }
  }

  /**
   * Remove cached data for a tracking number
   */
  static removeCachedData(trackingNumber: string): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${trackingNumber.toUpperCase()}`);
    } catch (error) {
      console.error('Error removing cached data:', error);
    }
  }

  /**
   * Get all cached tracking numbers
   */
  static getCachedTrackingNumbers(): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(this.STORAGE_KEY))
        .map(key => key.replace(`${this.STORAGE_KEY}_`, ''));
    } catch (error) {
      console.error('Error getting cached tracking numbers:', error);
      return [];
    }
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      keys
        .filter(key => key.startsWith(this.STORAGE_KEY))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Generate offline sample data for a tracking number
   */
  static generateOfflineSampleData(trackingNumber: string): OfflineTrackingData {
    const demoInfo = DemoModeUtils.getDemoNumberInfo(trackingNumber);
    const hash = this.hashString(trackingNumber);

    // Sample carriers
    const carriers = ['Maersk Line', 'MSC', 'CMA CGM', 'COSCO Shipping', 'Hapag-Lloyd'];
    const carrier = carriers[hash % carriers.length];

    // Sample ports
    const ports = [
      { code: 'USNYC', name: 'New York', city: 'New York', country: 'United States', coordinates: { lat: 40.7128, lng: -74.0060 } },
      { code: 'NLRTM', name: 'Rotterdam', city: 'Rotterdam', country: 'Netherlands', coordinates: { lat: 51.9244, lng: 4.4777 } },
      { code: 'SGSIN', name: 'Singapore', city: 'Singapore', country: 'Singapore', coordinates: { lat: 1.2966, lng: 103.7764 } },
      { code: 'CNSHA', name: 'Shanghai', city: 'Shanghai', country: 'China', coordinates: { lat: 31.2304, lng: 121.4737 } },
    ];

    const origin = ports[hash % ports.length];
    const destination = ports[(hash + 1) % ports.length];

    // Generate timeline based on demo info or default
    const timeline = this.generateOfflineTimeline(demoInfo?.expectedStatus || 'In Transit', origin, destination);

    return {
      trackingNumber: trackingNumber.toUpperCase(),
      trackingType: this.detectTrackingType(trackingNumber),
      carrier,
      service: hash % 2 === 0 ? 'FCL' : 'LCL',
      status: demoInfo?.expectedStatus || 'In Transit',
      timeline,
      route: {
        origin,
        destination,
        intermediateStops: [],
      },
      containers: [{
        number: `OFFLINE${String(hash).padStart(6, '0')}`,
        size: '40ft',
        type: 'GP',
        sealNumber: `SEAL${String(hash).padStart(6, '0')}`,
        weight: 15000 + (hash % 10000),
      }],
      vessel: {
        name: 'OFFLINE VESSEL',
        imo: '9999999',
        voyage: 'OFF2024',
        currentPosition: { lat: (origin.coordinates.lat + destination.coordinates.lat) / 2, lng: (origin.coordinates.lng + destination.coordinates.lng) / 2 },
        eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'Offline Cache (Demo Mode)',
    };
  }

  /**
   * Get search history from local storage
   */
  static getSearchHistory(): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const history = localStorage.getItem(this.SEARCH_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading search history:', error);
      return [];
    }
  }

  /**
   * Add to search history
   */
  static addToSearchHistory(trackingNumber: string): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const history = this.getSearchHistory();
      const upperTrackingNumber = trackingNumber.toUpperCase();
      
      // Remove if already exists
      const filtered = history.filter(item => item !== upperTrackingNumber);
      
      // Add to beginning
      const newHistory = [upperTrackingNumber, ...filtered].slice(0, 10); // Keep only last 10
      
      localStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  }

  /**
   * Clear search history
   */
  static clearSearchHistory(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Get offline mode status
   */
  static getOfflineStatus(): {
    available: boolean;
    offline: boolean;
    cachedItems: number;
    cacheSize: string;
    lastSync?: string;
  } {
    const cachedNumbers = this.getCachedTrackingNumbers();
    
    return {
      available: this.isAvailable(),
      offline: this.isOffline(),
      cachedItems: cachedNumbers.length,
      cacheSize: this.calculateCacheSize(),
      lastSync: this.getLastSyncTime(),
    };
  }

  /**
   * Sync with online data when connection is restored
   */
  static async syncWithOnline(): Promise<void> {
    if (!this.isAvailable() || this.isOffline()) {
      return;
    }

    const cachedNumbers = this.getCachedTrackingNumbers();
    
    for (const trackingNumber of cachedNumbers) {
      try {
        // Attempt to refresh data from API
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tracking/${trackingNumber}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Update cache with fresh data
            this.cacheTrackingData(trackingNumber, result.data);
          }
        }
      } catch (error) {
        console.error(`Failed to sync ${trackingNumber}:`, error);
      }
    }

    // Update last sync time
    localStorage.setItem(`${this.STORAGE_KEY}_last_sync`, new Date().toISOString());
  }

  /**
   * Private helper methods
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static detectTrackingType(trackingNumber: string): 'booking' | 'container' | 'bol' {
    const upper = trackingNumber.toUpperCase();
    
    if (upper.includes('BOOKING') || upper.includes('BKG')) {
      return 'booking';
    } else if (upper.includes('CONTAINER') || upper.includes('CNT')) {
      return 'container';
    } else if (upper.includes('BOL') || upper.includes('BILL')) {
      return 'bol';
    }
    
    return upper.length >= 10 ? 'container' : 'booking';
  }

  private static generateOfflineTimeline(status: string, origin: any, destination: any) {
    const baseTime = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago
    
    const allEvents = [
      { status: 'Booking Confirmed', location: origin.name, description: 'Shipment booking confirmed', offset: 0 },
      { status: 'Container Loaded', location: origin.name, description: `Container loaded at ${origin.name}`, offset: 1 },
      { status: 'Departed Origin Port', location: origin.name, description: `Vessel departed from ${origin.name}`, offset: 2 },
      { status: 'In Transit', location: 'Ocean', description: 'Shipment in transit', offset: 3 },
      { status: 'Arrived Destination Port', location: destination.name, description: `Arrived at ${destination.name}`, offset: 4 },
      { status: 'Container Discharged', location: destination.name, description: 'Container discharged', offset: 5 },
      { status: 'Delivered', location: destination.name, description: 'Delivered to final destination', offset: 6 },
    ];

    // Find the current status index
    const currentIndex = allEvents.findIndex(event => event.status === status);
    const eventsToShow = currentIndex >= 0 ? allEvents.slice(0, currentIndex + 1) : allEvents.slice(0, 3);

    return eventsToShow.map((event, index) => ({
      id: `offline-event-${index}`,
      timestamp: new Date(baseTime + event.offset * 24 * 60 * 60 * 1000).toISOString(),
      status: event.status,
      location: event.location,
      description: event.description,
      isCompleted: index < eventsToShow.length - 1 || status === 'Delivered',
      coordinates: event.location === origin.name ? origin.coordinates : destination.coordinates,
    }));
  }

  private static calculateCacheSize(): string {
    if (!this.isAvailable()) {
      return '0 KB';
    }

    try {
      let totalSize = 0;
      const keys = Object.keys(localStorage);
      
      keys
        .filter(key => key.startsWith(this.STORAGE_KEY))
        .forEach(key => {
          totalSize += localStorage.getItem(key)?.length || 0;
        });

      if (totalSize < 1024) {
        return `${totalSize} B`;
      } else if (totalSize < 1024 * 1024) {
        return `${(totalSize / 1024).toFixed(1)} KB`;
      } else {
        return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
      }
    } catch (error) {
      return 'Unknown';
    }
  }

  private static getLastSyncTime(): string | undefined {
    if (!this.isAvailable()) {
      return undefined;
    }

    try {
      return localStorage.getItem(`${this.STORAGE_KEY}_last_sync`) || undefined;
    } catch (error) {
      return undefined;
    }
  }
}

export default OfflineModeService;