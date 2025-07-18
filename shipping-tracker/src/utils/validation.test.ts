import { describe, it, expect } from 'vitest';
import { detectTrackingType, validateTrackingNumber } from './index';

describe('Tracking Number Validation', () => {
  describe('detectTrackingType', () => {
    describe('Container Numbers', () => {
      it('should detect valid container numbers', () => {
        const validContainerNumbers = [
          'ABCD1234567',
          'MAEU1234567',
          'TCLU9876543',
          'GESU1111111',
        ];

        validContainerNumbers.forEach(number => {
          expect(detectTrackingType(number)).toBe('container');
        });
      });

      it('should handle container numbers with lowercase', () => {
        expect(detectTrackingType('abcd1234567')).toBe('container');
        expect(detectTrackingType('MaEu1234567')).toBe('container');
      });

      it('should handle container numbers with whitespace', () => {
        expect(detectTrackingType('  ABCD1234567  ')).toBe('container');
        expect(detectTrackingType('\tMAEU1234567\n')).toBe('container');
      });

      it('should reject invalid container number formats', () => {
        const invalidContainerNumbers = [
          'ABC1234567',    // Only 3 letters
          'ABCDE1234567',  // 5 letters
          'ABCD123456',    // Only 6 digits
          'ABCD12345678',  // 8 digits
          'ABCD123456A',   // Letter at end
          '1234ABCD567',   // Numbers first
        ];

        invalidContainerNumbers.forEach(number => {
          expect(detectTrackingType(number)).not.toBe('container');
        });
      });
    });

    describe('Booking Numbers', () => {
      it('should detect valid booking numbers', () => {
        const validBookingNumbers = [
          'ABC123456789',
          'MAEU123456',
          'BOOKING123',
          'B12345678901',
          'ABCDEF123456',
        ];

        validBookingNumbers.forEach(number => {
          expect(detectTrackingType(number)).toBe('booking');
        });
      });

      it('should handle booking numbers with mixed case', () => {
        expect(detectTrackingType('abc123456789')).toBe('booking');
        expect(detectTrackingType('MaEu123456')).toBe('booking');
      });

      it('should handle booking numbers with whitespace', () => {
        expect(detectTrackingType('  ABC123456789  ')).toBe('booking');
        expect(detectTrackingType('\tMAEU123456\n')).toBe('booking');
      });

      it('should reject invalid booking number formats', () => {
        const invalidBookingNumbers = [
          'ABC12',         // Too short
          'ABCDEFGHIJKLM', // Too long
          'ABC-123456',    // Contains hyphen
          'ABC 123456',    // Contains space
          '',              // Empty
        ];

        invalidBookingNumbers.forEach(number => {
          expect(detectTrackingType(number)).not.toBe('booking');
        });
      });
    });

    describe('Bill of Lading Numbers', () => {
      it('should detect valid BOL numbers', () => {
        const validBOLNumbers = [
          'ABCD123456789012',
          'MAEU12345678901234',
          'BOL123456789012345',
          'AB1234567890123',
        ];

        validBOLNumbers.forEach(number => {
          expect(detectTrackingType(number)).toBe('bol');
        });
      });

      it('should handle BOL numbers with mixed case', () => {
        expect(detectTrackingType('abcd123456789012')).toBe('bol');
        expect(detectTrackingType('MaEu12345678901234')).toBe('bol');
      });

      it('should handle BOL numbers with whitespace', () => {
        expect(detectTrackingType('  ABCD123456789012  ')).toBe('bol');
        expect(detectTrackingType('\tMAEU12345678901234\n')).toBe('bol');
      });

      it('should reject invalid BOL number formats', () => {
        const invalidBOLNumbers = [
          'A123456',       // Too short
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789', // Too long
          'A1234567890',   // Only 1 letter at start
          '123456789012',  // No letters at start
          'ABCDE1234',     // Too few characters after letters
        ];

        invalidBOLNumbers.forEach(number => {
          expect(detectTrackingType(number)).not.toBe('bol');
        });
      });
    });

    describe('Edge Cases', () => {
      it('should return null for empty or whitespace-only strings', () => {
        expect(detectTrackingType('')).toBeNull();
        expect(detectTrackingType('   ')).toBeNull();
        expect(detectTrackingType('\t\n')).toBeNull();
      });

      it('should return null for invalid formats', () => {
        const invalidNumbers = [
          '123',
          'ABC',
          'ABCD-1234567',
          'ABCD 1234567',
          'ABCD@1234567',
          'ABCD#1234567',
        ];

        invalidNumbers.forEach(number => {
          expect(detectTrackingType(number)).toBeNull();
        });
      });

      it('should prioritize container format over booking when both match', () => {
        // This number could match both container and booking patterns
        // but container should take precedence due to more specific format
        expect(detectTrackingType('ABCD1234567')).toBe('container');
      });
    });
  });

  describe('validateTrackingNumber', () => {
    describe('Valid Numbers', () => {
      it('should validate container numbers', () => {
        const result = validateTrackingNumber('ABCD1234567');
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('container');
        expect(result.error).toBeUndefined();
      });

      it('should validate booking numbers', () => {
        const result = validateTrackingNumber('MAEU123456');
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('booking');
        expect(result.error).toBeUndefined();
      });

      it('should validate BOL numbers', () => {
        const result = validateTrackingNumber('ABCD123456789012');
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('bol');
        expect(result.error).toBeUndefined();
      });

      it('should handle whitespace in valid numbers', () => {
        const result = validateTrackingNumber('  ABCD1234567  ');
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('container');
      });
    });

    describe('Invalid Numbers', () => {
      it('should reject empty strings', () => {
        const result = validateTrackingNumber('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a tracking number');
        expect(result.detectedType).toBeUndefined();
      });

      it('should reject whitespace-only strings', () => {
        const result = validateTrackingNumber('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a tracking number');
        expect(result.detectedType).toBeUndefined();
      });

      it('should reject invalid formats', () => {
        const result = validateTrackingNumber('12345');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid tracking number format. Please check and try again.');
        expect(result.detectedType).toBeUndefined();
      });

      it('should reject numbers with special characters', () => {
        const invalidNumbers = [
          'ABCD-1234567',
          'ABCD@1234567',
          'ABCD#1234567',
          'ABCD 1234567',
        ];

        invalidNumbers.forEach(number => {
          const result = validateTrackingNumber(number);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Invalid tracking number format. Please check and try again.');
        });
      });
    });

    describe('Error Messages', () => {
      it('should provide specific error for empty input', () => {
        const result = validateTrackingNumber('');
        expect(result.error).toBe('Please enter a tracking number');
      });

      it('should provide generic error for invalid format', () => {
        const result = validateTrackingNumber('INVALID');
        expect(result.error).toBe('Invalid tracking number format. Please check and try again.');
      });
    });

    describe('Type Detection Accuracy', () => {
      it('should correctly identify container numbers vs booking numbers', () => {
        // Container: exactly 4 letters + 7 digits
        const containerResult = validateTrackingNumber('ABCD1234567');
        expect(containerResult.detectedType).toBe('container');

        // Booking: 6-12 alphanumeric characters (but not container format)
        const bookingResult = validateTrackingNumber('MAEU123456');
        expect(bookingResult.detectedType).toBe('booking');
      });

      it('should correctly identify BOL numbers', () => {
        // BOL: 2-4 letters + 6-15 alphanumeric
        const bolResult = validateTrackingNumber('ABCD123456789012');
        expect(bolResult.detectedType).toBe('bol');
      });

      it('should handle ambiguous cases consistently', () => {
        // Test cases that might match multiple patterns
        const testCases = [
          { number: 'ABCD1234567', expected: 'container' },
          { number: 'ABCDEF123456', expected: 'booking' },
          { number: 'AB123456789012', expected: 'bol' },
        ];

        testCases.forEach(({ number, expected }) => {
          const result = validateTrackingNumber(number);
          expect(result.detectedType).toBe(expected);
        });
      });
    });
  });

  describe('Real-world Examples', () => {
    it('should handle real container numbers', () => {
      const realContainerNumbers = [
        'MAEU1234567', // Maersk
        'TCLU9876543', // Triton
        'GESU1111111', // Genstar
        'CAXU2222222', // CAI
      ];

      realContainerNumbers.forEach(number => {
        const result = validateTrackingNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('container');
      });
    });

    it('should handle real booking numbers', () => {
      const realBookingNumbers = [
        'MAEU123456',
        'BKG9876543',
        'COSCO12345',
        'HAPAG12345',
      ];

      realBookingNumbers.forEach(number => {
        const result = validateTrackingNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('booking');
      });
    });

    it('should handle real BOL numbers', () => {
      const realBOLNumbers = [
        'MAEU12345678901234',
        'COSCO123456789012',
        'HAPAG123456789012345',
        'MSC1234567890123',
      ];

      realBOLNumbers.forEach(number => {
        const result = validateTrackingNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.detectedType).toBe('bol');
      });
    });
  });
});