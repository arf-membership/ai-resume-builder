/**
 * Response parsing utilities for OpenAI API responses
 * This module provides type-safe parsing and validation of OpenAI responses
 */

// Response type definitions - Legacy format
export interface CVAnalysisResponse {
  overall_score: number;
  summary: string;
  structured_content?: StructuredContent;
  sections: CVSectionResponse[];
  ats_compatibility: ATSCompatibilityResponse;
}

// New comprehensive CV analysis response format
export interface ComprehensiveCVAnalysisResponse {
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

export interface StructuredContent {
  personal_info: PersonalInfo;
  professional_summary: string;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
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

export interface CVSectionResponse {
  section_name: string;
  score: number;
  content: string;
  feedback: string;
  suggestions: string;
}

export interface ATSCompatibilityResponse {
  score: number;
  feedback: string;
  suggestions: string;
}

export interface SectionEditResponse {
  improved_content: string;
  score: number;
  changes_made: string[];
  keywords_added: string[];
}

export interface ChatResponse {
  questions: string[];
  explanation: string;
  requires_more_info: boolean;
}

export interface GlobalChatResponse {
  response: string;
  cv_updates: Record<string, string>;
}

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate and parse CV analysis response
 */
export function parseCVAnalysisResponse(response: string): CVAnalysisResponse {
  let parsed: any;
  
  try {
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedResponse = codeBlockMatch[1].trim();
    }
    
    // If there's still no valid JSON, try to extract JSON from the response
    if (!cleanedResponse.startsWith('{')) {
      // Look for JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
    }
    
    console.log('🔍 Attempting to parse OpenAI response:', cleanedResponse.substring(0, 500) + '...');
    
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('❌ JSON parsing failed. Raw response:', response.substring(0, 1000) + '...');
    throw new ValidationError(`Invalid JSON response from OpenAI: ${error.message}`);
  }

  // Validate overall structure
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Response must be an object');
  }

  // Validate overall_score
  if (typeof parsed.overall_score !== 'number' || 
      parsed.overall_score < 0 || 
      parsed.overall_score > 100) {
    throw new ValidationError('overall_score must be a number between 0 and 100');
  }

  // Validate summary
  if (typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
    throw new ValidationError('summary must be a non-empty string');
  }

  // Validate sections array
  if (!Array.isArray(parsed.sections)) {
    throw new ValidationError('sections must be an array');
  }

  const validatedSections: CVSectionResponse[] = parsed.sections.map((section: any, index: number) => {
    if (typeof section !== 'object' || section === null) {
      throw new ValidationError(`Section at index ${index} must be an object`);
    }

    if (typeof section.section_name !== 'string' || section.section_name.trim().length === 0) {
      throw new ValidationError(`Section at index ${index} must have a valid section_name`);
    }

    if (typeof section.score !== 'number' || section.score < 0 || section.score > 100) {
      throw new ValidationError(`Section at index ${index} must have a score between 0 and 100`);
    }

    if (typeof section.content !== 'string') {
      throw new ValidationError(`Section at index ${index} must have content as string`);
    }

    if (typeof section.feedback !== 'string' || section.feedback.trim().length === 0) {
      throw new ValidationError(`Section at index ${index} must have non-empty feedback`);
    }

    if (typeof section.suggestions !== 'string' || section.suggestions.trim().length === 0) {
      throw new ValidationError(`Section at index ${index} must have non-empty suggestions`);
    }

    return {
      section_name: section.section_name.trim(),
      score: section.score,
      content: section.content.trim(),
      feedback: section.feedback.trim(),
      suggestions: section.suggestions.trim(),
    };
  });

  // Validate ATS compatibility
  if (typeof parsed.ats_compatibility !== 'object' || parsed.ats_compatibility === null) {
    throw new ValidationError('ats_compatibility must be an object');
  }

  const atsCompat = parsed.ats_compatibility;
  if (typeof atsCompat.score !== 'number' || atsCompat.score < 0 || atsCompat.score > 100) {
    throw new ValidationError('ats_compatibility.score must be a number between 0 and 100');
  }

