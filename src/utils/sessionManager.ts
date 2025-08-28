/**
 * Session management utilities
 * Handles session persistence, cleanup, and validation
 */

import { useCVStore } from '../store';
import { useNotifications } from '../store/notificationStore';

export interface SessionConfig {
  maxAge: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  storageKey: string;
}

const DEFAULT_CONFIG: SessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  storageKey: 'cv-store',
};

class SessionManager {
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize session management
   */
  initialize(): void {
    this.validateSession();
    this.startCleanupTimer();
    this.setupStorageListener();
  }

  /**
   * Validate current session and clean up if expired
   */
  private validateSession(): void {
    try {
      const storedData = sessionStorage.getItem(this.config.storageKey);
      if (!storedData) {
        this.initializeNewSession();
        return;
      }

      const parsedData = JSON.parse(storedData);
      const sessionTimestamp = parsedData.state?.timestamp;
      
      if (!sessionTimestamp) {
        this.initializeNewSession();
        return;
      }

      const sessionAge = Date.now() - sessionTimestamp;
      if (sessionAge > this.config.maxAge) {
        this.expireSession();
        return;
      }

      // Session is valid, ensure store is initialized
      const store = useCVStore.getState();
      if (!store.sessionId) {
        store.initializeSession();
      }
    } catch (error) {
      console.error('Session validation error:', error);
      this.initializeNewSession();
    }
  }

  /**
   * Initialize a new session
   */
  private initializeNewSession(): void {
    const store = useCVStore.getState();
    store.reset();
    store.initializeSession();
    this.updateSessionTimestamp();
  }

  /**
   * Expire current session and notify user
   */
  private expireSession(): void {
    const store = useCVStore.getState();
    store.reset();
    store.initializeSession();
    
    // Show notification about session expiry
    try {
      const { showWarning } = useNotifications();
      showWarning(
        'Session Expired',
        'Your session has expired. Please start over with a new CV upload.',
        8000
      );
    } catch (error) {
      console.warn('Could not show session expiry notification:', error);
    }
  }

  /**
   * Update session timestamp
   */
  private updateSessionTimestamp(): void {
    try {
      const storedData = sessionStorage.getItem(this.config.storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        parsedData.state.timestamp = Date.now();
        sessionStorage.setItem(this.config.storageKey, JSON.stringify(parsedData));
      }
    } catch (error) {
      console.error('Failed to update session timestamp:', error);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.validateSession();
    }, this.config.cleanupInterval);
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.config.storageKey) {
        // Session data changed in another tab
        this.validateSession();
      }
    });
  }

  /**
   * Manually refresh session (extend expiry)
   */
  refreshSession(): void {
    this.updateSessionTimestamp();
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    const store = useCVStore.getState();
    store.clearSession();
    sessionStorage.removeItem(this.config.storageKey);
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    sessionId: string;
    isValid: boolean;
    age: number;
    remainingTime: number;
  } {
    const store = useCVStore.getState();
    const sessionId = store.sessionId;
    
    try {
      const storedData = sessionStorage.getItem(this.config.storageKey);
      if (!storedData) {
        return {
          sessionId,
          isValid: false,
          age: 0,
          remainingTime: 0,
        };
      }

      const parsedData = JSON.parse(storedData);
      const sessionTimestamp = parsedData.state?.timestamp || Date.now();
      const age = Date.now() - sessionTimestamp;
      const remainingTime = Math.max(0, this.config.maxAge - age);

      return {
        sessionId,
        isValid: age < this.config.maxAge,
        age,
        remainingTime,
      };
    } catch (error) {
      console.error('Failed to get session info:', error);
      return {
        sessionId,
        isValid: false,
        age: 0,
        remainingTime: 0,
      };
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

// Session manager selector to prevent infinite loops
const sessionManagerSelector = (state: ReturnType<typeof useCVStore.getState>) => ({
  sessionId: state.sessionId,
  initializeSession: state.initializeSession,
  clearSession: state.clearSession,
  reset: state.reset,
});

// React hook for session management
export const useSessionManager = () => {
  const store = useCVStore(sessionManagerSelector);
  const { showInfo } = useNotifications();

  return {
    sessionInfo: sessionManager.getSessionInfo(),
    refreshSession: () => {
      sessionManager.refreshSession();
      showInfo('Session Refreshed', 'Your session has been extended.', 3000);
    },
    clearSession: () => {
      sessionManager.clearSession();
      showInfo('Session Cleared', 'All session data has been cleared.', 3000);
    },
    initializeSession: () => {
      store.initializeSession();
    },
  };
};

export default sessionManager;