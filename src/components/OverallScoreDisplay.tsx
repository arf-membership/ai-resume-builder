import React from 'react';
import { ScoreDisplay } from './ScoreDisplay';

interface OverallScoreDisplayProps {
  score: number;
  summary: string;
  className?: string;
}

/**
 * OverallScoreDisplay component for prominently showing the overall CV score
 */
export const OverallScoreDisplay: React.FC<OverallScoreDisplayProps> = ({
  score,
  summary,
  className = ''
}) => {
  // Determine background gradient based on score
  const getGradientClass = (score: number) => {
    if (score >= 80) return 'from-green-50 to-green-100 border-green-200';
    if (score >= 60) return 'from-yellow-50 to-yellow-100 border-yellow-200';
    return 'from-red-50 to-red-100 border-red-200';
  };

  // Get motivational message based on score
  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent CV! 🎉';
    if (score >= 80) return 'Great CV! 👍';
    if (score >= 70) return 'Good CV with room for improvement';
    if (score >= 60) return 'Decent CV, but needs work';
    return 'CV needs significant improvement';
  };

  const gradientClass = getGradientClass(score);
  const scoreMessage = getScoreMessage(score);

  return (
    <div className={`bg-gradient-to-r ${gradientClass} rounded-xl border-2 p-8 text-center ${className}`}>
      {/* Main score display */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall CV Score</h2>
        <div className="flex justify-center">
          <ScoreDisplay score={score} size="large" className="text-2xl px-6 py-4" />
        </div>
      </div>

      {/* Score message */}
      <div className="mb-4">
        <p className="text-lg font-medium text-gray-800">
          {scoreMessage}
        </p>
      </div>

      {/* Summary */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
        <p className="text-gray-600 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Progress bar visualization */}
      <div className="mt-6">
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ease-out ${
              score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(score, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
};