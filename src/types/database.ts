// Database types for AI CV Improvement Platform
// These types match the Supabase database schema

export interface Database {
  public: {
    Tables: {
      resumes: {
        Row: ResumeRecord;
        Insert: ResumeInsert;
        Update: ResumeUpdate;
      };
      ai_provider_settings: {
        Row: AIProviderSettings;
        Insert: AIProviderInsert;
        Update: AIProviderUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Resume table types
export interface ResumeRecord {
  id: string;
  user_session_id: string;
  original_pdf_path: string;
  generated_pdf_path: string | null;
  analysis_json: CVAnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeInsert {
  id?: string;
  user_session_id: string;
  original_pdf_path: string;
  generated_pdf_path?: string | null;
  analysis_json?: CVAnalysisResult | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeUpdate {
  id?: string;
  user_session_id?: string;
  original_pdf_path?: string;
  generated_pdf_path?: string | null;
  analysis_json?: CVAnalysisResult | null;
  created_at?: string;
  updated_at?: string;
}

// AI Provider Settings table types
export interface AIProviderSettings {
  id: number;
  provider_name: string;
  api_endpoint: string;
  api_key_secret_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIProviderInsert {
  id?: number;
  provider_name: string;
  api_endpoint: string;
  api_key_secret_name: string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIProviderUpdate {
  id?: number;
  provider_name?: string;
  api_endpoint?: string;
  api_key_secret_name?: string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// CV Analysis result types (stored as JSONB)
export interface CVAnalysisResult {
  overall_score: number;
  summary: string;
  sections: CVSection[];
  ats_compatibility: ATSCompatibility;
}

export interface CVSection {
  section_name: string;
  score: number;
  content: string;
  feedback: string;
  suggestions: string;
}

export interface ATSCompatibility {
  score: number;
  feedback: string;
  suggestions: string;
}

// Storage bucket types
export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number;
  allowed_mime_types: string[];
}

// Utility types for API responses
export type DatabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type DatabaseResponse<T> = {
  data: T | null;
  error: DatabaseError | null;
};

// Session management types
export interface SessionConfig {
  sessionId: string;
  expiresAt: Date;
}

// File upload types
export interface FileUploadResult {
  path: string;
  fullPath: string;
  id: string;
}

export interface StorageError {
  message: string;
  statusCode?: string;
}

export type StorageResponse<T> = {
  data: T | null;
  error: StorageError | null;
};