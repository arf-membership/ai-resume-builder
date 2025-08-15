import React, { useState } from 'react';
import type { AnalysisResultsProps } from '../types';
import { OverallScoreDisplay } from './OverallScoreDisplay';
import { SectionCard } from './SectionCard';
import { ATSCompatibilityCard } from './ATSCompatibilityCard';

/**
 * AnalysisResults component with split-screen layout for displaying CV analysis
 */
export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysisData,
  resumeId,
  onSectionEdit,
  onDownloadPDF
}) => {
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

  const handleSectionEdit = (sectionName: string) => {
    setEditingSections(prev => new Set(prev).add(sectionName));
    onSectionEdit(sectionName);
    
    // Remove from editing state after a delay (this would normally be handled by parent component)
    setTimeout(() => {
      setEditingSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionName);
        return newSet;
      });
    }, 3000);
  };

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
                  onEdit={() => handleSectionEdit(section.section_name)}
                  isEditing={editingSections.has(section.section_name)}
                />
              ))}
            </div>
          </div>

          {/* Right side - CV Canvas Placeholder */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
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
                  Your CV will be displayed here once the CV Canvas component is implemented.
                </p>
                <div className="bg-gray-100 rounded-lg p-8 text-gray-500">
                  <p className="text-sm">Resume ID: {resumeId}</p>
                  <p className="text-sm mt-2">
                    This area will show your PDF with real-time updates as you edit sections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};