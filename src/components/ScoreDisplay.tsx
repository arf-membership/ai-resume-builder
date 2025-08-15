import React from 'react';
import type { ScoreDisplayProps } from '../types';

/**
 * ScoreDisplay component for showing scores with color coding and visual indicators
 */
export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  maxScore = 100,
  size = 'medium',
  showLabel = true,
  className = ''
}) => {
  // Calculate percentage for consistent color coding
  const percentage = (score / maxScore) * 100;
  
  // Determine color based on score ranges
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Size variants
  const sizeClasses = {
    small: 'text-sm px-2 py-1',
    medium: 'text-base px-3 py-2',
    large: 'text-xl px-4 py-3'
  };

  const scoreColor = getScoreColor(percentage);
  const sizeClass = sizeClasses[size];

  return (
    <div className={`inline-flex items-center rounded-lg border font-semibold ${scoreColor} ${sizeClass} ${className}`}>
      <span className="tabular-nums">
        {score}
        {showLabel && <span className="text-xs ml-1 opacity-75">/{maxScore}</span>}
      </span>
    </div>
  );
};