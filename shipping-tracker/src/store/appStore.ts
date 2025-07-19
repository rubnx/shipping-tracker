import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState } from './types';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      theme: 'system',
      highContrast: false,
      reducedMotion: false,
      preferences: {
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
        notifications: true,
        defaultView: 'timeline',
      },

      // Actions
      setTheme: (theme) => set({ theme }),
      
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      
      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      
      updatePreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        highContrast: state.highContrast,
        reducedMotion: state.reducedMotion,
        preferences: state.preferences,
      }),
    }
  )
);