  if (typeof atsCompat.feedback !== 'string' || atsCompat.feedback.trim().length === 0) {
    throw new ValidationError('ats_compatibility.feedback must be a non-empty string');
  }

  if (typeof atsCompat.suggestions !== 'string' || atsCompat.suggestions.trim().length === 0) {
    throw new ValidationError('ats_compatibility.suggestions must be a non-empty string');
  }

  // Parse structured_content if present (optional for backward compatibility)
  let structuredContent: StructuredContent | undefined;
  if (parsed.structured_content && typeof parsed.structured_content === 'object') {
    try {
      structuredContent = validateStructuredContent(parsed.structured_content);
      console.log('✅ Structured content parsed successfully');
    } catch (error) {
      // Log detailed error for debugging
      console.error('❌ Failed to parse structured_content:', error.message);
      console.error('Raw structured_content data:', JSON.stringify(parsed.structured_content, null, 2));
    }
  } else {
    console.warn('⚠️ No structured_content found in OpenAI response');
    console.log('Raw response keys:', Object.keys(parsed));
    
    // Try to create structured content from sections as fallback
    try {
      structuredContent = createStructuredContentFromSections(validatedSections);
      console.log('✅ Created fallback structured content from sections');
    } catch (error) {
      console.error('❌ Failed to create fallback structured content:', error.message);
    }
  }

  return {
    overall_score: parsed.overall_score,
    summary: parsed.summary.trim(),
    structured_content: structuredContent,
    sections: validatedSections,
    ats_compatibility: {
      score: atsCompat.score,
      feedback: atsCompat.feedback.trim(),
      suggestions: atsCompat.suggestions.trim(),
    },
  };
}

/**
 * Create structured content from sections as fallback
 */
function createStructuredContentFromSections(sections: CVSectionResponse[]): StructuredContent {
  // Initialize with default values
  const structuredContent: StructuredContent = {
    personal_info: {
      name: 'Name not found',
      title: 'Title not found',
      contact: {}
    },
    professional_summary: '',
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      languages: []
    },
    certifications: []
  };

  // Extract data from sections
  for (const section of sections) {
    const sectionName = section.section_name.toLowerCase();
    
    if (sectionName.includes('personal') || sectionName.includes('contact') || sectionName.includes('header')) {
      // Extract personal info from content
      const content = section.content;
      const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
      
      // Try to find name (usually first line)
      if (lines.length > 0) {
        structuredContent.personal_info.name = lines[0];
      }
      
      // Try to find title (usually second line)
      if (lines.length > 1) {
        structuredContent.personal_info.title = lines[1];
      }
      
      // Extract contact information
      const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        structuredContent.personal_info.contact.email = emailMatch[0];
      }
      
      const phoneMatch = content.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        structuredContent.personal_info.contact.phone = phoneMatch[0].trim();
      }
      
      const linkedinMatch = content.match(/linkedin\.com\/in\/[\w\-]+|LinkedIn:\s*([\w\-]+)/i);
      if (linkedinMatch) {
        structuredContent.personal_info.contact.linkedin = linkedinMatch[0];
      }
    }
    
    else if (sectionName.includes('summary') || sectionName.includes('objective')) {
      structuredContent.professional_summary = section.content;
    }
    
    else if (sectionName.includes('experience') || sectionName.includes('work') || sectionName.includes('employment')) {
      // Parse experience from content
      const experiences = parseExperienceFromContent(section.content);
      structuredContent.experience.push(...experiences);
    }
    
    else if (sectionName.includes('education') || sectionName.includes('academic')) {
      // Parse education from content
      const education = parseEducationFromContent(section.content);
      structuredContent.education.push(...education);
    }
    
    else if (sectionName.includes('skill') || sectionName.includes('competenc') || sectionName.includes('technical')) {
      // Parse skills from content
      const skills = parseSkillsFromContent(section.content);
      structuredContent.skills.technical.push(...skills.technical);
      structuredContent.skills.soft.push(...skills.soft);
      structuredContent.skills.languages.push(...skills.languages);
    }
    
    else if (sectionName.includes('certification') || sectionName.includes('certificate')) {
      // Parse certifications from content
      const certifications = parseCertificationsFromContent(section.content);
      structuredContent.certifications.push(...certifications);
    }
  }

  return structuredContent;
}

