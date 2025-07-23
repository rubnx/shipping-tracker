import { loggingService } from './LoggingService';
import { captureException } from '../config/sentry';

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'shipment_update' | 'delivery_alert' | 'delay_notification' | 'custom';
  channels: string[];
  subject?: string;
  body: string;
  variables: string[];
  conditions?: Record<string, any>;
}

export interface NotificationEvent {
  id: string;
  type: string;
  recipient: string;
  channel: string;
  template: string;
  data: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  headers?: Record<string, string>;
  createdAt: Date;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
}

class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private events: NotificationEvent[] = [];
  private webhooks: Map<string, WebhookSubscription> = new Map();
  private processingQueue: NotificationEvent[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
    this.startProcessingQueue();
  }

  private initializeDefaultChannels(): void {
    const defaultChannels: Omit<NotificationChannel, 'id'>[] = [
      {
        type: 'email',
        name: 'Email Notifications',
        config: {
          smtp: {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
          from: process.env.EMAIL_FROM || 'noreply@shipping-tracker.com',
        },
        enabled: !!process.env.SMTP_HOST,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      },
      {
        type: 'webhook',
        name: 'Webhook Notifications',
        config: {
          timeout: 10000,
          userAgent: 'ShippingTracker/1.0',
        },
        enabled: true,
        retryPolicy: {
          maxRetries: 5,
          backoffMultiplier: 2,
          initialDelay: 2000,
        },
      },
      {
        type: 'slack',
        name: 'Slack Notifications',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#notifications',
          username: 'Shipping Tracker',
          iconEmoji: ':ship:',
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
        },
      },
    ];

    defaultChannels.forEach(channel => {
      const id = this.generateId();
      this.channels.set(id, { ...channel, id });
    });

    loggingService.info('Notification channels initialized', {
      count: this.channels.size,
      enabled: Array.from(this.channels.values()).filter(c => c.enabled).length,
    });
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id'>[] = [
      {
        name: 'Shipment Status Update',
        type: 'shipment_update',
        channels: ['email', 'webhook'],
        subject: 'Shipment {{trackingNumber}} Status Update',
        body: `Your shipment {{trackingNumber}} has been updated:
        
Status: {{status}}
Location: {{location}}
Estimated Delivery: {{estimatedDelivery}}
        
Track your shipment: {{trackingUrl}}`,
        variables: ['trackingNumber', 'status', 'location', 'estimatedDelivery', 'trackingUrl'],
      },
      {
        name: 'Delivery Alert',
        type: 'delivery_alert',
        channels: ['email', 'sms', 'push'],
        subject: 'Your shipment {{trackingNumber}} has been delivered!',
        body: `Great news! Your shipment {{trackingNumber}} has been delivered.
        
Delivered to: {{deliveryAddress}}
Delivered at: {{deliveryTime}}
Signed by: {{signedBy}}`,
        variables: ['trackingNumber', 'deliveryAddress', 'deliveryTime', 'signedBy'],
      },
      {
        name: 'Delay Notification',
        type: 'delay_notification',
        channels: ['email', 'webhook'],
        subject: 'Shipment {{trackingNumber}} Delayed',
        body: `We wanted to inform you that your shipment {{trackingNumber}} has been delayed.
        
Original ETA: {{originalEta}}
New ETA: {{newEta}}
Reason: {{delayReason}}
        
We apologize for any inconvenience.`,
        variables: ['trackingNumber', 'originalEta', 'newEta', 'delayReason'],
      },
    ];

    defaultTemplates.forEach(template => {
      const id = this.generateId();
      this.templates.set(id, { ...template, id });
    });

    loggingService.info('Notification templates initialized', {
      count: this.templates.size,
    });
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async sendNotification(
    type: string,
    recipient: string,
    data: Record<string, any>,
    options?: {
      templateId?: string;
      channels?: string[];
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<string[]> {
    const template = options?.templateId 
      ? this.templates.get(options.templateId)
      : Array.from(this.templates.values()).find(t => t.type === type);

    if (!template) {
      throw new Error(`No template found for notification type: ${type}`);
    }

    const targetChannels = options?.channels || template.channels;
    const eventIds: string[] = [];

    for (const channelType of targetChannels) {
      const channel = Array.from(this.channels.values()).find(c => c.type === channelType && c.enabled);
      
      if (!channel) {
        loggingService.warn('Channel not found or disabled', { channelType });
        continue;
      }

      const event: NotificationEvent = {
        id: this.generateId(),
        type,
        recipient,
        channel: channel.id,
        template: template.id,
        data,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
      };

      this.events.push(event);
      this.processingQueue.push(event);
      eventIds.push(event.id);
    }

    loggingService.info('Notifications queued', {
      type,
      recipient,
      channels: targetChannels,
      eventIds,
    });

    return eventIds;
  }

  private startProcessingQueue(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Process every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const batch = this.processingQueue.splice(0, 10); // Process 10 at a time
    
    const promises = batch.map(event => this.processNotificationEvent(event));
    await Promise.allSettled(promises);
  }

  private async processNotificationEvent(event: NotificationEvent): Promise<void> {
    const channel = this.channels.get(event.channel);
    const template = this.templates.get(event.template);

    if (!channel || !template) {
      event.status = 'failed';
      event.error = 'Channel or template not found';
      return;
    }

    event.attempts++;
    event.status = 'retrying';

    try {
      const renderedContent = this.renderTemplate(template, event.data);
      
      switch (channel.type) {
        case 'email':
          await this.sendEmail(channel, event.recipient, renderedContent);
          break;
        case 'sms':
          await this.sendSMS(channel, event.recipient, renderedContent);
          break;
        case 'push':
          await this.sendPushNotification(channel, event.recipient, renderedContent);
          break;
        case 'webhook':
          await this.sendWebhook(channel, event.recipient, renderedContent, event.data);
          break;
        case 'slack':
          await this.sendSlack(channel, renderedContent);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }

      event.status = 'sent';
      event.sentAt = new Date();
      
      loggingService.info('Notification sent successfully', {
        eventId: event.id,
        type: event.type,
        channel: channel.type,
        recipient: event.recipient,
      });

    } catch (error) {
      event.error = (error as Error).message;
      
      if (event.attempts >= channel.retryPolicy.maxRetries) {
        event.status = 'failed';
        
        loggingService.error('Notification failed after all retries', error as Error, {
          eventId: event.id,
          attempts: event.attempts,
          maxRetries: channel.retryPolicy.maxRetries,
        });
        
        captureException(error as Error, {
          eventId: event.id,
          notificationType: event.type,
          channel: channel.type,
        });
      } else {
        // Schedule retry
        const delay = channel.retryPolicy.initialDelay * 
                     Math.pow(channel.retryPolicy.backoffMultiplier, event.attempts - 1);
        
        setTimeout(() => {
          this.processingQueue.push(event);
        }, delay);
        
        loggingService.warn('Notification failed, will retry', {
          eventId: event.id,
          attempt: event.attempts,
          nextRetryIn: delay,
          error: (error as Error).message,
        });
      }
    }
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): {
    subject?: string;
    body: string;
  } {
    const renderText = (text: string) => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return data[variable] || match;
      });
    };

    return {
      subject: template.subject ? renderText(template.subject) : undefined,
      body: renderText(template.body),
    };
  }

  private async sendEmail(
    channel: NotificationChannel,
    recipient: string,
    content: { subject?: string; body: string }
  ): Promise<void> {
    // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
    loggingService.info('Email notification sent', {
      to: recipient,
      subject: content.subject,
      bodyLength: content.body.length,
    });
  }

  private async sendSMS(
    channel: NotificationChannel,
    recipient: string,
    content: { body: string }
  ): Promise<void> {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    loggingService.info('SMS notification sent', {
      to: recipient,
      bodyLength: content.body.length,
    });
  }

  private async sendPushNotification(
    channel: NotificationChannel,
    recipient: string,
    content: { subject?: string; body: string }
  ): Promise<void> {
    // In production, integrate with push service (Firebase, Apple Push, etc.)
    loggingService.info('Push notification sent', {
      to: recipient,
      title: content.subject,
      bodyLength: content.body.length,
    });
  }

  private async sendWebhook(
    channel: NotificationChannel,
    recipient: string,
    content: { subject?: string; body: string },
    data: Record<string, any>
  ): Promise<void> {
    const payload = {
      recipient,
      subject: content.subject,
      body: content.body,
      data,
      timestamp: new Date().toISOString(),
    };

    // This would be handled by the webhook system
    loggingService.info('Webhook notification prepared', {
      recipient,
      payloadSize: JSON.stringify(payload).length,
    });
  }

  private async sendSlack(
    channel: NotificationChannel,
    content: { subject?: string; body: string }
  ): Promise<void> {
    const webhookUrl = channel.config.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      text: content.subject || content.body,
      attachments: content.subject ? [{
        color: 'good',
        text: content.body,
      }] : undefined,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }

  // Webhook Management
  public createWebhookSubscription(
    url: string,
    events: string[],
    options?: {
      secret?: string;
      headers?: Record<string, string>;
      retryPolicy?: Partial<WebhookSubscription['retryPolicy']>;
    }
  ): string {
    const subscription: WebhookSubscription = {
      id: this.generateId(),
      url,
      events,
      secret: options?.secret || this.generateSecret(),
      active: true,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        ...options?.retryPolicy,
      },
      headers: options?.headers,
      createdAt: new Date(),
      successCount: 0,
      failureCount: 0,
    };

    this.webhooks.set(subscription.id, subscription);
    
    loggingService.info('Webhook subscription created', {
      id: subscription.id,
      url: subscription.url,
      events: subscription.events,
    });

    return subscription.id;
  }

  public async triggerWebhook(eventType: string, data: Record<string, any>): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values()).filter(
      webhook => webhook.active && webhook.events.includes(eventType)
    );

    if (relevantWebhooks.length === 0) {
      return;
    }

    const promises = relevantWebhooks.map(webhook => 
      this.deliverWebhook(webhook, eventType, data)
    );

    await Promise.allSettled(promises);
  }

  private async deliverWebhook(
    webhook: WebhookSubscription,
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    const payload = {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      webhook_id: webhook.id,
    };

    const signature = this.generateWebhookSignature(JSON.stringify(payload), webhook.secret);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': eventType,
      'User-Agent': 'ShippingTracker-Webhook/1.0',
      ...webhook.headers,
    };

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= webhook.retryPolicy.maxRetries) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          webhook.successCount++;
          webhook.lastTriggered = new Date();
          
          loggingService.info('Webhook delivered successfully', {
            webhookId: webhook.id,
            eventType,
            url: webhook.url,
            statusCode: response.status,
          });
          
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts <= webhook.retryPolicy.maxRetries) {
          const delay = webhook.retryPolicy.initialDelay * 
                       Math.pow(webhook.retryPolicy.backoffMultiplier, attempts - 1);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    webhook.failureCount++;
    
    loggingService.error('Webhook delivery failed after all retries', lastError, {
      webhookId: webhook.id,
      eventType,
      url: webhook.url,
      attempts,
    });
  }

  private generateSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  public getNotificationStats(): {
    totalEvents: number;
    sentEvents: number;
    failedEvents: number;
    pendingEvents: number;
    channelStats: Record<string, number>;
    webhookStats: {
      total: number;
      active: number;
      totalDeliveries: number;
      successfulDeliveries: number;
      failedDeliveries: number;
    };
  } {
    const channelStats: Record<string, number> = {};
    
    this.events.forEach(event => {
      const channel = this.channels.get(event.channel);
      if (channel) {
        channelStats[channel.type] = (channelStats[channel.type] || 0) + 1;
      }
    });

    const webhookStats = Array.from(this.webhooks.values()).reduce(
      (stats, webhook) => ({
        total: stats.total + 1,
        active: stats.active + (webhook.active ? 1 : 0),
        totalDeliveries: stats.totalDeliveries + webhook.successCount + webhook.failureCount,
        successfulDeliveries: stats.successfulDeliveries + webhook.successCount,
        failedDeliveries: stats.failedDeliveries + webhook.failureCount,
      }),
      { total: 0, active: 0, totalDeliveries: 0, successfulDeliveries: 0, failedDeliveries: 0 }
    );

    return {
      totalEvents: this.events.length,
      sentEvents: this.events.filter(e => e.status === 'sent').length,
      failedEvents: this.events.filter(e => e.status === 'failed').length,
      pendingEvents: this.events.filter(e => e.status === 'pending' || e.status === 'retrying').length,
      channelStats,
      webhookStats,
    };
  }

  public cleanup(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.channels.clear();
    this.templates.clear();
    this.events = [];
    this.webhooks.clear();
    this.processingQueue = [];
  }
}

export const notificationService = new NotificationService();