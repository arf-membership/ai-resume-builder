/**
 * Hook for managing section editing functionality
 * Provides state management and actions for AI-powered section improvements
 */

import { useState, useCallback } from 'react';
import type { CVSection, CVAnalysisResult, ChatMessage } from '../types';
import { SectionEditService } from '../services/sectionEditService';
import { SessionStorageService } from '../services/sessionStorage';

export interface SectionEditState {
  editingSections: Set<string>;
  sectionUpdates: Map<string, CVSection>;
  analysisData: CVAnalysisResult;
  error: string | null;
  chatOpen: boolean;
  currentChatSection: string | null;
  chatMessages: ChatMessage[];
}

export interface SectionEditActions {
  editSection: (sectionName: string) => Promise<void>;
  editSectionWithChat: (sectionName: string) => void;
  closeChatInterface: () => void;
  completeChatEdit: (updatedContent: string) => Promise<void>;
  clearError: () => void;
  resetUpdates: () => void;
}

export interface UseSectionEditOptions {
  resumeId: string;
  initialAnalysisData: CVAnalysisResult;
  onSectionEdit?: (sectionName: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for section editing functionality
 */
export function useSectionEdit({
  resumeId,
  initialAnalysisData,
  onSectionEdit,
  onError
}: UseSectionEditOptions): SectionEditState & SectionEditActions {
  const [analysisData, setAnalysisData] = useState<CVAnalysisResult>(initialAnalysisData);
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [sectionUpdates, setSectionUpdates] = useState<Map<string, CVSection>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [currentChatSection, setCurrentChatSection] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const editSection = useCallback(async (sectionName: string) => {
    try {
      setError(null);

      // Get session ID
      const sessionData = SessionStorageService.getCurrentSession();
      if (!sessionData?.sessionId) {
        throw new Error('Session not found. Please refresh the page.');
      }

      // Find the section to edit
      const section = analysisData.sections.find(s => s.section_name === sectionName);
      if (!section) {
        throw new Error(`Section "${sectionName}" not found`);
      }

      // Set editing state
      setEditingSections(prev => new Set(prev).add(sectionName));

      // Call the section editing service
      const result = await SectionEditService.editSection(
        resumeId,
        sectionName,
        section.content,
        section.suggestions,
        sessionData.sessionId,
        undefined, // No additional context for now
        {
          onProgress: (status) => {
            console.log(`Section editing progress: ${status}`);
          }
        }
      );

      // Update the analysis data with the new section
      setAnalysisData(prevData => {
        const newSections = prevData.sections.map(s => 
          s.section_name === sectionName ? result.updatedSection : s
        );
        
        // Recalculate overall score
        const totalScore = newSections.reduce((sum, s) => sum + s.score, 0);
        const newOverallScore = Math.round(totalScore / newSections.length);

        return {
          ...prevData,
          sections: newSections,
          overall_score: newOverallScore
        };
      });

      // Track the section update for canvas updates
      setSectionUpdates(prev => new Map(prev).set(sectionName, result.updatedSection));

      // Call the parent callback
      onSectionEdit?.(sectionName);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Section editing failed';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Section editing failed:', error);
    } finally {
      // Remove from editing state
      setEditingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionName);
        return newSet;
      });
    }
  }, [analysisData.sections, resumeId, onSectionEdit, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const editSectionWithChat = useCallback((sectionName: string) => {
    setCurrentChatSection(sectionName);
    setChatMessages([]);
    setChatOpen(true);
    setError(null);
  }, []);

  const closeChatInterface = useCallback(() => {
    setChatOpen(false);
    setCurrentChatSection(null);
    setChatMessages([]);
  }, []);

  const completeChatEdit = useCallback(async (updatedContent: string) => {
    if (!currentChatSection) return;

    try {
      setError(null);

      // Find the current section
      const section = analysisData.sections.find(s => s.section_name === currentChatSection);
      if (!section) {
        throw new Error(`Section "${currentChatSection}" not found`);
      }

      // Create updated section with new content
      const updatedSection: CVSection = {
        ...section,
        content: updatedContent,
        // Assume improved score - in a real implementation, you might want to re-score
        score: Math.min(section.score + 10, 100)
      };

      // Update the analysis data
      setAnalysisData(prevData => {
        const newSections = prevData.sections.map(s => 
          s.section_name === currentChatSection ? updatedSection : s
        );
        
        // Recalculate overall score
        const totalScore = newSections.reduce((sum, s) => sum + s.score, 0);
        const newOverallScore = Math.round(totalScore / newSections.length);

        return {
          ...prevData,
          sections: newSections,
          overall_score: newOverallScore
        };
      });

      // Track the section update for canvas updates
      setSectionUpdates(prev => new Map(prev).set(currentChatSection, updatedSection));

      // Call the parent callback
      onSectionEdit?.(currentChatSection);

      // Close chat interface
      closeChatInterface();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Chat-based editing failed';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Chat-based section editing failed:', error);
    }
  }, [currentChatSection, analysisData.sections, onSectionEdit, onError, closeChatInterface]);

  const resetUpdates = useCallback(() => {
    setSectionUpdates(new Map());
  }, []);

  return {
    // State
    editingSections,
    sectionUpdates,
    analysisData,
    error,
    chatOpen,
    currentChatSection,
    chatMessages,
    // Actions
    editSection,
    editSectionWithChat,
    closeChatInterface,
    completeChatEdit,
    clearError,
    resetUpdates
  };
}