/**
 * API response and request types
 */

import { CVAnalysisResult, CVSection } from './cv';
import { ResumeRecord } from './database';

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Upload API types
export interface UploadRequest {
  file: File;
  sessionId: string;
}

export interface UploadResponse {
  resumeId: string;
  filePath: string;
  message: string;
}

// Analysis API types
export interface AnalysisRequest {
  resumeId: string;
  pdfPath: string;
}

export interface AnalysisResponse extends CVAnalysisResult {
  resumeId: string;
  processingTime: number;
}

// Section editing API types
export interface SectionEditRequest {
  resumeId: string;
  sectionName: string;
  currentContent: string;
  suggestions: string;
  additionalContext?: string;
}

export interface SectionEditResponse {
  updatedSection: CVSection;
  updatedScore: number;
  message: string;
}

// PDF generation API types
export interface PDFGenerationRequest {
  resumeId: string;
  updatedContent: Record<string, string>;
}

export interface PDFGenerationResponse {
  generatedPdfPath: string;
  downloadUrl: string;
  message: string;
}

// Chat API types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  resumeId: string;
  sectionName: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
  requiresMoreInfo: boolean;
  suggestedQuestions?: string[];
}