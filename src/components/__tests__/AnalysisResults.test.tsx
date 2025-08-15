import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisResults } from '../AnalysisResults';
import type { CVAnalysisResult } from '../../types';

// Mock data for testing
const mockAnalysisData: CVAnalysisResult = {
  overall_score: 85,
  summary: 'Your CV shows strong technical skills and relevant experience. Consider improving the formatting and adding more quantifiable achievements.',
  sections: [
    {
      section_name: 'professional_summary',
      score: 90,
      content: 'Experienced software developer with 5 years of experience...',
      feedback: 'Strong professional summary that clearly communicates your value proposition.',
      suggestions: 'Consider adding specific technologies and quantifiable achievements.'
    },
    {
      section_name: 'work_experience',
      score: 75,
      content: 'Software Developer at Tech Corp (2019-2024)...',
      feedback: 'Good work experience section with relevant roles.',
      suggestions: 'Add more quantifiable achievements and specific technologies used.'
    },
    {
      section_name: 'skills',
      score: 80,
      content: 'JavaScript, React, Node.js, Python...',
      feedback: 'Comprehensive skills list covering relevant technologies.',
      suggestions: 'Organize skills by category and add proficiency levels.'
    }
  ],
  ats_compatibility: {
    score: 78,
    feedback: 'Your CV has good ATS compatibility with proper formatting and keyword usage.',
    suggestions: 'Add more industry-specific keywords and ensure consistent formatting throughout.'
  }
};

describe('AnalysisResults', () => {
  const mockProps = {
    analysisData: mockAnalysisData,
    resumeId: 'test-resume-123',
    onSectionEdit: vi.fn(),
    onDownloadPDF: vi.fn()
  };

  it('renders overall score display', () => {
    render(<AnalysisResults {...mockProps} />);
    
    expect(screen.getByText('Overall CV Score')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Great CV! 👍')).toBeInTheDocument();
  });

  it('renders ATS compatibility section', () => {
    render(<AnalysisResults {...mockProps} />);
    
    expect(screen.getByText('ATS Compatibility')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('renders all section cards', () => {
    render(<AnalysisResults {...mockProps} />);
    
    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('Work Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('calls onSectionEdit when edit button is clicked', () => {
    render(<AnalysisResults {...mockProps} />);
    
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);
    
    expect(mockProps.onSectionEdit).toHaveBeenCalledWith('professional_summary');
  });

  it('calls onDownloadPDF when download button is clicked', () => {
    render(<AnalysisResults {...mockProps} />);
    
    const downloadButton = screen.getByText('Download as PDF');
    fireEvent.click(downloadButton);
    
    expect(mockProps.onDownloadPDF).toHaveBeenCalled();
  });

  it('shows CV preview placeholder', () => {
    render(<AnalysisResults {...mockProps} />);
    
    expect(screen.getByText('CV Preview')).toBeInTheDocument();
    expect(screen.getByText('Resume ID: test-resume-123')).toBeInTheDocument();
  });
});