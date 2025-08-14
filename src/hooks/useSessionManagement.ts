/**
 * Custom hook for session management
 * Provides convenient session utilities and automatic cleanup
 */

import { useEffect, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';
import { SessionCleanup, SessionMonitor } from '../utils/sessionValidation';

export interface UseSessionManagementOptions {
  enableAutoCleanup?: boolean;
  enableMonitoring?: boolean;
  onSessionExpired?: () => void;
}

/**
 * Hook for comprehensive session management
 */
export function useSessionManagement(options: UseSessionManagementOptions = {}) {
  const {
    enableAutoCleanup = true,
    enableMonitoring = true,
    onSessionExpired
  } = options;

  const session = useSession();

  /**
   * Handle session expiration
   */
  const handleSessionExpired = useCallback(() => {
    session.clearSession();
    onSessionExpired?.();
  }, [session, onSessionExpired]);

  /**
   * Set up automatic cleanup and monitoring
   */
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    // Enable automatic cleanup
    if (enableAutoCleanup) {
      const cleanupScheduler = SessionCleanup.schedulePeriodicCleanup();
      cleanupFunctions.push(cleanupScheduler);
    }

    // Enable session monitoring
    if (enableMonitoring) {
      const stopMonitoring = SessionMonitor.startMonitoring();
      cleanupFunctions.push(stopMonitoring);

      // Listen for session validity changes
      const unsubscribe = SessionMonitor.addValidityListener((isValid) => {
        if (!isValid) {
          handleSessionExpired();
        }
      });
      cleanupFunctions.push(unsubscribe);
    }

    // Cleanup on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [enableAutoCleanup, enableMonitoring, handleSessionExpired]);

  /**
   * Perform immediate cleanup
   */
  const performCleanup = useCallback(() => {
    SessionCleanup.performCleanup();
  }, []);

  /**
   * Force session refresh
   */
  const forceRefresh = useCallback(() => {
    session.refreshSession();
  }, [session]);

  return {
    ...session,
    performCleanup,
    forceRefresh,
    isSessionValid: !!session.sessionId && !session.isSessionLoading,
  };
}