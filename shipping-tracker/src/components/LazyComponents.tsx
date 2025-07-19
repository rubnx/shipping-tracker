import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyMapComponent = lazy(() => import('./MapComponent/MapComponent'));
export const LazyShipmentDetailsComponent = lazy(() => import('./ShipmentDetailsComponent/ShipmentDetailsComponent'));
export const LazyTimelineComponent = lazy(() => import('./TimelineComponent/TimelineComponent'));
export const LazyShipmentDisplay = lazy(() => import('./ShipmentDisplay/ShipmentDisplay'));

// Lazy load modal components
export const LazyAccessibleModal = lazy(() => import('./Accessible/AccessibleModal'));

// Lazy load example components (for demo)
export const LazyMapExample = lazy(() => import('./MapComponent/MapExample'));