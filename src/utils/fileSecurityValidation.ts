/**
 * File Upload Security Validation
 * Provides comprehensive security validation for file uploads including virus scanning simulation
 * Requirements: 9.1, 9.2
 */

/**
 * Sanitize filename for security validation - handles Turkish and international characters
 */
function sanitizeFilenameForSecurity(filename: string): string {
  // Map Turkish characters to their ASCII equivalents
  const turkishCharMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G', 
    'ı': 'i', 'I': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
    // Add other common characters
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'ñ': 'n', 'Ñ': 'N'
  };

  return filename
    // Convert Turkish and international characters
    .replace(/./g, (char) => turkishCharMap[char] || char)
    // Remove problematic characters
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'file';
}

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

// Suspicious patterns are now handled in scanForSuspiciousPatterns function for better control

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
  const bytes = new Uint8Array(buffer);
  
  // Check text-based patterns
  const textPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  for (const pattern of textPatterns) {
    if (pattern.test(text)) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }
  
  // Check for executable headers ONLY at the beginning of file (more precise)
  if (bytes.length >= 2) {
    // MZ header at start of file (PE executable)
    if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
      threats.push('File appears to be a Windows executable (MZ header at start)');
    }
  }
  
  if (bytes.length >= 4) {
    // ELF header at start of file (Linux executable)  
    if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
      threats.push('File appears to be a Linux executable (ELF header at start)');
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
    if (contentThreats.length > 0) {
      console.log('⚠️ Content threats detected:', contentThreats);
    }
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
    enableMalwareDetection: _enableMalwareDetection = true,
    enableContentValidation = true,
    maxScanTime = 5000,
  } = options;
  
  const threats: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Sanitize filename early with Turkish character support
    const originalFilename = file.name;
    const sanitizedFilename = sanitizeFilenameForSecurity(originalFilename);
    
    console.log('🔍 Security validation for file:', {
      original: originalFilename,
      sanitized: sanitizedFilename,
      size: file.size,
      type: file.type
    });
    
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
    
    return {
      isSecure: threats.length === 0,
      threats,
      warnings,
      sanitizedFilename, // Use the early sanitized filename
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
  const sanitizedFilename = sanitizeFilenameForSecurity(originalFilename);
  
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