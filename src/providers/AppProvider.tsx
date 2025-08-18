/**
 * Application provider component
 * Initializes store, session management, and global error handling
 */

import React, { useEffect, ReactNode } from 'react';
import { sessionManager } from '../utils/sessionManager';
import { NotificationContainer } from '../components/NotificationToast';
import { useCVStore } from '../store';

interface AppProviderProps {
  children: ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const initializeSession = useCVStore(state => state.initializeSession);

  useEffect(() => {
    // Initialize session management
    sessionManager.initialize();
    
    // Ensure store has a session ID
    initializeSession();

    // Cleanup on unmount
    return () => {
      sessionManager.destroy();
    };
  }, [initializeSession]);

  // Global error boundary for unhandled errors
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);
      // Could add to error store here if needed
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Could add to error store here if needed
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {children}
      <NotificationContainer />
    </>
  );
};

export default AppProvider;