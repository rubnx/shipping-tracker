import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { trackingRoutes } from './routes/tracking';
import dashboardRoutes from './routes/dashboard';
import optimizationRoutes from './routes/optimization';
import { config, validateEnvironment } from './config/environment';
import { testConnection } from './config/database';
import { runMigrations } from './database/migrator';
import { initSentry, Sentry } from './config/sentry';
import { performanceMonitor } from './services/PerformanceMonitoringService';
import { loggingService } from './services/LoggingService';
import { logRotationService } from './services/LogRotationService';
import { alertingService } from './services/AlertingService';
import { 
  generalRateLimit, 
  securityHeaders, 
  sanitizeInput, 
  suspiciousActivityDetection,
  auditLogger 
} from './middleware/securityMiddleware';
import { apiKeyRoutes } from './routes/apiKeys';
import { securityRoutes } from './routes/security';
import { notificationRoutes } from './routes/notifications';
import { analyticsRoutes } from './routes/analytics';

// Initialize Sentry for error tracking
initSentry();

// Validate environment variables
validateEnvironment();

const app = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: `${config.rateLimit.windowMs / 60000} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Sentry request handler (must be first)
app.use(Sentry.Handlers.requestHandler());

// Security headers
app.use(securityHeaders);

// Request logging and audit
app.use(auditLogger);
app.use(loggingService.requestLoggingMiddleware());

// Input sanitization and validation
app.use(sanitizeInput);
app.use(suspiciousActivityDetection);

// Rate limiting
app.use(generalRateLimit);

// Performance monitoring middleware
app.use(performanceMonitor.performanceMiddleware());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = performanceMonitor.getHealthStatus();
  
  res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    performance: healthStatus,
  });
});

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
  const timeWindow = parseInt(req.query.window as string) || 300000; // 5 minutes default
  const summary = performanceMonitor.getMetricsSummary(timeWindow);
  
  res.json({
    metrics: summary,
    timestamp: new Date().toISOString(),
  });
});

// Logging endpoints
app.get('/api/logs', (req, res) => {
  const options = {
    level: req.query.level as any,
    service: req.query.service as string,
    requestId: req.query.requestId as string,
    since: req.query.since ? new Date(req.query.since as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  
  const logs = loggingService.getLogs(options);
  const summary = loggingService.getLogSummary();
  
  res.json({
    logs,
    summary,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/logs/export', (req, res) => {
  const format = (req.query.format as 'json' | 'csv') || 'json';
  const options = {
    since: req.query.since ? new Date(req.query.since as string) : undefined,
    level: req.query.level as any,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  
  const exportData = loggingService.exportLogs(format, options);
  
  res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="logs.${format}"`);
  res.send(exportData);
});

app.get('/api/logs/files', async (req, res) => {
  const files = await logRotationService.getLogFiles();
  const status = logRotationService.getStatus();
  
  res.json({
    files,
    status,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/logs/files/:filename', async (req, res) => {
  const content = await logRotationService.getLogFileContent(req.params.filename);
  
  if (!content) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.send(content);
});

// Alerts endpoint
app.get('/api/alerts', (req, res) => {
  const resolved = req.query.resolved === 'true' ? true : 
                   req.query.resolved === 'false' ? false : undefined;
  
  const alerts = alertingService.getAlerts(resolved);
  const summary = alertingService.getAlertSummary();
  
  res.json({
    alerts,
    summary,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/tracking', trackingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/admin', apiKeyRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler());

// Performance monitoring error middleware
app.use(performanceMonitor.errorMiddleware());

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    loggingService.info('Starting server initialization...');
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      loggingService.fatal('Failed to connect to database. Server will not start.');
      process.exit(1);
    }
    loggingService.info('Database connection established');

    // Run database migrations
    await runMigrations();
    loggingService.info('Database migrations completed');

    // Start server
    app.listen(PORT, () => {
      loggingService.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthCheck: `http://localhost:${PORT}/health`,
        apiBase: `http://localhost:${PORT}/api`,
      });
      
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 API base URL: http://localhost:${PORT}/api`);
      console.log(`📝 Logs: http://localhost:${PORT}/api/logs`);
      console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
      console.log(`🚨 Alerts: http://localhost:${PORT}/api/alerts`);
    });
  } catch (error) {
    loggingService.fatal('Failed to start server', error as Error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  loggingService.info('SIGTERM received, starting graceful shutdown...');
  
  // Force log rotation before shutdown
  await logRotationService.forceRotation();
  
  // Cleanup services
  performanceMonitor.clearMetrics();
  alertingService.cleanup();
  logRotationService.cleanup();
  
  loggingService.info('Graceful shutdown completed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  loggingService.info('SIGINT received, starting graceful shutdown...');
  
  // Force log rotation before shutdown
  await logRotationService.forceRotation();
  
  // Cleanup services
  performanceMonitor.clearMetrics();
  alertingService.cleanup();
  logRotationService.cleanup();
  
  loggingService.info('Graceful shutdown completed');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  loggingService.fatal('Uncaught exception', error);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  loggingService.fatal('Unhandled promise rejection', reason as Error, {
    promise: promise.toString(),
  });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;