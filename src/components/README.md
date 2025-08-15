# Analysis Results Components

This directory contains the components for displaying CV analysis results with a split-screen layout.

## Components Overview

### AnalysisResults
The main component that orchestrates the entire analysis results display with a split-screen layout.

**Props:**
- `analysisData: CVAnalysisResult` - The analysis data from AI processing
- `resumeId: string` - Unique identifier for the resume
- `onSectionEdit: (sectionName: string) => void` - Callback when user wants to edit a section
- `onDownloadPDF: () => void` - Callback when user wants to download the PDF

**Features:**
- Split-screen layout (analysis on left, CV preview on right)
- Responsive design that stacks on mobile
- Header with download button
- Integrates all sub-components

### SectionCard
Displays individual CV section analysis with score, feedback, and suggestions.

**Props:**
- `section: CVSection` - Section data with score, content, feedback, and suggestions
- `onEdit: () => void` - Callback when edit button is clicked
- `isEditing?: boolean` - Whether the section is currently being edited
- `disabled?: boolean` - Whether the card should be disabled

**Features:**
- Color-coded scoring (green: 80+, yellow: 60-79, red: <60)
- Expandable content preview
- Edit button with loading state
- Responsive design

### ScoreDisplay
Reusable component for displaying scores with consistent color coding.

**Props:**
- `score: number` - The score to display
- `maxScore?: number` - Maximum possible score (default: 100)
- `size?: 'small' | 'medium' | 'large'` - Display size
- `showLabel?: boolean` - Whether to show "/maxScore" label
- `className?: string` - Additional CSS classes

**Features:**
- Consistent color coding across the app
- Multiple size variants
- Accessible design with proper contrast

### OverallScoreDisplay
Prominent display for the overall CV score with summary and progress visualization.

**Props:**
- `score: number` - Overall CV score
- `summary: string` - AI-generated summary of the CV
- `className?: string` - Additional CSS classes

**Features:**
- Large, prominent score display
- Motivational messaging based on score
- Progress bar visualization
- Gradient background based on score

### ATSCompatibilityCard
Specialized card for displaying ATS (Applicant Tracking System) compatibility analysis.

**Props:**
- `atsData: ATSCompatibility` - ATS compatibility data
- `className?: string` - Additional CSS classes

**Features:**
- Dedicated ATS-focused messaging
- Color-coded based on ATS score
- Educational content about ATS importance
- Specific recommendations for ATS improvement

## Usage Example

```tsx
import { AnalysisResults } from './components';
import type { CVAnalysisResult } from './types';

const MyComponent = () => {
  const analysisData: CVAnalysisResult = {
    overall_score: 85,
    summary: "Your CV shows strong technical skills...",
    sections: [
      {
        section_name: "professional_summary",
        score: 90,
        content: "Experienced developer...",
        feedback: "Strong summary...",
        suggestions: "Consider adding..."
      }
    ],
    ats_compatibility: {
      score: 78,
      feedback: "Good ATS compatibility...",
      suggestions: "Add more keywords..."
    }
  };

  return (
    <AnalysisResults
      analysisData={analysisData}
      resumeId="resume-123"
      onSectionEdit={(sectionName) => console.log('Edit:', sectionName)}
      onDownloadPDF={() => console.log('Download PDF')}
    />
  );
};
```

## Color Coding System

The components use a consistent color coding system based on scores:

- **Green (80-100)**: Excellent performance
  - `text-green-600`, `bg-green-50`, `border-green-200`
- **Yellow (60-79)**: Good performance, room for improvement
  - `text-yellow-600`, `bg-yellow-50`, `border-yellow-200`
- **Red (0-59)**: Needs significant improvement
  - `text-red-600`, `bg-red-50`, `border-red-200`

## Responsive Design

All components are designed mobile-first with responsive breakpoints:

- **Mobile (< 1024px)**: Single column layout, stacked components
- **Desktop (≥ 1024px)**: Split-screen layout with side-by-side panels

## Testing

Each component includes comprehensive tests covering:

- Rendering with different score ranges
- User interactions (clicks, expansions)
- Prop variations and edge cases
- Accessibility considerations

Run tests with:
```bash
npm test -- src/components/__tests__/
```

## Demo

Use the `AnalysisResultsDemo` component to see all components in action with sample data:

```tsx
import { AnalysisResultsDemo } from './components';

// Renders a complete demo with sample analysis data
<AnalysisResultsDemo />
```