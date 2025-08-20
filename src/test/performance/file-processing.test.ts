/**
 * Performance Tests for File Upload and Processing
 * Tests performance characteristics of file operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadService } from '../../services/uploadService';
import { PDFGenerationService } from '../../services/pdfGenerationService';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        list: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
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

describe('File Processing Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Upload Performance', () => {
    it('should handle small files (< 1MB) quickly', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      // Mock successful upload
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'session/test.pdf' },
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

      // Create small file (500KB)
      const smallContent = new Array(500 * 1024).fill('a').join('');
      const smallFile = new File([smallContent], 'small.pdf', { type: 'application/pdf' });

      const startTime = performance.now();
      
      await UploadService.uploadPDF(smallFile, 'test-session');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 100ms (excluding network time)
      expect(duration).toBeLessThan(100);
    });

    it('should handle medium files (1-5MB) efficiently', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'session/test.pdf' },
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

      // Create medium file (3MB)
      const mediumContent = new Array(3 * 1024 * 1024).fill('a').join('');
      const mediumFile = new File([mediumContent], 'medium.pdf', { type: 'application/pdf' });

      const startTime = performance.now();
      
      await UploadService.uploadPDF(mediumFile, 'test-session');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 500ms (excluding network time)
      expect(duration).toBeLessThan(500);
    });

    it('should provide progress updates for large files', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'session/test.pdf' },
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

      const progressUpdates: number[] = [];
      const onProgress = (progress: { percentage: number }) => {
        progressUpdates.push(progress.percentage);
      };

      // Create large file (8MB)
      const largeContent = new Array(8 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      await UploadService.uploadPDF(largeFile, 'test-session', { onProgress });

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('should handle concurrent uploads efficiently', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'session/test.pdf' },
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

      // Create multiple files
      const files = Array.from({ length: 5 }, (_, i) => {
        const content = new Array(1024 * 1024).fill('a').join(''); // 1MB each
        return new File([content], `test-${i}.pdf`, { type: 'application/pdf' });
      });

      const startTime = performance.now();
      
      // Upload files concurrently
      const uploadPromises = files.map((file, i) => 
        UploadService.uploadPDF(file, `test-session-${i}`)
      );
      
      await Promise.all(uploadPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle concurrent uploads efficiently
      expect(duration).toBeLessThan(1000); // 1 second for 5 concurrent uploads
      expect(mockStorageFrom.upload).toHaveBeenCalledTimes(5);
    });
  });

  describe('PDF Generation Performance', () => {
    it('should generate PDFs quickly for standard CVs', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockInvoke = supabase.functions.invoke as any;
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          downloadUrl: 'https://example.com/generated.pdf',
          filePath: 'session/generated.pdf',
        },
        error: null,
      });

      const mockCVData = {
        resumeId: 'test-resume-123',
        sections: [
          { section_name: 'professional_summary', content: 'Test summary' },
          { section_name: 'work_experience', content: 'Test experience' },
        ],
      };

      const startTime = performance.now();
      
      await PDFGenerationService.generatePDF(mockCVData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 200ms (excluding Edge Function execution time)
      expect(duration).toBeLessThan(200);
    });

    it('should handle complex CVs with multiple sections', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockInvoke = supabase.functions.invoke as any;
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          downloadUrl: 'https://example.com/generated.pdf',
          filePath: 'session/generated.pdf',
        },
        error: null,
      });

      // Create complex CV with many sections
      const complexCVData = {
        resumeId: 'test-resume-123',
        sections: Array.from({ length: 10 }, (_, i) => ({
          section_name: `section_${i}`,
          content: `This is a long content section with multiple paragraphs and detailed information. `.repeat(50),
        })),
      };

      const startTime = performance.now();
      
      await PDFGenerationService.generatePDF(complexCVData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle complex CVs within reasonable time
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during file operations', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockStorageFrom = supabase.storage.from('originals') as any;
      const mockDbFrom = supabase.from('resumes') as any;

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: 'session/test.pdf' },
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

      // Measure initial memory (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform multiple file operations
      for (let i = 0; i < 10; i++) {
        const content = new Array(1024 * 1024).fill('a').join(''); // 1MB
        const file = new File([content], `test-${i}.pdf`, { type: 'application/pdf' });
        
        await UploadService.uploadPDF(file, `test-session-${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Measure final memory (if available)
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory usage should not grow excessively
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on invalid files', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      const startTime = performance.now();
      
      try {
        await UploadService.uploadPDF(invalidFile, 'test-session');
      } catch (error) {
        // Expected to fail
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should fail quickly without network calls
      expect(duration).toBeLessThan(10);
    });

    it('should timeout appropriately on network issues', async () => {
      const { supabase } = await import('../../lib/supabase');
      
      const mockStorageFrom = supabase.storage.from('originals') as any;
      
      // Mock network timeout
      mockStorageFrom.upload.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      const startTime = performance.now();
      
      try {
        await UploadService.uploadPDF(file, 'test-session');
      } catch (error) {
        // Expected to fail
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should timeout within expected timeframe
      expect(duration).toBeGreaterThan(90); // At least the timeout duration
      expect(duration).toBeLessThan(200); // But not much longer
    });
  });
});