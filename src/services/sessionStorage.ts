/**
 * Browser storage service for session persistence
 * Handles localStorage operations with error handling and validation
 */

import { 
  generateSessionId, 
  isValidSessionId, 
  SESSION_STORAGE_KEYS, 
  SESSION_CONFIG 
} from '../utils/session';

export interface SessionData {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
}

/**
 * Session storage service class
 */
export class SessionStorageService {
  /**
   * Retrieves the current session from localStorage
   * Returns null if no valid session exists
   */
  static getCurrentSession(): SessionData | null {
    try {
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_ID);
      const createdAt = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_CREATED_AT);
      const lastActivity = localStorage.getItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY);

      if (!sessionId || !createdAt || !lastActivity) {
        return null;
      }

      if (!isValidSessionId(sessionId)) {
        this.clearSession();
        return null;
      }

      // Check if session has expired
      const lastActivityDate = new Date(lastActivity);
      const expiryTime = SESSION_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000; // Convert to milliseconds
      
      if (Date.now() - lastActivityDate.getTime() > expiryTime) {
        this.clearSession();
        return null;
      }

      return {
        sessionId,
        createdAt,
        lastActivity,
      };
    } catch (error) {
      console.error('Error retrieving session from localStorage:', error);
      return null;
    }
  }

  /**
   * Creates a new session and stores it in localStorage
   */
  static createNewSession(): SessionData {
    try {
      const sessionId = generateSessionId();
      const now = new Date().toISOString();
      
      const sessionData: SessionData = {
        sessionId,
        createdAt: now,
        lastActivity: now,
      };

      localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_ID, sessionId);
      localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_CREATED_AT, now);
      localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY, now);

      return sessionData;
    } catch (error) {
      console.error('Error creating new session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Updates the last activity timestamp for the current session
   */
  static updateLastActivity(): void {
    try {
      const currentSession = this.getCurrentSession();
      if (currentSession) {
        const now = new Date().toISOString();
        localStorage.setItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY, now);
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Clears the current session from localStorage
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_CREATED_AT);
      localStorage.removeItem(SESSION_STORAGE_KEYS.SESSION_LAST_ACTIVITY);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Gets or creates a session, ensuring one always exists
   */
  static getOrCreateSession(): SessionData {
    const existingSession = this.getCurrentSession();
    if (existingSession) {
      this.updateLastActivity();
      return existingSession;
    }
    
    return this.createNewSession();
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