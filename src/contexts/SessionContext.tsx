/**
 * Session Context Provider for React components
 * Provides session management throughout the application
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SessionStorageService, type SessionData } from '../services/sessionStorage';

interface SessionContextType {
  sessionData: SessionData | null;
  sessionId: string | null;
  isSessionLoading: boolean;
  refreshSession: () => void;
  clearSession: () => void;
  updateActivity: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * Session Provider Component
 * Manages session state and provides session utilities to child components
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  /**
   * Initialize or refresh the session
   */
  const refreshSession = useCallback(() => {
    try {
      setIsSessionLoading(true);
      
      if (!SessionStorageService.isStorageAvailable()) {
        console.warn('localStorage is not available, session will not persist');
        setSessionData(null);
        setIsSessionLoading(false);
        return;
      }

      const session = SessionStorageService.getOrCreateSession();
      setSessionData(session);
    } catch (error) {
      console.error('Error refreshing session:', error);
      setSessionData(null);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  /**
   * Clear the current session
   */
  const clearSession = useCallback(() => {
    try {
      SessionStorageService.clearSession();
      setSessionData(null);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }, []);

  /**
   * Update session activity timestamp
   */
  const updateActivity = useCallback(() => {
    try {
      SessionStorageService.updateLastActivity();
      // Update the local state to reflect the new activity time
      if (sessionData) {
        setSessionData(prev => prev ? {
          ...prev,
          lastActivity: new Date().toISOString()
        } : null);
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }, [sessionData]);

  /**
   * Initialize session on component mount
   */
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Set up activity tracking
   */
  useEffect(() => {
    if (!sessionData) return;

    // Update activity on user interactions
    const handleUserActivity = () => {
      updateActivity();
    };

    // Track various user interaction events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity updates to avoid excessive localStorage writes
    let activityTimeout: NodeJS.Timeout;
    const throttledActivityUpdate = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(handleUserActivity, 30000); // Update every 30 seconds max
    };

    events.forEach(event => {
      document.addEventListener(event, throttledActivityUpdate, { passive: true });
    });

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, throttledActivityUpdate);
      });
    };
  }, [sessionData, updateActivity]);

  /**
   * Periodic session validation
   */
  useEffect(() => {
    if (!sessionData) return;

    // Check session validity every 5 minutes
    const validationInterval = setInterval(() => {
      const currentSession = SessionStorageService.getCurrentSession();
      if (!currentSession) {
        // Session has expired or been cleared
        setSessionData(null);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(validationInterval);
  }, [sessionData]);

  const contextValue: SessionContextType = {
    sessionData,
    sessionId: sessionData?.sessionId || null,
    isSessionLoading,
    refreshSession,
    clearSession,
    updateActivity,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to use session context
 * Throws error if used outside of SessionProvider
 */
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
}