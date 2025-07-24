import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ShipmentTracking, TrackingType, SearchHistoryItem } from '../types';

interface TrackingState {
  // Current state
  currentShipment: ShipmentTracking | null;
  isSearching: boolean;
  searchError: string | null;
  
  // Search history
  searchHistory: SearchHistoryItem[];
  
  // Cache
  shipmentCache: Record<string, ShipmentTracking>;
  
  // Actions
  setCurrentShipment: (shipment: ShipmentTracking | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchError: (error: string | null) => void;
  
  // Search history actions
  addToSearchHistory: (item: SearchHistoryItem) => void;
  clearSearchHistory: () => void;
  
  // Cache actions
  cacheShipment: (trackingNumber: string, shipment: ShipmentTracking) => void;
  getCachedShipment: (trackingNumber: string) => ShipmentTracking | null;
  clearCache: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentShipment: null,
  isSearching: false,
  searchError: null,
  searchHistory: [],
  shipmentCache: {},
};

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // State setters
      setCurrentShipment: (shipment) => set({ currentShipment: shipment }),
      setIsSearching: (isSearching) => set({ isSearching }),
      setSearchError: (error) => set({ searchError: error }),
      
      // Search history
      addToSearchHistory: (item) => {
        const { searchHistory } = get();
        const existingIndex = searchHistory.findIndex(
          (h) => h.trackingNumber === item.trackingNumber
        );
        
        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...searchHistory];
          updated[existingIndex] = {
            ...updated[existingIndex],
            searchCount: updated[existingIndex].searchCount + 1,
            lastSearched: item.lastSearched,
          };
          set({ searchHistory: updated });
        } else {
          // Add new item (keep only last 10)
          const updated = [item, ...searchHistory].slice(0, 10);
          set({ searchHistory: updated });
        }
      },
      
      clearSearchHistory: () => set({ searchHistory: [] }),
      
      // Cache management
      cacheShipment: (trackingNumber, shipment) => {
        const { shipmentCache } = get();
        set({
          shipmentCache: {
            ...shipmentCache,
            [trackingNumber]: shipment,
          },
        });
      },
      
      getCachedShipment: (trackingNumber) => {
        const { shipmentCache } = get();
        return shipmentCache[trackingNumber] || null;
      },
      
      clearCache: () => set({ shipmentCache: {} }),
      
      // Reset all state
      reset: () => set(initialState),
    }),
    {
      name: 'tracking-store',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        shipmentCache: state.shipmentCache,
      }),
    }
  )
);

// Selector hooks for better performance
export const useCurrentShipment = () => useTrackingStore((state) => state.currentShipment);
export const useIsSearching = () => useTrackingStore((state) => state.isSearching);
export const useSearchError = () => useTrackingStore((state) => state.searchError);
export const useSearchHistory = () => useTrackingStore((state) => state.searchHistory);