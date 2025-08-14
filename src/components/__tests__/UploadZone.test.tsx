/**
 * Tests for UploadZone component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadZone } from '../UploadZone';
import { SessionProvider } from '../../contexts/SessionContext';

// Mock the upload service
vi.mock('../../services', () => ({
  UploadService: {
    uploadPDF: vi.fn(),
  },
}));

// Mock the session context
vi.mock('../../contexts/SessionContext', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({
    sessionId: 'test-session-123',
    sessionData: { sessionId: 'test-session-123', createdAt: '2023-01-01', lastActivity: '2023-01-01' },
    isSessionLoading: false,
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
    updateActivity: vi.fn(),
  }),
}));

import { UploadService } from '../../services';

describe('UploadZone', () => {
  const mockOnUploadComplete = vi.fn();
  const mockOnUploadProgress = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderUploadZone = (props = {}) => {
    return render(
      <SessionProvider>
        <UploadZone
          onUploadComplete={mockOnUploadComplete}
          onUploadProgress={mockOnUploadProgress}
          onError={mockOnError}
          {...props}
        />
      </SessionProvider>
    );
  };

  it('should render upload zone with correct text', () => {
    renderUploadZone();
    
    expect(screen.getByText('Drag and drop your PDF CV here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse files')).toBeInTheDocument();
    expect(screen.getByText('• PDF files only')).toBeInTheDocument();
    expect(screen.getByText('• Maximum file size: 10MB')).toBeInTheDocument();
  });

  it('should handle successful file upload', async () => {
    const mockUploadResult = {
      resumeId: 'resume-123',
      filePath: 'test-session-123/test.pdf',
      fileUrl: 'https://example.com/test.pdf',
    };

    (UploadService.uploadPDF as any).mockResolvedValue(mockUploadResult);

    renderUploadZone();

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith({
        resumeId: 'resume-123',
        filePath: 'test-session-123/test.pdf',
      });
    });
  });

  it('should handle file validation errors', async () => {
    renderUploadZone();

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Please upload a PDF file only.');
    });
  });

  it('should handle upload errors', async () => {
    (UploadService.uploadPDF as any).mockRejectedValue(new Error('Upload failed'));

    renderUploadZone();

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('should show progress during upload', async () => {
    let progressCallback: ((progress: any) => void) | undefined;

    (UploadService.uploadPDF as any).mockImplementation(async (file: File, sessionId: string, options: any) => {
      progressCallback = options.onProgress;
      
      // Simulate progress updates
      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100, percentage: 50 });
        progressCallback({ loaded: 100, total: 100, percentage: 100 });
      }

      return {
        resumeId: 'resume-123',
        filePath: 'test-session-123/test.pdf',
        fileUrl: 'https://example.com/test.pdf',
      };
    });

    renderUploadZone();

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnUploadProgress).toHaveBeenCalledWith(50);
      expect(mockOnUploadProgress).toHaveBeenCalledWith(100);
    });
  });

  it('should be disabled when disabled prop is true', () => {
    renderUploadZone({ disabled: true });
    
    const uploadZone = document.querySelector('.cursor-not-allowed');
    expect(uploadZone).toBeInTheDocument();
  });

  it('should show cancel button during upload', async () => {
    (UploadService.uploadPDF as unknown).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderUploadZone();

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Cancel Upload')).toBeInTheDocument();
    });
  });
});