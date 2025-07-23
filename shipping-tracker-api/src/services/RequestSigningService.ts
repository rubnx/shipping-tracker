import crypto from 'crypto';
import { Request } from 'express';
import { loggingService } from './LoggingService';

export interface SignedRequest {
  timestamp: number;
  nonce: string;
  signature: string;
  body?: string;
  headers: Record<string, string>;
}

export interface SignatureValidationResult {
  isValid: boolean;
  error?: string;
  timestamp?: number;
  age?: number;
}

class RequestSigningService {
  private readonly signingKey: string;
  private readonly maxRequestAge: number = 5 * 60 * 1000; // 5 minutes
  private readonly usedNonces: Set<string> = new Set();
  private readonly nonceCleanupInterval: NodeJS.Timeout;

  constructor() {
    this.signingKey = process.env.REQUEST_SIGNING_KEY || this.generateSigningKey();
    
    // Clean up old nonces every 10 minutes
    this.nonceCleanupInterval = setInterval(() => {
      this.cleanupOldNonces();
    }, 10 * 60 * 1000);
  }

  private generateSigningKey(): string {
    const key = crypto.randomBytes(64).toString('hex');
    loggingService.warn('Generated new request signing key. Store this securely: REQUEST_SIGNING_KEY');
    return key;
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private createSignature(
    method: string,
    path: string,
    timestamp: number,
    nonce: string,
    body?: string
  ): string {
    const payload = [
      method.toUpperCase(),
      path,
      timestamp.toString(),
      nonce,
      body || ''
    ].join('\n');

    return crypto
      .createHmac('sha256', this.signingKey)
      .update(payload, 'utf8')
      .digest('hex');
  }

  public signRequest(
    method: string,
    path: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): SignedRequest {
    const timestamp = Date.now();
    const nonce = this.generateNonce();
    const bodyString = body ? JSON.stringify(body) : undefined;
    
    const signature = this.createSignature(method, path, timestamp, nonce, bodyString);

    const headers: Record<string, string> = {
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    return {
      timestamp,
      nonce,
      signature,
      body: bodyString,
      headers,
    };
  }

  public validateSignature(req: Request): SignatureValidationResult {
    const timestamp = req.headers['x-timestamp'] as string;
    const nonce = req.headers['x-nonce'] as string;
    const signature = req.headers['x-signature'] as string;

    // Check required headers
    if (!timestamp || !nonce || !signature) {
      return {
        isValid: false,
        error: 'Missing required signature headers',
      };
    }

    const requestTimestamp = parseInt(timestamp, 10);
    const now = Date.now();
    const age = now - requestTimestamp;

    // Check timestamp validity
    if (isNaN(requestTimestamp)) {
      return {
        isValid: false,
        error: 'Invalid timestamp format',
      };
    }

    // Check request age
    if (age > this.maxRequestAge) {
      return {
        isValid: false,
        error: 'Request too old',
        timestamp: requestTimestamp,
        age,
      };
    }

    if (age < -60000) { // Allow 1 minute clock skew
      return {
        isValid: false,
        error: 'Request timestamp in future',
        timestamp: requestTimestamp,
        age,
      };
    }

    // Check nonce uniqueness
    if (this.usedNonces.has(nonce)) {
      return {
        isValid: false,
        error: 'Nonce already used (replay attack)',
      };
    }

    // Generate expected signature
    const body = req.body ? JSON.stringify(req.body) : undefined;
    const expectedSignature = this.createSignature(
      req.method,
      req.path,
      requestTimestamp,
      nonce,
      body
    );

    // Verify signature
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (isValid) {
      // Store nonce to prevent replay
      this.usedNonces.add(nonce);
      
      loggingService.debug('Request signature validated', {
        method: req.method,
        path: req.path,
        timestamp: requestTimestamp,
        age,
      });
    } else {
      loggingService.warn('Invalid request signature', {
        method: req.method,
        path: req.path,
        timestamp: requestTimestamp,
        expectedSignature: expectedSignature.substring(0, 8) + '...',
        receivedSignature: signature.substring(0, 8) + '...',
      });
    }

    return {
      isValid,
      timestamp: requestTimestamp,
      age,
      error: isValid ? undefined : 'Invalid signature',
    };
  }

  public createSignedAPIClient() {
    return {
      get: (url: string, headers?: Record<string, string>) => {
        const signedRequest = this.signRequest('GET', url, undefined, headers);
        return fetch(url, {
          method: 'GET',
          headers: signedRequest.headers,
        });
      },

      post: (url: string, body?: any, headers?: Record<string, string>) => {
        const signedRequest = this.signRequest('POST', url, body, headers);
        return fetch(url, {
          method: 'POST',
          headers: signedRequest.headers,
          body: signedRequest.body,
        });
      },

      put: (url: string, body?: any, headers?: Record<string, string>) => {
        const signedRequest = this.signRequest('PUT', url, body, headers);
        return fetch(url, {
          method: 'PUT',
          headers: signedRequest.headers,
          body: signedRequest.body,
        });
      },

      delete: (url: string, headers?: Record<string, string>) => {
        const signedRequest = this.signRequest('DELETE', url, undefined, headers);
        return fetch(url, {
          method: 'DELETE',
          headers: signedRequest.headers,
        });
      },
    };
  }

  private cleanupOldNonces(): void {
    // In a production environment, you'd want to store nonces with timestamps
    // and clean up based on age. For simplicity, we'll clear all nonces periodically.
    const oldSize = this.usedNonces.size;
    this.usedNonces.clear();
    
    if (oldSize > 0) {
      loggingService.debug(`Cleaned up ${oldSize} old nonces`);
    }
  }

  public getSigningStats(): {
    usedNoncesCount: number;
    maxRequestAge: number;
    signingKeyLength: number;
  } {
    return {
      usedNoncesCount: this.usedNonces.size,
      maxRequestAge: this.maxRequestAge,
      signingKeyLength: this.signingKey.length,
    };
  }

  public cleanup(): void {
    if (this.nonceCleanupInterval) {
      clearInterval(this.nonceCleanupInterval);
    }
    this.usedNonces.clear();
  }
}

export const requestSigningService = new RequestSigningService();