/**
 * PDF Service for generating and downloading enhanced CVs
 */

import { supabase } from '../lib/supabase';

export interface GeneratePDFRequest {
  resumeId: string;
  htmlContent: string;
}

export interface GeneratePDFResponse {
  resumeId: string;
  signedUrl: string;
  generatedPdfPath: string;
}

/**
 * Generate and download enhanced PDF
 */
export const generateAndDownloadPDF = async (
  resumeId: string,
  sessionId: string,
  htmlContent: string
): Promise<void> => {
  try {
    const requestPayload = {
      resumeId,
      htmlContent
    };
    
    console.log('Starting PDF generation...', { 
      resumeId, 
      sessionId, 
      requestPayload: JSON.stringify(requestPayload),
      payloadSize: JSON.stringify(requestPayload).length
    });

    // Call the generate-pdf edge function using direct fetch
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'x-session-id': sessionId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('Raw response status:', fetchResponse.status);
    console.log('Raw response headers:', Object.fromEntries(fetchResponse.headers.entries()));

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Edge function error response:', errorText);
      throw new Error(`Edge function failed: ${fetchResponse.status} ${fetchResponse.statusText} - ${errorText}`);
    }

    const data = await fetchResponse.json();
    console.log('Edge function response data:', data);

    if (!data || !data.data || !data.data.signedUrl) {
      throw new Error('Invalid response from PDF generation service');
    }

    const responseData: GeneratePDFResponse = data.data;
    console.log('PDF generated successfully:', responseData);

    // Download the generated PDF
    await downloadPDFFromUrl(responseData.signedUrl, `enhanced_cv_${resumeId}.pdf`);

  } catch (error) {
    console.error('PDF generation and download failed:', error);
    throw error;
  }
};

/**
 * Download PDF from URL
 */
const downloadPDFFromUrl = async (url: string, filename: string): Promise<void> => {
  try {
    console.log('Downloading PDF from URL:', url);

    // Fetch the PDF data
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    // Get the blob data
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log('PDF downloaded successfully:', filename);

  } catch (error) {
    console.error('PDF download failed:', error);
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if PDF generation is supported
 */
export const isPDFGenerationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'URL' in window && 'createObjectURL' in window.URL;
};
