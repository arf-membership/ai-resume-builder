/**
 * Tests for error handler utilities
 */

import { renderHook, act } from '@testing-library/react';
import { errorHandler, useErrorHandler } from '../errorHandler';
import { useCVStore } from '../../store';
import { useNotifications } from '../../store/notificationStore';

// Mock the stores
jest.mock('../../store', () => ({
  useCVStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../store/notificationStore', () => ({
  useNotifications: {
    getState: jest.fn(),
  },
}));

describe('Error Handler', () => {
  const mockAddError = jest.fn();
  const mockClearErrors = jest.fn();
  const mockClearErrorsByType = jest.fn();
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCVStore.getState as jest.Mock).mockReturnValue({
      addError: mockAddError,
      clearErrors: mockClearErrors,
      clearErrorsByType: mockClearErrorsByType,
      errors: [],
    });

    (useNotifications.getState as jest.Mock).mockReturnValue({
      showError: mockShowError,
      showWarning: mockShowWarning,
    });

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should handle string errors', () => {
      errorHandler.handleError('upload', 'Upload failed');

      expect(mockAddError).toHaveBeenCalledWith({
        type: 'upload',
        message: 'Upload failed',
        details: undefined,
      });

      expect(mockShowError).toHaveBeenCalledWith(
        'Error',
        'Failed to upload your CV. Please check your file and try again.',
        0
      );
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

      expect(mockShowWarning).toHaveBeenCalledWith(
        'Warning',
        'Network connection issue. Please check your internet connection.',
        6000
      );
    });

    it('should log errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
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
      const operation = jest.fn().mockImplementation(() => {
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
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        errorHandler.retryOperation(operation, 2, 50)
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('immediate success');

      const result = await errorHandler.retryOperation(operation, 3, 100);

      expect(result).toBe('immediate success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('useErrorHandler Hook', () => {
    it('should provide error handling methods', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(typeof result.current.handleUploadError).toBe('function');
      expect(typeof result.current.handleAnalysisError).toBe('function');
      expect(typeof result.current.handleEditError).toBe('function');
      expect(typeof result.current.handleDownloadError).toBe('function');
      expect(typeof result.current.handleNetworkError).toBe('function');
      expect(typeof result.current.handleValidationError).toBe('function');
      expect(typeof result.current.retryOperation).toBe('function');
    });

    it('should provide store methods', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(typeof result.current.clearErrors).toBe('function');
      expect(typeof result.current.clearErrorsByType).toBe('function');
    });

    it('should provide current errors', () => {
      const mockErrors = [
        {
          id: 'error-1',
          type: 'upload' as const,
          message: 'Upload failed',
          timestamp: new Date(),
        },
      ];

      (useCVStore as jest.Mock).mockReturnValue({
        errors: mockErrors,
        clearErrors: mockClearErrors,
        clearErrorsByType: mockClearErrorsByType,
      });

      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.errors).toEqual(mockErrors);
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
      expect(mockShowWarning).toHaveBeenCalledWith(
        'Warning',
        'Network connection issue. Please check your internet connection.',
        6000
      );

      errorHandler.handleError('validation', 'Invalid input');
      expect(mockShowWarning).toHaveBeenCalledWith(
        'Warning',
        'Invalid input detected. Please check your data and try again.',
        6000
      );
    });

    it('should show persistent errors for other error types', () => {
      errorHandler.handleError('upload', 'Upload failed');
      expect(mockShowError).toHaveBeenCalledWith(
        'Error',
        'Failed to upload your CV. Please check your file and try again.',
        0
      );

      errorHandler.handleError('analysis', 'Analysis failed');
      expect(mockShowError).toHaveBeenCalledWith(
        'Error',
        'Failed to analyze your CV. Please try again or contact support.',
        0
      );
    });
  });
});