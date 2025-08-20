/**
 * Tests for Session Validation Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateSessionId, 
  isSessionExpired, 
  sanitizeSessionData,
  generateSessionId,
  validateSessionData 
} from '../sessionValidation';

describe('Session Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateSessionId', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateSessionId(validUUID)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(validateSessionId('invalid-uuid')).toBe(false);
      expect(validateSessionId('123-456-789')).toBe(false);
      expect(validateSessionId('')).toBe(false);
      expect(validateSessionId(null as any)).toBe(false);
      expect(validateSessionId(undefined as any)).toBe(false);
    });

    it('should reject UUIDs with wrong length', () => {
      expect(validateSessionId('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
      expect(validateSessionId('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // Too long
    });

    it('should reject UUIDs with invalid characters', () => {
      expect(validateSessionId('123g4567-e89b-12d3-a456-426614174000')).toBe(false); // 'g' is invalid
      expect(validateSessionId('123e4567-e89b-12d3-a456-42661417400z')).toBe(false); // 'z' is invalid
    });
  });

  describe('isSessionExpired', () => {
    it('should return false for recent sessions', () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
      expect(isSessionExpired(recentDate.toISOString())).toBe(false);
    });

    it('should return true for old sessions', () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago
      expect(isSessionExpired(oldDate.toISOString())).toBe(true);
    });

    it('should handle invalid date strings', () => {
      expect(isSessionExpired('invalid-date')).toBe(true);
      expect(isSessionExpired('')).toBe(true);
      expect(isSessionExpired(null as any)).toBe(true);
      expect(isSessionExpired(undefined as any)).toBe(true);
    });

    it('should use custom expiry time', () => {
      const testDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago
      
      // Should not be expired with 1 hour expiry
      expect(isSessionExpired(testDate.toISOString(), 60 * 60 * 1000)).toBe(false);
      
      // Should be expired with 15 minute expiry
      expect(isSessionExpired(testDate.toISOString(), 15 * 60 * 1000)).toBe(true);
    });
  });

  describe('sanitizeSessionData', () => {
    it('should sanitize valid session data', () => {
      const sessionData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        extraField: 'should be removed',
      };

      const sanitized = sanitizeSessionData(sessionData);

      expect(sanitized.sessionId).toBe(sessionData.sessionId);
      expect(sanitized.createdAt).toBe(sessionData.createdAt);
      expect(sanitized.lastActivity).toBe(sessionData.lastActivity);
      expect(sanitized).not.toHaveProperty('extraField');
    });

    it('should handle missing fields', () => {
      const incompleteData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing createdAt and lastActivity
      };

      const sanitized = sanitizeSessionData(incompleteData);

      expect(sanitized.sessionId).toBe(incompleteData.sessionId);
      expect(sanitized.createdAt).toBeDefined();
      expect(sanitized.lastActivity).toBeDefined();
    });

    it('should handle invalid session ID', () => {
      const invalidData = {
        sessionId: 'invalid-uuid',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const sanitized = sanitizeSessionData(invalidData);

      expect(validateSessionId(sanitized.sessionId)).toBe(true);
      expect(sanitized.sessionId).not.toBe(invalidData.sessionId);
    });

    it('should handle null or undefined input', () => {
      expect(() => sanitizeSessionData(null as any)).not.toThrow();
      expect(() => sanitizeSessionData(undefined as any)).not.toThrow();
      
      const sanitizedNull = sanitizeSessionData(null as any);
      const sanitizedUndefined = sanitizeSessionData(undefined as any);
      
      expect(validateSessionId(sanitizedNull.sessionId)).toBe(true);
      expect(validateSessionId(sanitizedUndefined.sessionId)).toBe(true);
    });
  });

  describe('generateSessionId', () => {
    it('should generate valid UUID', () => {
      const sessionId = generateSessionId();
      expect(validateSessionId(sessionId)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 100 }, () => generateSessionId());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it('should generate IDs in correct format', () => {
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('validateSessionData', () => {
    it('should validate complete session data', () => {
      const validData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const result = validateSessionData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid session ID', () => {
      const invalidData = {
        sessionId: 'invalid-uuid',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      const result = validateSessionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid session ID format');
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        // Missing createdAt and lastActivity
      };

      const result = validateSessionData(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing createdAt');
      expect(result.errors).toContain('Missing lastActivity');
    });

    it('should detect invalid date formats', () => {
      const invalidData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: 'invalid-date',
        lastActivity: 'also-invalid',
      };

      const result = validateSessionData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid createdAt format');
      expect(result.errors).toContain('Invalid lastActivity format');
    });

    it('should detect expired sessions', () => {
      const expiredData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // 25 hours ago
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      };

      const result = validateSessionData(expiredData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session has expired');
    });

    it('should handle null or undefined input', () => {
      const nullResult = validateSessionData(null as any);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Session data is required');

      const undefinedResult = validateSessionData(undefined as any);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors).toContain('Session data is required');
    });

    it('should validate with custom expiry time', () => {
      const recentData = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      };

      // Should be valid with 1 hour expiry
      const validResult = validateSessionData(recentData, 60 * 60 * 1000);
      expect(validResult.isValid).toBe(true);

      // Should be invalid with 15 minute expiry
      const invalidResult = validateSessionData(recentData, 15 * 60 * 1000);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Session has expired');
    });
  });
});