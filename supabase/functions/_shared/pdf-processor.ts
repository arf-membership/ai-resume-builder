/**
 * PDF processing utilities for text extraction
 * This module provides PDF text extraction functionality for CV analysis
 */

import { log } from './config.ts';

/**
 * PDF text extraction result
 */
export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

/**
 * Extract text from PDF buffer using a practical approach for Deno edge functions
 * Uses a combination of stream processing and basic PDF structure parsing
 */
export async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<PDFExtractionResult> {
  try {
    log('info', 'Starting PDF text extraction', { bufferSize: pdfBuffer.byteLength });

    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);

    // Extract text using improved PDF parsing
    const extractedText = await extractTextFromPDFBuffer(uint8Array);

    // Estimate page count based on content length and structure
    const pageCount = estimatePageCount(extractedText);

    const result: PDFExtractionResult = {
      text: extractedText,
      pageCount,
      metadata: {
        title: 'CV Document',
        creator: 'PDF Processor'
      }
    };

    log('info', 'PDF text extraction completed', { 
      textLength: result.text.length,
      pageCount: result.pageCount
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', 'PDF text extraction failed', { error: errorMessage });
    throw new Error(`PDF text extraction failed: ${errorMessage}`);
  }
}

/**
 * Extract text from PDF buffer using basic PDF structure parsing
 * This implementation works with most standard PDF files
 */
async function extractTextFromPDFBuffer(pdfData: Uint8Array): Promise<string> {
  // Check if the data looks like a PDF
  const pdfHeader = new TextDecoder().decode(pdfData.slice(0, 4));
  if (pdfHeader !== '%PDF') {
    throw new Error('Invalid PDF format');
  }

  // Convert to string for text extraction
  const pdfString = new TextDecoder('latin1').decode(pdfData);
  
  // Extract text content using PDF structure patterns
  const textContent: string[] = [];
  
  // Method 1: Extract from stream objects
  const streamMatches = pdfString.match(/stream\s*\n([\s\S]*?)\nendstream/g);
  if (streamMatches) {
    for (const match of streamMatches) {
      const streamContent = match.replace(/^stream\s*\n/, '').replace(/\nendstream$/, '');
      const decodedText = extractTextFromStream(streamContent);
      if (decodedText.trim()) {
        textContent.push(decodedText);
      }
    }
  }
  
  // Method 2: Extract from text objects
  const textMatches = pdfString.match(/\(([^)]+)\)/g);
  if (textMatches) {
    for (const match of textMatches) {
      const text = match.slice(1, -1); // Remove parentheses
      if (isReadableText(text)) {
        textContent.push(text);
      }
    }
  }
  
  // Method 3: Extract from BT/ET blocks (text objects)
  const btMatches = pdfString.match(/BT\s*([\s\S]*?)\s*ET/g);
  if (btMatches) {
    for (const match of btMatches) {
      const content = match.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
      const textFromBT = extractTextFromBTBlock(content);
      if (textFromBT.trim()) {
        textContent.push(textFromBT);
      }
    }
  }
  
  // Combine and clean extracted text
  let extractedText = textContent.join(' ').trim();
  
  // If no text was extracted, try a fallback method
  if (!extractedText) {
    extractedText = fallbackTextExtraction(pdfString);
  }
  
  // Clean up the extracted text
  extractedText = cleanupExtractedText(extractedText);
  
  if (!extractedText || extractedText.length < 50) {
    throw new Error('Could not extract meaningful text from PDF. The PDF might be image-based or encrypted.');
  }
  
  return extractedText;
}

/**
 * Extract text from PDF stream content
 */
function extractTextFromStream(streamContent: string): string {
  try {
    // Look for text commands in the stream
    const textParts: string[] = [];
    
    // Extract text from Tj commands
    const tjMatches = streamContent.match(/\(([^)]*)\)\s*Tj/g);
    if (tjMatches) {
      for (const match of tjMatches) {
        const text = match.match(/\(([^)]*)\)/)?.[1];
        if (text && isReadableText(text)) {
          textParts.push(text);
        }
      }
    }
    
    // Extract text from TJ array commands
    const tjArrayMatches = streamContent.match(/\[(.*?)\]\s*TJ/g);
    if (tjArrayMatches) {
      for (const match of tjArrayMatches) {
        const arrayContent = match.match(/\[(.*?)\]/)?.[1];
        if (arrayContent) {
          const textInArray = arrayContent.match(/\(([^)]*)\)/g);
          if (textInArray) {
            for (const textMatch of textInArray) {
              const text = textMatch.slice(1, -1);
              if (isReadableText(text)) {
                textParts.push(text);
              }
            }
          }
        }
      }
    }
    
    return textParts.join(' ');
  } catch {
    return '';
  }
}

