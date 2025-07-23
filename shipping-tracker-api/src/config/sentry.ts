import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',
    beforeSend(event) {
      // Filter out sensitive information
      if (event.request?.url) {
        // Remove API keys from URLs
        event.request.url = event.request.url.replace(/[?&]key=[^&]+/g, '');
      }
      
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-api-key'];
        delete event.request.headers['cookie'];
      }
      
      // Remove sensitive data from request body
      if (event.request?.data) {
        if (typeof event.request.data === 'string') {
          try {
            const data = JSON.parse(event.request.data);
            delete data.apiKey;
            delete data.password;
            delete data.token;
            event.request.data = JSON.stringify(data);
          } catch {
            // If not JSON, leave as is
          }
        }
      }
      
      return event;
    },
  });
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureMessage(message, level);
  });
};

export const addBreadcrumb = (message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: any) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({ name, op });
};

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> => {
  const transaction = Sentry.startTransaction({
    name,
    op: 'custom',
    tags,
  });

  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};

export { Sentry };