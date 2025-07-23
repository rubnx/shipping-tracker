import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { loggingService } from './LoggingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastTriggered?: string;
  metadata?: Record<string, any>;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: any;
  signature: string;
}

export type WebhookEvent = 
  | 'shipment.status_updated'
  | 'shipment.delivered'
  | 'shipment.delayed'
  | 'shipment.exception'
  | 'container.loaded'
  | 'container.discharged'
  | 'vessel.departed'
  | 'vessel.arrived';

export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  payloadId: string;
  attempt: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  attemptedAt: string;
  nextRetryAt?: string;
}

class WebhookService {
  private client: AxiosInstance;
  private webhooks: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookPayload[] = [];
  private isProcessing = false;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShippingTracker-Webhook/1.0',
      },
    });

    // Start processing queue
    this.startQueueProcessor();

    loggingService.info('Webhook service initialized');
  }

  /**
   * Register a new webhook endpoint
   */
  public async registerWebhook(webhook: Omit<WebhookEndpoint, 'id' | 'createdAt'>): Promise<WebhookEndpoint> {
    const id = crypto.randomUUID();
    const newWebhook: WebhookEndpoint = {
      ...webhook,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: webhook.maxRetries || 3,
    };

    this.webhooks.set(id, newWebhook);
    
    // Cache webhook for persistence
    await advancedCachingService.set(
      `webhook:${id}`,
      newWebhook,
      86400, // 24 hours
      ['webhooks']
    );

    loggingService.info('Webhook registered', { webhookId: id, url: webhook.url });
    return newWebhook;
  }

  /**
   * Update webhook endpoint
   */
  public async updateWebhook(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return null;
    }

    const updatedWebhook = { ...webhook, ...updates };
    this.webhooks.set(id, updatedWebhook);
    
    await advancedCachingService.set(
      `webhook:${id}`,
      updatedWebhook,
      86400,
      ['webhooks']
    );

    loggingService.info('Webhook updated', { webhookId: id });
    return updatedWebhook;
  }

  /**
   * Delete webhook endpoint
   */
  public async deleteWebhook(id: string): Promise<boolean> {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      await advancedCachingService.delete(`webhook:${id}`);
      loggingService.info('Webhook deleted', { webhookId: id });
    }
    return deleted;
  }

  /**
   * Get webhook by ID
   */
  public getWebhook(id: string): WebhookEndpoint | null {
    return this.webhooks.get(id) || null;
  }

  /**
   * List all webhooks
   */
  public listWebhooks(): WebhookEndpoint[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Trigger webhook for specific event
   */
  public async triggerWebhook(event: WebhookEvent, data: any): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => webhook.isActive && webhook.events.includes(event));

    if (relevantWebhooks.length === 0) {
      loggingService.debug('No webhooks registered for event', { event });
      return;
    }

    for (const webhook of relevantWebhooks) {
      const payload: WebhookPayload = {
        id: crypto.randomUUID(),
        event,
        timestamp: new Date().toISOString(),
        data,
        signature: this.generateSignature(data, webhook.secret),
      };

      this.deliveryQueue.push(payload);
      
      // Update last triggered timestamp
      webhook.lastTriggered = new Date().toISOString();
      this.webhooks.set(webhook.id, webhook);
    }

    loggingService.info('Webhook triggered', { 
      event, 
      webhookCount: relevantWebhooks.length 
    });
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  public verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Start processing webhook delivery queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.deliveryQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const payload = this.deliveryQueue.shift();
        if (payload) {
          await this.processWebhookPayload(payload);
        }
      } catch (error) {
        loggingService.error('Error processing webhook queue', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Process individual webhook payload
   */
  private async processWebhookPayload(payload: WebhookPayload): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => webhook.isActive && webhook.events.includes(payload.event));

    for (const webhook of relevantWebhooks) {
      await this.deliverWebhook(webhook, payload);
    }
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(webhook: WebhookEndpoint, payload: WebhookPayload): Promise<void> {
    const deliveryAttempt: WebhookDeliveryAttempt = {
      id: crypto.randomUUID(),
      webhookId: webhook.id,
      payloadId: payload.id,
      attempt: webhook.retryCount + 1,
      status: 'pending',
      attemptedAt: new Date().toISOString(),
    };

    try {
      const response = await this.client.post(webhook.url, payload, {
        headers: {
          'X-Webhook-Signature': `sha256=${payload.signature}`,
          'X-Webhook-Event': payload.event,
          'X-Webhook-ID': payload.id,
          'X-Webhook-Timestamp': payload.timestamp,
        },
      });

      deliveryAttempt.status = 'success';
      deliveryAttempt.responseStatus = response.status;
      deliveryAttempt.responseBody = JSON.stringify(response.data);

      // Reset retry count on success
      webhook.retryCount = 0;
      this.webhooks.set(webhook.id, webhook);

      loggingService.info('Webhook delivered successfully', {
        webhookId: webhook.id,
        payloadId: payload.id,
        status: response.status,
      });

    } catch (error: any) {
      deliveryAttempt.status = 'failed';
      deliveryAttempt.error = error.message;
      
      if (error.response) {
        deliveryAttempt.responseStatus = error.response.status;
        deliveryAttempt.responseBody = JSON.stringify(error.response.data);
      }

      webhook.retryCount++;
      
      if (webhook.retryCount < webhook.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, webhook.retryCount) * 1000; // 2s, 4s, 8s, etc.
        deliveryAttempt.nextRetryAt = new Date(Date.now() + retryDelay).toISOString();
        deliveryAttempt.status = 'retrying';
        
        setTimeout(() => {
          this.deliveryQueue.push(payload);
        }, retryDelay);

        loggingService.warn('Webhook delivery failed, retrying', {
          webhookId: webhook.id,
          payloadId: payload.id,
          attempt: webhook.retryCount,
          nextRetryAt: deliveryAttempt.nextRetryAt,
          error: error.message,
        });
      } else {
        // Max retries reached, disable webhook
        webhook.isActive = false;
        this.webhooks.set(webhook.id, webhook);

        loggingService.error('Webhook delivery failed permanently, disabling', {
          webhookId: webhook.id,
          payloadId: payload.id,
          maxRetries: webhook.maxRetries,
          error: error.message,
        });
      }
    }

    // Store delivery attempt for audit trail
    await advancedCachingService.set(
      `webhook_delivery:${deliveryAttempt.id}`,
      deliveryAttempt,
      604800, // 7 days
      ['webhook_deliveries', `webhook:${webhook.id}`]
    );
  }

  /**
   * Get webhook delivery history
   */
  public async getDeliveryHistory(webhookId: string, limit = 50): Promise<WebhookDeliveryAttempt[]> {
    // This would typically query a database
    // For now, we'll return cached delivery attempts
    const cacheKeys = await advancedCachingService.getKeysByTag(`webhook:${webhookId}`);
    const deliveryKeys = cacheKeys.filter(key => key.startsWith('webhook_delivery:'));
    
    const deliveries: WebhookDeliveryAttempt[] = [];
    for (const key of deliveryKeys.slice(0, limit)) {
      const delivery = await advancedCachingService.get<WebhookDeliveryAttempt>(key);
      if (delivery) {
        deliveries.push(delivery);
      }
    }

    return deliveries.sort((a, b) => 
      new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
    );
  }

  /**
   * Test webhook endpoint
   */
  public async testWebhook(webhookId: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: 'shipment.status_updated',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
      signature: this.generateSignature({ test: true }, webhook.secret),
    };

    const startTime = Date.now();
    
    try {
      const response = await this.client.post(webhook.url, testPayload, {
        headers: {
          'X-Webhook-Signature': `sha256=${testPayload.signature}`,
          'X-Webhook-Event': testPayload.event,
          'X-Webhook-ID': testPayload.id,
          'X-Webhook-Timestamp': testPayload.timestamp,
          'X-Webhook-Test': 'true',
        },
      });

      const responseTime = Date.now() - startTime;
      
      loggingService.info('Webhook test successful', {
        webhookId,
        responseTime,
        status: response.status,
      });

      return { success: true, responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      loggingService.error('Webhook test failed', error, {
        webhookId,
        responseTime,
      });

      return { 
        success: false, 
        error: error.message,
        responseTime 
      };
    }
  }

  /**
   * Load webhooks from cache on startup
   */
  public async loadWebhooksFromCache(): Promise<void> {
    try {
      const webhookKeys = await advancedCachingService.getKeysByTag('webhooks');
      
      for (const key of webhookKeys) {
        if (key.startsWith('webhook:')) {
          const webhook = await advancedCachingService.get<WebhookEndpoint>(key);
          if (webhook) {
            this.webhooks.set(webhook.id, webhook);
          }
        }
      }

      loggingService.info('Webhooks loaded from cache', { 
        count: this.webhooks.size 
      });
    } catch (error) {
      loggingService.error('Failed to load webhooks from cache', error);
    }
  }

  /**
   * Get webhook statistics
   */
  public async getWebhookStats(webhookId: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    lastDelivery?: string;
  }> {
    const deliveries = await this.getDeliveryHistory(webhookId, 1000);
    
    const successful = deliveries.filter(d => d.status === 'success');
    const failed = deliveries.filter(d => d.status === 'failed');
    
    const responseTimes = deliveries
      .map(d => {
        if (d.attemptedAt) {
          // Calculate response time from attempt timestamp
          return 1000; // Placeholder - would calculate actual response time
        }
        return 0;
      })
      .filter(t => t > 0);

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    return {
      totalDeliveries: deliveries.length,
      successfulDeliveries: successful.length,
      failedDeliveries: failed.length,
      averageResponseTime,
      lastDelivery: deliveries.length > 0 ? deliveries[0].attemptedAt : undefined,
    };
  }
}

export const webhookService = new WebhookService();