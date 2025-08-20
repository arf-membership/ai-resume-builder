/**
 * Tests for CacheService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../cacheService';
import type { CVAnalysisResult } from '../../types/cv';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CacheService.clearAllCaches();
  });

  describe('Analysis Result Caching', () => {
    const mockAnalysisResult: CVAnalysisResult = {
      overall_score: 85,
      summary: 'Good CV overall',
      sections: [
        {
          section_name: 'professional_summary',
          score: 80,
          content: 'Professional summary content',
          feedback: 'Good summary',
          suggestions: 'Add more metrics',
        },
      ],
      ats_compatibility: {
        score: 90,
        feedback: 'ATS friendly',
        suggestions: 'No issues found',
      },
    };

    it('should cache and retrieve analysis results', () => {
      const resumeId = 'test-resume-123';
      const pdfContent = 'Sample PDF content for hashing';

      // Cache the result
      CacheService.cacheAnalysisResult(resumeId, mockAnalysisResult, pdfContent);

      // Retrieve the result
      const cached = CacheService.getCachedAnalysisResult(resumeId, pdfContent);

      expect(cached).toEqual(mockAnalysisResult);
    });

    it('should return null for non-existent cache entries', () => {
      const resumeId = 'non-existent-resume';
      const pdfContent = 'Non-existent content';

      const cached = CacheService.getCachedAnalysisResult(resumeId, pdfContent);

      expect(cached).toBeNull();
    });

    it('should return null for different PDF content', () => {
      const resumeId = 'test-resume-123';
      const originalContent = 'Original PDF content';
      const differentContent = 'Different PDF content';

      // Cache with original content
      CacheService.cacheAnalysisResult(resumeId, mockAnalysisResult, originalContent);

      // Try to retrieve with different content
      const cached = CacheService.getCachedAnalysisResult(resumeId, differentContent);

      expect(cached).toBeNull();
    });
  });

  describe('Chat Conversation Caching', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date(),
      },
    ];

    it('should cache and retrieve chat conversations', () => {
      const resumeId = 'test-resume-123';
      const sectionName = 'professional_summary';

      // Cache the conversation
      CacheService.cacheChatConversation(resumeId, sectionName, mockMessages);

      // Retrieve the conversation
      const cached = CacheService.getCachedChatConversation(resumeId, sectionName);

      expect(cached).toEqual(mockMessages);
    });

    it('should return null for non-existent chat conversations', () => {
      const resumeId = 'non-existent-resume';
      const sectionName = 'non-existent-section';

      const cached = CacheService.getCachedChatConversation(resumeId, sectionName);

      expect(cached).toBeNull();
    });
  });

  describe('Section Edit Result Caching', () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 90,
        content: 'Improved content',
        feedback: 'Much better!',
        suggestions: 'Keep it up',
      },
      updatedScore: 90,
      message: 'Section updated successfully',
    };

    it('should cache and retrieve section edit results', () => {
      const resumeId = 'test-resume-123';
      const sectionName = 'professional_summary';
      const originalContent = 'Original content';
      const suggestions = 'Improve this section';

      // Cache the result
      CacheService.cacheSectionEditResult(
        resumeId,
        sectionName,
        originalContent,
        suggestions,
        mockEditResult
      );

      // Retrieve the result
      const cached = CacheService.getCachedSectionEditResult(
        resumeId,
        sectionName,
        originalContent,
        suggestions
      );

      expect(cached).toEqual(mockEditResult);
    });

    it('should return null for different content or suggestions', () => {
      const resumeId = 'test-resume-123';
      const sectionName = 'professional_summary';
      const originalContent = 'Original content';
      const suggestions = 'Improve this section';
      const differentSuggestions = 'Different suggestions';

      // Cache with original suggestions
      CacheService.cacheSectionEditResult(
        resumeId,
        sectionName,
        originalContent,
        suggestions,
        mockEditResult
      );

      // Try to retrieve with different suggestions
      const cached = CacheService.getCachedSectionEditResult(
        resumeId,
        sectionName,
        originalContent,
        differentSuggestions
      );

      expect(cached).toBeNull();
    });
  });

  describe('PDF Generation Caching', () => {
    it('should cache and retrieve PDF generation results', () => {
      const resumeId = 'test-resume-123';
      const pdfUrl = 'https://example.com/generated.pdf';
      const updates = [
        { sectionName: 'summary', content: 'Updated summary' },
      ];

      // Cache the PDF
      CacheService.cachePDFGeneration(resumeId, pdfUrl, updates);

      // Retrieve the PDF
      const cached = CacheService.getCachedPDFGeneration(resumeId, updates);

      expect(cached).toBe(pdfUrl);
    });

    it('should return null for different updates', () => {
      const resumeId = 'test-resume-123';
      const pdfUrl = 'https://example.com/generated.pdf';
      const originalUpdates = [
        { sectionName: 'summary', content: 'Updated summary' },
      ];
      const differentUpdates = [
        { sectionName: 'experience', content: 'Updated experience' },
      ];

      // Cache with original updates
      CacheService.cachePDFGeneration(resumeId, pdfUrl, originalUpdates);

      // Try to retrieve with different updates
      const cached = CacheService.getCachedPDFGeneration(resumeId, differentUpdates);

      expect(cached).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      const resumeId = 'test-resume-123';
      const pdfContent = 'Sample content';
      const mockResult: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Test',
        sections: [],
        ats_compatibility: {
          score: 90,
          feedback: 'Good',
          suggestions: 'None',
        },
      };

      // Add some cached data
      CacheService.cacheAnalysisResult(resumeId, mockResult, pdfContent);

      // Verify it's cached
      expect(CacheService.getCachedAnalysisResult(resumeId, pdfContent)).toEqual(mockResult);

      // Clear all caches
      CacheService.clearAllCaches();

      // Verify it's cleared
      expect(CacheService.getCachedAnalysisResult(resumeId, pdfContent)).toBeNull();
    });

    it('should get cache statistics', () => {
      const stats = CacheService.getCacheStats();

      expect(stats).toHaveProperty('analysis');
      expect(stats).toHaveProperty('chat');
      expect(stats).toHaveProperty('section');
      expect(typeof stats.analysis.memory).toBe('number');
      expect(typeof stats.chat).toBe('number');
      expect(typeof stats.section).toBe('number');
    });
  });
});