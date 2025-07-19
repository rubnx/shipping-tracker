import { useEffect } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface PerformanceMonitorProps {
  onMetrics?: (metrics: Partial<PerformanceMetrics>) => void;
  enableLogging?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onMetrics,
  enableLogging = false,
}) => {
  useEffect(() => {
    const collectMetrics = () => {
      const metrics: Partial<PerformanceMetrics> = {};

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      }

      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = entry.startTime;
        }
      });

      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.largestContentfulPaint = lastEntry.startTime;
            
            if (enableLogging) {
              console.log('LCP:', metrics.largestContentfulPaint);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // CLS (Cumulative Layout Shift)
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            metrics.cumulativeLayoutShift = clsValue;
            
            if (enableLogging) {
              console.log('CLS:', metrics.cumulativeLayoutShift);
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // FID (First Input Delay)
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
              
              if (enableLogging) {
                console.log('FID:', metrics.firstInputDelay);
              }
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cleanup observers after 30 seconds
          setTimeout(() => {
            lcpObserver.disconnect();
            clsObserver.disconnect();
            fidObserver.disconnect();
          }, 30000);
        } catch (error) {
          if (enableLogging) {
            console.warn('Performance Observer not supported:', error);
          }
        }
      }

      // Report metrics
      if (onMetrics) {
        onMetrics(metrics);
      }

      if (enableLogging) {
        console.group('Performance Metrics');
        console.log('Page Load Time:', metrics.pageLoadTime, 'ms');
        console.log('DOM Content Loaded:', metrics.domContentLoaded, 'ms');
        console.log('First Contentful Paint:', metrics.firstContentfulPaint, 'ms');
        console.groupEnd();
      }
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 0);
    } else {
      window.addEventListener('load', collectMetrics);
    }

    return () => {
      window.removeEventListener('load', collectMetrics);
    };
  }, [onMetrics, enableLogging]);

  // Monitor resource loading
  useEffect(() => {
    if (!enableLogging) return;

    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Log slow resources (> 1 second)
        if (resource.duration > 1000) {
          console.warn(`Slow resource: ${resource.name} took ${resource.duration.toFixed(2)}ms`);
        }
      }
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource timing not supported:', error);
    }

    return () => {
      resourceObserver.disconnect();
    };
  }, [enableLogging]);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;