// Custom React hooks for the shipping tracker application

// TODO: Uncomment these as hooks are implemented in future tasks
// export { default as useSearch } from './useSearch';
export { default as useSearchHistory, type UseSearchHistoryReturn } from './useSearchHistory';
// export { default as useDebounce } from './useDebounce';

// Media query and responsive hooks
export { 
  useMediaQuery, 
  useIsMobile, 
  useIsTablet, 
  useIsDesktop, 
  useIsTouchDevice, 
  useBreakpoint 
} from './useMediaQuery';

// Accessibility hooks
export {
  usePrefersReducedMotion,
  usePrefersHighContrast,
  useFocusTrap,
  useKeyboardNavigation,
  useScreenReader
} from './useAccessibility';