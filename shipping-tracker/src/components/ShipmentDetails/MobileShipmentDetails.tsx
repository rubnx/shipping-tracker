import { useState } from 'react';
import type { ShipmentDetailsProps } from '../../types';

interface MobileShipmentDetailsProps extends ShipmentDetailsProps {
  enableSwipeActions?: boolean;
  onShare?: () => void;
  onSave?: () => void;
  onRefresh?: () => void;
}

/**
 * Mobile-optimized shipment details component with collapsible sections
 * Implements Requirements 4.1, 4.2, 4.3, 4.4 for mobile responsiveness
 */
export function MobileShipmentDetails({
  shipment,
  isLoading = false,
  className = '',
  enableSwipeActions = true,
  onShare,
  onSave,
  onRefresh,
}: MobileShipmentDetailsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in transit':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delayed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'exception':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No shipment data
  if (!shipment) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Shipment Data</h3>
        <p className="text-gray-500">Enter a tracking number to view shipment details.</p>
      </div>
    );
  }

  const CollapsibleSection = ({ 
    id, 
    title, 
    icon, 
    children, 
    defaultExpanded = false 
  }: { 
    id: string; 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    defaultExpanded?: boolean;
  }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-4 py-4 flex items-center justify-between text-left touch-manipulation"
        >
          <div className="flex items-center space-x-3">
            <div className="text-gray-400">{icon}</div>
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 animate-fadeIn">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      {/* Header with Actions */}
      <div className="px-4 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Shipment Details</h2>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 touch-manipulation"
                aria-label="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="p-2 text-gray-400 hover:text-gray-600 touch-manipulation"
                aria-label="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(shipment.status)}`}>
            {shipment.status}
          </span>
          {shipment.estimatedDelivery && (
            <span className="text-sm text-gray-600">
              ETA: {formatDate(shipment.estimatedDelivery)}
            </span>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="divide-y divide-gray-100">
        {/* Overview Section */}
        <CollapsibleSection
          id="overview"
          title="Overview"
          defaultExpanded={true}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Tracking Number</span>
              <span className="text-sm font-mono font-medium text-gray-900">{shipment.trackingNumber}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Carrier</span>
              <span className="text-sm font-medium text-gray-900">{shipment.carrier}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Service Type</span>
              <span className="text-sm font-medium text-gray-900">{shipment.serviceType || 'Standard'}</span>
            </div>
            {shipment.weight && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Weight</span>
                <span className="text-sm font-medium text-gray-900">{shipment.weight}</span>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Origin & Destination */}
        <CollapsibleSection
          id="locations"
          title="Origin & Destination"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        >
          <div className="space-y-4">
            {shipment.origin && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Origin</span>
                </div>
                <p className="text-sm text-green-700">{shipment.origin}</p>
              </div>
            )}
            
            {shipment.destination && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">Destination</span>
                </div>
                <p className="text-sm text-blue-700">{shipment.destination}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Container Information */}
        {shipment.containers && shipment.containers.length > 0 && (
          <CollapsibleSection
            id="containers"
            title="Container Information"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          >
            <div className="space-y-3">
              {shipment.containers.map((container, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Container #</span>
                      <p className="font-mono font-medium text-gray-900">{container.number}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Size</span>
                      <p className="font-medium text-gray-900">{container.size}</p>
                    </div>
                    {container.sealNumber && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Seal Number</span>
                        <p className="font-mono font-medium text-gray-900">{container.sealNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Vessel Information */}
        {shipment.vessel && (
          <CollapsibleSection
            id="vessel"
            title="Vessel Information"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-600">Vessel Name</span>
                  <span className="font-medium text-blue-900">{shipment.vessel.name}</span>
                </div>
                {shipment.vessel.voyage && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Voyage</span>
                    <span className="font-medium text-blue-900">{shipment.vessel.voyage}</span>
                  </div>
                )}
                {shipment.vessel.eta && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">ETA</span>
                    <span className="font-medium text-blue-900">{formatDate(shipment.vessel.eta)}</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Additional Information */}
        <CollapsibleSection
          id="additional"
          title="Additional Information"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="space-y-3 text-sm">
            {shipment.bookingNumber && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Booking Number</span>
                <span className="font-mono font-medium text-gray-900">{shipment.bookingNumber}</span>
              </div>
            )}
            {shipment.billOfLading && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-600">Bill of Lading</span>
                <span className="font-mono font-medium text-gray-900">{shipment.billOfLading}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Last Updated</span>
              <span className="font-medium text-gray-900">{formatDate(shipment.lastUpdated)}</span>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Action Buttons */}
      {(onShare || onSave) && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex space-x-3">
            {onSave && (
              <button
                onClick={onSave}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-150 touch-manipulation"
              >
                Save
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors duration-150 touch-manipulation"
              >
                Share
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileShipmentDetails;