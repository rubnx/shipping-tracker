import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { apiKeyValidation, recordAPIUsage } from '../middleware/apiKeyMiddleware';
import { generalRateLimit } from '../middleware/securityMiddleware';

const router = Router();
const notificationController = new NotificationController();

// Apply middleware to all routes
router.use(generalRateLimit);
router.use(apiKeyValidation('notifications'));
router.use(recordAPIUsage);

// Webhook routes
router.post('/webhooks', notificationController.registerWebhook);
router.get('/webhooks', notificationController.listWebhooks);
router.get('/webhooks/:webhookId', notificationController.getWebhook);
router.put('/webhooks/:webhookId', notificationController.updateWebhook);
router.delete('/webhooks/:webhookId', notificationController.deleteWebhook);
router.post('/webhooks/:webhookId/test', notificationController.testWebhook);
router.get('/webhooks/:webhookId/deliveries', notificationController.getWebhookDeliveries);
router.get('/webhooks/:webhookId/stats', notificationController.getWebhookStats);

// Email notification routes
router.post('/email/send', notificationController.sendEmail);
router.get('/email/:emailId/status', notificationController.getEmailStatus);
router.get('/email/templates', notificationController.listEmailTemplates);
router.post('/email/test-config', notificationController.testEmailConfig);

// Push notification routes
router.post('/push/subscribe', notificationController.subscribePush);
router.delete('/push/subscribe/:subscriptionId', notificationController.unsubscribePush);
router.put('/push/subscribe/:subscriptionId/preferences', notificationController.updatePushPreferences);
router.post('/push/subscribe/:subscriptionId/test', notificationController.testPushNotification);
router.get('/push/vapid-key', notificationController.getVapidPublicKey);

// Statistics routes
router.get('/stats', notificationController.getNotificationStats);

export { router as notificationRoutes };