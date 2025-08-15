/**
 * Hook for managing section editing functionality
 * Provides state management and actions for AI-powered section improvements
 */

import { useState, useCallback } from 'react';
import type { CVSection, CVAnalysisResult } from '../types/cv';
import { SectionEditService } from '../services/sectionEditService';
import { SessionStorageService } from '../services/sessionStorage';

export interface SectionEditState {
  editingSections: Set<string>;
  sectionUpdates: Map<string, CVSection>;
  analysisData: CVAnalysisResult;
  error: string | null;
}

export interface SectionEditActions {
  editSection: (sectionName: string) => Promise<void>;
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

  const editSection = useCallback(async (sectionName: string) => {
    try {
      setError(null);

      // Get session ID
      const sessionData = SessionStorageService.getSessionData();
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

  const resetUpdates = useCallback(() => {
    setSectionUpdates(new Map());
  }, []);

  return {
    // State
    editingSections,
    sectionUpdates,
    analysisData,
    error,
    // Actions
    editSection,
    clearError,
    resetUpdates
  };
}