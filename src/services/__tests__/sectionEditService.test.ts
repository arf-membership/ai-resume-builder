/**
 * Tests for SectionEditService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

import { SectionEditService } from '../sectionEditService';
import { supabase } from '../../lib/supabase';

const mockInvoke = vi.mocked(supabase.functions.invoke);

describe('SectionEditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('editSection', () => {
    const mockRequest = {
      resumeId: 'test-resume-id',
      sectionName: 'professional_summary',
      currentContent: 'Current summary content',
      suggestions: 'Make it more impactful',
      sessionId: 'session_123_abc'
    };

    it('should successfully edit a section', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedSection: {
              section_name: 'professional_summary',
              score: 85,
              content: 'Improved summary content',
              feedback: 'Much better!',
              suggestions: 'Consider adding metrics'
            },
            updatedScore: 85,
            message: 'Section updated successfully'
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValue(mockResponse);

      const result = await SectionEditService.editSection(
        mockRequest.resumeId,
        mockRequest.sectionName,
        mockRequest.currentContent,
        mockRequest.suggestions,
        mockRequest.sessionId
      );

      expect(mockInvoke).toHaveBeenCalledWith('edit-section', {
        body: {
          resumeId: mockRequest.resumeId,
          sectionName: mockRequest.sectionName,
          currentContent: mockRequest.currentContent,
          suggestions: mockRequest.suggestions
        },
        headers: {
          'x-session-id': mockRequest.sessionId,
          'Content-Type': 'application/json'
        },
        signal: undefined
      });

      expect(result).toEqual({
        updatedSection: {
          section_name: 'professional_summary',
          score: 85,
          content: 'Improved summary content',
          feedback: 'Much better!',
          suggestions: 'Consider adding metrics'
        },
        updatedScore: 85,
        message: 'Section updated successfully'
      });
    });

    it('should include additional context when provided', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedSection: {
              section_name: 'professional_summary',
              score: 90,
              content: 'Contextually improved content',
              feedback: 'Great improvement!',
              suggestions: 'Perfect as is'
            },
            updatedScore: 90,
            message: 'Section updated successfully'
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValue(mockResponse);

      const additionalContext = 'User is applying for senior roles';

      await SectionEditService.editSection(
        mockRequest.resumeId,
        mockRequest.sectionName,
        mockRequest.currentContent,
        mockRequest.suggestions,
        mockRequest.sessionId,
        additionalContext
      );

      expect(mockInvoke).toHaveBeenCalledWith('edit-section', {
        body: {
          resumeId: mockRequest.resumeId,
          sectionName: mockRequest.sectionName,
          currentContent: mockRequest.currentContent,
          suggestions: mockRequest.suggestions,
          additionalContext
        },
        headers: {
          'x-session-id': mockRequest.sessionId,
          'Content-Type': 'application/json'
        },
        signal: undefined
      });
    });

    it('should handle API errors', async () => {
      const mockError = {
        data: null,
        error: { message: 'API Error' }
      };

      mockInvoke.mockResolvedValue(mockError);

      await expect(
        SectionEditService.editSection(
          mockRequest.resumeId,
          mockRequest.sectionName,
          mockRequest.currentContent,
          mockRequest.suggestions,
          mockRequest.sessionId
        )
      ).rejects.toThrow('Section editing failed: API Error');
    });

    it('should handle unsuccessful responses', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Section not found'
        },
        error: null
      };

      mockInvoke.mockResolvedValue(mockResponse);

      await expect(
        SectionEditService.editSection(
          mockRequest.resumeId,
          mockRequest.sectionName,
          mockRequest.currentContent,
          mockRequest.suggestions,
          mockRequest.sessionId
        )
      ).rejects.toThrow('Section not found');
    });

    it('should validate required parameters', async () => {
      await expect(
        SectionEditService.editSection('', 'section', 'content', 'suggestions', 'session')
      ).rejects.toThrow('Resume ID is required and must be a string');

      await expect(
        SectionEditService.editSection('resume', '', 'content', 'suggestions', 'session')
      ).rejects.toThrow('Section name is required and must be a string');

      await expect(
        SectionEditService.editSection('resume', 'section', '', 'suggestions', 'session')
      ).rejects.toThrow('Current content is required and must be a string');

      await expect(
        SectionEditService.editSection('resume', 'section', 'content', '', 'session')
      ).rejects.toThrow('Suggestions are required and must be a string');

      await expect(
        SectionEditService.editSection('resume', 'section', 'content', 'suggestions', '')
      ).rejects.toThrow('Session ID is required and must be a string');
    });

    it('should validate content length limits', async () => {
      const longContent = 'a'.repeat(5001);
      const longSuggestions = 'b'.repeat(2001);

      await expect(
        SectionEditService.editSection('resume', 'section', longContent, 'suggestions', 'session')
      ).rejects.toThrow('Current content is too long (maximum 5000 characters)');

      await expect(
        SectionEditService.editSection('resume', 'section', 'content', longSuggestions, 'session')
      ).rejects.toThrow('Suggestions are too long (maximum 2000 characters)');
    });

    it('should handle cancellation', async () => {
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        SectionEditService.editSection(
          mockRequest.resumeId,
          mockRequest.sectionName,
          mockRequest.currentContent,
          mockRequest.suggestions,
          mockRequest.sessionId,
          undefined,
          { signal: abortController.signal }
        )
      ).rejects.toThrow('Section editing was cancelled');
    });

    it('should call progress callback', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedSection: {
              section_name: 'professional_summary',
              score: 85,
              content: 'Improved content',
              feedback: 'Good',
              suggestions: 'Keep improving'
            },
            updatedScore: 85,
            message: 'Success'
          }
        },
        error: null
      };

      mockInvoke.mockResolvedValue(mockResponse);

      const onProgress = vi.fn();

      await SectionEditService.editSection(
        mockRequest.resumeId,
        mockRequest.sectionName,
        mockRequest.currentContent,
        mockRequest.suggestions,
        mockRequest.sessionId,
        undefined,
        { onProgress }
      );

      expect(onProgress).toHaveBeenCalledWith('Preparing section for editing...');
      expect(onProgress).toHaveBeenCalledWith('Sending to AI for improvement...');
      expect(onProgress).toHaveBeenCalledWith('Section updated successfully');
    });
  });

  describe('checkAvailability', () => {
    it('should return true when service is available', async () => {
      mockInvoke.mockResolvedValue({ error: null });

      const result = await SectionEditService.checkAvailability();

      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('edit-section', {
        method: 'OPTIONS'
      });
    });

    it('should return false when service is unavailable', async () => {
      mockInvoke.mockResolvedValue({ error: { message: 'Service unavailable' } });

      const result = await SectionEditService.checkAvailability();

      expect(result).toBe(false);
    });

    it('should return false when request throws', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const result = await SectionEditService.checkAvailability();

      expect(result).toBe(false);
    });
  });

  describe('getEstimatedProcessingTime', () => {
    it('should calculate processing time based on content length', () => {
      expect(SectionEditService.getEstimatedProcessingTime(0)).toBe(5000);
      expect(SectionEditService.getEstimatedProcessingTime(100)).toBe(6000);
      expect(SectionEditService.getEstimatedProcessingTime(500)).toBe(10000);
      expect(SectionEditService.getEstimatedProcessingTime(1000)).toBe(15000);
    });

    it('should cap processing time at 30 seconds', () => {
      expect(SectionEditService.getEstimatedProcessingTime(10000)).toBe(30000);
    });
  });
});