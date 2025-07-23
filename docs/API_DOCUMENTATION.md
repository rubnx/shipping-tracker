# Shipping Tracker API Documentation

## Overview

The Shipping Tracker API provides comprehensive access to container tracking data from multiple carriers, analytics, and administrative functions. This RESTful API is designed for high performance, reliability, and ease of integration.

## Base URL

```
Production: https://api.shipping-tracker.com/v1
Development: http://localhost:3001/api
```

## Authentication

The API supports two authentication methods:

### 1. API Key Authentication
Include your API key in the request header:
```http
X-API-Key: your_api_key_here
```

### 2. JWT Token Authentication
Include your JWT token in the Authorization header:
```http
Authorization: Bearer your_jwt_token_here
```

## Rate Limiting

API requests are rate-limited to ensure fair usage:
- **Free Tier**: 1,000 requests per hour
- **Pro Tier**: 10,000 requests per hour
- **Enterprise**: Custom limits

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-20T12:00:00Z",
    "version": "1.0",
    "requestId": "req_123456789"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "TRACKING_NOT_FOUND",
    "message": "Tracking number not found",
    "details": "The tracking number MAEU123456789 was not found in any carrier system"
  },
  "meta": {
    "timestamp": "2024-01-20T12:00:00Z",
    "version": "1.0",
    "requestId": "req_123456789"
  }
}
```

## Endpoints

### Tracking

#### Track Single Container
Get tracking information for a single container.

```http
GET /tracking/{trackingNumber}
```

**Parameters:**
- `trackingNumber` (string, required): Container number, booking number, or BOL

**Query Parameters:**
- `includeHistory` (boolean, optional): Include full event history (default: true)
- `includeVesselInfo` (boolean, optional): Include vessel information (default: true)
- `preferredCarrier` (string, optional): Preferred carrier to check first

**Example Request:**
```bash
curl -H "X-API-Key: your_api_key" \
  "https://api.shipping-tracker.com/v1/tracking/MAEU123456789?includeHistory=true"
