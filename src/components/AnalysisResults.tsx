import React from 'react';
import type { AnalysisResultsProps } from '../types';
import { OverallScoreDisplay } from './OverallScoreDisplay';
import { SectionCard } from './SectionCard';
import { ATSCompatibilityCard } from './ATSCompatibilityCard';
import { ChatInterface } from './ChatInterface';
import { useSectionEdit } from '../hooks/useSectionEdit';

/**
 * AnalysisResults component with split-screen layout for displaying CV analysis
 */
export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisData: initialAnalysisData,
  resumeId,
  onSectionEdit,
  onDownloadPDF
}) => {
  const {
    analysisData,
    editingSections,
    sectionUpdates,
    error,
    chatOpen,
    currentChatSection,
    editSection,
    editSectionWithChat,
    closeChatInterface,
    completeChatEdit,
    clearError
  } = useSectionEdit({
    resumeId,
    initialAnalysisData,
    onSectionEdit,
    onError: (error) => {
      // You could integrate with a toast notification system here
      console.error('Section editing error:', error);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with download button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CV Analysis Results</h1>
            <p className="text-gray-600 mt-1">Review your CV analysis and make improvements</p>
          </div>
          <button
            onClick={onDownloadPDF}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Download as PDF
          </button>
        </div>
      </div>

      {/* Split-screen layout */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* Left side - Analysis Results */}
          <div className="space-y-6 overflow-y-auto">
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-medium text-red-800">Section Editing Error</h3>
                  <button
                    onClick={clearError}
                    className="ml-auto text-red-400 hover:text-red-600"
                    aria-label="Close error"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {/* Overall Score Display */}
            <OverallScoreDisplay
              score={analysisData.overall_score}
              summary={analysisData.summary}
            />

            {/* ATS Compatibility */}
            <ATSCompatibilityCard
              atsData={analysisData.ats_compatibility}
            />

            {/* Section Analysis Cards */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Section Analysis</h2>
              {analysisData.sections.map((section, index) => (
                <SectionCard
                  key={`${section.section_name}-${index}`}
                  section={section}
                  onEdit={() => editSection(section.section_name)}
                  onChatEdit={() => editSectionWithChat(section.section_name)}
                  isEditing={editingSections.has(section.section_name)}
                />
              ))}
            </div>
          </div>

          {/* Right side - CV Canvas */}
          <div className="bg-white rounded-lg border-2 border-gray-200">
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">CV Preview</h3>
                <p className="text-gray-600 mb-4">
                  Your CV will be displayed here with real-time updates as you edit sections.
                </p>
                <div className="bg-gray-100 rounded-lg p-8 text-gray-500">
                  <p className="text-sm">Resume ID: {resumeId}</p>
                  <p className="text-sm mt-2">
                    Section updates: {sectionUpdates.size} modified
                  </p>
                  {sectionUpdates.size > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Updated sections:</p>
                      {Array.from(sectionUpdates.keys()).map(sectionName => (
                        <span 
                          key={sectionName}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                        >
                          {sectionName.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Modal */}
      {chatOpen && currentChatSection && (
        <ChatInterface
          isOpen={chatOpen}
          sectionName={currentChatSection}
          resumeId={resumeId}
          onClose={closeChatInterface}
          onComplete={completeChatEdit}
        />
      )}
    </div>
  );
};