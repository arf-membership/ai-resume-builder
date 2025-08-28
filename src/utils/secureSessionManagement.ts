/**
 * Secure Session Management
 * Enhanced session management with security features and data cleanup
 * Requirements: 9.1, 9.2
 */

import { sanitizeTextInput } from './inputSanitization';

export interface SecureSessionConfig {
  maxAge: number; // Session max age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  encryptionKey?: string; // Optional encryption key for session data
  maxSessions: number; // Maximum concurrent sessions per browser
  inactivityTimeout: number; // Inactivity timeout in milliseconds
}

export interface SessionData {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  userAgent: string;
  fingerprint: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface SessionSecurityInfo {
  isValid: boolean;
  isExpired: boolean;
  isInactive: boolean;
  securityScore: number;
  warnings: string[];
}

const DEFAULT_CONFIG: SecureSessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  maxSessions: 5,
  inactivityTimeout: 2 * 60 * 60 * 1000, // 2 hours
};

/**
 * Generate browser fingerprint for session security
 */
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    canvas.toDataURL(),
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Encrypt session data (simple XOR encryption for demo)
 */
function encryptSessionData(data: string, key: string): string {
  if (!key) return data;
  
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(encrypted);
}

/**
 * Decrypt session data
 */
function decryptSessionData(encryptedData: string, key: string): string {
  if (!key) return encryptedData;
  
  try {
    const encrypted = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return decrypted;
  } catch {
    return encryptedData;
  }
}

/**
 * Secure Session Manager Class
 */
export class SecureSessionManager {
  private config: SecureSessionConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private activityTimer?: NodeJS.Timeout;
  private storageKey = 'secure_cv_sessions';

