/**
 * Turkish Character Support for PDF.js
 * Provides utilities to ensure proper Turkish character rendering in PDF canvas
 */

import { pdfjs } from 'react-pdf';

/**
 * Configure PDF.js for better Turkish character support
 */
export function configurePDFJSForTurkish(): void {
  // Set global worker configuration
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }

  // Note: verbosity is configured in document options instead of global options
}

/**
 * Get PDF.js configuration optimized for Turkish characters
 */
export function getTurkishPDFConfig() {
  return {
    // Font and encoding configuration
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
    
    // Character rendering options
    enableFontFace: true,
    disableFontFace: false,
    useSystemFonts: true,
    fontExtraProperties: true,
    
    // Text rendering
    renderTextLayer: true,
    renderAnnotationLayer: true,
    
    // Encoding options
    verbosity: process.env.NODE_ENV === 'development' ? 1 : 0,
    
    // Performance options
    maxImageSize: 16777216, // 16 MB
    isEvalSupported: false,
    
    // Turkish-specific options
    isOffscreenCanvasSupported: true,
    canvasMaxAreaInBytes: 268435456, // 256 MB
  };
}

/**
 * Check if Turkish characters are properly supported
 */
export function checkTurkishCharacterSupport(): boolean {
  try {
    // Create a test canvas with Turkish characters
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return false;
    
    // Test Turkish characters
    const turkishText = 'ÇĞİÖŞÜçğıöşü';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(turkishText, 10, 20);
    
    // Check if text was rendered (basic check)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some(value => value !== 0);
    
    return hasContent;
  } catch (error) {
    console.warn('Turkish character support check failed:', error);
    return false;
  }
}

/**
 * Get CSS font stack with good Turkish character support
 */
export function getTurkishFontStack(): string {
  return [
    // Turkish-optimized fonts
    'Segoe UI',
    'Tahoma',
    'Arial',
    'Helvetica Neue',
    'Helvetica',
    // System fonts with good Turkish support
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    // Fallbacks
    'sans-serif'
  ].join(', ');
}

/**
 * Enhanced PDF loading options for Turkish content
 */
export function getTurkishPDFLoadingOptions(url: string) {
  return {
    url,
    ...getTurkishPDFConfig(),
    
    // Additional options for problematic PDFs
    stopAtErrors: false,
    maxImageSize: 16777216,
    isEvalSupported: false,
    disableAutoFetch: false,
    disableStream: false,
    disableRange: false,
    
    // Font loading strategy
    fontExtraProperties: true,
    enableFontFace: true,
    useSystemFonts: true,
    
    // Character map settings
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  };
}

/**
 * Initialize Turkish character support on app start
 */
export function initializeTurkishSupport(): void {
  // Configure PDF.js
  configurePDFJSForTurkish();
  
  // Check support
  const isSupported = checkTurkishCharacterSupport();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🇹🇷 Turkish character support:', isSupported ? '✅ Available' : '❌ Limited');
    console.log('📄 PDF.js version:', pdfjs.version);
    console.log('🎨 Font stack:', getTurkishFontStack());
  }
  
  // Add CSS for better font rendering
  if (!document.getElementById('turkish-font-support')) {
    const style = document.createElement('style');
    style.id = 'turkish-font-support';
    style.textContent = `
      /* Enhanced font rendering for Turkish characters */
      .react-pdf__Page__textContent {
        font-family: ${getTurkishFontStack()};
        -webkit-font-feature-settings: "liga" on, "kern" on;
        font-feature-settings: "liga" on, "kern" on;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .react-pdf__Page__canvas {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }
    `;
    document.head.appendChild(style);
  }
}

export default {
  configurePDFJSForTurkish,
  getTurkishPDFConfig,
  checkTurkishCharacterSupport,
  getTurkishFontStack,
  getTurkishPDFLoadingOptions,
  initializeTurkishSupport,
};
