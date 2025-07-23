import webpush from 'web-push';
import { loggingService } from './LoggingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface PushSubscription {
  id: string;
  userId?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
  preferences: {
    statusUpdates: boolean;
    deliveryNotifications: boolean;
    delayAlerts: boolean;
    exceptionAlerts: boolean;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface PushNotification {
  id: string;
  subscriptionId: string;
  payload: PushNotificationPayload;
  status: 'pending' | 'sent' | 'failed' | 'expired';
  sentAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

class PushNotificationService {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private notificationQueue: PushNotification[] = [];
  private isProcessing = false;

  constructor() {
    // Configure web-push with VAPID keys
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@shippingtracker.com';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      loggingService.info('Push notification service initialized with VAPID keys');
    } else {
      loggingService.warn('Push notification service initialized without VAPID keys - notifications will not work');
    }

    this.startNotificationProcessor();
    this.loadSubscriptionsFromCache();
  }

  /**
   * Subscribe user to push notifications
   */
  public async subscribe(
    subscription: Omit<PushSubscription, 'id' | 'createdAt' | 'isActive'>,
    preferences?: Partial<PushSubscription['preferences']>
  ): Promise<string> {
    const id = this.generateId();
    const pushSubscription: PushSubscription = {
      ...subscription,
      id,
      createdAt: new Date().toISOString(),
      isActive: true,
      preferences: {
        statusUpdates: true,
        deliveryNotifications: true,
        delayAlerts: true,
        exceptionAlerts: true,
        ...preferences,
      },
    };

    this.subscriptions.set(id, pushSubscription);

    // Cache subscription for persistence
    await advancedCachingService.set(
      `push_subscription:${id}`,
      pushSubscription,
      2592000, // 30 days
      ['push_subscriptions']
    );

    loggingService.info('Push subscription created', {
      id,
      userId: subscription.userId,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    return id;
  }

  /**
   * Unsubscribe user from push notifications
   */
  public async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.isActive = false;
    this.subscriptions.set(subscriptionId, subscription);

    await advancedCachingService.set(
      `push_subscription:${subscriptionId}`,
      subscription,
      2592000,
      ['push_subscriptions']
    );

    loggingService.info('Push subscription deactivated', { subscriptionId });
    return true;
  }

  /**
   * Update subscription preferences
   */
  public async updatePreferences(
    subscriptionId: string,
    preferences: Partial<PushSubscription['preferences']>
  ): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.preferences = { ...subscription.preferences, ...preferences };
    this.subscriptions.set(subscriptionId, subscription);

    await advancedCachingService.set(
      `push_subscription:${subscriptionId}`,
      subscription,
      2592000,
      ['push_subscriptions']
    );

    loggingService.info('Push subscription preferences updated', {
      subscriptionId,
      preferences,
    });

    return true;
  }

  /**
   * Send push notification to specific subscription
   */
  public async sendNotification(
    subscriptionId: string,
    payload: PushNotificationPayload
  ): Promise<string> {
    const notification: PushNotification = {
      id: this.generateId(),
      subscriptionId,
      payload: {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
      },
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    };

    this.notificationQueue.push(notification);

    loggingService.info('Push notification queued', {
      id: notification.id,
      subscriptionId,
      title: payload.title,
    });

    return notification.id;
  }

  /**
   * Send push notification to multiple subscriptions
   */
  public async sendBulkNotification(
    subscriptionIds: string[],
    payload: PushNotificationPayload
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const subscriptionId of subscriptionIds) {
      const id = await this.sendNotification(subscriptionId, payload);
      notificationIds.push(id);
    }

    return notificationIds;
  }

  /**
   * Send notification to all active subscriptions with specific preferences
   */
  public async sendBroadcastNotification(
    payload: PushNotificationPayload,
    preferenceFilter?: keyof PushSubscription['preferences']
  ): Promise<string[]> {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive)
      .filter(sub => !preferenceFilter || sub.preferences[preferenceFilter]);

    const subscriptionIds = activeSubscriptions.map(sub => sub.id);
    return this.sendBulkNotification(subscriptionIds, payload);
  }

  /**
   * Send shipment status update notification
   */
  public async sendShipmentStatusUpdate(
    trackingNumber: string,
    status: string,
    location: string,
    description?: string
  ): Promise<string[]> {
    const payload: PushNotificationPayload = {
      title: `Shipment ${trackingNumber} Updated`,
      body: `Status: ${status} at ${location}`,
      icon: '/icons/shipment-update.png',
      badge: '/icons/badge.png',
      data: {
        type: 'shipment_status_update',
        trackingNumber,
        status,
        location,
        description,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
        {
          action: 'track',
          title: 'Track Shipment',
          icon: '/icons/track.png',
        },
      ],
      tag: `shipment_${trackingNumber}`,
    };

    return this.sendBroadcastNotification(payload, 'statusUpdates');
  }

  /**
   * Send delivery notification
   */
  public async sendDeliveryNotification(
    trackingNumber: string,
    deliveryLocation: string,
    deliveredAt: string
  ): Promise<string[]> {
    const payload: PushNotificationPayload = {
      title: `📦 Shipment ${trackingNumber} Delivered!`,
      body: `Delivered at ${deliveryLocation}`,
      icon: '/icons/delivered.png',
      badge: '/icons/badge.png',
      data: {
        type: 'shipment_delivered',
        trackingNumber,
        deliveryLocation,
        deliveredAt,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
      ],
      tag: `delivery_${trackingNumber}`,
      requireInteraction: true,
    };

    return this.sendBroadcastNotification(payload, 'deliveryNotifications');
  }

  /**
   * Send delay alert notification
   */
  public async sendDelayAlert(
    trackingNumber: string,
    originalEta: string,
    newEta: string,
    reason: string
  ): Promise<string[]> {
    const payload: PushNotificationPayload = {
      title: `⚠️ Shipment ${trackingNumber} Delayed`,
      body: `New ETA: ${newEta}. Reason: ${reason}`,
      icon: '/icons/delay.png',
      badge: '/icons/badge.png',
      data: {
        type: 'shipment_delayed',
        trackingNumber,
        originalEta,
        newEta,
        reason,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
      ],
      tag: `delay_${trackingNumber}`,
      requireInteraction: true,
    };

    return this.sendBroadcastNotification(payload, 'delayAlerts');
  }

  /**
   * Send exception alert notification
   */
  public async sendExceptionAlert(
    trackingNumber: string,
    exceptionType: string,
    location: string,
    description: string
  ): Promise<string[]> {
    const payload: PushNotificationPayload = {
      title: `🚨 Shipment ${trackingNumber} Exception`,
      body: `${exceptionType} at ${location}`,
      icon: '/icons/exception.png',
      badge: '/icons/badge.png',
      data: {
        type: 'shipment_exception',
        trackingNumber,
        exceptionType,
        location,
        description,
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
        {
          action: 'contact',
          title: 'Contact Support',
          icon: '/icons/support.png',
        },
      ],
      tag: `exception_${trackingNumber}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    return this.sendBroadcastNotification(payload, 'exceptionAlerts');
  }

  /**
   * Start notification processing queue
   */
  private startNotificationProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.notificationQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const notification = this.notificationQueue.shift();
        if (notification) {
          await this.processNotification(notification);
        }
      } catch (error) {
        loggingService.error('Error processing push notification queue', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Process individual push notification
   */
  private async processNotification(notification: PushNotification): Promise<void> {
    const subscription = this.subscriptions.get(notification.subscriptionId);
    if (!subscription || !subscription.isActive) {
      notification.status = 'failed';
      notification.error = 'Subscription not found or inactive';
      return;
    }

    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(notification.payload)
      );

      notification.status = 'sent';
      notification.sentAt = new Date().toISOString();

      // Update subscription last used timestamp
      subscription.lastUsed = new Date().toISOString();
      this.subscriptions.set(subscription.id, subscription);

      // Cache notification for audit trail
      await advancedCachingService.set(
        `push_notification:${notification.id}`,
        notification,
        604800, // 7 days
        ['push_notifications', 'sent_notifications']
      );

      loggingService.info('Push notification sent successfully', {
        id: notification.id,
        subscriptionId: notification.subscriptionId,
        title: notification.payload.title,
      });

    } catch (error: any) {
      notification.retryCount++;
      notification.error = error.message;

      // Handle specific error cases
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid
        subscription.isActive = false;
        this.subscriptions.set(subscription.id, subscription);
        notification.status = 'expired';

        loggingService.warn('Push subscription expired', {
          subscriptionId: notification.subscriptionId,
          error: error.message,
        });
      } else if (notification.retryCount < notification.maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, notification.retryCount) * 2000; // 2s, 4s, 8s

        setTimeout(() => {
          this.notificationQueue.push(notification);
        }, retryDelay);

        loggingService.warn('Push notification failed, retrying', {
          id: notification.id,
          attempt: notification.retryCount,
          error: error.message,
        });
      } else {
        notification.status = 'failed';

        // Cache failed notification for audit trail
        await advancedCachingService.set(
          `push_notification:${notification.id}`,
          notification,
          604800, // 7 days
          ['push_notifications', 'failed_notifications']
        );

        loggingService.error('Push notification failed permanently', error, {
          id: notification.id,
          subscriptionId: notification.subscriptionId,
          maxRetries: notification.maxRetries,
        });
      }
    }
  }

  /**
   * Get subscription by ID
   */
  public getSubscription(id: string): PushSubscription | null {
    return this.subscriptions.get(id) || null;
  }

  /**
   * Get subscriptions by user ID
   */
  public getSubscriptionsByUser(userId: string): PushSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  /**
   * List all active subscriptions
   */
  public listActiveSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive);
  }

  /**
   * Get notification by ID
   */
  public async getNotification(id: string): Promise<PushNotification | null> {
    return await advancedCachingService.get<PushNotification>(`push_notification:${id}`);
  }

  /**
   * Load subscriptions from cache on startup
   */
  private async loadSubscriptionsFromCache(): Promise<void> {
    try {
      const subscriptionKeys = await advancedCachingService.getKeysByTag('push_subscriptions');

      for (const key of subscriptionKeys) {
        if (key.startsWith('push_subscription:')) {
          const subscription = await advancedCachingService.get<PushSubscription>(key);
          if (subscription) {
            this.subscriptions.set(subscription.id, subscription);
          }
        }
      }

      loggingService.info('Push subscriptions loaded from cache', {
        count: this.subscriptions.size,
      });
    } catch (error) {
      loggingService.error('Failed to load push subscriptions from cache', error);
    }
  }

  /**
   * Get push notification statistics
   */
  public async getPushStats(): Promise<{
    activeSubscriptions: number;
    totalSent: number;
    totalFailed: number;
    queueSize: number;
  }> {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive).length;

    const sentKeys = await advancedCachingService.getKeysByTag('sent_notifications');
    const failedKeys = await advancedCachingService.getKeysByTag('failed_notifications');

    return {
      activeSubscriptions,
      totalSent: sentKeys.length,
      totalFailed: failedKeys.length,
      queueSize: this.notificationQueue.length,
    };
  }

  /**
   * Generate VAPID public key for client
   */
  public getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Test push notification
   */
  public async testNotification(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    try {
      const testPayload: PushNotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test push notification from Shipping Tracker',
        icon: '/icons/test.png',
        data: { test: true },
      };

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(testPayload)
      );

      return { success: true };
    } catch (error: any) {
      loggingService.error('Push notification test failed', error, { subscriptionId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const pushNotificationService = new PushNotificationService();