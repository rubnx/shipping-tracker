import React, { useState, useEffect, useRef } from 'react';
import { useMobileOptimization, mobileUtils } from '../../hooks/useMobileOptimization';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  enableSwipeGestures?: boolean;
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  headerActions?: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  stickyHeader?: boolean;
  fullHeight?: boolean;
}

/**
 * Mobile-responsive layout component with touch optimizations
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile experience optimization
 */
export function MobileResponsiveLayout({
  children,
  className = '',
  enableSwipeGestures = false,
  enablePullToRefresh = false,
  onRefresh,
  showBackButton = false,
  onBack,
  title,
  headerActions,
  bottomNavigation,
  stickyHeader = true,
  fullHeight = false,
}: MobileResponsiveLayoutProps) {
  const mobile = useMobileOptimization();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pullThreshold = 80;
  const swipeThreshold = 50;

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      setHeaderHeight(height);
    }
  }, [title, headerActions]);

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!mobile.touchSupported) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setPullDistance(0);
    setSwipeDirection(null);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !mobile.touchSupported) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Handle pull to refresh
    if (enablePullToRefresh && deltaY > 0 && window.scrollY === 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, pullThreshold * 1.5);
      setPullDistance(distance);
      
      // Provide haptic feedback at threshold
      if (distance >= pullThreshold && pullDistance < pullThreshold) {
        mobile.vibrate(50);
      }
    }
    
    // Handle swipe gestures
    if (enableSwipeGestures && Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < 50) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      
      // Provide haptic feedback
      if (!swipeDirection) {
        mobile.vibrate(30);
      }
    }
  };

  // Handle touch end
  const handleTouchEnd = async () => {
    if (!touchStart) return;
    
    // Handle pull to refresh
    if (enablePullToRefresh && pullDistance >= pullThreshold && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        mobile.vibrate([50, 50, 50]); // Success vibration
      } catch (error) {
        console.error('Refresh failed:', error);
        mobile.vibrate(200); // Error vibration
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Handle swipe gestures
    if (enableSwipeGestures && swipeDirection) {
      if (swipeDirection === 'right' && onBack) {
        onBack();
      }
      // Add more swipe actions as needed
    }
    
    // Reset state
    setTouchStart(null);
    setPullDistance(0);
    setSwipeDirection(null);
  };

  // Get container classes
  const getContainerClasses = () => {
    const baseClasses = 'relative';
    const heightClasses = fullHeight ? 'min-h-screen' : 'min-h-full';
    const safeAreaClasses = mobile.isIOS ? 'pb-safe-area-inset-bottom' : '';
    
    return `${baseClasses} ${heightClasses} ${safeAreaClasses} ${className}`;
  };

  // Get header classes
  const getHeaderClasses = () => {
    const baseClasses = 'bg-white border-b border-gray-200 z-10';
    const stickyClasses = stickyHeader ? 'sticky top-0' : '';
    const safeAreaClasses = mobile.isIOS ? 'pt-safe-area-inset-top' : '';
    const shadowClasses = mobile.isMobile ? 'shadow-sm' : 'shadow-none';
    
    return `${baseClasses} ${stickyClasses} ${safeAreaClasses} ${shadowClasses}`;
  };

  // Get content classes
  const getContentClasses = () => {
    const baseClasses = 'flex-1';
    const paddingClasses = mobile.isMobile ? 'px-4' : 'px-6';
    const bottomPaddingClasses = bottomNavigation ? 'pb-16' : 'pb-4';
    
    return `${baseClasses} ${paddingClasses} ${bottomPaddingClasses}`;
  };

  // Get pull to refresh indicator
  const getPullToRefreshIndicator = () => {
    if (!enablePullToRefresh || pullDistance === 0) return null;
    
    const progress = Math.min(pullDistance / pullThreshold, 1);
    const rotation = progress * 360;
    const opacity = Math.min(progress * 2, 1);
    
    return (
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-200"
        style={{ 
          transform: `translateX(-50%) translateY(${pullDistance - 40}px)`,
          opacity 
        }}
      >
        <div className="bg-white rounded-full p-2 shadow-lg border border-gray-200">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg 
              className="w-6 h-6 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
        {progress >= 1 && !isRefreshing && (
          <div className="text-xs text-gray-600 text-center mt-1 whitespace-nowrap">
            Release to refresh
          </div>
        )}
      </div>
    );
  };

  // Get swipe indicator
  const getSwipeIndicator = () => {
    if (!enableSwipeGestures || !swipeDirection) return null;
    
    return (
      <div className="fixed inset-0 pointer-events-none z-30 flex items-center">
        <div 
          className={`absolute transition-all duration-200 ${
            swipeDirection === 'right' ? 'left-4' : 'right-4'
          }`}
        >
          <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-full flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {swipeDirection === 'right' ? (
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              )}
            </svg>
            <span className="text-sm">
              {swipeDirection === 'right' ? 'Back' : 'Forward'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={getContainerClasses()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {getPullToRefreshIndicator()}
      
      {/* Swipe indicator */}
      {getSwipeIndicator()}
      
      {/* Header */}
      {(title || showBackButton || headerActions) && (
        <header ref={headerRef} className={getHeaderClasses()}>
          <div className={`flex items-center justify-between ${mobileUtils.getResponsiveSpacing('sm')}`}>
            {/* Left side */}
            <div className="flex items-center space-x-3">
              {showBackButton && (
                <button
                  onClick={onBack}
                  className={`${mobileUtils.getTouchTargetSize(mobile.isMobile)} flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors`}
                  aria-label="Go back"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              {title && (
                <h1 className={`font-semibold text-gray-900 truncate ${mobileUtils.getResponsiveTextSize('lg')}`}>
                  {title}
                </h1>
              )}
            </div>
            
            {/* Right side */}
            {headerActions && (
              <div className="flex items-center space-x-2">
                {headerActions}
              </div>
            )}
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main 
        ref={contentRef}
        className={getContentClasses()}
        style={{
          paddingTop: stickyHeader && headerHeight > 0 ? `${headerHeight}px` : undefined,
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </main>
      
      {/* Bottom navigation */}
      {bottomNavigation && (
        <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 ${mobile.isIOS ? 'pb-safe-area-inset-bottom' : ''}`}>
          {bottomNavigation}
        </nav>
      )}
      
      {/* Scroll to top button */}
      {mobile.isMobile && (
        <button
          onClick={mobile.scrollToTop}
          className="fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-20"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default MobileResponsiveLayout;