/**
 * OpenAI service for CV analysis and improvement
 * This module provides high-level functions for CV processing using OpenAI API
 */

import { 
  createOpenAIClient, 
  OpenAIClient, 
  OpenAIError,
  OpenAIRateLimitError,
  OpenAITimeoutError,
  OpenAIResponsesRequest 
} from './openai-client.ts';
import {
  createSectionEditPrompt,
  createChatPrompt,
  createContextualEditPrompt,
  extractResponseContent,
  OPENAI_CONFIGS,
  CV_ANALYSIS_SYSTEM_PROMPT
} from './prompt-utils.ts';
import {
  parseCVAnalysisResponse,
  parseSectionEditResponse,
  parseChatResponse,
  sanitizeTextInput,
  validateScore,
  ValidationError,
  type CVAnalysisResponse,
  type ComprehensiveCVAnalysisResponse,
  type SectionEditResponse,
  type ChatResponse,
} from './response-parser.ts';

/**
 * OpenAI service class for CV operations
 */
// JSON Schema for CV Analysis Response - New Comprehensive Format
const CV_ANALYSIS_SCHEMA = {
  type: "object",
  required: ["strengths", "next_steps", "detailed_checks", "overall_summary", "missing_elements", "industry_specific_tips", "improvement_recommendations", "user_informations", "original_cv_sections", "cv_header"],
  properties: {
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of resume strengths and positive aspects"
    },
    next_steps: {
      type: "array",
      items: { type: "string" },
      description: "Recommended next steps for improvement"
    },
    detailed_checks: {
      type: "object",
      required: ["education", "formatting", "contact_info", "skills_section", "work_experience", "ats_compatibility", "keyword_optimization", "professional_summary"],
      properties: {
        education: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of education section" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for education" }
          },
          additionalProperties: false
        },
        formatting: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of overall formatting and layout" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for formatting" }
          },
          additionalProperties: false
        },
        contact_info: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of contact information completeness and format" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for contact info" }
          },
          additionalProperties: false
        },
        skills_section: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of skills section relevance and format" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for skills" }
          },
          additionalProperties: false
        },
        work_experience: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of work experience section" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for experience" }
          },
          additionalProperties: false
        },
        ats_compatibility: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of ATS system compatibility" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for ATS compatibility" }
          },
          additionalProperties: false
        },
        keyword_optimization: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of keyword usage and optimization" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for keywords" }
          },
          additionalProperties: false
        },
        professional_summary: {
          type: "object",
          required: ["score", "status", "message", "suggestions"],
          properties: {
            score: { type: "number", maximum: 100, minimum: 0, description: "Score from 0 to 100" },
            status: { enum: ["pass", "warning", "fail"], type: "string", description: "Assessment status" },
            message: { type: "string", description: "Assessment of professional summary effectiveness" },
            suggestions: { type: "array", items: { type: "string" }, description: "specific improvements for summary" }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    overall_summary: {
      type: "object",
      required: ["issues", "warnings", "total_checks", "overall_score", "passed_checks"],
      properties: {
        issues: { type: "number", description: "number of critical issues" },
        warnings: { type: "number", description: "number of warnings" },
        total_checks: { type: "number", description: "total number of checks performed" },
        overall_score: { type: "number", maximum: 100, minimum: 0, description: "overall score from 0 to 100" },
        passed_checks: { type: "number", description: "number of passed checks" }
      },
      additionalProperties: false
    },
    missing_elements: {
      type: "array",
      items: { type: "string" },
      description: "Important elements that are missing from the resume"
    },
    user_informations: {
      type: "object",
      required: ["age", "education", "graduationDate", "university", "workHistory", "gender", "courses", "skills", "location", "gdp"],
      properties: {
        age: { type: ["number", "null"], minimum: 0, description: "User's age" },
        gdp: { type: ["number", "null"], description: "GDP information (optional)" },
        gender: { type: ["string", "null"], description: "User's gender" },
        skills: { type: ["array", "null"], items: { type: "string" }, description: "List of user's skills" },
        courses: { type: ["array", "null"], items: { type: "string" }, description: "List of courses taken" },
        location: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              required: ["city", "country"],
              properties: {
                city: { type: ["string", "null"], description: "City name" },
                country: { type: ["string", "null"], description: "Country name" }
              },
              additionalProperties: false
            }
          ]
        },
        education: { enum: ["high school", "bachelor", "phd", null], type: ["string", "null"], description: "Education level" },
        university: { type: ["string", "null"], description: "University name and department/profession" },
        workHistory: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              required: ["experienceYears", "jobCount"],
              properties: {
                jobCount: { type: ["number", "null"], minimum: 0, description: "Total number of jobs held" },
                experienceYears: { type: ["number", "null"], minimum: 0, description: "Total years of work experience" }
              },
              additionalProperties: false
            }
          ]
        },
        graduationDate: { type: ["string", "null"], description: "Graduation date (e.g., '2020-05-15')" }
      },
      additionalProperties: false
    },
    industry_specific_tips: {
      type: "array",
      items: { type: "string" },
      description: "Tips specific to the candidates industry"
    },
    improvement_recommendations: {
      type: "object",
      required: ["low_priority", "high_priority", "medium_priority"],
      properties: {
        low_priority: { type: "array", items: { type: "string" }, description: "Nice-to-have enhancements" },
        high_priority: { type: "array", items: { type: "string" }, description: "Critical issues that must be fixed" },
        medium_priority: { type: "array", items: { type: "string" }, description: "Important improvements that should be made" }
      },
      additionalProperties: false
    },
    original_cv_sections: {
      type: "array",
      items: {
        type: "object",
        required: ["section_name", "content", "order"],
        properties: {
          section_name: { type: "string", description: "Name of the CV section (e.g., 'Professional Summary', 'Work Experience', 'Education', 'Skills')" },
          content: { type: "string", description: "Original content of the section exactly as found in the CV" },
          order: { type: "number", description: "Order of the section in the original CV (1-based)" }
        },
        additionalProperties: false
      },
      description: "Original CV sections extracted from the uploaded document, preserving the user's content and structure"
    },
    cv_header: {
      type: "object",
      required: ["name", "title", "email", "phone", "location", "linkedin", "github", "website"],
      properties: {
        name: { type: "string", description: "Full name exactly as it appears in the CV" },
        title: { type: "string", description: "Professional title/role exactly as it appears in the CV" },
        email: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "Email address if found in CV, null otherwise" 
        },
        phone: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "Phone number if found in CV, null otherwise" 
        },
        location: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "Location/address if found in CV, null otherwise" 
        },
        linkedin: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "LinkedIn profile if found in CV, null otherwise" 
        },
        github: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "GitHub profile if found in CV, null otherwise" 
        },
        website: { 
          anyOf: [
            { type: "string" },
            { type: "null" }
          ],
          description: "Personal website if found in CV, null otherwise" 
        }
      },
      additionalProperties: false,
      description: "Header information from the CV including name, title, and contact details"
    }
  },
  additionalProperties: false
};

