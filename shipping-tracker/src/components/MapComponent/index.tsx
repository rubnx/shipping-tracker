// Simple MapComponent stub
import React from 'react';

interface MapComponentProps {
  route: any;
  vesselPosition?: any;
  ports: any[];
  onMarkerClick: (port: any) => void;
  height?: number;
  showControls?: boolean;
  interactive?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  route,
  ports,
  height = 400,
}) => {
  return (
    <div 
      style={{ 
        padding: '20px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        height: `${height}px`,
        backgroundColor: '#f0f8ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3>Map Component</h3>
        <p>Route: {route?.origin?.name} → {route?.destination?.name}</p>
        <p>Ports: {ports.length}</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          (Map functionality temporarily disabled)
        </p>
      </div>
    </div>
  );
};