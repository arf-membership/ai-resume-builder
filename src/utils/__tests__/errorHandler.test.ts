/**
 * Tests for error handler utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { errorHandler, useErrorHandler } from '../errorHandler';
import { useCVStore } from '../../store';
import { useNotificationStore } from '../../store/notificationStore';

// Mock the stores
vi.mock('../../store', () => ({
  useCVStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../store/notificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(),
  },
}));

describe('Error Handler', () => {
  const mockAddError = vi.fn();
  const mockClearErrors = vi.fn();
  const mockClearErrorsByType = vi.fn();
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useCVStore.getState).mockReturnValue({
      addError: mockAddError,
      clearErrors: mockClearErrors,
      clearErrorsByType: mockClearErrorsByType,
      errors: [],
    } as any);

    vi.mocked(useNotificationStore.getState).mockReturnValue({
      addNotification: mockAddNotification,
    } as any);

    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should handle string errors', () => {
      errorHandler.handleError('upload', 'Upload failed');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'upload',
        message: 'Upload failed',
        details: undefined,
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Failed to upload your CV. Please check your file and try again.',
        duration: 0,
      });
    });

    it('should handle Error objects', () => {
      const error = new Error('Network error');
      error.stack = 'Error stack trace';

      errorHandler.handleError('network', error);

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'network',
        message: 'Network error',
        details: 'Error stack trace',
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Warning',
        message: 'Network connection issue. Please check your internet connection.',
        duration: 6000,
      });
    });

    it('should log errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      errorHandler.handleError('analysis', 'Analysis failed', { resumeId: 'test-123' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ANALYSIS]',
        'Analysis failed',
        expect.objectContaining({
          error: 'Analysis failed',
          context: { resumeId: 'test-123' },
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Specific Error Handlers', () => {
    it('should handle upload errors with specific messages', () => {
      errorHandler.handleUploadError('file too large', {
        name: 'test.pdf',
        size: 15000000,
        type: 'application/pdf',
      });

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'upload',
        message: 'File is too large. Please use a PDF file smaller than 10MB.',
        details: undefined,
      });
    });

    it('should handle invalid file type errors', () => {
      errorHandler.handleUploadError('invalid file type');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'upload',
        message: 'Invalid file type. Please upload a PDF file only.',
        details: undefined,
      });
    });

    it('should handle network upload errors', () => {
      errorHandler.handleUploadError('network error occurred');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'upload',
        message: 'Upload failed due to network issues. Please check your connection and try again.',
        details: undefined,
      });
    });

    it('should handle analysis timeout errors', () => {
      errorHandler.handleAnalysisError('timeout occurred', 'resume-123');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'analysis',
        message: 'Analysis is taking longer than expected. Please try again.',
        details: undefined,
      });
    });

    it('should handle AI service errors', () => {
      errorHandler.handleAnalysisError('AI service unavailable');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'analysis',
        message: 'AI analysis service is temporarily unavailable. Please try again later.',
        details: undefined,
      });
    });

    it('should handle PDF processing errors', () => {
      errorHandler.handleAnalysisError('PDF processing failed');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'analysis',
        message: 'Unable to process your PDF. Please ensure it contains readable text.',
        details: undefined,
      });
    });

    it('should handle section editing errors', () => {
      errorHandler.handleEditError('content too long', 'Experience');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'edit',
        message: 'Section content is too long. Please try with shorter content.',
        details: undefined,
      });
    });

    it('should handle download errors', () => {
      errorHandler.handleDownloadError('generation failed', 'resume-123');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'download',
        message: 'PDF generation failed. Please try again or contact support.',
        details: undefined,
      });
    });

    it('should handle validation errors', () => {
      errorHandler.handleValidationError('Invalid email format', 'email');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'validation',
        message: 'Invalid email: Invalid email format',
        details: undefined,
      });
    });
  });

  describe('Retry Operation', () => {
    it('should retry operation on failure', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await errorHandler.retryOperation(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        errorHandler.retryOperation(operation, 2, 50)
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('immediate success');

      const result = await errorHandler.retryOperation(operation, 3, 100);

      expect(result).toBe('immediate success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Clearing', () => {
    it('should clear all errors', () => {
      errorHandler.clearErrors();
      expect(mockClearErrors).toHaveBeenCalled();
    });

    it('should clear errors by type', () => {
      errorHandler.clearErrors('upload');
      expect(mockClearErrorsByType).toHaveBeenCalledWith('upload');
    });
  });

  describe('Notification Types', () => {
    it('should show warnings for network and validation errors', () => {
      errorHandler.handleError('network', 'Connection failed');
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Warning',
        message: 'Network connection issue. Please check your internet connection.',
        duration: 6000,
      });

      errorHandler.handleError('validation', 'Invalid input');
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Warning',
        message: 'Invalid input detected. Please check your data and try again.',
        duration: 6000,
      });
    });

    it('should show persistent errors for other error types', () => {
      errorHandler.handleError('upload', 'Upload failed');
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Failed to upload your CV. Please check your file and try again.',
        duration: 0,
      });

      errorHandler.handleError('analysis', 'Analysis failed');
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Failed to analyze your CV. Please try again or contact support.',
        duration: 0,
      });
    });
  });
});