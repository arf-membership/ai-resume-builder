import React from 'react';
import type { ATSCompatibility } from '../types';
import { ScoreDisplay } from './ScoreDisplay';

interface ATSCompatibilityCardProps {
  atsData: ATSCompatibility;
  className?: string;
}

/**
 * ATSCompatibilityCard component for displaying ATS compatibility analysis
 */
export const ATSCompatibilityCard: React.FC<ATSCompatibilityCardProps> = ({
  atsData,
  className = ''
}) => {
  // Determine card styling based on ATS score
  const getCardStyling = (score: number) => {
    if (score >= 80) return 'border-green-200 bg-green-50';
    if (score >= 60) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const cardStyling = getCardStyling(atsData.score);

  return (
    <div className={`rounded-lg border-2 p-6 ${cardStyling} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg
            className="h-6 w-6 text-gray-600 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">
            ATS Compatibility
          </h3>
        </div>
        <ScoreDisplay score={atsData.score} size="medium" />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">
        This score indicates how well your CV will perform with Applicant Tracking Systems (ATS) 
        used by many employers to screen resumes.
      </p>

      {/* Feedback section */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis</h4>
        <p className="text-gray-600 text-sm leading-relaxed">
          {atsData.feedback}
        </p>
      </div>

      {/* Suggestions section */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
        <p className="text-gray-600 text-sm leading-relaxed">
          {atsData.suggestions}
        </p>
      </div>
    </div>
  );
};