```

**Example Response:**
```json
{
  "data": {
    "trackingNumber": "MAEU123456789",
    "carrier": "Maersk",
    "status": "In Transit",
    "bookingNumber": "123456789",
    "containers": [
      {
        "number": "MAEU123456789",
        "type": "40HC",
        "size": "40",
        "weight": 25000,
        "weightUnit": "kg",
        "sealNumber": "SEAL123",
        "carrier": "Maersk"
      }
    ],
    "vessel": {
      "name": "Maersk Sealand",
      "imo": "IMO1234567",
      "voyage": "001E",
      "callSign": "OXPQ2",
      "position": {
        "latitude": 35.6762,
        "longitude": 139.6503,
        "heading": 90,
        "speed": 15.5,
        "timestamp": "2024-01-20T12:00:00Z"
      }
    },
    "origin": {
      "name": "Shanghai, China",
      "code": "CNSHA",
      "country": "China",
      "terminal": "Yangshan Terminal",
      "coordinates": {
        "latitude": 30.6339,
        "longitude": 122.0803
      }
    },
    "destination": {
      "name": "Los Angeles, USA",
      "code": "USLAX",
      "country": "United States",
      "terminal": "Terminal Island",
      "coordinates": {
        "latitude": 33.7701,
        "longitude": -118.2437
      }
    },
    "departureDate": "2024-01-15T08:00:00Z",
    "arrivalDate": "2024-01-30T16:00:00Z",
    "events": [
      {
        "timestamp": "2024-01-20T12:00:00Z",
        "location": "Pacific Ocean",
        "status": "In Transit",
        "description": "Container is in transit aboard vessel Maersk Sealand",
        "coordinates": {
          "latitude": 35.6762,
          "longitude": 139.6503
        }
      },
      {
        "timestamp": "2024-01-15T08:00:00Z",
        "location": "Shanghai Port",
        "status": "Departed",
        "description": "Container departed from Shanghai Port"
      }
    ],
    "lastUpdated": "2024-01-20T12:00:00Z"
  },
  "meta": {
    "timestamp": "2024-01-20T12:00:00Z",
    "version": "1.0",
    "requestId": "req_123456789"
  }
}
```

#### Bulk Tracking
Track multiple containers in a single request.

```http
POST /tracking/bulk
```

**Request Body:**
```json
{
  "trackingNumbers": [
    "MAEU123456789",
    "MSCU987654321",
    "CMAU555666777"
  ],
  "options": {
    "includeHistory": true,
    "includeVesselInfo": true,
    "includeContainerDetails": true,
    "preferredCarriers": ["maersk", "msc"],
    "timeout": 30000
  }
}
```

**Example Response:**
```json
{
  "data": {
    "requestId": "bulk_req_123456789",
    "status": "completed",
    "progress": {
      "total": 3,
      "completed": 3,
      "failed": 0,
      "percentage": 100
    },
    "results": [
      {
        "trackingNumber": "MAEU123456789",
        "status": "success",
        "data": {
          // Full tracking data object
        }
      },
      {
        "trackingNumber": "MSCU987654321",
        "status": "success",
        "data": {
          // Full tracking data object
        }
      },
      {
        "trackingNumber": "CMAU555666777",
        "status": "error",
        "error": "Tracking number not found"
      }
    ],
    "startedAt": "2024-01-20T12:00:00Z",
    "completedAt": "2024-01-20T12:00:30Z"
  }
}
```

#### Get Bulk Tracking Status
Check the status of a bulk tracking request.

```http
GET /tracking/bulk/{requestId}
```

### Analytics

#### Shipping Route Analytics
Get analytics data for shipping routes.

```http
GET /analytics/shipping-routes
```

**Query Parameters:**
- `origin` (string, optional): Filter by origin port
- `destination` (string, optional): Filter by destination port
- `carrier` (string, optional): Filter by carrier
- `timeRange` (string, optional): Time range (7d, 30d, 90d, 1y) - default: 30d

**Example Response:**
```json
{
  "data": [
    {
      "route": {
        "origin": "Shanghai, China",
        "destination": "Los Angeles, USA",
        "carrier": "Maersk"
      },
      "metrics": {
        "totalShipments": 1250,
        "averageTransitTime": 14.5,
        "onTimePerformance": 0.87,
        "delayFrequency": 0.13,
        "popularityScore": 0.95,
        "costEfficiency": 0.82
      },
      "trends": {
        "period": "30d",
        "shipmentVolume": [45, 52, 48, 61, 55, 49, 58, 62, 47, 53],
        "averageDelay": [1.2, 0.8, 1.5, 2.1, 1.0, 0.9, 1.8, 2.3, 1.1, 0.7],
        "costTrend": [2850, 2920, 2880, 3100, 2950, 2890, 3050, 3200, 2980, 2920]
      }
    }
  ]
}
```

#### API Usage Analytics
Get analytics for API usage across different providers.

```http
GET /analytics/api-usage
```

**Query Parameters:**
- `timeRange` (string, optional): Time range (7d, 30d, 90d, 1y) - default: 30d

#### Business Intelligence
Get comprehensive business intelligence insights.

```http
GET /analytics/business-intelligence
```

**Query Parameters:**
- `timeRange` (string, optional): Time range (7d, 30d, 90d, 1y) - default: 30d

#### Cost Optimization Recommendations
Get recommendations for optimizing API costs.

```http
GET /analytics/cost-optimization
```

#### Export Analytics Data
Export analytics data in various formats.

```http
GET /analytics/export
```

**Query Parameters:**
- `format` (string, required): Export format (csv, json, xml)
- `timeRange` (string, optional): Time range - default: 30d
- `type` (string, optional): Data type (routes, api-usage, business-intelligence)

### Carriers

#### Maersk API
Direct access to Maersk tracking services.

```http
GET /carriers/maersk/track/{trackingNumber}
GET /carriers/maersk/vessel/{vesselIMO}
GET /carriers/maersk/container/{containerNumber}
POST /carriers/maersk/cache/clear
GET /carriers/maersk/status
```

### Notifications

#### Create Notification
Set up notifications for tracking updates.

```http
POST /notifications
```

**Request Body:**
```json
{
  "trackingNumber": "MAEU123456789",
  "type": "webhook",
  "endpoint": "https://your-app.com/webhook",
  "events": ["status_change", "arrival", "departure"],
  "enabled": true
}
```

#### List Notifications
Get all notifications for the authenticated user.

```http
GET /notifications
```

#### Update Notification
Update an existing notification.

```http
PUT /notifications/{notificationId}
```

#### Delete Notification
Delete a notification.

```http
DELETE /notifications/{notificationId}
```

### Admin

#### API Key Management
Manage API keys (admin access required).

```http
GET /admin/api-keys
POST /admin/api-keys
PUT /admin/api-keys/{keyId}
DELETE /admin/api-keys/{keyId}
```

#### System Health
Check system health and status.

```http
GET /health
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00Z",
  "uptime": 86400,
  "performance": {
    "responseTime": 150,
    "throughput": 1250,
    "errorRate": 0.01,
    "memoryUsage": 0.65,
    "cpuUsage": 0.45
  },
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  }
}
```

#### System Metrics
Get detailed system metrics.

```http
GET /metrics
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | Invalid or missing API key |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `TRACKING_NOT_FOUND` | 404 | Tracking number not found |
| `INVALID_TRACKING_NUMBER` | 400 | Invalid tracking number format |
| `CARRIER_API_ERROR` | 502 | External carrier API error |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install @shipping-tracker/api-client
```

```javascript
import { ShippingTrackerClient } from '@shipping-tracker/api-client';

