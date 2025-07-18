import React from 'react';
import Skeleton from './Skeleton';

export interface DetailsSkeletonProps {
  className?: string;
  showVessel?: boolean;
  showContainers?: boolean;
}

const DetailsSkeleton: React.FC<DetailsSkeletonProps> = ({
  className = '',
  showVessel = true,
  showContainers = true,
}) => {
  return (
    <div className={`space-y-6 ${className}`} aria-label="Loading shipment details">
      {/* Header section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton width="180px" height="24px" />
          <Skeleton width="80px" height="20px" rounded />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Skeleton width="60px" height="14px" className="mb-2" />
            <Skeleton width="120px" height="16px" />
          </div>
          <div>
            <Skeleton width="50px" height="14px" className="mb-2" />
            <Skeleton width="100px" height="16px" />
          </div>
          <div>
            <Skeleton width="70px" height="14px" className="mb-2" />
            <Skeleton width="140px" height="16px" />
          </div>
        </div>
      </div>

      {/* Route information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton width="120px" height="20px" className="mb-4" />
        
        <div className="flex items-center justify-between">
          <div className="text-center">
            <Skeleton width="80px" height="16px" className="mb-2" />
            <Skeleton width="100px" height="14px" className="mb-1" />
            <Skeleton width="60px" height="12px" />
          </div>
          
          <div className="flex-1 mx-4">
            <Skeleton width="100%" height="2px" />
          </div>
          
          <div className="text-center">
            <Skeleton width="80px" height="16px" className="mb-2" />
            <Skeleton width="100px" height="14px" className="mb-1" />
            <Skeleton width="60px" height="12px" />
          </div>
        </div>
      </div>

      {/* Vessel information */}
      {showVessel && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton width="140px" height="20px" className="mb-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Skeleton width="80px" height="14px" className="mb-2" />
              <Skeleton width="160px" height="16px" />
            </div>
            <div>
              <Skeleton width="60px" height="14px" className="mb-2" />
              <Skeleton width="120px" height="16px" />
            </div>
            <div>
              <Skeleton width="40px" height="14px" className="mb-2" />
              <Skeleton width="100px" height="16px" />
            </div>
            <div>
              <Skeleton width="90px" height="14px" className="mb-2" />
              <Skeleton width="140px" height="16px" />
            </div>
          </div>
        </div>
      )}

      {/* Container information */}
      {showContainers && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton width="120px" height="20px" className="mb-4" />
          
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton width="140px" height="16px" />
                  <Skeleton width="60px" height="14px" />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Skeleton width="40px" height="12px" className="mb-1" />
                    <Skeleton width="50px" height="14px" />
                  </div>
                  <div>
                    <Skeleton width="50px" height="12px" className="mb-1" />
                    <Skeleton width="60px" height="14px" />
                  </div>
                  <div>
                    <Skeleton width="60px" height="12px" className="mb-1" />
                    <Skeleton width="80px" height="14px" />
                  </div>
                  <div>
                    <Skeleton width="50px" height="12px" className="mb-1" />
                    <Skeleton width="70px" height="14px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailsSkeleton;