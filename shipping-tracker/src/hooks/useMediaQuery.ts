import { useState, useEffect } from 'react';

/**
 * Custom hook to detect media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);
    
    // Create listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }
    
    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // Fallback for older browsers
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
};

/**
 * Hook to detect if the device is mobile (screen width < 768px)
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 767px)');
};

/**
 * Hook to detect if the device is tablet (screen width between 768px and 1023px)
 */
export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
};

/**
 * Hook to detect if the device is desktop (screen width >= 1024px)
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1024px)');
};

/**
 * Hook to detect touch device capability
 */
export const useIsTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - for older browsers
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouch(checkTouch());
  }, []);

  return isTouch;
};

/**
 * Hook to get current breakpoint
 */
export const useBreakpoint = (): 'mobile' | 'tablet' | 'desktop' => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
};