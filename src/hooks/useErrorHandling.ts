/**
 * Comprehensive error handling hook for all application operations
 */

import { useCallback } from 'react';
import { useErrorHandler } from '../utils/errorHandler';
import { useRetryOperation, RETRY_CONFIGS } from '../utils/retryMechanism';
import { useNotifications } from '../store/notificationStore';
import { useStoreActions } from '../store';

export const useErrorHandling = () => {
  const {
    handleUploadError,
    handleAnalysisError,
    handleEditError,
    handleDownloadError,
    handleNetworkError,
    handleValidationError,
    retryOperation,
  } = useErrorHandler();
  
  const { retryWithFeedback } = useRetryOperation();
  const { showSuccess, showError, showWarning } = useNotifications();
  const { setIsUploading, setIsAnalyzing, setIsEditingSection, setIsGeneratingPDF } = useStoreActions();

  // Upload error handling with retry
  const handleUploadWithRetry = useCallback(async (
    uploadOperation: () => Promise<void>,
    fileInfo?: { name: string; size: number; type: string }
  ) => {
    try {
      setIsUploading(true);
      await retryWithFeedback(
        uploadOperation,
        'File Upload',
        RETRY_CONFIGS.upload
      );
      showSuccess('Upload Successful', 'Your CV has been uploaded successfully.');
    } catch (error) {
      handleUploadError(error instanceof Error ? error : new Error(String(error)), fileInfo);
    } finally {
      setIsUploading(false);
    }
  }, [retryWithFeedback, handleUploadError, showSuccess, setIsUploading]);

  // Analysis error handling with retry
  const handleAnalysisWithRetry = useCallback(async (
    analysisOperation: () => Promise<void>,
    resumeId?: string
  ) => {
    try {
      setIsAnalyzing(true);
      await retryWithFeedback(
        analysisOperation,
        'CV Analysis',
        RETRY_CONFIGS.analysis
      );
      showSuccess('Analysis Complete', 'Your CV has been analyzed successfully.');
    } catch (error) {
      handleAnalysisError(error instanceof Error ? error : new Error(String(error)), resumeId);
    } finally {
      setIsAnalyzing(false);
    }
  }, [retryWithFeedback, handleAnalysisError, showSuccess, setIsAnalyzing]);

  // Section editing error handling with retry
  const handleEditWithRetry = useCallback(async (
    editOperation: () => Promise<void>,
    sectionName?: string
  ) => {
    try {
      setIsEditingSection(true);
      await retryWithFeedback(
        editOperation,
        `Section Editing${sectionName ? ` (${sectionName})` : ''}`,
        RETRY_CONFIGS.edit
      );
      showSuccess('Section Updated', `${sectionName || 'Section'} has been improved successfully.`);
    } catch (error) {
      handleEditError(error instanceof Error ? error : new Error(String(error)), sectionName);
    } finally {
      setIsEditingSection(false);
    }
  }, [retryWithFeedback, handleEditError, showSuccess, setIsEditingSection]);

  // PDF generation error handling with retry
  const handleDownloadWithRetry = useCallback(async (
    downloadOperation: () => Promise<void>,
    resumeId?: string
  ) => {
    try {
      setIsGeneratingPDF(true);
      await retryWithFeedback(
        downloadOperation,
        'PDF Generation',
        RETRY_CONFIGS.download
      );
      showSuccess('PDF Generated', 'Your improved CV is ready for download.');
    } catch (error) {
      handleDownloadError(error instanceof Error ? error : new Error(String(error)), resumeId);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [retryWithFeedback, handleDownloadError, showSuccess, setIsGeneratingPDF]);

  // Network operation error handling
  const handleNetworkOperation = useCallback(async (
    networkOperation: () => Promise<void>,
    operationName: string
  ) => {
    try {
      await retryWithFeedback(
        networkOperation,
        operationName,
        RETRY_CONFIGS.network
      );
    } catch (error) {
      handleNetworkError(error instanceof Error ? error : new Error(String(error)), operationName);
    }
  }, [retryWithFeedback, handleNetworkError]);

  // Validation error handling
  const handleValidation = useCallback((
    validationFn: () => boolean | string,
    fieldName?: string
  ): boolean => {
    try {
      const result = validationFn();
      if (typeof result === 'string') {
        handleValidationError(new Error(result), fieldName);
        return false;
      }
      return result;
    } catch (error) {
      handleValidationError(error instanceof Error ? error : new Error(String(error)), fieldName);
      return false;
    }
  }, [handleValidationError]);

  // Generic operation wrapper with error handling
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    errorType: 'upload' | 'analysis' | 'edit' | 'download' | 'network',
    context?: Record<string, unknown>
  ) => {
    return async (): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        
        switch (errorType) {
          case 'upload':
            handleUploadError(errorInstance, context as { name: string; size: number; type: string });
            break;
          case 'analysis':
            handleAnalysisError(errorInstance, context?.resumeId as string);
            break;
          case 'edit':
            handleEditError(errorInstance, context?.sectionName as string);
            break;
          case 'download':
            handleDownloadError(errorInstance, context?.resumeId as string);
            break;
          case 'network':
            handleNetworkError(errorInstance, context?.operation as string);
            break;
        }
        
        throw errorInstance;
      }
    };
  }, [handleUploadError, handleAnalysisError, handleEditError, handleDownloadError, handleNetworkError]);

  // Safe async operation wrapper
  const safeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    fallbackValue?: T,
    errorMessage?: string
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      
      if (errorMessage) {
        showError('Operation Failed', errorMessage);
      } else {
        showError('Unexpected Error', errorInstance.message);
      }
      
      console.error('Safe async operation failed:', errorInstance);
      return fallbackValue;
    }
  }, [showError]);

  // Batch operation error handling
  const handleBatchOperations = useCallback(async <T>(
    operations: Array<() => Promise<T>>,
    operationName: string,
    continueOnError: boolean = false
  ): Promise<Array<T | Error>> => {
    const results: Array<T | Error> = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result);
        successCount++;
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        results.push(errorInstance);
        errorCount++;
        
        if (!continueOnError) {
          showError(
            'Batch Operation Failed',
            `${operationName} failed at step ${i + 1}: ${errorInstance.message}`
          );
          break;
        }
      }
    }

    // Show summary
    if (continueOnError && errorCount > 0) {
      if (successCount > 0) {
        showWarning(
          'Partial Success',
          `${operationName}: ${successCount} succeeded, ${errorCount} failed`
        );
      } else {
        showError(
          'All Operations Failed',
          `All ${operationName} operations failed`
        );
      }
    } else if (successCount === operations.length) {
      showSuccess(
        'All Operations Successful',
        `All ${operationName} operations completed successfully`
      );
    }

    return results;
  }, [showSuccess, showError, showWarning]);

  return {
    // Specific operation handlers with retry
    handleUploadWithRetry,
    handleAnalysisWithRetry,
    handleEditWithRetry,
    handleDownloadWithRetry,
    handleNetworkOperation,
    
    // Validation handling
    handleValidation,
    
    // Generic wrappers
    withErrorHandling,
    safeAsync,
    handleBatchOperations,
    
    // Direct error handlers (for manual use)
    handleUploadError,
    handleAnalysisError,
    handleEditError,
    handleDownloadError,
    handleNetworkError,
    handleValidationError,
    
    // Retry utility
    retryOperation,
  };
};

export default useErrorHandling;