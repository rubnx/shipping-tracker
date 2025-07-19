import { create } from 'zustand';
import type { UIState } from './types';

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  modals: {
    shipmentDetails: false,
    settings: false,
    help: false,
  },
  showDemo: true,
  showMap: true,
  showTimeline: true,
  selectedPort: null,
  mapHeight: 400,
  isMobile: false,
  sidebarOpen: false,
  notifications: [],

  // Actions
  openModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),

  closeModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),

  closeAllModals: () =>
    set({
      modals: {
        shipmentDetails: false,
        settings: false,
        help: false,
      },
    }),

  setShowDemo: (show) => set({ showDemo: show }),

  setShowMap: (show) => set({ showMap: show }),

  setShowTimeline: (show) => set({ showTimeline: show }),

  setSelectedPort: (port) => set({ selectedPort: port }),

  setMapHeight: (height) => set({ mapHeight: height }),

  setIsMobile: (mobile) => set({ isMobile: mobile }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));