/**
 * Parse experience from section content
 */
function parseExperienceFromContent(content: string): Experience[] {
  const experiences: Experience[] = [];
  
  // Split by common job separators
  const jobBlocks = content.split(/(?=\w+.*(?:Developer|Engineer|Manager|Analyst|Specialist|Lead|Senior|Junior))/i);
  
  for (const block of jobBlocks) {
    if (block.trim().length < 10) continue; // Skip short blocks
    
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    
    const titleLine = lines[0];
    const companyLine = lines[1];
    
    // Extract company and dates
    const dateMatch = companyLine.match(/(\d{4}.*?(?:present|current|\d{4}))$/i);
    const duration = dateMatch ? dateMatch[1] : '';
    const company = companyLine.replace(/\s*\|\s*.*$/, '').replace(dateMatch?.[0] || '', '').trim();
    
    const achievements = lines.slice(2).filter(line => 
      line.startsWith('•') || line.startsWith('-') || line.includes('developed') || line.includes('implemented')
    );
    
    experiences.push({
      title: titleLine,
      company: company || 'Company not specified',
      duration: duration || 'Duration not specified',
      location: undefined,
      achievements: achievements,
      skills_used: []
    });
  }
  
  return experiences;
}

/**
 * Parse education from section content
 */
function parseEducationFromContent(content: string): Education[] {
  const education: Education[] = [];
  
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  for (let i = 0; i < lines.length; i += 2) {
    if (i + 1 < lines.length) {
      const degree = lines[i];
      const institution = lines[i + 1];
      
      const dateMatch = institution.match(/(\d{4}.*?\d{4})/);
      const duration = dateMatch ? dateMatch[1] : '';
      const cleanInstitution = institution.replace(dateMatch?.[0] || '', '').trim();
      
      education.push({
        degree: degree,
        institution: cleanInstitution || 'Institution not specified',
        duration: duration || 'Duration not specified',
        location: undefined,
        details: []
      });
    }
  }
  
  return education;
}

/**
 * Parse skills from section content
 */
function parseSkillsFromContent(content: string): Skills {
  const skills: Skills = {
    technical: [],
    soft: [],
    languages: []
  };
  
  // Common technical keywords
  const technicalKeywords = /javascript|typescript|python|java|react|node|sql|aws|docker|git|html|css|c\#|\.net/i;
  const softKeywords = /leadership|communication|teamwork|problem.solving|analytical|creative|management/i;
  const languageKeywords = /english|turkish|spanish|french|german|arabic|chinese|japanese/i;
  
  const items = content.split(/[,•\-\n]/).map(item => item.trim()).filter(Boolean);
  
  for (const item of items) {
    if (technicalKeywords.test(item)) {
      skills.technical.push(item);
    } else if (languageKeywords.test(item)) {
      skills.languages.push(item);
    } else if (softKeywords.test(item)) {
      skills.soft.push(item);
    } else if (item.length > 2 && item.length < 30) {
      // Default to technical if reasonable length
      skills.technical.push(item);
    }
  }
  
  return skills;
}

/**
 * Parse certifications from section content
 */
function parseCertificationsFromContent(content: string): Certification[] {
  const certifications: Certification[] = [];
  
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  for (const line of lines) {
    const dateMatch = line.match(/(\d{4})/);
    const date = dateMatch ? dateMatch[1] : '';
    
    const parts = line.split(/[\|\-]/).map(part => part.trim());
    const name = parts[0] || line;
    const issuer = parts[1] || 'Issuer not specified';
    
    certifications.push({
      name: name.replace(dateMatch?.[0] || '', '').trim(),
      issuer: issuer.replace(dateMatch?.[0] || '', '').trim(),
      date: date || 'Date not specified'
    });
  }
  
  return certifications;
}

/**
 * Validate structured content from CV analysis response
 */
