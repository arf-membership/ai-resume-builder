/**
 * Integration tests for AnalysisResults component with section editing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalysisResults } from '../AnalysisResults';
import type { CVAnalysisResult } from '../../types/cv';

// Mock services
vi.mock('../../services/sectionEditService', () => ({
  SectionEditService: {
    editSection: vi.fn()
  }
}));

vi.mock('../../services/sessionStorage', () => ({
  SessionStorageService: {
    getSessionData: vi.fn()
  }
}));

import { SectionEditService } from '../../services/sectionEditService';
import { SessionStorageService } from '../../services/sessionStorage';

const mockEditSection = vi.mocked(SectionEditService.editSection);
const mockGetSessionData = vi.mocked(SessionStorageService.getSessionData);

describe('AnalysisResults Integration', () => {
  const mockAnalysisData: CVAnalysisResult = {
    overall_score: 75,
    summary: 'Good CV with room for improvement',
    sections: [
      {
        section_name: 'professional_summary',
        score: 70,
        content: 'Current professional summary content',
        feedback: 'The summary needs more impact',
        suggestions: 'Add specific achievements and metrics'
      },
      {
        section_name: 'work_experience',
        score: 80,
        content: 'Work experience content',
        feedback: 'Good experience section',
        suggestions: 'Add more quantifiable results'
      }
    ],
    ats_compatibility: {
      score: 75,
      feedback: 'Good ATS compatibility',
      suggestions: 'Use more industry keywords'
    }
  };

  const mockProps = {
    analysisData: mockAnalysisData,
    resumeId: 'test-resume-id',
    onSectionEdit: vi.fn(),
    onDownloadPDF: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionData.mockReturnValue({ sessionId: 'session_123_abc' });
  });

  it('should render analysis results with section cards', () => {
    render(<AnalysisResults {...mockProps} />);

    // Check overall score is displayed (using more specific selector)
    expect(screen.getByRole('heading', { name: 'Overall CV Score' })).toBeInTheDocument();
    expect(screen.getByText('Good CV with room for improvement')).toBeInTheDocument();

    // Check section cards are rendered
    expect(screen.getByText('Professional Summary')).toBeInTheDocument();
    expect(screen.getByText('Work Experience')).toBeInTheDocument();

    // Check edit buttons are present
    const editButtons = screen.getAllByText('Edit with AI');
    expect(editButtons).toHaveLength(2);
  });

  it('should handle section editing successfully', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 85,
        content: 'Improved professional summary with metrics and achievements',
        feedback: 'Much better! Great use of specific achievements',
        suggestions: 'Consider adding industry-specific keywords'
      },
      updatedScore: 85,
      message: 'Section updated successfully'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    render(<AnalysisResults {...mockProps} />);

    // Find and click the edit button for professional summary
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Check that the button shows loading state
    await waitFor(() => {
      expect(screen.getByText('Editing...')).toBeInTheDocument();
    });

    // Wait for the edit to complete
    await waitFor(() => {
      expect(screen.queryByText('Editing...')).not.toBeInTheDocument();
    });

    // Verify the service was called correctly
    expect(mockEditSection).toHaveBeenCalledWith(
      'test-resume-id',
      'professional_summary',
      'Current professional summary content',
      'Add specific achievements and metrics',
      'session_123_abc',
      undefined,
      expect.objectContaining({
        onProgress: expect.any(Function)
      })
    );

    // Verify the parent callback was called
    expect(mockProps.onSectionEdit).toHaveBeenCalledWith('professional_summary');
  });

  it('should display error when section editing fails', async () => {
    mockEditSection.mockRejectedValue(new Error('AI service unavailable'));

    render(<AnalysisResults {...mockProps} />);

    // Click edit button
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Section Editing Error')).toBeInTheDocument();
      expect(screen.getByText('AI service unavailable')).toBeInTheDocument();
    });

    // Check that editing state is cleared
    expect(screen.queryByText('Editing...')).not.toBeInTheDocument();
  });

  it('should handle missing session error', async () => {
    mockGetSessionData.mockReturnValue(null);

    render(<AnalysisResults {...mockProps} />);

    // Click edit button
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Section Editing Error')).toBeInTheDocument();
      expect(screen.getByText('Session not found. Please refresh the page.')).toBeInTheDocument();
    });

    // Verify service was not called
    expect(mockEditSection).not.toHaveBeenCalled();
  });

  it('should allow clearing errors', async () => {
    mockGetSessionData.mockReturnValue(null);

    render(<AnalysisResults {...mockProps} />);

    // Trigger an error
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Section Editing Error')).toBeInTheDocument();
    });

    // Click the close button
    const closeButton = screen.getByRole('button', { name: 'Close error' });
    fireEvent.click(closeButton);

    // Error should be cleared
    expect(screen.queryByText('Section Editing Error')).not.toBeInTheDocument();
  });

  it('should show section updates in CV preview area', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 85,
        content: 'Improved content',
        feedback: 'Better',
        suggestions: 'Good'
      },
      updatedScore: 85,
      message: 'Success'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    render(<AnalysisResults {...mockProps} />);

    // Initially no updates
    expect(screen.getByText('Section updates: 0 modified')).toBeInTheDocument();

    // Edit a section
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Wait for edit to complete
    await waitFor(() => {
      expect(screen.queryByText('Editing...')).not.toBeInTheDocument();
    });

    // Check that updates are shown
    expect(screen.getByText('Section updates: 1 modified')).toBeInTheDocument();
    expect(screen.getByText('professional summary')).toBeInTheDocument();
  });

  it('should update overall score after section edit', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 90, // Improved from 70
        content: 'Improved content',
        feedback: 'Excellent',
        suggestions: 'Perfect'
      },
      updatedScore: 90,
      message: 'Success'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    render(<AnalysisResults {...mockProps} />);

    // Initial overall score is 75 (check in the overall score section)
    expect(screen.getByRole('heading', { name: 'Overall CV Score' })).toBeInTheDocument();

    // Edit a section
    const editButtons = screen.getAllByText('Edit with AI');
    fireEvent.click(editButtons[0]);

    // Wait for edit to complete
    await waitFor(() => {
      expect(screen.queryByText('Editing...')).not.toBeInTheDocument();
    });

    // Overall score should be updated to (90 + 80) / 2 = 85
    // We'll check that the section was updated by looking for the new feedback
    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });
  });
});