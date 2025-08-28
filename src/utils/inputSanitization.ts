/**
 * Input Sanitization Utilities
 * Provides comprehensive input validation and sanitization for user inputs
 * Requirements: 9.1, 9.2
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowedTags?: string[];
  stripWhitespace?: boolean;
  preventXSS?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

/**
 * Sanitize text input to prevent XSS and other injection attacks
 */
export function sanitizeTextInput(
  input: string,
  options: SanitizationOptions = {}
): string {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 10000,
    allowHtml = false,
    allowedTags = [],
    stripWhitespace = true,
    preventXSS = true,
  } = options;

  let sanitized = input;

  // Strip whitespace if requested
  if (stripWhitespace) {
    sanitized = sanitized.trim();
  }

  // Prevent XSS attacks
  if (preventXSS) {
    if (allowHtml) {
      // Use DOMPurify for HTML content
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      });
    } else {
      // Escape HTML entities for plain text
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
  }

  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove null bytes and other dangerous characters
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Validate and sanitize user input with comprehensive rules
 */
export function validateAndSanitizeInput(
  input: string,
  rules: ValidationRule = {},
  sanitizationOptions: SanitizationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  
  // Check if input is required
  if (rules.required && (!input || input.trim().length === 0)) {
    errors.push('This field is required');
    return {
      isValid: false,
      sanitizedValue: '',
      errors,
    };
  }

  // Sanitize the input
  const sanitizedValue = sanitizeTextInput(input, sanitizationOptions);

  // Validate minimum length
  if (rules.minLength && sanitizedValue.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }

  // Validate maximum length
  if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }

  // Validate pattern
  if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
    errors.push('Input format is invalid');
  }

  // Custom validation
  if (rules.customValidator && !rules.customValidator(sanitizedValue)) {
    errors.push('Input validation failed');
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
  };
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 * Supports Turkish characters (ç, ğ, ı, ö, ş, ü) and other international characters
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'file';
  }

  // Map Turkish characters to their ASCII equivalents for better compatibility
  const turkishCharMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G', 
    'ı': 'i', 'I': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
    // Add other common international characters
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O',
    'ú': 'u', 'ù': 'u', 'û': 'u',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U',
    'ñ': 'n', 'Ñ': 'N'
    // Turkish characters already defined above
  };

  return filename
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    // Remove null bytes and control characters
    .replace(/[\x00-\x1f]/g, '')
    // Remove dangerous characters but keep safe punctuation
    .replace(/[<>:"|?*]/g, '')
    // Convert Turkish and international characters to ASCII equivalents
    .replace(/./g, (char) => turkishCharMap[char] || char)
    // Now only remove truly problematic characters, keeping alphanumeric, dots, hyphens, underscores, and spaces
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '')
    // Replace multiple spaces with single spaces
    .replace(/\s+/g, ' ')
    // Replace spaces with underscores for better file system compatibility
    .replace(/\s/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_{2,}/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[._]+|[._]+$/g, '')
    // Ensure it's not empty and has reasonable length
    .substring(0, 100) // Limit length to prevent issues
    || 'file';
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: string): ValidationResult {
  const rules: ValidationRule = {
    required: true,
    pattern: /^session_\d+_[a-z0-9]+$/,
  };

  return validateAndSanitizeInput(sessionId, rules, {
    maxLength: 100,
    stripWhitespace: true,
    preventXSS: true,
  });
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): ValidationResult {
  const rules: ValidationRule = {
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  };

  return validateAndSanitizeInput(uuid, rules, {
    maxLength: 36,
    stripWhitespace: true,
    preventXSS: true,
  });
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const rules: ValidationRule = {
    required: true,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };

  return validateAndSanitizeInput(email, rules, {
    stripWhitespace: true,
    preventXSS: true,
  });
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  const rules: ValidationRule = {
    required: true,
    maxLength: 2048,
    customValidator: (value: string) => {
      try {
        const urlObj = new URL(value);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    },
  };

  return validateAndSanitizeInput(url, rules, {
    stripWhitespace: true,
    preventXSS: true,
  });
}

/**
 * Sanitize JSON input to prevent injection attacks
 */
export function sanitizeJsonInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeTextInput(input, { preventXSS: true });
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeJsonInput(item));
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeTextInput(key, { 
        maxLength: 100, 
        preventXSS: true 
      });
      sanitized[sanitizedKey] = sanitizeJsonInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Rate limiting key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return sanitizeTextInput(key, {
    maxLength: 200,
    stripWhitespace: true,
    preventXSS: true,
  }).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Validate file upload parameters
 */
export interface FileValidationOptions {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
}

export function validateFileUpload(
  file: File,
  options: FileValidationOptions
): ValidationResult {
  const errors: string[] = [];

  // Validate file size
  if (file.size > options.maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${options.maxSize / (1024 * 1024)}MB`);
  }

  // Validate file type
  if (!options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Validate file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!options.allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name);

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedFilename,
    errors,
  };
}

export default {
  sanitizeTextInput,
  validateAndSanitizeInput,
  sanitizeFilename,
  validateSessionId,
  validateUUID,
  validateEmail,
  validateUrl,
  sanitizeJsonInput,
  sanitizeRateLimitKey,
  validateFileUpload,
};