/**
 * PDF Generation Service
 * Handles PDF generation requests and download functionality
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { supabase } from '../lib/supabase';
import type { SectionUpdate } from '../types/components';

export interface GeneratePDFRequest {
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

export interface GeneratePDFResponse {
  resumeId: string;
  generatedPdfUrl: string;
  generatedPdfPath: string;
}

export interface PDFGenerationOptions {
  signal?: AbortSignal;
  onProgress?: (progress: { stage: string; percentage: number }) => void;
}

/**
 * PDF Generation Service class
 */
export class PDFGenerationService {
  /**
   * Generate enhanced PDF from current CV state
   */
  static async generatePDF(
    resumeId: string,
    sessionId: string,
    sectionUpdates: SectionUpdate[] = [],
    options: PDFGenerationOptions = {}
  ): Promise<GeneratePDFResponse> {
    const { signal, onProgress } = options;

    try {
      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error('PDF generation was cancelled');
      }

      // Report progress
      onProgress?.({ stage: 'Preparing content', percentage: 10 });

      // Convert section updates to the format expected by the Edge Function
      const updatedContent = sectionUpdates.length > 0 ? {
        sections: sectionUpdates.map(update => ({
          section_name: update.sectionName,
          content: update.newContent,
          position: update.position
        }))
      } : undefined;

      // Prepare request data
      const requestData: GeneratePDFRequest = {
        resumeId,
        updatedContent
      };

      onProgress?.({ stage: 'Generating PDF', percentage: 30 });

      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error('PDF generation was cancelled');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: requestData,
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (error) {
        throw new Error(`PDF generation failed: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'PDF generation failed');
      }

      onProgress?.({ stage: 'PDF ready', percentage: 100 });

      return data.data as GeneratePDFResponse;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('cancelled')) {
          throw new Error('PDF generation was cancelled by user');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred during PDF generation');
    }
  }

  /**
   * Download generated PDF file
   */
  static async downloadPDF(
    pdfUrl: string,
    filename: string = 'enhanced_cv.pdf',
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;

    try {
      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error('Download was cancelled');
      }

      // Fetch the PDF file
      const response = await fetch(pdfUrl, { signal });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }

      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error('Download was cancelled');
      }

      // Get the blob data
      const blob = await response.blob();

      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('cancelled')) {
          throw new Error('Download was cancelled by user');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred during download');
    }
  }

  /**
   * Generate and automatically download PDF
   */
  static async generateAndDownloadPDF(
    resumeId: string,
    sessionId: string,
    sectionUpdates: SectionUpdate[] = [],
    filename: string = 'enhanced_cv.pdf',
    options: PDFGenerationOptions = {}
  ): Promise<void> {
    const { signal, onProgress } = options;

    try {
      // Generate PDF
      const result = await this.generatePDF(
        resumeId,
        sessionId,
        sectionUpdates,
        { 
          signal, 
          onProgress: (progress) => {
            onProgress?.({ ...progress, percentage: progress.percentage * 0.8 });
          }
        }
      );

      // Update progress
      onProgress?.({ stage: 'Starting download', percentage: 85 });

      // Download the generated PDF
      await this.downloadPDF(result.generatedPdfUrl, filename, { signal });

      onProgress?.({ stage: 'Download complete', percentage: 100 });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a resume has a generated PDF
   */
  static async hasGeneratedPDF(resumeId: string, sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('generated_pdf_path')
        .eq('id', resumeId)
        .eq('user_session_id', sessionId)
        .single();

      if (error) {
        return false;
      }

      return !!(data?.generated_pdf_path);

    } catch {
      return false;
    }
  }

  /**
   * Get generated PDF URL if it exists
   */
  static async getGeneratedPDFUrl(resumeId: string, sessionId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('generated_pdf_path')
        .eq('id', resumeId)
        .eq('user_session_id', sessionId)
        .single();

      if (error || !data?.generated_pdf_path) {
        return null;
      }

      // Get public URL for the generated PDF
      const { data: urlData } = supabase.storage
        .from('generated')
        .getPublicUrl(data.generated_pdf_path);

      return urlData.publicUrl;

    } catch {
      return null;
    }
  }

  /**
   * Delete generated PDF (cleanup)
   */
  static async deleteGeneratedPDF(resumeId: string, sessionId: string): Promise<void> {
    try {
      // Get the current generated PDF path
      const { data: resume, error: fetchError } = await supabase
        .from('resumes')
        .select('generated_pdf_path')
        .eq('id', resumeId)
        .eq('user_session_id', sessionId)
        .single();

      if (fetchError || !resume?.generated_pdf_path) {
        return; // Nothing to delete
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('generated')
        .remove([resume.generated_pdf_path]);

      if (deleteError) {
        console.error('Failed to delete generated PDF from storage:', deleteError);
      }

      // Update database record
      const { error: updateError } = await supabase
        .from('resumes')
        .update({ 
          generated_pdf_path: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', resumeId)
        .eq('user_session_id', sessionId);

      if (updateError) {
        console.error('Failed to update resume record:', updateError);
      }

    } catch (error) {
      console.error('Error during PDF cleanup:', error);
      // Don't throw - this is a cleanup operation
    }
  }
}

export default PDFGenerationService;