/**
 * Extract text from BT/ET blocks
 */
function extractTextFromBTBlock(content: string): string {
  const textParts: string[] = [];
  
  // Look for text showing commands
  const showTextMatches = content.match(/\(([^)]*)\)\s*(?:Tj|TJ)/g);
  if (showTextMatches) {
    for (const match of showTextMatches) {
      const text = match.match(/\(([^)]*)\)/)?.[1];
      if (text && isReadableText(text)) {
        textParts.push(text);
      }
    }
  }
  
  return textParts.join(' ');
}

/**
 * Fallback text extraction method
 */
function fallbackTextExtraction(pdfString: string): string {
  const textParts: string[] = [];
  
  // Extract any readable text between parentheses
  const allParenthesesMatches = pdfString.match(/\(([^)]{3,})\)/g);
  if (allParenthesesMatches) {
    for (const match of allParenthesesMatches) {
      const text = match.slice(1, -1);
      if (isReadableText(text) && text.length > 2) {
        textParts.push(text);
      }
    }
  }
  
  return textParts.join(' ');
}

/**
 * Check if text appears to be readable content
 */
function isReadableText(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Check for reasonable ratio of letters to total characters
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const totalCount = text.length;
  const letterRatio = letterCount / totalCount;
  
  // Should have at least 50% letters and not be all numbers or symbols
  return letterRatio >= 0.3 && !/^[\d\s\-.,;:()[\]{}]+$/.test(text);
}

/**
 * Clean up extracted text
 */
function cleanupExtractedText(text: string): string {
  return text
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Add proper line breaks for common CV sections
    .replace(/(EDUCATION|EXPERIENCE|SKILLS|SUMMARY|OBJECTIVE|CONTACT|CERTIFICATIONS|PROJECTS|LANGUAGES|ACHIEVEMENTS)/gi, '\n\n$1')
    // Clean up special characters but keep essential punctuation
    .replace(/[^\w\s\-.,;:()[\]@#$%&*+=<>?/\\|"'`~!\n]/g, '')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Estimate page count based on content length
 */
function estimatePageCount(text: string): number {
  // Rough estimation: 3000 characters per page average
  const averageCharsPerPage = 3000;
  return Math.max(1, Math.ceil(text.length / averageCharsPerPage));
}

/**
 * Validate PDF file format
 */
export function validatePDFFormat(buffer: ArrayBuffer): boolean {
  try {
    const uint8Array = new Uint8Array(buffer);
    const header = new TextDecoder().decode(uint8Array.slice(0, 4));
    return header === '%PDF';
  } catch {
    return false;
  }
}

/**
 * Get PDF file size in bytes
 */
export function getPDFSize(buffer: ArrayBuffer): number {
  return buffer.byteLength;
}

/**
 * Check if PDF size is within acceptable limits
 */
export function validatePDFSize(buffer: ArrayBuffer, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  return buffer.byteLength <= maxSizeBytes;
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove problematic special characters but keep common punctuation
    .replace(/[^\w\s\-.,;:()[\]@#$%&*+=<>?/\\|"'`~!]/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Extract text with error handling and validation
 */
export async function extractAndValidatePDFText(
  pdfBuffer: ArrayBuffer,
  maxSizeBytes: number = 10 * 1024 * 1024
): Promise<string> {
  // Validate PDF format
  if (!validatePDFFormat(pdfBuffer)) {
    throw new Error('Invalid PDF format');
  }

  // Validate PDF size
  if (!validatePDFSize(pdfBuffer, maxSizeBytes)) {
    throw new Error(`PDF file too large. Maximum size: ${maxSizeBytes / (1024 * 1024)}MB`);
  }

  // Extract text
  const result = await extractTextFromPDF(pdfBuffer);

  // Validate extracted text
  if (!result.text || result.text.trim().length === 0) {
    throw new Error('No text could be extracted from the PDF');
  }

  // Clean and return text
  const cleanedText = cleanExtractedText(result.text);

  if (cleanedText.length < 50) {
    throw new Error('Extracted text is too short to analyze');
  }

  return cleanedText;
}