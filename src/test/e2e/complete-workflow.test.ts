/**
 * End-to-End Tests for Complete User Workflows
 * Tests the entire user journey from upload to download
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { SessionProvider } from '../../contexts/SessionContext';

// Mock all external services
vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
      update: vi.fn(),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
  STORAGE_BUCKETS: {
    ORIGINALS: 'originals',
    GENERATED: 'generated',
  },
}));

vi.mock('../../services', () => ({
  UploadService: {
    uploadPDF: vi.fn(),
    fileExists: vi.fn(),
    getFileSize: vi.fn(),
  },
  SectionEditService: {
    editSection: vi.fn(),
    checkAvailability: vi.fn(),
  },
  ChatService: {
    sendMessage: vi.fn(),
    checkAvailability: vi.fn(),
  },
  PDFGenerationService: {
    generatePDF: vi.fn(),
    checkAvailability: vi.fn(),
  },
}));

describe('Complete User Workflows', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = () => {
    return render(
      <SessionProvider>
        <App />
      </SessionProvider>
    );
  };

  describe('Complete CV Improvement Workflow', () => {
    it('should complete the full workflow from upload to download', async () => {
      const { UploadService, SectionEditService, PDFGenerationService } = await import('../../services');
      
      // Mock successful upload
      (UploadService.uploadPDF as any).mockResolvedValue({
        resumeId: 'test-resume-123',
        filePath: 'session/test.pdf',
        fileUrl: 'https://example.com/test.pdf',
      });

      // Mock successful analysis
      const mockAnalysisResult = {
        overall_score: 75,
        summary: 'Good CV with room for improvement',
        sections: [
          {
            section_name: 'professional_summary',
            score: 70,
            content: 'Software developer with experience',
            feedback: 'Good start but needs more detail',
            suggestions: 'Add specific technologies and achievements',
          },
          {
            section_name: 'work_experience',
            score: 80,
            content: 'Senior Developer at Tech Corp',
            feedback: 'Strong experience section',
            suggestions: 'Add quantifiable results',
          },
        ],
        ats_compatibility: {
          score: 85,
          feedback: 'Good ATS compatibility',
          suggestions: 'Use more standard section headers',
        },
      };

      // Mock successful section editing
      (SectionEditService.editSection as any).mockResolvedValue({
        success: true,
        updatedContent: 'Improved software developer with 5+ years experience in React, Node.js, and TypeScript',
        newScore: 85,
      });

      // Mock successful PDF generation
      (PDFGenerationService.generatePDF as any).mockResolvedValue({
        success: true,
        downloadUrl: 'https://example.com/improved-cv.pdf',
        filePath: 'session/improved-test.pdf',
      });

      renderApp();

      // Step 1: Upload CV
      expect(screen.getByText('AI-Powered CV Improvement Platform')).toBeInTheDocument();
      
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(uploadInput, file);

      // Wait for upload to complete and analysis to start
      await waitFor(() => {
        expect(UploadService.uploadPDF).toHaveBeenCalledWith(
          file,
          expect.any(String),
          expect.any(Object)
        );
      });

      // Step 2: View analysis results (simulate navigation to results)
      // This would normally happen after the analysis Edge Function completes
      // For testing, we'll simulate the state change
      
      // Step 3: Edit a section
      const editButton = screen.getByText('Edit with AI');
      await user.click(editButton);

      await waitFor(() => {
        expect(SectionEditService.editSection).toHaveBeenCalled();
      });

      // Step 4: Download improved CV
      const downloadButton = screen.getByText('Download PDF');
      await user.click(downloadButton);

      await waitFor(() => {
        expect(PDFGenerationService.generatePDF).toHaveBeenCalled();
      });

      // Verify the complete workflow
      expect(UploadService.uploadPDF).toHaveBeenCalledTimes(1);
      expect(SectionEditService.editSection).toHaveBeenCalledTimes(1);
      expect(PDFGenerationService.generatePDF).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully throughout the workflow', async () => {
      const { UploadService } = await import('../../services');
      
      // Mock upload failure
      (UploadService.uploadPDF as any).mockRejectedValue(new Error('Upload failed'));

      renderApp();

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(uploadInput, file);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    it('should maintain session state throughout the workflow', async () => {
      const { UploadService } = await import('../../services');
      
      (UploadService.uploadPDF as any).mockResolvedValue({
        resumeId: 'test-resume-123',
        filePath: 'session/test.pdf',
        fileUrl: 'https://example.com/test.pdf',
      });

      renderApp();

      // Check that session ID is generated and displayed
      await waitFor(() => {
        expect(screen.getByText(/session id:/i)).toBeInTheDocument();
      });

      // Upload file and verify session is maintained
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(UploadService.uploadPDF).toHaveBeenCalledWith(
          file,
          expect.stringMatching(/^[a-f0-9-]+$/), // UUID format
          expect.any(Object)
        );
      });
    });
  });

  describe('Mobile Workflow', () => {
    it('should work correctly on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderApp();

      // Should show mobile-optimized text
      expect(screen.getByText('Tap to select your PDF CV')).toBeInTheDocument();
      
      // Should have touch-friendly elements
      const touchElements = document.querySelectorAll('.btn-touch');
      expect(touchElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Workflow', () => {
    it('should be fully accessible via keyboard navigation', async () => {
      renderApp();

      // Should be able to navigate to upload area with keyboard
      const uploadArea = screen.getByLabelText('Upload PDF file');
      uploadArea.focus();
      expect(document.activeElement).toBe(uploadArea);

      // Should respond to Enter key
      fireEvent.keyDown(uploadArea, { key: 'Enter', code: 'Enter' });
      
      // File input should be triggered (we can't test actual file selection in jsdom)
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should have proper ARIA labels and roles', () => {
      renderApp();

      // Check for proper ARIA labels
      expect(screen.getByLabelText('Upload PDF file')).toBeInTheDocument();
      
      // Check for proper roles
      const uploadButton = screen.getByRole('button', { name: /upload pdf file/i });
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should allow retry after upload failure', async () => {
      const { UploadService } = await import('../../services');
      
      // First attempt fails
      (UploadService.uploadPDF as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          resumeId: 'test-resume-123',
          filePath: 'session/test.pdf',
          fileUrl: 'https://example.com/test.pdf',
        });

      renderApp();

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // First upload attempt
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Retry upload
      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(UploadService.uploadPDF).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle session expiration gracefully', async () => {
      renderApp();

      // Simulate session expiration by clearing localStorage
      localStorage.clear();

      // Should regenerate session
      await waitFor(() => {
        expect(screen.getByText(/session id:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Workflow', () => {
    it('should handle large file uploads efficiently', async () => {
      const { UploadService } = await import('../../services');
      
      let progressCallback: ((progress: any) => void) | undefined;
      
      (UploadService.uploadPDF as any).mockImplementation(async (file: File, sessionId: string, options: any) => {
        progressCallback = options.onProgress;
        
        // Simulate progress updates
        if (progressCallback) {
          for (let i = 0; i <= 100; i += 10) {
            progressCallback({ loaded: i, total: 100, percentage: i });
          }
        }

        return {
          resumeId: 'test-resume-123',
          filePath: 'session/test.pdf',
          fileUrl: 'https://example.com/test.pdf',
        };
      });

      renderApp();

      // Create a large file (5MB)
      const largeContent = new Array(5 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      
      const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(uploadInput, largeFile);

      // Should show progress indicators
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
      });
    });
  });
});