import React from 'react';
import type { ShipmentDetailsProps, Container, VesselInfo } from '../../types';

const ShipmentDetailsComponent: React.FC<ShipmentDetailsProps> = ({
  shipment,
  isLoading,
  error,
  onRefresh,
  className = '',
  showActions = true,
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Shipment Details</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {onRefresh && showActions && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Shipment Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Last updated: {new Date(shipment.lastUpdated).toLocaleString()}
            </p>
          </div>
          {onRefresh && showActions && (
            <button
              onClick={onRefresh}
              className="mt-3 sm:mt-0 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <BasicInfoCard shipment={shipment} />
          
          {/* Vessel Information */}
          <VesselInfoCard vessel={shipment.vessel} />
        </div>

        {/* Container Details */}
        {shipment.containers && shipment.containers.length > 0 && (
          <div className="mt-6">
            <ContainerDetailsCard containers={shipment.containers} />
          </div>
        )}
      </div>
    </div>
  );
};

// Basic Information Card Component
const BasicInfoCard: React.FC<{ shipment: ShipmentDetailsProps['shipment'] }> = ({ shipment }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
    <dl className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
        <dd className="text-sm text-gray-900 font-mono mt-1 sm:mt-0">{shipment.trackingNumber}</dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Carrier</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{shipment.carrier}</dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Service Type</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            shipment.service === 'FCL' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {shipment.service}
          </span>
        </dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Current Status</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {shipment.status.replace(/_/g, ' ').toUpperCase()}
          </span>
        </dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Tracking Type</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0 capitalize">{shipment.trackingType}</dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Data Source</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0 capitalize">{shipment.dataSource}</dd>
      </div>
    </dl>
  </div>
);

// Vessel Information Card Component
const VesselInfoCard: React.FC<{ vessel: VesselInfo }> = ({ vessel }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Vessel Information</h3>
    <dl className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Vessel Name</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0 font-medium">{vessel.name}</dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">IMO Number</dt>
        <dd className="text-sm text-gray-900 font-mono mt-1 sm:mt-0">{vessel.imo}</dd>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">Voyage</dt>
        <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{vessel.voyage}</dd>
      </div>
      {vessel.eta && (
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <dt className="text-sm font-medium text-gray-500">Estimated Arrival</dt>
          <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
            {new Date(vessel.eta).toLocaleDateString()} at {new Date(vessel.eta).toLocaleTimeString()}
          </dd>
        </div>
      )}
      {vessel.ata && (
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <dt className="text-sm font-medium text-gray-500">Actual Arrival</dt>
          <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
            {new Date(vessel.ata).toLocaleDateString()} at {new Date(vessel.ata).toLocaleTimeString()}
          </dd>
        </div>
      )}
      {vessel.currentPosition && (
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <dt className="text-sm font-medium text-gray-500">Current Position</dt>
          <dd className="text-sm text-gray-900 font-mono mt-1 sm:mt-0">
            {vessel.currentPosition.lat.toFixed(4)}, {vessel.currentPosition.lng.toFixed(4)}
          </dd>
        </div>
      )}
    </dl>
  </div>
);

// Container Details Card Component
const ContainerDetailsCard: React.FC<{ containers: Container[] }> = ({ containers }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <h3 className="text-lg font-medium text-gray-900 mb-4">
      Container Details ({containers.length} container{containers.length !== 1 ? 's' : ''})
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {containers.map((container, index) => (
        <ContainerCard key={container.number || index} container={container} />
      ))}
    </div>
  </div>
);

// Individual Container Card Component
const ContainerCard: React.FC<{ container: Container }> = ({ container }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-medium text-gray-900">Container #{container.number}</h4>
      <div className="flex space-x-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          container.size === '20ft' ? 'bg-blue-100 text-blue-800' :
          container.size === '40ft' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {container.size}
        </span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {container.type}
        </span>
      </div>
    </div>
    
    <dl className="space-y-2">
      <div className="flex justify-between">
        <dt className="text-xs text-gray-500">Seal Number</dt>
        <dd className="text-xs text-gray-900 font-mono">{container.sealNumber}</dd>
      </div>
      
      {container.weight && (
        <div className="flex justify-between">
          <dt className="text-xs text-gray-500">Weight</dt>
          <dd className="text-xs text-gray-900">{container.weight} kg</dd>
        </div>
      )}
      
      {container.dimensions && (
        <div className="flex justify-between">
          <dt className="text-xs text-gray-500">Dimensions</dt>
          <dd className="text-xs text-gray-900">
            {container.dimensions.length} × {container.dimensions.width} × {container.dimensions.height} {container.dimensions.unit}
          </dd>
        </div>
      )}
    </dl>
  </div>
);

export default ShipmentDetailsComponent;