import { Router } from 'express';
import { apiKeyManager } from '../services/APIKeyManager';
import { requestSigningService } from '../services/RequestSigningService';
import { requireAdminKey, requireSignedRequest, logSensitiveOperation } from '../middleware/apiKeyMiddleware';
import { loggingService } from '../services/LoggingService';

const router = Router();

// Get all API keys (admin only)
router.get('/keys', 
  requireAdminKey,
  logSensitiveOperation('list_api_keys'),
  (req, res) => {
    try {
      const keys = apiKeyManager.getAllKeys();
      res.json({
        success: true,
        data: keys,
        count: keys.length,
      });
    } catch (error) {
      loggingService.error('Failed to list API keys', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve API keys',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get API key usage statistics
router.get('/keys/:keyId/usage',
  requireAdminKey,
  (req, res) => {
    try {
      const { keyId } = req.params;
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
      
      const stats = apiKeyManager.getUsageStatistics(keyId, timeWindow);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      loggingService.error('Failed to get usage statistics', error as Error, {
        keyId: req.params.keyId,
      });
      res.status(500).json({
        error: 'Failed to retrieve usage statistics',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get overall usage statistics
router.get('/usage',
  requireAdminKey,
  (req, res) => {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : undefined;
      const stats = apiKeyManager.getUsageStatistics(undefined, timeWindow);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      loggingService.error('Failed to get overall usage statistics', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve usage statistics',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Rotate API key (signed request required)
router.post('/keys/:keyId/rotate',
  requireAdminKey,
  requireSignedRequest,
  logSensitiveOperation('rotate_api_key'),
  (req, res) => {
    try {
      const { keyId } = req.params;
      const { newKey } = req.body;

      if (!newKey) {
        return res.status(400).json({
          error: 'New API key is required',
          code: 'MISSING_NEW_KEY',
        });
      }

      const success = apiKeyManager.rotateAPIKey(keyId, newKey);
      
      if (!success) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND',
        });
      }

      loggingService.info('API key rotated successfully', {
        keyId,
        rotatedBy: req.ip,
      });

      res.json({
        success: true,
        message: 'API key rotated successfully',
      });
    } catch (error) {
      loggingService.error('Failed to rotate API key', error as Error, {
        keyId: req.params.keyId,
      });
      res.status(500).json({
        error: 'Failed to rotate API key',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Deactivate API key (signed request required)
router.post('/keys/:keyId/deactivate',
  requireAdminKey,
  requireSignedRequest,
  logSensitiveOperation('deactivate_api_key'),
  (req, res) => {
    try {
      const { keyId } = req.params;
      
      const success = apiKeyManager.deactivateAPIKey(keyId);
      
      if (!success) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'KEY_NOT_FOUND',
        });
      }

      loggingService.info('API key deactivated', {
        keyId,
        deactivatedBy: req.ip,
      });

      res.json({
        success: true,
        message: 'API key deactivated successfully',
      });
    } catch (error) {
      loggingService.error('Failed to deactivate API key', error as Error, {
        keyId: req.params.keyId,
      });
      res.status(500).json({
        error: 'Failed to deactivate API key',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Add new API key (signed request required)
router.post('/keys',
  requireAdminKey,
  requireSignedRequest,
  logSensitiveOperation('add_api_key'),
  (req, res) => {
    try {
      const { name, key, provider, environment, expiresAt, rateLimit, metadata } = req.body;

      if (!name || !key || !provider || !environment) {
        return res.status(400).json({
          error: 'Missing required fields: name, key, provider, environment',
          code: 'MISSING_REQUIRED_FIELDS',
        });
      }

      const keyId = apiKeyManager.addAPIKey({
        name,
        key,
        provider,
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        rateLimit,
        metadata,
      });

      loggingService.info('New API key added', {
        keyId,
        provider,
        environment,
        addedBy: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          keyId,
          message: 'API key added successfully',
        },
      });
    } catch (error) {
      loggingService.error('Failed to add API key', error as Error);
      res.status(500).json({
        error: 'Failed to add API key',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Check API key health
router.get('/health',
  requireAdminKey,
  (req, res) => {
    try {
      const keys = apiKeyManager.getAllKeys();
      const activeKeys = keys.filter(k => k.isActive);
      const expiringSoon = keys.filter(k => 
        k.expiresAt && 
        k.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
      );

      const signingStats = requestSigningService.getSigningStats();

      res.json({
        success: true,
        data: {
          totalKeys: keys.length,
          activeKeys: activeKeys.length,
          expiringSoon: expiringSoon.length,
          signingService: signingStats,
          providers: [...new Set(keys.map(k => k.provider))],
        },
      });
    } catch (error) {
      loggingService.error('Failed to get API key health', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve API key health',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Generate signed request example (for testing)
router.post('/sign-request',
  requireAdminKey,
  (req, res) => {
    try {
      const { method, path, body, headers } = req.body;

      if (!method || !path) {
        return res.status(400).json({
          error: 'Method and path are required',
          code: 'MISSING_REQUIRED_FIELDS',
        });
      }

      const signedRequest = requestSigningService.signRequest(method, path, body, headers);

      res.json({
        success: true,
        data: signedRequest,
      });
    } catch (error) {
      loggingService.error('Failed to sign request', error as Error);
      res.status(500).json({
        error: 'Failed to sign request',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export { router as apiKeyRoutes };