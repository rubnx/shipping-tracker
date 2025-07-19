import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TrackingState } from './types';
import type { ShipmentTracking, SearchHistoryItem } from '../types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentShipment: null,
      searchHistory: [],
      searchQuery: '',
      searchType: null,
      isSearching: false,
      searchError: null,
      loadingStates: {
        search: 'idle',
        details: 'idle',
        timeline: 'idle',
        map: 'idle',
      },
      shipmentCache: new Map(),
      cacheTimestamps: new Map(),

      // Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSearchType: (type) => set({ searchType: type }),
      
      setIsSearching: (loading) => set({ isSearching: loading }),
      
      setSearchError: (error) => set({ searchError: error }),
      
      setCurrentShipment: (shipment) => set({ currentShipment: shipment }),
      
      addToSearchHistory: (item) =>
        set((state) => {
          const existingIndex = state.searchHistory.findIndex(
            (h) => h.trackingNumber === item.trackingNumber
          );
          
          let newHistory;
          if (existingIndex >= 0) {
            // Update existing item
            newHistory = [...state.searchHistory];
            newHistory[existingIndex] = {
              ...newHistory[existingIndex],
              searchCount: newHistory[existingIndex].searchCount + 1,
              lastSearched: new Date(),
            };
          } else {
            // Add new item
            const newItem: SearchHistoryItem = {
              ...item,
              searchCount: 1,
              lastSearched: new Date(),
            };
            newHistory = [newItem, ...state.searchHistory.slice(0, 9)]; // Keep only 10 items
          }
          
          return { searchHistory: newHistory };
        }),
      
      clearSearchHistory: () => set({ searchHistory: [] }),
      
      setLoadingState: (key, loadingState) =>
        set((state) => ({
          loadingStates: { ...state.loadingStates, [key]: loadingState },
        })),
      
      cacheShipment: (trackingNumber, shipment) =>
        set((state) => {
          const newCache = new Map(state.shipmentCache);
          const newTimestamps = new Map(state.cacheTimestamps);
          
          newCache.set(trackingNumber, shipment);
          newTimestamps.set(trackingNumber, Date.now());
          
          return {
            shipmentCache: newCache,
            cacheTimestamps: newTimestamps,
          };
        }),
      
      getCachedShipment: (trackingNumber) => {
        const state = get();
        const cached = state.shipmentCache.get(trackingNumber);
        const timestamp = state.cacheTimestamps.get(trackingNumber);
        
        if (!cached || !timestamp) return null;
        
        // Check if cache is still valid
        if (Date.now() - timestamp > CACHE_DURATION) {
          // Remove expired cache
          const newCache = new Map(state.shipmentCache);
          const newTimestamps = new Map(state.cacheTimestamps);
          newCache.delete(trackingNumber);
          newTimestamps.delete(trackingNumber);
          
          set({
            shipmentCache: newCache,
            cacheTimestamps: newTimestamps,
          });
          
          return null;
        }
        
        return cached;
      },
      
      clearCache: () =>
        set({
          shipmentCache: new Map(),
          cacheTimestamps: new Map(),
        }),
      
      reset: () =>
        set({
          currentShipment: null,
          searchQuery: '',
          searchType: null,
          isSearching: false,
          searchError: null,
          loadingStates: {
            search: 'idle',
            details: 'idle',
            timeline: 'idle',
            map: 'idle',
          },
        }),
    }),
    {
      name: 'tracking-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        // Don't persist cache or current search state
      }),
    }
  )
);