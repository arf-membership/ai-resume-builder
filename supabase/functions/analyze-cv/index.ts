/**
 * CV Analysis Edge Function
 * Processes uploaded CVs, extracts text, analyzes with OpenAI, and stores results
 * Requirements: 2.3, 2.4, 2.5, 9.2
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createOpenAIService, handleOpenAIError } from '../_shared/openai-service.ts';
import { extractAndValidatePDFText } from '../_shared/pdf-processor.ts';
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

interface AnalysisRequest {
  resumeId: string;
  pdfPath: string;
}

interface AnalysisResponse {
  resumeId: string;
  analysis: {
    overall_score: number;
    summary: string;
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
  };
}

/**
 * Extract text from PDF using Supabase Storage
 */
async function extractPDFText(supabaseClient: any, pdfPath: string): Promise<string> {
  try {
    log('info', 'Starting PDF text extraction', { pdfPath });

    // Download PDF from Supabase Storage
    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from('originals')
      .download(pdfPath);

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    if (!pdfData) {
      throw new Error('PDF data is empty');
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await pdfData.arrayBuffer();

    // Extract and validate PDF text
    const extractedText = await extractAndValidatePDFText(arrayBuffer);

    log('info', 'PDF text extraction completed', { 
      textLength: extractedText.length,
      pdfPath 
    });

    return extractedText;

  } catch (error) {
    log('error', 'PDF text extraction failed', { 
      error: error.message, 
      pdfPath 
    });
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

/**
 * Validate analysis result structure
 */
function validateAnalysisResult(analysis: any): boolean {
  if (!analysis || typeof analysis !== 'object') {
    return false;
  }

  // Check required fields
  if (typeof analysis.overall_score !== 'number' || 
      analysis.overall_score < 0 || 
      analysis.overall_score > 100) {
    return false;
  }

  if (!analysis.summary || typeof analysis.summary !== 'string') {
    return false;
  }

  if (!Array.isArray(analysis.sections)) {
    return false;
  }

  // Validate sections
  for (const section of analysis.sections) {
    if (!section.section_name || typeof section.section_name !== 'string' ||
        typeof section.score !== 'number' || section.score < 0 || section.score > 100 ||
        !section.content || typeof section.content !== 'string' ||
        !section.feedback || typeof section.feedback !== 'string' ||
        !section.suggestions || typeof section.suggestions !== 'string') {
      return false;
    }
  }

  // Validate ATS compatibility
  if (!analysis.ats_compatibility || 
      typeof analysis.ats_compatibility.score !== 'number' ||
      analysis.ats_compatibility.score < 0 || 
      analysis.ats_compatibility.score > 100 ||
      !analysis.ats_compatibility.feedback || 
      typeof analysis.ats_compatibility.feedback !== 'string' ||
      !analysis.ats_compatibility.suggestions || 
      typeof analysis.ats_compatibility.suggestions !== 'string') {
    return false;
  }

  return true;
}

/**
 * Store analysis results in database
 */
async function storeAnalysisResults(
  supabaseClient: any, 
  resumeId: string, 
  sessionId: string,
  analysis: any
): Promise<void> {
  try {
    log('info', 'Storing analysis results', { resumeId, sessionId });

    // Validate analysis structure
    if (!validateAnalysisResult(analysis)) {
      throw new Error('Invalid analysis result structure');
    }

    // Update resume record with analysis results
    const { error: updateError } = await supabaseClient
      .from('resumes')
      .update({ 
        analysis_json: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', resumeId)
      .eq('user_session_id', sessionId);

    if (updateError) {
      throw new Error(`Failed to store analysis results: ${updateError.message}`);
    }

    log('info', 'Analysis results stored successfully', { 
      resumeId, 
      sessionId,
      overallScore: analysis.overall_score,
      sectionsCount: analysis.sections.length
    });

  } catch (error) {
    log('error', 'Failed to store analysis results', { 
      error: error.message, 
      resumeId, 
      sessionId 
    });
    throw error;
  }
}

/**
 * Verify resume exists and belongs to session
 */
async function verifyResumeAccess(
  supabaseClient: unknown, 
  resumeId: string, 
  sessionId: string
): Promise<{ pdfPath: string }> {
  try {
    const { data: resume, error } = await supabaseClient
      .from('resumes')
      .select('original_pdf_path')
      .eq('id', resumeId)
      .eq('user_session_id', sessionId)
      .single();

    if (error) {
      throw new Error(`Resume verification failed: ${error.message}`);
    }

    if (!resume) {
      throw new Error('Resume not found or access denied');
    }

    return { pdfPath: resume.original_pdf_path };

  } catch (error) {
    log('error', 'Resume verification failed', { 
      error: error.message, 
      resumeId, 
      sessionId 
    });
    throw error;
  }
}

export default async function handler(req: Request): Promise<Response> {
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
    const requestBody = await req.json();
    const { resumeId, pdfPath }: AnalysisRequest = requestBody;

    // Validate required fields
    if (!resumeId || typeof resumeId !== 'string') {
      return addCorsHeaders(
        createErrorResponse('resumeId is required and must be a string', 400, 'validation_error'),
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

    // Verify resume access and get PDF path
    const { pdfPath: verifiedPdfPath } = await measureExecutionTime(
      () => verifyResumeAccess(supabaseClient, resumeId, sessionId),
      'Resume verification'
    );

    // Use provided pdfPath or verified path
    const finalPdfPath = pdfPath || verifiedPdfPath;

    // Extract text from PDF
    const cvText = await measureExecutionTime(
      () => extractPDFText(supabaseClient, finalPdfPath),
      'PDF text extraction'
    );

    if (!cvText || cvText.trim().length === 0) {
      return addCorsHeaders(
        createErrorResponse('No text could be extracted from the PDF', 400, 'extraction_error'),
        req
      );
    }

    // Create OpenAI service and analyze CV
    const openaiService = await createOpenAIService();
    
    log('info', 'Starting OpenAI CV analysis', { 
      sessionId, 
      resumeId,
      textLength: cvText.length 
    });

    const analysis = await measureExecutionTime(
      () => openaiService.analyzeCVText(cvText),
      'OpenAI CV analysis'
    );

    // Store analysis results in database
    await measureExecutionTime(
      () => storeAnalysisResults(supabaseClient, resumeId, sessionId, analysis),
      'Store analysis results'
    );

    // Prepare response
    const responseData: AnalysisResponse = {
      resumeId,
      analysis
    };

    log('info', 'CV analysis completed successfully', { 
      sessionId, 
      resumeId,
      overallScore: analysis.overall_score,
      sectionsCount: analysis.sections.length,
      atsScore: analysis.ats_compatibility.score
    });

    // Return success response
    const response = createSuccessResponse(
      responseData, 
      200, 
      'CV analysis completed successfully'
    );
    return addCorsHeaders(response, req);

  } catch (error) {
    log('error', 'CV analysis failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    const errorResponse = handleOpenAIError(error);
    return addCorsHeaders(errorResponse, req);
  }
}

// Deno Deploy configuration
export const config = {
  path: '/analyze-cv',
};