function validateStructuredContent(data: any): StructuredContent {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('structured_content must be an object');
  }

  // Validate personal_info
  if (!data.personal_info || typeof data.personal_info !== 'object') {
    throw new ValidationError('personal_info is required in structured_content');
  }

  const personalInfo = data.personal_info;
  if (typeof personalInfo.name !== 'string' || !personalInfo.name.trim()) {
    throw new ValidationError('personal_info.name must be a non-empty string');
  }

  if (typeof personalInfo.title !== 'string' || !personalInfo.title.trim()) {
    throw new ValidationError('personal_info.title must be a non-empty string');
  }

  // Validate contact (optional fields)
  const contact = personalInfo.contact || {};

  // Validate professional_summary
  if (typeof data.professional_summary !== 'string') {
    throw new ValidationError('professional_summary must be a string');
  }

  // Validate experience array
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const validatedExperience = experience.map((exp: any, index: number) => {
    if (!exp || typeof exp !== 'object') {
      throw new ValidationError(`Experience item ${index} must be an object`);
    }
    return {
      title: String(exp.title || ''),
      company: String(exp.company || ''),
      location: exp.location ? String(exp.location) : undefined,
      duration: String(exp.duration || ''),
      achievements: Array.isArray(exp.achievements) ? exp.achievements.map(String) : [],
      skills_used: Array.isArray(exp.skills_used) ? exp.skills_used.map(String) : [],
    };
  });

  // Validate education array
  const education = Array.isArray(data.education) ? data.education : [];
  const validatedEducation = education.map((edu: any, index: number) => {
    if (!edu || typeof edu !== 'object') {
      throw new ValidationError(`Education item ${index} must be an object`);
    }
    return {
      degree: String(edu.degree || ''),
      institution: String(edu.institution || ''),
      location: edu.location ? String(edu.location) : undefined,
      duration: String(edu.duration || ''),
      details: Array.isArray(edu.details) ? edu.details.map(String) : [],
    };
  });

  // Validate skills
  const skills = data.skills || {};
  const validatedSkills = {
    technical: Array.isArray(skills.technical) ? skills.technical.map(String) : [],
    soft: Array.isArray(skills.soft) ? skills.soft.map(String) : [],
    languages: Array.isArray(skills.languages) ? skills.languages.map(String) : [],
  };

  // Validate certifications array
  const certifications = Array.isArray(data.certifications) ? data.certifications : [];
  const validatedCertifications = certifications.map((cert: any, index: number) => {
    if (!cert || typeof cert !== 'object') {
      throw new ValidationError(`Certification item ${index} must be an object`);
    }
    return {
      name: String(cert.name || ''),
      issuer: String(cert.issuer || ''),
      date: String(cert.date || ''),
    };
  });

  return {
    personal_info: {
      name: personalInfo.name.trim(),
      title: personalInfo.title.trim(),
      contact: {
        email: contact.email ? String(contact.email) : undefined,
        phone: contact.phone ? String(contact.phone) : undefined,
        location: contact.location ? String(contact.location) : undefined,
        linkedin: contact.linkedin ? String(contact.linkedin) : undefined,
        website: contact.website ? String(contact.website) : undefined,
      },
    },
    professional_summary: data.professional_summary,
    experience: validatedExperience,
    education: validatedEducation,
    skills: validatedSkills,
    certifications: validatedCertifications,
  };
}

/**
 * Validate and parse section edit response
 */
