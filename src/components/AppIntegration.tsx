/**
 * Application Integration Component
 * Orchestrates the complete application flow and state management
 */

import React, { useEffect } from 'react';
import { CVAnalysisFlow } from './CVAnalysisFlow';
import { performanceMonitoring } from '../services/performanceMonitoringService';
import { useStoreActions } from '../store';
import ErrorBoundary from './ErrorBoundary';
import NotificationContainer from './NotificationToast';

// Application flow states
type AppFlow = 'landing' | 'uploading' | 'analyzing' | 'results' | 'editing' | 'generating';

interface AppIntegrationProps {
  initialFlow?: AppFlow;
}

export const AppIntegration: React.FC<AppIntegrationProps> = () => {
  const actions = useStoreActions();

  // Initialize session and performance monitoring
  useEffect(() => {
    actions.initializeSession();
    performanceMonitoring.trackUserInteraction('app_init', 'application', '/');
    
    // Track session duration
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      performanceMonitoring.trackSyncOperation('session_duration', () => duration);
    };
  }, [actions]);

  return (
    <ErrorBoundary>
      <div className="app-integration">
        <CVAnalysisFlow />
        
        {/* Notifications */}
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
};

export default AppIntegration;