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

// Union type to support both old and new analysis formats
export type AnalysisData = CVAnalysisResult | ComprehensiveCVAnalysisResult;

// New comprehensive CV analysis schema
export interface DetailedCheck {
  score: number;
  status: "pass" | "warning" | "fail";
  message: string;
  suggestions: string[];
}

export interface OriginalCVSection {
  section_name: string;
  content: string;
  order: number;
}

export interface CVHeader {
  name: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
}

export interface ComprehensiveCVAnalysisResult {
  strengths: string[];
  next_steps: string[];
  detailed_checks: {
    education: DetailedCheck;
    formatting: DetailedCheck;
    contact_info: DetailedCheck;
    skills_section: DetailedCheck;
    work_experience: DetailedCheck;
    ats_compatibility: DetailedCheck;
    keyword_optimization: DetailedCheck;
    professional_summary: DetailedCheck;
  };
  overall_summary: {
    issues: number;
    warnings: number;
    total_checks: number;
    overall_score: number;
    passed_checks: number;
  };
  missing_elements: string[];
  user_informations: {
    age: number | null;
    education: "high school" | "bachelor" | "phd" | null;
    graduationDate: string | null;
    university: string | null;
    workHistory: {
      experienceYears: number | null;
      jobCount: number | null;
    } | null;
    gender: string | null;
    courses: string[] | null;
    skills: string[] | null;
    location: {
      city: string | null;
      country: string | null;
    } | null;
    gdp: number | null;
  };
  industry_specific_tips: string[];
  improvement_recommendations: {
    high_priority: string[];
    medium_priority: string[];
    low_priority: string[];
  };
  original_cv_sections: OriginalCVSection[];
  cv_header: CVHeader;
}

export interface GlobalChatResponse {
  response: string;
  cv_updates: Record<string, string>;
  suggestions: string[];
  next_steps: string[];
}