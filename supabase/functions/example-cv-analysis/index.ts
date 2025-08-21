/**
 * Example Edge Function demonstrating OpenAI integration utilities
 * This function shows how to use the shared OpenAI utilities for CV analysis
 */

import { createOpenAIService, handleOpenAIError } from '../_shared/openai-service.ts';
import { 
  handleCorsPreflightRequest, 
  addCorsHeaders, 
  createSuccessResponse,
  validateRequestMethod,
  extractSessionId,
  log 
} from '../_shared/config.ts';

interface AnalysisRequest {
  cvText: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest(req);
    }

    // Validate request method
    validateRequestMethod(req, ['POST']);

    // Extract session ID
    const sessionId = extractSessionId(req);
    log('info', 'Processing CV analysis request', { sessionId });

    // Parse request body
    const { cvText }: AnalysisRequest = await req.json();

    if (!cvText || typeof cvText !== 'string') {
      throw new Error('cvText is required and must be a string');
    }

    // Create OpenAI service
    const openaiService = await createOpenAIService();

    // Analyze CV
    log('info', 'Starting CV analysis', { sessionId, textLength: cvText.length });
    const analysis = await openaiService.analyzeCVText(cvText);
    log('info', 'CV analysis completed', { 
      sessionId, 
      overallScore: analysis.overall_score,
      sectionsCount: analysis.sections.length 
    });

    // Return success response
    const response = createSuccessResponse(analysis, 200, 'CV analysis completed successfully');
    return addCorsHeaders(response, req);

  } catch (error) {
    log('error', 'CV analysis failed', { error: error.message });
    const errorResponse = handleOpenAIError(error);
    return addCorsHeaders(errorResponse, req);
  }
});