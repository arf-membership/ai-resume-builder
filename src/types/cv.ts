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

export interface PersonalInfo {
  name: string;
  title: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  duration: string;
  achievements: string[];
  skills_used: string[];
}

export interface Education {
  degree: string;
  institution: string;
  location?: string;
  duration: string;
  details: string[];
}

export interface Skills {
  technical: string[];
  soft: string[];
  languages: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface StructuredContent {
  personal_info: PersonalInfo;
  professional_summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
}

export interface CVAnalysisResult {
  overall_score: number;
  summary: string;
  structured_content?: StructuredContent;
  sections: CVSection[];
  ats_compatibility: ATSCompatibility;
}

export interface GlobalChatResponse {
  response: string;
  cv_updates: Record<string, string>;
  suggestions: string[];
  next_steps: string[];
}