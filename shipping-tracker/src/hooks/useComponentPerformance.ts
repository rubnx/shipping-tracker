import { useRef, useEffect } from 'react';

/**
 * Custom hook for tracking component performance
 * @param componentName Name of the component
 * @param trackProps Whether to track prop changes
 * @returns Object with performance tracking methods
 */
export function useComponentPerformance(
  componentName: string,
  trackProps: boolean = false
) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const lastProps = useRef<Record<string, any>>({});

  // Track render time
  useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
    }
    
    lastRenderTime.current = performance.now();
  });

  // Track prop changes
  const trackPropChanges = (props: Record<string, any>) => {
    if (!trackProps) return;

    const changedProps: string[] = [];
    Object.keys(props).forEach((key) => {
      if (props[key] !== lastProps.current[key]) {
        changedProps.push(key);
      }
    });

    if (changedProps.length > 0 && renderCount.current > 1) {
      console.log(
        `[Performance] ${componentName} re-rendered due to prop changes:`,
        changedProps
      );
    }

    lastProps.current = { ...props };
  };

  return {
    renderCount: renderCount.current,
    trackPropChanges,
    markInteraction: (name: string) => {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${componentName}-${name} took ${duration.toFixed(2)}ms`);
        }
      };
    },
  };
}