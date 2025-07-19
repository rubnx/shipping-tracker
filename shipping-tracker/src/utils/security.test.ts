import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeString,
  sanitizeTrackingNumber,
  isValidEmail,
  isValidUrl,
  RateLimiter,
  generateCSPHeader,
  getSecurityHeaders,
  isValidApiKey,
  generateSecureToken,
  hashData,
  isValidOrigin,
  isBotRequest,
  isValidRequestSize,
} from './security';

describe('security utilities', () => {
  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeString('onclick=alert("xss")')).toBe('alert("xss")');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });
  });

  describe('sanitizeTrackingNumber', () => {
    it('should only allow alphanumeric characters, hyphens, and spaces', () => {
      expect(sanitizeTrackingNumber('ABC123-456')).toBe('ABC123-456');
      expect(sanitizeTrackingNumber('abc 123 def')).toBe('ABC 123 DEF');
      expect(sanitizeTrackingNumber('ABC@123#456')).toBe('ABC123456');
    });

    it('should convert to uppercase', () => {
      expect(sanitizeTrackingNumber('abc123')).toBe('ABC123');
    });

    it('should handle non-string input', () => {
      expect(sanitizeTrackingNumber(null as any)).toBe('');
      expect(sanitizeTrackingNumber(undefined as any)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject very long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert("xss")')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
    });

    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
    });

    it('should block requests over limit', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });

    it('should track different users separately', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      
      expect(rateLimiter.isAllowed('user1')).toBe(false);
      expect(rateLimiter.isAllowed('user2')).toBe(true);
    });

    it('should return correct remaining requests', () => {
      expect(rateLimiter.getRemainingRequests('user1')).toBe(3);
      rateLimiter.isAllowed('user1');
      expect(rateLimiter.getRemainingRequests('user1')).toBe(2);
    });

    it('should clear rate limit data', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.clear();
      expect(rateLimiter.getRemainingRequests('user1')).toBe(3);
    });
  });

  describe('generateCSPHeader', () => {
    it('should generate a valid CSP header', () => {
      const csp = generateCSPHeader();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return security headers object', () => {
      const headers = getSecurityHeaders();
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
    });
  });

  describe('isValidApiKey', () => {
    it('should validate correct API key format', () => {
      expect(isValidApiKey('abcdef1234567890abcdef1234567890')).toBe(true);
      expect(isValidApiKey('A'.repeat(32))).toBe(true);
    });

    it('should reject invalid API key format', () => {
      expect(isValidApiKey('short')).toBe(false);
      expect(isValidApiKey('invalid-chars!')).toBe(false);
      expect(isValidApiKey('')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(isValidApiKey(null as any)).toBe(false);
      expect(isValidApiKey(undefined as any)).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      expect(generateSecureToken(16)).toHaveLength(16);
      expect(generateSecureToken(32)).toHaveLength(32);
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should only contain alphanumeric characters', () => {
      const token = generateSecureToken();
      expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('hashData', () => {
    it('should hash data consistently', async () => {
      const hash1 = await hashData('test data');
      const hash2 = await hashData('test data');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', async () => {
      const hash1 = await hashData('data1');
      const hash2 = await hashData('data2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a string', async () => {
      const hash = await hashData('test');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('isValidOrigin', () => {
    it('should validate allowed origins', () => {
      const allowedOrigins = ['https://example.com', 'http://localhost:3000'];
      expect(isValidOrigin('https://example.com', allowedOrigins)).toBe(true);
      expect(isValidOrigin('http://localhost:3000', allowedOrigins)).toBe(true);
    });

    it('should reject disallowed origins', () => {
      const allowedOrigins = ['https://example.com'];
      expect(isValidOrigin('https://malicious.com', allowedOrigins)).toBe(false);
    });

    it('should handle wildcard origin', () => {
      const allowedOrigins = ['*'];
      expect(isValidOrigin('https://any-domain.com', allowedOrigins)).toBe(true);
    });

    it('should reject empty origin', () => {
      const allowedOrigins = ['https://example.com'];
      expect(isValidOrigin('', allowedOrigins)).toBe(false);
    });
  });

  describe('isBotRequest', () => {
    it('should detect bot user agents', () => {
      expect(isBotRequest('Googlebot/2.1')).toBe(true);
      expect(isBotRequest('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
      expect(isBotRequest('curl/7.68.0')).toBe(true);
      expect(isBotRequest('python-requests/2.25.1')).toBe(true);
    });

    it('should not flag normal browsers', () => {
      expect(isBotRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(false);
      expect(isBotRequest('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')).toBe(false);
    });

    it('should flag empty user agent as suspicious', () => {
      expect(isBotRequest('')).toBe(true);
      expect(isBotRequest(null as any)).toBe(true);
    });
  });

  describe('isValidRequestSize', () => {
    it('should validate request sizes within limit', () => {
      expect(isValidRequestSize(1000, 2000)).toBe(true);
      expect(isValidRequestSize(500)).toBe(true);
    });

    it('should reject oversized requests', () => {
      expect(isValidRequestSize(2000, 1000)).toBe(false);
      expect(isValidRequestSize(2 * 1024 * 1024)).toBe(false); // 2MB > default 1MB
    });

    it('should reject zero or negative sizes', () => {
      expect(isValidRequestSize(0)).toBe(false);
      expect(isValidRequestSize(-1)).toBe(false);
    });
  });
});