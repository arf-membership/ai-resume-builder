/**
 * File Upload Security Validation
 * Provides comprehensive security validation for file uploads including virus scanning simulation
 * Requirements: 9.1, 9.2
 */

export interface FileSecurityResult {
  isSecure: boolean;
  threats: string[];
  warnings: string[];
  sanitizedFilename: string;
}

export interface SecurityScanOptions {
  enableVirusScanning?: boolean;
  enableMalwareDetection?: boolean;
  enableContentValidation?: boolean;
  maxScanTime?: number;
}

/**
 * PDF file signature validation
 */
const PDF_SIGNATURES = [
  [0x25, 0x50, 0x44, 0x46], // %PDF
];

/**
 * Suspicious file patterns that might indicate malicious content
 */
const SUSPICIOUS_PATTERNS = [
  // JavaScript execution patterns
  /javascript:/gi,
  /vbscript:/gi,
  /onload=/gi,
  /onerror=/gi,
  /onclick=/gi,
  
  // Embedded executable patterns
  /\x4d\x5a/g, // MZ header (PE executable)
  /\x7f\x45\x4c\x46/g, // ELF header
  
  // Script injection patterns
  /<script/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

/**
 * Validate file signature matches expected PDF format
 */
function validatePDFSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  
  // Check if file starts with PDF signature
  for (const signature of PDF_SIGNATURES) {
    if (bytes.length >= signature.length) {
      const matches = signature.every((byte, index) => bytes[index] === byte);
      if (matches) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Scan file content for suspicious patterns
 */
function scanForSuspiciousPatterns(buffer: ArrayBuffer): string[] {
  const threats: string[] = [];
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }
  
  return threats;
}

/**
 * Validate PDF structure integrity
 */
function validatePDFStructure(buffer: ArrayBuffer): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  
  // Check for PDF trailer
  if (!text.includes('%%EOF')) {
    warnings.push('PDF file may be corrupted - missing EOF marker');
  }
  
  // Check for xref table
  if (!text.includes('xref')) {
    warnings.push('PDF file may be corrupted - missing xref table');
  }
  
  // Check file size consistency
  if (bytes.length < 100) {
    warnings.push('PDF file is unusually small and may be corrupted');
  }
  
  // Check for embedded files (potential security risk)
  if (text.includes('/EmbeddedFile') || text.includes('/FileAttachment')) {
    warnings.push('PDF contains embedded files which may pose security risks');
  }
  
  // Check for JavaScript (potential security risk)
  if (text.includes('/JavaScript') || text.includes('/JS')) {
    warnings.push('PDF contains JavaScript which may pose security risks');
  }
  
  // Check for forms (potential security risk)
  if (text.includes('/AcroForm') || text.includes('/XFA')) {
    warnings.push('PDF contains interactive forms which may pose security risks');
  }
  
  return {
    isValid: warnings.length === 0 || warnings.every(w => w.includes('may pose security risks')),
    warnings,
  };
}

/**
 * Simulate virus scanning (in production, integrate with actual antivirus API)
 */
async function simulateVirusScanning(
  buffer: ArrayBuffer,
  filename: string,
  options: SecurityScanOptions
): Promise<{ threats: string[]; scanTime: number }> {
  const startTime = Date.now();
  const threats: string[] = [];
  
  // Simulate scanning delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  // Check file size (very large files might be suspicious)
  if (buffer.byteLength > 50 * 1024 * 1024) { // 50MB
    threats.push('File size exceeds recommended limits for PDF documents');
  }
  
  // Check filename for suspicious patterns
  const suspiciousFilenamePatterns = [
    /\.exe$/i,
    /\.scr$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.pif$/i,
    /\.vbs$/i,
    /\.js$/i,
  ];
  
  for (const pattern of suspiciousFilenamePatterns) {
    if (pattern.test(filename)) {
      threats.push(`Suspicious filename pattern: ${pattern.source}`);
    }
  }
  
  // Scan for malicious content patterns
  if (options.enableMalwareDetection) {
    const contentThreats = scanForSuspiciousPatterns(buffer);
    threats.push(...contentThreats);
  }
  
  const scanTime = Date.now() - startTime;
  
  return { threats, scanTime };
}

/**
 * Comprehensive file security validation
 */
export async function validateFileUploadSecurity(
  file: File,
  options: SecurityScanOptions = {}
): Promise<FileSecurityResult> {
  const {
    enableVirusScanning = true,
    enableMalwareDetection = true,
    enableContentValidation = true,
    maxScanTime = 5000,
  } = options;
  
  const threats: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Read file buffer
    const buffer = await file.arrayBuffer();
    
    // Validate file signature
    if (enableContentValidation) {
      if (!validatePDFSignature(buffer)) {
        threats.push('File signature does not match PDF format');
      }
    }
    
    // Validate PDF structure
    if (enableContentValidation) {
      const structureValidation = validatePDFStructure(buffer);
      warnings.push(...structureValidation.warnings);
      
      if (!structureValidation.isValid) {
        threats.push('PDF file structure is invalid or corrupted');
      }
    }
    
    // Perform virus scanning simulation
    if (enableVirusScanning) {
      const scanResult = await Promise.race([
        simulateVirusScanning(buffer, file.name, options),
        new Promise<{ threats: string[]; scanTime: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Scan timeout')), maxScanTime)
        ),
      ]);
      
      threats.push(...scanResult.threats);
    }
    
    // Sanitize filename
    const sanitizedFilename = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
    
    return {
      isSecure: threats.length === 0,
      threats,
      warnings,
      sanitizedFilename,
    };
    
  } catch (error) {
    return {
      isSecure: false,
      threats: [`Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      sanitizedFilename: 'unknown_file.pdf',
    };
  }
}

/**
 * Quick file type validation
 */
export function validateFileType(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = ['application/pdf'];
  const allowedExtensions = ['.pdf'];
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type: ${file.type}. Only PDF files are allowed.`,
    };
  }
  
  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension: ${extension}. Only .pdf files are allowed.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Validate file size limits
 */
export function validateFileSize(
  file: File,
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): { isValid: boolean; error?: string } {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }
  
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File appears to be empty.',
    };
  }
  
  return { isValid: true };
}

/**
 * Generate secure file path for storage
 */
export function generateSecureFilePath(
  sessionId: string,
  originalFilename: string,
  timestamp: number = Date.now()
): string {
  // Sanitize session ID
  const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Sanitize filename
  const sanitizedFilename = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  
  // Generate unique filename with timestamp
  const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
  
  return `${sanitizedSessionId}/${uniqueFilename}`;
}

export default {
  validateFileUploadSecurity,
  validateFileType,
  validateFileSize,
  generateSecureFilePath,
};