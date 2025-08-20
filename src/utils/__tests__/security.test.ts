/**
 * Security Utilities Test Suite
 * Tests for input sanitization, file security validation, and rate limiting
 * Requirements: 9.1, 9.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sanitizeTextInput,
  validateAndSanitizeInput,
  sanitizeFilename,
  validateSessionId,
  validateUUID,
  validateEmail,
  validateUrl,
  sanitizeJsonInput,
  validateFileUpload,
} from '../inputSanitization';
import {
  validateFileUploadSecurity,
  validateFileType,
  validateFileSize,
  generateSecureFilePath,
} from '../fileSecurityValidation';
import {
  checkRateLimit,
  useRateLimit,
  RateLimitError,
  formatRateLimitError,
  cleanupRateLimiter,
} from '../rateLimiting';

describe('Input Sanitization', () => {
  describe('sanitizeTextInput', () => {
    it('should remove XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeTextInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
      // The word "alert" is escaped but still present as text content
      expect(sanitized).toContain('&quot;xss&quot;');
    });

    it('should handle HTML entities', () => {
      const input = 'Hello & "World" <test>';
      const sanitized = sanitizeTextInput(input);
      expect(sanitized).toBe('Hello &amp; &quot;World&quot; &lt;test&gt;');
    });

    it('should enforce maximum length', () => {
      const longInput = 'a'.repeat(1000);
      const sanitized = sanitizeTextInput(longInput, { maxLength: 100 });
      expect(sanitized.length).toBe(100);
    });

    it('should strip whitespace when requested', () => {
      const input = '  Hello World  ';
      const sanitized = sanitizeTextInput(input, { stripWhitespace: true });
      expect(sanitized).toBe('Hello World');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const sanitized = sanitizeTextInput(input);
      expect(sanitized).toBe('HelloWorld');
    });
  });

  describe('validateAndSanitizeInput', () => {
    it('should validate required fields', () => {
      const result = validateAndSanitizeInput('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('should validate minimum length', () => {
      const result = validateAndSanitizeInput('ab', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Minimum length');
    });

    it('should validate maximum length', () => {
      const result = validateAndSanitizeInput('a'.repeat(100), { maxLength: 50 });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Maximum length');
    });

    it('should validate pattern', () => {
      const result = validateAndSanitizeInput('invalid-email', {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('format is invalid');
    });

    it('should use custom validator', () => {
      const result = validateAndSanitizeInput('test', {
        customValidator: (value) => value === 'valid',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('validation failed');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const filename = '../../../etc/passwd';
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should handle special characters', () => {
      const filename = 'my<file>name?.pdf';
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).toBe('myfilename.pdf');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeFilename('')).toBe('file');
      expect(sanitizeFilename('...')).toBe('file');
    });
  });

  describe('validateSessionId', () => {
    it('should validate correct session ID format', () => {
      const sessionId = 'session_1234567890_abcdef123';
      const result = validateSessionId(sessionId);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid session ID format', () => {
      const sessionId = 'invalid-session-id';
      const result = validateSessionId(sessionId);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUID format', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = validateUUID(uuid);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const uuid = 'not-a-uuid';
      const result = validateUUID(uuid);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const email = 'test@example.com';
      const result = validateEmail(email);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const email = 'not-an-email';
      const result = validateEmail(email);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL format', () => {
      const url = 'https://example.com';
      const result = validateUrl(url);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const url = 'not-a-url';
      const result = validateUrl(url);
      expect(result.isValid).toBe(false);
    });

    it('should reject non-HTTP protocols', () => {
      const url = 'ftp://example.com';
      const result = validateUrl(url);
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeJsonInput', () => {
    it('should sanitize string values', () => {
      const input = { name: '<script>alert("xss")</script>' };
      const sanitized = sanitizeJsonInput(input);
      expect(sanitized.name).not.toContain('<script>');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<script>alert("xss")</script>',
          email: 'test@example.com',
        },
      };
      const sanitized = sanitizeJsonInput(input);
      expect(sanitized.user.name).not.toContain('<script>');
      expect(sanitized.user.email).toBe('test@example.com');
    });

    it('should handle arrays', () => {
      const input = ['<script>alert("xss")</script>', 'safe string'];
      const sanitized = sanitizeJsonInput(input);
      expect(sanitized[0]).not.toContain('<script>');
      expect(sanitized[1]).toBe('safe string');
    });
  });
});

describe('File Security Validation', () => {
  // Mock File object for testing
  const createMockFile = (name: string, type: string, size: number, content?: string): File => {
    const blob = new Blob([content || 'mock content'], { type });
    const file = new File([blob], name, { type });
    
    // Mock the size property to return the specified size
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false,
      configurable: true
    });
    
    return file;
  };

  describe('validateFileType', () => {
    it('should accept valid PDF files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000);
      const result = validateFileType(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const file = createMockFile('test.exe', 'application/x-executable', 1000);
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject invalid file extensions', () => {
      const file = createMockFile('test.txt', 'application/pdf', 1000);
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 5 * 1024 * 1024); // 5MB
      const result = validateFileSize(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 15 * 1024 * 1024); // 15MB
      const result = validateFileSize(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size');
    });

    it('should reject empty files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 0);
      const result = validateFileSize(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('generateSecureFilePath', () => {
    it('should generate secure file path', () => {
      const sessionId = 'session_123_abc';
      const filename = 'test file.pdf';
      const timestamp = 1234567890;
      
      const path = generateSecureFilePath(sessionId, filename, timestamp);
      expect(path).toMatch(/^session_123_abc\/\d+_test_file\.pdf$/);
    });

    it('should sanitize session ID and filename', () => {
      const sessionId = 'session/../123';
      const filename = 'test<>file.pdf';
      
      const path = generateSecureFilePath(sessionId, filename);
      expect(path).not.toContain('../');
      expect(path).not.toContain('<>');
    });
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    cleanupRateLimiter();
  });

  afterEach(() => {
    cleanupRateLimiter();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const sessionId = 'test-session';
      const result = checkRateLimit(sessionId, 'UPLOAD');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should track multiple requests', () => {
      const sessionId = 'test-session';
      
      const first = checkRateLimit(sessionId, 'UPLOAD');
      const second = checkRateLimit(sessionId, 'UPLOAD');
      
      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(true);
      expect(second.remaining).toBe(first.remaining - 1);
    });

    it('should block requests exceeding limit', () => {
      const sessionId = 'test-session';
      
      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(sessionId, 'UPLOAD');
      }
      
      // Next request should be blocked
      const result = checkRateLimit(sessionId, 'UPLOAD');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle different endpoints separately', () => {
      const sessionId = 'test-session';
      
      const uploadResult = checkRateLimit(sessionId, 'UPLOAD');
      const analysisResult = checkRateLimit(sessionId, 'ANALYSIS');
      
      expect(uploadResult.allowed).toBe(true);
      expect(analysisResult.allowed).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should create proper error with rate limit info', () => {
      const rateLimitInfo = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60000,
      };
      
      const error = new RateLimitError(rateLimitInfo);
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.rateLimitInfo).toBe(rateLimitInfo);
    });
  });

  describe('formatRateLimitError', () => {
    it('should format error message for seconds', () => {
      const rateLimitInfo = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        retryAfter: 30000,
      };
      
      const message = formatRateLimitError(rateLimitInfo);
      expect(message).toContain('30 seconds');
    });

    it('should format error message for minutes', () => {
      const rateLimitInfo = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 120000,
        retryAfter: 120000,
      };
      
      const message = formatRateLimitError(rateLimitInfo);
      expect(message).toContain('2 minutes');
    });
  });
});

describe('File Upload Validation', () => {
  const createMockFile = (name: string, type: string, size: number): File => {
    const blob = new Blob(['mock content'], { type });
    const file = new File([blob], name, { type });
    
    // Mock the size property
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false,
      configurable: true
    });
    
    return file;
  };

  describe('validateFileUpload', () => {
    it('should validate file within constraints', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1000);
      const options = {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };
      
      const result = validateFileUpload(file, options);
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized files', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 20 * 1024 * 1024);
      const options = {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };
      
      const result = validateFileUpload(file, options);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File size exceeds');
    });

    it('should reject invalid file types', () => {
      const file = createMockFile('test.exe', 'application/x-executable', 1000);
      const options = {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };
      
      const result = validateFileUpload(file, options);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File type');
    });

    it('should reject invalid file extensions', () => {
      const file = createMockFile('test.txt', 'application/pdf', 1000);
      const options = {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf'],
      };
      
      const result = validateFileUpload(file, options);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File extension');
    });
  });
});