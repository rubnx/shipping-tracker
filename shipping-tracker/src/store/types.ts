import type { 
  ShipmentTracking, 
  SearchHistoryItem, 
  LoadingState, 
  TrackingType,
  Port 
} from '../types';

// App-wide state
export interface AppState {
  // Theme and preferences
  theme: 'light' | 'dark' | 'system';
  highContrast: boolean;
  reducedMotion: boolean;
  
  // User preferences
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    notifications: boolean;
    defaultView: 'timeline' | 'map' | 'details';
  };
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  updatePreferences: (preferences: Partial<AppState['preferences']>) => void;
}

// Tracking-specific state
export interface TrackingState {
  // Current tracking data
  currentShipment: ShipmentTracking | null;
  searchHistory: SearchHistoryItem[];
  
  // Search state
  searchQuery: string;
  searchType: TrackingType | null;
  isSearching: boolean;
  searchError: string | null;
  
  // Loading states
  loadingStates: {
    search: LoadingState;
    details: LoadingState;
    timeline: LoadingState;
    map: LoadingState;
  };
  
  // Cache
  shipmentCache: Map<string, ShipmentTracking>;
  cacheTimestamps: Map<string, number>;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSearchType: (type: TrackingType | null) => void;
  setIsSearching: (loading: boolean) => void;
  setSearchError: (error: string | null) => void;
  setCurrentShipment: (shipment: ShipmentTracking | null) => void;
  addToSearchHistory: (item: SearchHistoryItem) => void;
  clearSearchHistory: () => void;
  setLoadingState: (key: keyof TrackingState['loadingStates'], state: LoadingState) => void;
  cacheShipment: (trackingNumber: string, shipment: ShipmentTracking) => void;
  getCachedShipment: (trackingNumber: string) => ShipmentTracking | null;
  clearCache: () => void;
  reset: () => void;
}

// UI-specific state
export interface UIState {
  // Modal and overlay states
  modals: {
    shipmentDetails: boolean;
    settings: boolean;
    help: boolean;
  };
  
  // Component visibility
  showDemo: boolean;
  showMap: boolean;
  showTimeline: boolean;
  
  // Map state
  selectedPort: Port | null;
  mapHeight: number;
  
  // Mobile and responsive
  isMobile: boolean;
  sidebarOpen: boolean;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    timestamp: number;
    duration?: number;
  }>;
  
  // Actions
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  setShowDemo: (show: boolean) => void;
  setShowMap: (show: boolean) => void;
  setShowTimeline: (show: boolean) => void;
  setSelectedPort: (port: Port | null) => void;
  setMapHeight: (height: number) => void;
  setIsMobile: (mobile: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}