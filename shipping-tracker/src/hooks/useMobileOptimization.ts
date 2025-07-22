import { useState, useEffect, useCallback } from 'react';

interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchSupported: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  devicePixelRatio: number;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface MobileOptimizationActions {
  preventZoom: () => void;
  enableZoom: () => void;
  scrollToTop: () => void;
  vibrate: (pattern?: number | number[]) => void;
  requestFullscreen: (element?: HTMLElement) => Promise<void>;
  exitFullscreen: () => Promise<void>;
  shareContent: (data: ShareData) => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

/**
 * Hook for mobile optimization and device detection
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile optimization
 */
export function useMobileOptimization(): MobileOptimizationState & MobileOptimizationActions {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait',
    touchSupported: false,
    isIOS: false,
    isAndroid: false,
    devicePixelRatio: 1,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Update device information
  const updateDeviceInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent;
    
    // Detect device type
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    
    // Detect orientation
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Detect touch support
    const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect OS
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    // Get device pixel ratio
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Calculate safe area insets (for devices with notches)
    const safeAreaInsets = {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0'),
    };

    setState({
      isMobile,
      isTablet,
      isDesktop,
      screenWidth: width,
      screenHeight: height,
      orientation,
      touchSupported,
      isIOS,
      isAndroid,
      devicePixelRatio,
      safeAreaInsets,
    });
  }, []);

  // Initialize and listen for changes
  useEffect(() => {
    updateDeviceInfo();
    
    const handleResize = () => updateDeviceInfo();
    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(updateDeviceInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateDeviceInfo]);

  // Set up CSS custom properties for safe area insets
  useEffect(() => {
    if (state.isIOS) {
      document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
      document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    }
  }, [state.isIOS]);

  // Prevent zoom (useful for forms)
  const preventZoom = useCallback(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }, []);

  // Enable zoom
  const enableZoom = useCallback(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
      );
    }
  }, []);

  // Smooth scroll to top
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // Vibrate (if supported)
  const vibrate = useCallback((pattern: number | number[] = 200) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Request fullscreen
  const requestFullscreen = useCallback(async (element?: HTMLElement) => {
    const elem = element || document.documentElement;
    
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  }, []);

  // Share content (Web Share API)
  const shareContent = useCallback(async (data: ShareData) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (error) {
        console.warn('Share failed:', error);
        // Fallback to copying URL to clipboard
        if (data.url) {
          await copyToClipboard(data.url);
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      if (data.url) {
        await copyToClipboard(data.url);
      }
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.warn('Copy to clipboard failed:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    preventZoom,
    enableZoom,
    scrollToTop,
    vibrate,
    requestFullscreen,
    exitFullscreen,
    shareContent,
    copyToClipboard,
  };
}

// Utility functions for mobile optimization
export const mobileUtils = {
  // Check if device has notch/safe area
  hasNotch: (): boolean => {
    const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
    return safeAreaTop > 0;
  },

  // Get optimal touch target size
  getTouchTargetSize: (isMobile: boolean): string => {
    return isMobile ? 'min-h-[44px] min-w-[44px]' : 'min-h-[32px] min-w-[32px]';
  },

  // Get responsive text size classes
  getResponsiveTextSize: (size: 'sm' | 'base' | 'lg' | 'xl' | '2xl'): string => {
    const sizes = {
      sm: 'text-xs sm:text-sm',
      base: 'text-sm sm:text-base',
      lg: 'text-base sm:text-lg',
      xl: 'text-lg sm:text-xl',
      '2xl': 'text-xl sm:text-2xl',
    };
    return sizes[size];
  },

  // Get responsive spacing classes
  getResponsiveSpacing: (size: 'sm' | 'base' | 'lg'): string => {
    const spacing = {
      sm: 'p-3 sm:p-4',
      base: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };
    return spacing[size];
  },

  // Check if device supports hover
  supportsHover: (): boolean => {
    return window.matchMedia('(hover: hover)').matches;
  },

  // Check if device prefers reduced motion
  prefersReducedMotion: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get optimal image sizes for responsive images
  getResponsiveImageSizes: (): string => {
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  },

  // Debounce function for performance optimization
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for scroll/resize events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
};

export default useMobileOptimization;