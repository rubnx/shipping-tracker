import { Request, Response } from 'express';
import { webhookService } from '../services/WebhookService';
import { emailNotificationService } from '../services/EmailNotificationService';
import { pushNotificationService } from '../services/PushNotificationService';
import { loggingService } from '../services/LoggingService';

export class NotificationController {
  /**
   * Register webhook endpoint
   */
  public async registerWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { url, secret, events, metadata } = req.body;

      if (!url || !secret || !events || !Array.isArray(events)) {
        res.status(400).json({
          error: 'Missing required fields: url, secret, events',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const webhook = await webhookService.registerWebhook({
        url,
        secret,
        events,
        isActive: true,
        retryCount: 0,
        maxRetries: 3,
        metadata,
      });

      res.status(201).json({
        data: webhook,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook registration error', error);
      res.status(500).json({
        error: 'Failed to register webhook',
        code: 'WEBHOOK_REGISTRATION_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Update webhook endpoint
   */
  public async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      const updates = req.body;

      const webhook = await webhookService.updateWebhook(webhookId, updates);
      
      if (!webhook) {
        res.status(404).json({
          error: 'Webhook not found',
          code: 'WEBHOOK_NOT_FOUND',
        });
        return;
      }

      res.json({
        data: webhook,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook update error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to update webhook',
        code: 'WEBHOOK_UPDATE_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Delete webhook endpoint
   */
  public async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const deleted = await webhookService.deleteWebhook(webhookId);
      
      if (!deleted) {
        res.status(404).json({
          error: 'Webhook not found',
          code: 'WEBHOOK_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error: any) {
      loggingService.error('Webhook deletion error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to delete webhook',
        code: 'WEBHOOK_DELETE_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get webhook details
   */
  public async getWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const webhook = webhookService.getWebhook(webhookId);
      
      if (!webhook) {
        res.status(404).json({
          error: 'Webhook not found',
          code: 'WEBHOOK_NOT_FOUND',
        });
        return;
      }

      res.json({
        data: webhook,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook retrieval error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to retrieve webhook',
        code: 'WEBHOOK_RETRIEVAL_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * List all webhooks
   */
  public async listWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const webhooks = webhookService.listWebhooks();

      res.json({
        data: webhooks,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: webhooks.length,
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook listing error', error);
      res.status(500).json({
        error: 'Failed to list webhooks',
        code: 'WEBHOOK_LIST_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Test webhook endpoint
   */
  public async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const result = await webhookService.testWebhook(webhookId);

      res.json({
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook test error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to test webhook',
        code: 'WEBHOOK_TEST_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get webhook delivery history
   */
  public async getWebhookDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const deliveries = await webhookService.getDeliveryHistory(webhookId, limit);

      res.json({
        data: deliveries,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: deliveries.length,
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook delivery history error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to retrieve webhook deliveries',
        code: 'WEBHOOK_DELIVERIES_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get webhook statistics
   */
  public async getWebhookStats(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const stats = await webhookService.getWebhookStats(webhookId);

      res.json({
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Webhook stats error', error, { webhookId: req.params.webhookId });
      res.status(500).json({
        error: 'Failed to retrieve webhook statistics',
        code: 'WEBHOOK_STATS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Send email notification
   */
  public async sendEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, subject, html, text, templateId, variables, priority } = req.body;

      if (!to || (!subject && !templateId)) {
        res.status(400).json({
          error: 'Missing required fields: to, and either subject or templateId',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      let emailId: string;

      if (templateId) {
        emailId = await emailNotificationService.sendTemplatedEmail(
          templateId,
          Array.isArray(to) ? to : [to],
          variables || {},
          { priority: priority || 'normal' }
        );
      } else {
        emailId = await emailNotificationService.sendEmail({
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || '',
          text: text || '',
          priority: priority || 'normal',
          maxRetries: 3,
        });
      }

      res.status(202).json({
        data: { emailId },
        message: 'Email queued for sending',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Email sending error', error);
      res.status(500).json({
        error: 'Failed to send email',
        code: 'EMAIL_SEND_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get email status
   */
  public async getEmailStatus(req: Request, res: Response): Promise<void> {
    try {
      const { emailId } = req.params;

      const email = await emailNotificationService.getEmail(emailId);
      
      if (!email) {
        res.status(404).json({
          error: 'Email not found',
          code: 'EMAIL_NOT_FOUND',
        });
        return;
      }

      res.json({
        data: {
          id: email.id,
          status: email.status,
          sentAt: email.sentAt,
          error: email.error,
          retryCount: email.retryCount,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Email status error', error, { emailId: req.params.emailId });
      res.status(500).json({
        error: 'Failed to retrieve email status',
        code: 'EMAIL_STATUS_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * List email templates
   */
  public async listEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = emailNotificationService.listTemplates();

      res.json({
        data: templates,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          count: templates.length,
        },
      });
    } catch (error: any) {
      loggingService.error('Email templates listing error', error);
      res.status(500).json({
        error: 'Failed to list email templates',
        code: 'EMAIL_TEMPLATES_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Test email configuration
   */
  public async testEmailConfig(req: Request, res: Response): Promise<void> {
    try {
      const result = await emailNotificationService.testConnection();

      res.json({
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Email config test error', error);
      res.status(500).json({
        error: 'Failed to test email configuration',
        code: 'EMAIL_CONFIG_TEST_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribePush(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint, keys, userAgent, userId, preferences } = req.body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        res.status(400).json({
          error: 'Missing required fields: endpoint, keys.p256dh, keys.auth',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const subscriptionId = await pushNotificationService.subscribe({
        endpoint,
        keys,
        userAgent,
        userId,
      }, preferences);

      res.status(201).json({
        data: { subscriptionId },
        message: 'Push subscription created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Push subscription error', error);
      res.status(500).json({
        error: 'Failed to create push subscription',
        code: 'PUSH_SUBSCRIPTION_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribePush(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const success = await pushNotificationService.unsubscribe(subscriptionId);
      
      if (!success) {
        res.status(404).json({
          error: 'Push subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Push subscription cancelled successfully',
      });
    } catch (error: any) {
      loggingService.error('Push unsubscription error', error, { subscriptionId: req.params.subscriptionId });
      res.status(500).json({
        error: 'Failed to cancel push subscription',
        code: 'PUSH_UNSUBSCRIPTION_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Update push notification preferences
   */
  public async updatePushPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;
      const preferences = req.body;

      const success = await pushNotificationService.updatePreferences(subscriptionId, preferences);
      
      if (!success) {
        res.status(404).json({
          error: 'Push subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Push preferences updated successfully',
      });
    } catch (error: any) {
      loggingService.error('Push preferences update error', error, { subscriptionId: req.params.subscriptionId });
      res.status(500).json({
        error: 'Failed to update push preferences',
        code: 'PUSH_PREFERENCES_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Send test push notification
   */
  public async testPushNotification(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      const result = await pushNotificationService.testNotification(subscriptionId);

      res.json({
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Push notification test error', error, { subscriptionId: req.params.subscriptionId });
      res.status(500).json({
        error: 'Failed to test push notification',
        code: 'PUSH_TEST_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get VAPID public key
   */
  public async getVapidPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const publicKey = pushNotificationService.getVapidPublicKey();

      if (!publicKey) {
        res.status(503).json({
          error: 'Push notifications not configured',
          code: 'PUSH_NOT_CONFIGURED',
        });
        return;
      }

      res.json({
        data: { publicKey },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('VAPID key retrieval error', error);
      res.status(500).json({
        error: 'Failed to retrieve VAPID public key',
        code: 'VAPID_KEY_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * Get notification statistics
   */
  public async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const [emailStats, pushStats] = await Promise.all([
        emailNotificationService.getEmailStats(),
        pushNotificationService.getPushStats(),
      ]);

      res.json({
        data: {
          email: emailStats,
          push: pushStats,
          webhooks: {
            total: webhookService.listWebhooks().length,
            active: webhookService.listWebhooks().filter(w => w.isActive).length,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      });
    } catch (error: any) {
      loggingService.error('Notification stats error', error);
      res.status(500).json({
        error: 'Failed to retrieve notification statistics',
        code: 'NOTIFICATION_STATS_ERROR',
        message: error.message,
      });
    }
  }
}