const client = new ShippingTrackerClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.shipping-tracker.com/v1'
});

const tracking = await client.tracking.get('MAEU123456789');
```

### Python
```bash
pip install shipping-tracker-api
```

```python
from shipping_tracker import ShippingTrackerClient

client = ShippingTrackerClient(api_key='your_api_key')
tracking = client.tracking.get('MAEU123456789')
```

### PHP
```bash
composer require shipping-tracker/api-client
```

```php
use ShippingTracker\ApiClient;

$client = new ApiClient('your_api_key');
$tracking = $client->tracking()->get('MAEU123456789');
```

## Webhooks

### Setting Up Webhooks
Configure webhooks to receive real-time updates:

```http
POST /notifications
```

```json
{
  "type": "webhook",
  "endpoint": "https://your-app.com/webhook",
  "events": ["status_change", "arrival", "departure"],
  "secret": "your_webhook_secret"
}
```

### Webhook Payload
```json
{
  "event": "status_change",
  "timestamp": "2024-01-20T12:00:00Z",
  "data": {
    "trackingNumber": "MAEU123456789",
    "oldStatus": "In Transit",
    "newStatus": "Arrived",
    "location": "Los Angeles Port",
    "estimatedArrival": "2024-01-20T14:00:00Z"
  },
  "signature": "sha256=..."
}
```

### Webhook Verification
Verify webhook authenticity using the signature:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

## Best Practices

### 1. Error Handling
Always implement proper error handling:

```javascript
try {
  const tracking = await client.tracking.get('MAEU123456789');
  // Handle success
} catch (error) {
  if (error.code === 'TRACKING_NOT_FOUND') {
    // Handle not found
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

### 2. Caching
Implement client-side caching to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedTracking(trackingNumber) {
  const cached = cache.get(trackingNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await client.tracking.get(trackingNumber);
  cache.set(trackingNumber, { data, timestamp: Date.now() });
  return data;
}
```

### 3. Retry Logic
Implement exponential backoff for retries:

```javascript
async function trackWithRetry(trackingNumber, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.tracking.get(trackingNumber);
    } catch (error) {
      if (attempt === maxRetries || error.code !== 'CARRIER_API_ERROR') {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 4. Bulk Operations
Use bulk endpoints for multiple tracking numbers:

```javascript
// Instead of multiple individual requests
const trackingNumbers = ['MAEU123456789', 'MSCU987654321'];
const results = await Promise.all(
  trackingNumbers.map(num => client.tracking.get(num))
);

// Use bulk endpoint
const bulkResult = await client.tracking.bulk({
  trackingNumbers,
  options: { includeHistory: true }
});
```

## Testing

### Test Environment
Use the test environment for development:
```
Base URL: https://api-test.shipping-tracker.com/v1
```

### Test Data
Use these test tracking numbers:
- `TEST123456789` - Always returns success
- `TEST404404404` - Always returns not found
- `TEST500500500` - Always returns server error

### Postman Collection
Import our Postman collection for easy testing:
```
https://api.shipping-tracker.com/postman/collection.json
```

## Support

### Getting Help
- **Documentation**: https://docs.shipping-tracker.com
- **Support Email**: api-support@shipping-tracker.com
- **Status Page**: https://status.shipping-tracker.com
- **GitHub Issues**: https://github.com/shipping-tracker/api/issues

### Response Times
- **Critical Issues**: 2 hours
- **General Support**: 24 hours
- **Feature Requests**: 1 week

---

**API Version**: 1.0  
**Last Updated**: January 20, 2024  
**Next Update**: February 15, 2024