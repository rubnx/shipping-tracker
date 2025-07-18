import React from 'react';
import type { TimelineComponentProps, TimelineEvent } from '../../types';

interface TimelineItemProps {
  event: TimelineEvent;
  isLast: boolean;
  isActive: boolean;
  showTime?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ 
  event, 
  isLast, 
  isActive, 
  showTime = true 
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="relative flex items-start pb-6 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div 
          className={`absolute left-4 top-8 w-0.5 h-full ${
            event.isCompleted ? 'bg-green-500' : 'bg-gray-200'
          }`}
        />
      )}
      
      {/* Timeline dot */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
            isActive
              ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100'
              : event.isCompleted
              ? 'bg-green-500 border-green-500'
              : 'bg-white border-gray-300'
          }`}
        >
          {event.isCompleted && !isActive && (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {isActive && (
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Timeline content */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${
              isActive ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {event.status}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {event.description}
            </p>
            {event.location && (
              <p className="text-xs text-gray-500 mt-1">
                📍 {event.location}
              </p>
            )}
          </div>
          
          {showTime && (
            <div className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
              <time className="text-xs text-gray-500">
                {formatDate(event.timestamp)}
              </time>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineComponent: React.FC<TimelineComponentProps> = ({
  events,
  completionPercentage,
  isLoading = false,
  className = '',
  showProgress = true,
  compact = false,
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p>No tracking events available</p>
        </div>
      </div>
    );
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find current active event
  const currentEventIndex = sortedEvents.findIndex(event => event.isCurrentStatus);
  const activeEvent = currentEventIndex >= 0 ? sortedEvents[currentEventIndex] : null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header with progress */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
            Shipment Timeline
          </h2>
          {activeEvent && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-600">
                {activeEvent.status}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-900">
                {Math.round(completionPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline events */}
      <div className={`${compact ? 'p-4' : 'p-4 sm:p-6'}`}>
        <div className="space-y-0">
          {sortedEvents.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={index === sortedEvents.length - 1}
              isActive={event.isCurrentStatus}
              showTime={!compact}
            />
          ))}
        </div>
      </div>

      {/* Footer with last update */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default TimelineComponent;