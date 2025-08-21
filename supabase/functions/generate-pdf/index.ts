/**
 * PDF Generation Edge Function
 * Converts improved CV content to downloadable PDF format
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';
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

interface GeneratePDFRequest {
  resumeId: string;
  updatedContent?: {
    sections: Array<{
      section_name: string;
      content: string;
      position?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
}

interface GeneratePDFResponse {
  resumeId: string;
  generatedPdfUrl: string;
  generatedPdfPath: string;
}

/**
 * Get resume data and original PDF
 */
async function getResumeData(
  supabaseClient: any, 
  resumeId: string, 
  sessionId: string
): Promise<{ originalPdfPath: string; analysisData: any }> {
  try {
    log('info', 'Fetching resume data', { resumeId, sessionId });

    const { data: resume, error } = await supabaseClient
      .from('resumes')
      .select('original_pdf_path, analysis_json')
      .eq('id', resumeId)
      .eq('user_session_id', sessionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch resume: ${error.message}`);
    }

    if (!resume) {
      throw new Error('Resume not found or access denied');
    }

    return {
      originalPdfPath: resume.original_pdf_path,
      analysisData: resume.analysis_json
    };

  } catch (error) {
    log('error', 'Failed to fetch resume data', { 
      error: error.message, 
      resumeId, 
      sessionId 
    });
    throw error;
  }
}

/**
 * Download original PDF from storage
 */
async function downloadOriginalPDF(
  supabaseClient: any, 
  pdfPath: string
): Promise<ArrayBuffer> {
  try {
    log('info', 'Downloading original PDF', { pdfPath });

    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from('originals')
      .download(pdfPath);

    if (downloadError) {
      throw new Error(`Failed to download original PDF: ${downloadError.message}`);
    }

    if (!pdfData) {
      throw new Error('Original PDF data is empty');
    }

    return await pdfData.arrayBuffer();

  } catch (error) {
    log('error', 'Failed to download original PDF', { 
      error: error.message, 
      pdfPath 
    });
    throw error;
  }
}

/**
 * Create enhanced PDF with updated content
 */
async function createEnhancedPDF(
  originalPdfBuffer: ArrayBuffer,
  updatedContent?: GeneratePDFRequest['updatedContent'],
  analysisData?: any
): Promise<Uint8Array> {
  try {
    log('info', 'Creating enhanced PDF', { 
      hasUpdatedContent: !!updatedContent,
      hasAnalysisData: !!analysisData
    });

    // Load the original PDF
    const originalPdf = await PDFDocument.load(originalPdfBuffer);
    
    // Create a new PDF document
    const enhancedPdf = await PDFDocument.create();
    
    // Copy pages from original PDF
    const pageIndices = originalPdf.getPageIndices();
    const copiedPages = await enhancedPdf.copyPages(originalPdf, pageIndices);
    
    // Add copied pages to the new document
    copiedPages.forEach((page) => {
      enhancedPdf.addPage(page);
    });

    // If we have updated content, overlay it on the PDF
    if (updatedContent && updatedContent.sections.length > 0) {
      await applyContentUpdates(enhancedPdf, updatedContent.sections);
    }

    // Add improvement summary page if analysis data exists
    if (analysisData) {
      await addImprovementSummaryPage(enhancedPdf, analysisData);
    }

    // Serialize the PDF
    const pdfBytes = await enhancedPdf.save();
    
    log('info', 'Enhanced PDF created successfully', { 
      pagesCount: enhancedPdf.getPageCount(),
      sizeBytes: pdfBytes.length
    });

    return pdfBytes;

  } catch (error) {
    log('error', 'Failed to create enhanced PDF', { error: error.message });
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Apply content updates to PDF pages
 */
async function applyContentUpdates(
  pdf: PDFDocument, 
  sections: Array<{
    section_name: string;
    content: string;
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>
): Promise<void> {
  try {
    const pages = pdf.getPages();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    for (const section of sections) {
      if (section.position && pages.length > 0) {
        // For now, apply updates to the first page
        // In a real implementation, you'd need to determine which page each section belongs to
        const page = pages[0];
        const { width, height } = page.getSize();

        // Create a semi-transparent overlay for updated content
        page.drawRectangle({
          x: section.position.x,
          y: height - section.position.y - section.position.height,
          width: section.position.width,
          height: section.position.height,
          color: rgb(1, 1, 0.9), // Light yellow background
          opacity: 0.3,
        });

        // Add updated text (simplified - in reality you'd need proper text wrapping)
        const maxWidth = section.position.width - 10;
        const lines = wrapText(section.content, maxWidth, font, fontSize);
        
        let yOffset = 0;
        for (const line of lines.slice(0, 5)) { // Limit to 5 lines
          page.drawText(line, {
            x: section.position.x + 5,
            y: height - section.position.y - 15 - yOffset,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
          yOffset += fontSize + 2;
        }
      }
    }

    log('info', 'Content updates applied', { sectionsCount: sections.length });

  } catch (error) {
    log('error', 'Failed to apply content updates', { error: error.message });
    // Don't throw here - continue with original PDF if overlay fails
  }
}

/**
 * Simple text wrapping utility
 */
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (textWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, add it anyway
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Add improvement summary page to PDF
 */
async function addImprovementSummaryPage(
  pdf: PDFDocument, 
  analysisData: any
): Promise<void> {
  try {
    const page = pdf.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();
    
    const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
    
    let yPosition = height - 50;

    // Title
    page.drawText('CV Improvement Summary', {
      x: 50,
      y: yPosition,
      size: 20,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Overall score
    page.drawText(`Overall Score: ${analysisData.overall_score}/100`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: titleFont,
      color: rgb(0, 0.5, 0),
    });
    yPosition -= 30;

    // Summary
    if (analysisData.summary) {
      page.drawText('Summary:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      const summaryLines = wrapText(analysisData.summary, width - 100, bodyFont, 10);
      for (const line of summaryLines.slice(0, 8)) {
        page.drawText(line, {
          x: 50,
          y: yPosition,
          size: 10,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
      yPosition -= 20;
    }

    // Section scores
    if (analysisData.sections && analysisData.sections.length > 0) {
      page.drawText('Section Scores:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      for (const section of analysisData.sections.slice(0, 10)) {
        page.drawText(`• ${section.section_name}: ${section.score}/100`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
      }
    }

    log('info', 'Improvement summary page added');

  } catch (error) {
    log('error', 'Failed to add improvement summary page', { error: error.message });
    // Don't throw here - continue without summary page if it fails
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
): Promise<{ filePath: string; publicUrl: string }> {
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

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('generated')
      .getPublicUrl(filePath);

    log('info', 'Generated PDF uploaded successfully', { 
      filePath, 
      publicUrl: urlData.publicUrl 
    });

    return {
      filePath,
      publicUrl: urlData.publicUrl
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
    const requestBody = await req.json();
    const { resumeId, updatedContent }: GeneratePDFRequest = requestBody;

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

    // Get resume data and original PDF path
    const { originalPdfPath, analysisData } = await measureExecutionTime(
      () => getResumeData(supabaseClient, resumeId, sessionId),
      'Get resume data'
    );

    // Download original PDF
    const originalPdfBuffer = await measureExecutionTime(
      () => downloadOriginalPDF(supabaseClient, originalPdfPath),
      'Download original PDF'
    );

    // Create enhanced PDF
    const enhancedPdfBytes = await measureExecutionTime(
      () => createEnhancedPDF(originalPdfBuffer, updatedContent, analysisData),
      'Create enhanced PDF'
    );

    // Upload generated PDF to storage
    const { filePath, publicUrl } = await measureExecutionTime(
      () => uploadGeneratedPDF(supabaseClient, sessionId, resumeId, enhancedPdfBytes),
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
      generatedPdfUrl: publicUrl,
      generatedPdfPath: filePath
    };

    log('info', 'PDF generation completed successfully', { 
      sessionId, 
      resumeId,
      generatedPdfPath: filePath,
      pdfSizeBytes: enhancedPdfBytes.length
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