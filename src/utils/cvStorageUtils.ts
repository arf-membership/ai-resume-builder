/**
 * Utility functions for managing CV analysis data in session storage
 */

export interface StoredCVAnalysis {
  analysisResult: any;
  currentResume: any;
  timestamp: number;
  sessionId: string;
}

const CV_STORAGE_KEY = 'cv_analysis_data';

/**
 * Save CV analysis data to session storage
 */
export const saveCVAnalysisToStorage = (
  analysisResult: any,
  currentResume: any,
  sessionId: string
): void => {
  try {
    const data: StoredCVAnalysis = {
      analysisResult,
      currentResume,
      timestamp: Date.now(),
      sessionId
    };
    
    sessionStorage.setItem(CV_STORAGE_KEY, JSON.stringify(data));
    console.log('CV analysis data saved to session storage');
  } catch (error) {
    console.error('Failed to save CV analysis data to session storage:', error);
  }
};

/**
 * Load CV analysis data from session storage
 */
export const loadCVAnalysisFromStorage = (): StoredCVAnalysis | null => {
  try {
    const storedData = sessionStorage.getItem(CV_STORAGE_KEY);
    if (!storedData) {
      return null;
    }
    
    const data: StoredCVAnalysis = JSON.parse(storedData);
    
    console.log('CV analysis data loaded from session storage');
    return data;
  } catch (error) {
    console.error('Failed to load CV analysis data from session storage:', error);
    return null;
  }
};

/**
 * Clear CV analysis data from session storage
 */
export const clearCVAnalysisFromStorage = (): void => {
  try {
    sessionStorage.removeItem(CV_STORAGE_KEY);
    console.log('CV analysis data cleared from session storage');
  } catch (error) {
    console.error('Failed to clear CV analysis data from session storage:', error);
  }
};

/**
 * Check if there's stored CV analysis data
 */
export const hasCVAnalysisInStorage = (): boolean => {
  try {
    const storedData = sessionStorage.getItem(CV_STORAGE_KEY);
    return storedData !== null;
  } catch (error) {
    console.error('Failed to check CV analysis data in session storage:', error);
    return false;
  }
};