export function parseSectionEditResponse(response: string): SectionEditResponse {
  let parsed: any;
  
  try {
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedResponse = codeBlockMatch[1].trim();
    }
    
    // If there's still no valid JSON, try to extract JSON from the response
    if (!cleanedResponse.startsWith('{')) {
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
    }
    
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('❌ Section edit JSON parsing failed. Raw response:', response.substring(0, 500) + '...');
    throw new ValidationError(`Invalid JSON response from OpenAI: ${error.message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Response must be an object');
  }

  if (typeof parsed.improved_content !== 'string' || parsed.improved_content.trim().length === 0) {
    throw new ValidationError('improved_content must be a non-empty string');
  }

  if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
    throw new ValidationError('score must be a number between 0 and 100');
  }

  if (!Array.isArray(parsed.changes_made)) {
    throw new ValidationError('changes_made must be an array');
  }

  if (!Array.isArray(parsed.keywords_added)) {
    throw new ValidationError('keywords_added must be an array');
  }

  // Validate array contents
  const changes = parsed.changes_made.map((change: any, index: number) => {
    if (typeof change !== 'string') {
      throw new ValidationError(`changes_made[${index}] must be a string`);
    }
    return change.trim();
  }).filter((change: string) => change.length > 0);

  const keywords = parsed.keywords_added.map((keyword: any, index: number) => {
    if (typeof keyword !== 'string') {
      throw new ValidationError(`keywords_added[${index}] must be a string`);
    }
    return keyword.trim();
  }).filter((keyword: string) => keyword.length > 0);

  return {
    improved_content: parsed.improved_content.trim(),
    score: parsed.score,
    changes_made: changes,
    keywords_added: keywords,
  };
}

/**
 * Validate and parse chat response
 */
export function parseChatResponse(response: string): ChatResponse {
  let parsed: any;
  
  try {
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim();
    
    // Remove markdown code blocks if present
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedResponse = codeBlockMatch[1].trim();
    }
    
    // If there's still no valid JSON, try to extract JSON from the response
    if (!cleanedResponse.startsWith('{')) {
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
    }
    
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('❌ Chat JSON parsing failed. Raw response:', response.substring(0, 500) + '...');
    throw new ValidationError(`Invalid JSON response from OpenAI: ${error.message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Response must be an object');
  }

  if (!Array.isArray(parsed.questions)) {
    throw new ValidationError('questions must be an array');
  }

  if (typeof parsed.explanation !== 'string' || parsed.explanation.trim().length === 0) {
    throw new ValidationError('explanation must be a non-empty string');
  }

  if (typeof parsed.requires_more_info !== 'boolean') {
    throw new ValidationError('requires_more_info must be a boolean');
  }

  // Validate questions array
  const questions = parsed.questions.map((question: any, index: number) => {
    if (typeof question !== 'string' || question.trim().length === 0) {
      throw new ValidationError(`questions[${index}] must be a non-empty string`);
    }
    return question.trim();
  });

  return {
    questions,
    explanation: parsed.explanation.trim(),
    requires_more_info: parsed.requires_more_info,
  };
}

/**
 * Validate and parse global chat response for CV improvement
 */
export function parseGlobalChatResponse(response: string): GlobalChatResponse {
  let parsed: any;
  
  try {
    // Clean the response - remove markdown code blocks and extra text
    let cleanedResponse = response.trim();
    
    // Check for markdown code blocks and extract JSON
    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedResponse = codeBlockMatch[1].trim();
    }
    
    // If response doesn't start with {, try to find JSON within it
    if (!cleanedResponse.startsWith('{')) {
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
    }
    
    parsed = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('❌ Global Chat JSON parsing failed. Raw response:', response.substring(0, 500) + '...');
    throw new ValidationError(`Invalid JSON response from OpenAI: ${error.message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Response must be an object');
  }

  // Validate required fields with fallbacks
  const result: GlobalChatResponse = {
    response: typeof parsed.response === 'string' ? parsed.response.trim() : 'I understand your request. Let me help you improve your CV.',
    cv_updates: parsed.cv_updates && typeof parsed.cv_updates === 'object' ? parsed.cv_updates : {}
  };

  if (result.response.length === 0) {
    throw new ValidationError('response must be a non-empty string');
  }

  return result;
}

/**
 * Sanitize and validate text input
 */
export function sanitizeTextInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }

  const sanitized = input.trim();
  
  if (sanitized.length === 0) {
    throw new ValidationError('Input cannot be empty');
  }

  if (sanitized.length > maxLength) {
    throw new ValidationError(`Input exceeds maximum length of ${maxLength} characters`);
  }

  return sanitized;
}

/**
 * Validate score value
 */
export function validateScore(score: any): number {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new ValidationError('Score must be a valid number');
  }

  if (score < 0 || score > 100) {
    throw new ValidationError('Score must be between 0 and 100');
  }

  return Math.round(score);
}

/**
 * Create error response for API endpoints
 */
export function createErrorResponse(error: Error, statusCode: number = 500) {
  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
      type: error.constructor.name,
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create success response for API endpoints
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}