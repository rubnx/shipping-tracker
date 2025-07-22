-- Seed data for development and testing

-- Insert sample shipment data for demo purposes
INSERT INTO shipments (tracking_number, tracking_type, carrier, service, status, data, expires_at) VALUES
(
  'DEMO123456789',
  'container',
  'Maersk Line',
  'FCL',
  'In Transit',
  '{
    "id": "demo-123456789",
    "trackingNumber": "DEMO123456789",
    "trackingType": "container",
    "carrier": "Maersk Line",
    "service": "FCL",
    "status": "In Transit",
    "timeline": [
      {
        "id": "event-1",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "Booking Confirmed",
        "location": "Shanghai",
        "description": "Shipment booking has been confirmed",
        "isCompleted": true,
        "coordinates": {"lat": 31.2304, "lng": 121.4737}
      },
      {
        "id": "event-2",
        "timestamp": "2024-01-02T00:00:00Z",
        "status": "Container Loaded",
        "location": "Shanghai",
        "description": "Container loaded at Shanghai port",
        "isCompleted": true,
        "coordinates": {"lat": 31.2304, "lng": 121.4737}
      },
      {
        "id": "event-3",
        "timestamp": "2024-01-03T00:00:00Z",
        "status": "Departed Origin Port",
        "location": "Shanghai",
        "description": "Vessel departed from Shanghai",
        "isCompleted": true,
        "coordinates": {"lat": 31.2304, "lng": 121.4737}
      },
      {
        "id": "event-4",
        "timestamp": "2024-01-08T00:00:00Z",
        "status": "In Transit",
        "location": "Pacific Ocean",
        "description": "Shipment is in transit",
        "isCompleted": true,
        "coordinates": {"lat": 35.0, "lng": -140.0}
      }
    ],
    "route": {
      "origin": {
        "code": "CNSHA",
        "name": "Shanghai",
        "city": "Shanghai",
        "country": "China",
        "coordinates": {"lat": 31.2304, "lng": 121.4737},
        "timezone": "Asia/Shanghai"
      },
      "destination": {
        "code": "USNYC",
        "name": "New York",
        "city": "New York",
        "country": "United States",
        "coordinates": {"lat": 40.7128, "lng": -74.0060},
        "timezone": "America/New_York"
      },
      "intermediateStops": [],
      "estimatedTransitTime": 21,
      "actualTransitTime": null
    },
    "containers": [
      {
        "number": "DEMO1234567",
        "size": "40ft",
        "type": "GP",
        "sealNumber": "SEAL123456",
        "weight": 18500,
        "dimensions": {"length": 40, "width": 8, "height": 8.5}
      }
    ],
    "vessel": {
      "name": "MAERSK ESSEX",
      "imo": "9811040",
      "voyage": "ME2024A",
      "currentPosition": {"lat": 35.0, "lng": -140.0},
      "eta": "2024-01-15T12:00:00Z",
      "ata": "2024-01-03T08:00:00Z"
    },
    "lastUpdated": "2024-01-10T10:00:00Z",
    "dataSource": "Demo Data Service",
    "reliability": "high"
  }',
  NOW() + INTERVAL '7 days'
),
(
  'CONTAINER001',
  'container',
  'MSC',
  'FCL',
  'Delivered',
  '{
    "id": "container-001",
    "trackingNumber": "CONTAINER001",
    "trackingType": "container",
    "carrier": "MSC",
    "service": "FCL",
    "status": "Delivered",
    "timeline": [
      {
        "id": "event-1",
        "timestamp": "2023-12-15T00:00:00Z",
        "status": "Booking Confirmed",
        "location": "Rotterdam",
        "description": "Shipment booking has been confirmed",
        "isCompleted": true,
        "coordinates": {"lat": 51.9244, "lng": 4.4777}
      },
      {
        "id": "event-2",
        "timestamp": "2023-12-16T00:00:00Z",
        "status": "Container Loaded",
        "location": "Rotterdam",
        "description": "Container loaded at Rotterdam port",
        "isCompleted": true,
        "coordinates": {"lat": 51.9244, "lng": 4.4777}
      },
      {
        "id": "event-3",
        "timestamp": "2023-12-17T00:00:00Z",
        "status": "Departed Origin Port",
        "location": "Rotterdam",
        "description": "Vessel departed from Rotterdam",
        "isCompleted": true,
        "coordinates": {"lat": 51.9244, "lng": 4.4777}
      },
      {
        "id": "event-4",
        "timestamp": "2023-12-25T00:00:00Z",
        "status": "In Transit",
        "location": "Atlantic Ocean",
        "description": "Shipment was in transit",
        "isCompleted": true,
        "coordinates": {"lat": 45.0, "lng": -30.0}
      },
      {
        "id": "event-5",
        "timestamp": "2024-01-02T00:00:00Z",
        "status": "Arrived Destination Port",
        "location": "New York",
        "description": "Vessel arrived at New York port",
        "isCompleted": true,
        "coordinates": {"lat": 40.7128, "lng": -74.0060}
      },
      {
        "id": "event-6",
        "timestamp": "2024-01-03T00:00:00Z",
        "status": "Container Discharged",
        "location": "New York",
        "description": "Container discharged at New York port",
        "isCompleted": true,
        "coordinates": {"lat": 40.7128, "lng": -74.0060}
      },
      {
        "id": "event-7",
        "timestamp": "2024-01-05T00:00:00Z",
        "status": "Delivered",
        "location": "New York",
        "description": "Container delivered to final destination",
        "isCompleted": true,
        "coordinates": {"lat": 40.7128, "lng": -74.0060}
      }
    ],
    "route": {
      "origin": {
        "code": "NLRTM",
        "name": "Rotterdam",
        "city": "Rotterdam",
        "country": "Netherlands",
        "coordinates": {"lat": 51.9244, "lng": 4.4777},
        "timezone": "Europe/Amsterdam"
      },
      "destination": {
        "code": "USNYC",
        "name": "New York",
        "city": "New York",
        "country": "United States",
        "coordinates": {"lat": 40.7128, "lng": -74.0060},
        "timezone": "America/New_York"
      },
      "intermediateStops": [],
      "estimatedTransitTime": 18,
      "actualTransitTime": 16
    },
    "containers": [
      {
        "number": "CNTR0000001",
        "size": "20ft",
        "type": "GP",
        "sealNumber": "SEAL000001",
        "weight": 12000,
        "dimensions": {"length": 20, "width": 8, "height": 8.5}
      }
    ],
    "vessel": {
      "name": "MSC GULSUN",
      "imo": "9811000",
      "voyage": "FL1MA",
      "currentPosition": {"lat": 40.7128, "lng": -74.0060},
      "eta": "2024-01-02T12:00:00Z",
      "ata": "2024-01-02T10:30:00Z"
    },
    "lastUpdated": "2024-01-05T15:00:00Z",
    "dataSource": "Demo Data Service",
    "reliability": "high"
  }',
  NOW() + INTERVAL '7 days'
),
(
  'BOOKING002',
  'booking',
  'CMA CGM',
  'LCL',
  'Container Loading',
  '{
    "id": "booking-002",
    "trackingNumber": "BOOKING002",
    "trackingType": "booking",
    "carrier": "CMA CGM",
    "service": "LCL",
    "status": "Container Loading",
    "timeline": [
      {
        "id": "event-1",
        "timestamp": "2024-01-08T00:00:00Z",
        "status": "Booking Confirmed",
        "location": "Singapore",
        "description": "Shipment booking has been confirmed",
        "isCompleted": true,
        "coordinates": {"lat": 1.2966, "lng": 103.7764}
      },
      {
        "id": "event-2",
        "timestamp": "2024-01-10T00:00:00Z",
        "status": "Container Loading",
        "location": "Singapore",
        "description": "Container is currently being loaded",
        "isCompleted": true,
        "coordinates": {"lat": 1.2966, "lng": 103.7764}
      }
    ],
    "route": {
      "origin": {
        "code": "SGSIN",
        "name": "Singapore",
        "city": "Singapore",
        "country": "Singapore",
        "coordinates": {"lat": 1.2966, "lng": 103.7764},
        "timezone": "Asia/Singapore"
      },
      "destination": {
        "code": "DEHAM",
        "name": "Hamburg",
        "city": "Hamburg",
        "country": "Germany",
        "coordinates": {"lat": 53.5511, "lng": 9.9937},
        "timezone": "Europe/Berlin"
      },
      "intermediateStops": [
        {
          "code": "AEJEA",
          "name": "Jebel Ali",
          "city": "Dubai",
          "country": "UAE",
          "coordinates": {"lat": 25.0657, "lng": 55.1713},
          "timezone": "Asia/Dubai"
        }
      ],
      "estimatedTransitTime": 28,
      "actualTransitTime": null
    },
    "containers": [
      {
        "number": "CMAU1234567",
        "size": "40ft",
        "type": "HC",
        "sealNumber": "SEAL234567",
        "weight": 16800,
        "dimensions": {"length": 40, "width": 8, "height": 9.5}
      }
    ],
    "vessel": {
      "name": "CMA CGM MARCO POLO",
      "imo": "9454436",
      "voyage": "CMP2024",
      "currentPosition": {"lat": 1.2966, "lng": 103.7764},
      "eta": "2024-02-05T14:00:00Z",
      "ata": null
    },
    "lastUpdated": "2024-01-10T12:00:00Z",
    "dataSource": "Demo Data Service",
    "reliability": "medium"
  }',
  NOW() + INTERVAL '7 days'
);

