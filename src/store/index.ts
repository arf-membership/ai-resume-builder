/**
 * Zustand store for AI CV Improvement Platform
 * Provides global state management for upload, analysis, and editing workflows
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
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
  updateSectionContent: (sectionName: string, content: string) => void;
  
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
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Generate unique error ID
const generateErrorId = (): string => {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

// Create the store without persistence to avoid conflicts with SessionContext
export const useCVStore = create<CVStore>()((set, get) => ({
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

      updateSectionContent: (sectionName: string, content: string) => {
        console.log(`🔄 Store: Updating section "${sectionName}" with content:`, content.substring(0, 100) + '...');
        
        const analysisResult = get().analysisResult;
        if (!analysisResult) {
          console.warn('❌ Store: No analysis result found');
          return;
        }

        // Handle special cases like contact_info that should update cv_header
        if (sectionName.toLowerCase() === 'contact_info' || sectionName.toLowerCase() === 'contact information') {
          console.log('🔄 Store: Updating contact info in cv_header');
          
          if ('cv_header' in analysisResult) {
            // Parse the contact content to extract individual fields
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            const updatedHeader = { ...(analysisResult as any).cv_header };
            
            lines.forEach(line => {
              if (line.toLowerCase().includes('email:') || line.includes('@')) {
                const email = line.replace(/email:\s*/i, '').trim();
                updatedHeader.email = email;
              } else if (line.toLowerCase().includes('phone:') || line.match(/\+?\d[\d\s-()]+/)) {
                const phone = line.replace(/phone:\s*/i, '').trim();
                updatedHeader.phone = phone;
              } else if (line.toLowerCase().includes('linkedin:') || line.includes('linkedin.com')) {
                const linkedin = line.replace(/linkedin:\s*/i, '').trim();
                updatedHeader.linkedin = linkedin;
              } else if (line.toLowerCase().includes('github:') || line.includes('github.com')) {
                const github = line.replace(/github:\s*/i, '').trim();
                updatedHeader.github = github;
              } else if (line.toLowerCase().includes('location:') || line.toLowerCase().includes('address:')) {
                const location = line.replace(/(location|address):\s*/i, '').trim();
                updatedHeader.location = location;
              }
            });
            
            set({
              analysisResult: {
                ...analysisResult,
                cv_header: updatedHeader
              } as any
            });
            
            console.log('✅ Store: Contact info updated in header');
            return;
          }
        }

        // Handle comprehensive schema (original_cv_sections)
        if ('original_cv_sections' in analysisResult) {
          console.log('🔄 Store: Using comprehensive schema (original_cv_sections)');
          
          // Try exact match first
          let updatedSections = (analysisResult as any).original_cv_sections.map((section: any) =>
            section.section_name === sectionName 
              ? { ...section, content }
              : section
          );
          
          // If no exact match, try fuzzy matching for common variations
          const foundExactMatch = updatedSections.some((section: any) => section.content === content);
          
          if (!foundExactMatch) {
            console.log('🔄 Store: Trying fuzzy section name matching');
            const normalizedTarget = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            updatedSections = (analysisResult as any).original_cv_sections.map((section: any) => {
              const normalizedSection = section.section_name.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              // Check for partial matches
              if (normalizedSection.includes(normalizedTarget) || normalizedTarget.includes(normalizedSection)) {
                console.log(`🔄 Store: Fuzzy match: "${sectionName}" -> "${section.section_name}"`);
                return { ...section, content };
              }
              
              return section;
            });
          }
          
          console.log('🔄 Store: Updated sections:', updatedSections.map((s: any) => s.section_name));
          
          set({
            analysisResult: {
              ...analysisResult,
              original_cv_sections: updatedSections
            } as any
          });
          
          console.log('✅ Store: Section updated successfully');
        }
        // Handle legacy schema (sections)
        else if ('sections' in analysisResult) {
          console.log('🔄 Store: Using legacy schema (sections)');
          const updatedSections = analysisResult.sections.map(section =>
            section.section_name === sectionName 
              ? { ...section, content }
              : section
          );
          
          set({
            analysisResult: {
              ...analysisResult,
              sections: updatedSections
            }
          });
          
          console.log('✅ Store: Legacy section updated successfully');
        } else {
          console.warn('❌ Store: No valid schema found in analysis result');
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
    }));

// Memoized selectors to prevent infinite loops
const sessionIdSelector = (state: CVStore) => state.sessionId;
const currentResumeSelector = (state: CVStore) => state.currentResume;
const analysisResultSelector = (state: CVStore) => state.analysisResult;
const chatOpenSelector = (state: CVStore) => state.chatOpen;
const errorsSelector = (state: CVStore) => state.errors;

// Selector hooks for specific state slices
export const useSessionId = () => useCVStore(sessionIdSelector);
export const useCurrentResume = () => useCVStore(currentResumeSelector);
export const useAnalysisResult = () => useCVStore(analysisResultSelector);

const uploadStateSelector = (state: CVStore) => ({
  uploadProgress: state.uploadProgress,
  isUploading: state.isUploading,
});

const analysisStateSelector = (state: CVStore) => ({
  isAnalyzing: state.isAnalyzing,
  analysisResult: state.analysisResult,
});

const editingStateSelector = (state: CVStore) => ({
  editingSection: state.editingSection,
  isEditingSection: state.isEditingSection,
});

const pdfStateSelector = (state: CVStore) => ({
  isGeneratingPDF: state.isGeneratingPDF,
  generatedPdfPath: state.currentResume?.generated_pdf_path,
});

export const useUploadState = () => useCVStore(useShallow(uploadStateSelector));
export const useAnalysisState = () => useCVStore(useShallow(analysisStateSelector));
export const useEditingState = () => useCVStore(useShallow(editingStateSelector));
export const useChatState = () => useCVStore(chatOpenSelector);
export const usePDFState = () => useCVStore(useShallow(pdfStateSelector));
export const useErrors = () => useCVStore(errorsSelector);

// Memoized actions selector to prevent infinite loops
const actionsSelector = (state: CVStore) => ({
  // Session actions
  initializeSession: state.initializeSession,
  clearSession: state.clearSession,
  
  // Upload actions
  setUploadProgress: state.setUploadProgress,
  setIsUploading: state.setIsUploading,
  setCurrentResume: state.setCurrentResume,
  
  // Analysis actions
  setIsAnalyzing: state.setIsAnalyzing,
  setAnalysisResult: state.setAnalysisResult,
  updateAnalysisResult: state.updateAnalysisResult,
  
  // Section editing actions
  setEditingSection: state.setEditingSection,
  setIsEditingSection: state.setIsEditingSection,
  updateSection: state.updateSection,
  
  // Chat actions
  setChatOpen: state.setChatOpen,
  
  // PDF generation actions
  setIsGeneratingPDF: state.setIsGeneratingPDF,
  updateGeneratedPdfPath: state.updateGeneratedPdfPath,
  
  // Error management actions
  addError: state.addError,
  removeError: state.removeError,
  clearErrors: state.clearErrors,
  clearErrorsByType: state.clearErrorsByType,
  
  // Utility actions
  reset: state.reset,
});

// Action hooks for cleaner component usage
export const useStoreActions = () => useCVStore(useShallow(actionsSelector));

export default useCVStore;