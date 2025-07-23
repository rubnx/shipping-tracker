import nodemailer, { Transporter } from 'nodemailer';
import { loggingService } from './LoggingService';
import { advancedCachingService } from './AdvancedCachingService';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
}

export interface EmailNotification {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
  scheduledAt?: string;
  sentAt?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

class EmailNotificationService {
  private transporter: Transporter;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private emailQueue: EmailNotification[] = [];
  private isProcessing = false;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM || 'noreply@shippingtracker.com',
      replyTo: process.env.SMTP_REPLY_TO,
    };

    this.transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    this.initializeTemplates();
    this.startEmailProcessor();

    loggingService.info('Email notification service initialized', {
      host: this.config.host,
      port: this.config.port,
    });
  }

  /**
   * Initialize default email templates
   */
  private initializeTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'shipment-status-update',
        name: 'Shipment Status Update',
        subject: 'Shipment {{trackingNumber}} Status Update',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Shipment Status Update</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
              <p><strong>Status:</strong> <span style="color: #059669;">{{status}}</span></p>
              <p><strong>Location:</strong> {{location}}</p>
              <p><strong>Updated:</strong> {{timestamp}}</p>
            </div>
            {{#if description}}
            <p><strong>Description:</strong> {{description}}</p>
            {{/if}}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Track your shipment: <a href="{{trackingUrl}}" style="color: #2563eb;">{{trackingUrl}}</a>
              </p>
            </div>
          </div>
        `,
        textTemplate: `
Shipment Status Update

Tracking Number: {{trackingNumber}}
Status: {{status}}
Location: {{location}}
Updated: {{timestamp}}

{{#if description}}
Description: {{description}}
{{/if}}

Track your shipment: {{trackingUrl}}
        `,
        variables: ['trackingNumber', 'status', 'location', 'timestamp', 'description', 'trackingUrl'],
      },
      {
        id: 'shipment-delivered',
        name: 'Shipment Delivered',
        subject: 'Shipment {{trackingNumber}} Delivered',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎉 Shipment Delivered!</h2>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
              <p><strong>Delivered At:</strong> {{deliveredAt}}</p>
              <p><strong>Delivery Location:</strong> {{deliveryLocation}}</p>
              {{#if recipient}}
              <p><strong>Received By:</strong> {{recipient}}</p>
              {{/if}}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Thank you for using our tracking service!
              </p>
            </div>
          </div>
        `,
        textTemplate: `
🎉 Shipment Delivered!

Tracking Number: {{trackingNumber}}
Delivered At: {{deliveredAt}}
Delivery Location: {{deliveryLocation}}
{{#if recipient}}
Received By: {{recipient}}
{{/if}}

Thank you for using our tracking service!
        `,
        variables: ['trackingNumber', 'deliveredAt', 'deliveryLocation', 'recipient'],
      },
      {
        id: 'shipment-delayed',
        name: 'Shipment Delayed',
        subject: 'Shipment {{trackingNumber}} Delayed',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Shipment Delayed</h2>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
              <p><strong>Original ETA:</strong> {{originalEta}}</p>
              <p><strong>New ETA:</strong> {{newEta}}</p>
              <p><strong>Reason:</strong> {{reason}}</p>
            </div>
            <p>We apologize for the inconvenience. We'll continue monitoring your shipment and notify you of any further updates.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Track your shipment: <a href="{{trackingUrl}}" style="color: #2563eb;">{{trackingUrl}}</a>
              </p>
            </div>
          </div>
        `,
        textTemplate: `
⚠️ Shipment Delayed

Tracking Number: {{trackingNumber}}
Original ETA: {{originalEta}}
New ETA: {{newEta}}
Reason: {{reason}}

We apologize for the inconvenience. We'll continue monitoring your shipment and notify you of any further updates.

Track your shipment: {{trackingUrl}}
        `,
        variables: ['trackingNumber', 'originalEta', 'newEta', 'reason', 'trackingUrl'],
      },
      {
        id: 'shipment-exception',
        name: 'Shipment Exception',
        subject: 'Shipment {{trackingNumber}} Exception',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🚨 Shipment Exception</h2>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
              <p><strong>Exception Type:</strong> {{exceptionType}}</p>
              <p><strong>Location:</strong> {{location}}</p>
              <p><strong>Description:</strong> {{description}}</p>
              <p><strong>Occurred At:</strong> {{timestamp}}</p>
            </div>
            <p>Please contact the carrier or shipper for more information about resolving this exception.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Track your shipment: <a href="{{trackingUrl}}" style="color: #2563eb;">{{trackingUrl}}</a>
              </p>
            </div>
          </div>
        `,
        textTemplate: `
🚨 Shipment Exception

Tracking Number: {{trackingNumber}}
Exception Type: {{exceptionType}}
Location: {{location}}
Description: {{description}}
Occurred At: {{timestamp}}

Please contact the carrier or shipper for more information about resolving this exception.

Track your shipment: {{trackingUrl}}
        `,
        variables: ['trackingNumber', 'exceptionType', 'location', 'description', 'timestamp', 'trackingUrl'],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    loggingService.info('Email templates initialized', { count: templates.length });
  }

  /**
   * Send email notification
   */
  public async sendEmail(notification: Omit<EmailNotification, 'id' | 'status' | 'retryCount'>): Promise<string> {
    const emailNotification: EmailNotification = {
      ...notification,
      id: this.generateId(),
      status: 'pending',
      retryCount: 0,
      maxRetries: notification.maxRetries || 3,
    };

    // If using template, render the email
    if (notification.templateId && notification.variables) {
      const template = this.templates.get(notification.templateId);
      if (template) {
        emailNotification.subject = this.renderTemplate(template.subject, notification.variables);
        emailNotification.html = this.renderTemplate(template.htmlTemplate, notification.variables);
        emailNotification.text = this.renderTemplate(template.textTemplate, notification.variables);
      }
    }

    this.emailQueue.push(emailNotification);

    loggingService.info('Email queued for sending', {
      id: emailNotification.id,
      to: emailNotification.to,
      subject: emailNotification.subject,
      priority: emailNotification.priority,
    });

    return emailNotification.id;
  }

  /**
   * Send templated email
   */
  public async sendTemplatedEmail(
    templateId: string,
    to: string[],
    variables: Record<string, any>,
    options: {
      cc?: string[];
      bcc?: string[];
      priority?: 'low' | 'normal' | 'high';
      scheduledAt?: string;
    } = {}
  ): Promise<string> {
    return this.sendEmail({
      to,
      cc: options.cc,
      bcc: options.bcc,
      subject: '', // Will be rendered from template
      html: '', // Will be rendered from template
      text: '', // Will be rendered from template
      templateId,
      variables,
      priority: options.priority || 'normal',
      scheduledAt: options.scheduledAt,
      maxRetries: 3,
    });
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    // Simple template rendering (replace {{variable}} with values)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });

    // Handle conditional blocks {{#if variable}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return variables[variable] ? content : '';
    });

    return rendered;
  }

  /**
   * Start email processing queue
   */
  private startEmailProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.emailQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        // Process emails by priority
        this.emailQueue.sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        const email = this.emailQueue.shift();
        if (email) {
          await this.processEmail(email);
        }
      } catch (error) {
        loggingService.error('Error processing email queue', error);
      } finally {
        this.isProcessing = false;
      }
    }, 2000); // Process every 2 seconds
  }

  /**
   * Process individual email
   */
  private async processEmail(email: EmailNotification): Promise<void> {
    // Check if email is scheduled for future
    if (email.scheduledAt && new Date(email.scheduledAt) > new Date()) {
      // Put back in queue for later processing
      this.emailQueue.push(email);
      return;
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: email.to.join(', '),
        cc: email.cc?.join(', '),
        bcc: email.bcc?.join(', '),
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: this.config.replyTo,
      };

      await this.transporter.sendMail(mailOptions);

      email.status = 'sent';
      email.sentAt = new Date().toISOString();

      // Cache sent email for audit trail
      await advancedCachingService.set(
        `email:${email.id}`,
        email,
        604800, // 7 days
        ['emails', 'sent_emails']
      );

      loggingService.info('Email sent successfully', {
        id: email.id,
        to: email.to,
        subject: email.subject,
      });

    } catch (error: any) {
      email.retryCount++;
      email.error = error.message;

      if (email.retryCount < email.maxRetries) {
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, email.retryCount) * 5000; // 5s, 10s, 20s
        
        setTimeout(() => {
          this.emailQueue.push(email);
        }, retryDelay);

        loggingService.warn('Email sending failed, retrying', {
          id: email.id,
          attempt: email.retryCount,
          error: error.message,
        });
      } else {
        email.status = 'failed';
        
        // Cache failed email for audit trail
        await advancedCachingService.set(
          `email:${email.id}`,
          email,
          604800, // 7 days
          ['emails', 'failed_emails']
        );

        loggingService.error('Email sending failed permanently', error, {
          id: email.id,
          to: email.to,
          subject: email.subject,
          maxRetries: email.maxRetries,
        });
      }
    }
  }

  /**
   * Get email by ID
   */
  public async getEmail(id: string): Promise<EmailNotification | null> {
    return await advancedCachingService.get<EmailNotification>(`email:${id}`);
  }

  /**
   * Get email template
   */
  public getTemplate(id: string): EmailTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * List all templates
   */
  public listTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add or update email template
   */
  public setTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    loggingService.info('Email template updated', { id: template.id, name: template.name });
  }

  /**
   * Delete email template
   */
  public deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      loggingService.info('Email template deleted', { id });
    }
    return deleted;
  }

  /**
   * Test email configuration
   */
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error: any) {
      loggingService.error('Email connection test failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get email statistics
   */
  public async getEmailStats(): Promise<{
    totalSent: number;
    totalFailed: number;
    queueSize: number;
    templatesCount: number;
  }> {
    const sentKeys = await advancedCachingService.getKeysByTag('sent_emails');
    const failedKeys = await advancedCachingService.getKeysByTag('failed_emails');

    return {
      totalSent: sentKeys.length,
      totalFailed: failedKeys.length,
      queueSize: this.emailQueue.length,
      templatesCount: this.templates.size,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const emailNotificationService = new EmailNotificationService();