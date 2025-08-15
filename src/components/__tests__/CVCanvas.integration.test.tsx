/**
 * CVCanvas Integration Tests with PDF Generation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CVCanvas from '../CVCanvas';
import { PDFGenerationService } from '../../services/pdfGenerationService';
import type { SectionUpdate } from '../../types/components';

// Mock PDF.js
vi.mock('react-pdf', () => ({
  Document: ({ children, onLoadSuccess }: any) => {
    // Simulate successful PDF load
    React.useEffect(() => {
      onLoadSuccess?.({ numPages: 2 });
    }, [onLoadSuccess]);
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: unknown) => (
    <div data-testid={`pdf-page-${pageNumber}`}>PDF Page {pageNumber}</div>
  ),
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '3.0.0',
  },
}));

// Mock PDF Generation Service
vi.mock('../../services/pdfGenerationService', () => ({
  PDFGenerationService: {
    generateAndDownloadPDF: vi.fn(),
    hasGeneratedPDF: vi.fn(),
    getGeneratedPDFUrl: vi.fn(),
  },
}));

describe('CVCanvas Integration Tests', () => {
  const mockProps = {
    pdfUrl: 'https://example.com/test.pdf',
    resumeId: 'test-resume-id',
    sessionId: 'session_123_abc',
    updates: [] as SectionUpdate[],
    className: 'test-class',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful PDF generation service calls
    vi.mocked(PDFGenerationService.hasGeneratedPDF).mockResolvedValue(false);
    vi.mocked(PDFGenerationService.getGeneratedPDFUrl).mockResolvedValue(null);
    vi.mocked(PDFGenerationService.generateAndDownloadPDF).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PDF Generation Integration', () => {
    it('should render with PDF generation functionality', async () => {
      render(<CVCanvas {...mockProps} />);

      // Check that PDF document is rendered
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      
      // Check that download button is present
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
      });
    });

    it('should check for existing PDF on mount', async () => {
      render(<CVCanvas {...mockProps} />);

      await waitFor(() => {
        expect(PDFGenerationService.hasGeneratedPDF).toHaveBeenCalledWith(
          mockProps.resumeId,
          mockProps.sessionId
        );
        expect(PDFGenerationService.getGeneratedPDFUrl).toHaveBeenCalledWith(
          mockProps.resumeId,
          mockProps.sessionId
        );
      });
    });

    it('should generate and download PDF when download button is clicked', async () => {
      render(<CVCanvas {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(PDFGenerationService.generateAndDownloadPDF).toHaveBeenCalledWith(
          mockProps.resumeId,
          mockProps.sessionId,
          mockProps.updates,
          'enhanced_cv.pdf',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
            onProgress: expect.any(Function),
          })
        );
      });
    });

    it('should show loading state during PDF generation', async () => {
      // Mock a delayed response
      vi.mocked(PDFGenerationService.generateAndDownloadPDF).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<CVCanvas {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      // Check loading state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
        expect(downloadButton).toBeDisabled();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
        expect(downloadButton).not.toBeDisabled();
      }, { timeout: 200 });
    });

    it('should display progress during PDF generation', async () => {
      // Mock a delayed response to simulate progress
      vi.mocked(PDFGenerationService.generateAndDownloadPDF).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 50))
      );

      render(<CVCanvas {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      // Check that the button shows generating state
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Download PDF')).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should display error when PDF generation fails', async () => {
      const errorMessage = 'PDF generation failed';
      vi.mocked(PDFGenerationService.generateAndDownloadPDF).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<CVCanvas {...mockProps} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Check that error can be dismissed
      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
      });
    });

    it('should use custom onDownload handler when provided', async () => {
      const customOnDownload = vi.fn();
      
      render(<CVCanvas {...mockProps} onDownload={customOnDownload} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      expect(customOnDownload).toHaveBeenCalled();
      expect(PDFGenerationService.generateAndDownloadPDF).not.toHaveBeenCalled();
    });

    it('should handle section updates in PDF generation', async () => {
      const sectionUpdates: SectionUpdate[] = [
        {
          sectionName: 'Summary',
          newContent: 'Updated summary content',
          position: { x: 10, y: 20, width: 200, height: 50 },
        },
        {
          sectionName: 'Experience',
          newContent: 'Updated experience content',
          position: { x: 10, y: 100, width: 200, height: 80 },
        },
      ];

      render(<CVCanvas {...mockProps} updates={sectionUpdates} />);

      const downloadButton = screen.getByRole('button', { name: /download pdf/i });
      
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(PDFGenerationService.generateAndDownloadPDF).toHaveBeenCalledWith(
          mockProps.resumeId,
          mockProps.sessionId,
          sectionUpdates,
          'enhanced_cv.pdf',
          expect.any(Object)
        );
      });
    });

    it('should display section update overlays', () => {
      const sectionUpdates: SectionUpdate[] = [
        {
          sectionName: 'Summary',
          newContent: 'Updated summary content',
          position: { x: 10, y: 20, width: 200, height: 50 },
        },
      ];

      render(<CVCanvas {...mockProps} updates={sectionUpdates} />);

      // Check that overlay is displayed
      const overlay = screen.getByTitle('Updated: Summary');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveStyle({
        left: '10px',
        top: '20px',
        width: '200px',
        height: '50px',
      });
    });

    it('should handle missing resumeId and sessionId gracefully', () => {
      const propsWithoutIds = {
        ...mockProps,
        resumeId: undefined,
        sessionId: undefined,
      };

      render(<CVCanvas {...propsWithoutIds} />);

      // Should still render PDF viewer
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
      
      // Download button should be present but won't use PDF generation service
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });
  });

  describe('PDF Viewer Controls', () => {
    it('should navigate between pages', async () => {
      render(<CVCanvas {...mockProps} />);

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
      });

      // Navigate to next page
      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument();

      // Navigate back to previous page
      const prevButton = screen.getByLabelText('Previous page');
      fireEvent.click(prevButton);

      expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument();
    });

    it('should handle zoom controls', async () => {
      render(<CVCanvas {...mockProps} />);

      // Wait for PDF to load
      await waitFor(() => {
        expect(screen.getByText(/100/)).toBeInTheDocument();
      });

      // Check that zoom controls are present
      const zoomInButton = screen.getByLabelText('Zoom in');
      const zoomOutButton = screen.getByLabelText('Zoom out');
      
      expect(zoomInButton).toBeInTheDocument();
      expect(zoomOutButton).toBeInTheDocument();

      // Test zoom interactions (functionality is tested in unit tests)
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomOutButton);

      // Zoom controls should still be present
      expect(zoomInButton).toBeInTheDocument();
      expect(zoomOutButton).toBeInTheDocument();
    });
  });
});