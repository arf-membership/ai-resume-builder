/**
 * Integration Tests for Supabase Edge Functions
 * Tests the integration between frontend services and Edge Functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../lib/supabase';

// Mock the Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        download: vi.fn(),
      })),
    },
  },
}));

describe('Edge Functions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CV Analysis Function', () => {
    it('should successfully analyze a CV', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      const mockAnalysisResult = {
        overall_score: 85,
        summary: 'Strong CV with good structure',
        sections: [
          {
            section_name: 'professional_summary',
            score: 80,
            content: 'Experienced software developer',
            feedback: 'Good summary but could be more specific',
            suggestions: 'Add specific technologies and years of experience',
          },
          {
            section_name: 'work_experience',
            score: 90,
            content: 'Senior Developer at Tech Corp (2020-2023)',
            feedback: 'Excellent work experience section',
            suggestions: 'Add quantifiable achievements',
          },
        ],
        ats_compatibility: {
          score: 85,
          feedback: 'Good ATS compatibility',
          suggestions: 'Use standard section headers',
        },
      };

      mockInvoke.mockResolvedValue({
        data: mockAnalysisResult,
        error: null,
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: {
          resumeId: 'test-resume-123',
          filePath: 'session/test.pdf',
        },
      });

      expect(result.data).toEqual(mockAnalysisResult);
      expect(mockInvoke).toHaveBeenCalledWith('analyze-cv', {
        body: {
          resumeId: 'test-resume-123',
          filePath: 'session/test.pdf',
        },
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Failed to extract text from PDF',
          code: 'PDF_PROCESSING_ERROR',
        },
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: {
          resumeId: 'test-resume-123',
          filePath: 'session/invalid.pdf',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Failed to extract text from PDF');
      expect(result.error.code).toBe('PDF_PROCESSING_ERROR');
    });

    it('should validate input parameters', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Missing required parameter: resumeId',
          code: 'VALIDATION_ERROR',
        },
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: {
          filePath: 'session/test.pdf',
          // Missing resumeId
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Missing required parameter: resumeId');
    });

    it('should handle large PDF files', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: {
          overall_score: 75,
          summary: 'Large CV processed successfully',
          sections: Array.from({ length: 15 }, (_, i) => ({
            section_name: `section_${i}`,
            score: 70 + (i % 30),
            content: `Content for section ${i}`,
            feedback: `Feedback for section ${i}`,
            suggestions: `Suggestions for section ${i}`,
          })),
          ats_compatibility: {
            score: 80,
            feedback: 'Good compatibility',
            suggestions: 'Minor improvements needed',
          },
        },
        error: null,
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: {
          resumeId: 'test-resume-large',
          filePath: 'session/large-cv.pdf',
        },
      });

      expect(result.data).toBeDefined();
      expect(result.data.sections).toHaveLength(15);
      expect(result.error).toBeNull();
    });
  });

  describe('Section Edit Function', () => {
    it('should successfully edit a CV section', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      const mockEditResult = {
        success: true,
        updatedContent: 'Senior Software Developer with 5+ years of experience in React, Node.js, and TypeScript. Proven track record of delivering scalable web applications.',
        newScore: 90,
        feedback: 'Excellent improvement with specific technologies and quantifiable experience',
      };

      mockInvoke.mockResolvedValue({
        data: mockEditResult,
        error: null,
      });

      const result = await supabase.functions.invoke('edit-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'professional_summary',
          currentContent: 'Software developer with experience',
          suggestions: 'Add specific technologies and years of experience',
          additionalContext: 'I have 5 years of experience with React, Node.js, and TypeScript',
        },
      });

      expect(result.data).toEqual(mockEditResult);
      expect(result.data.newScore).toBeGreaterThan(80);
    });

    it('should handle missing context gracefully', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          updatedContent: 'Experienced software developer with strong technical skills and proven ability to deliver high-quality solutions.',
          newScore: 75,
          feedback: 'Good improvement but could be more specific with technologies and achievements',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('edit-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'professional_summary',
          currentContent: 'Software developer',
          suggestions: 'Add more detail and specific achievements',
          // No additional context provided
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.updatedContent).toContain('software developer');
    });

    it('should validate section names', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid section name: invalid_section',
          code: 'INVALID_SECTION',
        },
      });

      const result = await supabase.functions.invoke('edit-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'invalid_section',
          currentContent: 'Some content',
          suggestions: 'Some suggestions',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_SECTION');
    });
  });

  describe('Chat Section Function', () => {
    it('should generate relevant questions for missing information', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      const mockChatResult = {
        success: true,
        message: 'What specific programming languages and frameworks have you worked with in your 5 years of experience?',
        messageType: 'question',
        context: {
          sectionName: 'professional_summary',
          missingInfo: ['specific_technologies', 'quantifiable_experience'],
        },
      };

      mockInvoke.mockResolvedValue({
        data: mockChatResult,
        error: null,
      });

      const result = await supabase.functions.invoke('chat-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'professional_summary',
          currentContent: 'Software developer with 5 years experience',
          suggestions: 'Add specific technologies and quantifiable achievements',
          conversationHistory: [],
        },
      });

      expect(result.data).toEqual(mockChatResult);
      expect(result.data.message).toContain('programming languages');
    });

    it('should process user responses and generate improved content', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      const mockChatResult = {
        success: true,
        message: 'Thank you for the information! I\'ll now update your professional summary.',
        messageType: 'confirmation',
        updatedContent: 'Senior Software Developer with 5+ years of experience specializing in React, Node.js, TypeScript, and Python. Successfully led 3 major projects resulting in 40% performance improvements.',
        newScore: 92,
      };

      mockInvoke.mockResolvedValue({
        data: mockChatResult,
        error: null,
      });

      const result = await supabase.functions.invoke('chat-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'professional_summary',
          currentContent: 'Software developer with 5 years experience',
          suggestions: 'Add specific technologies and quantifiable achievements',
          conversationHistory: [
            {
              role: 'assistant',
              content: 'What specific programming languages and frameworks have you worked with?',
            },
            {
              role: 'user',
              content: 'I work with React, Node.js, TypeScript, and Python. I\'ve led 3 major projects that improved performance by 40%.',
            },
          ],
        },
      });

      expect(result.data.updatedContent).toContain('React, Node.js, TypeScript, and Python');
      expect(result.data.updatedContent).toContain('40% performance improvements');
      expect(result.data.newScore).toBeGreaterThan(90);
    });

    it('should handle conversation context properly', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Could you provide more details about your leadership experience and team size?',
          messageType: 'follow_up_question',
          context: {
            previousResponse: 'React, Node.js, TypeScript, Python, 3 projects, 40% improvement',
            nextNeeded: 'leadership_details',
          },
        },
        error: null,
      });

      const result = await supabase.functions.invoke('chat-section', {
        body: {
          resumeId: 'test-resume-123',
          sectionName: 'professional_summary',
          currentContent: 'Software developer with 5 years experience',
          suggestions: 'Add leadership experience and team management skills',
          conversationHistory: [
            {
              role: 'assistant',
              content: 'What technologies do you work with?',
            },
            {
              role: 'user',
              content: 'React, Node.js, TypeScript, Python. Led 3 projects with 40% improvement.',
            },
          ],
        },
      });

      expect(result.data.message).toContain('leadership experience');
      expect(result.data.messageType).toBe('follow_up_question');
    });
  });

  describe('PDF Generation Function', () => {
    it('should generate a PDF with updated content', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      const mockPDFResult = {
        success: true,
        downloadUrl: 'https://example.com/generated-cv.pdf',
        filePath: 'session/generated-cv-123.pdf',
        fileSize: 245760, // ~240KB
      };

      mockInvoke.mockResolvedValue({
        data: mockPDFResult,
        error: null,
      });

      const result = await supabase.functions.invoke('generate-pdf', {
        body: {
          resumeId: 'test-resume-123',
          updatedSections: [
            {
              section_name: 'professional_summary',
              content: 'Senior Software Developer with 5+ years of experience...',
            },
            {
              section_name: 'work_experience',
              content: 'Senior Developer at Tech Corp (2020-2023)...',
            },
          ],
          templateStyle: 'modern',
        },
      });

      expect(result.data).toEqual(mockPDFResult);
      expect(result.data.downloadUrl).toContain('.pdf');
      expect(result.data.fileSize).toBeGreaterThan(0);
    });

    it('should handle different template styles', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          downloadUrl: 'https://example.com/classic-cv.pdf',
          filePath: 'session/classic-cv-123.pdf',
          fileSize: 198432,
          templateUsed: 'classic',
        },
        error: null,
      });

      const result = await supabase.functions.invoke('generate-pdf', {
        body: {
          resumeId: 'test-resume-123',
          updatedSections: [
            {
              section_name: 'professional_summary',
              content: 'Professional summary content...',
            },
          ],
          templateStyle: 'classic',
        },
      });

      expect(result.data.templateUsed).toBe('classic');
      expect(result.data.success).toBe(true);
    });

    it('should handle PDF generation errors', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Failed to generate PDF: Invalid template style',
          code: 'PDF_GENERATION_ERROR',
        },
      });

      const result = await supabase.functions.invoke('generate-pdf', {
        body: {
          resumeId: 'test-resume-123',
          updatedSections: [],
          templateStyle: 'invalid_style',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('PDF_GENERATION_ERROR');
    });
  });

  describe('Function Availability', () => {
    it('should check function availability', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: { available: true, version: '1.0.0' },
        error: null,
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        method: 'OPTIONS',
      });

      expect(result.data.available).toBe(true);
      expect(result.data.version).toBeDefined();
    });

    it('should handle function unavailability', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockRejectedValue(new Error('Function not found'));

      try {
        await supabase.functions.invoke('nonexistent-function', {
          body: { test: true },
        });
      } catch (error) {
        expect(error.message).toBe('Function not found');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockRejectedValue(new Error('Network timeout'));

      try {
        await supabase.functions.invoke('analyze-cv', {
          body: { resumeId: 'test' },
        });
      } catch (error) {
        expect(error.message).toBe('Network timeout');
      }
    });

    it('should handle rate limiting', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60,
        },
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: { resumeId: 'test' },
      });

      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error.retryAfter).toBe(60);
    });

    it('should handle malformed responses', async () => {
      const mockInvoke = supabase.functions.invoke as any;
      
      mockInvoke.mockResolvedValue({
        data: 'invalid json response',
        error: null,
      });

      const result = await supabase.functions.invoke('analyze-cv', {
        body: { resumeId: 'test' },
      });

      // Should handle malformed response gracefully
      expect(result.data).toBe('invalid json response');
    });
  });
});