export class OpenAIService {
  private client: OpenAIClient;

  constructor(client: OpenAIClient) {
    this.client = client;
  }

  /**
   * Create a streaming chat completion for real-time CV improvement
   */
  async createStreamingChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      console.log('🔍 Starting streaming chat completion');
      
      const request = {
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature || 0.5,
        max_tokens: options.max_tokens || 800,
        response_format: { type: 'json_object' as const },
        stream: true,
      };

      console.log('🚀 Sending streaming request to OpenAI');
      
      const stream = await this.client.createStreamingChatCompletion(request);
      
      console.log('✅ Streaming response received from OpenAI');
      
      return stream;
    } catch (error) {
      console.error('❌ OpenAI streaming chat error:', error);
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`Streaming chat failed: ${error.message}`);
    }
  }

  /**
   * Analyze PDF file directly using OpenAI Responses API
   */
  async analyzeCVFromPDF(fileUrl: string): Promise<ComprehensiveCVAnalysisResponse> {
    try {
      console.log('🔍 Starting OpenAI Responses API PDF analysis', { 
        fileUrl: fileUrl.substring(0, 100) + '...' 
      });

      // Create the request for OpenAI Responses API
      const request: OpenAIResponsesRequest = {
        model: 'gpt-4.1',
        instructions: CV_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.3,
        max_output_tokens: 4000,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                file_url: fileUrl
              },
              {
                type: 'input_text',
                text: 'Please analyze this CV/resume file and provide detailed feedback using the format specified in the instructions.'
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'resume_analysis_response',
            schema: CV_ANALYSIS_SCHEMA,
            strict: true
          }
        }
      };

      // Make OpenAI request
      const response = await this.client.createResponse(request);

      console.log('🔍 Raw OpenAI Responses API response structure:', {
        hasOutput: !!(response as any).output,
        outputLength: (response as any).output?.length,
        responseKeys: Object.keys(response),
        fullResponse: JSON.stringify(response, null, 2).substring(0, 1000) + '...'
      });

      // Extract and parse response using the correct Responses API structure
      let content: string | undefined;
      const responseData = response as any;
      
      if (responseData?.output && responseData.output.length > 0) {
        // Find the assistant message with text content
        const assistantMessage = responseData.output.find((item: any) => 
          item.type === 'message' && item.role === 'assistant'
        );
        
        if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
          const textContent = assistantMessage.content?.find((content: any) => 
            content.type === 'output_text'
          );
          
          if (textContent && textContent.text) {
            content = textContent.text;
          }
        }
      }

      if (!content) {
        console.error('❌ No content found in OpenAI Responses API response');
        console.error('Full response structure:', JSON.stringify(responseData, null, 2));
        throw new Error('No content in OpenAI Responses API response');
      }

      console.log('🔍 OpenAI Responses API response received', { 
        length: content.length,
        preview: content.substring(0, 200) + '...'
      });

      // Parse the JSON response (should be structured already due to strict schema)
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.error('Content length:', content.length);
        console.error('Content around error position:');
        
        // Try to show context around the error
        const errorPos = parseError.message.match(/position (\d+)/);
        if (errorPos) {
          const pos = parseInt(errorPos[1]);
          const start = Math.max(0, pos - 100);
          const end = Math.min(content.length, pos + 100);
          console.error('Context:', content.substring(start, end));
          console.error('Error at position:', pos, 'Character:', content[pos]);
        }
        
        // Log the full content for debugging (only first and last parts to avoid huge logs)
        console.error('First 500 chars:', content.substring(0, 500));
        console.error('Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
        
        // Try to find and fix common JSON issues
        let fixedContent = content.trim();
        
        // Remove markdown code blocks if present
        if (fixedContent.startsWith('```json') || fixedContent.startsWith('```')) {
          console.log('⚠️ Removing markdown code blocks');
          fixedContent = fixedContent.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any potential trailing commas
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
        
        // Remove any non-JSON content before first {
        const firstBrace = fixedContent.indexOf('{');
        if (firstBrace > 0) {
          console.log('⚠️ Removing content before first brace');
          fixedContent = fixedContent.substring(firstBrace);
        }
        
        // Remove any non-JSON content after last }
        const lastBrace = fixedContent.lastIndexOf('}');
        if (lastBrace >= 0 && lastBrace < fixedContent.length - 1) {
          console.log('⚠️ Removing content after last brace');
          fixedContent = fixedContent.substring(0, lastBrace + 1);
        }
        
        // Clean up any weird characters that might break JSON
        fixedContent = fixedContent
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\r\n/g, '\n') // Normalize line endings
          .replace(/\r/g, '\n');
        
        // Try parsing the fixed content
        try {
          console.log('🔧 Attempting to parse fixed JSON...');
          analysis = JSON.parse(fixedContent);
          console.log('✅ Successfully parsed fixed JSON');
        } catch (secondError) {
          console.error('❌ Still failed to parse after fixes:', secondError);
          throw new Error(`Failed to parse JSON response even after fixes: ${parseError.message}`);
        }
      }
      
      // Log the parsed analysis structure for debugging
      console.log('🔍 Parsed analysis structure:', {
        keys: Object.keys(analysis),
        hasDetailedChecks: !!analysis.detailed_checks,
        hasOverallSummary: !!analysis.overall_summary,
        hasUserInfo: !!analysis.user_informations
      });
      
      // Validate the response structure
      if (!analysis || typeof analysis !== 'object') {
        console.error('❌ Analysis is not an object:', typeof analysis);
        throw new Error('Invalid analysis response structure');
      }

      return analysis as ComprehensiveCVAnalysisResponse;

    } catch (error) {
      console.error('❌ OpenAI Responses API PDF analysis failed:', error);
      
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`CV PDF analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze CV text and return structured feedback (legacy method)
   */
  async analyzeCVText(cvText: string): Promise<CVAnalysisResponse> {
    try {
      // Sanitize input
      const sanitizedText = sanitizeTextInput(cvText, 50000);

      // Create prompt
      const messages = [
        {
          role: 'system' as const,
          content: CV_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: `Please analyze the following CV and provide detailed feedback:\n\n${sanitizedText}`,
        },
      ];

      // Make OpenAI request
      const response = await this.client.createChatCompletion({
        ...OPENAI_CONFIGS.CV_ANALYSIS,
        messages,
      });

      // Extract and parse response
      const content = extractResponseContent(response);
      
      // Log raw response for debugging
      console.log('🔍 Raw OpenAI response length:', content.length);
      console.log('🔍 Raw OpenAI response preview:', content.substring(0, 200) + '...');
      
      return parseCVAnalysisResponse(content);

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`CV analysis failed: ${error.message}`);
    }
  }

  /**
   * Edit a specific CV section with AI improvements
   */
  async editCVSection(
    sectionName: string,
    currentContent: string,
    feedback: string,
    suggestions: string,
    additionalContext?: string
  ): Promise<SectionEditResponse> {
    try {
      // Sanitize inputs
      const sanitizedSectionName = sanitizeTextInput(sectionName, 100);
      const sanitizedContent = sanitizeTextInput(currentContent, 5000);
      const sanitizedFeedback = sanitizeTextInput(feedback, 2000);
      const sanitizedSuggestions = sanitizeTextInput(suggestions, 2000);
      const sanitizedContext = additionalContext 
        ? sanitizeTextInput(additionalContext, 2000) 
        : undefined;

      // Create prompt
      const messages = createSectionEditPrompt(
        sanitizedSectionName,
        sanitizedContent,
        sanitizedFeedback,
        sanitizedSuggestions,
        sanitizedContext
      );

      // Make OpenAI request
      const response = await this.client.createChatCompletion({
        ...OPENAI_CONFIGS.SECTION_EDIT,
        messages,
      });

      // Extract and parse response
      const content = extractResponseContent(response);
      return parseSectionEditResponse(content);

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`Section editing failed: ${error.message}`);
    }
  }

  /**
   * Generate chat questions for gathering additional information
   */
  async generateChatQuestions(
    sectionName: string,
    currentContent: string,
    suggestions: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<ChatResponse> {
    try {
      // Sanitize inputs
      const sanitizedSectionName = sanitizeTextInput(sectionName, 100);
      const sanitizedContent = sanitizeTextInput(currentContent, 5000);
      const sanitizedSuggestions = sanitizeTextInput(suggestions, 2000);

      // Sanitize conversation history
      const sanitizedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: sanitizeTextInput(msg.content, 1000),
      }));

      // Create prompt
      const messages = createChatPrompt(
        sanitizedSectionName,
        sanitizedContent,
        sanitizedSuggestions,
        sanitizedHistory
      );

      // Make OpenAI request
      const response = await this.client.createChatCompletion({
        ...OPENAI_CONFIGS.CHAT,
        messages,
      });

      // Extract and parse response
      const content = extractResponseContent(response);
      return parseChatResponse(content);

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`Chat generation failed: ${error.message}`);
    }
  }

  /**
   * Edit CV section with chat context
   */
  async editSectionWithContext(
    sectionName: string,
    currentContent: string,
    feedback: string,
    suggestions: string,
    chatContext: Array<{ role: string; content: string }>
  ): Promise<SectionEditResponse> {
    try {
      // Sanitize inputs
      const sanitizedSectionName = sanitizeTextInput(sectionName, 100);
      const sanitizedContent = sanitizeTextInput(currentContent, 5000);
      const sanitizedFeedback = sanitizeTextInput(feedback, 2000);
      const sanitizedSuggestions = sanitizeTextInput(suggestions, 2000);

      // Sanitize chat context
      const sanitizedContext = chatContext.map(msg => ({
        role: msg.role,
        content: sanitizeTextInput(msg.content, 1000),
      }));

      // Create prompt
      const messages = createContextualEditPrompt(
        sanitizedSectionName,
        sanitizedContent,
        sanitizedFeedback,
        sanitizedSuggestions,
        sanitizedContext
      );

      // Make OpenAI request
      const response = await this.client.createChatCompletion({
        ...OPENAI_CONFIGS.SECTION_EDIT,
        messages,
      });

      // Extract and parse response
      const content = extractResponseContent(response);
      return parseSectionEditResponse(content);

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof OpenAIError) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error(`Contextual section editing failed: ${error.message}`);
    }
  }
}

/**
 * Create OpenAI service instance
 */
export async function createOpenAIService(): Promise<OpenAIService> {
  const client = await createOpenAIClient();
  return new OpenAIService(client);
}

/**
 * Handle OpenAI service errors and return appropriate HTTP responses
 */
export function handleOpenAIError(error: Error): Response {
  console.error('OpenAI service error:', error);

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        type: 'validation_error',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error instanceof OpenAIRateLimitError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        type: 'rate_limit_error',
        retry_after: error.retryAfter,
      }),
      {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          ...(error.retryAfter && { 'Retry-After': error.retryAfter.toString() }),
        },
      }
    );
  }

  if (error instanceof OpenAITimeoutError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Request timed out. Please try again.',
        type: 'timeout_error',
      }),
      {
        status: 408,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error instanceof OpenAIError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
        type: 'ai_service_error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Generic error
  return new Response(
    JSON.stringify({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      type: 'internal_error',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Export error types for use in Edge Functions
export {
  OpenAIError,
  OpenAIRateLimitError,
  OpenAITimeoutError,
  ValidationError,
};