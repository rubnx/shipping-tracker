import React from 'react';
import { LazyShipmentDetailsComponent, LazyTimelineComponent, LazyMapComponent } from '../LazyComponents';
import { LazyWrapper } from '../Performance';
import { useTrackingStore, useUIStore } from '../../store';
import { useRefreshShipment } from '../../api';
import type { Port } from '../../types';

const ShipmentDisplay: React.FC = () => {
  const { currentShipment } = useTrackingStore();
  const { 
    showMap, 
    showTimeline, 
    selectedPort, 
    setSelectedPort,
    isMobile 
  } = useUIStore();
  
  const refreshMutation = useRefreshShipment();

  if (!currentShipment) {
    return null;
  }

  const handleRefresh = () => {
    refreshMutation.mutate(currentShipment.trackingNumber);
  };

  const handleMarkerClick = (port: Port) => {
    setSelectedPort(port);
  };

  const completionPercentage = Math.round(
    (currentShipment.timeline.filter(e => e.isCompleted).length / 
     currentShipment.timeline.length) * 100
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Shipment Details */}
      <section aria-labelledby="shipment-details-heading">
        <h2 id="shipment-details-heading" className="sr-only">
          Shipment Details
        </h2>
        <LazyWrapper minHeight={300}>
          <LazyShipmentDetailsComponent
            shipment={currentShipment}
            isLoading={refreshMutation.isPending}
            error={refreshMutation.error?.message || null}
            onRefresh={handleRefresh}
            showActions={true}
          />
        </LazyWrapper>
      </section>

      {/* Interactive Map */}
      {showMap && (
        <section className="card" aria-labelledby="map-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="map-heading" className="text-lg sm:text-xl font-semibold text-gray-900">
              Route Map
            </h2>
            <div className="flex items-center space-x-2">
              {selectedPort && (
                <span className="text-sm text-gray-600">
                  Selected: {selectedPort.name}
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <LazyWrapper minHeight={isMobile ? 300 : 400}>
                <LazyMapComponent
                  route={currentShipment.route}
                  vesselPosition={currentShipment.vessel.currentPosition}
                  ports={[
                    currentShipment.route.origin,
                    currentShipment.route.destination,
                    ...currentShipment.route.intermediateStops,
                  ]}
                  onMarkerClick={handleMarkerClick}
                  height={isMobile ? 300 : 400}
                  className="border border-gray-200 rounded-lg"
                  showControls={true}
                  interactive={true}
                />
              </LazyWrapper>
            </div>
            
            <div className="order-1 lg:order-2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">
                  Route Info
                </h3>
                <div className="text-xs sm:text-sm space-y-1">
                  <div>
                    <span className="font-medium">Origin:</span> {currentShipment.route.origin.name}
                  </div>
                  <div>
                    <span className="font-medium">Destination:</span> {currentShipment.route.destination.name}
                  </div>
                  <div>
                    <span className="font-medium">Transit:</span> {currentShipment.route.estimatedTransitTime} days
                  </div>
                </div>
              </div>
              
              {selectedPort && (
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">
                    Selected Port
                  </h3>
                  <div className="text-xs sm:text-sm space-y-1">
                    <div>
                      <span className="font-medium">Name:</span> {selectedPort.name}
                    </div>
                    <div>
                      <span className="font-medium">Code:</span> {selectedPort.code}
                    </div>
                    <div>
                      <span className="font-medium">Country:</span> {selectedPort.country}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-orange-800 mb-2 text-sm sm:text-base">
                  Vessel Status
                </h3>
                <div className="text-xs sm:text-sm space-y-1">
                  <div>
                    <span className="font-medium">Name:</span> {currentShipment.vessel.name}
                  </div>
                  <div>
                    <span className="font-medium">IMO:</span> {currentShipment.vessel.imo}
                  </div>
                  <div>
                    <span className="font-medium">Voyage:</span> {currentShipment.vessel.voyage}
                  </div>
                  {currentShipment.vessel.eta && (
                    <div>
                      <span className="font-medium">ETA:</span>{' '}
                      {new Date(currentShipment.vessel.eta).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      {showTimeline && (
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="sr-only">
            Shipment Timeline
          </h2>
          <LazyWrapper minHeight={400}>
            <LazyTimelineComponent
              events={currentShipment.timeline}
              currentStatus={currentShipment.status}
              completionPercentage={completionPercentage}
              showProgress={true}
            />
          </LazyWrapper>
        </section>
      )}
    </div>
  );
};

export default ShipmentDisplay;