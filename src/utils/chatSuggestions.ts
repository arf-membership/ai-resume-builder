import type { ComprehensiveCVAnalysisResult } from '../types/cv';

export interface ChatSuggestion {
  text: string;
  section: string;
  currentScore: number;
  expectedImprovement: number;
  priority: 'high' | 'medium' | 'low';
  category: 'fail' | 'warning' | 'pass';
}

/**
 * Generate dynamic chat suggestions based on CV analysis scores
 */
export function generateChatSuggestions(analysisResult: ComprehensiveCVAnalysisResult): ChatSuggestion[] {
  const suggestions: ChatSuggestion[] = [];

  if (!analysisResult || !analysisResult.detailed_checks) {
    return [];
  }

  const { detailed_checks } = analysisResult;

  // Check each section and create suggestions for failing/warning areas
  Object.entries(detailed_checks).forEach(([sectionKey, checkResult]) => {
    if (!checkResult || typeof checkResult.score !== 'number') return;

    const { score, status, message, suggestions: sectionSuggestions } = checkResult;
    
    // Only suggest improvements for scores < 80 (fail/warning)
    if (score < 80) {
      const sectionName = formatSectionName(sectionKey);
      const priority = score < 50 ? 'high' : score < 70 ? 'medium' : 'low';
      const expectedImprovement = Math.min(25, 90 - score); // Realistic improvement
      
      // Create suggestion text based on the section
      const suggestionText = createSuggestionText(sectionKey, score, sectionSuggestions);
      
      suggestions.push({
        text: suggestionText,
        section: sectionName,
        currentScore: score,
        expectedImprovement,
        priority,
        category: status as 'fail' | 'warning' | 'pass'
      });
    }
  });

  // Sort by priority and score (lowest scores first)
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return a.currentScore - b.currentScore;
  });
}

/**
 * Format section keys to readable names
 */
function formatSectionName(sectionKey: string): string {
  const nameMap: Record<string, string> = {
    professional_summary: 'Professional Summary',
    work_experience: 'Work Experience',
    skills_section: 'Skills',
    education: 'Education',
    contact_info: 'Contact Information',
    ats_compatibility: 'ATS Compatibility',
    keyword_optimization: 'Keywords',
    formatting: 'Formatting'
  };
  
  return nameMap[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Create suggestion text based on section type and score
 */
function createSuggestionText(sectionKey: string, score: number, suggestions: string[]): string {
  const templates: Record<string, string> = {
    professional_summary: `Improve my professional summary (${score}/100)`,
    work_experience: `Enhance my work experience section (${score}/100)`,
    skills_section: `Optimize my skills section (${score}/100)`,
    education: `Improve my education section (${score}/100)`,
    contact_info: `Fix my contact information (${score}/100)`,
    ats_compatibility: `Make my CV more ATS-friendly (${score}/100)`,
    keyword_optimization: `Add more relevant keywords (${score}/100)`,
    formatting: `Improve my CV formatting (${score}/100)`
  };

  // If we have specific suggestions, use the first one
  if (suggestions && suggestions.length > 0) {
    const firstSuggestion = suggestions[0];
    return `${firstSuggestion} (Score: ${score}/100)`;
  }

  return templates[sectionKey] || `Improve ${formatSectionName(sectionKey)} (${score}/100)`;
}

/**
 * Get color class based on score
 */
export function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/**
 * Get improvement indicator
 */
export function getImprovementIndicator(currentScore: number, expectedImprovement: number): string {
  const newScore = Math.min(100, currentScore + expectedImprovement);
  return `${currentScore} → ${newScore}`;
}
