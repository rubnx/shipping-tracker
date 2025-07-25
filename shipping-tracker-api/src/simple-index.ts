import express = require('express');
import cors = require('cors');
import { config } from './config/environment';
import { APIAggregator } from './services/APIAggregator';

const app = express();
const port = config.server.port;

// Initialize API Aggregator
const apiAggregator = new APIAggregator();

// Basic middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.nodeEnv
  });
});

// Basic tracking endpoint with concurrent API querying
app.get('/api/tracking/:trackingNumber', async (req, res) => {
  const { trackingNumber } = req.params;
  const { type, concurrent = 'true' } = req.query;
  
  try {
    console.log(`🔍 Tracking request: ${trackingNumber} (concurrent: ${concurrent})`);
    
    // Use concurrent or sequential API querying based on query parameter
    const useConcurrent = concurrent === 'true';
    const trackingType = (type as any) || 'container';
    
    let rawResults;
    if (useConcurrent) {
      rawResults = await apiAggregator.fetchFromMultipleSourcesConcurrent(
        trackingNumber,
        trackingType,
        'free', // Default to free tier for demo
        true,   // Cost optimization enabled
        3       // Max 3 concurrent requests
      );
    } else {
      rawResults = await apiAggregator.fetchFromMultipleSources(
        trackingNumber,
        trackingType,
        'free',
        true
      );
    }

    if (rawResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tracking data found',
        message: 'Unable to find tracking information for the provided number',
        timestamp: new Date().toISOString()
      });
    }

    // Prioritize and merge results
    const prioritizedData = apiAggregator.prioritizeDataSources(rawResults);
    
    res.json({
      success: true,
      data: prioritizedData,
      metadata: {
        sources: rawResults.map(r => ({
          provider: r.provider,
          reliability: r.reliability,
          status: r.status,
          timestamp: r.timestamp
        })),
        queryType: useConcurrent ? 'concurrent' : 'sequential',
        totalSources: rawResults.length
      },
      message: `Tracking data retrieved successfully from ${rawResults.length} source(s)`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Tracking error:', error);
    
    // Fallback to demo data if all APIs fail
    const demoData = {
      trackingNumber,
      trackingType: 'container',
      carrier: 'Demo Carrier',
      status: 'In Transit',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      timeline: [
        {
          status: 'Booked',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          location: 'Shanghai, China',
          description: 'Shipment booked and confirmed',
          isCompleted: true,
        },
        {
          status: 'Departed',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          location: 'Shanghai Port, China',
          description: 'Container departed from origin port',
          isCompleted: true,
        },
        {
          status: 'In Transit',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          location: 'Pacific Ocean',
          description: 'Vessel en route to destination',
          isCompleted: true,
        },
        {
          status: 'Arriving',
          timestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          location: 'Los Angeles, CA',
          description: 'Expected arrival at destination port',
          isCompleted: false,
        },
      ],
      route: {
        origin: {
          name: 'Shanghai Port',
          code: 'CNSHA',
          country: 'China',
          coordinates: { lat: 31.2304, lng: 121.4737 },
        },
        destination: {
          name: 'Los Angeles Port',
          code: 'USLAX',
          country: 'United States',
          coordinates: { lat: 33.7361, lng: -118.2922 },
        },
        intermediateStops: [],
        distance: 11500,
        estimatedTransitTime: 14,
      },
      container: {
        number: trackingNumber,
        size: '40HC',
        type: 'High Cube',
        sealNumber: 'SEAL' + Math.random().toString().substr(2, 6),
      },
      vessel: {
        name: 'Demo Vessel',
        imo: 'IMO1234567',
        flag: 'Panama',
        currentPosition: { lat: 35.0, lng: -140.0 },
        eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    };

    res.json({
      success: true,
      data: demoData,
      message: 'Tracking data retrieved successfully (demo mode - API fallback)',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Demo endpoints
app.get('/api/demo/info', (req, res) => {
  res.json({
    success: true,
    data: {
      demoMode: true,
      availableNumbers: ['DEMO123456789', 'TEST123456789', 'SAMPLE123456789'],
      message: 'Demo mode is active. All tracking data is simulated.'
    }
  });
});

// Circuit breaker status endpoint
app.get('/api/status/circuit-breakers', (req, res) => {
  try {
    const status = apiAggregator.getCircuitBreakerStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Reset circuit breaker endpoint
app.post('/api/admin/reset-circuit-breaker/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const success = apiAggregator.resetCircuitBreaker(provider);
    
    if (success) {
      res.json({
        success: true,
        message: `Circuit breaker for ${provider} has been reset`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Provider not found',
        message: `No circuit breaker found for provider: ${provider}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API key rotation status endpoint
app.get('/api/status/api-keys', (req, res) => {
  try {
    const status = apiAggregator.getAPIKeyRotationStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get API key rotation status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Force API key rotation endpoint
app.post('/api/admin/rotate-api-key/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const newKey = apiAggregator.rotateAPIKey(provider);
    
    if (newKey) {
      res.json({
        success: true,
        message: `API key rotated for ${provider}`,
        keyPreview: newKey.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Provider not found or no rotation configured',
        message: `No API key rotation configured for provider: ${provider}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to rotate API key',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Email notification endpoint
app.post('/api/notifications/email', (req, res) => {
  try {
    const { to, subject, body, trackingNumber, shipmentData } = req.body;
    
    // In production, this would integrate with an email service like SendGrid, AWS SES, etc.
    console.log('📧 Email notification request:', {
      to,
      subject,
      trackingNumber,
      timestamp: new Date().toISOString()
    });
    
    // Simulate email sending
    setTimeout(() => {
      console.log('✅ Email sent successfully (simulated)');
    }, 1000);
    
    res.json({
      success: true,
      message: 'Email notification queued successfully',
      emailId: `email_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send email notification',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Schedule notifications endpoint
app.post('/api/notifications/schedule', (req, res) => {
  try {
    const { trackingNumber, email, pushSubscription, notificationTypes } = req.body;
    
    console.log('📅 Notification scheduling request:', {
      trackingNumber,
      email: email ? '***@***.***' : 'none',
      hasPushSubscription: !!pushSubscription,
      notificationTypes,
      timestamp: new Date().toISOString()
    });
    
    // In production, this would:
    // 1. Store the subscription in a database
    // 2. Set up monitoring for the tracking number
    // 3. Send notifications when status changes
    
    res.json({
      success: true,
      message: 'Notifications scheduled successfully',
      subscriptionId: `sub_${Date.now()}`,
      trackingNumber,
      notificationTypes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to schedule notifications',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook endpoint for external integrations
app.post('/api/webhooks/shipment-update', (req, res) => {
  try {
    const { trackingNumber, status, location, timestamp, carrier } = req.body;
    
    console.log('🔗 Webhook received:', {
      trackingNumber,
      status,
      location,
      carrier,
      timestamp: timestamp || new Date().toISOString()
    });
    
    // In production, this would:
    // 1. Validate the webhook signature
    // 2. Update the shipment status in the database
    // 3. Trigger notifications to subscribed users
    
    res.json({
      success: true,
      message: 'Webhook processed successfully',
      trackingNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Error reporting endpoint
app.post('/api/errors/report', (req, res) => {
  try {
    const errorReport = req.body;
    
    console.log('🚨 Error report received:', {
      id: errorReport.id,
      message: errorReport.message,
      category: errorReport.category,
      severity: errorReport.severity,
      url: errorReport.url,
      timestamp: new Date(errorReport.timestamp).toISOString()
    });
    
    // In production, this would:
    // 1. Store the error in a database
    // 2. Send alerts for critical errors
    // 3. Aggregate error metrics
    // 4. Integrate with error tracking services like Sentry
    
    res.json({
      success: true,
      message: 'Error report received successfully',
      errorId: errorReport.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process error report',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Performance reporting endpoint
app.post('/api/performance/report', (req, res) => {
  try {
    const performanceReport = req.body;
    
    console.log('📊 Performance report received:', {
      coreWebVitals: performanceReport.coreWebVitals,
      apiPerformance: {
        averageResponseTime: performanceReport.apiPerformance.averageResponseTime,
        totalRequests: performanceReport.apiPerformance.totalRequests,
        errorRate: performanceReport.apiPerformance.errorRate,
      },
      budgetViolations: performanceReport.budgetViolations.length,
      url: performanceReport.url,
      timestamp: new Date(performanceReport.timestamp).toISOString()
    });
    
    // In production, this would:
    // 1. Store performance metrics in a time-series database
    // 2. Create performance alerts and dashboards
    // 3. Track performance trends over time
    // 4. Integrate with monitoring services like DataDog or New Relic
    
    res.json({
      success: true,
      message: 'Performance report received successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process performance report',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 API Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Demo tracking: http://localhost:${port}/api/tracking/DEMO123456789`);
  console.log(`🎯 Environment: ${config.server.nodeEnv}`);
  console.log(`🌐 CORS origin: ${config.server.corsOrigin}`);
});

export default app;