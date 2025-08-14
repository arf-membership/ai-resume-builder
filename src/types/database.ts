/**
 * Database record interfaces
 */

import { CVAnalysisResult } from './cv';

export interface ResumeRecord {
  id: string;
  user_session_id: string;
  original_pdf_path: string;
  generated_pdf_path?: string;
  analysis_json?: CVAnalysisResult;
  created_at: string;
}

export interface AIProviderSettings {
  id: number;
  provider_name: string;
  api_endpoint: string;
  api_key_secret_name: string;
  is_default: boolean;
  created_at?: string;
}