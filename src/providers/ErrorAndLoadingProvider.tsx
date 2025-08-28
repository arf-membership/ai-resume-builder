/**
 * Provider component that wraps the app with error handling and loading management
 */

import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { UploadLoading, AnalysisLoading, EditingLoading, PDFGenerationLoading } from '../components/LoadingIndicator';
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
    </ErrorBoundary>
  );
};

export default ErrorAndLoadingProvider;