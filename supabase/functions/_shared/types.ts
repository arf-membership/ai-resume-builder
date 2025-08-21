/**
 * Shared types for Supabase Edge Functions
 */

export interface GlobalChatResponse {
  response: string;
  cv_updates: Record<string, string>;
  suggestions: string[];
  next_steps: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CVAnalysisData {
  overall_score: number;
  summary: string;
  structured_content?: {
    personal_info: {
      name: string;
      title: string;
      contact: {
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        website?: string;
      };
    };
    professional_summary: string;
    experience: Array<{
      title: string;
      company: string;
      location?: string;
      duration: string;
      achievements: string[];
      skills_used: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      location?: string;
      duration: string;
      details: string[];
    }>;
    skills: {
      technical: string[];
      soft: string[];
      languages: string[];
    };
    certifications: Array<{
      name: string;
      issuer: string;
      date: string;
    }>;
  };
  sections: Array<{
    section_name: string;
    score: number;
    content: string;
    feedback: string;
    suggestions: string;
  }>;
  ats_compatibility: {
    score: number;
    feedback: string;
    suggestions: string;
  };
}
