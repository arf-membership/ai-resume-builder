/**
 * Error handling utilities
 * Provides centralized error handling and user notification
 */

import { useCVStore } from '../store';
import { useNotifications } from '../store/notificationStore';
import type { ErrorState } from '../types/state';

export interface ErrorHandlerConfig {
  showNotifications: boolean;
  logToConsole: boolean;
  logToService: boolean;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  showNotifications: true,
  logToConsole: true,
  logToService: false, // Would integrate with error tracking service
};

class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle different types of errors with appropriate user feedback
   */
  handleError(
    type: ErrorState['type'],
    error: Error | string,
    context?: Record<string, any>
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorDetails = typeof error === 'object' ? error.stack : undefined;

    // Add error to store
    const store = useCVStore.getState();
    store.addError({
      type,
      message: errorMessage,
      details: errorDetails,
    });

    // Log error
    if (this.config.logToConsole) {
      console.error(`[${type.toUpperCase()}]`, errorMessage, {
        error,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    // Show user notification
    if (this.config.showNotifications) {
      this.showErrorNotification(type, errorMessage);
    }

    // Log to external service (if configured)
    if (this.config.logToService) {
      this.logToExternalService(type, error, context);
    }
  }

  /**
   * Show appropriate notification based on error type
   */
  private showErrorNotification(type: ErrorState['type'], message: string): void {
    const { showError, showWarning } = useNotifications.getState();

    const userFriendlyMessages = {
      upload: 'Failed to upload your CV. Please check your file and try again.',
      analysis: 'Failed to analyze your CV. Please try again or contact support.',
      edit: 'Failed to edit the section. Please try again.',
      download: 'Failed to generate or download your CV. Please try again.',
      network: 'Network connection issue. Please check your internet connection.',
      validation: 'Invalid input detected. Please check your data and try again.',
    };

    const userMessage = userFriendlyMessages[type] || message;

    if (type === 'network' || type === 'validation') {
      showWarning('Warning', userMessage, 6000);
    } else {
      showError('Error', userMessage, 0); // Persistent for errors
    }
  }

  /**
   * Log error to external service (placeholder)
   */
  private logToExternalService(
    type: ErrorState['type'],
    error: Error | string,
    context?: Record<string, any>
  ): void {
    // This would integrate with services like Sentry, LogRocket, etc.
    console.log('Would log to external service:', { type, error, context });
  }

  /**
   * Handle upload-specific errors
   */
  handleUploadError(error: Error | string, fileInfo?: { name: string; size: number; type: string }): void {
    let message = typeof error === 'string' ? error : error.message;

    // Provide specific guidance for common upload issues
    if (message.includes('file too large')) {
      message = 'File is too large. Please use a PDF file smaller than 10MB.';
    } else if (message.includes('invalid file type')) {
      message = 'Invalid file type. Please upload a PDF file only.';
    } else if (message.includes('network')) {
      message = 'Upload failed due to network issues. Please check your connection and try again.';
    }

    this.handleError('upload', message, { fileInfo });
  }

  /**
   * Handle analysis-specific errors
   */
  handleAnalysisError(error: Error | string, resumeId?: string): void {
    let message = typeof error === 'string' ? error : error.message;

    // Provide specific guidance for analysis issues
    if (message.includes('timeout')) {
      message = 'Analysis is taking longer than expected. Please try again.';
    } else if (message.includes('AI service')) {
      message = 'AI analysis service is temporarily unavailable. Please try again later.';
    } else if (message.includes('PDF processing')) {
      message = 'Unable to process your PDF. Please ensure it contains readable text.';
    }

    this.handleError('analysis', message, { resumeId });
  }

  /**
   * Handle section editing errors
   */
  handleEditError(error: Error | string, sectionName?: string): void {
    let message = typeof error === 'string' ? error : error.message;

    // Provide specific guidance for editing issues
    if (message.includes('content too long')) {
      message = 'Section content is too long. Please try with shorter content.';
    } else if (message.includes('AI service')) {
      message = 'AI editing service is temporarily unavailable. Please try again later.';
    }

    this.handleError('edit', message, { sectionName });
  }

  /**
   * Handle download/PDF generation errors
   */
  handleDownloadError(error: Error | string, resumeId?: string): void {
    let message = typeof error === 'string' ? error : error.message;

    // Provide specific guidance for download issues
    if (message.includes('generation failed')) {
      message = 'PDF generation failed. Please try again or contact support.';
    } else if (message.includes('storage')) {
      message = 'Unable to save generated PDF. Please try again.';
    }

    this.handleError('download', message, { resumeId });
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error | string, operation?: string): void {
    let message = 'Network connection issue. Please check your internet connection and try again.';

    if (operation) {
      message = `Network error during ${operation}. Please check your connection and try again.`;
    }

    this.handleError('network', message, { operation });
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error: Error | string, field?: string): void {
    let message = typeof error === 'string' ? error : error.message;

    if (field) {
      message = `Invalid ${field}: ${message}`;
    }

    this.handleError('validation', message, { field });
  }

  /**
   * Clear errors by type
   */
  clearErrors(type?: ErrorState['type']): void {
    const store = useCVStore.getState();
    if (type) {
      store.clearErrorsByType(type);
    } else {
      store.clearErrors();
    }
  }

  /**
   * Retry operation with error handling
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// React hook for error handling
export const useErrorHandler = () => {
  const errors = useCVStore(state => state.errors);
  const { clearErrors, clearErrorsByType } = useCVStore();

  return {
    errors,
    clearErrors,
    clearErrorsByType,
    
    // Specific error handlers
    handleUploadError: errorHandler.handleUploadError.bind(errorHandler),
    handleAnalysisError: errorHandler.handleAnalysisError.bind(errorHandler),
    handleEditError: errorHandler.handleEditError.bind(errorHandler),
    handleDownloadError: errorHandler.handleDownloadError.bind(errorHandler),
    handleNetworkError: errorHandler.handleNetworkError.bind(errorHandler),
    handleValidationError: errorHandler.handleValidationError.bind(errorHandler),
    
    // Utility methods
    retryOperation: errorHandler.retryOperation.bind(errorHandler),
  };
};

export default errorHandler;