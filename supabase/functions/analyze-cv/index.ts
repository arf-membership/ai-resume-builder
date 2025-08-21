/**
 * CV Analysis Edge Function
 * Processes uploaded CVs, extracts text, analyzes with OpenAI, and stores results
 * Requirements: 2.3, 2.4, 2.5, 9.2
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
import { 
  handleSecureCorsPreflightRequest,
  addSecurityHeaders,
  validateRequestHeaders,
  sanitizeRequestHeaders,
  createSecureErrorResponse,
  createSecureSuccessResponse
} from '../_shared/security-headers.ts';
import { 
  ServerRateLimiter,
  withServerRateLimit,
  extractClientIP
} from '../_shared/rate-limiter.ts';

interface AnalysisRequest {
  resumeId: string;
  pdfPath: string;
}

interface AnalysisResponse {
  resumeId: string;
  analysis: {
    overall_score: number;
    summary: string;
    structured_content: {
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
      professional_summary?: string;
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

  // Validate structured_content
  if (!analysis.structured_content || typeof analysis.structured_content !== 'object') {
    return false;
  }

  const sc = analysis.structured_content;
  
  // Validate personal_info
  if (!sc.personal_info || typeof sc.personal_info !== 'object' ||
      !sc.personal_info.name || typeof sc.personal_info.name !== 'string' ||
      !sc.personal_info.title || typeof sc.personal_info.title !== 'string' ||
      !sc.personal_info.contact || typeof sc.personal_info.contact !== 'object') {
    return false;
  }

  // Validate arrays in structured_content
  if (!Array.isArray(sc.experience) || !Array.isArray(sc.education) || 
      !Array.isArray(sc.certifications)) {
    return false;
  }

  // Validate skills object
  if (!sc.skills || typeof sc.skills !== 'object' ||
      !Array.isArray(sc.skills.technical) || !Array.isArray(sc.skills.soft) ||
      !Array.isArray(sc.skills.languages)) {
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

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Handle CORS preflight with security headers
    if (req.method === 'OPTIONS') {
      return handleSecureCorsPreflightRequest(req);
    }

    // Validate request method
    validateRequestMethod(req, ['POST']);

    // Validate request headers for security
    const headerValidation = validateRequestHeaders(req);
    if (!headerValidation.isValid) {
      return createSecureErrorResponse(
        `Invalid request headers: ${headerValidation.errors.join(', ')}`,
        400,
        req
      );
    }

    // Sanitize request headers
    const sanitizedHeaders = sanitizeRequestHeaders(req);

    // Parse and validate request body
    let requestBody;
    try {
      const bodyText = await req.text();
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      requestBody = JSON.parse(bodyText);
    } catch (error) {
      log('error', 'Request body parsing failed', { error: error.message });
      if (error.message === 'Request body is empty') {
        throw error;
      }
      throw new Error('Invalid JSON in request body');
    }
    
    const { resumeId, pdfPath: originalPdfPath }: AnalysisRequest = requestBody;

    // Validate required fields with input sanitization
    if (!resumeId || typeof resumeId !== 'string' || resumeId.trim().length === 0) {
      throw new Error('resumeId is required and must be a non-empty string');
    }

    // Sanitize resumeId (should be UUID format)
    const sanitizedResumeId = resumeId.replace(/[^a-f0-9-]/gi, '');
    if (sanitizedResumeId.length !== resumeId.length) {
      throw new Error('Invalid resumeId format');
    }

    // Extract session ID
    const sessionId = extractSessionId(req);
    log('info', 'Processing CV analysis request', { sessionId, resumeId: sanitizedResumeId });

    // Load configuration
    const config = loadConfig();

    // Initialize rate limiter
    const rateLimiter = new ServerRateLimiter(config.supabaseUrl, config.supabaseServiceKey);

    // Apply rate limiting
    const { result, rateLimitResult } = await withServerRateLimit(
      rateLimiter,
      req,
      sessionId,
      'ANALYZE_CV',
      async () => {
        return { resumeId: sanitizedResumeId, pdfPath: originalPdfPath };
      }
    );

    if (!rateLimitResult.allowed) {
      const response = createSecureErrorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        req
      );
      
      // Add rate limit headers
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', '3'); // ANALYZE_CV max requests
      headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
      if (rateLimitResult.retryAfter) {
        headers.set('Retry-After', Math.ceil(rateLimitResult.retryAfter / 1000).toString());
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    const { resumeId: validatedResumeId, pdfPath: requestPdfPath } = result!;



    // Create Supabase client
    const supabaseClient = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    );

    // Verify resume access and get PDF path
    const { pdfPath: verifiedPdfPath } = await measureExecutionTime(
      () => verifyResumeAccess(supabaseClient, validatedResumeId, sessionId),
      'Resume verification'
    );

    // Use provided pdfPath or verified path
    const finalPdfPath = requestPdfPath || verifiedPdfPath;

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
      resumeId: validatedResumeId,
      textLength: cvText.length 
    });

    const analysis = await measureExecutionTime(
      () => openaiService.analyzeCVText(cvText),
      'OpenAI CV analysis'
    );

    // Store analysis results in database
    await measureExecutionTime(
      () => storeAnalysisResults(supabaseClient, validatedResumeId, sessionId, analysis),
      'Store analysis results'
    );

    // Prepare response
    const responseData: AnalysisResponse = {
      resumeId: validatedResumeId,
      analysis
    };

    log('info', 'CV analysis completed successfully', { 
      sessionId, 
      resumeId: validatedResumeId,
      overallScore: analysis.overall_score,
      sectionsCount: analysis.sections.length,
      atsScore: analysis.ats_compatibility.score
    });

    // Return success response with security headers
    const response = createSecureSuccessResponse(
      responseData, 
      200, 
      req
    );
    
    // Add rate limit headers to success response
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', '3'); // ANALYZE_CV max requests
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());

    return new Response(response.body, {
      status: response.status,
      headers,
    });

  } catch (error) {
    log('error', 'CV analysis failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Create secure error response
    let errorMessage = 'An error occurred during CV analysis';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Sanitize error message to prevent information leakage
      if (error.message.includes('Rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message.includes('validation')) {
        errorMessage = 'Invalid request data';
        statusCode = 400;
      } else if (error.message.includes('OpenAI')) {
        errorMessage = 'AI service temporarily unavailable';
        statusCode = 503;
      }
    }
    
    return createSecureErrorResponse(errorMessage, statusCode, req);
  }
});