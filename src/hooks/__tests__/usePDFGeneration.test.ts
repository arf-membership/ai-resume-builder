/**
 * PDF Generation Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePDFGeneration } from '../usePDFGeneration';
import { PDFGenerationService } from '../../services/pdfGenerationService';
import type { SectionUpdate } from '../../types/components';

// Mock PDF Generation Service
vi.mock('../../services/pdfGenerationService', () => ({
  PDFGenerationService: {
    generatePDF: vi.fn(),
    downloadPDF: vi.fn(),
    generateAndDownloadPDF: vi.fn(),
    hasGeneratedPDF: vi.fn(),
    getGeneratedPDFUrl: vi.fn(),
  },
}));

describe('usePDFGeneration', () => {
  const mockResumeId = 'test-resume-id';
  const mockSessionId = 'session_123_abc';
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const defaultOptions = {
    resumeId: mockResumeId,
    sessionId: mockSessionId,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
  };

  const mockSectionUpdates: SectionUpdate[] = [
    {
      sectionName: 'Summary',
      newContent: 'Updated summary content',
      position: { x: 10, y: 20, width: 200, height: 50 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      expect(result.current.state).toEqual({
        isGenerating: false,
        isDownloading: false,
        progress: null,
        error: null,
        generatedPdfUrl: null,
        hasGeneratedPdf: false,
      });
    });
  });

  describe('generatePDF', () => {
    it('should generate PDF successfully', async () => {
      const mockResponse = {
        resumeId: mockResumeId,
        generatedPdfUrl: 'https://example.com/generated.pdf',
        generatedPdfPath: 'session_123_abc/generated.pdf',
      };

      vi.mocked(PDFGenerationService.generatePDF).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.generatePDF(mockSectionUpdates);
      });

      // Check loading state
      expect(result.current.state.isGenerating).toBe(true);
      expect(result.current.state.progress).toEqual({
        stage: 'Starting generation',
        percentage: 0,
      });

      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });

      expect(result.current.state.generatedPdfUrl).toBe(mockResponse.generatedPdfUrl);
      expect(result.current.state.hasGeneratedPdf).toBe(true);
      expect(result.current.state.error).toBe(null);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResponse.generatedPdfUrl);
    });

    it('should handle generation errors', async () => {
      const errorMessage = 'Generation failed';
      vi.mocked(PDFGenerationService.generatePDF).mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.generatePDF(mockSectionUpdates);
      });

      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });

      expect(result.current.state.error).toBe(errorMessage);
      expect(result.current.state.generatedPdfUrl).toBe(null);
      expect(mockOnError).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle progress updates', async () => {
      const mockResponse = {
        resumeId: mockResumeId,
        generatedPdfUrl: 'https://example.com/generated.pdf',
        generatedPdfPath: 'session_123_abc/generated.pdf',
      };

      let progressCallback: ((progress: { stage: string; percentage: number }) => void) | undefined;

      vi.mocked(PDFGenerationService.generatePDF).mockImplementation(
        async (resumeId, sessionId, updates, options) => {
          progressCallback = options?.onProgress;
          
          // Simulate progress updates
          if (progressCallback) {
            progressCallback({ stage: 'Processing', percentage: 50 });
            progressCallback({ stage: 'Finalizing', percentage: 90 });
          }
          
          return mockResponse;
        }
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.generatePDF(mockSectionUpdates);
      });

      await waitFor(() => {
        expect(result.current.state.progress).toEqual({
          stage: 'Finalizing',
          percentage: 90,
        });
      });

      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });

      expect(result.current.state.progress).toBe(null);
    });

    it('should handle cancellation', async () => {
      vi.mocked(PDFGenerationService.generatePDF).mockRejectedValue(
        new Error('PDF generation was cancelled')
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.generatePDF(mockSectionUpdates);
      });

      act(() => {
        result.current.cancelGeneration();
      });

      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });

      expect(result.current.state.progress).toBe(null);
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('downloadPDF', () => {
    it('should download PDF successfully', async () => {
      vi.mocked(PDFGenerationService.downloadPDF).mockResolvedValue();

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      // First generate a PDF to set up state
      const mockResponse = {
        resumeId: mockResumeId,
        generatedPdfUrl: 'https://example.com/generated.pdf',
        generatedPdfPath: 'session_123_abc/generated.pdf',
      };

      vi.mocked(PDFGenerationService.generatePDF).mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.generatePDF([]);
      });

      act(() => {
        result.current.downloadPDF('test.pdf');
      });

      expect(result.current.state.isDownloading).toBe(true);

      await waitFor(() => {
        expect(result.current.state.isDownloading).toBe(false);
      });

      expect(PDFGenerationService.downloadPDF).toHaveBeenCalledWith(
        'https://example.com/generated.pdf',
        'test.pdf',
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should handle download errors', async () => {
      const errorMessage = 'Download failed';
      vi.mocked(PDFGenerationService.downloadPDF).mockRejectedValue(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      // First generate a PDF to set up state
      const mockResponse = {
        resumeId: mockResumeId,
        generatedPdfUrl: 'https://example.com/generated.pdf',
        generatedPdfPath: 'session_123_abc/generated.pdf',
      };

      vi.mocked(PDFGenerationService.generatePDF).mockResolvedValue(mockResponse);

      await act(async () => {
        await result.current.generatePDF([]);
      });

      act(() => {
        result.current.downloadPDF();
      });

      await waitFor(() => {
        expect(result.current.state.isDownloading).toBe(false);
      });

      expect(result.current.state.error).toBe(errorMessage);
      expect(mockOnError).toHaveBeenCalledWith(errorMessage);
    });

    it('should handle missing PDF URL', async () => {
      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.downloadPDF();
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('No generated PDF available for download');
      });

      expect(mockOnError).toHaveBeenCalledWith('No generated PDF available for download');
    });
  });

  describe('generateAndDownload', () => {
    it('should generate and download PDF successfully', async () => {
      vi.mocked(PDFGenerationService.generateAndDownloadPDF).mockResolvedValue();
      vi.mocked(PDFGenerationService.getGeneratedPDFUrl).mockResolvedValue(
        'https://example.com/generated.pdf'
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      act(() => {
        result.current.generateAndDownload(mockSectionUpdates, 'test.pdf');
      });

      expect(result.current.state.isGenerating).toBe(true);

      await waitFor(() => {
        expect(result.current.state.isGenerating).toBe(false);
      });

      expect(result.current.state.generatedPdfUrl).toBe('https://example.com/generated.pdf');
      expect(result.current.state.hasGeneratedPdf).toBe(true);
      expect(mockOnSuccess).toHaveBeenCalledWith('https://example.com/generated.pdf');
    });
  });

  describe('checkExistingPDF', () => {
    it('should check for existing PDF successfully', async () => {
      vi.mocked(PDFGenerationService.hasGeneratedPDF).mockResolvedValue(true);
      vi.mocked(PDFGenerationService.getGeneratedPDFUrl).mockResolvedValue(
        'https://example.com/existing.pdf'
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      await act(async () => {
        await result.current.checkExistingPDF();
      });

      expect(result.current.state.hasGeneratedPdf).toBe(true);
      expect(result.current.state.generatedPdfUrl).toBe('https://example.com/existing.pdf');
    });

    it('should handle check errors silently', async () => {
      vi.mocked(PDFGenerationService.hasGeneratedPDF).mockRejectedValue(
        new Error('Check failed')
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      await act(async () => {
        await result.current.checkExistingPDF();
      });

      // Should not set error state for check failures
      expect(result.current.state.error).toBe(null);
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      vi.mocked(PDFGenerationService.generatePDF).mockRejectedValue(
        new Error('Test error')
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      // Generate an error first
      act(() => {
        result.current.generatePDF([]);
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('Test error');
      });

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });
  });

  describe('cancelGeneration', () => {
    it('should cancel generation and reset state', async () => {
      // Mock a delayed response to simulate ongoing generation
      vi.mocked(PDFGenerationService.generatePDF).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => usePDFGeneration(defaultOptions));

      // Start generation
      act(() => {
        result.current.generatePDF([]);
      });

      // Verify generating state
      expect(result.current.state.isGenerating).toBe(true);
      expect(result.current.state.progress).toEqual({
        stage: 'Starting generation',
        percentage: 0,
      });

      // Cancel generation
      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.state.isGenerating).toBe(false);
      expect(result.current.state.isDownloading).toBe(false);
      expect(result.current.state.progress).toBe(null);
    });
  });
});