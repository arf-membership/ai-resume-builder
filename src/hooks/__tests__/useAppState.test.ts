/**
 * Tests for the comprehensive useAppState hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAppState } from '../useAppState';
import { useCVStore } from '../../store';
import { useNotifications } from '../../store/notificationStore';
import type { CVAnalysisResult, CVSection } from '../../types/cv';
import type { ResumeRecord } from '../../types/database';

// Mock the dependencies
jest.mock('../../store');
jest.mock('../../store/notificationStore');
jest.mock('../../utils/errorHandler');
jest.mock('../../utils/sessionManager');

describe('useAppState Hook', () => {
  const mockStoreActions = {
    clearErrorsByType: jest.fn(),
    setIsUploading: jest.fn(),
    setUploadProgress: jest.fn(),
    setCurrentResume: jest.fn(),
    setIsAnalyzing: jest.fn(),
    setAnalysisResult: jest.fn(),
    setEditingSection: jest.fn(),
    setIsEditingSection: jest.fn(),
    updateSection: jest.fn(),
    setChatOpen: jest.fn(),
    setIsGeneratingPDF: jest.fn(),
    updateGeneratedPdfPath: jest.fn(),
    clearErrors: jest.fn(),
    reset: jest.fn(),
  };

  const mockNotifications = {
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
  };

  const mockState = {
    sessionId: 'test-session',
    currentResume: undefined,
    analysisResult: undefined,
    uploadProgress: 0,
    isAnalyzing: false,
    editingSection: undefined,
    chatOpen: false,
    errors: [],
    isUploading: false,
    isGeneratingPDF: false,
    isEditingSection: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useCVStore as jest.Mock).mockReturnValue(mockState);
    (useNotifications as jest.Mock).mockReturnValue(mockNotifications);
    
    // Mock useStoreActions
    jest.doMock('../../store', () => ({
      useCVStore: jest.fn(),
      useStoreActions: () => mockStoreActions,
    }));
  });

  describe('Upload Workflow', () => {
    it('should start upload workflow', () => {
      const { result } = renderHook(() => useAppState());
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      act(() => {
        result.current.upload.startUpload(testFile);
      });

      expect(mockStoreActions.clearErrorsByType).toHaveBeenCalledWith('upload');
      expect(mockStoreActions.setIsUploading).toHaveBeenCalledWith(true);
      expect(mockStoreActions.setUploadProgress).toHaveBeenCalledWith(0);
      expect(mockNotifications.showInfo).toHaveBeenCalledWith(
        'Upload Started',
        'Uploading test.pdf...'
      );
    });

    it('should update upload progress', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.upload.updateProgress(50);
      });

      expect(mockStoreActions.setUploadProgress).toHaveBeenCalledWith(50);
    });

    it('should complete upload workflow', () => {
      const { result } = renderHook(() => useAppState());
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
        result.current.upload.completeUpload(mockResume);
      });

      expect(mockStoreActions.setCurrentResume).toHaveBeenCalledWith(mockResume);
      expect(mockStoreActions.setIsUploading).toHaveBeenCalledWith(false);
      expect(mockStoreActions.setUploadProgress).toHaveBeenCalledWith(100);
      expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
        'Upload Complete',
        'Your CV has been uploaded successfully!'
      );
    });
  });

  describe('Analysis Workflow', () => {
    it('should start analysis workflow', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.analysis.startAnalysis();
      });

      expect(mockStoreActions.clearErrorsByType).toHaveBeenCalledWith('analysis');
      expect(mockStoreActions.setIsAnalyzing).toHaveBeenCalledWith(true);
      expect(mockNotifications.showInfo).toHaveBeenCalledWith(
        'Analysis Started',
        'AI is analyzing your CV...'
      );
    });

    it('should complete analysis workflow', () => {
      const { result } = renderHook(() => useAppState());
      const mockAnalysis: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Good CV',
        sections: [],
        ats_compatibility: {
          score: 80,
          feedback: 'ATS friendly',
          suggestions: 'Use more keywords',
        },
      };

      act(() => {
        result.current.analysis.completeAnalysis(mockAnalysis);
      });

      expect(mockStoreActions.setAnalysisResult).toHaveBeenCalledWith(mockAnalysis);
      expect(mockStoreActions.setIsAnalyzing).toHaveBeenCalledWith(false);
      expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
        'Analysis Complete',
        'Your CV scored 85/100!'
      );
    });
  });

  describe('Editing Workflow', () => {
    it('should start edit workflow', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.editing.startEdit('Experience');
      });

      expect(mockStoreActions.clearErrorsByType).toHaveBeenCalledWith('edit');
      expect(mockStoreActions.setEditingSection).toHaveBeenCalledWith('Experience');
      expect(mockStoreActions.setIsEditingSection).toHaveBeenCalledWith(true);
      expect(mockNotifications.showInfo).toHaveBeenCalledWith(
        'Editing Started',
        'Improving Experience section...'
      );
    });

    it('should complete edit workflow with score improvement', () => {
      const mockAnalysisResult: CVAnalysisResult = {
        overall_score: 80,
        summary: 'Good CV',
        sections: [
          {
            section_name: 'Experience',
            score: 70,
            content: 'Old content',
            feedback: 'Old feedback',
            suggestions: 'Old suggestions',
          },
        ],
        ats_compatibility: {
          score: 75,
          feedback: 'ATS feedback',
          suggestions: 'ATS suggestions',
        },
      };

      (useCVStore as jest.Mock).mockReturnValue({
        ...mockState,
        analysisResult: mockAnalysisResult,
      });

      const { result } = renderHook(() => useAppState());
      
      const updatedSection: CVSection = {
        section_name: 'Experience',
        score: 85,
        content: 'Updated content',
        feedback: 'Updated feedback',
        suggestions: 'Updated suggestions',
      };

      act(() => {
        result.current.editing.completeEdit('Experience', updatedSection);
      });

      expect(mockStoreActions.updateSection).toHaveBeenCalledWith('Experience', updatedSection);
      expect(mockStoreActions.setIsEditingSection).toHaveBeenCalledWith(false);
      expect(mockStoreActions.setEditingSection).toHaveBeenCalledWith(undefined);
      expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
        'Section Improved',
        'Experience score improved by 15 points!'
      );
    });
  });

  describe('Chat Workflow', () => {
    it('should open chat', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.chat.openChat('Experience');
      });

      expect(mockStoreActions.setChatOpen).toHaveBeenCalledWith(true);
      expect(mockStoreActions.setEditingSection).toHaveBeenCalledWith('Experience');
    });

    it('should close chat', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.chat.closeChat();
      });

      expect(mockStoreActions.setChatOpen).toHaveBeenCalledWith(false);
      expect(mockStoreActions.setEditingSection).toHaveBeenCalledWith(undefined);
    });
  });

  describe('PDF Workflow', () => {
    it('should start PDF generation', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.pdf.startGeneration();
      });

      expect(mockStoreActions.clearErrorsByType).toHaveBeenCalledWith('download');
      expect(mockStoreActions.setIsGeneratingPDF).toHaveBeenCalledWith(true);
      expect(mockNotifications.showInfo).toHaveBeenCalledWith(
        'Generating PDF',
        'Creating your improved CV...'
      );
    });

    it('should complete PDF generation', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.pdf.completeGeneration('generated.pdf');
      });

      expect(mockStoreActions.updateGeneratedPdfPath).toHaveBeenCalledWith('generated.pdf');
      expect(mockStoreActions.setIsGeneratingPDF).toHaveBeenCalledWith(false);
      expect(mockNotifications.showSuccess).toHaveBeenCalledWith(
        'PDF Generated',
        'Your improved CV is ready for download!'
      );
    });
  });

  describe('Session Workflow', () => {
    it('should provide session management methods', () => {
      const { result } = renderHook(() => useAppState());

      expect(typeof result.current.session.initialize).toBe('function');
      expect(typeof result.current.session.refresh).toBe('function');
      expect(typeof result.current.session.clear).toBe('function');
      expect(typeof result.current.session.getInfo).toBe('function');
    });
  });

  describe('Error Workflow', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.errors.clearAll();
      });

      expect(mockStoreActions.clearErrors).toHaveBeenCalled();
    });

    it('should clear errors by type', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.errors.clearByType('upload');
      });

      expect(mockStoreActions.clearErrorsByType).toHaveBeenCalledWith('upload');
    });
  });

  describe('Computed State', () => {
    it('should compute state correctly when no data exists', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.computed.hasResume).toBe(false);
      expect(result.current.computed.hasAnalysis).toBe(false);
      expect(result.current.computed.canEdit).toBe(false);
      expect(result.current.computed.canDownload).toBe(false);
      expect(result.current.computed.isLoading).toBe(false);
      expect(result.current.computed.hasErrors).toBe(false);
      expect(result.current.computed.overallScore).toBe(0);
      expect(result.current.computed.sectionsCount).toBe(0);
    });

    it('should compute state correctly with data', () => {
      const mockResume: ResumeRecord = {
        id: 'test-id',
        user_session_id: 'test-session',
        original_pdf_path: 'test.pdf',
        generated_pdf_path: null,
        analysis_json: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockAnalysis: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Good CV',
        sections: [
          {
            section_name: 'Experience',
            score: 90,
            content: 'Experience content',
            feedback: 'Good experience',
            suggestions: 'Add more details',
          },
          {
            section_name: 'Education',
            score: 80,
            content: 'Education content',
            feedback: 'Good education',
            suggestions: 'Add certifications',
          },
        ],
        ats_compatibility: {
          score: 85,
          feedback: 'ATS friendly',
          suggestions: 'Use more keywords',
        },
      };

      (useCVStore as jest.Mock).mockReturnValue({
        ...mockState,
        currentResume: mockResume,
        analysisResult: mockAnalysis,
        errors: [{ id: 'error-1', type: 'upload', message: 'Test error', timestamp: new Date() }],
      });

      const { result } = renderHook(() => useAppState());

      expect(result.current.computed.hasResume).toBe(true);
      expect(result.current.computed.hasAnalysis).toBe(true);
      expect(result.current.computed.canEdit).toBe(true);
      expect(result.current.computed.canDownload).toBe(true);
      expect(result.current.computed.hasErrors).toBe(true);
      expect(result.current.computed.overallScore).toBe(85);
      expect(result.current.computed.sectionsCount).toBe(2);
    });

    it('should compute loading state correctly', () => {
      (useCVStore as jest.Mock).mockReturnValue({
        ...mockState,
        isUploading: true,
        isAnalyzing: false,
        isEditingSection: false,
        isGeneratingPDF: false,
      });

      const { result } = renderHook(() => useAppState());

      expect(result.current.computed.isLoading).toBe(true);
    });

    it('should prevent editing when section is being edited', () => {
      const mockAnalysis: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Good CV',
        sections: [],
        ats_compatibility: {
          score: 80,
          feedback: 'ATS friendly',
          suggestions: 'Use more keywords',
        },
      };

      (useCVStore as jest.Mock).mockReturnValue({
        ...mockState,
        analysisResult: mockAnalysis,
        isEditingSection: true,
      });

      const { result } = renderHook(() => useAppState());

      expect(result.current.computed.canEdit).toBe(false);
    });

    it('should prevent download when PDF is being generated', () => {
      const mockAnalysis: CVAnalysisResult = {
        overall_score: 85,
        summary: 'Good CV',
        sections: [],
        ats_compatibility: {
          score: 80,
          feedback: 'ATS friendly',
          suggestions: 'Use more keywords',
        },
      };

      (useCVStore as jest.Mock).mockReturnValue({
        ...mockState,
        analysisResult: mockAnalysis,
        isGeneratingPDF: true,
      });

      const { result } = renderHook(() => useAppState());

      expect(result.current.computed.canDownload).toBe(false);
    });
  });

  describe('State Access', () => {
    it('should provide access to all state properties', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.sessionId).toBe('test-session');
      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.errors).toEqual([]);
    });

    it('should provide access to actions and utilities', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.actions).toBeDefined();
      expect(result.current.notifications).toBeDefined();
    });
  });
});