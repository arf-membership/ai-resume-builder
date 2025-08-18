/**
 * Provider component that wraps the app with error handling and loading management
 */

import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationContainer from '../components/NotificationToast';
import { LoadingOverlay, UploadLoading, AnalysisLoading, EditingLoading, PDFGenerationLoading } from '../components/LoadingIndicator';
import { useUploadState, useAnalysisState, useEditingState, usePDFState } from '../store';

interface ErrorAndLoadingProviderProps {
  children: React.ReactNode;
}

const ErrorAndLoadingProvider: React.FC<ErrorAndLoadingProviderProps> = ({ children }) => {
  const { uploadProgress, isUploading } = useUploadState();
  const { isAnalyzing } = useAnalysisState();
  const { isEditingSection, editingSection } = useEditingState();
  const { isGeneratingPDF } = usePDFState();

  return (
    <ErrorBoundary>
      {children}
      
      {/* Global loading overlays */}
      {isUploading && <UploadLoading progress={uploadProgress} />}
      {isAnalyzing && <AnalysisLoading />}
      {isEditingSection && <EditingLoading sectionName={editingSection} />}
      {isGeneratingPDF && <PDFGenerationLoading />}
      
      {/* Global notification container */}
      <NotificationContainer />
    </ErrorBoundary>
  );
};

export default ErrorAndLoadingProvider;