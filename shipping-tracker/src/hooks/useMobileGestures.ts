import { useRef, useEffect, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

interface GestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPan?: (delta: { x: number; y: number }, point: TouchPoint) => void;
  onPanStart?: (point: TouchPoint) => void;
  onPanEnd?: (point: TouchPoint) => void;
}

interface GestureOptions {
  swipeThreshold?: number;
  swipeVelocityThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  panThreshold?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Hook for handling mobile gestures with comprehensive touch support
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile touch gestures
 */
export function useMobileGestures(
  handlers: GestureHandlers,
  options: GestureOptions = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 0.1,
    panThreshold = 10,
    preventDefault = false,
    stopPropagation = false,
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPanningRef = useRef(false);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const lastPinchScaleRef = useRef(1);

  // Helper function to get touch point
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now(),
  }), []);

  // Helper function to calculate distance between two points
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to calculate distance between two touches
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to get center point between two touches
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  }), []);

  // Helper function to determine swipe direction
  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch
      const touchPoint = getTouchPoint(touches[0]);
      touchStartRef.current = touchPoint;
      isPanningRef.current = false;

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current && handlers.onLongPress) {
          handlers.onLongPress(touchStartRef.current);
        }
      }, longPressDelay);

      // Handle pan start
      if (handlers.onPanStart) {
        handlers.onPanStart(touchPoint);
      }
    } else if (touches.length === 2) {
      // Two touches - potential pinch
      clearLongPressTimer();
      const distance = getTouchDistance(touches[0], touches[1]);
      initialPinchDistanceRef.current = distance;
      lastPinchScaleRef.current = 1;
    }
  }, [
    preventDefault,
    stopPropagation,
    getTouchPoint,
    longPressDelay,
    handlers.onLongPress,
    handlers.onPanStart,
    clearLongPressTimer,
    getTouchDistance,
  ]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    const touches = event.touches;
    
    if (touches.length === 1 && touchStartRef.current) {
      // Single touch - potential pan or swipe
      const currentPoint = getTouchPoint(touches[0]);
      const distance = getDistance(touchStartRef.current, currentPoint);
      
      if (distance > panThreshold) {
        clearLongPressTimer();
        
        if (!isPanningRef.current) {
          isPanningRef.current = true;
        }
        
        if (handlers.onPan) {
          const delta = {
            x: currentPoint.x - touchStartRef.current.x,
            y: currentPoint.y - touchStartRef.current.y,
          };
          handlers.onPan(delta, currentPoint);
        }
      }
    } else if (touches.length === 2 && initialPinchDistanceRef.current && handlers.onPinch) {
      // Two touches - pinch gesture
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / initialPinchDistanceRef.current;
      
      if (Math.abs(scale - lastPinchScaleRef.current) > pinchThreshold) {
        const center = getTouchCenter(touches[0], touches[1]);
        handlers.onPinch({ scale, center });
        lastPinchScaleRef.current = scale;
      }
    }
  }, [
    preventDefault,
    stopPropagation,
    getTouchPoint,
    getDistance,
    panThreshold,
    clearLongPressTimer,
    handlers.onPan,
    getTouchDistance,
    pinchThreshold,
    getTouchCenter,
    handlers.onPinch,
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    clearLongPressTimer();
    
    const touches = event.changedTouches;
    
    if (touches.length === 1 && touchStartRef.current) {
      const touchPoint = getTouchPoint(touches[0]);
      touchEndRef.current = touchPoint;
      
      if (isPanningRef.current) {
        // End panning
        if (handlers.onPanEnd) {
          handlers.onPanEnd(touchPoint);
        }
        isPanningRef.current = false;
      } else {
        // Check for swipe
        const distance = getDistance(touchStartRef.current, touchPoint);
        const duration = touchPoint.timestamp - touchStartRef.current.timestamp;
        const velocity = distance / duration;
        
        if (distance > swipeThreshold && velocity > swipeVelocityThreshold && handlers.onSwipe) {
          const direction = getSwipeDirection(touchStartRef.current, touchPoint);
          handlers.onSwipe({ direction, distance, velocity, duration });
        } else {
          // Check for tap or double tap
          const now = Date.now();
          
          if (lastTapRef.current && 
              now - lastTapRef.current.timestamp < doubleTapDelay &&
              getDistance(lastTapRef.current, touchPoint) < 30) {
            // Double tap
            if (handlers.onDoubleTap) {
              handlers.onDoubleTap(touchPoint);
            }
            lastTapRef.current = null;
          } else {
            // Single tap
            if (handlers.onTap) {
              handlers.onTap(touchPoint);
            }
            lastTapRef.current = touchPoint;
          }
        }
      }
    }
    
    // Reset pinch state
    if (event.touches.length < 2) {
      initialPinchDistanceRef.current = null;
      lastPinchScaleRef.current = 1;
    }
    
    // Reset touch state if no more touches
    if (event.touches.length === 0) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      isPanningRef.current = false;
    }
  }, [
    preventDefault,
    stopPropagation,
    clearLongPressTimer,
    getTouchPoint,
    handlers.onPanEnd,
    getDistance,
    swipeThreshold,
    swipeVelocityThreshold,
    handlers.onSwipe,
    getSwipeDirection,
    doubleTapDelay,
    handlers.onDoubleTap,
    handlers.onTap,
  ]);

  // Handle touch cancel
  const handleTouchCancel = useCallback((event: TouchEvent) => {
    if (preventDefault) event.preventDefault();
    if (stopPropagation) event.stopPropagation();

    clearLongPressTimer();
    touchStartRef.current = null;
    touchEndRef.current = null;
    isPanningRef.current = false;
    initialPinchDistanceRef.current = null;
    lastPinchScaleRef.current = 1;
  }, [preventDefault, stopPropagation, clearLongPressTimer]);

  // Cleanup function
  const cleanup = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // Return event handlers and utilities
  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    cleanup,
    isActive: touchStartRef.current !== null,
    isPanning: isPanningRef.current,
  };
}

/**
 * Hook for handling swipe gestures specifically
 */
export function useSwipeGesture(
  onSwipe: (direction: SwipeGesture['direction']) => void,
  options: Pick<GestureOptions, 'swipeThreshold' | 'swipeVelocityThreshold' | 'preventDefault'> = {}
) {
  return useMobileGestures(
    {
      onSwipe: (gesture) => onSwipe(gesture.direction),
    },
    options
  );
}

/**
 * Hook for handling pinch gestures specifically
 */
export function usePinchGesture(
  onPinch: (scale: number) => void,
  options: Pick<GestureOptions, 'pinchThreshold' | 'preventDefault'> = {}
) {
  return useMobileGestures(
    {
      onPinch: (gesture) => onPinch(gesture.scale),
    },
    options
  );
}

/**
 * Hook for handling pan gestures specifically
 */
export function usePanGesture(
  onPan: (delta: { x: number; y: number }) => void,
  options: Pick<GestureOptions, 'panThreshold' | 'preventDefault'> = {}
) {
  return useMobileGestures(
    {
      onPan: (delta) => onPan(delta),
    },
    options
  );
}

/**
 * Hook for handling tap gestures specifically
 */
export function useTapGesture(
  onTap: () => void,
  onDoubleTap?: () => void,
  options: Pick<GestureOptions, 'doubleTapDelay' | 'preventDefault'> = {}
) {
  return useMobileGestures(
    {
      onTap: () => onTap(),
      onDoubleTap: onDoubleTap ? () => onDoubleTap() : undefined,
    },
    options
  );
}

export default useMobileGestures;