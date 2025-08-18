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
    <div className="min-h-screen-safe bg-gray-50">
      {/* Header with download button */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 pt-safe">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="min-w-0 flex-1">
              <h1 className="text-responsive-xl lg:text-2xl font-bold text-gray-900 truncate">CV Analysis Results</h1>
              <p className="text-responsive-sm text-gray-600 mt-1">Review your CV analysis and make improvements</p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={onDownloadPDF}
                className="btn-touch bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden xs:inline">Download as PDF</span>
                  <span className="xs:hidden">Download</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split-screen layout */}
      <div className="max-w-7xl mx-auto p-4 pb-safe">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Left side - Analysis Results */}
          <div className="space-mobile overflow-y-auto">
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-responsive-sm font-medium text-red-800">Section Editing Error</h3>
                    <p className="mt-1 text-responsive-xs text-red-700 break-words">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="ml-2 text-red-400 hover:text-red-600 flex-shrink-0 btn-touch"
                    aria-label="Close error"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
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
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-responsive-lg font-semibold text-gray-900">Section Analysis</h2>
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
          <div className="bg-white rounded-lg border-2 border-gray-200 min-h-[400px] xl:min-h-[600px]">
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-4">
                <svg
                  className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-3 sm:mb-4"
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
                <h3 className="text-responsive-base font-medium text-gray-900 mb-2">CV Preview</h3>
                <p className="text-responsive-sm text-gray-600 mb-4">
                  Your CV will be displayed here with real-time updates as you edit sections.
                </p>
                <div className="bg-gray-100 rounded-lg p-4 lg:p-8 text-gray-500">
                  <p className="text-responsive-xs break-all">Resume ID: {resumeId}</p>
                  <p className="text-responsive-xs mt-2">
                    Section updates: {sectionUpdates.size} modified
                  </p>
                  {sectionUpdates.size > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">Updated sections:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(sectionUpdates.keys()).map(sectionName => (
                          <span 
                            key={sectionName}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {sectionName.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
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