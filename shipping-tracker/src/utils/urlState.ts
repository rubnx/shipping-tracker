// URL State Management for Shareable URLs and Deep Linking

export interface TrackingURLState {
  trackingNumber?: string;
  trackingType?: 'container' | 'booking' | 'bol';
  view?: 'details' | 'timeline' | 'map';
  concurrent?: boolean;
}

export class URLStateManager {
  private static instance: URLStateManager;

  private constructor() {}

  public static getInstance(): URLStateManager {
    if (!URLStateManager.instance) {
      URLStateManager.instance = new URLStateManager();
    }
    return URLStateManager.instance;
  }

  /**
   * Get current URL state
   */
  public getState(): TrackingURLState {
    const params = new URLSearchParams(window.location.search);
    
    return {
      trackingNumber: params.get('tracking') || undefined,
      trackingType: (params.get('type') as any) || undefined,
      view: (params.get('view') as any) || undefined,
      concurrent: params.get('concurrent') === 'true',
    };
  }

  /**
   * Update URL state without page reload
   */
  public setState(state: Partial<TrackingURLState>, replace: boolean = false): void {
    const currentState = this.getState();
    const newState = { ...currentState, ...state };
    
    const params = new URLSearchParams();
    
    if (newState.trackingNumber) {
      params.set('tracking', newState.trackingNumber);
    }
    
    if (newState.trackingType) {
      params.set('type', newState.trackingType);
    }
    
    if (newState.view) {
      params.set('view', newState.view);
    }
    
    if (newState.concurrent !== undefined) {
      params.set('concurrent', newState.concurrent.toString());
    }

    const url = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    
    if (replace) {
      window.history.replaceState(newState, '', url);
    } else {
      window.history.pushState(newState, '', url);
    }

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('urlStateChange', {
      detail: newState
    }));
  }

  /**
   * Clear URL state
   */
  public clearState(): void {
    window.history.replaceState({}, '', window.location.pathname);
    window.dispatchEvent(new CustomEvent('urlStateChange', {
      detail: {}
    }));
  }

  /**
   * Generate shareable URL for tracking result
   */
  public generateShareableURL(trackingNumber: string, trackingType?: string, view?: string): string {
    const params = new URLSearchParams();
    params.set('tracking', trackingNumber);
    
    if (trackingType) {
      params.set('type', trackingType);
    }
    
    if (view) {
      params.set('view', view);
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Generate deep link for specific shipment
   */
  public generateDeepLink(trackingNumber: string, options?: {
    trackingType?: string;
    view?: string;
    concurrent?: boolean;
  }): string {
    const params = new URLSearchParams();
    params.set('tracking', trackingNumber);
    
    if (options?.trackingType) {
      params.set('type', options.trackingType);
    }
    
    if (options?.view) {
      params.set('view', options.view);
    }
    
    if (options?.concurrent !== undefined) {
      params.set('concurrent', options.concurrent.toString());
    }

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Listen for browser back/forward navigation
   */
  public onStateChange(callback: (state: TrackingURLState) => void): () => void {
    const handlePopState = (event: PopStateEvent) => {
      const state = this.getState();
      callback(state);
    };

    const handleURLStateChange = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('urlStateChange', handleURLStateChange as EventListener);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('urlStateChange', handleURLStateChange as EventListener);
    };
  }

  /**
   * Check if current URL has tracking parameters
   */
  public hasTrackingParams(): boolean {
    const state = this.getState();
    return !!state.trackingNumber;
  }

  /**
   * Get tracking number from URL
   */
  public getTrackingNumberFromURL(): string | null {
    return this.getState().trackingNumber || null;
  }
}

// React hook for URL state management
import { useState, useEffect } from 'react';

export function useURLState(): [TrackingURLState, (state: Partial<TrackingURLState>, replace?: boolean) => void] {
  const urlManager = URLStateManager.getInstance();
  const [state, setState] = useState<TrackingURLState>(urlManager.getState());

  useEffect(() => {
    const unsubscribe = urlManager.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [urlManager]);

  const updateState = (newState: Partial<TrackingURLState>, replace: boolean = false) => {
    urlManager.setState(newState, replace);
  };

  return [state, updateState];
}

// React hook for shareable URLs
export function useShareableURL() {
  const urlManager = URLStateManager.getInstance();

  const generateShareableURL = (trackingNumber: string, trackingType?: string, view?: string) => {
    return urlManager.generateShareableURL(trackingNumber, trackingType, view);
  };

  const generateDeepLink = (trackingNumber: string, options?: {
    trackingType?: string;
    view?: string;
    concurrent?: boolean;
  }) => {
    return urlManager.generateDeepLink(trackingNumber, options);
  };

  const shareURL = async (url: string, title?: string, text?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Shipment Tracking',
          text: text || 'Check out this shipment tracking information',
          url: url,
        });
        return true;
      } catch (error) {
        console.log('Native sharing failed, falling back to clipboard');
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
      return false;
    }
  };

  return {
    generateShareableURL,
    generateDeepLink,
    shareURL,
  };
}

// React hook for browser history management
export function useBrowserHistory() {
  const urlManager = URLStateManager.getInstance();

  const goBack = () => {
    window.history.back();
  };

  const goForward = () => {
    window.history.forward();
  };

  const canGoBack = () => {
    return window.history.length > 1;
  };

  const replaceCurrentState = (state: Partial<TrackingURLState>) => {
    urlManager.setState(state, true);
  };

  const pushNewState = (state: Partial<TrackingURLState>) => {
    urlManager.setState(state, false);
  };

  return {
    goBack,
    goForward,
    canGoBack,
    replaceCurrentState,
    pushNewState,
  };
}

// Initialize URL state manager
export const urlStateManager = URLStateManager.getInstance();