/**
 * Tests for UploadService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the service
vi.mock('../../lib/supabase', () => {
  const mockStorageFrom = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
  };

  const mockDbFrom = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };

  const mockSupabase = {
    storage: {
      from: vi.fn(() => mockStorageFrom),
    },
    from: vi.fn(() => mockDbFrom),
  };

  return {
    supabase: mockSupabase,
    STORAGE_BUCKETS: {
      ORIGINALS: 'originals',
      GENERATED: 'generated',
    },
    getSessionFilePath: (sessionId: string, filename: string) => `${sessionId}/${filename}`,
  };
});

import { UploadService } from '../uploadService';
import { supabase } from '../../lib/supabase';

describe('UploadService', () => {
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPDF', () => {
    it('should successfully upload a PDF file', async () => {
      // Get the mocked functions
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      // Mock successful storage upload
      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'test-session-123/123456_test.pdf' },
        error: null,
      });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.pdf' },
      });

      // Mock successful database insert
      mockDbFrom.insert.mockReturnValue(mockDbFrom);
      mockDbFrom.select.mockReturnValue(mockDbFrom);
      mockDbFrom.single.mockResolvedValue({
        data: { id: 'resume-123' },
        error: null,
      });

      const result = await UploadService.uploadPDF(mockFile, sessionId);

      expect(result).toEqual({
        resumeId: 'resume-123',
        filePath: expect.stringContaining('test-session-123/'),
        fileUrl: 'https://example.com/test.pdf',
      });
    });

    it('should handle upload progress callbacks', async () => {
      const progressCallback = vi.fn();
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      // Mock successful upload
      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'test-session-123/test.pdf' },
        error: null,
      });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.pdf' },
      });

      mockDbFrom.insert.mockReturnValue(mockDbFrom);
      mockDbFrom.select.mockReturnValue(mockDbFrom);
      mockDbFrom.single.mockResolvedValue({
        data: { id: 'resume-123' },
        error: null,
      });

      await UploadService.uploadPDF(mockFile, sessionId, {
        onProgress: progressCallback,
      });

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle upload cancellation', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        UploadService.uploadPDF(mockFile, sessionId, {
          signal: abortController.signal,
        })
      ).rejects.toThrow('Upload was cancelled');
    });

    it('should validate file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(
        UploadService.uploadPDF(invalidFile, sessionId)
      ).rejects.toThrow('Invalid file type');
    });

    it('should validate file size', async () => {
      // Create a file that's too large (>10MB)
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      await expect(
        UploadService.uploadPDF(largeFile, sessionId)
      ).rejects.toThrow('File size too large');
    });

    it('should handle storage upload errors', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      mockStorageFrom.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      await expect(
        UploadService.uploadPDF(mockFile, sessionId)
      ).rejects.toThrow('Upload failed: Storage error');
    });

    it('should handle database insert errors', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      // Mock successful storage upload
      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'test-session-123/test.pdf' },
        error: null,
      });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.pdf' },
      });

      // Mock database error
      mockDbFrom.insert.mockReturnValue(mockDbFrom);
      mockDbFrom.select.mockReturnValue(mockDbFrom);
      mockDbFrom.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        UploadService.uploadPDF(mockFile, sessionId)
      ).rejects.toThrow('Failed to create resume record: Database error');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      mockStorageFrom.list.mockResolvedValue({
        data: [{ name: 'test.pdf' }],
        error: null,
      });

      const exists = await UploadService.fileExists('session/test.pdf');
      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      mockStorageFrom.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const exists = await UploadService.fileExists('session/nonexistent.pdf');
      expect(exists).toBe(false);
    });

    it('should return false on error', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      mockStorageFrom.list.mockResolvedValue({
        data: null,
        error: { message: 'Error' },
      });

      const exists = await UploadService.fileExists('session/test.pdf');
      expect(exists).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return file size when file exists', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      mockStorageFrom.list.mockResolvedValue({
        data: [{ name: 'test.pdf', metadata: { size: 1024 } }],
        error: null,
      });

      const size = await UploadService.getFileSize('session/test.pdf');
      expect(size).toBe(1024);
    });

    it('should return null when file does not exist', async () => {
      const mockStorageFrom = supabase.storage.from('originals') as unknown;
      
      mockStorageFrom.list.mockResolvedValue({
        data: [],
        error: null,
      });

      const size = await UploadService.getFileSize('session/nonexistent.pdf');
      expect(size).toBe(null);
    });
  });
});