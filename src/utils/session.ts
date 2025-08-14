/**
 * Session management utilities for the CV improvement platform
 * Handles session ID generation, validation, and cleanup
 */

/**
 * Generates a unique session ID using crypto.randomUUID()
 * Falls back to timestamp-based ID if crypto is not available
 */
export function generateSessionId(): string {
  try {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: Generate UUID v4-like string manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  } catch (error) {
    // Ultimate fallback: timestamp + random
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `session-${timestamp}-${random}`;
  }
}

/**
 * Validates if a session ID has the correct format
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check for UUID format (with or without hyphens)
  const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  const fallbackRegex = /^session-[a-z0-9]+-[a-z0-9]+$/i;
  
  return uuidRegex.test(sessionId) || fallbackRegex.test(sessionId);
}

/**
 * Session storage keys
 */
export const SESSION_STORAGE_KEYS = {
  SESSION_ID: 'cv_platform_session_id',
  SESSION_CREATED_AT: 'cv_platform_session_created_at',
  SESSION_LAST_ACTIVITY: 'cv_platform_session_last_activity',
} as const;

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  // Session expires after 24 hours of inactivity
  EXPIRY_HOURS: 24,
  // Clean up sessions older than 7 days
  CLEANUP_DAYS: 7,
} as const;