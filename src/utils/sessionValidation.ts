/**
 * Session validation and cleanup utilities
 * Handles session expiry, validation, and cleanup mechanisms
 */

import { SESSION_CONFIG, SESSION_STORAGE_KEYS } from './session';

export interface SessionValidationResult {
  isValid: boolean;
  reason?: 'expired' | 'invalid_format' | 'missing_data' | 'storage_error';
  remainingTime?: number; // in milliseconds
}

/**
 * Session validation utilities
 */
export class SessionValidator {
  /**
   * Validates the current session comprehensively
   */
  static validateCurrentSession(): SessionValidationResult {
    try {
      // Check if localStorage is available
      if (!this.isStorageAvailable()) {
        return {
          isValid: false,
          reason: 'storage_error'
        };
      }

      const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
      const createdAt = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_CREATED_AT);
      const lastActivity = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY);

      // Check if all required session data exists
      if (!sessionId || !createdAt || !lastActivity) {
        return {
          isValid: false,
          reason: 'missing_data'
        };
      }

      // Validate session ID format
      if (!this.isValidSessionIdFormat(sessionId)) {
        return {
          isValid: false,
          reason: 'invalid_format'
        };
      }

      // Check session expiry
      const expiryCheck = this.checkSessionExpiry(lastActivity);
      if (!expiryCheck.isValid) {
        return expiryCheck;
      }

      return {
        isValid: true,
        remainingTime: expiryCheck.remainingTime
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return {
        isValid: false,
        reason: 'storage_error'
      };
    }
  }

  /**
   * Checks if a session has expired based on last activity
   */
  static checkSessionExpiry(lastActivity: string): SessionValidationResult {
    try {
      const lastActivityDate = new Date(lastActivity);
      const now = Date.now();
      const expiryTime = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;
      const timeSinceActivity = now - lastActivityDate.getTime();

      if (timeSinceActivity > expiryTime) {
        return {
          isValid: false,
          reason: 'expired',
          remainingTime: 0
        };
      }

      return {
        isValid: true,
        remainingTime: expiryTime - timeSinceActivity
      };
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return {
        isValid: false,
        reason: 'storage_error'
      };
    }
  }

  /**
   * Validates session ID format
   */
  static isValidSessionIdFormat(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== 'string') {
      return false;
    }
    
    // Check for UUID format (with or without hyphens)
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    const fallbackRegex = /^session-[a-z0-9]+-[a-z0-9]+$/i;
    
    return uuidRegex.test(sessionId) || fallbackRegex.test(sessionId);
  }

  /**
   * Checks if localStorage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Session cleanup utilities
 */
export class SessionCleanup {
  /**
   * Performs cleanup of expired or invalid sessions
   */
  static performCleanup(): void {
    try {
      const validation = SessionValidator.validateCurrentSession();
      
      if (!validation.isValid) {
        this.clearExpiredSession();
      }

      // Additional cleanup for old data that might be lingering
      this.cleanupOldSessionData();
    } catch (error) {
      console.error('Error performing session cleanup:', error);
    }
  }

  /**
   * Clears expired session data
   */
  static clearExpiredSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_CREATED_AT);
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY);
      
      console.log('Expired session data cleared');
    } catch (error) {
      console.error('Error clearing expired session:', error);
    }
  }

  /**
   * Cleans up old session-related data from localStorage
   */
  static cleanupOldSessionData(): void {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      
      // Look for any old session-related keys that might be lingering
      const sessionKeys = keys.filter(key => 
        key.startsWith('cv_platform_') || 
        key.startsWith('session_') ||
        key.includes('session')
      );

      // Clean up any keys that aren't current session keys
      sessionKeys.forEach(key => {
        if (!Object.values(SESSION_STORAGE_KEYS).includes(key as any)) {
          try {
            localStorage.removeItem(key);
            console.log(`Cleaned up old session key: ${key}`);
          } catch (error) {
            console.warn(`Failed to clean up key ${key}:`, error);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up old session data:', error);
    }
  }

  /**
   * Schedules automatic cleanup to run periodically
   */
  static schedulePeriodicCleanup(): () => void {
    // Run cleanup every hour
    const cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000); // 1 hour

    // Return cleanup function to clear the interval
    return () => {
      clearInterval(cleanupInterval);
    };
  }
}

/**
 * Session monitoring utilities
 */
export class SessionMonitor {
  private static listeners: Array<(isValid: boolean) => void> = [];

  /**
   * Adds a listener for session validity changes
   */
  static addValidityListener(callback: (isValid: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifies all listeners of session validity change
   */
  static notifyValidityChange(isValid: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isValid);
      } catch (error) {
        console.error('Error in session validity listener:', error);
      }
    });
  }

  /**
   * Starts monitoring session validity
   */
  static startMonitoring(): () => void {
    // Check session validity every 30 seconds
    const monitorInterval = setInterval(() => {
      const validation = SessionValidator.validateCurrentSession();
      
      if (!validation.isValid) {
        this.notifyValidityChange(false);
        SessionCleanup.clearExpiredSession();
      }
    }, 30 * 1000); // 30 seconds

    // Return cleanup function
    return () => {
      clearInterval(monitorInterval);
    };
  }
}