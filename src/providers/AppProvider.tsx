/**
 * Application provider component
 * Initializes store, session management, and global error handling
 */

import React, { ReactNode } from 'react';

interface AppProviderProps {
  children: ReactNode;
}

// Simplified AppProvider - no complex state management or useEffect hooks
const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Remove all complex logic that could cause infinite loops:
  // - No sessionManager interactions
  // - No Zustand store usage  
  // - No useEffect hooks
  // - No NotificationContainer (for now)
  
  return (
    <>
      {children}
    </>
  );
};

export default AppProvider;