/**
 * Session Context Provider for React components
 * Provides session management throughout the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { type SessionData } from '../services/sessionStorage';

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
  // Simplified session provider - no complex state management
  const [sessionData, setSessionData] = useState<SessionData | null>({
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  });
  const [isSessionLoading] = useState(false);

  /**
   * Simplified refresh session - no complex logic
   */
  const refreshSession = useCallback(() => {
    console.log('Session refreshed (simplified)');
  }, []);

  /**
   * Simplified clear session
   */
  const clearSession = useCallback(() => {
    setSessionData(null);
  }, []);

  /**
   * Simplified update activity
   */
  const updateActivity = useCallback(() => {
    console.log('Activity updated (simplified)');
  }, []);

  /**
   * Set up simplified activity tracking - commented out to prevent infinite loops
   */
  // useEffect(() => {
  //   if (!sessionData) return;
  //   
  //   // Simplified activity tracking - only on click events
  //   const handleUserActivity = () => {
  //     updateActivity();
  //   };
  //   
  //   document.addEventListener('click', handleUserActivity, { passive: true });
  //   
  //   return () => {
  //     document.removeEventListener('click', handleUserActivity);
  //   };
  // }, [sessionData]);

  /**
   * Periodic session validation - temporarily disabled to prevent infinite loops
   */
  // useEffect(() => {
  //   if (!sessionData) return;
  //
  //   // Check session validity every 5 minutes
  //   const validationInterval = setInterval(() => {
  //     const currentSession = SessionStorageService.getCurrentSession();
  //     if (!currentSession) {
  //       // Session has expired or been cleared
  //       setSessionData(null);
  //     }
  //   }, 5 * 60 * 1000); // 5 minutes
  //
  //   return () => clearInterval(validationInterval);
  // }, [sessionData]);

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