/**
 * PDF Generation Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFGenerationService } from '../pdfGenerationService';
import { supabase } from '../../lib/supabase';
import type { SectionUpdate } from '../../types/components';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}));

// Mock fetch for download tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock DOM methods for download
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Mock document methods
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => mockLink),
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
});

describe('PDFGenerationService', () => {
  const mockResumeId = 'test-resume-id';
  const mockSessionId = 'session_123_abc';
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

  describe('generatePDF', () => {
    it('should generate PDF successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          resumeId: mockResumeId,
          generatedPdfUrl: 'https://example.com/generated.pdf',
          generatedPdfPath: 'session_123_abc/generated.pdf',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await PDFGenerationService.generatePDF(
        mockResumeId,
        mockSessionId,
        mockSectionUpdates
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-pdf', {
        body: {
          resumeId: mockResumeId,
          updatedContent: {
            sections: [
              {
                section_name: 'Summary',
                content: 'Updated summary content',
                position: { x: 10, y: 20, width: 200, height: 50 },
              },
            ],
          },
        },
        headers: {
          'x-session-id': mockSessionId,
          'Content-Type': 'application/json',
        },
        signal: undefined,
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should generate PDF without section updates', async () => {
      const mockResponse = {
        success: true,
        data: {
          resumeId: mockResumeId,
          generatedPdfUrl: 'https://example.com/generated.pdf',
          generatedPdfPath: 'session_123_abc/generated.pdf',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await PDFGenerationService.generatePDF(
        mockResumeId,
        mockSessionId,
        []
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-pdf', {
        body: {
          resumeId: mockResumeId,
          updatedContent: undefined,
        },
        headers: {
          'x-session-id': mockSessionId,
          'Content-Type': 'application/json',
        },
        signal: undefined,
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle Edge Function errors', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Function execution failed' },
      });

      await expect(
        PDFGenerationService.generatePDF(mockResumeId, mockSessionId, [])
      ).rejects.toThrow('PDF generation failed: Function execution failed');
    });

    it('should handle unsuccessful responses', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Invalid resume ID' },
        error: null,
      });

      await expect(
        PDFGenerationService.generatePDF(mockResumeId, mockSessionId, [])
      ).rejects.toThrow('Invalid resume ID');
    });

    it('should handle progress updates', async () => {
      const mockResponse = {
        success: true,
        data: {
          resumeId: mockResumeId,
          generatedPdfUrl: 'https://example.com/generated.pdf',
          generatedPdfPath: 'session_123_abc/generated.pdf',
        },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const onProgress = vi.fn();

      await PDFGenerationService.generatePDF(
        mockResumeId,
        mockSessionId,
        [],
        { onProgress }
      );

      expect(onProgress).toHaveBeenCalledWith({
        stage: 'Preparing content',
        percentage: 10,
      });
      expect(onProgress).toHaveBeenCalledWith({
        stage: 'Generating PDF',
        percentage: 30,
      });
      expect(onProgress).toHaveBeenCalledWith({
        stage: 'PDF ready',
        percentage: 100,
      });
    });

    it('should handle cancellation', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        PDFGenerationService.generatePDF(mockResumeId, mockSessionId, [], {
          signal: abortController.signal,
        })
      ).rejects.toThrow('PDF generation was cancelled');
    });
  });

  describe('downloadPDF', () => {
    it('should download PDF successfully', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      await PDFGenerationService.downloadPDF(
        'https://example.com/test.pdf',
        'test.pdf'
      );

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/test.pdf', {
        signal: undefined,
      });
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe('test.pdf');
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        PDFGenerationService.downloadPDF('https://example.com/test.pdf')
      ).rejects.toThrow('Failed to download PDF: Not Found');
    });

    it('should handle cancellation during download', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        PDFGenerationService.downloadPDF('https://example.com/test.pdf', 'test.pdf', {
          signal: abortController.signal,
        })
      ).rejects.toThrow('Download was cancelled');
    });
  });

  describe('hasGeneratedPDF', () => {
    it('should return true when PDF exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { generated_pdf_path: 'session_123_abc/generated.pdf' },
                error: null,
              }),
            })),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await PDFGenerationService.hasGeneratedPDF(
        mockResumeId,
        mockSessionId
      );

      expect(result).toBe(true);
    });

    it('should return false when PDF does not exist', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { generated_pdf_path: null },
                error: null,
              }),
            })),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await PDFGenerationService.hasGeneratedPDF(
        mockResumeId,
        mockSessionId
      );

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            })),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await PDFGenerationService.hasGeneratedPDF(
        mockResumeId,
        mockSessionId
      );

      expect(result).toBe(false);
    });
  });

  describe('getGeneratedPDFUrl', () => {
    it('should return PDF URL when it exists', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { generated_pdf_path: 'session_123_abc/generated.pdf' },
                error: null,
              }),
            })),
          })),
        })),
      }));

      const mockStorage = vi.fn(() => ({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/generated.pdf' },
        }),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(supabase.storage.from).mockImplementation(mockStorage);

      const result = await PDFGenerationService.getGeneratedPDFUrl(
        mockResumeId,
        mockSessionId
      );

      expect(result).toBe('https://example.com/generated.pdf');
    });

    it('should return null when PDF does not exist', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { generated_pdf_path: null },
                error: null,
              }),
            })),
          })),
        })),
      }));

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await PDFGenerationService.getGeneratedPDFUrl(
        mockResumeId,
        mockSessionId
      );

      expect(result).toBe(null);
    });
  });
});