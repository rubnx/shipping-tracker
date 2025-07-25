/**
 * Security utilities for input validation and protection
 * Implements comprehensive security hardening measures
 */

// Input validation utilities
export const validateTrackingNumber = (trackingNumber: string): boolean => {
  // Remove any potentially dangerous characters
  const sanitized = trackingNumber.replace(/[<>\"'&]/g, '');
  
  // Check format (alphanumeric, hyphens, underscores only)
  const validFormat = /^[A-Za-z0-9\-_]{3,50}$/.test(sanitized);
  
  return validFormat && sanitized.length >= 3 && sanitized.length <= 50;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Alias for sanitizeInput (for backward compatibility)
export const sanitizeString = (input: any): string => {
  if (typeof input !== 'string') {
    return '';
  }
  return sanitizeInput(input);
};

// Sanitize tracking number specifically
export const sanitizeTrackingNumber = (trackingNumber: string): string => {
  return sanitizeString(trackingNumber).replace(/[^A-Za-z0-9\-_]/g, '');
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Generate CSP header
export const generateCSPHeader = (): string => {
  return "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;";
};

// Get security headers
export const getSecurityHeaders = () => securityHeaders;

// API key validation
export const isValidApiKey = (apiKey: string): boolean => {
  return typeof apiKey === 'string' && apiKey.length >= 16 && apiKey.length <= 128;
};

// Generate secure token
export const generateSecureToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Hash data (simple implementation)
export const hashData = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

// Origin validation
export const isValidOrigin = (origin: string): boolean => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://yourdomain.com'];
  return allowedOrigins.includes(origin);
};

// Bot detection
export const isBotRequest = (userAgent: string): boolean => {
  const botPatterns = /bot|crawler|spider|scraper/i;
  return botPatterns.test(userAgent);
};

// Request size validation
export const isValidRequestSize = (size: number, maxSize: number = 1024 * 1024): boolean => {
  return size <= maxSize;
};

// Rate limiting utility
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
}

// CORS configuration
export const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
};