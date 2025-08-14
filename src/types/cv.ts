/**
 * Core CV analysis data models
 */

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

export interface CVAnalysisResult {
  overall_score: number;
  summary: string;
  sections: CVSection[];
  ats_compatibility: ATSCompatibility;
}