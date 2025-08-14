/**
 * Application state management types
 */

import type { CVAnalysisResult } from './cv';
import type { ResumeRecord } from './database';

export interface ErrorState {
  id: string;
  type: 'upload' | 'analysis' | 'edit' | 'download' | 'network' | 'validation';
  message: string;
  timestamp: Date;
  details?: string;
}

export interface AppState {
  // Session management
  sessionId: string;
  
  // Current resume data
  currentResume?: ResumeRecord;
  analysisResult?: CVAnalysisResult;
  
  // UI state
  uploadProgress: number;
  isAnalyzing: boolean;
  editingSection?: string;
  chatOpen: boolean;
  
  // Error handling
  errors: ErrorState[];
  
  // Loading states
  isUploading: boolean;
  isGeneratingPDF: boolean;
  isEditingSection: boolean;
}