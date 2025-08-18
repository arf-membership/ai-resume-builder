/**
 * Zustand store for AI CV Improvement Platform
 * Provides global state management for upload, analysis, and editing workflows
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, ErrorState } from '../types/state';
import type { CVAnalysisResult, CVSection } from '../types/cv';
import type { ResumeRecord } from '../types/database';

// Store interface extending AppState with actions
interface CVStore extends AppState {
  // Session actions
  initializeSession: () => void;
  clearSession: () => void;
  
  // Upload actions
  setUploadProgress: (progress: number) => void;
  setIsUploading: (isUploading: boolean) => void;
  setCurrentResume: (resume: ResumeRecord) => void;
  
  // Analysis actions
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisResult: (result: CVAnalysisResult) => void;
  updateAnalysisResult: (updates: Partial<CVAnalysisResult>) => void;
  
  // Section editing actions
  setEditingSection: (sectionName?: string) => void;
  setIsEditingSection: (isEditing: boolean) => void;
  updateSection: (sectionName: string, updatedSection: CVSection) => void;
  
  // Chat actions
  setChatOpen: (open: boolean) => void;
  
  // PDF generation actions
  setIsGeneratingPDF: (isGenerating: boolean) => void;
  updateGeneratedPdfPath: (path: string) => void;
  
  // Error management actions
  addError: (error: Omit<ErrorState, 'id' | 'timestamp'>) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  clearErrorsByType: (type: ErrorState['type']) => void;
  
  // Utility actions
  reset: () => void;
}

// Generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate unique error ID
const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Initial state
const initialState: AppState = {
  sessionId: '',
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

// Create the store with persistence
export const useCVStore = create<CVStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Session actions
      initializeSession: () => {
        const currentSessionId = get().sessionId;
        if (!currentSessionId) {
          set({ sessionId: generateSessionId() });
        }
      },
      
      clearSession: () => {
        set({
          ...initialState,
          sessionId: generateSessionId(),
        });
      },
      
      // Upload actions
      setUploadProgress: (progress: number) => {
        set({ uploadProgress: Math.max(0, Math.min(100, progress)) });
      },
      
      setIsUploading: (isUploading: boolean) => {
        set({ isUploading });
        if (!isUploading) {
          set({ uploadProgress: 0 });
        }
      },
      
      setCurrentResume: (resume: ResumeRecord) => {
        set({ 
          currentResume: resume,
          analysisResult: resume.analysis_json || undefined,
        });
      },
      
      // Analysis actions
      setIsAnalyzing: (isAnalyzing: boolean) => {
        set({ isAnalyzing });
      },
      
      setAnalysisResult: (result: CVAnalysisResult) => {
        set({ 
          analysisResult: result,
          isAnalyzing: false,
        });
        
        // Update current resume with analysis result
        const currentResume = get().currentResume;
        if (currentResume) {
          set({
            currentResume: {
              ...currentResume,
              analysis_json: result,
            },
          });
        }
      },
      
      updateAnalysisResult: (updates: Partial<CVAnalysisResult>) => {
        const currentResult = get().analysisResult;
        if (currentResult) {
          const updatedResult = { ...currentResult, ...updates };
          set({ analysisResult: updatedResult });
          
          // Update current resume
          const currentResume = get().currentResume;
          if (currentResume) {
            set({
              currentResume: {
                ...currentResume,
                analysis_json: updatedResult,
              },
            });
          }
        }
      },
      
      // Section editing actions
      setEditingSection: (sectionName?: string) => {
        set({ editingSection: sectionName });
      },
      
      setIsEditingSection: (isEditing: boolean) => {
        set({ isEditingSection: isEditing });
        if (!isEditing) {
          set({ editingSection: undefined });
        }
      },
      
      updateSection: (sectionName: string, updatedSection: CVSection) => {
        const analysisResult = get().analysisResult;
        if (analysisResult) {
          const updatedSections = analysisResult.sections.map(section =>
            section.section_name === sectionName ? updatedSection : section
          );
          
          // Recalculate overall score based on section scores
          const totalScore = updatedSections.reduce((sum, section) => sum + section.score, 0);
          const averageScore = Math.round(totalScore / updatedSections.length);
          
          const updatedResult: CVAnalysisResult = {
            ...analysisResult,
            sections: updatedSections,
            overall_score: averageScore,
          };
          
          set({ 
            analysisResult: updatedResult,
            isEditingSection: false,
            editingSection: undefined,
          });
          
          // Update current resume
          const currentResume = get().currentResume;
          if (currentResume) {
            set({
              currentResume: {
                ...currentResume,
                analysis_json: updatedResult,
              },
            });
          }
        }
      },
      
      // Chat actions
      setChatOpen: (open: boolean) => {
        set({ chatOpen: open });
      },
      
      // PDF generation actions
      setIsGeneratingPDF: (isGenerating: boolean) => {
        set({ isGeneratingPDF: isGenerating });
      },
      
      updateGeneratedPdfPath: (path: string) => {
        const currentResume = get().currentResume;
        if (currentResume) {
          set({
            currentResume: {
              ...currentResume,
              generated_pdf_path: path,
            },
            isGeneratingPDF: false,
          });
        }
      },
      
      // Error management actions
      addError: (error: Omit<ErrorState, 'id' | 'timestamp'>) => {
        const newError: ErrorState = {
          ...error,
          id: generateErrorId(),
          timestamp: new Date(),
        };
        
        set(state => ({
          errors: [...state.errors, newError],
        }));
      },
      
      removeError: (errorId: string) => {
        set(state => ({
          errors: state.errors.filter(error => error.id !== errorId),
        }));
      },
      
      clearErrors: () => {
        set({ errors: [] });
      },
      
      clearErrorsByType: (type: ErrorState['type']) => {
        set(state => ({
          errors: state.errors.filter(error => error.type !== type),
        }));
      },
      
      // Utility actions
      reset: () => {
        set({
          ...initialState,
          sessionId: generateSessionId(),
        });
      },
    }),
    {
      name: 'cv-store', // Storage key
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for session persistence
      partialize: (state) => ({
        // Only persist essential data for session continuity
        sessionId: state.sessionId,
        currentResume: state.currentResume,
        analysisResult: state.analysisResult,
      }),
    }
  )
);

// Selector hooks for specific state slices
export const useSessionId = () => useCVStore(state => state.sessionId);
export const useCurrentResume = () => useCVStore(state => state.currentResume);
export const useAnalysisResult = () => useCVStore(state => state.analysisResult);
export const useUploadState = () => useCVStore(state => ({
  uploadProgress: state.uploadProgress,
  isUploading: state.isUploading,
}));
export const useAnalysisState = () => useCVStore(state => ({
  isAnalyzing: state.isAnalyzing,
  analysisResult: state.analysisResult,
}));
export const useEditingState = () => useCVStore(state => ({
  editingSection: state.editingSection,
  isEditingSection: state.isEditingSection,
}));
export const useChatState = () => useCVStore(state => state.chatOpen);
export const usePDFState = () => useCVStore(state => ({
  isGeneratingPDF: state.isGeneratingPDF,
  generatedPdfPath: state.currentResume?.generated_pdf_path,
}));
export const useErrors = () => useCVStore(state => state.errors);

// Action hooks for cleaner component usage
export const useStoreActions = () => {
  const store = useCVStore();
  return {
    // Session actions
    initializeSession: store.initializeSession,
    clearSession: store.clearSession,
    
    // Upload actions
    setUploadProgress: store.setUploadProgress,
    setIsUploading: store.setIsUploading,
    setCurrentResume: store.setCurrentResume,
    
    // Analysis actions
    setIsAnalyzing: store.setIsAnalyzing,
    setAnalysisResult: store.setAnalysisResult,
    updateAnalysisResult: store.updateAnalysisResult,
    
    // Section editing actions
    setEditingSection: store.setEditingSection,
    setIsEditingSection: store.setIsEditingSection,
    updateSection: store.updateSection,
    
    // Chat actions
    setChatOpen: store.setChatOpen,
    
    // PDF generation actions
    setIsGeneratingPDF: store.setIsGeneratingPDF,
    updateGeneratedPdfPath: store.updateGeneratedPdfPath,
    
    // Error management actions
    addError: store.addError,
    removeError: store.removeError,
    clearErrors: store.clearErrors,
    clearErrorsByType: store.clearErrorsByType,
    
    // Utility actions
    reset: store.reset,
  };
};

export default useCVStore;