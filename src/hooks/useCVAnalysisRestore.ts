import { useLayoutEffect, useRef } from 'react';
import { useCVStore, useStoreActions } from '../store';
import { useSession } from '../contexts/SessionContext';
import { loadCVAnalysisFromStorage } from '../utils/cvStorageUtils';

/**
 * Custom hook to restore CV analysis data from session storage
 * Uses useLayoutEffect to run synchronously before paint
 */
export const useCVAnalysisRestore = (scrollTargetRef?: React.RefObject<HTMLDivElement | null>) => {
  const { sessionId } = useSession();
  const actions = useStoreActions();
  const analysisResult = useCVStore(state => state.analysisResult);
  const currentResume = useCVStore(state => state.currentResume);
  const hasRestoredRef = useRef(false);

  useLayoutEffect(() => {
    // Only restore if we don't have analysis data but have a session
    if (sessionId && !analysisResult && !hasRestoredRef.current) {
      const storedData = loadCVAnalysisFromStorage();
      console.log("Attempting to restore stored data:", storedData);
      
      if (storedData && storedData.sessionId === sessionId) {
        console.log('Restoring analysis data from session storage');
        actions.setAnalysisResult(storedData.analysisResult);
        actions.setCurrentResume(storedData.currentResume);
        hasRestoredRef.current = true;
        
        // Auto-scroll to results after restoration
        if (scrollTargetRef?.current) {
          setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }, 100);
        }
      }
    }
  }, [sessionId, analysisResult, actions, scrollTargetRef]);

  return {
    hasStoredData: () => {
      if (!sessionId) return false;
      const storedData = loadCVAnalysisFromStorage();
      return storedData && storedData.sessionId === sessionId;
    },
    analysisResult,
    currentResume
  };
};
