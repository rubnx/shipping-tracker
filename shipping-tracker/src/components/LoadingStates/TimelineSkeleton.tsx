import React from 'react';
import Skeleton from './Skeleton';

export interface TimelineSkeletonProps {
  itemCount?: number;
  className?: string;
}

const TimelineSkeleton: React.FC<TimelineSkeletonProps> = ({
  itemCount = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`} aria-label="Loading timeline">
      {/* Progress bar skeleton */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <Skeleton width="120px" height="16px" />
          <Skeleton width="40px" height="16px" />
        </div>
        <Skeleton width="100%" height="8px" rounded />
      </div>

      {/* Timeline items skeleton */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index} className="relative flex items-start space-x-4 pb-8 last:pb-0">
            {/* Timeline dot */}
            <div className="relative z-10">
              <Skeleton width="32px" height="32px" rounded className="border-4 border-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between mb-2">
                <Skeleton width="140px" height="18px" />
                <Skeleton width="80px" height="14px" />
              </div>
              <Skeleton width="200px" height="14px" className="mb-1" />
              <Skeleton width="160px" height="14px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineSkeleton;