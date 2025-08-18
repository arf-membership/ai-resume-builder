import React, { useState } from 'react';
import type { SectionCardProps } from '../types';
import { ScoreDisplay } from './ScoreDisplay';

/**
 * SectionCard component for displaying individual CV section analysis
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  onEdit,
  onChatEdit,
  isEditing = false,
  disabled = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine card border color based on score
  const getCardBorderColor = (score: number) => {
    if (score >= 80) return 'border-green-200 hover:border-green-300';
    if (score >= 60) return 'border-yellow-200 hover:border-yellow-300';
    return 'border-red-200 hover:border-red-300';
  };

  const borderColor = getCardBorderColor(section.score);

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 ${borderColor} ${disabled ? 'opacity-50' : 'hover:shadow-md'}`}>
      {/* Header with section name and score */}
      <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-responsive-base font-semibold text-gray-900 flex-1 min-w-0 pr-3">
          {section.section_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h3>
        <div className="flex-shrink-0">
          <ScoreDisplay score={section.score} size="medium" />
        </div>
      </div>

      {/* Feedback section */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-responsive-sm font-medium text-gray-700 mb-2">Feedback</h4>
        <p className="text-responsive-xs text-gray-600 leading-relaxed">
          {section.feedback}
        </p>
      </div>

      {/* Suggestions section */}
      <div className="mb-3 sm:mb-4">
        <h4 className="text-responsive-sm font-medium text-gray-700 mb-2">Suggestions</h4>
        <p className="text-responsive-xs text-gray-600 leading-relaxed">
          {section.suggestions}
        </p>
      </div>

      {/* Content preview (expandable) */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-touch flex items-center text-responsive-sm font-medium text-blue-600 hover:text-blue-700 transition-colors w-full sm:w-auto justify-center sm:justify-start"
          disabled={disabled}
        >
          <span>Current Content</span>
          <svg
            className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-responsive-xs text-gray-700 whitespace-pre-wrap break-words">
              {section.content}
            </p>
          </div>
        )}
      </div>

      {/* Edit buttons */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
        {onChatEdit && (
          <button
            onClick={onChatEdit}
            disabled={disabled || isEditing}
            className={`btn-touch px-4 py-3 sm:py-2 rounded-md text-responsive-sm font-medium transition-colors ${
              disabled || isEditing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="hidden xs:inline">Chat with AI</span>
              <span className="xs:hidden">Chat</span>
            </div>
          </button>
        )}
        
        <button
          onClick={onEdit}
          disabled={disabled || isEditing}
          className={`btn-touch px-4 py-3 sm:py-2 rounded-md text-responsive-sm font-medium transition-colors ${
            disabled || isEditing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {isEditing ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden xs:inline">Editing...</span>
              <span className="xs:hidden">Edit...</span>
            </div>
          ) : (
            <>
              <span className="hidden xs:inline">Edit with AI</span>
              <span className="xs:hidden">Edit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};