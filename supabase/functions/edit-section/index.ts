/**
 * Section Edit Edge Function
 * Handles AI-powered section improvements with OpenAI integration
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createOpenAIService, handleOpenAIError } from '../_shared/openai-service.ts';
import { 
  handleCorsPreflightRequest, 
  addCorsHeaders, 
  createSuccessResponse,
  createErrorResponse,
  validateRequestMethod,
  extractSessionId,
  loadConfig,
  log,
  measureExecutionTime
} from '../_shared/config.ts';

interface SectionEditRequest {
  resumeId: string;
  sectionName: string;
  currentContent: string;
  suggestions: string;
  additionalContext?: string;
}

interface SectionEditResponse {
  updatedSection: {
    section_name: string;
    score: number;
    content: string;
    feedback: string;
    suggestions: string;
  };
  updatedScore: number;
  message: string;
}

/**
 * Verify resume exists and belongs to session
 */
async function verifyResumeAccess(
  supabaseClient: any, 
  resumeId: string, 
  sessionId: string
): Promise<{ analysisData: any }> {
  try {
    const { data: resume, error } = await supabaseClient
      .from('resumes')
      .select('analysis_json')
      .eq('id', resumeId)
      .eq('user_session_id', sessionId)
      .single();

    if (error) {
      throw new Error(`Resume verification failed: ${error.message}`);
    }

    if (!resume) {
      throw new Error('Resume not found or access denied');
    }

    if (!resume.analysis_json) {
      throw new Error('Resume analysis not found. Please analyze the CV first.');
    }

    return { analysisData: resume.analysis_json };

  } catch (error) {
    log('error', 'Resume verification failed', { 
      error: error.message, 
      resumeId, 
      sessionId 
    });
    throw error;
  }
}

/**
 * Find section in analysis data
 */
function findSection(analysisData: any, sectionName: string): any {
  if (!analysisData.sections || !Array.isArray(analysisData.sections)) {
    throw new Error('Invalid analysis data structure');
  }

  const section = analysisData.sections.find(
    (s: any) => s.section_name === sectionName
  );

  if (!section) {
    throw new Error(`Section "${sectionName}" not found in analysis data`);
  }

  return section;
}

/**
 * Update analysis data with new section content
 */
async function updateAnalysisData(
  supabaseClient: any,
  resumeId: string,
  sessionId: string,
  sectionName: string,
  updatedSection: any
): Promise<void> {
  try {
    log('info', 'Updating analysis data', { resumeId, sessionId, sectionName });

    // Get current analysis data
    const { data: resume, error: fetchError } = await supabaseClient
      .from('resumes')
      .select('analysis_json')
      .eq('id', resumeId)
      .eq('user_session_id', sessionId)
      .single();

    if (fetchError || !resume) {
      throw new Error('Failed to fetch current analysis data');
    }

    const analysisData = resume.analysis_json;

    // Update the specific section
    const sectionIndex = analysisData.sections.findIndex(
      (s: any) => s.section_name === sectionName
    );

    if (sectionIndex === -1) {
      throw new Error(`Section "${sectionName}" not found`);
    }

    analysisData.sections[sectionIndex] = updatedSection;

    // Recalculate overall score (simple average for now)
    const totalScore = analysisData.sections.reduce(
      (sum: number, section: any) => sum + section.score, 
      0
    );
    analysisData.overall_score = Math.round(totalScore / analysisData.sections.length);

    // Update database
    const { error: updateError } = await supabaseClient
      .from('resumes')
      .update({ 
        analysis_json: analysisData,
        updated_at: new Date().toISOString()
      })
      .eq('id', resumeId)
      .eq('user_session_id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update analysis data: ${updateError.message}`);
    }

    log('info', 'Analysis data updated successfully', { 
      resumeId, 
      sessionId,
      sectionName,
      newScore: updatedSection.score,
      newOverallScore: analysisData.overall_score
    });

  } catch (error) {
    log('error', 'Failed to update analysis data', { 
      error: error.message, 
      resumeId, 
      sessionId,
      sectionName
    });
    throw error;
  }
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
    log('info', 'Processing section edit request', { sessionId });

    // Parse request body
    const requestBody = await req.json();
    const { 
      resumeId, 
      sectionName, 
      currentContent, 
      suggestions, 
      additionalContext 
    }: SectionEditRequest = requestBody;

    // Validate required fields
    if (!resumeId || typeof resumeId !== 'string') {
      return addCorsHeaders(
        createErrorResponse('resumeId is required and must be a string', 400, 'validation_error'),
        req
      );
    }

    if (!sectionName || typeof sectionName !== 'string') {
      return addCorsHeaders(
        createErrorResponse('sectionName is required and must be a string', 400, 'validation_error'),
        req
      );
    }

    if (!currentContent || typeof currentContent !== 'string') {
      return addCorsHeaders(
        createErrorResponse('currentContent is required and must be a string', 400, 'validation_error'),
        req
      );
    }

    if (!suggestions || typeof suggestions !== 'string') {
      return addCorsHeaders(
        createErrorResponse('suggestions is required and must be a string', 400, 'validation_error'),
        req
      );
    }

    // Load configuration
    const config = loadConfig();

    // Create Supabase client
    const supabaseClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    );

    // Verify resume access and get analysis data
    const { analysisData } = await measureExecutionTime(
      () => verifyResumeAccess(supabaseClient, resumeId, sessionId),
      'Resume verification'
    );

    // Find the section in analysis data
    const originalSection = findSection(analysisData, sectionName);

    // Create OpenAI service and edit section
    const openaiService = await createOpenAIService();
    
    log('info', 'Starting OpenAI section editing', { 
      sessionId, 
      resumeId,
      sectionName,
      contentLength: currentContent.length 
    });

    const editResult = await measureExecutionTime(
      () => openaiService.editCVSection(
        sectionName,
        currentContent,
        originalSection.feedback,
        suggestions,
        additionalContext
      ),
      'OpenAI section editing'
    );

    // Create updated section object
    const updatedSection = {
      section_name: sectionName,
      score: editResult.score,
      content: editResult.content,
      feedback: editResult.feedback,
      suggestions: editResult.suggestions
    };

    // Update analysis data in database
    await measureExecutionTime(
      () => updateAnalysisData(supabaseClient, resumeId, sessionId, sectionName, updatedSection),
      'Update analysis data'
    );

    // Prepare response
    const responseData: SectionEditResponse = {
      updatedSection,
      updatedScore: editResult.score,
      message: 'Section updated successfully'
    };

    log('info', 'Section editing completed successfully', { 
      sessionId, 
      resumeId,
      sectionName,
      oldScore: originalSection.score,
      newScore: editResult.score
    });

    // Return success response
    const response = createSuccessResponse(
      responseData, 
      200, 
      'Section editing completed successfully'
    );
    return addCorsHeaders(response, req);

  } catch (error) {
    log('error', 'Section editing failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    const errorResponse = handleOpenAIError(error);
    return addCorsHeaders(errorResponse, req);
  }
});