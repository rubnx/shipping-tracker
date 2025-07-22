import React, { useState, useRef, useEffect } from 'react';
import type { TimelineComponentProps, TimelineEvent } from '../../types';
import { useSwipeGesture } from '../../hooks/useMobileGestures';

interface SwipeableTimelineProps extends TimelineComponentProps {
  enableSwipeNavigation?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  startTime: number;
}

/**
 * Timeline component with swipe gesture support for mobile navigation
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile touch support and gestures
 */
export function SwipeableTimeline({
  events,
  completionPercentage,
  isLoading = false,
  className = '',
  showProgress = true,
  compact = false,
  enableSwipeNavigation = true,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 50,
}: SwipeableTimelineProps) {
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort events by timestamp
  const sortedEvents = events ? [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  ) : [];

  // Find current active event
  const activeEventIndex = sortedEvents.findIndex(event => event.isCurrentStatus);
  const activeEvent = activeEventIndex >= 0 ? sortedEvents[activeEventIndex] : null;

  // Enhanced swipe gesture handling
  const { touchHandlers } = useSwipeGesture(
    (direction) => {
      if (!enableSwipeNavigation || sortedEvents.length <= 1) return;
      
      if (direction === 'left') {
        handleSwipeLeft();
      } else if (direction === 'right') {
        handleSwipeRight();
      }
    },
    {
      swipeThreshold,
      swipeVelocityThreshold: 0.3,
      preventDefault: true,
    }
  );

  // Handle swipe left (next event)
  const handleSwipeLeft = () => {
    if (currentEventIndex < sortedEvents.length - 1) {
      setIsAnimating(true);
      setCurrentEventIndex(prev => prev + 1);
      onSwipeLeft?.();
      
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Handle swipe right (previous event)
  const handleSwipeRight = () => {
    if (currentEventIndex > 0) {
      setIsAnimating(true);
      setCurrentEventIndex(prev => prev - 1);
      onSwipeRight?.();
      
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Format date for mobile display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 sm:p-6 ${className}`}>
        <div className=\"animate-pulse\">
          <div className=\"h-4 bg-gray-200 rounded w-1/4 mb-4\"></div>
          <div className=\"space-y-4\">
            {[...Array(3)].map((_, i) => (
              <div key={i} className=\"flex items-start space-x-4\">
                <div className=\"w-8 h-8 bg-gray-200 rounded-full\"></div>
                <div className=\"flex-1 space-y-2\">
                  <div className=\"h-3 bg-gray-200 rounded w-3/4\"></div>
                  <div className=\"h-2 bg-gray-200 rounded w-1/2\"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!sortedEvents || sortedEvents.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 sm:p-6 ${className}`}>
        <div className=\"text-center text-gray-500\">
          <div className=\"w-12 h-12 mx-auto mb-4 text-gray-300\">
            <svg fill=\"currentColor\" viewBox=\"0 0 20 20\">
              <path
                fillRule=\"evenodd\"
                d=\"M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z\"
                clipRule=\"evenodd\"
              />
            </svg>
          </div>
          <p>No tracking events available</p>
        </div>
      </div>
    );
  }

  // Mobile compact view with swipe navigation
  if (compact && enableSwipeNavigation) {
    const currentEvent = sortedEvents[currentEventIndex];
    
    return (
      <div 
        ref={containerRef}
        className={`bg-white rounded-lg shadow-sm border ${className}`}
        {...touchHandlers}
      >
        {/* Header */}
        <div className=\"p-4 border-b border-gray-100\">
          <div className=\"flex items-center justify-between mb-3\">
            <h2 className=\"text-base font-semibold text-gray-900\">
              Timeline
            </h2>
            <div className=\"flex items-center space-x-2 text-sm text-gray-500\">
              <span>{currentEventIndex + 1}</span>
              <span>/</span>
              <span>{sortedEvents.length}</span>
            </div>
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div className=\"space-y-2\">
              <div className=\"flex justify-between text-sm\">
                <span className=\"text-gray-600\">Progress</span>
                <span className=\"font-medium text-gray-900\">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <div className=\"w-full bg-gray-200 rounded-full h-2\">
                <div
                  className=\"bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out\"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Current Event Display */}
        <div 
          ref={timelineRef}
          className={`p-4 transition-all duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}
        >
          {currentEvent && (
            <div className=\"space-y-3\">
              {/* Event Status */}
              <div className=\"flex items-center space-x-3\">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    currentEvent.isCurrentStatus
                      ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100'
                      : currentEvent.isCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {currentEvent.isCompleted && !currentEvent.isCurrentStatus && (
                    <svg className=\"w-4 h-4 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                      <path
                        fillRule=\"evenodd\"
                        d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\"
                        clipRule=\"evenodd\"
                      />
                    </svg>
                  )}
                  {currentEvent.isCurrentStatus && (
                    <div className=\"w-3 h-3 bg-white rounded-full animate-pulse\" />
                  )}
                </div>
                
                <div className=\"flex-1\">
                  <h3 className={`text-base font-medium ${
                    currentEvent.isCurrentStatus ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {currentEvent.status}
                  </h3>
                  <p className=\"text-sm text-gray-600 mt-1\">
                    {currentEvent.description}
                  </p>
                </div>
              </div>

              {/* Event Details */}
              <div className=\"bg-gray-50 rounded-lg p-3 space-y-2\">
                <div className=\"flex items-center justify-between text-sm\">
                  <span className=\"text-gray-600\">Date & Time</span>
                  <span className=\"font-medium text-gray-900\">
                    {formatDate(currentEvent.timestamp)}
                  </span>
                </div>
                
                {currentEvent.location && (
                  <div className=\"flex items-center justify-between text-sm\">
                    <span className=\"text-gray-600\">Location</span>
                    <span className=\"font-medium text-gray-900 text-right\">
                      {currentEvent.location}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Dots */}
        <div className=\"px-4 pb-4\">
          <div className=\"flex justify-center space-x-2\">
            {sortedEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentEventIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-200 touch-manipulation ${
                  index === currentEventIndex
                    ? 'bg-blue-500'
                    : index <= activeEventIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
                aria-label={`Go to event ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Swipe Hint */}
        {sortedEvents.length > 1 && (
          <div className=\"px-4 pb-3\">
            <p className=\"text-xs text-gray-500 text-center\">
              👈 Swipe to navigate between events 👉
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default timeline view (non-swipeable)
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header with progress */}
      <div className=\"p-4 sm:p-6 border-b border-gray-100\">
        <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4\">
          <h2 className=\"text-lg font-semibold text-gray-900 mb-2 sm:mb-0\">
            Shipment Timeline
          </h2>
          {activeEvent && (
            <div className=\"flex items-center space-x-2\">
              <div className=\"w-2 h-2 bg-blue-500 rounded-full animate-pulse\"></div>
              <span className=\"text-sm font-medium text-blue-600\">
                {activeEvent.status}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className=\"space-y-2\">
            <div className=\"flex justify-between text-sm\">
              <span className=\"text-gray-600\">Progress</span>
              <span className=\"font-medium text-gray-900\">
                {Math.round(completionPercentage)}%
              </span>
            </div>
            <div className=\"w-full bg-gray-200 rounded-full h-2\">
              <div
                className=\"bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out\"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline events */}
      <div className=\"p-4 sm:p-6\">
        <div className=\"space-y-6\">
          {sortedEvents.map((event, index) => (
            <div key={event.id} className=\"relative flex items-start\">
              {/* Timeline line */}
              {index < sortedEvents.length - 1 && (
                <div 
                  className={`absolute left-4 top-8 w-0.5 h-full ${
                    event.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
              
              {/* Timeline dot */}
              <div className=\"relative flex-shrink-0\">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    event.isCurrentStatus
                      ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100'
                      : event.isCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {event.isCompleted && !event.isCurrentStatus && (
                    <svg className=\"w-4 h-4 text-white\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                      <path
                        fillRule=\"evenodd\"
                        d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\"
                        clipRule=\"evenodd\"
                      />
                    </svg>
                  )}
                  {event.isCurrentStatus && (
                    <div className=\"w-3 h-3 bg-white rounded-full animate-pulse\" />
                  )}
                </div>
              </div>

              {/* Timeline content */}
              <div className=\"ml-4 flex-1 min-w-0\">
                <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between\">
                  <div className=\"flex-1\">
                    <h3 className={`text-sm font-medium ${
                      event.isCurrentStatus ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {event.status}
                    </h3>
                    <p className=\"text-sm text-gray-600 mt-1\">
                      {event.description}
                    </p>
                    {event.location && (
                      <p className=\"text-xs text-gray-500 mt-1\">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                  
                  <div className=\"mt-2 sm:mt-0 sm:ml-4 flex-shrink-0\">
                    <time className=\"text-xs text-gray-500\">
                      {formatDate(event.timestamp)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with last update */}
      <div className=\"px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg\">
        <p className=\"text-xs text-gray-500 text-center\">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default SwipeableTimeline;"