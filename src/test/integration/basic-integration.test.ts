/**
 * Basic Integration Test
 * Tests core application functionality without complex UI interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateEnvironment } from '../../config/production';
import { useCVStore } from '../../store';
import { useNotificationStore } from '../../store/notificationStore';

// Mock external dependencies
vi.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } })
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
      })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null })
    }
  }
}));

describe('Basic Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Environment Configuration', () => {
    it('should validate environment variables', () => {
      const validation = validateEnvironment();
      
      // In test environment, we expect validation to pass or have specific errors
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('State Management Integration', () => {
    it('should initialize CV store correctly', () => {
      const store = useCVStore.getState();
      
      expect(store).toHaveProperty('sessionId');
      expect(store).toHaveProperty('currentResume');
      expect(store).toHaveProperty('analysisResult');
      expect(store).toHaveProperty('uploadProgress');
      expect(store).toHaveProperty('isAnalyzing');
      expect(store).toHaveProperty('errors');
    });

    it('should initialize notification store correctly', () => {
      const store = useNotificationStore.getState();
      
      expect(store).toHaveProperty('notifications');
      expect(store).toHaveProperty('addNotification');
      expect(store).toHaveProperty('removeNotification');
      expect(store).toHaveProperty('clearNotifications');
      
      expect(Array.isArray(store.notifications)).toBe(true);
      expect(typeof store.addNotification).toBe('function');
      expect(typeof store.removeNotification).toBe('function');
      expect(typeof store.clearNotifications).toBe('function');
    });

    it('should handle session initialization', () => {
      const { initializeSession } = useCVStore.getState();
      
      expect(typeof initializeSession).toBe('function');
      
      // Initialize session
      initializeSession();
      
      const state = useCVStore.getState();
      expect(state.sessionId).toBeTruthy();
      expect(typeof state.sessionId).toBe('string');
    });

    it('should handle upload progress updates', () => {
      const { setUploadProgress } = useCVStore.getState();
      
      setUploadProgress(50);
      
      const state = useCVStore.getState();
      expect(state.uploadProgress).toBe(50);
    });

    it('should handle analysis state updates', () => {
      const { setIsAnalyzing, setAnalysisResult } = useCVStore.getState();
      
      setIsAnalyzing(true);
      expect(useCVStore.getState().isAnalyzing).toBe(true);
      
      const mockAnalysis = {
        overall_score: 85,
        summary: 'Test analysis',
        sections: [
          {
            section_name: 'test_section',
            score: 85,
            content: 'Test content',
            feedback: 'Test feedback',
            suggestions: 'Test suggestions'
          }
        ],
        ats_compatibility: {
          score: 80,
          feedback: 'Good ATS compatibility',
          suggestions: 'Minor improvements needed'
        }
      };
      
      setAnalysisResult(mockAnalysis);
      
      const state = useCVStore.getState();
      expect(state.analysisResult).toEqual(mockAnalysis);
      expect(state.isAnalyzing).toBe(false);
    });

    it('should handle notifications', () => {
      const { addNotification, removeNotification, clearNotifications } = useNotificationStore.getState();
      
      // Add notification
      addNotification({
        type: 'success',
        title: 'Test Success',
        message: 'Test message'
      });
      
      let state = useNotificationStore.getState();
      expect(state.notifications.length).toBe(1);
      expect(state.notifications[0].title).toBe('Test Success');
      
      // Remove notification
      const notificationId = state.notifications[0].id;
      removeNotification(notificationId);
      
      state = useNotificationStore.getState();
      expect(state.notifications.length).toBe(0);
      
      // Add multiple and clear all
      addNotification({ type: 'info', title: 'Info 1' });
      addNotification({ type: 'warning', title: 'Warning 1' });
      
      state = useNotificationStore.getState();
      expect(state.notifications.length).toBe(2);
      
      clearNotifications();
      
      state = useNotificationStore.getState();
      expect(state.notifications.length).toBe(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle store errors correctly', () => {
      const { addError, removeError, clearErrors } = useCVStore.getState();
      
      // Add error
      addError({
        type: 'upload',
        message: 'Test upload error'
      });
      
      let state = useCVStore.getState();
      expect(state.errors.length).toBe(1);
      expect(state.errors[0].message).toBe('Test upload error');
      
      // Remove error
      const errorId = state.errors[0].id;
      removeError(errorId);
      
      state = useCVStore.getState();
      expect(state.errors.length).toBe(0);
      
      // Add multiple errors and clear
      addError({ type: 'analysis', message: 'Analysis error' });
      addError({ type: 'download', message: 'Download error' });
      
      state = useCVStore.getState();
      expect(state.errors.length).toBe(2);
      
      clearErrors();
      
      state = useCVStore.getState();
      expect(state.errors.length).toBe(0);
    });
  });

  describe('Data Flow Integration', () => {
    it('should handle complete data flow simulation', () => {
      const store = useCVStore.getState();
      
      // 1. Initialize session
      store.initializeSession();
      expect(store.sessionId || useCVStore.getState().sessionId).toBeTruthy();
      
      // 2. Simulate file upload
      store.setUploadProgress(25);
      store.setUploadProgress(50);
      store.setUploadProgress(100);
      
      const mockResume = {
        id: 'test-resume-id',
        user_session_id: 'test-session',
        original_pdf_path: 'originals/test.pdf',
        generated_pdf_path: null,
        analysis_json: null,
        created_at: new Date().toISOString()
      };
      
      store.setCurrentResume(mockResume);
      
      // 3. Simulate analysis
      store.setIsAnalyzing(true);
      
      const mockAnalysis = {
        overall_score: 78,
        summary: 'Your CV shows good experience but needs improvement in presentation',
        sections: [
          {
            section_name: 'professional_summary',
            score: 75,
            content: 'Experienced developer with 5 years in web development',
            feedback: 'Good experience mentioned but lacks specific achievements',
            suggestions: 'Add quantifiable achievements and specific technologies'
          },
          {
            section_name: 'work_experience',
            score: 85,
            content: 'Senior Developer at Tech Corp (2019-2024)',
            feedback: 'Good job titles and companies',
            suggestions: 'Add specific projects and impact metrics'
          }
        ],
        ats_compatibility: {
          score: 80,
          feedback: 'Good keyword usage and formatting',
          suggestions: 'Add more industry-specific keywords'
        }
      };
      
      store.setAnalysisResult(mockAnalysis);
      
      // 4. Verify state
      const finalState = useCVStore.getState();
      expect(finalState.currentResume?.id).toBe(mockResume.id);
      expect(finalState.currentResume?.analysis_json).toEqual(mockAnalysis);
      expect(finalState.analysisResult).toEqual(mockAnalysis);
      expect(finalState.isAnalyzing).toBe(false);
      expect(finalState.uploadProgress).toBe(100);
    });
  });
});