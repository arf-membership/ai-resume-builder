/**
 * Zustand store for AI CV Improvement Platform
 * Provides global state management for upload, analysis, and editing workflows
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AppState, ErrorState } from '../types/state';
import type { CVAnalysisResult, CVSection } from '../types/cv';
import type { ResumeRecord } from '../types/database';

// Score history interface
interface ScoreHistory {
  timestamp: Date;
  overall_score: number;
  section_scores: Record<string, number>;
  message?: string;
}

// Store interface extending AppState with actions
interface CVStore extends AppState {
  // Score tracking
  scoreHistory: ScoreHistory[];
  
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
  renameSections: (sectionRenames: Record<string, string>) => void;
  
  // Score tracking actions
  addScoreToHistory: (score: number, sectionScores: Record<string, number>, message?: string) => void;
  clearScoreHistory: () => void;
  
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
  
  // Update tracking
  lastUpdateTimestamp?: number;
  
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
      scoreHistory: [],
      
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
        
        // Add initial score to history
        const sectionScores: Record<string, number> = {};
        if (result.sections) {
          result.sections.forEach(section => {
            sectionScores[section.section_name] = section.score;
          });
        }
        
        // Get overall score from either schema format
        const overallScore = ('overall_summary' in result) 
          ? (result as any).overall_summary?.overall_score || 0
          : result.overall_score || 0;
        
        console.log('🔍 Extracting overall score from analysis result:', {
          hasOverallSummary: 'overall_summary' in result,
          overallSummaryScore: (result as any).overall_summary?.overall_score,
          directOverallScore: result.overall_score,
          extractedScore: overallScore,
          resultKeys: Object.keys(result)
        });
        
        // Add to score history
        const { addScoreToHistory } = get();
        addScoreToHistory(overallScore, sectionScores, 'Initial CV Analysis');
        
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
        
        // Handle Header section specially - it should update cv_header
        if (sectionName.toLowerCase() === 'header') {
          console.log('🔄 Store: Updating Header section in cv_header');
          
          if ('cv_header' in analysisResult) {
            // Parse header content to extract name, email, phone, etc.
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            const updatedHeader = { ...(analysisResult as any).cv_header };
            
            // First line is usually the name
            if (lines[0]) {
              updatedHeader.full_name = lines[0];
            }
            
            // Parse contact info from remaining lines
            lines.slice(1).forEach(line => {
              if (line.includes('@')) {
                const emailMatch = line.match(/\S+@\S+\.\S+/);
                if (emailMatch) updatedHeader.email = emailMatch[0];
              }
              if (line.match(/\+?\d[\d\s\-\(\)]+/)) {
                const phoneMatch = line.match(/\+?\d[\d\s\-\(\)]+/);
                if (phoneMatch) updatedHeader.phone = phoneMatch[0].trim();
              }
            });
            
            set({
              analysisResult: {
                ...analysisResult,
                cv_header: updatedHeader
              } as any
            });
            
            console.log('✅ Store: Header updated in cv_header');
            return;
          }
        }

        // Handle comprehensive schema (original_cv_sections)
        if ('original_cv_sections' in analysisResult) {
          console.log('🔄 Store: Using comprehensive schema (original_cv_sections)');
          
          // Enhanced section name mapping
          const sectionNameMappings: {[key: string]: string[]} = {
            'header': ['HEADER', 'Contact Info', 'Contact Information'],
            'professional summary': ['PROFESSIONAL SUMMARY', 'Summary', 'Profile'],
            'work experience': ['EXPERIENCE', 'Work Experience', 'Employment'],
            'education': ['EDUCATION', 'Academic Background'],
            'skills': ['SKILLS', 'Technical Skills', 'Core Skills'],
            'clients': ['CLIENTS', 'Client Experience'],
            'interests': ['INTERESTS', 'Hobbies', 'Personal Interests'],
            'references': ['REFERENCES']
          };
          
          // Try exact match first
          let updatedSections = (analysisResult as any).original_cv_sections.map((section: any) =>
            section.section_name === sectionName 
              ? { ...section, content }
              : section
          );
          
          // If no exact match, try mapping-based matching
          const foundExactMatch = updatedSections.some((section: any) => section.content === content);
          
          if (!foundExactMatch) {
            console.log('🔄 Store: Trying section name mapping');
            const lowerSectionName = sectionName.toLowerCase();
            
            // Find matching section using mappings
            for (const [backendName, frontendNames] of Object.entries(sectionNameMappings)) {
              if (lowerSectionName === backendName || frontendNames.some(name => name.toLowerCase() === lowerSectionName)) {
                updatedSections = (analysisResult as any).original_cv_sections.map((section: any) => {
                  if (frontendNames.includes(section.section_name) || section.section_name.toLowerCase() === backendName) {
                    console.log(`🔄 Store: Mapped "${sectionName}" -> "${section.section_name}"`);
                    return { ...section, content };
                  }
                  return section;
                });
                break;
              }
            }
            
            // Fallback to fuzzy matching if mapping didn't work
            if (!updatedSections.some((section: any) => section.content === content)) {
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
            
            // If still no match found, create a new section
            if (!updatedSections.some((section: any) => section.content === content)) {
              console.log(`🔄 Store: Creating new section: "${sectionName}"`);
              
              // Determine the order for the new section
              const maxOrder = Math.max(...updatedSections.map((s: any) => s.order || 0));
              let newOrder = maxOrder + 1;
              
              // Special ordering for Professional Summary - should be after header but before other sections
              if (sectionName.toLowerCase().includes('professional summary') || sectionName.toLowerCase().includes('summary')) {
                // Insert after header (order 1) but before other sections
                newOrder = 2;
                // Shift other sections down
                updatedSections = updatedSections.map((section: any) => ({
                  ...section,
                  order: section.order >= 2 ? section.order + 1 : section.order
                }));
              }
              
              const newSection = {
                section_name: sectionName,
                content: content,
                order: newOrder
              };
              
              updatedSections.push(newSection);
              console.log(`✅ Store: Created new section "${sectionName}" with order ${newOrder}`);
            }
          }
          
          console.log('🔄 Store: Updated sections:', updatedSections.map((s: any) => s.section_name));
          
          set({
            analysisResult: {
              ...analysisResult,
              original_cv_sections: updatedSections
            } as any
          });
          
          console.log('✅ Store: Section updated successfully');
          
          // Trigger a state change to notify components of the update
          set(state => ({ ...state, lastUpdateTimestamp: Date.now() }));
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

      // Rename CV sections
      renameSections: (sectionRenames: Record<string, string>) => {
        const { analysisResult } = get();
        if (!analysisResult) {
          console.warn('❌ Store: No analysis result available for section renaming');
          return;
        }

        console.log('🔄 Store: Renaming sections:', sectionRenames);

        // Handle new schema (original_cv_sections)
        if ('original_cv_sections' in analysisResult && Array.isArray(analysisResult.original_cv_sections)) {
          const updatedSections = analysisResult.original_cv_sections.map(section => {
            const newName = sectionRenames[section.section_name];
            return newName 
              ? { ...section, section_name: newName }
              : section;
          });
          
          set({
            analysisResult: {
              ...analysisResult,
              original_cv_sections: updatedSections
            } as any
          });
          
          console.log('✅ Store: Sections renamed successfully');
        }
        // Handle legacy schema (sections)
        else if ('sections' in analysisResult) {
          const updatedSections = analysisResult.sections.map(section => {
            const newName = sectionRenames[section.section_name];
            return newName 
              ? { ...section, section_name: newName }
              : section;
          });
          
          set({
            analysisResult: {
              ...analysisResult,
              sections: updatedSections
            }
          });
          
          console.log('✅ Store: Legacy sections renamed successfully');
        }
        
        // Trigger a state change to notify components of the update
        set(state => ({ ...state, lastUpdateTimestamp: Date.now() }));
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
      
      // Score tracking actions
      addScoreToHistory: (score: number, sectionScores: Record<string, number>, message?: string) => {
        const newEntry: ScoreHistory = {
          timestamp: new Date(),
          overall_score: score,
          section_scores: sectionScores,
          message
        };
        
        set(state => ({
          scoreHistory: [...state.scoreHistory, newEntry]
        }));
      },
      
      clearScoreHistory: () => {
        set({ scoreHistory: [] });
      },
      
      // Utility actions
      reset: () => {
        set({
          ...initialState,
          sessionId: generateSessionId(),
          scoreHistory: [],
        });
      },
    }));

// Memoized selectors to prevent infinite loops
const sessionIdSelector = (state: CVStore) => state.sessionId;
const currentResumeSelector = (state: CVStore) => state.currentResume;
const analysisResultSelector = (state: CVStore) => state.analysisResult;
const chatOpenSelector = (state: CVStore) => state.chatOpen;
const errorsSelector = (state: CVStore) => state.errors;
const scoreHistorySelector = (state: CVStore) => state.scoreHistory;

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
export const useScoreHistory = () => useCVStore(scoreHistorySelector);

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
  
  // Score tracking actions
  addScoreToHistory: state.addScoreToHistory,
  clearScoreHistory: state.clearScoreHistory,
  
  // Utility actions
  reset: state.reset,
});

// Action hooks for cleaner component usage
export const useStoreActions = () => useCVStore(useShallow(actionsSelector));

export default useCVStore;