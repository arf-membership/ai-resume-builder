/**
 * Security Configuration
 * Centralized security settings and constants
 * Requirements: 9.1, 9.2
 */

export const SECURITY_CONFIG = {
  // File upload security
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf'],
    ALLOWED_EXTENSIONS: ['.pdf'],
    VIRUS_SCAN_TIMEOUT: 5000, // 5 seconds
    ENABLE_VIRUS_SCANNING: true,
    ENABLE_MALWARE_DETECTION: true,
    ENABLE_CONTENT_VALIDATION: true,
  },

  // Input sanitization
  INPUT_SANITIZATION: {
    MAX_TEXT_LENGTH: 10000,
    MAX_FILENAME_LENGTH: 255,
    MAX_SESSION_ID_LENGTH: 100,
    STRIP_WHITESPACE: true,
    PREVENT_XSS: true,
    ALLOWED_HTML_TAGS: [], // No HTML allowed by default
  },

  // Session management
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    INACTIVITY_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
    MAX_SESSIONS_PER_BROWSER: 5,
    ENABLE_ENCRYPTION: false, // Set to true in production with proper key
    ENCRYPTION_KEY: '', // Set in production
  },

  // Rate limiting
  RATE_LIMITING: {
    UPLOAD: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 5,
    },
    ANALYSIS: {
      WINDOW_MS: 10 * 60 * 1000, // 10 minutes
      MAX_REQUESTS: 3,
    },
    EDIT_SECTION: {
      WINDOW_MS: 5 * 60 * 1000, // 5 minutes
      MAX_REQUESTS: 10,
    },
    CHAT: {
      WINDOW_MS: 1 * 60 * 1000, // 1 minute
      MAX_REQUESTS: 20,
    },
    PDF_GENERATION: {
      WINDOW_MS: 10 * 60 * 1000, // 10 minutes
      MAX_REQUESTS: 5,
    },
    API_GENERAL: {
      WINDOW_MS: 1 * 60 * 1000, // 1 minute
      MAX_REQUESTS: 60,
    },
  },

  // CORS settings
  CORS: {
    ALLOWED_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://*.vercel.app',
      'https://*.netlify.app',
    ],
    ALLOW_CREDENTIALS: false,
    MAX_AGE: 86400, // 24 hours
  },

  // Security headers
  HEADERS: {
    ENABLE_HSTS: true,
    ENABLE_X_FRAME_OPTIONS: true,
    ENABLE_X_CONTENT_TYPE_OPTIONS: true,
    ENABLE_REFERRER_POLICY: true,
    CONTENT_SECURITY_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  },

  // Validation patterns
  PATTERNS: {
    SESSION_ID: /^session_\d+_[a-z0-9]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  },

  // Error messages (sanitized for user display)
  ERROR_MESSAGES: {
    INVALID_FILE_TYPE: 'Invalid file type. Please upload a PDF file only.',
    FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    INVALID_SESSION: 'Invalid or expired session. Please refresh the page.',
    SECURITY_VIOLATION: 'Security validation failed. Please try again.',
    MALICIOUS_CONTENT: 'File contains potentially malicious content.',
    INVALID_INPUT: 'Invalid input data provided.',
  },

  // Monitoring and logging
  MONITORING: {
    LOG_SECURITY_EVENTS: true,
    LOG_RATE_LIMIT_VIOLATIONS: true,
    LOG_FILE_UPLOAD_ATTEMPTS: true,
    LOG_FAILED_VALIDATIONS: true,
    ALERT_ON_MULTIPLE_VIOLATIONS: true,
    MAX_VIOLATIONS_BEFORE_ALERT: 5,
  },
} as const;

/**
 * Get security configuration with environment overrides
 */
export function getSecurityConfig() {
  return {
    ...SECURITY_CONFIG,
    // Override with environment variables if available
    FILE_UPLOAD: {
      ...SECURITY_CONFIG.FILE_UPLOAD,
      MAX_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760'),
      ENABLE_VIRUS_SCANNING: import.meta.env.VITE_ENABLE_VIRUS_SCANNING !== 'false',
    },
    SESSION: {
      ...SECURITY_CONFIG.SESSION,
      MAX_AGE: parseInt(import.meta.env.VITE_SESSION_MAX_AGE || '86400000'),
      ENABLE_ENCRYPTION: import.meta.env.VITE_ENABLE_SESSION_ENCRYPTION === 'true',
      ENCRYPTION_KEY: import.meta.env.VITE_SESSION_ENCRYPTION_KEY || '',
    },
    CORS: {
      ...SECURITY_CONFIG.CORS,
      ALLOWED_ORIGINS: import.meta.env.VITE_CORS_ORIGINS?.split(',') || SECURITY_CONFIG.CORS.ALLOWED_ORIGINS,
    },
  };
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config = getSecurityConfig()) {
  const errors: string[] = [];

  // Validate file upload settings
  if (config.FILE_UPLOAD.MAX_SIZE <= 0) {
    errors.push('Invalid file upload max size');
  }

  if (config.FILE_UPLOAD.ALLOWED_TYPES.length === 0) {
    errors.push('No allowed file types specified');
  }

  // Validate session settings
  if (config.SESSION.MAX_AGE <= 0) {
    errors.push('Invalid session max age');
  }

  if (config.SESSION.ENABLE_ENCRYPTION && !config.SESSION.ENCRYPTION_KEY) {
    errors.push('Encryption enabled but no encryption key provided');
  }

  // Validate rate limiting settings
  Object.entries(config.RATE_LIMITING).forEach(([key, settings]) => {
    if (settings.WINDOW_MS <= 0 || settings.MAX_REQUESTS <= 0) {
      errors.push(`Invalid rate limiting settings for ${key}`);
    }
  });

  // Validate CORS settings
  if (config.CORS.ALLOWED_ORIGINS.length === 0) {
    errors.push('No CORS origins specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default SECURITY_CONFIG;