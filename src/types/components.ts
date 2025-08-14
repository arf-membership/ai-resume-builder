/**
 * Component prop types and UI-related interfaces
 */

import type { CVAnalysisResult, CVSection } from './cv';
import type { ChatMessage } from './api';

// Upload component props
export interface UploadZoneProps {
  onUploadComplete: (fileData: { resumeId: string; filePath: string }) => void;
  onUploadProgress: (progress: number) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

// Analysis results component props
export interface AnalysisResultsProps {
  analysisData: CVAnalysisResult;
  resumeId: string;
  onSectionEdit: (sectionName: string) => void;
  onDownloadPDF: () => void;
}

// Section card component props
export interface SectionCardProps {
  section: CVSection;
  onEdit: () => void;
  isEditing?: boolean;
  disabled?: boolean;
}

// CV Canvas component props
export interface CVCanvasProps {
  pdfUrl: string;
  updates?: SectionUpdate[];
  onDownload: () => void;
  className?: string;
}

// Chat interface component props
export interface ChatInterfaceProps {
  isOpen: boolean;
  sectionName: string;
  resumeId: string;
  onClose: () => void;
  onComplete: (updatedContent: string) => void;
  initialMessages?: ChatMessage[];
}

// Utility types for component state
export interface SectionUpdate {
  sectionName: string;
  newContent: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

// Form and input types
export interface FileValidation {
  maxSize: number; // in bytes
  allowedTypes: string[];
  maxFiles: number;
}

export interface ProgressIndicatorProps {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
}

// Modal and overlay types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

// Error display types
export interface ErrorDisplayProps {
  error: {
    message: string;
    type?: string;
    details?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
}