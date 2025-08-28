/**
 * PDF Generation Edge Function
 * Converts HTML content to downloadable PDF format using Gotenberg
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

// Gotenberg API endpoint
const GOTENBERG_API_URL = 'https://gotenberg.arfitect.com/forms/chromium/convert/html';

interface GeneratePDFRequest {
  resumeId: string;
  htmlContent: string;
}

interface GeneratePDFResponse {
  resumeId: string;
  signedUrl: string;
  generatedPdfPath: string;
}

/**
 * Convert HTML content to PDF using Gotenberg API
 */
async function convertHtmlToPdf(htmlContent: string): Promise<Uint8Array> {
  try {
    log('info', 'Starting HTML to PDF conversion using Gotenberg');

    // Log incoming HTML content for debugging
    log('info', 'Received HTML content', { 
      htmlLength: htmlContent.length,
      hasDoctype: htmlContent.toLowerCase().includes('<!doctype'),
      hasHtml: htmlContent.toLowerCase().includes('<html'),
      preview: htmlContent.substring(0, 200)
    });

    // Ensure HTML is a complete document
    let completeHtml = htmlContent;
    if (!htmlContent.toLowerCase().includes('<!doctype') && !htmlContent.toLowerCase().includes('<html')) {
      log('info', 'Adding HTML wrapper to content');
      completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced CV</title>
    <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          line-height: 1.6; 
          color: #333;
          background: white;
        }
        * {
          visibility: visible !important;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    }

    // Validate HTML content
    if (completeHtml.length < 50) {
      throw new Error('HTML content is too short or empty');
    }

    log('info', 'HTML content prepared', { htmlLength: completeHtml.length });

    // Prepare form data for Gotenberg API
    const formData = new FormData();
    
    // Create a Blob from the HTML string and append it as index.html
    const htmlBlob = new Blob([completeHtml], { type: 'text/html' });
    formData.append('index.html', htmlBlob, 'index.html');
    
    // Add paper format options
    formData.append('paperWidth', '8.27'); // A4 width in inches
    formData.append('paperHeight', '11.69'); // A4 height in inches
    formData.append('marginTop', '0.5');
    formData.append('marginBottom', '0.5');
    formData.append('marginLeft', '0.5');
    formData.append('marginRight', '0.5');

    // Send request to Gotenberg API
    const gotenbergResponse = await fetch(GOTENBERG_API_URL, {
      method: 'POST',
      body: formData
    });

    if (!gotenbergResponse.ok) {
      const errorText = await gotenbergResponse.text();
      log('error', 'Gotenberg API error', { 
        status: gotenbergResponse.status, 
        statusText: gotenbergResponse.statusText,
        errorText 
      });
      throw new Error(`Gotenberg API error: ${gotenbergResponse.status} ${gotenbergResponse.statusText}`);
    }

    const pdfBuffer = await gotenbergResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    log('info', 'PDF generated successfully using Gotenberg', { sizeBytes: pdfBytes.length });
    return pdfBytes;

  } catch (error) {
    log('error', 'Failed to convert HTML to PDF', { error: error.message });
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}


/**
 * Upload generated PDF to storage
 */
async function uploadGeneratedPDF(
  supabaseClient: any,
  sessionId: string,
  resumeId: string,
  pdfBytes: Uint8Array
): Promise<{ filePath: string; signedUrl: string }> {
  try {
    const timestamp = Date.now();
    const filename = `enhanced_cv_${resumeId}_${timestamp}.pdf`;
    const filePath = `${sessionId}/${filename}`;

    log('info', 'Uploading generated PDF', { filePath, sizeBytes: pdfBytes.length });

    // Upload to generated bucket
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('generated')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload generated PDF: ${uploadError.message}`);
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('generated')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    log('info', 'Generated PDF uploaded successfully', { 
      filePath, 
      signedUrl: signedUrlData.signedUrl 
    });

    return {
      filePath,
      signedUrl: signedUrlData.signedUrl
    };

  } catch (error) {
    log('error', 'Failed to upload generated PDF', { error: error.message });
    throw error;
  }
}

/**
 * Update resume record with generated PDF path
 */
async function updateResumeRecord(
  supabaseClient: any,
  resumeId: string,
  sessionId: string,
  generatedPdfPath: string
): Promise<void> {
  try {
    log('info', 'Updating resume record', { resumeId, generatedPdfPath });

    const { error: updateError } = await supabaseClient
      .from('resumes')
      .update({ 
        generated_pdf_path: generatedPdfPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', resumeId)
      .eq('user_session_id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update resume record: ${updateError.message}`);
    }

    log('info', 'Resume record updated successfully', { resumeId });

  } catch (error) {
    log('error', 'Failed to update resume record', { error: error.message });
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
    log('info', 'Processing PDF generation request', { sessionId });

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      log('info', 'Raw request body', { bodyText, bodyLength: bodyText.length });
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      requestBody = JSON.parse(bodyText);
      log('info', 'Parsed request body', { requestBody });
    } catch (parseError) {
      log('error', 'Failed to parse request body', { 
        error: parseError.message,
        contentType: req.headers.get('content-type'),
        method: req.method
      });
      return addCorsHeaders(
        createErrorResponse(`Invalid JSON in request body: ${parseError.message}`, 400, 'parse_error'),
        req
      );
    }
    
    const { resumeId, htmlContent }: GeneratePDFRequest = requestBody;

    // Validate required fields
    if (!resumeId || typeof resumeId !== 'string') {
      return addCorsHeaders(
        createErrorResponse('resumeId is required and must be a string', 400, 'validation_error'),
        req
      );
    }

    if (!htmlContent || typeof htmlContent !== 'string') {
      return addCorsHeaders(
        createErrorResponse('htmlContent is required and must be a string', 400, 'validation_error'),
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

    // Convert HTML to PDF
    const pdfBytes = await measureExecutionTime(
      () => convertHtmlToPdf(htmlContent),
      'Convert HTML to PDF'
    );

    // Upload generated PDF to storage
    const { filePath, signedUrl } = await measureExecutionTime(
      () => uploadGeneratedPDF(supabaseClient, sessionId, resumeId, pdfBytes),
      'Upload generated PDF'
    );

    // Update resume record with generated PDF path
    await measureExecutionTime(
      () => updateResumeRecord(supabaseClient, resumeId, sessionId, filePath),
      'Update resume record'
    );

    // Prepare response
    const responseData: GeneratePDFResponse = {
      resumeId,
      signedUrl: signedUrl,
      generatedPdfPath: filePath
    };

    log('info', 'PDF generation completed successfully', { 
      sessionId, 
      resumeId,
      generatedPdfPath: filePath,
      pdfSizeBytes: pdfBytes.length
    });

    // Return success response
    const response = createSuccessResponse(
      responseData, 
      200, 
      'PDF generated successfully'
    );
    return addCorsHeaders(response, req);

  } catch (error) {
    log('error', 'PDF generation failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    const errorResponse = createErrorResponse(
      `PDF generation failed: ${error.message}`,
      500,
      'generation_error'
    );
    return addCorsHeaders(errorResponse, req);
  }
});