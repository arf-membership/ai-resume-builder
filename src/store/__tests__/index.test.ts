/**
 * Tests for the main Zustand store
 */

import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useCVStore, useStoreActions } from '../index';
import type { CVAnalysisResult, CVSection } from '../../types/cv';
import type { ResumeRecord } from '../../types/database';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('CV Store', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useCVStore.getState().reset();
    });
    
    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should initialize session with unique ID', () => {
      const { result } = renderHook(() => useCVStore());
      
      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should not reinitialize if session already exists', () => {
      const { result } = renderHook(() => useCVStore());
      
      act(() => {
        result.current.initializeSession();
      });
      
      const firstSessionId = result.current.sessionId;
      
      act(() => {
        result.current.initializeSession();
      });

      expect(result.current.sessionId).toBe(firstSessionId);
    });

    it('should clear session and create new one', () => {
      const { result } = renderHook(() => useCVStore());
      
      act(() => {
        result.current.initializeSession();
      });
      
      const firstSessionId = result.current.sessionId;
      
      act(() => {
        result.current.clearSession();
      });

      expect(result.current.sessionId).not.toBe(firstSessionId);
      expect(result.current.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('Upload State Management', () => {
    it('should manage upload progress', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setUploadProgress(50);
      });

      expect(result.current.uploadProgress).toBe(50);
    });

    it('should clamp upload progress between 0 and 100', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setUploadProgress(-10);
      });
      expect(result.current.uploadProgress).toBe(0);

      act(() => {
        result.current.setUploadProgress(150);
      });
      expect(result.current.uploadProgress).toBe(100);
    });

    it('should manage upload state', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setIsUploading(true);
      });
      expect(result.current.isUploading).toBe(true);

      act(() => {
        result.current.setIsUploading(false);
      });
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBe(0);
    });

    it('should set current resume', () => {
      const { result } = renderHook(() => useCVStore());
      
      const mockResume: ResumeRecord = {
        id: 'test-id',
        user_session_id: 'test-session',
        original_pdf_path: 'test.pdf',
        generated_pdf_path: null,
        analysis_json: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      act(() => {
        result.current.setCurrentResume(mockResume);
      });

      expect(result.current.currentResume).toEqual(mockResume);
    });
  });

  describe('Analysis State Management', () => {
    it('should manage analysis state', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setIsAnalyzing(true);
      });
      expect(result.current.isAnalyzing).toBe(true);

      act(() => {
        result.current.setIsAnalyzing(false);
      });
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should set analysis result', () => {
      const { result } = renderHook(() => useCVStore());
      
      const mockAnalysis: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Good CV',
        sections: [
          {
            section_name: 'Experience',
            score: 90,
            content: 'Work experience content',
            feedback: 'Good experience',
            suggestions: 'Add more details',
          },
        ],
        ats_compatibility: {
          score: 80,
          feedback: 'ATS friendly',
          suggestions: 'Use more keywords',
        },
      };

      act(() => {
        result.current.setAnalysisResult(mockAnalysis);
      });

      expect(result.current.analysisResult).toEqual(mockAnalysis);
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should update analysis result partially', () => {
      const { result } = renderHook(() => useCVStore());
      
      const initialAnalysis: CVAnalysisResult = {
        overall_score: 75,
        summary: 'Initial summary',
        sections: [],
        ats_compatibility: {
          score: 70,
          feedback: 'Initial feedback',
          suggestions: 'Initial suggestions',
        },
      };

      act(() => {
        result.current.setAnalysisResult(initialAnalysis);
      });

      act(() => {
        result.current.updateAnalysisResult({
          overall_score: 85,
          summary: 'Updated summary',
        });
      });

      expect(result.current.analysisResult?.overall_score).toBe(85);
      expect(result.current.analysisResult?.summary).toBe('Updated summary');
      expect(result.current.analysisResult?.ats_compatibility).toEqual(initialAnalysis.ats_compatibility);
    });
  });

  describe('Section Editing', () => {
    it('should manage editing section state', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setEditingSection('Experience');
      });
      expect(result.current.editingSection).toBe('Experience');

      act(() => {
        result.current.setIsEditingSection(true);
      });
      expect(result.current.isEditingSection).toBe(true);

      act(() => {
        result.current.setIsEditingSection(false);
      });
      expect(result.current.isEditingSection).toBe(false);
      expect(result.current.editingSection).toBeUndefined();
    });

    it('should update section and recalculate overall score', () => {
      const { result } = renderHook(() => useCVStore());
      
      const initialAnalysis: CVAnalysisResult = {
        overall_score: 75,
        summary: 'Initial',
        sections: [
          {
            section_name: 'Experience',
            score: 70,
            content: 'Old content',
            feedback: 'Old feedback',
            suggestions: 'Old suggestions',
          },
          {
            section_name: 'Education',
            score: 80,
            content: 'Education content',
            feedback: 'Education feedback',
            suggestions: 'Education suggestions',
          },
        ],
        ats_compatibility: {
          score: 75,
          feedback: 'ATS feedback',
          suggestions: 'ATS suggestions',
        },
      };

      act(() => {
        result.current.setAnalysisResult(initialAnalysis);
      });

      const updatedSection: CVSection = {
        section_name: 'Experience',
        score: 90,
        content: 'Updated content',
        feedback: 'Updated feedback',
        suggestions: 'Updated suggestions',
      };

      act(() => {
        result.current.updateSection('Experience', updatedSection);
      });

      expect(result.current.analysisResult?.sections[0]).toEqual(updatedSection);
      expect(result.current.analysisResult?.overall_score).toBe(85); // (90 + 80) / 2
      expect(result.current.isEditingSection).toBe(false);
      expect(result.current.editingSection).toBeUndefined();
    });
  });

  describe('Error Management', () => {
    it('should add errors with unique IDs and timestamps', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.addError({
          type: 'upload',
          message: 'Upload failed',
        });
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toMatchObject({
        type: 'upload',
        message: 'Upload failed',
      });
      expect(result.current.errors[0].id).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(result.current.errors[0].timestamp).toBeInstanceOf(Date);
    });

    it('should remove specific errors', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.addError({
          type: 'upload',
          message: 'Upload failed',
        });
        result.current.addError({
          type: 'analysis',
          message: 'Analysis failed',
        });
      });

      const errorId = result.current.errors[0].id;

      act(() => {
        result.current.removeError(errorId);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].type).toBe('analysis');
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.addError({ type: 'upload', message: 'Error 1' });
        result.current.addError({ type: 'analysis', message: 'Error 2' });
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
    });

    it('should clear errors by type', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.addError({ type: 'upload', message: 'Upload error 1' });
        result.current.addError({ type: 'upload', message: 'Upload error 2' });
        result.current.addError({ type: 'analysis', message: 'Analysis error' });
      });

      act(() => {
        result.current.clearErrorsByType('upload');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0].type).toBe('analysis');
    });
  });

  describe('PDF Generation', () => {
    it('should manage PDF generation state', () => {
      const { result } = renderHook(() => useCVStore());

      act(() => {
        result.current.setIsGeneratingPDF(true);
      });
      expect(result.current.isGeneratingPDF).toBe(true);

      act(() => {
        result.current.setIsGeneratingPDF(false);
      });
      expect(result.current.isGeneratingPDF).toBe(false);
    });

    it('should update generated PDF path', () => {
      const { result } = renderHook(() => useCVStore());
      
      const mockResume: ResumeRecord = {
        id: 'test-id',
        user_session_id: 'test-session',
        original_pdf_path: 'original.pdf',
        generated_pdf_path: null,
        analysis_json: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      act(() => {
        result.current.setCurrentResume(mockResume);
      });

      act(() => {
        result.current.updateGeneratedPdfPath('generated.pdf');
      });

      expect(result.current.currentResume?.generated_pdf_path).toBe('generated.pdf');
      expect(result.current.isGeneratingPDF).toBe(false);
    });
  });

  describe('Store Actions Hook', () => {
    it('should provide all actions through useStoreActions', () => {
      const { result } = renderHook(() => useStoreActions());

      expect(result.current).toHaveProperty('initializeSession');
      expect(result.current).toHaveProperty('setUploadProgress');
      expect(result.current).toHaveProperty('setAnalysisResult');
      expect(result.current).toHaveProperty('updateSection');
      expect(result.current).toHaveProperty('addError');
      expect(result.current).toHaveProperty('reset');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state with new session', () => {
      const { result } = renderHook(() => useCVStore());

      // Set some state
      act(() => {
        result.current.setUploadProgress(50);
        result.current.setIsAnalyzing(true);
        result.current.addError({ type: 'upload', message: 'Test error' });
      });

      const initialSessionId = result.current.sessionId;

      act(() => {
        result.current.reset();
      });

      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.errors).toHaveLength(0);
      expect(result.current.sessionId).not.toBe(initialSessionId);
      expect(result.current.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });
});