-- Insert sample search history
INSERT INTO search_history (tracking_number, tracking_type, user_session, search_count, last_searched) VALUES
('DEMO123456789', 'container', 'demo-session-1', 5, NOW() - INTERVAL '1 hour'),
('CONTAINER001', 'container', 'demo-session-1', 3, NOW() - INTERVAL '2 hours'),
('BOOKING002', 'booking', 'demo-session-1', 2, NOW() - INTERVAL '3 hours'),
('BOL003', 'bol', 'demo-session-2', 1, NOW() - INTERVAL '1 day'),
('MAERSK123456', 'container', 'demo-session-2', 4, NOW() - INTERVAL '2 days');

-- Insert sample API usage data
INSERT INTO api_usage (api_provider, endpoint, requests_count, window_start, rate_limit_remaining) VALUES
('Track-Trace', '/track', 45, NOW() - INTERVAL '15 minutes', 55),
('ShipsGo', '/tracking', 23, NOW() - INTERVAL '15 minutes', 77),
('SeaRates', '/container', 12, NOW() - INTERVAL '15 minutes', 88),
('Maersk', '/shipments', 8, NOW() - INTERVAL '15 minutes', 92),
('MSC', '/tracking', 15, NOW() - INTERVAL '15 minutes', 85);

-- Create a view for recent search activity
CREATE OR REPLACE VIEW recent_search_activity AS
SELECT 
  tracking_number,
  tracking_type,
  COUNT(*) as total_searches,
  MAX(last_searched) as most_recent_search,
  COUNT(DISTINCT user_session) as unique_sessions
FROM search_history 
WHERE last_searched >= NOW() - INTERVAL '7 days'
GROUP BY tracking_number, tracking_type
ORDER BY most_recent_search DESC;

-- Create a view for API usage summary
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
  api_provider,
  SUM(requests_count) as total_requests,
  AVG(rate_limit_remaining) as avg_rate_limit_remaining,
  MAX(window_start) as last_request_time
FROM api_usage 
WHERE window_start >= NOW() - INTERVAL '1 day'
GROUP BY api_provider
ORDER BY total_requests DESC;