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
    strengths: string[];
    next_steps: string[];
    detailed_checks: {
      education: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      formatting: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      contact_info: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      skills_section: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      work_experience: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      ats_compatibility: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      keyword_optimization: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
      professional_summary: {
        score: number;
        status: "pass" | "warning" | "fail";
        message: string;
        suggestions: string[];
      };
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
  };
}

/**
 * Create signed URL for PDF file from Supabase Storage
 */
async function createSignedPDFUrl(supabaseClient: any, pdfPath: string): Promise<string> {
  try {
    log('info', 'Creating signed URL for PDF', { pdfPath });

    // Create signed URL for the PDF file (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('originals')
      .createSignedUrl(pdfPath, 3600); // 1 hour expiry

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    if (!signedUrlData?.signedUrl) {
      throw new Error('No signed URL returned from Supabase');
    }

    log('info', 'Signed URL created successfully', { 
      pdfPath,
      urlLength: signedUrlData.signedUrl.length 
    });

    return signedUrlData.signedUrl;

  } catch (error) {
    log('error', 'Signed URL creation failed', { 
      error: error.message, 
      pdfPath 
    });
    throw new Error(`Signed URL creation failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF using Supabase Storage (legacy method)
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
 * Validate analysis result structure for comprehensive schema
 */
function validateAnalysisResult(analysis: any): boolean {
  if (!analysis || typeof analysis !== 'object') {
    console.error('❌ Analysis validation failed: not an object');
    return false;
  }

  // Check required top-level fields
  const requiredFields = ['strengths', 'next_steps', 'detailed_checks', 'overall_summary', 'missing_elements', 'user_informations', 'industry_specific_tips', 'improvement_recommendations'];
  
  for (const field of requiredFields) {
    if (!(field in analysis)) {
      console.error(`❌ Analysis validation failed: missing field '${field}'`);
      return false;
    }
  }

  // Validate strengths and next_steps are arrays
  if (!Array.isArray(analysis.strengths) || !Array.isArray(analysis.next_steps)) {
    console.error('❌ Analysis validation failed: strengths or next_steps not arrays');
    return false;
  }

  // Validate detailed_checks
  if (!analysis.detailed_checks || typeof analysis.detailed_checks !== 'object') {
    console.error('❌ Analysis validation failed: detailed_checks not an object');
    return false;
  }

  const requiredChecks = ['education', 'formatting', 'contact_info', 'skills_section', 'work_experience', 'ats_compatibility', 'keyword_optimization', 'professional_summary'];
  
  for (const checkName of requiredChecks) {
    const check = analysis.detailed_checks[checkName];
    if (!check || typeof check !== 'object') {
      console.error(`❌ Analysis validation failed: missing check '${checkName}'`);
      return false;
    }
    
    if (typeof check.score !== 'number' || check.score < 0 || check.score > 100) {
      console.error(`❌ Analysis validation failed: invalid score for '${checkName}'`);
      return false;
    }
    
    if (!['pass', 'warning', 'fail'].includes(check.status)) {
      console.error(`❌ Analysis validation failed: invalid status for '${checkName}'`);
      return false;
    }
    
    if (typeof check.message !== 'string' || !Array.isArray(check.suggestions)) {
      console.error(`❌ Analysis validation failed: invalid message/suggestions for '${checkName}'`);
      return false;
    }
  }

  // Validate overall_summary
  const summary = analysis.overall_summary;
  if (!summary || typeof summary !== 'object' ||
      typeof summary.overall_score !== 'number' ||
      summary.overall_score < 0 || summary.overall_score > 100 ||
      typeof summary.total_checks !== 'number' ||
      typeof summary.passed_checks !== 'number' ||
      typeof summary.issues !== 'number' ||
      typeof summary.warnings !== 'number') {
    console.error('❌ Analysis validation failed: invalid overall_summary');
    return false;
  }

  // Validate arrays
  if (!Array.isArray(analysis.missing_elements) || 
      !Array.isArray(analysis.industry_specific_tips)) {
    console.error('❌ Analysis validation failed: missing_elements or industry_specific_tips not arrays');
    return false;
  }

  // Validate user_informations
  if (!analysis.user_informations || typeof analysis.user_informations !== 'object') {
    console.error('❌ Analysis validation failed: user_informations not an object');
    return false;
  }

  // Validate improvement_recommendations
  const recommendations = analysis.improvement_recommendations;
  if (!recommendations || typeof recommendations !== 'object' ||
      !Array.isArray(recommendations.high_priority) ||
      !Array.isArray(recommendations.medium_priority) ||
      !Array.isArray(recommendations.low_priority)) {
    console.error('❌ Analysis validation failed: invalid improvement_recommendations');
    return false;
  }

  console.log('✅ Analysis validation passed');
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
      overallScore: analysis.overall_summary.overall_score,
      totalChecks: analysis.overall_summary.total_checks,
      passedChecks: analysis.overall_summary.passed_checks,
      issues: analysis.overall_summary.issues,
      warnings: analysis.overall_summary.warnings
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

    // Create signed URL for PDF file
    const pdfSignedUrl = await measureExecutionTime(
      () => createSignedPDFUrl(supabaseClient, finalPdfPath),
      'PDF signed URL creation'
    );

    // Create OpenAI service and analyze CV using Responses API
    const openaiService = await createOpenAIService();
    
    log('info', 'Starting OpenAI CV analysis with Responses API', { 
      sessionId, 
      resumeId: validatedResumeId,
      pdfPath: finalPdfPath,
      hasSignedUrl: !!pdfSignedUrl
    });

    const analysis = await measureExecutionTime(
      () => openaiService.analyzeCVFromPDF(pdfSignedUrl),
      'OpenAI CV analysis (Responses API)'
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
      overallScore: analysis.overall_summary.overall_score,
      totalChecks: analysis.overall_summary.total_checks,
      passedChecks: analysis.overall_summary.passed_checks,
      issues: analysis.overall_summary.issues,
      warnings: analysis.overall_summary.warnings
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