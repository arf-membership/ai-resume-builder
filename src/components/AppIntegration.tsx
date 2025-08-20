/**
 * Application Integration Component
 * Orchestrates the complete application flow and state management
 */

import React, { useEffect, useState } from 'react';
import { LandingPage } from './LandingPage';
import { AnalysisResults } from './AnalysisResults';
import { ChatInterface } from './ChatInterface';
import CVCanvas from './CVCanvas';
import { useSession } from '../contexts/SessionContext';
import { useCVStore, useStoreActions, useAnalysisState, useUploadState, useEditingState, useChatState } from '../store';
import { useNotifications } from '../store/notificationStore';
import { performanceMonitoring } from '../services/performanceMonitoringService';
import ErrorBoundary from './ErrorBoundary';
import NotificationContainer from './NotificationToast';
import { LoadingOverlay } from './LoadingIndicator';

// Application flow states
type AppFlow = 'landing' | 'uploading' | 'analyzing' | 'results' | 'editing' | 'generating';

interface AppIntegrationProps {
  initialFlow?: AppFlow;
}

export const AppIntegration: React.FC<AppIntegrationProps> = ({ 
  initialFlow = 'landing' 
}) => {
  const { sessionId } = useSession();
  const { showError, showSuccess } = useNotifications();
  const { isAnalyzing, analysisResult } = useAnalysisState();
  const { isUploading, uploadProgress } = useUploadState();
  const { editingSection } = useEditingState();
  const chatOpen = useChatState();
  const actions = useStoreActions();
  
  const [currentFlow, setCurrentFlow] = useState<AppFlow>(initialFlow);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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

  /* Future upload integration handlers - currently unused but kept for future development
  
  // Handle upload completion
  const handleUploadComplete = async (fileData: { resumeId: string; filePath: string }) => {
    try {
      if (!sessionId) {
        throw new Error('Session not initialized. Please refresh the page.');
      }

      setCurrentFlow('analyzing');
      setIsLoading(true);
      setLoadingMessage('Analyzing your CV with AI...');
      
      actions.setIsAnalyzing(true);
      
      const analysisResult = await AnalysisService.analyzeCV(
        fileData.resumeId,
        sessionId,
        (progress: number) => {
          setLoadingMessage(`Analyzing CV... ${Math.round(progress)}%`);
        }
      );
      
      actions.setAnalysisResult(analysisResult);
      setCurrentFlow('results');
      showSuccess('CV Analysis Complete', 'Your CV has been analyzed successfully!');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      showError('Analysis Failed', 'Failed to analyze your CV. Please try again.');
      setCurrentFlow('landing');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      actions.setIsAnalyzing(false);
    }
  };

  // Handle upload progress
  const handleUploadProgress = (progress: number) => {
    actions.setUploadProgress(progress);
    if (progress > 0 && progress < 100) {
      setCurrentFlow('uploading');
      setLoadingMessage(`Uploading... ${Math.round(progress)}%`);
    }
  };

  // Handle upload error
  const handleUploadError = (error: string) => {
    showError('Upload Failed', error);
    setCurrentFlow('landing');
    actions.setUploadProgress(0);
  };
  
  */

  // Handle section editing
  const handleSectionEdit = async (sectionName: string) => {
    try {
      setCurrentFlow('editing');
      setIsLoading(true);
      setLoadingMessage(`Improving ${sectionName} section...`);
      
      actions.setEditingSection(sectionName);
      actions.setIsEditingSection(true);
      
      // Import and use section edit service
      const { SectionEditService } = await import('../services/sectionEditService');
      
      const currentResume = useCVStore.getState().currentResume;
      if (!currentResume || !analysisResult) {
        throw new Error('No resume data available');
      }
      
      const section = analysisResult.sections.find(s => s.section_name === sectionName);
      if (!section) {
        throw new Error('Section not found');
      }
      
      if (!sessionId) {
        throw new Error('Session not initialized. Please refresh the page.');
      }

      const result = await SectionEditService.editSection(
        currentResume.id,
        sectionName,
        section.content,
        section.suggestions,
        sessionId,
        undefined, // No additional context for now
        {
          onProgress: (progress: string) => {
            setLoadingMessage(progress);
          }
        }
      );
      
      actions.updateSection(sectionName, result.updatedSection);
      showSuccess('Section Updated', `${sectionName} has been improved!`);
      setCurrentFlow('results');
      
    } catch (error) {
      console.error('Section edit failed:', error);
      showError('Edit Failed', `Failed to improve ${sectionName}. Please try again.`);
      setCurrentFlow('results');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      actions.setIsEditingSection(false);
      actions.setEditingSection(undefined);
    }
  };

  // Handle PDF generation and download
  const handleDownloadPDF = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Generating your improved CV...');
      
      actions.setIsGeneratingPDF(true);
      
      // Import and use PDF generation service
      const { PDFGenerationService } = await import('../services/pdfGenerationService');
      
      const currentResume = useCVStore.getState().currentResume;
      if (!currentResume || !analysisResult) {
        throw new Error('No resume data available');
      }
      
      if (!sessionId) {
        throw new Error('Session not initialized. Please refresh the page.');
      }

      const result = await PDFGenerationService.generatePDF(
        currentResume.id,
        sessionId,
        [], // No section updates for now
        {
          onProgress: (progress: { stage: string; percentage: number }) => {
            setLoadingMessage(`${progress.stage}... ${Math.round(progress.percentage)}%`);
          }
        }
      );
      
      actions.updateGeneratedPdfPath(result.generatedPdfPath);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = result.generatedPdfUrl;
      link.download = 'improved-cv.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Download Complete', 'Your improved CV has been downloaded!');
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      showError('Download Failed', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      actions.setIsGeneratingPDF(false);
    }
  };

  // Handle chat completion
  const handleChatComplete = (updatedContent: string, sectionName: string) => {
    // This would update the section with chat-enhanced content
    const section = analysisResult?.sections.find(s => s.section_name === sectionName);
    if (section) {
      const updatedSection = {
        ...section,
        content: updatedContent,
        score: Math.min(100, section.score + 10) // Boost score for chat enhancement
      };
      actions.updateSection(sectionName, updatedSection);
    }
    actions.setChatOpen(false);
    showSuccess('Section Enhanced', 'Section updated with additional information!');
  };

  // Render current flow
  const renderCurrentFlow = () => {
    switch (currentFlow) {
      case 'landing':
      case 'uploading':
        return <LandingPage onAnalyzeCV={handleAnalyzeCv} />;
      
      case 'analyzing':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your CV</h2>
              <p className="text-gray-600">Our AI is reviewing your resume and preparing detailed feedback...</p>
            </div>
          </div>
        );
      
      case 'results':
      case 'editing':
        if (!analysisResult) {
          return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Analysis Data</h2>
                <p className="text-gray-600 mb-4">Please upload and analyze a CV first.</p>
                <button
                  onClick={() => setCurrentFlow('landing')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Start Over
                </button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Analysis Results */}
                <div className="space-y-6">
                  <AnalysisResults
                    analysisData={analysisResult}
                    resumeId={useCVStore.getState().currentResume?.id || ''}
                    onSectionEdit={handleSectionEdit}
                    onDownloadPDF={handleDownloadPDF}
                  />
                </div>
                
                {/* CV Canvas */}
                <div className="lg:sticky lg:top-8">
                  <CVCanvas
                    pdfUrl={useCVStore.getState().currentResume?.original_pdf_path || ''}
                    resumeId={useCVStore.getState().currentResume?.id || ''}
                    sessionId={sessionId || ''}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unknown State</h2>
              <p className="text-gray-600 mb-4">Something went wrong. Let's start over.</p>
              <button
                onClick={() => setCurrentFlow('landing')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Start Over
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="app-integration">
        {renderCurrentFlow()}
        
        {/* Chat Interface */}
        {chatOpen && (
          <ChatInterface
            isOpen={chatOpen}
            sectionName={editingSection || ''}
            resumeId={useCVStore.getState().currentResume?.id || ''}
            onComplete={(updatedContent: string) => {
              // We need the section name, so get it from the store
              if (editingSection) {
                handleChatComplete(updatedContent, editingSection);
              }
            }}
            onClose={() => actions.setChatOpen(false)}
          />
        )}
        
        {/* Loading Overlay */}
        {(isLoading || isUploading || isAnalyzing) && (
          <LoadingOverlay
            isVisible={true}
            message={loadingMessage || 'Processing...'}
            progress={isUploading ? uploadProgress : undefined}
          />
        )}
        
        {/* Notifications */}
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
};

export default AppIntegration;