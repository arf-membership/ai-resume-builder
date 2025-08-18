/**
 * Tests for retry mechanism utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { retryOperation, useRetryOperation, RETRY_CONFIGS, isRetryableError } from '../retryMechanism';

// Mock the notification store
vi.mock('../../store/notificationStore', () => ({
  useNotifications: () => ({
    showWarning: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

describe('Retry Mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return 'success';
      });

      const result = await retryOperation(operation, {
        maxAttempts: 3,
        baseDelay: 10,
        backoffMultiplier: 1,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'));

      await expect(
        retryOperation(operation, {
          maxAttempts: 3,
          retryCondition: (error) => error.message.includes('network'),
        })
      ).rejects.toThrow('Validation failed');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        retryOperation(operation, {
          maxAttempts: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('Network error');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call retry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      await retryOperation(operation, {
        maxAttempts: 2,
        baseDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should call max attempts callback', async () => {
      const onMaxAttemptsReached = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        retryOperation(operation, {
          maxAttempts: 2,
          baseDelay: 10,
          onMaxAttemptsReached,
        })
      ).rejects.toThrow();

      expect(onMaxAttemptsReached).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('useRetryOperation', () => {
    it('should provide retryWithFeedback function', () => {
      const { result } = renderHook(() => useRetryOperation());
      
      expect(typeof result.current.retryWithFeedback).toBe('function');
    });

    it('should handle successful retry with feedback', async () => {
      const { result } = renderHook(() => useRetryOperation());
      
      const operation = vi.fn().mockResolvedValue('success');
      
      await act(async () => {
        const response = await result.current.retryWithFeedback(
          operation,
          'Test Operation'
        );
        expect(response).toBe('success');
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('RETRY_CONFIGS', () => {
    it('should have configs for all operation types', () => {
      expect(RETRY_CONFIGS.upload).toBeDefined();
      expect(RETRY_CONFIGS.analysis).toBeDefined();
      expect(RETRY_CONFIGS.edit).toBeDefined();
      expect(RETRY_CONFIGS.download).toBeDefined();
      expect(RETRY_CONFIGS.network).toBeDefined();
    });

    it('should have valid config properties', () => {
      Object.values(RETRY_CONFIGS).forEach(config => {
        expect(config.maxAttempts).toBeGreaterThan(0);
        expect(config.baseDelay).toBeGreaterThan(0);
        expect(config.maxDelay).toBeGreaterThan(0);
        expect(config.backoffMultiplier).toBeGreaterThan(0);
        expect(typeof config.retryCondition).toBe('function');
      });
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable upload errors', () => {
      const networkError = new Error('Network connection failed');
      const validationError = new Error('Invalid file format');
      
      expect(isRetryableError(networkError, 'upload')).toBe(true);
      expect(isRetryableError(validationError, 'upload')).toBe(false);
    });

    it('should identify retryable analysis errors', () => {
      const timeoutError = new Error('Request timeout');
      const authError = new Error('Authentication failed');
      
      expect(isRetryableError(timeoutError, 'analysis')).toBe(true);
      expect(isRetryableError(authError, 'analysis')).toBe(false);
    });

    it('should identify retryable network errors', () => {
      const anyError = new Error('Any error message');
      
      expect(isRetryableError(anyError, 'network')).toBe(true);
    });
  });
});