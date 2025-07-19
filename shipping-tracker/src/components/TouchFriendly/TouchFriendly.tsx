import React, { useRef, useEffect, type ReactNode } from 'react';
import { useIsTouchDevice } from '../../hooks';

interface TouchFriendlyProps {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  disabled?: boolean;
  longPressDelay?: number;
  swipeThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isLongPress: boolean;
  longPressTimer: NodeJS.Timeout | null;
  lastTap: number;
}

const TouchFriendly: React.FC<TouchFriendlyProps> = ({
  children,
  className = '',
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  disabled = false,
  longPressDelay = 500,
  swipeThreshold = 50,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isLongPress: false,
    longPressTimer: null,
    lastTap: 0,
  });
  
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled || !isTouch) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const state = touchState.current;
      
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.startTime = Date.now();
      state.isLongPress = false;
      
      // Clear any existing long press timer
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
      
      // Set up long press detection
      if (onLongPress) {
        state.longPressTimer = setTimeout(() => {
          state.isLongPress = true;
          onLongPress();
        }, longPressDelay);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const state = touchState.current;
      
      const deltaX = Math.abs(touch.clientX - state.startX);
      const deltaY = Math.abs(touch.clientY - state.startY);
      
      // If user moves finger significantly, cancel long press
      if ((deltaX > 10 || deltaY > 10) && state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const state = touchState.current;
      const now = Date.now();
      
      // Clear long press timer
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }
      
      // Don't process tap if it was a long press
      if (state.isLongPress) {
        return;
      }
      
      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const deltaTime = now - state.startTime;
      
      // Check for swipe gestures
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > swipeThreshold || absY > swipeThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
        return;
      }
      
      // Check for tap gestures (quick touch with minimal movement)
      if (absX < 10 && absY < 10 && deltaTime < 300) {
        const timeSinceLastTap = now - state.lastTap;
        
        if (timeSinceLastTap < 300 && onDoubleTap) {
          // Double tap
          onDoubleTap();
          state.lastTap = 0; // Reset to prevent triple tap
        } else {
          // Single tap
          if (onTap) {
            onTap();
          }
          state.lastTap = now;
        }
      }
    };

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }
    };
  }, [
    disabled,
    isTouch,
    onTap,
    onDoubleTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    longPressDelay,
    swipeThreshold,
  ]);

  return (
    <div
      ref={elementRef}
      className={`${className} ${isTouch ? 'touch-friendly' : ''}`}
      style={{
        touchAction: disabled ? 'auto' : 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
    </div>
  );
};

export default TouchFriendly;