import React from 'react';
import { useScoreHistory } from '../store';

interface ScoreTimelineProps {
  className?: string;
}

export const ScoreTimeline: React.FC<ScoreTimelineProps> = ({ className = '' }) => {
  const scoreHistory = useScoreHistory();

  // Add CSS animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFromTop {
        0% {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        50% {
          opacity: 0.7;
          transform: translateY(-5px) scale(0.98);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4);
        }
      }
      
      .animate-slideInFromTop {
        animation: slideInFromTop 0.6s ease-out, pulseGlow 2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (scoreHistory.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-sm font-medium mb-2">📊 Score History</div>
          <div className="text-xs">No score updates yet</div>
        </div>
      </div>
    );
  }

  const latestScore = scoreHistory[scoreHistory.length - 1];
  const initialScore = scoreHistory[0];
  
  // Validate scores to prevent NaN
  const latestScoreValue = isNaN(latestScore.overall_score) ? 0 : latestScore.overall_score;
  const initialScoreValue = isNaN(initialScore.overall_score) ? 0 : initialScore.overall_score;
  const totalImprovement = latestScoreValue - initialScoreValue;

  return (
    <div className={`p-4 ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">📊 Score Progress</h3>
          <div className="text-xs text-gray-400">
            {scoreHistory.length} update{scoreHistory.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Current Score Display */}
        <div className="bg-slate-700 rounded-lg p-3 mb-3 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-white transition-all duration-500">
                {latestScoreValue}/100
              </div>
              <div className="text-xs text-gray-400">Current Score</div>
            </div>
            {totalImprovement !== 0 && (
              <div className={`text-sm font-medium transition-all duration-500 ${
                totalImprovement > 0 ? 'text-green-400' : 'text-red-400'
              }`} style={{
                animation: scoreHistory.length > 1 ? 'pulseGlow 1.5s ease-in-out' : undefined
              }}>
                {totalImprovement > 0 ? '+' : ''}{totalImprovement} pts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {scoreHistory.slice().reverse().map((entry, index) => {
          const actualIndex = scoreHistory.length - 1 - index;
          const isLatest = index === 0;
          const previousEntry = actualIndex > 0 ? scoreHistory[actualIndex - 1] : null;
          const currentEntryScore = isNaN(entry.overall_score) ? 0 : entry.overall_score;
          const previousEntryScore = previousEntry && !isNaN(previousEntry.overall_score) ? previousEntry.overall_score : 0;
          const improvement = previousEntry ? currentEntryScore - previousEntryScore : 0;

          return (
            <div
              key={actualIndex}
              className={`relative flex items-start space-x-3 p-3 rounded-lg transition-all duration-500 transform ${
                isLatest 
                  ? 'bg-blue-900/30 border border-blue-500/30 animate-slideInFromTop' 
                  : 'bg-slate-700/50'
              }`}
              style={{
                animation: isLatest ? 'slideInFromTop 0.6s ease-out' : undefined
              }}
            >
              {/* Timeline dot */}
              <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 transition-all duration-500 ${
                isLatest ? 'bg-blue-500 ring-2 ring-blue-400/30 animate-pulse' : 'bg-gray-500'
              }`} />
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-sm font-medium ${
                    isLatest ? 'text-blue-300' : 'text-gray-300'
                  }`}>
                    Score: {currentEntryScore}/100
                  </div>
                  <div className="flex items-center space-x-2">
                    {improvement !== 0 && (
                      <div className={`text-xs font-medium px-2 py-1 rounded transition-all duration-500 ${
                        improvement > 0 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-red-900/30 text-red-400'
                      } ${isLatest && improvement > 0 ? 'animate-bounce' : ''}`}>
                        {improvement > 0 ? '+' : ''}{improvement}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {entry.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
                
                {entry.message && (
                  <div className="text-xs text-gray-400 mb-2">
                    {entry.message}
                  </div>
                )}

                {/* Section scores - only show if there are multiple sections with scores */}
                {Object.keys(entry.section_scores).length > 0 && (
                  <div className="mt-2">
                    <details className="group">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                        Section Scores ({Object.keys(entry.section_scores).length})
                        <span className="ml-1 group-open:rotate-90 transition-transform inline-block">▶</span>
                      </summary>
                      <div className="mt-2 space-y-1">
                        {Object.entries(entry.section_scores)
                          .sort(([,a], [,b]) => b - a)
                          .map(([sectionName, score]) => {
                            const prevSectionScore = previousEntry?.section_scores[sectionName];
                            const sectionImprovement = prevSectionScore !== undefined 
                              ? score - prevSectionScore 
                              : 0;

                            return (
                              <div key={sectionName} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 truncate flex-1 mr-2">
                                  {sectionName}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <span className="text-white">{score}</span>
                                  {sectionImprovement !== 0 && (
                                    <span className={`text-xs ${
                                      sectionImprovement > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      ({sectionImprovement > 0 ? '+' : ''}{sectionImprovement})
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Timeline line */}
              {index < scoreHistory.length - 1 && (
                <div className="absolute left-[18px] top-6 w-px h-6 bg-gray-600" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      {scoreHistory.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-600">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="text-white font-medium">{initialScoreValue}</div>
              <div className="text-gray-400">Starting Score</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${
                totalImprovement > 0 ? 'text-green-400' : 
                totalImprovement < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {totalImprovement > 0 ? '+' : ''}{totalImprovement}
              </div>
              <div className="text-gray-400">Total Change</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
