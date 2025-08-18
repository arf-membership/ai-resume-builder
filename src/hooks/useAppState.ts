/**
 * Comprehensive hook for application state management
 * Provides easy access to all store functionality with proper error handling
 */

import { useCallback } from 'react';
import { useCVStore, useStoreActions } from '../store';
import { useNotifications } from '../store/notificationStore';
import { useErrorHandler } from '../utils/errorHandler';
import { useSessionManager } from '../utils/sessionManager';
import type { CVAnalysisResult, CVSection } from '../types/cv';
import type { ResumeRecord } from '../types/database';

export const useAppState = () => {
  // Store state
  const state = useCVStore();
  const actions = useStoreActions();
  
  // Utilities
  const notifications = useNotifications();
  const errorHandler = useErrorHandler();
  const sessionManager = useSessionManager();

  // Upload workflow
  const uploadWorkflow = {
    startUpload: useCallback((file: File) => {
      try {
        actions.clearErrorsByType('upload');
        actions.setIsUploading(true);
        actions.setUploadProgress(0);
        
        notifications.showInfo('Upload Started', `Uploading ${file.name}...`);
      } catch (error) {
        errorHandler.handleUploadError(error as Error, {
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
    }, [actions, notifications, errorHandler]),

    updateProgress: useCallback((progress: number) => {
      actions.setUploadProgress(progress);
    }, [actions]),

    completeUpload: useCallback((resume: ResumeRecord) => {
      actions.setCurrentResume(resume);
      actions.setIsUploading(false);
      actions.setUploadProgress(100);
      
      notifications.showSuccess('Upload Complete', 'Your CV has been uploaded successfully!');
    }, [actions, notifications]),

    failUpload: useCallback((error: Error | string) => {
      actions.setIsUploading(false);
      actions.setUploadProgress(0);
      errorHandler.handleUploadError(error);
    }, [actions, errorHandler]),
  };

  // Analysis workflow
  const analysisWorkflow = {
    startAnalysis: useCallback(() => {
      actions.clearErrorsByType('analysis');
      actions.setIsAnalyzing(true);
      
      notifications.showInfo('Analysis Started', 'AI is analyzing your CV...');
    }, [actions, notifications]),

    completeAnalysis: useCallback((result: CVAnalysisResult) => {
      actions.setAnalysisResult(result);
      actions.setIsAnalyzing(false);
      
      notifications.showSuccess(
        'Analysis Complete',
        `Your CV scored ${result.overall_score}/100!`
      );
    }, [actions, notifications]),

    failAnalysis: useCallback((error: Error | string) => {
      actions.setIsAnalyzing(false);
      errorHandler.handleAnalysisError(error, state.currentResume?.id);
    }, [actions, errorHandler, state.currentResume?.id]),
  };

  // Section editing workflow
  const editingWorkflow = {
    startEdit: useCallback((sectionName: string) => {
      actions.clearErrorsByType('edit');
      actions.setEditingSection(sectionName);
      actions.setIsEditingSection(true);
      
      notifications.showInfo('Editing Started', `Improving ${sectionName} section...`);
    }, [actions, notifications]),

    completeEdit: useCallback((sectionName: string, updatedSection: CVSection) => {
      actions.updateSection(sectionName, updatedSection);
      actions.setIsEditingSection(false);
      actions.setEditingSection(undefined);
      
      const scoreImprovement = updatedSection.score - (
        state.analysisResult?.sections.find(s => s.section_name === sectionName)?.score || 0
      );
      
      if (scoreImprovement > 0) {
        notifications.showSuccess(
          'Section Improved',
          `${sectionName} score improved by ${scoreImprovement} points!`
        );
      } else {
        notifications.showSuccess('Section Updated', `${sectionName} has been updated.`);
      }
    }, [actions, notifications, state.analysisResult]),

    failEdit: useCallback((error: Error | string, sectionName?: string) => {
      actions.setIsEditingSection(false);
      actions.setEditingSection(undefined);
      errorHandler.handleEditError(error, sectionName);
    }, [actions, errorHandler]),
  };

  // Chat workflow
  const chatWorkflow = {
    openChat: useCallback((sectionName: string) => {
      actions.setChatOpen(true);
      actions.setEditingSection(sectionName);
    }, [actions]),

    closeChat: useCallback(() => {
      actions.setChatOpen(false);
      actions.setEditingSection(undefined);
    }, [actions]),
  };

  // PDF generation workflow
  const pdfWorkflow = {
    startGeneration: useCallback(() => {
      actions.clearErrorsByType('download');
      actions.setIsGeneratingPDF(true);
      
      notifications.showInfo('Generating PDF', 'Creating your improved CV...');
    }, [actions, notifications]),

    completeGeneration: useCallback((pdfPath: string) => {
      actions.updateGeneratedPdfPath(pdfPath);
      actions.setIsGeneratingPDF(false);
      
      notifications.showSuccess(
        'PDF Generated',
        'Your improved CV is ready for download!'
      );
    }, [actions, notifications]),

    failGeneration: useCallback((error: Error | string) => {
      actions.setIsGeneratingPDF(false);
      errorHandler.handleDownloadError(error, state.currentResume?.id);
    }, [actions, errorHandler, state.currentResume?.id]),
  };

  // Session management
  const sessionWorkflow = {
    initialize: useCallback(() => {
      sessionManager.initializeSession();
    }, [sessionManager]),

    refresh: useCallback(() => {
      sessionManager.refreshSession();
    }, [sessionManager]),

    clear: useCallback(() => {
      sessionManager.clearSession();
      actions.reset();
    }, [sessionManager, actions]),

    getInfo: useCallback(() => {
      return sessionManager.sessionInfo;
    }, [sessionManager]),
  };

  // Error management
  const errorWorkflow = {
    clearAll: useCallback(() => {
      actions.clearErrors();
    }, [actions]),

    clearByType: useCallback((type: Parameters<typeof actions.clearErrorsByType>[0]) => {
      actions.clearErrorsByType(type);
    }, [actions]),

    retry: useCallback(async <T>(operation: () => Promise<T>, maxRetries = 3) => {
      return errorHandler.retryOperation(operation, maxRetries);
    }, [errorHandler]),
  };

  // Computed state
  const computed = {
    hasResume: !!state.currentResume,
    hasAnalysis: !!state.analysisResult,
    canEdit: !!state.analysisResult && !state.isEditingSection,
    canDownload: !!state.analysisResult && !state.isGeneratingPDF,
    isLoading: state.isUploading || state.isAnalyzing || state.isEditingSection || state.isGeneratingPDF,
    hasErrors: state.errors.length > 0,
    overallScore: state.analysisResult?.overall_score || 0,
    sectionsCount: state.analysisResult?.sections.length || 0,
    sessionValid: sessionManager.sessionInfo.isValid,
  };

  return {
    // State
    ...state,
    computed,
    
    // Workflows
    upload: uploadWorkflow,
    analysis: analysisWorkflow,
    editing: editingWorkflow,
    chat: chatWorkflow,
    pdf: pdfWorkflow,
    session: sessionWorkflow,
    errors: errorWorkflow,
    
    // Utilities
    notifications,
    
    // Direct actions (for advanced usage)
    actions,
  };
};

export default useAppState;