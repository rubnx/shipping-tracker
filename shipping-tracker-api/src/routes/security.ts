import { Router } from 'express';
import { securityAuditService } from '../services/SecurityAuditService';
import { requireAdminKey, logSensitiveOperation } from '../middleware/apiKeyMiddleware';
import { query, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/securityMiddleware';
import { loggingService } from '../services/LoggingService';

const router = Router();

// Get security metrics
router.get('/metrics',
  requireAdminKey,
  [
    query('timeWindow')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Time window must be a positive integer (milliseconds)'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
      const metrics = securityAuditService.getSecurityMetrics(timeWindow);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      loggingService.error('Failed to get security metrics', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve security metrics',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get security events
router.get('/events',
  requireAdminKey,
  [
    query('type')
      .optional()
      .isIn(['authentication', 'authorization', 'input_validation', 'rate_limit', 'suspicious_activity', 'data_access'])
      .withMessage('Invalid event type'),
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),
    query('ip')
      .optional()
      .isIP()
      .withMessage('Invalid IP address'),
    query('resolved')
      .optional()
      .isBoolean()
      .withMessage('Resolved must be a boolean'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const criteria: any = {};
      
      if (req.query.type) criteria.type = req.query.type;
      if (req.query.severity) criteria.severity = req.query.severity;
      if (req.query.ip) criteria.ip = req.query.ip;
      if (req.query.resolved !== undefined) criteria.resolved = req.query.resolved === 'true';
      
      const events = securityAuditService.searchEvents(criteria);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const limitedEvents = events.slice(0, limit);
      
      res.json({
        success: true,
        data: limitedEvents,
        total: events.length,
        returned: limitedEvents.length,
      });
    } catch (error) {
      loggingService.error('Failed to get security events', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve security events',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get specific security event
router.get('/events/:eventId',
  requireAdminKey,
  [
    param('eventId')
      .matches(/^sec_\d+_[a-z0-9]+$/)
      .withMessage('Invalid event ID format'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { eventId } = req.params;
      const event = securityAuditService.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({
          error: 'Security event not found',
          code: 'EVENT_NOT_FOUND',
        });
      }
      
      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      loggingService.error('Failed to get security event', error as Error, {
        eventId: req.params.eventId,
      });
      res.status(500).json({
        error: 'Failed to retrieve security event',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Resolve security event
router.post('/events/:eventId/resolve',
  requireAdminKey,
  logSensitiveOperation('resolve_security_event'),
  [
    param('eventId')
      .matches(/^sec_\d+_[a-z0-9]+$/)
      .withMessage('Invalid event ID format'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { eventId } = req.params;
      const resolvedBy = req.headers['x-admin-user'] as string || 'admin';
      
      const success = securityAuditService.resolveEvent(eventId, resolvedBy);
      
      if (!success) {
        return res.status(404).json({
          error: 'Security event not found',
          code: 'EVENT_NOT_FOUND',
        });
      }
      
      res.json({
        success: true,
        message: 'Security event resolved successfully',
      });
    } catch (error) {
      loggingService.error('Failed to resolve security event', error as Error, {
        eventId: req.params.eventId,
      });
      res.status(500).json({
        error: 'Failed to resolve security event',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get unresolved events
router.get('/events/unresolved',
  requireAdminKey,
  (req, res) => {
    try {
      const events = securityAuditService.getUnresolvedEvents();
      
      res.json({
        success: true,
        data: events,
        count: events.length,
      });
    } catch (error) {
      loggingService.error('Failed to get unresolved events', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve unresolved events',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Generate security report
router.get('/report',
  requireAdminKey,
  [
    query('timeWindow')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Time window must be a positive integer (milliseconds)'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
      const report = securityAuditService.generateSecurityReport(timeWindow);
      
      res.json({
        success: true,
        data: report,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      loggingService.error('Failed to generate security report', error as Error);
      res.status(500).json({
        error: 'Failed to generate security report',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Export security events
router.get('/export',
  requireAdminKey,
  logSensitiveOperation('export_security_events'),
  [
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    query('timeWindow')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Time window must be a positive integer (milliseconds)'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
      
      const exportData = securityAuditService.exportEvents(format, timeWindow);
      
      const contentType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `security-events-${new Date().toISOString().split('T')[0]}.${format}`;
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      loggingService.error('Failed to export security events', error as Error);
      res.status(500).json({
        error: 'Failed to export security events',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Clean up old events
router.post('/cleanup',
  requireAdminKey,
  logSensitiveOperation('cleanup_security_events'),
  [
    query('olderThanDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('olderThanDays must be between 1 and 365'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const olderThanDays = req.query.olderThanDays ? parseInt(req.query.olderThanDays as string) : 30;
      const removedCount = securityAuditService.clearOldEvents(olderThanDays);
      
      res.json({
        success: true,
        message: `Cleaned up ${removedCount} old security events`,
        removedCount,
      });
    } catch (error) {
      loggingService.error('Failed to cleanup security events', error as Error);
      res.status(500).json({
        error: 'Failed to cleanup security events',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Record manual security event (for testing)
router.post('/events',
  requireAdminKey,
  logSensitiveOperation('create_security_event'),
  [
    query('type')
      .isIn(['authentication', 'authorization', 'input_validation', 'rate_limit', 'suspicious_activity', 'data_access'])
      .withMessage('Invalid event type'),
    query('severity')
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { type, severity, details } = req.body;
      
      const eventId = securityAuditService.recordSecurityEvent(
        type,
        severity,
        req,
        details || {}
      );
      
      res.status(201).json({
        success: true,
        data: {
          eventId,
          message: 'Security event recorded successfully',
        },
      });
    } catch (error) {
      loggingService.error('Failed to record security event', error as Error);
      res.status(500).json({
        error: 'Failed to record security event',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export { router as securityRoutes };