  constructor(config: Partial<SecureSessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize secure session management
   */
  private initialize(): void {
    this.startCleanupTimer();
    this.startActivityTracking();
    this.setupStorageListener();
    this.cleanupExpiredSessions();
  }

  /**
   * Create a new secure session
   */
  createSession(metadata: Record<string, any> = {}): SessionData {
    const now = new Date().toISOString();
    const sessionId = this.generateSecureSessionId();
    const fingerprint = generateBrowserFingerprint();
    
    const sessionData: SessionData = {
      sessionId,
      createdAt: now,
      lastActivity: now,
      userAgent: sanitizeTextInput(navigator.userAgent, { maxLength: 500 }),
      fingerprint,
      isActive: true,
      metadata: this.sanitizeMetadata(metadata),
    };
    
    this.storeSession(sessionData);
    this.enforceSessionLimits();
    
    return sessionData;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): SessionData | null {
    const sessions = this.getAllSessions();
    const activeSessions = sessions.filter(s => s.isActive);
    
    if (activeSessions.length === 0) {
      return null;
    }
    
    // Return the most recent active session
    return activeSessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )[0];
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): void {
    const sessions = this.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].lastActivity = new Date().toISOString();
      sessions[sessionIndex].isActive = true;
      this.storeSessions(sessions);
    }
  }

  /**
   * Validate session security
   */
  validateSessionSecurity(sessionId: string): SessionSecurityInfo {
    const session = this.getSession(sessionId);
    const warnings: string[] = [];
    let securityScore = 100;
    
    if (!session) {
      return {
        isValid: false,
        isExpired: true,
        isInactive: true,
        securityScore: 0,
        warnings: ['Session not found'],
      };
    }
    
    const now = Date.now();
    const createdAt = new Date(session.createdAt).getTime();
    const lastActivity = new Date(session.lastActivity).getTime();
    
    // Check if session is expired
    const isExpired = (now - createdAt) > this.config.maxAge;
    if (isExpired) {
      warnings.push('Session has expired');
      securityScore -= 50;
    }
    
    // Check if session is inactive
    const isInactive = (now - lastActivity) > this.config.inactivityTimeout;
    if (isInactive) {
      warnings.push('Session has been inactive for too long');
      securityScore -= 30;
    }
    
    // Check browser fingerprint consistency
    const currentFingerprint = generateBrowserFingerprint();
    if (session.fingerprint !== currentFingerprint) {
      warnings.push('Browser fingerprint mismatch detected');
      securityScore -= 40;
    }
    
    // Check user agent consistency
    const currentUserAgent = sanitizeTextInput(navigator.userAgent, { maxLength: 500 });
    if (session.userAgent !== currentUserAgent) {
      warnings.push('User agent change detected');
      securityScore -= 20;
    }
    
    return {
      isValid: securityScore > 50 && !isExpired,
      isExpired,
      isInactive,
      securityScore: Math.max(0, securityScore),
      warnings,
    };
  }

  /**
   * Invalidate session
   */
  invalidateSession(sessionId: string): void {
    const sessions = this.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].isActive = false;
      this.storeSessions(sessions);
    }
  }

  /**
   * Clean up expired and inactive sessions
   */
  cleanupExpiredSessions(): void {
    const sessions = this.getAllSessions();
    const now = Date.now();
    
    const validSessions = sessions.filter(session => {
      const createdAt = new Date(session.createdAt).getTime();
      const lastActivity = new Date(session.lastActivity).getTime();
      
      const isNotExpired = (now - createdAt) <= this.config.maxAge;
      const isNotInactive = (now - lastActivity) <= this.config.inactivityTimeout;
      
      return isNotExpired && isNotInactive;
    });
    
    if (validSessions.length !== sessions.length) {
      this.storeSessions(validSessions);
    }
  }

  /**
   * Get session by ID
   */
  private getSession(sessionId: string): SessionData | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Get all sessions
   */
  private getAllSessions(): SessionData[] {
    try {
      const encryptedData = sessionStorage.getItem(this.storageKey);
      if (!encryptedData) {
        return [];
      }
      
      const decryptedData = this.config.encryptionKey 
        ? decryptSessionData(encryptedData, this.config.encryptionKey)
        : encryptedData;
      
      return JSON.parse(decryptedData) || [];
    } catch {
      return [];
    }
  }

  /**
   * Store single session
   */
  private storeSession(sessionData: SessionData): void {
    const sessions = this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.sessionId === sessionData.sessionId);
    
    if (existingIndex !== -1) {
      sessions[existingIndex] = sessionData;
    } else {
      sessions.push(sessionData);
    }
    
    this.storeSessions(sessions);
  }

  /**
   * Store all sessions
   */
  private storeSessions(sessions: SessionData[]): void {
    try {
      const data = JSON.stringify(sessions);
      const encryptedData = this.config.encryptionKey 
        ? encryptSessionData(data, this.config.encryptionKey)
        : data;
      
      sessionStorage.setItem(this.storageKey, encryptedData);
    } catch (error) {
      console.error('Failed to store sessions:', error);
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSecureSessionId(): string {
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('');
    
    return `session_${timestamp}_${randomString}`;
  }

  /**
   * Sanitize session metadata
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      const sanitizedKey = sanitizeTextInput(key, { maxLength: 100 });
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = sanitizeTextInput(value, { maxLength: 1000 });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else {
        sanitized[sanitizedKey] = JSON.stringify(value).substring(0, 1000);
      }
    }
    
    return sanitized;
  }

  /**
   * Enforce session limits
   */
  private enforceSessionLimits(): void {
    const sessions = this.getAllSessions()
      .filter(s => s.isActive)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    if (sessions.length > this.config.maxSessions) {
      // Deactivate oldest sessions
      const sessionsToKeep = sessions.slice(0, this.config.maxSessions);
      const sessionsToDeactivate = sessions.slice(this.config.maxSessions);
      
      sessionsToDeactivate.forEach(session => {
        session.isActive = false;
      });
      
      this.storeSessions([...sessionsToKeep, ...sessionsToDeactivate]);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  /**
   * Start activity tracking
   */
  private startActivityTracking(): void {
    const updateActivity = () => {
      const currentSession = this.getCurrentSession();
      if (currentSession) {
        this.updateActivity(currentSession.sessionId);
      }
    };
    
    // Track user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Periodic activity update
    this.activityTimer = setInterval(updateActivity, 30000); // Every 30 seconds
  }

  /**
   * Setup storage listener for cross-tab synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        // Sessions changed in another tab
        this.cleanupExpiredSessions();
      }
    });
  }

  /**
   * Destroy session manager
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
  }
}

// Create singleton instance
export const secureSessionManager = new SecureSessionManager();

export default {
  SecureSessionManager,
  secureSessionManager,
};