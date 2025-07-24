// Notification Service for Push Notifications and Email Notifications

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface EmailNotificationConfig {
  to: string;
  subject: string;
  body: string;
  trackingNumber: string;
  shipmentData?: any;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  payload: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private pushSubscription: PushSubscription | null = null;
  private notificationPermission: NotificationPermission = 'default';

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      
      if (this.notificationPermission === 'default') {
        console.log('📱 Notifications: Permission not yet requested');
      } else if (this.notificationPermission === 'granted') {
        console.log('✅ Notifications: Permission granted');
        await this.initializePushSubscription();
      } else {
        console.log('❌ Notifications: Permission denied');
      }
    } else {
      console.log('❌ Notifications: Not supported in this browser');
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('❌ Notifications: Not supported');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      
      if (permission === 'granted') {
        console.log('✅ Notifications: Permission granted');
        await this.initializePushSubscription();
        return true;
      } else {
        console.log('❌ Notifications: Permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Notifications: Error requesting permission', error);
      return false;
    }
  }

  /**
   * Initialize push subscription
   */
  private async initializePushSubscription(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          this.pushSubscription = existingSubscription;
          console.log('📱 Push: Using existing subscription');
          return;
        }

        // Create new subscription (would need VAPID keys in production)
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            // This would be your VAPID public key in production
            'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnKJuLFSUjNTahbeZ6-2Xj7u6tJqvnHCMjxJOTbIp_N0ne2Tc'
          )
        });

        this.pushSubscription = subscription;
        console.log('✅ Push: New subscription created');
        
        // Send subscription to server (in production)
        // await this.sendSubscriptionToServer(subscription);
        
      } catch (error) {
        console.error('❌ Push: Failed to initialize subscription', error);
      }
    }
  }

  /**
   * Show local notification
   */
  public async showNotification(config: NotificationConfig): Promise<boolean> {
    if (this.notificationPermission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(config.title, {
          body: config.body,
          icon: config.icon || '/favicon.ico',
          badge: config.badge || '/favicon.ico',
          tag: config.tag,
          data: config.data,
          actions: config.actions,
          requireInteraction: config.requireInteraction || false,
          silent: config.silent || false,
        });
      } else {
        // Fallback to basic notification
        new Notification(config.title, {
          body: config.body,
          icon: config.icon || '/favicon.ico',
          tag: config.tag,
          data: config.data,
        });
      }
      
      console.log('✅ Notification: Shown successfully');
      return true;
    } catch (error) {
      console.error('❌ Notification: Failed to show', error);
      return false;
    }
  }

  /**
   * Show shipment update notification
   */
  public async notifyShipmentUpdate(trackingNumber: string, status: string, location?: string): Promise<boolean> {
    const config: NotificationConfig = {
      title: 'Shipment Update',
      body: `${trackingNumber} is now ${status}${location ? ` at ${location}` : ''}`,
      tag: `shipment-${trackingNumber}`,
      data: {
        trackingNumber,
        status,
        location,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
      requireInteraction: true,
    };

    return await this.showNotification(config);
  }

  /**
   * Show delivery notification
   */
  public async notifyDelivery(trackingNumber: string, location: string): Promise<boolean> {
    const config: NotificationConfig = {
      title: 'Package Delivered! 📦',
      body: `Your shipment ${trackingNumber} has been delivered to ${location}`,
      tag: `delivery-${trackingNumber}`,
      data: {
        trackingNumber,
        status: 'delivered',
        location,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: 'view',
          title: 'View Details',
        },
        {
          action: 'rate',
          title: 'Rate Experience',
        },
      ],
      requireInteraction: true,
    };

    return await this.showNotification(config);
  }

  /**
   * Send email notification (would integrate with backend service)
   */
  public async sendEmailNotification(config: EmailNotificationConfig): Promise<boolean> {
    try {
      // In production, this would call your backend API
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: config.to,
          subject: config.subject,
          body: config.body,
          trackingNumber: config.trackingNumber,
          shipmentData: config.shipmentData,
        }),
      });

      if (response.ok) {
        console.log('✅ Email: Notification sent successfully');
        return true;
      } else {
        console.error('❌ Email: Failed to send notification', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Email: Error sending notification', error);
      return false;
    }
  }

  /**
   * Send webhook notification
   */
  public async sendWebhook(config: WebhookConfig): Promise<boolean> {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(config.payload),
      });

      if (response.ok) {
        console.log('✅ Webhook: Sent successfully');
        return true;
      } else {
        console.error('❌ Webhook: Failed to send', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Webhook: Error sending', error);
      return false;
    }
  }

  /**
   * Schedule notification for shipment updates
   */
  public async scheduleShipmentNotifications(trackingNumber: string, email?: string): Promise<boolean> {
    try {
      // In production, this would register with your backend service
      const response = await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumber,
          email,
          pushSubscription: this.pushSubscription,
          notificationTypes: ['status_change', 'delivery', 'delay'],
        }),
      });

      if (response.ok) {
        console.log('✅ Notifications: Scheduled successfully');
        return true;
      } else {
        console.error('❌ Notifications: Failed to schedule', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Notifications: Error scheduling', error);
      return false;
    }
  }

  /**
   * Unsubscribe from notifications
   */
  public async unsubscribe(): Promise<boolean> {
    try {
      if (this.pushSubscription) {
        await this.pushSubscription.unsubscribe();
        this.pushSubscription = null;
        console.log('✅ Push: Unsubscribed successfully');
      }
      return true;
    } catch (error) {
      console.error('❌ Push: Error unsubscribing', error);
      return false;
    }
  }

  /**
   * Get notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    return this.notificationPermission;
  }

  /**
   * Check if push notifications are supported
   */
  public isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Check if notifications are supported
   */
  public isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Utility function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();