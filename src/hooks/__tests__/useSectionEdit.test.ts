/**
 * Tests for useSectionEdit hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionEdit } from '../useSectionEdit';
import type { CVAnalysisResult } from '../../types/cv';
import { SectionEditService } from '../../services/sectionEditService';
import { SessionStorageService } from '../../services/sessionStorage';

const mockEditSection = vi.mocked(SectionEditService.editSection);
const mockGetSessionData = vi.mocked(SessionStorageService.getSessionData);

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

describe('useSectionEdit', () => {
  const mockAnalysisData: CVAnalysisResult = {
    overall_score: 75,
    summary: 'Good CV overall',
    sections: [
      {
        section_name: 'professional_summary',
        score: 70,
        content: 'Current summary',
        feedback: 'Needs improvement',
        suggestions: 'Add more details'
      },
      {
        section_name: 'work_experience',
        score: 80,
        content: 'Work experience content',
        feedback: 'Good experience',
        suggestions: 'Add metrics'
      }
    ],
    ats_compatibility: {
      score: 75,
      feedback: 'Good ATS compatibility',
      suggestions: 'Use more keywords'
    }
  };

  const mockOptions = {
    resumeId: 'test-resume-id',
    initialAnalysisData: mockAnalysisData,
    onSectionEdit: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionData.mockReturnValue({ sessionId: 'session_123_abc' });
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useSectionEdit(mockOptions));

    expect(result.current.analysisData).toEqual(mockAnalysisData);
    expect(result.current.editingSections.size).toBe(0);
    expect(result.current.sectionUpdates.size).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should successfully edit a section', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 85,
        content: 'Improved summary',
        feedback: 'Much better!',
        suggestions: 'Consider adding metrics'
      },
      updatedScore: 85,
      message: 'Section updated successfully'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    await act(async () => {
      await result.current.editSection('professional_summary');
    });

    expect(mockEditSection).toHaveBeenCalledWith(
      'test-resume-id',
      'professional_summary',
      'Current summary',
      'Add more details',
      'session_123_abc',
      undefined,
      expect.objectContaining({
        onProgress: expect.any(Function)
      })
    );

    // Check that analysis data was updated
    expect(result.current.analysisData.sections[0]).toEqual(mockEditResult.updatedSection);
    expect(result.current.analysisData.overall_score).toBe(83); // (85 + 80) / 2 = 82.5 rounded to 83

    // Check that section update was tracked
    expect(result.current.sectionUpdates.has('professional_summary')).toBe(true);
    expect(result.current.sectionUpdates.get('professional_summary')).toEqual(mockEditResult.updatedSection);

    // Check that editing state was cleared
    expect(result.current.editingSections.has('professional_summary')).toBe(false);

    // Check that callbacks were called
    expect(mockOptions.onSectionEdit).toHaveBeenCalledWith('professional_summary');
  });

  it('should handle missing session', async () => {
    mockGetSessionData.mockReturnValue(null);

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    await act(async () => {
      await result.current.editSection('professional_summary');
    });

    expect(result.current.error).toBe('Session not found. Please refresh the page.');
    expect(mockOptions.onError).toHaveBeenCalledWith('Session not found. Please refresh the page.');
    expect(mockEditSection).not.toHaveBeenCalled();
  });

  it('should handle section not found', async () => {
    const { result } = renderHook(() => useSectionEdit(mockOptions));

    await act(async () => {
      await result.current.editSection('nonexistent_section');
    });

    expect(result.current.error).toBe('Section "nonexistent_section" not found');
    expect(mockOptions.onError).toHaveBeenCalledWith('Section "nonexistent_section" not found');
    expect(mockEditSection).not.toHaveBeenCalled();
  });

  it('should handle service errors', async () => {
    mockEditSection.mockRejectedValue(new Error('Service error'));

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    await act(async () => {
      await result.current.editSection('professional_summary');
    });

    expect(result.current.error).toBe('Service error');
    expect(mockOptions.onError).toHaveBeenCalledWith('Service error');
    expect(result.current.editingSections.has('professional_summary')).toBe(false);
  });

  it('should manage editing state correctly', async () => {
    // Mock a slow service call
    let resolveEdit: (value: any) => void;
    const editPromise = new Promise(resolve => {
      resolveEdit = resolve;
    });
    mockEditSection.mockReturnValue(editPromise);

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    // Start editing
    act(() => {
      result.current.editSection('professional_summary');
    });

    // Check that section is in editing state
    expect(result.current.editingSections.has('professional_summary')).toBe(true);

    // Resolve the edit
    await act(async () => {
      resolveEdit!({
        updatedSection: {
          section_name: 'professional_summary',
          score: 85,
          content: 'Improved',
          feedback: 'Better',
          suggestions: 'Good'
        },
        updatedScore: 85,
        message: 'Success'
      });
      await editPromise;
    });

    // Check that editing state was cleared
    expect(result.current.editingSections.has('professional_summary')).toBe(false);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useSectionEdit(mockOptions));

    // Set an error first
    act(() => {
      result.current.editSection('nonexistent_section');
    });

    expect(result.current.error).toBeTruthy();

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should reset updates', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 85,
        content: 'Improved',
        feedback: 'Better',
        suggestions: 'Good'
      },
      updatedScore: 85,
      message: 'Success'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    // Edit a section to create updates
    await act(async () => {
      await result.current.editSection('professional_summary');
    });

    expect(result.current.sectionUpdates.size).toBe(1);

    // Reset updates
    act(() => {
      result.current.resetUpdates();
    });

    expect(result.current.sectionUpdates.size).toBe(0);
  });

  it('should recalculate overall score correctly', async () => {
    const mockEditResult = {
      updatedSection: {
        section_name: 'professional_summary',
        score: 90, // Improved from 70
        content: 'Improved summary',
        feedback: 'Excellent!',
        suggestions: 'Perfect'
      },
      updatedScore: 90,
      message: 'Success'
    };

    mockEditSection.mockResolvedValue(mockEditResult);

    const { result } = renderHook(() => useSectionEdit(mockOptions));

    await act(async () => {
      await result.current.editSection('professional_summary');
    });

    // Overall score should be (90 + 80) / 2 = 85
    expect(result.current.analysisData.overall_score).toBe(85);
  });
});