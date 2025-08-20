/**
 * Session Validation Utilities
 * Provides functions for validating and sanitizing session data
 */

export interface SessionData {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates if a string is a valid UUID format
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/**
 * Checks if a session has expired based on its last activity
 */
export function isSessionExpired(
  lastActivity: string, 
  expiryTimeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): boolean {
  if (!lastActivity || typeof lastActivity !== 'string') {
    return true;
  }

  try {
    const lastActivityDate = new Date(lastActivity);
    if (isNaN(lastActivityDate.getTime())) {
      return true;
    }

    const now = new Date();
    const timeDiff = now.getTime() - lastActivityDate.getTime();
    return timeDiff > expiryTimeMs;
  } catch {
    return true;
  }
}

/**
 * Generates a new UUID v4 session ID
 */
export function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Sanitizes session data by removing extra fields and ensuring required fields exist
 */
export function sanitizeSessionData(data: any): SessionData {
  if (!data || typeof data !== 'object') {
    const now = new Date().toISOString();
    return {
      sessionId: generateSessionId(),
      createdAt: now,
      lastActivity: now,
    };
  }

  const now = new Date().toISOString();
  
  return {
    sessionId: validateSessionId(data.sessionId) ? data.sessionId : generateSessionId(),
    createdAt: data.createdAt && typeof data.createdAt === 'string' ? data.createdAt : now,
    lastActivity: data.lastActivity && typeof data.lastActivity === 'string' ? data.lastActivity : now,
  };
}

/**
 * Validates complete session data structure and content
 */
export function validateSessionData(
  data: any, 
  expiryTimeMs: number = 24 * 60 * 60 * 1000
): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Session data is required'],
    };
  }

  // Validate session ID
  if (!data.sessionId) {
    errors.push('Missing session ID');
  } else if (!validateSessionId(data.sessionId)) {
    errors.push('Invalid session ID format');
  }

  // Validate createdAt
  if (!data.createdAt) {
    errors.push('Missing createdAt');
  } else {
    try {
      const createdDate = new Date(data.createdAt);
      if (isNaN(createdDate.getTime())) {
        errors.push('Invalid createdAt format');
      }
    } catch {
      errors.push('Invalid createdAt format');
    }
  }

  // Validate lastActivity
  if (!data.lastActivity) {
    errors.push('Missing lastActivity');
  } else {
    try {
      const activityDate = new Date(data.lastActivity);
      if (isNaN(activityDate.getTime())) {
        errors.push('Invalid lastActivity format');
      } else if (isSessionExpired(data.lastActivity, expiryTimeMs)) {
        errors.push('Session has expired');
      }
    } catch {
      errors.push('Invalid lastActivity format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if session data is valid and not expired
 */
export function isValidSession(data: any): boolean {
  const validation = validateSessionData(data);
  return validation.isValid;
}

/**
 * Updates the last activity timestamp for a session
 */
export function updateSessionActivity(sessionData: SessionData): SessionData {
  return {
    ...sessionData,
    lastActivity: new Date().toISOString(),
  };
}