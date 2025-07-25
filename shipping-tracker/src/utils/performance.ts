/**
 * Performance optimization utilities
 * Implements code splitting, lazy loading, and bundle optimization
 */

import { lazy, ComponentType } from 'react';

// Lazy loading utility for components
export const lazyLoad = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback ? <fallback /> : <div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Image optimization utility
export const optimizeImage = (src: string, width?: number, height?: number) => {
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', '80'); // Quality
  params.set('f', 'webp'); // Format
  
  return `${src}?${params.toString()}`;
};

// Bundle size monitoring
export const trackBundleSize = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entries = performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      const entry = entries[0] as PerformanceNavigationTiming;
      console.log('Bundle load time:', entry.loadEventEnd - entry.fetchStart);
    }
  }
};

// Code splitting for routes
export const createAsyncRoute = (importFunc: () => Promise<any>) => {
  return lazy(importFunc);
};