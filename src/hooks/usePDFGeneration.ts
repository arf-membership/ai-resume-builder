/**
 * PDF Generation Hook
 * Manages PDF generation state and operations
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useState, useCallback, useRef } from 'react';
import { PDFGenerationService } from '../services/pdfGenerationService';
import type { SectionUpdate } from '../types/components';

export interface PDFGenerationState {
  isGenerating: boolean;
  isDownloading: boolean;
  progress: {
    stage: string;
    percentage: number;
  } | null;
  error: string | null;
  generatedPdfUrl: string | null;
  hasGeneratedPdf: boolean;
}

export interface UsePDFGenerationOptions {
  resumeId: string;
  sessionId: string;
  onSuccess?: (pdfUrl: string) => void;
  onError?: (error: string) => void;
}

export interface UsePDFGenerationReturn {
  state: PDFGenerationState;
  generatePDF: (sectionUpdates?: SectionUpdate[]) => Promise<void>;
  downloadPDF: (filename?: string) => Promise<void>;
  generateAndDownload: (sectionUpdates?: SectionUpdate[], filename?: string) => Promise<void>;
  checkExistingPDF: () => Promise<void>;
  clearError: () => void;
  cancelGeneration: () => void;
}

/**
 * Hook for managing PDF generation operations
 */
export function usePDFGeneration(options: UsePDFGenerationOptions): UsePDFGenerationReturn {
  const { resumeId, sessionId, onSuccess, onError } = options;
  
  const [state, setState] = useState<PDFGenerationState>({
    isGenerating: false,
    isDownloading: false,
    progress: null,
    error: null,
    generatedPdfUrl: null,
    hasGeneratedPdf: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<PDFGenerationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({
      isGenerating: false,
      isDownloading: false,
      progress: null,
    });
  }, [updateState]);

  /**
   * Handle progress updates
   */
  const handleProgress = useCallback((progress: { stage: string; percentage: number }) => {
    updateState({ progress });
  }, [updateState]);

  /**
   * Handle errors
   */
  const handleError = useCallback((error: Error) => {
    const errorMessage = error.message;
    updateState({
      error: errorMessage,
      isGenerating: false,
      isDownloading: false,
      progress: null,
    });
    onError?.(errorMessage);
  }, [updateState, onError]);

  /**
   * Generate PDF without downloading
   */
  const generatePDF = useCallback(async (sectionUpdates: SectionUpdate[] = []) => {
    try {
      // Clear previous state
      updateState({
        error: null,
        isGenerating: true,
        progress: { stage: 'Starting generation', percentage: 0 },
      });

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Generate PDF
      const result = await PDFGenerationService.generatePDF(
        resumeId,
        sessionId,
        sectionUpdates,
        {
          signal: abortControllerRef.current.signal,
          onProgress: handleProgress,
        }
      );

      // Update state with success
      updateState({
        isGenerating: false,
        progress: null,
        generatedPdfUrl: result.generatedPdfUrl,
        hasGeneratedPdf: true,
      });

      onSuccess?.(result.generatedPdfUrl);

    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelled')) {
        handleError(error);
      } else {
        // Cancelled - just reset state
        updateState({
          isGenerating: false,
          progress: null,
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [resumeId, sessionId, updateState, handleProgress, handleError, onSuccess]);

  /**
   * Download existing generated PDF
   */
  const downloadPDF = useCallback(async (filename: string = 'enhanced_cv.pdf') => {
    try {
      if (!state.generatedPdfUrl) {
        throw new Error('No generated PDF available for download');
      }

      updateState({
        error: null,
        isDownloading: true,
        progress: { stage: 'Starting download', percentage: 0 },
      });

      // Create abort controller
      abortControllerRef.current = new AbortController();

      await PDFGenerationService.downloadPDF(
        state.generatedPdfUrl,
        filename,
        { signal: abortControllerRef.current.signal }
      );

      updateState({
        isDownloading: false,
        progress: null,
      });

    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelled')) {
        handleError(error);
      } else {
        // Cancelled - just reset state
        updateState({
          isDownloading: false,
          progress: null,
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.generatedPdfUrl, updateState, handleError]);

  /**
   * Generate and automatically download PDF
   */
  const generateAndDownload = useCallback(async (
    sectionUpdates: SectionUpdate[] = [],
    filename: string = 'enhanced_cv.pdf'
  ) => {
    try {
      // Clear previous state
      updateState({
        error: null,
        isGenerating: true,
        progress: { stage: 'Starting generation', percentage: 0 },
      });

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Generate and download
      await PDFGenerationService.generateAndDownloadPDF(
        resumeId,
        sessionId,
        sectionUpdates,
        filename,
        {
          signal: abortControllerRef.current.signal,
          onProgress: handleProgress,
        }
      );

      // Check if we have a generated PDF URL after generation
      const pdfUrl = await PDFGenerationService.getGeneratedPDFUrl(resumeId, sessionId);

      // Update state with success
      updateState({
        isGenerating: false,
        isDownloading: false,
        progress: null,
        generatedPdfUrl: pdfUrl,
        hasGeneratedPdf: !!pdfUrl,
      });

      if (pdfUrl) {
        onSuccess?.(pdfUrl);
      }

    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelled')) {
        handleError(error);
      } else {
        // Cancelled - just reset state
        updateState({
          isGenerating: false,
          isDownloading: false,
          progress: null,
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [resumeId, sessionId, updateState, handleProgress, handleError, onSuccess]);

  /**
   * Check if resume has existing generated PDF
   */
  const checkExistingPDF = useCallback(async () => {
    try {
      const [hasGenerated, pdfUrl] = await Promise.all([
        PDFGenerationService.hasGeneratedPDF(resumeId, sessionId),
        PDFGenerationService.getGeneratedPDFUrl(resumeId, sessionId),
      ]);

      updateState({
        hasGeneratedPdf: hasGenerated,
        generatedPdfUrl: pdfUrl,
      });

    } catch (error) {
      // Silently fail - this is just a check
      console.error('Failed to check existing PDF:', error);
    }
  }, [resumeId, sessionId, updateState]);

  return {
    state,
    generatePDF,
    downloadPDF,
    generateAndDownload,
    checkExistingPDF,
    clearError,
    cancelGeneration,
  };
}

export default usePDFGeneration;