/**
 * OpenAI service for CV analysis and improvement
 * This module provides high-level functions for CV processing using OpenAI API
 */

import { 
  createOpenAIClient, 
  OpenAIClient, 
  OpenAIError,
  OpenAIRateLimitError,
  OpenAITimeoutError 
} from './openai-client.ts';
import {
  createAnalysisPrompt,
  createSectionEditPrompt,
  createChatPrompt,
  createContextualEditPrompt,
  extractResponseContent,
  OPENAI_CONFIGS,
} from './prompt-utils.ts';
import {
  parseCVAnalysisResponse,
  parseSectionEditResponse,
  parseChatResponse,
  sanitizeTextInput,
  validateScore,
  ValidationError,
  type CVAnalysisResponse,
  type SectionEditResponse,
  type ChatResponse,
} from './response-parser.ts';

/**
 * OpenAI service class for CV operations
 */
export class OpenAIService {
  private client: OpenAIClient;

  constructor(client: OpenAIClient) {
    this.client = client;
  }

  /**
   * Analyze CV text and return structured feedback
   */
  async analyzeCVText(cvText: string): Promise<CVAnalysisResponse> {
    try {
      // Sanitize input
      const sanitizedText = sanitizeTextInput(cvText, 50000);

      // Create prompt
      const messages = createAnalysisPrompt(sanitizedText);

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