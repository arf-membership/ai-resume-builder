/**
 * Response parsing utilities for OpenAI API responses
 * This module provides type-safe parsing and validation of OpenAI responses
 */

// Response type definitions
export interface CVAnalysisResponse {
  overall_score: number;
  summary: string;
  sections: CVSectionResponse[];
  ats_compatibility: ATSCompatibilityResponse;
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
    parsed = JSON.parse(response);
  } catch (error) {
    throw new ValidationError('Invalid JSON response from OpenAI');
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

  return {
    overall_score: parsed.overall_score,
    summary: parsed.summary.trim(),
    sections: validatedSections,
    ats_compatibility: {
      score: atsCompat.score,
      feedback: atsCompat.feedback.trim(),
      suggestions: atsCompat.suggestions.trim(),
    },
  };
}

/**
 * Validate and parse section edit response
 */
export function parseSectionEditResponse(response: string): SectionEditResponse {
  let parsed: any;
  
  try {
    parsed = JSON.parse(response);
  } catch (error) {
    throw new ValidationError('Invalid JSON response from OpenAI');
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
    parsed = JSON.parse(response);
  } catch (error) {
    throw new ValidationError('Invalid JSON response from OpenAI');
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